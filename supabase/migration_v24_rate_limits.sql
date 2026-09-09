-- =================================================================================
-- MIGRATION v24 — RATE LIMITING ON THE WRITE PATHS
--
-- WHY THIS LIVES IN THE DATABASE
-- LensLeague has no application server. The browser holds the anon key and talks
-- to PostgREST directly, so there is no middleware layer where a limiter could
-- sit. Anything enforced in JavaScript is enforced nowhere: a person with the
-- public key and curl skips the entire front end. Postgres is the only place a
-- limit is actually a limit, so that is where these are.
--
-- WHAT IS NOT HERE, AND WHY
-- Signup is absent on purpose. Postgres cannot see the client IP - PostgREST
-- does not forward it - so a per-IP signup cap is not expressible here, and a
-- per-user one is meaningless because the user does not exist yet. Supabase Auth
-- already rate-limits signup and OTP at its own layer, which is the correct
-- layer. Writing a signup rule here would be security theatre: a row that looks
-- like protection and stops nothing.
--
-- Voting is absent too, because it is already capped: battle_settings
-- .daily_vote_cap has enforced it since migration v15. Two limiters on one path
-- disagree eventually, and the older one is the one the product is tuned to.
--
-- THE COUNTING MODEL
-- A fixed-window counter, one row per (user, action, window), incremented with
-- an upsert. The alternative - counting rows in the target table on every insert
-- - is more precise but wrong for this codebase in two ways. It grows in cost
-- with a user's history rather than staying constant, and it can be reset by
-- deleting: unfollow then refollow, or delete a photo, and the quota comes back.
-- An append-only counter cannot be laundered that way.
--
-- The known cost of fixed windows is boundary burst: sixty uploads at 23:59 and
-- sixty more at 00:01 is a hundred and twenty inside two minutes. A sliding
-- window would close that at the price of storing every event. At these
-- thresholds a doubled burst is not an attack, so this trade is taken
-- deliberately rather than by accident.
-- =================================================================================

BEGIN;

-- ---------------------------------------------------------------------------------
-- 1. THE POLICY TABLE
--
--    Limits are DATA, not code. A photographer complaining that sixty uploads a
--    day is too few should be a one-row UPDATE, not a migration and a deploy.
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  action          TEXT PRIMARY KEY,
  window_seconds  INTEGER NOT NULL CHECK (window_seconds BETWEEN 1 AND 2592000),
  max_count       INTEGER NOT NULL CHECK (max_count > 0),
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  note            TEXT
);

COMMENT ON TABLE public.rate_limits IS
  'Tunable write limits, one row per action. Edit these rather than the triggers.';

INSERT INTO public.rate_limits (action, window_seconds, max_count, note) VALUES
  ('upload',  86400, 60,
   'A wedding gallery is a real day of work. Low enough that a script cannot flood the feed, high enough that nobody doing the thing we want them to do ever meets it.'),
  ('comment',  3600, 60,
   'One a minute, sustained, for an hour. Past that it is not conversation.'),
  ('follow',  86400, 200,
   'Follow-spam is the oldest growth hack there is. Two hundred is far beyond what a person browsing does and far below what a bot needs.'),
  ('like',     3600, 300,
   'Liking is cheap and mostly harmless, so this is loose - it exists to stop a runaway loop, not to police enthusiasm.'),
  ('thread',  86400, 20,
   'The real messaging abuse is opening conversations with strangers, not volume inside one. Twenty new threads a day is a busy freelancer; two hundred is a spammer.'),
  ('message',  3600, 200,
   'Deliberately generous. Someone messaging one client two hundred times is having a bad day, not attacking the platform.')
ON CONFLICT (action) DO NOTHING;

-- ---------------------------------------------------------------------------------
-- 2. THE COUNTERS
--
--    One row per user per action per window. Bounded: a user who does everything
--    every day holds six rows a day, and section 6 prunes what has expired.
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,
  window_start  TIMESTAMPTZ NOT NULL,
  count         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, action, window_start)
);

-- Pruning scans by age, so give it an index rather than a sequential scan of
-- every counter the platform has ever written.
CREATE INDEX IF NOT EXISTS rate_limit_counters_window_idx
  ON public.rate_limit_counters (window_start);

ALTER TABLE public.rate_limits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_counters  ENABLE ROW LEVEL SECURITY;

-- The policy is public knowledge: the UI should be able to say "you have used 58
-- of 60 uploads today" rather than letting the write fail with a surprise.
DROP POLICY IF EXISTS rate_limits_readable ON public.rate_limits;
CREATE POLICY rate_limits_readable ON public.rate_limits
  FOR SELECT TO anon, authenticated USING (TRUE);

DROP POLICY IF EXISTS rate_limits_staff_write ON public.rate_limits;
CREATE POLICY rate_limits_staff_write ON public.rate_limits
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- A user may read their own counters and nobody else's. No client may write one
-- under any circumstance - only the SECURITY DEFINER function below does, which
-- is the whole point. A limiter a client can UPDATE is not a limiter.
DROP POLICY IF EXISTS rate_limit_counters_own ON public.rate_limit_counters;
CREATE POLICY rate_limit_counters_own ON public.rate_limit_counters
  FOR SELECT TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.rate_limit_counters FROM anon, authenticated;
GRANT SELECT ON public.rate_limit_counters TO authenticated;
REVOKE ALL ON public.rate_limits FROM anon, authenticated;
GRANT SELECT ON public.rate_limits TO anon, authenticated;

