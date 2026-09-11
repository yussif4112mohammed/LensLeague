-- =================================================================================
-- VERIFY v26 — run AFTER migration_v26_saved_and_connections.sql
-- ONE query. Shape only; the proof is in the app, as always.
-- =================================================================================
WITH checks AS (
  SELECT 1 AS n, 'saved_items has a policy' AS label,
         (SELECT COUNT(*) FROM pg_policies
           WHERE schemaname='public' AND tablename='saved_items') >= 1 AS ok
  UNION ALL SELECT 2, 'connections has policies',
         (SELECT COUNT(*) FROM pg_policies
           WHERE schemaname='public' AND tablename='connections') >= 4
  UNION ALL SELECT 3, 'a saved item is private to the person who saved it',
         EXISTS (SELECT 1 FROM pg_policies
                  WHERE tablename='saved_items'
                    AND COALESCE(qual,'') LIKE '%auth.uid()%')
  UNION ALL SELECT 4, 'nobody can save on somebody else''s behalf',
         EXISTS (SELECT 1 FROM pg_policies
                  WHERE tablename='saved_items'
                    AND COALESCE(with_check,'') LIKE '%auth.uid()%')
  UNION ALL SELECT 5, 'a connection can only be requested by a participant',
         EXISTS (SELECT 1 FROM pg_policies
                  WHERE tablename='connections' AND cmd='INSERT'
                    AND COALESCE(with_check,'') LIKE '%requested_by%')
  UNION ALL SELECT 6, 'only the two people in a connection can read it',
         EXISTS (SELECT 1 FROM pg_policies
                  WHERE tablename='connections' AND cmd='SELECT'
                    AND COALESCE(qual,'') LIKE '%user_b_id%')
  UNION ALL SELECT 7, 'anon can do nothing to either table',
         NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                      WHERE table_name IN ('saved_items','connections') AND grantee='anon')
  UNION ALL SELECT 8, 'NO table in public is RLS-locked against its own app',
         (SELECT COUNT(*) FROM public.audit_rls_without_policies()) = 0
)
SELECT n AS "#", label AS check,
       CASE WHEN ok THEN 'PASS' ELSE '*** FAIL ***' END AS result
FROM checks ORDER BY n;

-- =================================================================================
-- THE PROOF, IN THE APP
--   1. Save a photograph. Open Saved. It is there.
--   2. Refresh. It is still there.
--   3. SELECT COUNT(*) FROM public.saved_items;   -- must be >= 1
--
-- Check 8 going green is the end of a bug that cost this platform every upload,
-- every save, and eleven migrations of believing an empty table meant a young
-- product.
-- =================================================================================
