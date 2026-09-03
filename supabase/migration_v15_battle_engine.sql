-- =================================================================================
-- LENSLEAGUE MIGRATION V15: THE BATTLE ENGINE
-- ---------------------------------------------------------------------------------
-- Extends the v10 engine. Nothing is dropped; the tables, the one-vote-per-person
-- key and the self-vote block from v10 all stay. What changes is the parts that
-- do not survive contact with real usage.
--
-- ── THE FATAL FLAW IN v10 ────────────────────────────────────────────────────
-- A battle closed only on reaching 10 votes:
--     IF battle.votes_a + battle.votes_b >= 10 THEN ... finalize
-- You have 8 registered photographers. Both owners are barred from voting in
-- their own battle, so at most 6 people can ever vote. **No battle could ever
-- close.** Every upload would enter a queue that never resolves, forever, and
-- no points would ever be awarded. `closes_at` was set to NOW() + 24 hours and
-- then read by nothing.
--
-- The same rule fails at the other end too: at 100k users a battle would close
-- in seconds, before anyone saw it.
--
-- ── DECISIONS MADE HERE, AND WHY ─────────────────────────────────────────────
--
-- 1. CLOSING IS TIME-BOXED, WITH AN EARLY EXIT.
--    A battle runs for 24 hours and then closes on whatever votes it got.
--    It may close sooner only if it is already decided: at least 10 votes AND
--    a margin the remaining time cannot plausibly overturn.
--    Small platform: resolves in 24h with 3 votes. Large platform: resolves in
--    minutes. One rule, both ends of the scale. This is the scalability answer.
--
-- 2. A TIE IS A TIE.
--    v10 broke ties with `votes_a >= votes_b`, which silently handed the win to
--    photo A - i.e. to whoever happened to be queued first. That is arbitrary,
--    and at low vote counts ties are common, so it would have been the single
--    most-hit code path. Ties now finish with no winner and both photographers
--    credited for taking part.
--
-- 3. ZERO VOTES IS NOT A LOSS.
--    A battle nobody saw tells us nothing. Both photographs go back in the
--    queue once, and nobody is scored.
--
-- 4. POINTS ARE POSITIVE-SUM: +3 to enter, +10 to win.
--    Not Elo. Elo is zero-sum and takes points off the loser, which punishes
--    people for entering - and the product already says there is no public
--    display of losses. Entering always pays something; winning pays more.
--    New photographers can climb by participating, which is what keeps them.
--
-- 5. MATCHING IS BANDED BY EXPERIENCE.
--    Same category, and where possible a similar amount of experience, so a
--    first upload is not thrown against someone with 200 battles behind them.
--    If no same-band opponent appears within 6 hours, the band requirement is
--    dropped so nobody waits forever. Small platform: widens quickly and still
--    works. Large platform: bands stay tight.
--
-- 6. THE SWEEP IS SELF-MAINTAINING.
--    finalize_due_battles() closes everything past its deadline in one bounded
--    query. It is called opportunistically whenever anyone votes or uploads, so
--    the system needs no cron to stay live - and pg_cron is scheduled as well
--    when available, so it keeps ticking on a quiet day.
--
-- Safe to run more than once. Requires v10 and v14.
-- =================================================================================

BEGIN;

-- ---------------------------------------------------------------------------------
-- 1. TUNING — every number the engine uses, in one place with its reasoning.
-- ---------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.battle_settings (
  key         TEXT PRIMARY KEY,
  value       INTEGER NOT NULL,
  description TEXT
);

INSERT INTO public.battle_settings (key, value, description) VALUES
  ('battle_hours',        24,  'How long a battle stays open before it closes on the votes it has.'),
  ('early_close_votes',   10,  'Minimum votes before a battle may close early.'),
  ('early_close_margin',  6,   'Lead required to close early, once early_close_votes is reached.'),
  ('points_participate',  3,   'Awarded to both photographers when a battle resolves.'),
  ('points_win',          10,  'Awarded to the winner on top of participation.'),
  ('band_widen_hours',    6,   'After this long unmatched, ignore the experience band.'),
  ('daily_vote_cap',      200, 'Votes one account may cast per rolling 24h. Anti-manipulation.'),
  ('requeue_limit',       1,   'How many times a battle with zero votes is retried.')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.battle_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "battle_settings_readable" ON public.battle_settings;
