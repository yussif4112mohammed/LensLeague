-- =================================================================================
-- MIGRATION v28 — THE GUARD WAS EATING ITS OWN COUNTER
--
-- THE SYMPTOM
-- You like a photograph. The heart fills. The number stays 0. There are 9 rows
-- in likes and portfolio_items.like_count sums to 0 across the whole table.
--
-- THE CAUSE, AND IT IS NOT WHAT IT LOOKS LIKE
-- Everything involved is present and working:
--   - trg_sync_item_like_count exists on likes, and is ENABLED
--   - all 9 likes carry item_id, which is what the counter keys on
--   - sync_item_like_count() does UPDATE portfolio_items SET like_count + 1
--
-- And then trg_guard_item_counters, a BEFORE UPDATE trigger on the very table
-- being updated, runs guard_item_counters(), which says:
--
--     IF public.is_staff() THEN RETURN NEW; END IF;
--     NEW.like_count := OLD.like_count;      -- <-- here
--
-- It reverts the increment. Every time. The counter increments and the guard
-- puts it straight back, in the same statement, silently.
--
-- The guard is right to exist: without it a client could PATCH their own
-- like_count and invent popularity. It simply cannot tell the difference
-- between a user lying about a number and the platform's own bookkeeping doing
-- its job - so it blocks both.
--
-- WE HAVE ALREADY SOLVED THIS ONCE
-- Migration v18 fixed the identical bug for profiles.points: the guard triggers
-- there were reverting the battle engine's own point awards. The answer was
-- engine_is_writing(), a transaction-local flag set with
-- set_config('lensleague.engine_write', 'on', true) that lets a guard recognise
-- the platform acting on a user's behalf. is_local = true, so it dies with the
-- transaction even if something raises, and no client can turn it on.
--
-- v18 applied that to the profiles guards and stopped. The portfolio_items
-- counters were left with the same fault, unnoticed because nobody could
-- upload a photograph to like until migration v25 two days ago.
-- =================================================================================

BEGIN;

-- ---------------------------------------------------------------------------------
-- 1. THE GUARD LEARNS TO RECOGNISE THE PLATFORM
--
--    Unchanged for clients: a user PATCHing like_count, comment_count or votes
--    still has it reverted. The only addition is that the counter triggers,
--    which announce themselves with the v18 flag, are let through.
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_item_counters()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- Staff, and the platform's own bookkeeping. engine_is_writing() is only true
  -- inside a function that set the transaction-local flag, which no client can
  -- do - see migration v18.
  IF public.is_staff() OR public.engine_is_writing() THEN
    RETURN NEW;
  END IF;

  NEW.like_count    := OLD.like_count;
  NEW.comment_count := OLD.comment_count;
  NEW.votes         := OLD.votes;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_item_counters() IS
  'Stops a client writing its own like_count, comment_count or votes. Lets the '
  'counter triggers through via the v18 engine flag - without that exemption it '
  'reverted the platform''s own increments and every count sat at zero.';

-- ---------------------------------------------------------------------------------
-- 2. THE COUNTERS ANNOUNCE THEMSELVES
--
--    The flag is set inside these functions rather than by their callers, so a
--    like inserted from anywhere - the app, an admin tool, a future backfill -
--    counts correctly. It is turned off again immediately: the exemption lasts
--    for one UPDATE, not for the rest of the transaction.
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_item_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.item_id IS NOT NULL THEN
    PERFORM set_config('lensleague.engine_write', 'on', true);
    UPDATE public.portfolio_items SET like_count = like_count + 1 WHERE id = NEW.item_id;
    PERFORM set_config('lensleague.engine_write', 'off', true);
  ELSIF TG_OP = 'DELETE' AND OLD.item_id IS NOT NULL THEN
    PERFORM set_config('lensleague.engine_write', 'on', true);
    UPDATE public.portfolio_items
       SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.item_id;
    PERFORM set_config('lensleague.engine_write', 'off', true);
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_item_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.item_id IS NOT NULL THEN
    PERFORM set_config('lensleague.engine_write', 'on', true);
    UPDATE public.portfolio_items SET comment_count = comment_count + 1 WHERE id = NEW.item_id;
    PERFORM set_config('lensleague.engine_write', 'off', true);
  ELSIF TG_OP = 'DELETE' AND OLD.item_id IS NOT NULL THEN
    PERFORM set_config('lensleague.engine_write', 'on', true);
    UPDATE public.portfolio_items
       SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.item_id;
    PERFORM set_config('lensleague.engine_write', 'off', true);
  END IF;
  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------------
-- 3. BACKFILL WHAT WAS LOST
--
--    Nine real likes were reverted into nothing. The rows are all still there,
--    so the true count is recoverable by counting them - which is also the only
--    honest way to set these: derive from the rows, never from a guess.
--
--    This runs with the flag on for the whole statement, for the same reason the
--    triggers need it.
-- ---------------------------------------------------------------------------------
DO $do$
DECLARE v_likes INTEGER; v_comments INTEGER;
BEGIN
  PERFORM set_config('lensleague.engine_write', 'on', true);

  UPDATE public.portfolio_items pi
     SET like_count = COALESCE(c.n, 0)
    FROM (SELECT item_id, COUNT(*) AS n FROM public.likes
           WHERE item_id IS NOT NULL GROUP BY item_id) c
   WHERE pi.id = c.item_id AND pi.like_count IS DISTINCT FROM c.n;

  UPDATE public.portfolio_items pi
     SET comment_count = COALESCE(c.n, 0)
    FROM (SELECT item_id, COUNT(*) AS n FROM public.comments
           WHERE item_id IS NOT NULL GROUP BY item_id) c
   WHERE pi.id = c.item_id AND pi.comment_count IS DISTINCT FROM c.n;

  -- And zero anything whose rows have all gone, so a stale count cannot linger.
  UPDATE public.portfolio_items
     SET like_count = 0
   WHERE like_count <> 0
     AND id NOT IN (SELECT item_id FROM public.likes WHERE item_id IS NOT NULL);

  PERFORM set_config('lensleague.engine_write', 'off', true);

  SELECT COALESCE(SUM(like_count),0), COALESCE(SUM(comment_count),0)
    INTO v_likes, v_comments FROM public.portfolio_items;
  RAISE NOTICE 'backfilled: like_count sums to %, comment_count sums to %', v_likes, v_comments;
END
$do$;

COMMIT;
