-- =================================================================================
-- WHAT IS ACTUALLY IN THIS DATABASE?
--
-- This names NO table. It asks.
--
-- I have now written three scripts against migration_v3 that referenced things
-- the live database does not have: albums.client_id, and now the whole
-- job_requests table. Each time the migration file described a schema that was
-- never fully applied, and each time I treated the file as a description of
-- reality. The fix is not to be more careful reading migrations - it is to stop
-- reading them for this purpose.
--
-- Every row below comes from the catalog: the tables that exist, whether RLS is
-- on, which commands have a policy, and roughly how many rows each holds.
--
-- The count is pg_class.reltuples, which the planner maintains and which is an
-- ESTIMATE. It is -1 for a table never analysed and can lag after writes. For a
-- platform this size it reliably distinguishes empty from not-empty, which is
-- the question, but do not quote it as a figure - run an exact COUNT(*) on any
-- table that matters.
-- =================================================================================
SELECT
  c.relname                                              AS "table",
  CASE WHEN c.reltuples < 0 THEN 'never analysed'
       ELSE c.reltuples::BIGINT::TEXT END                AS approx_rows,
  CASE WHEN c.relrowsecurity THEN 'ON' ELSE 'off' END    AS rls,
  COALESCE((SELECT string_agg(DISTINCT p.cmd, ',' ORDER BY p.cmd)
              FROM pg_policies p
             WHERE p.schemaname = 'public' AND p.tablename = c.relname),
           '(NONE)')                                     AS policies,
  CASE
    WHEN c.relrowsecurity
     AND NOT EXISTS (SELECT 1 FROM pg_policy pp WHERE pp.polrelid = c.oid)
      THEN '*** RLS ON WITH NO POLICY - refuses every client read and write'
    WHEN c.relrowsecurity
     AND NOT EXISTS (SELECT 1 FROM pg_policies p
                      WHERE p.schemaname='public' AND p.tablename=c.relname
                        AND p.cmd IN ('INSERT','ALL'))
      THEN 'readable but no client INSERT path'
    WHEN c.relrowsecurity
     AND NOT EXISTS (SELECT 1 FROM pg_policies p
                      WHERE p.schemaname='public' AND p.tablename=c.relname
                        AND p.cmd IN ('SELECT','ALL'))
      THEN 'writable but no client SELECT path'
    WHEN NOT c.relrowsecurity THEN 'RLS off - grants are the only limit'
    ELSE 'has a read and a write path'
  END                                                    AS verdict
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY
  CASE WHEN c.relrowsecurity
        AND NOT EXISTS (SELECT 1 FROM pg_policy pp WHERE pp.polrelid = c.oid)
       THEN 0 ELSE 1 END,
  c.relname;
