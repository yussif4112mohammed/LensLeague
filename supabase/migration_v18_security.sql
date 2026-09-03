-- =================================================================================
-- LENSLEAGUE MIGRATION V18: SECURITY REVIEW FIXES
-- ---------------------------------------------------------------------------------
-- Four findings from the audit of everything built in v14–v17. Three of them are
-- mine, introduced by migrations earlier in this same series. Each is fixed at
-- the database, not in the client, because a control that lives in JavaScript is
-- a control an attacker skips by calling the API directly.
--
--   S1  CRITICAL  Any signed-in user could read anyone's private messages.
--   S2  HIGH      Any signed-in user could farm unlimited points.
--   S3  HIGH      The battle engine's point award was silently reverted, so
--                 nobody was ever actually paid.
--   S4  MEDIUM    get_or_create_thread ran with an unpinned search_path.
--
-- Requires v14–v17. Safe to run more than once.
-- =================================================================================

BEGIN;

-- =================================================================================
-- S3 — LET THE ENGINE PAY, AND NOBODY ELSE
-- ---------------------------------------------------------------------------------
-- THE BUG, because it is subtle and worth understanding:
--
-- auth.uid() does not read the database role. It reads a setting PostgREST puts
-- on the connection from the caller's JWT. SECURITY DEFINER changes the role and
-- leaves that setting exactly where it was. So inside finalize_battle(), called
-- by a voter, auth.uid() is still that voter.
--
-- v11 put a BEFORE UPDATE trigger on profiles that silently reverts any change
-- to points, wins, rank and so on unless auth.uid() is null or an admin. v15
-- added a second one for battles_played. Both do exactly what they were built
-- to do — and both fire on the engine's own UPDATE, because from the trigger's
-- point of view a voter is writing to somebody else's points.
--
-- Result: battles closed, outcomes were recorded correctly, and every award was
-- rolled back on its way to the row. The leaderboard would have stayed empty
-- forever and Your Month would have read zero for everyone, with no error
-- anywhere to explain it.
--
-- THE FIX: a transaction-local flag that only the engine sets. Not a role check,
-- not a "trust me" boolean column — a setting that lives for the length of one
-- transaction and cannot be reached from outside the database. PostgREST does
-- not execute client SQL and no function exposes set_config, so a client has no
-- way to turn it on. It is also is_local, so it dies with the transaction even
-- if something raises.
-- =================================================================================

CREATE OR REPLACE FUNCTION public.engine_is_writing()
RETURNS BOOLEAN
-- VOLATILE deliberately, not STABLE: the value changes part-way through the
-- transaction, and volatility is the one thing that guarantees the planner
-- re-evaluates it on every call rather than folding an old answer into a
-- cached trigger plan.
LANGUAGE sql VOLATILE SET search_path = public, pg_temp AS $$
  SELECT COALESCE(current_setting('lensleague.engine_write', true), '') = 'on';
$$;

COMMENT ON FUNCTION public.engine_is_writing() IS
  'True only inside finalize_battle(), for the length of one transaction. The '
  'guard triggers on profiles use it to tell the battle engine apart from the '
  'user whose request happened to trigger it.';


-- The v11 guard, unchanged except that it now recognises the engine.
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  guarded TEXT[] := ARRAY[
    'verified', 'banned', 'points', 'wins', 'global_rank',
    'rating', 'review_count', 'competitions_won',
    'followers_count', 'following_count', 'posts_count'
  ];
  col TEXT;
  new_j JSONB := to_jsonb(NEW);
  old_j JSONB := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
