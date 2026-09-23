-- =================================================================================
-- VERIFY v35 — The Brief
--
-- Eleven checks. The three that carry the feature:
--
--   Check 2 — one brief at a time, enforced by an exclusion constraint on the
--   time range rather than by a flag somebody has to remember to clear.
--
--   Check 6 — an entry must be a photograph made DURING the window. This is the
--   whole feature. Without it the Brief is a tagging exercise over an archive
--   and nobody picks up a camera.
--
--   Check 9 — no client role may write briefs or brief_entries directly. Every
--   rule above lives in enter_brief; a client that can INSERT into the table
--   skips all four by calling PostgREST.
--
-- Every row must read PASS. ONE query.
-- =================================================================================
WITH stats AS (
  SELECT
    (SELECT count(*) FROM public.briefs)::INT        AS briefs_total,
    (SELECT count(*) FROM public.brief_entries)::INT AS entries_total,
    (SELECT count(*) FROM public.briefs
      WHERE NOW() >= opens_at AND NOW() < closes_at)::INT AS briefs_open
),
body AS (
  SELECT
    (SELECT p.prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'enter_brief')                    AS enter_src,
    (SELECT p.prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'queue_portfolio_item_for_battle') AS queue_src
),
checks(n, ok, label) AS (

  SELECT 1, to_regclass('public.briefs') IS NOT NULL
         AND to_regclass('public.brief_entries') IS NOT NULL,
         'both tables exist'

  UNION ALL
  SELECT 2, EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conname = 'briefs_no_overlap'
             AND conrelid = 'public.briefs'::REGCLASS
             AND contype = 'x'
         ),
         'ONE BRIEF AT A TIME, ENFORCED BY THE DATABASE'

  UNION ALL
  SELECT 3, (SELECT value FROM public.battle_settings WHERE key = 'brief_max_entries') = 3,
         'the entry cap is a setting, not a literal in three functions'

  UNION ALL
  SELECT 4, (
           SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname IN ('get_current_brief', 'enter_brief', 'get_brief_entries',
                               'admin_create_brief', 'admin_get_briefs')
         ) = 5,
         'all five brief functions exist'

  UNION ALL
  SELECT 5, NOT EXISTS (
           SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname IN ('get_current_brief', 'enter_brief', 'get_brief_entries',
                               'admin_create_brief', 'admin_get_briefs')
             AND p.prosecdef
             AND NOT EXISTS (
               SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::TEXT[])) AS c(s)
               WHERE c.s LIKE 'search\_path=%'
             )
         ),
         'each one pins its search_path'

  UNION ALL
  SELECT 6, (SELECT b.enter_src FROM body b) LIKE '%v_created < b.opens_at%',
         'AN ENTRY MUST BE SHOT DURING THE BRIEF WINDOW'

  UNION ALL
  SELECT 7, (SELECT b.enter_src FROM body b) LIKE '%v_used >= v_max%',
         'the three-entry cap is checked server-side'

  UNION ALL
  SELECT 8, (SELECT b.enter_src FROM body b) LIKE '%queue_portfolio_item_for_battle%',
         'entering is what queues a photograph for battle'

  UNION ALL
  SELECT 9, NOT EXISTS (
           SELECT 1 FROM information_schema.role_table_grants
           WHERE table_schema = 'public'
             AND table_name IN ('briefs', 'brief_entries')
             AND grantee IN ('anon', 'authenticated')
             AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
         ),
         'NO CLIENT ROLE CAN WRITE AN ENTRY DIRECTLY AND SKIP THE RULES'

  UNION ALL
  SELECT 10, (SELECT b.queue_src FROM body b) LIKE '%brief_entries%',
         'battle matching prefers two answers to the same constraint'

  UNION ALL
  SELECT 11, (
           SELECT count(*) FROM pg_indexes
           WHERE schemaname = 'public'
             AND indexname IN ('idx_brief_entries_gallery', 'idx_brief_entries_by_user',
                               'idx_brief_entries_item', 'idx_briefs_window')
         ) = 4,
         'the reads every brief page makes are indexed'
)
SELECT
  c.n,
  CASE WHEN c.ok THEN 'PASS' ELSE 'FAIL' END AS result,
  c.label,
  s.briefs_total,
  s.briefs_open,
  s.entries_total
FROM checks c
CROSS JOIN stats s
ORDER BY c.n;
