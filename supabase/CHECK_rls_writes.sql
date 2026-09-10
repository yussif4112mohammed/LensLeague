-- =================================================================================
-- WHY HAS NOTHING EVER BEEN INSERTED INTO portfolio_items?
--
-- CHECK_feed.sql returned zero rows all time and 0 read policies on both
-- portfolio_items and albums. With RLS enabled and no policy for a command,
-- Postgres denies that command silently to the client - the insert is refused,
-- not errored in a way the old swallowing catch would surface. That matches the
-- symptom exactly: a success screen, a redirect, and an empty feed.
--
-- This lists every policy that actually exists on the tables an upload touches,
-- so we stop guessing. ONE query.
-- =================================================================================
WITH t AS (
  SELECT unnest(ARRAY['portfolio_items','albums','photos','posts','likes',
                      'comments','follows','profiles']) AS tbl
), rls_state AS (
  SELECT c.relname AS tbl, c.relrowsecurity AS rls_on, c.relforcerowsecurity AS forced
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname IN (SELECT tbl FROM t)
), pol AS (
  SELECT tablename AS tbl,
         string_agg(DISTINCT cmd, ',' ORDER BY cmd) AS cmds,
         COUNT(*) AS n
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename IN (SELECT tbl FROM t)
   GROUP BY tablename
), grants AS (
  SELECT table_name AS tbl,
         string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type) AS privs
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public'
     AND grantee = 'authenticated'
     AND table_name IN (SELECT tbl FROM t)
   GROUP BY table_name
), counts AS (
  SELECT 'portfolio_items' AS tbl, COUNT(*) AS n FROM public.portfolio_items
  UNION ALL SELECT 'albums',  COUNT(*) FROM public.albums
  UNION ALL SELECT 'photos',  COUNT(*) FROM public.photos
  UNION ALL SELECT 'posts',   COUNT(*) FROM public.posts
  UNION ALL SELECT 'likes',   COUNT(*) FROM public.likes
  UNION ALL SELECT 'comments',COUNT(*) FROM public.comments
  UNION ALL SELECT 'follows', COUNT(*) FROM public.follows
  UNION ALL SELECT 'profiles',COUNT(*) FROM public.profiles
)
SELECT
  t.tbl                                            AS "table",
  COALESCE(c.n, 0)                                 AS rows,
  CASE WHEN r.rls_on THEN 'ON' ELSE 'off' END      AS rls,
  COALESCE(p.n, 0)                                 AS policies,
  COALESCE(p.cmds, '(none)')                       AS policy_cmds,
  COALESCE(g.privs, '(no grants)')                 AS authenticated_grants,
  CASE
    WHEN r.rls_on AND COALESCE(p.n,0) = 0
      THEN '*** RLS ON WITH NO POLICIES - every client read AND write is denied'
    WHEN r.rls_on AND COALESCE(p.cmds,'') NOT LIKE '%INSERT%'
                  AND COALESCE(p.cmds,'') NOT LIKE '%ALL%'
      THEN '*** no INSERT path - clients cannot write to this table'
    WHEN r.rls_on AND COALESCE(p.cmds,'') NOT LIKE '%SELECT%'
                  AND COALESCE(p.cmds,'') NOT LIKE '%ALL%'
      THEN '*** no SELECT path - clients cannot read this table'
    WHEN NOT r.rls_on THEN 'RLS off: wide open, grants are the only limit'
    ELSE 'has both a read and a write path'
  END                                              AS verdict
FROM t
LEFT JOIN rls_state r ON r.tbl = t.tbl
LEFT JOIN pol       p ON p.tbl = t.tbl
LEFT JOIN grants    g ON g.tbl = t.tbl
LEFT JOIN counts    c ON c.tbl = t.tbl
ORDER BY
  CASE WHEN r.rls_on AND COALESCE(p.n,0) = 0 THEN 0 ELSE 1 END,
  t.tbl;