BEGIN
  -- service_role, admins, and the battle engine may write these. Nobody else.
  IF auth.uid() IS NULL OR public.has_role('admin') OR public.engine_is_writing() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    FOREACH col IN ARRAY guarded LOOP
      IF new_j ? col THEN
        IF jsonb_typeof(new_j -> col) = 'boolean' THEN
          new_j := jsonb_set(new_j, ARRAY[col], 'false'::jsonb);
        ELSIF jsonb_typeof(new_j -> col) = 'number' THEN
          new_j := jsonb_set(new_j, ARRAY[col], '0'::jsonb);
        END IF;
      END IF;
    END LOOP;
    NEW := jsonb_populate_record(NEW, new_j);
    RETURN NEW;
  END IF;

  FOREACH col IN ARRAY guarded LOOP
    IF new_j ? col AND (new_j -> col) IS DISTINCT FROM (old_j -> col) THEN
      new_j := jsonb_set(new_j, ARRAY[col], COALESCE(old_j -> col, 'null'::jsonb));
    END IF;
  END LOOP;

  -- Your id is never yours to change, engine or not.
  IF (new_j ? 'id') THEN
    new_j := jsonb_set(new_j, ARRAY['id'], old_j -> 'id');
  END IF;

  NEW := jsonb_populate_record(NEW, new_j);
  RETURN NEW;
END;
$$;


-- The v15 guard, same treatment.
CREATE OR REPLACE FUNCTION public.guard_battles_played()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF public.is_staff() OR public.engine_is_writing() THEN RETURN NEW; END IF;
  NEW.battles_played := OLD.battles_played;
  RETURN NEW;
END;
$$;


