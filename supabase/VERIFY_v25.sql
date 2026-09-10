-- =================================================================================
-- VERIFY v25 — run AFTER migration_v25_portfolio_rls.sql
--
-- ONE query. Checks 1-12 are SHAPE. Check 13 is the one that matters, and it is
-- deliberately the last thing you read before the instruction at the bottom.
--
-- Shape is not behaviour. This exact codebase produced VERIFY_v18 at 20/20 while
-- messaging was completely unusable, and carried a green schema for eleven
-- migrations while no photograph could be published at all. A green result here
-- means the policies exist. It does NOT mean an upload works.
-- =================================================================================
WITH checks AS (
  SELECT 1 AS n, 'albums has policies at all' AS label,
         (SELECT COUNT(*) FROM pg_policies
           WHERE schemaname='public' AND tablename='albums') >= 4 AS ok
  UNION ALL SELECT 2, 'portfolio_items has policies at all',
         (SELECT COUNT(*) FROM pg_policies
           WHERE schemaname='public' AND tablename='portfolio_items') >= 4
  UNION ALL SELECT 3, 'albums can be READ',
         EXISTS (SELECT 1 FROM pg_policies WHERE tablename='albums' AND cmd='SELECT')
  UNION ALL SELECT 4, 'albums can be WRITTEN - the step the upload died on',
         EXISTS (SELECT 1 FROM pg_policies WHERE tablename='albums' AND cmd='INSERT')
  UNION ALL SELECT 5, 'portfolio_items can be READ',
         EXISTS (SELECT 1 FROM pg_policies WHERE tablename='portfolio_items' AND cmd='SELECT')
  UNION ALL SELECT 6, 'portfolio_items can be WRITTEN',
         EXISTS (SELECT 1 FROM pg_policies WHERE tablename='portfolio_items' AND cmd='INSERT')
  UNION ALL SELECT 7, 'the INSERT policies carry a WITH CHECK, not just a USING',
         (SELECT COUNT(*) FROM pg_policies
           WHERE tablename IN ('albums','portfolio_items')
             AND cmd='INSERT' AND with_check IS NOT NULL) = 2
  UNION ALL SELECT 8, 'a photograph cannot be inserted into someone else''s album',
         EXISTS (SELECT 1 FROM pg_policies
                  WHERE tablename='portfolio_items' AND cmd='INSERT'
                    AND with_check LIKE '%album_is_mine%')
  UNION ALL SELECT 9, 'the visibility helpers are DEFINER with a pinned search_path',
         (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace nsp ON nsp.oid=p.pronamespace
           WHERE nsp.nspname='public'
             AND p.proname IN ('album_is_visible','album_is_mine','viewer_is_banned')
             AND p.prosecdef
             AND EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,'{}')) c
                          WHERE c LIKE 'search_path=%')) = 3
  UNION ALL SELECT 10, 'portfolio_items policies do NOT read albums directly (no recursion)',
         NOT EXISTS (SELECT 1 FROM pg_policies
                      WHERE tablename='portfolio_items'
                        AND (COALESCE(qual,'') LIKE '%FROM albums%'
                          OR COALESCE(with_check,'') LIKE '%FROM albums%'))
  UNION ALL SELECT 11, 'anon cannot write either table',
         NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                      WHERE table_name IN ('albums','portfolio_items')
                        AND grantee='anon'
                        AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE'))
  UNION ALL SELECT 12, 'nobody can TRUNCATE either table',
         NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                      WHERE table_name IN ('albums','portfolio_items')
                        AND grantee IN ('anon','authenticated')
                        AND privilege_type='TRUNCATE')
  UNION ALL SELECT 13, 'NO table in public is RLS-locked against its own app',
         (SELECT COUNT(*) FROM public.audit_rls_without_policies()) = 0
)
SELECT n AS "#", label AS check,
       CASE WHEN ok THEN 'PASS' ELSE '*** FAIL ***' END AS result
FROM checks
ORDER BY n;

-- =================================================================================
-- CHECK 13, AND WHAT TO DO NEXT
--
-- If check 13 FAILS, run this to see which tables are still locked against the
-- application - the same condition that made every upload vanish:
--
--   SELECT * FROM public.audit_rls_without_policies();
--
-- THE ONLY PROOF THAT COUNTS
-- This script runs as the postgres role in the SQL editor, which BYPASSES RLS
-- entirely. It therefore cannot test what a signed-in photographer experiences,
-- and no amount of PASS here substitutes for:
--
--   1. Sign in to the app as a normal user.
--   2. Upload a photograph.
--   3. It appears in the feed and in your portfolio.
--   4. Then confirm the row is real:
--        SELECT COUNT(*) FROM public.portfolio_items;   -- must be >= 1
--        SELECT COUNT(*) FROM public.albums;            -- must be >= 1
--
-- Until step 3 happens with your own eyes, this migration is unproven. That is
-- not pedantry: this table has read as fine for eleven migrations.
-- =================================================================================
