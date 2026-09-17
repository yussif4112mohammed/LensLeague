-- =================================================================================
-- migration v30 — close rounds on the clock, not only on traffic
--
-- THE GAP
--
-- finalize_due_battles() closes every round past its deadline, and it is already
-- called opportunistically: once on every vote, and once on every upload. So on
-- a busy platform rounds close by themselves. On a platform with ten accounts
-- they do not: a round opens, its 24 hours pass, and it stays 'active' until the
-- next person happens to vote or upload. LensLeague's first real vote is sitting
-- in exactly that state.
--
-- v15 tried to add a pg_cron job for this inside a DO block that skipped
-- silently when the extension was unavailable. Whether it took is not something
-- to assume - tonight's lesson was that a thing can look present from every
-- angle and never have run - so this migration schedules it unconditionally and
-- VERIFY_v30 asserts the job is really in cron.job.
--
-- WHY THIS IS SAFE TO RUN UNATTENDED
--
-- finalize_battle awards points, and profiles.points is guarded against client
-- writes. Two independent reasons the guard lets the engine through: v18
-- redefined finalize_battle to set lensleague.engine_write around the points
-- update, and the guard also passes when auth.uid() is NULL, which is the case
-- inside a cron run. Checked both before scheduling this.
--
-- The work is bounded by LIMIT inside the function, so one tick can never turn
-- into a long transaction however far behind the queue has fallen.
-- =================================================================================

BEGIN;

-- An active round with no deadline can never be found by finalize_due_battles,
-- which filters on closes_at IS NOT NULL. v15 backfilled these once; this keeps
-- the invariant true for anything that slipped through since.
UPDATE public.photo_battles
   SET closes_at = NOW() + (COALESCE(public.battle_setting('battle_hours'), 24) || ' hours')::INTERVAL
 WHERE status = 'active' AND closes_at IS NULL;

COMMIT;

-- Outside the transaction: CREATE EXTENSION and cron.schedule do not belong in
-- one, and a failure here should not roll back the backfill above.
DO $do$
DECLARE
  scheduled BOOLEAN := FALSE;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;

    -- Replace rather than duplicate: scheduling the same name twice leaves two
    -- jobs doing the same work.
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lensleague-finalize-battles') THEN
      PERFORM cron.unschedule('lensleague-finalize-battles');
    END IF;

    PERFORM cron.schedule(
      'lensleague-finalize-battles',
      '*/10 * * * *',
      'SELECT public.finalize_due_battles(100)'
    );
    scheduled := TRUE;
    RAISE NOTICE 'scheduled: rounds finalise every 10 minutes via pg_cron';
  ELSE
    RAISE WARNING 'pg_cron is NOT available on this project. Rounds will still close on vote and on upload, but not on a quiet day. VERIFY_v30 check 1 will fail - that is the honest result, not a mistake.';
  END IF;

  IF scheduled THEN
    -- Catch up immediately rather than waiting up to ten minutes for the first
    -- tick. Any round already past its deadline closes now.
    PERFORM public.finalize_due_battles(100);
  END IF;
END
$do$;