CREATE POLICY "battle_settings_readable" ON public.battle_settings FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.battle_settings FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.battle_setting(p_key TEXT)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT value FROM public.battle_settings WHERE key = p_key;
$$;


-- ---------------------------------------------------------------------------------
-- 2. EXPERIENCE — denormalised, because deriving it per match would mean counting
--    every battle a photographer has ever entered on every single upload.
-- ---------------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS battles_played INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.photo_battles
  ADD COLUMN IF NOT EXISTS band          SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS queued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS requeue_count SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outcome       TEXT
    CHECK (outcome IS NULL OR outcome IN ('decided', 'tie', 'no_votes'));

COMMENT ON COLUMN public.photo_battles.outcome IS
  'How the battle ended. A tie is a real outcome, not a win for photo A.';

/**
 * Experience band. Deliberately coarse - three buckets, not a rating.
 * A finer scale would fragment the pool and leave people unmatched, which is
 * a worse experience than an occasionally uneven match.
 */
CREATE OR REPLACE FUNCTION public.experience_band(p_battles INTEGER)
RETURNS SMALLINT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN COALESCE(p_battles, 0) < 5  THEN 0   -- new
    WHEN COALESCE(p_battles, 0) < 25 THEN 1   -- rising
    ELSE 2                                    -- established
  END::SMALLINT;
$$;

-- battles_played is derived, so the client must never write it.
CREATE OR REPLACE FUNCTION public.guard_battles_played()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF public.is_staff() THEN RETURN NEW; END IF;
  NEW.battles_played := OLD.battles_played;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_battles_played ON public.profiles;
CREATE TRIGGER trg_guard_battles_played
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_battles_played();


-- ---------------------------------------------------------------------------------
-- 3. INDEXES — the queries this engine runs constantly.
-- ---------------------------------------------------------------------------------

-- The sweep: "which battles are due to close?"  Partial, so it stays small
-- however many finished battles accumulate.
CREATE INDEX IF NOT EXISTS photo_battles_due_idx
  ON public.photo_battles (closes_at) WHERE status = 'active';

-- Matchmaking: "an opponent in this category and band, waiting longest".
CREATE INDEX IF NOT EXISTS photo_battles_matchmaking_idx
  ON public.photo_battles (category, band, queued_at) WHERE status = 'queued';

-- The vote cap, and any later fraud review.
CREATE INDEX IF NOT EXISTS photo_battle_votes_voter_time_idx
  ON public.photo_battle_votes (voter_id, created_at DESC);

-- A photographer's battle history on their profile.
CREATE INDEX IF NOT EXISTS photo_battles_finalized_idx
  ON public.photo_battles (finalized_at DESC) WHERE status = 'finalized';


-- ---------------------------------------------------------------------------------
-- 4. FINALISATION — one place where a battle ends and points are awarded.
--    Nothing else in the system may write points, wins or battles_played.
-- ---------------------------------------------------------------------------------

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

  -- ── Nobody voted. That is not a loss for anyone. ──────────────────────────
  IF b.votes_a + b.votes_b = 0 THEN
    IF b.requeue_count < public.battle_setting('requeue_limit') THEN
      UPDATE photo_battles
         SET status = 'queued', photo_b_id = NULL, closes_at = NULL,
             queued_at = NOW(), requeue_count = requeue_count + 1
       WHERE id = p_battle_id;
      -- The opponent goes back to the queue as its own entry.
      --
      -- Inserted directly rather than via queue_portfolio_item_for_battle().
      -- That function calls finalize_due_battles(), which calls back into this
      -- one - a cycle that could recurse through the whole due queue on every
      -- requeue. Breaking the finalize -> queue edge removes it entirely.
      IF b.photo_b_id IS NOT NULL THEN
        INSERT INTO photo_battles (photo_a_id, category, band, queued_at)
        SELECT b.photo_b_id, b.category,
               public.experience_band(pr.battles_played), NOW()
          FROM portfolio_items pi
          JOIN profiles pr ON pr.id = pi.photographer_id
         WHERE pi.id = b.photo_b_id
        ON CONFLICT DO NOTHING;   -- the partial unique index already stops
                                  -- a photo sitting in two open battles
      END IF;
      RETURN 'requeued';
    END IF;
    UPDATE photo_battles
       SET status = 'finalized', outcome = 'no_votes', finalized_at = NOW()
     WHERE id = p_battle_id;
    RETURN 'no_votes';
  END IF;

  -- ── A tie is a tie. v10 gave it to photo A; that was arbitrary. ───────────
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

  -- Entering always pays. This is the line that decides whether a new
  -- photographer stays after losing their first three battles.
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

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finalize_battle(UUID) FROM PUBLIC, anon, authenticated;


