-- =================================================================================
-- LENSLEAGUE — WHICH MIGRATIONS ARE ACTUALLY LIVE?  (READ ONLY)
-- ---------------------------------------------------------------------------------
-- There is no migrations table in this project: files are applied by hand in the
-- SQL editor, so the only honest way to know what a database has is to look for
-- the objects each migration creates.
--
-- Run this in the Supabase SQL editor. It writes nothing.
-- Read the STATE column. Apply any migration reported as MISSING, in order,
-- before applying the next one.
-- =================================================================================

WITH have AS (
  SELECT
    -- v14 introduced the messaging shape the frontend is written against
    to_regclass('public.message_threads')    IS NOT NULL AS v14_threads,
    to_regclass('public.thread_participants') IS NOT NULL AS v14_participants,
    EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='profiles'
               AND column_name='cover_url')               AS v14_cover_url,
    -- v15 is the battle engine
    to_regclass('public.battle_settings')    IS NOT NULL AS v15_settings,
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='finalize_battle')      AS v15_finalize,
    -- v16 is the leaderboard
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='get_leaderboard')      AS v16_leaderboard,
    -- v17 is the monthly wrap
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='get_my_wrap')          AS v17_wrap,
    -- v18 is the security series
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='engine_is_writing')    AS v18_engine_flag,
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='guard_profile_privileged_columns'
               AND p.prosrc LIKE '%engine_is_writing%')                     AS v18_guard_patched
),

state(sort, migration, state, detail) AS (
  SELECT 1, 'v14  schema reconciliation',
    CASE WHEN v14_threads AND v14_participants AND v14_cover_url THEN 'APPLIED'
         WHEN v14_threads OR  v14_participants OR  v14_cover_url THEN 'PARTIAL — investigate'
         ELSE 'MISSING' END,
    format('message_threads=%s thread_participants=%s profiles.cover_url=%s',
           v14_threads, v14_participants, v14_cover_url)
  FROM have
  UNION ALL
  SELECT 2, 'v15  battle engine',
    CASE WHEN v15_settings AND v15_finalize THEN 'APPLIED'
         WHEN v15_settings OR  v15_finalize THEN 'PARTIAL — investigate'
         ELSE 'MISSING' END,
    format('battle_settings=%s finalize_battle=%s', v15_settings, v15_finalize)
  FROM have
  UNION ALL
  SELECT 3, 'v16  leaderboard',
    CASE WHEN v16_leaderboard THEN 'APPLIED' ELSE 'MISSING' END,
    format('get_leaderboard=%s', v16_leaderboard)
  FROM have
  UNION ALL
  SELECT 4, 'v17  monthly wrap',
    CASE WHEN v17_wrap THEN 'APPLIED' ELSE 'MISSING' END,
    format('get_my_wrap=%s', v17_wrap)
  FROM have
  UNION ALL
  SELECT 5, 'v18  security fixes',
    CASE WHEN v18_engine_flag AND v18_guard_patched THEN 'APPLIED'
         WHEN v18_engine_flag OR  v18_guard_patched THEN 'PARTIAL — investigate'
         ELSE 'MISSING' END,
    format('engine_is_writing=%s guard patched=%s', v18_engine_flag, v18_guard_patched)
  FROM have
),

-- ── S3 EXPOSURE ──────────────────────────────────────────────────────────────
-- If v15 has been live and battles have already finalised, every point award
-- those battles made was silently reverted by the v11/v15 guard triggers. v18
-- stops that happening again but does NOT retroactively pay the battles that
-- already closed. This row says whether any repair is owed.
s3 AS (
  SELECT 6 AS sort,
         's3   points lost before v18' AS migration,
         CASE
           WHEN to_regclass('public.photo_battles') IS NULL THEN 'n/a — no photo_battles table'
           WHEN (SELECT COUNT(*) FROM public.photo_battles
                  WHERE status = 'completed') = 0 THEN 'NOTHING OWED — no battle has closed yet'
           ELSE 'CHECK — battles closed before v18, awards were reverted'
         END AS state,
         CASE
           WHEN to_regclass('public.photo_battles') IS NULL THEN ''
           ELSE format('completed battles=%s   sum(profiles.points)=%s',
                (SELECT COUNT(*) FROM public.photo_battles WHERE status='completed'),
                (SELECT COALESCE(SUM(points),0) FROM public.profiles))
         END AS detail
)

SELECT migration, state, detail
  FROM (SELECT * FROM state UNION ALL SELECT * FROM s3) x
 ORDER BY sort;
