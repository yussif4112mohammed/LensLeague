-- =================================================================================
-- LENSLEAGUE — WHICH MESSAGING POLICY IS RECURSING?  (READ ONLY)
-- ---------------------------------------------------------------------------------
-- Live symptom, seen when sending an inquiry from a profile:
--     infinite recursion detected in policy for relation "thread_participants"
--
-- Postgres raises this when a policy ON a table contains a subquery that reads
-- THAT SAME table: the subquery is itself subject to the policy, which runs the
-- subquery, and so on. The usual culprit is the natural way to express "you can
-- see a thread you are part of" - a self-join - written directly in the policy.
--
-- migration_v18 added one of exactly this shape (participants_insert_self_only),
-- so that is the prime suspect. This lists every policy on the three messaging
-- tables and flags the ones that read their own relation, so the fix is aimed at
-- what is actually there rather than at what a migration file says should be.
--
-- One result set. Read the RECURSES column.
-- =================================================================================

SELECT
  c.relname AS table_name,
  p.polname AS policy_name,
  CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
                WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END AS command,
  CASE
    WHEN COALESCE(pg_get_expr(p.polqual, p.polrelid), '')      LIKE '%' || c.relname || '%'
      OR COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') LIKE '%' || c.relname || '%'
    THEN '>> RECURSES — policy reads its own table'
    ELSE 'ok'
  END AS recurses,
  COALESCE(pg_get_expr(p.polqual, p.polrelid), '—')      AS using_expr,
  COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '—') AS with_check_expr
FROM pg_policy p
JOIN pg_class c      ON c.oid = p.polrelid
JOIN pg_namespace n  ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('thread_participants', 'message_threads', 'messages')
ORDER BY c.relname, p.polname;
