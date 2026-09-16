-- =================================================================================
-- migration v29 — make voting actually work
--
-- THE BUG
--
-- cast_photo_battle_vote has never once run to completion. Every attempt fails
-- with:
--
--     column reference "votes_a" is ambiguous
--
-- The function is declared RETURNS TABLE (votes_a, votes_b, status, winner_id).
-- In plpgsql those output columns are VARIABLES in scope for the whole body.
-- The vote-counting statement then says:
--
--     SET votes_a = votes_a + CASE ... END
--
-- and the right-hand `votes_a` matches both the photo_battles column and the
-- output variable, so Postgres refuses to guess. Nothing in the statement is
-- wrong about the logic; it simply never says which `votes_a` it means.
--
-- WHY IT SURVIVED SIX MIGRATIONS
--
-- plpgsql does not check a function body until the function runs. This one
-- created cleanly every time, VERIFY_v15 found it present and correctly
-- permissioned, and the audit found the engine "well built and properly locked
-- down". All of that was true. It had just never been executed, because no vote
-- had ever been cast - and no vote could ever be cast, because of this line.
-- photo_battle_votes stood at zero rows since the table was created.
--
-- This is the same shape as the portfolio_items outage: a thing that looks
-- present and enabled from every angle except actually using it.
--
-- THE FIX
--
-- Qualify the columns with the table name. The SET target on the left is always
-- a column and was never ambiguous; only the reads on the right needed saying.
-- The signature, the return shape, the guards, the permissions and the
-- behaviour are all unchanged - this migration alters one statement inside one
-- function, and nothing else in the schema.
--
-- Checked while here: finalize_battle returns TEXT so has no output variables
-- to collide with, and get_leaderboard qualifies every column it reads. Neither
-- carries this bug.
-- =================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.cast_photo_battle_vote(p_battle_id UUID, p_selected_photo_id UUID)
RETURNS TABLE (votes_a INTEGER, votes_b INTEGER, status TEXT, winner_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  b            public.photo_battles;
  voter        UUID := auth.uid();
  votes_today  INTEGER;
  total        INTEGER;
  lead         INTEGER;
BEGIN
  IF voter IS NULL THEN RAISE EXCEPTION 'Sign in to vote'; END IF;

  -- Rate limit. A real person does not cast 200 votes in a day; a script does.
  SELECT COUNT(*) INTO votes_today
    FROM photo_battle_votes
   WHERE voter_id = voter AND created_at > NOW() - INTERVAL '24 hours';
  IF votes_today >= public.battle_setting('daily_vote_cap') THEN
    RAISE EXCEPTION 'You have reached today''s voting limit. Come back tomorrow.';
  END IF;

  SELECT * INTO b FROM photo_battles WHERE id = p_battle_id FOR UPDATE;
  IF NOT FOUND OR b.status <> 'active' THEN
    RAISE EXCEPTION 'This battle is not open for voting';
  END IF;
  IF b.closes_at IS NOT NULL AND b.closes_at <= NOW() THEN
    PERFORM public.finalize_battle(p_battle_id);
    RAISE EXCEPTION 'This battle has closed';
  END IF;
  IF p_selected_photo_id NOT IN (b.photo_a_id, b.photo_b_id) THEN
    RAISE EXCEPTION 'That photograph is not in this battle';
  END IF;
  IF EXISTS (
    SELECT 1 FROM portfolio_items
     WHERE id IN (b.photo_a_id, b.photo_b_id) AND photographer_id = voter
  ) THEN
    RAISE EXCEPTION 'You cannot vote in your own battle';
  END IF;

  -- The primary key (battle_id, voter_id) is what actually enforces one vote
  -- per person; this turns the constraint violation into a readable message.
  BEGIN
    INSERT INTO photo_battle_votes (battle_id, voter_id, selected_photo_id)
    VALUES (p_battle_id, voter, p_selected_photo_id);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'You have already voted in this battle';
  END;

  -- ── THE FIXED STATEMENT ──────────────────────────────────────────────────
  -- photo_battles.votes_a, not a bare votes_a: the bare name also matches this
  -- function's own output variable, and that ambiguity is what has been
  -- rejecting every vote ever cast on the platform.
  UPDATE photo_battles
     SET votes_a = photo_battles.votes_a + CASE WHEN p_selected_photo_id = b.photo_a_id THEN 1 ELSE 0 END,
         votes_b = photo_battles.votes_b + CASE WHEN p_selected_photo_id = b.photo_b_id THEN 1 ELSE 0 END
   WHERE photo_battles.id = p_battle_id
  RETURNING * INTO b;

  -- Early close ONLY when the result is already beyond doubt. v10 closed at 10
  -- votes unconditionally, which on a small platform meant never, because both
  -- owners are barred and there were not 10 other people.
  total := b.votes_a + b.votes_b;
  lead  := ABS(b.votes_a - b.votes_b);
  IF total >= public.battle_setting('early_close_votes')
     AND lead >= public.battle_setting('early_close_margin') THEN
    PERFORM public.finalize_battle(p_battle_id);
    SELECT * INTO b FROM photo_battles WHERE id = p_battle_id;
  END IF;

  -- Keep the rest of the queue moving.
  PERFORM public.finalize_due_battles(5);

  RETURN QUERY SELECT b.votes_a, b.votes_b, b.status, b.winner_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cast_photo_battle_vote(UUID, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.cast_photo_battle_vote(UUID, UUID) TO authenticated;

COMMIT;