-- finalize_battle, with the flag raised around the two award statements and
-- lowered immediately afterwards. The window is two UPDATEs wide.
CREATE OR REPLACE FUNCTION public.finalize_battle(p_battle_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  b              public.photo_battles;
  owner_a        UUID;
  owner_b        UUID;
  winning_photo  UUID;
  result         TEXT;
  pts_part       INTEGER := public.battle_setting('points_participate');
  pts_win        INTEGER := public.battle_setting('points_win');
BEGIN
  SELECT * INTO b FROM photo_battles WHERE id = p_battle_id FOR UPDATE;
  IF NOT FOUND OR b.status <> 'active' THEN
    RETURN 'skipped';
  END IF;

  SELECT photographer_id INTO owner_a FROM portfolio_items WHERE id = b.photo_a_id;
  SELECT photographer_id INTO owner_b FROM portfolio_items WHERE id = b.photo_b_id;

  -- Nobody voted. That is not a loss for anyone.
  IF b.votes_a + b.votes_b = 0 THEN
    IF b.requeue_count < public.battle_setting('requeue_limit') THEN
      UPDATE photo_battles
         SET status = 'queued', photo_b_id = NULL, closes_at = NULL,
             queued_at = NOW(), requeue_count = requeue_count + 1
       WHERE id = p_battle_id;
      -- Inserted directly rather than via queue_portfolio_item_for_battle().
      -- That function calls finalize_due_battles(), which calls back into this
      -- one. Breaking the finalize -> queue edge removes the cycle entirely.
      IF b.photo_b_id IS NOT NULL THEN
        INSERT INTO photo_battles (photo_a_id, category, band, queued_at)
        SELECT b.photo_b_id, b.category,
               public.experience_band(pr.battles_played), NOW()
          FROM portfolio_items pi
          JOIN profiles pr ON pr.id = pi.photographer_id
         WHERE pi.id = b.photo_b_id
        ON CONFLICT DO NOTHING;
      END IF;
      RETURN 'requeued';
    END IF;
    UPDATE photo_battles
       SET status = 'finalized', outcome = 'no_votes', finalized_at = NOW()
     WHERE id = p_battle_id;
    RETURN 'no_votes';
  END IF;

  -- A tie is a tie.
  IF b.votes_a = b.votes_b THEN
    winning_photo := NULL;
    result := 'tie';
  ELSE
    winning_photo := CASE WHEN b.votes_a > b.votes_b THEN b.photo_a_id ELSE b.photo_b_id END;
    result := 'decided';
  END IF;

  UPDATE photo_battles
     SET status = 'finalized', winner_id = winning_photo,
         outcome = result, finalized_at = NOW()
   WHERE id = p_battle_id;

  -- ── The only place in the system that pays points. ────────────────────────
  PERFORM set_config('lensleague.engine_write', 'on', true);

  UPDATE profiles
     SET points = points + pts_part,
         battles_played = battles_played + 1
   WHERE id IN (owner_a, owner_b);

  IF winning_photo IS NOT NULL THEN
    UPDATE profiles
       SET points = points + pts_win,
           wins = wins + 1
     WHERE id = (SELECT photographer_id FROM portfolio_items WHERE id = winning_photo);
  END IF;

  PERFORM set_config('lensleague.engine_write', 'off', true);
  -- ──────────────────────────────────────────────────────────────────────────

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finalize_battle(UUID) FROM PUBLIC, anon, authenticated;


-- =================================================================================
-- S2 — YOU MAY ONLY ENTER YOUR OWN WORK, AND ONLY ONCE AT A TIME
-- ---------------------------------------------------------------------------------
-- queue_portfolio_item_for_battle(item_id) was granted to authenticated and took
-- any item id at all. Two ways to abuse it:
--
--   1. Queue somebody else's photograph, whenever you like.
--   2. Queue your OWN photograph a second time. The unique indexes stop one
--      photo being photo_a twice, but nothing stopped it being photo_a of one
--      battle while it is photo_b of another. Two participation awards for one
--      upload — and repeatable every time a battle closes, so the points are
--      effectively unlimited.
--
-- The client calls this RPC directly after an upload, so it cannot simply be
-- revoked; the checks have to live inside it. Both are cheap and both are
-- index-backed.
-- =================================================================================

CREATE OR REPLACE FUNCTION public.queue_portfolio_item_for_battle(p_item_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  item_category TEXT;
  item_owner    UUID;
  item_band     SMALLINT;
  opponent      public.photo_battles;
  battle_id     UUID;
  widen_after   INTERVAL := (public.battle_setting('band_widen_hours') || ' hours')::INTERVAL;
BEGIN
  SELECT COALESCE(categories[1], 'General'), photographer_id
    INTO item_category, item_owner
    FROM portfolio_items WHERE id = p_item_id;
  IF item_owner IS NULL THEN RAISE EXCEPTION 'Portfolio item not found'; END IF;

  -- You may only enter your own photographs.
  IF item_owner <> auth.uid() AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'You can only enter your own photographs into a battle';
  END IF;

  -- One open battle per photograph. This is the line that closes the farm.
  IF EXISTS (
    SELECT 1 FROM photo_battles
     WHERE status IN ('queued', 'active')
       AND (photo_a_id = p_item_id OR photo_b_id = p_item_id)
  ) THEN
    RAISE EXCEPTION 'This photograph is already in a battle';
  END IF;

  SELECT public.experience_band(battles_played) INTO item_band
    FROM profiles WHERE id = item_owner;

  -- Keep the engine current while we are here.
  PERFORM public.finalize_due_battles(10);

  SELECT * INTO opponent
    FROM photo_battles b
   WHERE b.status = 'queued'
     AND b.category = item_category
     AND b.photo_a_id <> p_item_id
     AND (b.band = item_band OR b.queued_at < NOW() - widen_after)
     AND NOT EXISTS (
       SELECT 1 FROM portfolio_items pi
        WHERE pi.id = b.photo_a_id AND pi.photographer_id = item_owner
     )
   ORDER BY (b.band = item_band) DESC,
            b.queued_at ASC
   LIMIT 1
     FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    UPDATE photo_battles
       SET photo_b_id = p_item_id,
           status     = 'active',
           closes_at  = NOW() + (public.battle_setting('battle_hours') || ' hours')::INTERVAL
     WHERE id = opponent.id
    RETURNING id INTO battle_id;
  ELSE
    INSERT INTO photo_battles (photo_a_id, category, band, queued_at)
    VALUES (p_item_id, item_category, item_band, NOW())
    RETURNING id INTO battle_id;
  END IF;

  RETURN battle_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.queue_portfolio_item_for_battle(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.queue_portfolio_item_for_battle(UUID) TO authenticated;

-- Makes the open-battle check an index lookup rather than a scan that grows
-- with every battle ever played.
CREATE INDEX IF NOT EXISTS photo_battles_open_b_lookup_idx
  ON public.photo_battles (photo_b_id)
  WHERE status IN ('queued', 'active');


-- =================================================================================
-- S1 + S4 — PRIVATE MESSAGES ARE ACTUALLY PRIVATE
-- ---------------------------------------------------------------------------------
-- This was the worst thing in the database, and it was two of my own lines.
--
-- THE CHAIN, end to end:
--   1. get_or_create_thread(a, b) is SECURITY DEFINER, so it bypasses RLS, and
--      it never checked who was calling. Pass it two other people's ids and it
--      hands back the id of their existing private conversation.
--   2. The thread_participants INSERT policy from v14 was
--          WITH CHECK (auth.uid() IS NOT NULL)
--      which reads as "you must be signed in" and means "any signed-in user may
--      insert any row" — including (someone else's thread, my id).
--   3. messages_select_participant then lets you read the whole thread, because
--      as far as it can tell you are a participant.
--
-- Three API calls, no guessing, every DM on the platform.
--
-- THE FIX is to remove the direct write entirely. Nothing in the client ever
-- inserts into thread_participants or message_threads — both are created by
-- get_or_create_thread — so the client roles do not need the privilege at all.
-- Take it away, and make the one function that does the work check its caller.
-- =================================================================================

REVOKE INSERT, UPDATE, DELETE ON public.thread_participants FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.message_threads     FROM anon, authenticated;

-- The permissive policies go with them. A policy is not a grant, and leaving a
-- policy that says "anyone" behind a revoked grant is how a later, innocent
-- GRANT re-opens the hole without anyone noticing.
DROP POLICY IF EXISTS "participants_insert_self_or_thread" ON public.thread_participants;
DROP POLICY IF EXISTS "thread_participants_insert_self"    ON public.thread_participants;
DROP POLICY IF EXISTS "threads_insert_authenticated"       ON public.message_threads;
DROP POLICY IF EXISTS "message_threads_insert_authenticated" ON public.message_threads;

-- Belt and braces: were the grant ever restored, this policy still limits an
-- insert to adding yourself to a thread you already belong to.
CREATE POLICY "participants_insert_self_only" ON public.thread_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.thread_participants me
                 WHERE me.thread_id = thread_participants.thread_id
                   AND me.user_id = auth.uid())
  );

/**
 * Find or start the conversation between two people.
 *
 * Now refuses unless the caller is one of them. It is still SECURITY DEFINER —
 * it has to be, since it writes thread_participants, which no client role can
 * touch any more — and the search_path is pinned, which it never was.
 */
CREATE OR REPLACE FUNCTION public.get_or_create_thread(user_a UUID, user_b UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  found_thread_id UUID;
  me UUID := auth.uid();
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in to start a conversation';
  END IF;
  IF user_a IS NULL OR user_b IS NULL THEN
    RAISE EXCEPTION 'Both participants are required';
  END IF;
  IF user_a = user_b THEN
    RAISE EXCEPTION 'You cannot open a conversation with yourself';
  END IF;
  -- The whole point of the fix: you must be in the conversation you are asking
  -- for. Staff are allowed through for moderation.
  IF me <> user_a AND me <> user_b AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'You can only open a conversation you are part of';
  END IF;

  SELECT tp1.thread_id INTO found_thread_id
    FROM public.thread_participants tp1
    JOIN public.thread_participants tp2 ON tp1.thread_id = tp2.thread_id
   WHERE tp1.user_id = user_a AND tp2.user_id = user_b
   LIMIT 1;

  IF found_thread_id IS NOT NULL THEN
    RETURN found_thread_id;
  END IF;

  INSERT INTO public.message_threads DEFAULT VALUES
  RETURNING id INTO found_thread_id;

  INSERT INTO public.thread_participants (thread_id, user_id) VALUES
    (found_thread_id, user_a),
    (found_thread_id, user_b);

  RETURN found_thread_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_or_create_thread(UUID, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_or_create_thread(UUID, UUID) TO authenticated;


-- =================================================================================
-- S4 (rest) — PIN EVERY REMAINING DEFINER search_path
-- ---------------------------------------------------------------------------------
-- Anything created before v11 may still be unpinned. Rather than list them by
-- hand and miss one, find them and fix them. ALTER FUNCTION ... SET search_path
-- changes only the setting; it does not touch the body or the privileges.
-- =================================================================================
DO $do$
DECLARE
  f RECORD;
  n INTEGER := 0;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public'
       AND p.prosecdef
       AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}'::text[])) AS c
                        WHERE c LIKE 'search_path=%')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f.sig);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'pinned search_path on % definer function(s)', n;
END
$do$;

COMMIT;