/**
 * Close every battle past its deadline.
 *
 * Bounded by LIMIT so one call can never turn into a long transaction, however
 * far behind the queue has fallen. Called opportunistically on vote and on
 * upload, so the engine keeps itself current without a scheduler; pg_cron is
 * added below as well, for days when nobody is active.
 */
CREATE OR REPLACE FUNCTION public.finalize_due_battles(p_limit INTEGER DEFAULT 50)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  r       RECORD;
  closed  INTEGER := 0;
BEGIN
  FOR r IN
    SELECT id FROM photo_battles
     WHERE status = 'active' AND closes_at IS NOT NULL AND closes_at <= NOW()
     ORDER BY closes_at
     LIMIT GREATEST(1, LEAST(p_limit, 200))
  LOOP
    PERFORM public.finalize_battle(r.id);
    closed := closed + 1;
  END LOOP;
  RETURN closed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_due_battles(INTEGER) TO authenticated;


-- ---------------------------------------------------------------------------------
-- 5. MATCHMAKING — same category, similar experience, longest wait first.
-- ---------------------------------------------------------------------------------

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

  SELECT public.experience_band(battles_played) INTO item_band
    FROM profiles WHERE id = item_owner;

  -- Keep the engine current while we are here. Cheap, bounded, and it means a
  -- quiet platform still resolves battles the moment anyone does anything.
  PERFORM public.finalize_due_battles(10);

  -- Look for an opponent: same category, never the same photographer, and
  -- either the same experience band or waiting long enough that we stop caring.
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
   ORDER BY (b.band = item_band) DESC,   -- prefer a same-band match
            b.queued_at ASC              -- then whoever has waited longest
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


-- ---------------------------------------------------------------------------------
-- 6. VOTING — one vote per person, never your own work, capped per day.
-- ---------------------------------------------------------------------------------

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

  UPDATE photo_battles
     SET votes_a = votes_a + CASE WHEN p_selected_photo_id = b.photo_a_id THEN 1 ELSE 0 END,
         votes_b = votes_b + CASE WHEN p_selected_photo_id = b.photo_b_id THEN 1 ELSE 0 END
   WHERE id = p_battle_id
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


-- ---------------------------------------------------------------------------------
-- 7. BACKFILL — existing battles get the new fields; any already past their
--    deadline (all of them, since nothing ever closed one) are resolved.
-- ---------------------------------------------------------------------------------

UPDATE public.photo_battles SET queued_at = created_at WHERE queued_at IS NULL;

UPDATE public.photo_battles b
   SET band = public.experience_band(p.battles_played)
  FROM public.portfolio_items pi
  JOIN public.profiles p ON p.id = pi.photographer_id
 WHERE pi.id = b.photo_a_id AND b.status = 'queued';

-- Active battles with no deadline would otherwise hang forever.
UPDATE public.photo_battles
   SET closes_at = NOW() + INTERVAL '24 hours'
 WHERE status = 'active' AND closes_at IS NULL;

COMMIT;

-- ---------------------------------------------------------------------------------
-- 8. SCHEDULING — belt and braces. The engine self-maintains on traffic; this
--    keeps it ticking on a quiet day. Skipped silently if pg_cron is absent.
-- ---------------------------------------------------------------------------------
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule('lensleague-finalize-battles')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lensleague-finalize-battles');
    PERFORM cron.schedule('lensleague-finalize-battles', '*/10 * * * *',
                          'SELECT public.finalize_due_battles(100)');
    RAISE NOTICE 'scheduled: battles finalise every 10 minutes via pg_cron';
  ELSE
    RAISE NOTICE 'pg_cron unavailable - battles still finalise on vote and upload, which is sufficient';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END
$do$;
