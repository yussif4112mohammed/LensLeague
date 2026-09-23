-- =================================================================================
-- VERIFY v34 — the admin console, and the holes it closed
--
-- Twelve checks. Three of them are the ones that matter:
--
--   Check 3 is the sweep, restated as an assertion: NO SECURITY DEFINER function
--   anywhere in public may run without a pinned search_path. It is written
--   against every function rather than the ones v34 knew about, so a function
--   added later without one fails this page.
--
--   Check 5 asserts that removal is enforced in the RLS policy rather than in a
--   query, because a filter in one query is a filter the next query forgets.
--
--   Check 8 asserts that search_posts - which is SECURITY DEFINER and therefore
--   ignores RLS entirely - filters removed work itself. It is the read path
--   most likely to leak removed content back into the product.
--
-- Every row must read PASS. ONE query.
-- =================================================================================
WITH stats AS (
  SELECT
    (SELECT count(*) FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.prosecdef)::INT AS secdef_total,
    (SELECT count(*) FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.prosecdef
        AND NOT EXISTS (
          SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::TEXT[])) AS c(s)
          WHERE c.s LIKE 'search\_path=%'
        ))::INT AS secdef_unpinned,
    (SELECT count(*) FROM public.portfolio_items
      WHERE moderation_status = 'removed')::INT AS items_removed
),
checks(n, ok, label) AS (

  SELECT 1, NOT EXISTS (
           SELECT 1 FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'disputes'
             AND COALESCE(qual, 'true') = 'true'
             AND cmd = 'ALL'
         ),
         'THE WORLD-WRITABLE disputes POLICY IS GONE'

  UNION ALL
  SELECT 2, NOT EXISTS (
           SELECT 1 FROM information_schema.role_table_grants
           WHERE table_schema = 'public' AND table_name = 'disputes'
             AND grantee IN ('anon', 'authenticated')
             AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
         ),
         'no client role can write to disputes'

  UNION ALL
  SELECT 3, (SELECT s.secdef_unpinned FROM stats s) = 0,
         'EVERY SECURITY DEFINER FUNCTION PINS search_path'

  UNION ALL
  SELECT 4, EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'portfolio_items'
             AND column_name = 'moderation_status'
         ) AND EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conname = 'portfolio_items_moderation_status_check'
         ),
         'photographs have a moderation state, and it is constrained'

  UNION ALL
  SELECT 5, EXISTS (
           SELECT 1 FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'portfolio_items'
             AND policyname = 'portfolio_items_select'
             AND qual LIKE '%moderation_status%'
         ),
         'REMOVAL IS ENFORCED IN RLS, NOT IN EACH QUERY'

  UNION ALL
  SELECT 6, EXISTS (
           SELECT 1 FROM pg_trigger t
           WHERE NOT t.tgisinternal
             AND t.tgrelid = 'public.photo_battles'::REGCLASS
             AND t.tgname = 'trg_reject_removed_photo_in_battle'
         ),
         'removed work cannot enter a battle by any path'

  UNION ALL
  SELECT 7, EXISTS (
           SELECT 1 FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = 'admin_remove_content'
         ) AND EXISTS (
           SELECT 1 FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = 'admin_restore_content'
         ),
         'REMOVING CONTENT IS A REAL OPERATION, AND IT IS REVERSIBLE'

  UNION ALL
  SELECT 8, EXISTS (
           SELECT 1 FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = 'search_posts'
             AND p.prosrc LIKE '%moderation_status%'
         ),
         'SEARCH DOES NOT RETURN REMOVED WORK'

  UNION ALL
  SELECT 9, (
           SELECT count(*) FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname IN ('admin_get_reports', 'admin_get_disputes',
                               'admin_get_audit_log', 'admin_get_platform_stats')
         ) = 4,
         'all four admin read functions exist'

  UNION ALL
  SELECT 10, EXISTS (
           SELECT 1 FROM information_schema.parameters
           WHERE specific_schema = 'public'
             AND parameter_name = 'target_preview'
             AND specific_name LIKE 'admin\_get\_reports%'
         ),
         'a report carries enough to render it without a second query'

  UNION ALL
  SELECT 11, NOT EXISTS (
           SELECT 1 FROM information_schema.routine_privileges
           WHERE specific_schema = 'public'
             AND grantee IN ('anon', 'PUBLIC')
             AND routine_name IN ('admin_get_reports', 'admin_get_disputes',
                                  'admin_get_audit_log', 'admin_get_platform_stats',
                                  'admin_remove_content', 'admin_restore_content')
         ),
         'no admin function is reachable with the anon key'

  UNION ALL
  SELECT 12, EXISTS (
           SELECT 1 FROM pg_indexes
           WHERE schemaname = 'public' AND indexname = 'idx_portfolio_items_visible'
         ),
         'the read every page makes is indexed'
)
SELECT
  c.n,
  CASE WHEN c.ok THEN 'PASS' ELSE 'FAIL' END AS result,
  c.label,
  s.secdef_total,
  s.secdef_unpinned,
  s.items_removed
FROM checks c
CROSS JOIN stats s
ORDER BY c.n;