-- ---------------------------------------------------------------------------------
-- 3. THE COUNTER ITSELF
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_rate_limit(p_action TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_win     INTEGER;
  v_max     INTEGER;
  v_on      BOOLEAN;
  v_bucket  TIMESTAMPTZ;
  v_count   INTEGER;
BEGIN
  -- No session at all. RLS has already refused this write on its own terms;
  -- there is no user to attribute a count to, and inventing one would be wrong.
  IF v_uid IS NULL THEN RETURN; END IF;

  -- Staff doing moderation, and the battle engine writing on a user's behalf,
  -- are not the user spending their own quota. engine_is_writing() is the
  -- transaction-local flag introduced in v18 for exactly this distinction.
  IF public.is_staff() OR public.engine_is_writing() THEN RETURN; END IF;

  SELECT window_seconds, max_count, enabled
    INTO v_win, v_max, v_on
    FROM public.rate_limits
   WHERE action = p_action;

  -- An action with no policy row is unlimited. That is the safe default here:
  -- a typo in a trigger argument must not silently block a write path.
  IF NOT FOUND OR NOT v_on THEN RETURN; END IF;

  v_bucket := to_timestamp(floor(extract(epoch FROM NOW()) / v_win) * v_win);

  -- The upsert takes a row lock, so two concurrent uploads from the same person
  -- serialise here and neither can read a stale count. This is what makes the
  -- limit hold under a parallel client rather than only under a polite one.
  INSERT INTO public.rate_limit_counters AS c (user_id, action, window_start, count)
  VALUES (v_uid, p_action, v_bucket, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = c.count + 1
  RETURNING c.count INTO v_count;

  IF v_count > v_max THEN
    -- Raising rolls back this transaction, and with it the increment that just
    -- pushed the counter past the limit. The stored count therefore rests AT the
    -- maximum rather than climbing forever while someone retries - so a person
    -- who stops for the rest of the window gets their next window whole.
    --
    -- The message is prefixed so the client can recognise it without depending
    -- on the HTTP status PostgREST happens to map SQLSTATE to.
    RAISE EXCEPTION 'RATE_LIMIT: you have reached the limit for %. Try again later.', p_action
      USING ERRCODE = 'P0001',
            HINT = format('%s per %s seconds', v_max, v_win);
  END IF;
END;
$$;

COMMENT ON FUNCTION public.consume_rate_limit(TEXT) IS
  'Increments the caller''s counter for one action and raises if it exceeds the '
  'policy in rate_limits. SECURITY DEFINER so the counters stay unwritable by '
  'clients; exempt for staff and for the battle engine.';

-- Deliberately NOT granted to anon or authenticated. Nothing outside a trigger
-- calls this. A client that could call it directly could burn its own quota, and
-- more to the point could probe the limits by exhausting them.
REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------
-- 4. ONE TRIGGER FUNCTION, PARAMETERISED BY ACTION
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.consume_rate_limit(TG_ARGV[0]);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_rate_limit() IS
  'BEFORE INSERT guard. Takes the action name as its first trigger argument.';

-- ---------------------------------------------------------------------------------
-- 5. ATTACH
--
--    BEFORE INSERT, so a refused write costs nothing: nothing is inserted, no
--    index is touched, no downstream trigger fires.
-- ---------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS rate_limit_upload  ON public.portfolio_items;
CREATE TRIGGER rate_limit_upload  BEFORE INSERT ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('upload');

DROP TRIGGER IF EXISTS rate_limit_comment ON public.comments;
CREATE TRIGGER rate_limit_comment BEFORE INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('comment');

DROP TRIGGER IF EXISTS rate_limit_follow  ON public.follows;
CREATE TRIGGER rate_limit_follow  BEFORE INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('follow');

DROP TRIGGER IF EXISTS rate_limit_like    ON public.likes;
CREATE TRIGGER rate_limit_like    BEFORE INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('like');

-- The thread, not the participant rows: get_or_create_thread inserts two
-- participants per conversation, and counting those would halve the real limit
-- and would also charge the person being written to.
DROP TRIGGER IF EXISTS rate_limit_thread  ON public.message_threads;
CREATE TRIGGER rate_limit_thread  BEFORE INSERT ON public.message_threads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('thread');

DROP TRIGGER IF EXISTS rate_limit_message ON public.messages;
CREATE TRIGGER rate_limit_message BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit('message');

-- ---------------------------------------------------------------------------------
-- 6. PRUNING
--
--    Expired counters are dead weight. Keeping two windows' worth leaves room to
--    inspect a limit that has just tripped while still bounding the table.
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prune_rate_limit_counters()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_keep INTERVAL;
  v_n    INTEGER;
BEGIN
  SELECT make_interval(secs => COALESCE(MAX(window_seconds), 86400) * 2)
    INTO v_keep FROM public.rate_limits;
  DELETE FROM public.rate_limit_counters WHERE window_start < NOW() - v_keep;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_rate_limit_counters() FROM PUBLIC, anon, authenticated;

COMMIT;

-- ---------------------------------------------------------------------------------
-- 7. SCHEDULING — same belt-and-braces pattern as v15. Nothing breaks without it;
--    the table simply grows until someone prunes by hand.
-- ---------------------------------------------------------------------------------
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule('lensleague-prune-rate-limits')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lensleague-prune-rate-limits');
    PERFORM cron.schedule('lensleague-prune-rate-limits', '17 4 * * *',
                          'SELECT public.prune_rate_limit_counters()');
    RAISE NOTICE 'scheduled: rate limit counters pruned nightly via pg_cron';
  ELSE
    RAISE NOTICE 'pg_cron unavailable - run SELECT public.prune_rate_limit_counters() periodically';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END
$do$;
