-- =================================================================================
-- VERIFY v30 — run AFTER migration_v30_finalise_schedule.sql. ONE query.
--
-- Check 1 is structural and check 5 is behavioural. If 1 passes and 5 does not,
-- the scheduler is in place and simply has nothing due yet - that is fine. If 1
-- fails, pg_cron is unavailable on this project and rounds only close when
-- somebody votes or uploads; say so rather than assuming it is handled.
-- =================================================================================
WITH checks AS (
  SELECT 1 AS n, 'the finalise job is scheduled in pg_cron' AS label,
         EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lensleague-finalize-battles') AS ok
  UNION ALL SELECT 2, 'it runs every ten minutes',
         EXISTS (SELECT 1 FROM cron.job
                  WHERE jobname = 'lensleague-finalize-battles' AND schedule = '*/10 * * * *')
  UNION ALL SELECT 3, 'it calls the bounded function, not a bare loop',
         EXISTS (SELECT 1 FROM cron.job
                  WHERE jobname = 'lensleague-finalize-battles'
                    AND command LIKE '%finalize_due_battles%')
  UNION ALL SELECT 4, 'no active round is missing a deadline',
         NOT EXISTS (SELECT 1 FROM public.photo_battles
                      WHERE status = 'active' AND closes_at IS NULL)
  UNION ALL SELECT 5, 'AT LEAST ONE ROUND HAS BEEN FINALISED',
         EXISTS (SELECT 1 FROM public.photo_battles WHERE status = 'finalized')
  UNION ALL SELECT 6, 'every finalised round carries an outcome',
         NOT EXISTS (SELECT 1 FROM public.photo_battles
                      WHERE status = 'finalized' AND outcome IS NULL)
  UNION ALL SELECT 7, 'points were only ever awarded by the engine (nobody is negative)',
         NOT EXISTS (SELECT 1 FROM public.profiles WHERE COALESCE(points, 0) < 0)
)
SELECT n,
       CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result,
       label,
       (SELECT COUNT(*) FROM public.photo_battles WHERE status = 'active')    AS rounds_open,
       (SELECT COUNT(*) FROM public.photo_battles WHERE status = 'finalized') AS rounds_closed,
       (SELECT COUNT(*) FROM public.photo_battle_votes)                       AS votes_total
  FROM checks
 ORDER BY (CASE WHEN ok THEN 1 ELSE 0 END), n;
