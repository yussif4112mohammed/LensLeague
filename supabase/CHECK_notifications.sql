-- =================================================================================
-- LENSLEAGUE — WHAT SHAPE IS THE NOTIFICATIONS TABLE, ACTUALLY?  (READ ONLY)
-- ---------------------------------------------------------------------------------
-- Two migrations define this table differently and only one of them ran:
--
--   migration_v2   recipient_id, is_read, post_id / comment_id / booking_id,
--                  and a CHECK constraint restricting `type` to nine values.
--   migration_v3   user_id, read, source_type / source_id, message
--                  — and v3 never ran (this is what migration_v14 had to repair).
--
-- So v2's shape is expected. Expected is not the same as true, and building v20
-- against the wrong one would repeat the exact failure v14 existed to fix:
-- PostgREST rejects an entire select when one named column is absent, so the app
-- would fail silently rather than error usefully.
--
-- Everything is returned as ONE result set, because the Supabase SQL editor shows
-- only the last statement's output when a script contains several.
--
-- Run in the Supabase SQL editor. Writes nothing.
-- =================================================================================

WITH
shape AS (
  SELECT 1 AS sort, 'SHAPE' AS section, 'which migration won' AS item,
    CASE
      WHEN to_regclass('public.notifications') IS NULL        THEN 'TABLE MISSING — v20 must create it'
      WHEN EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='notifications'
                      AND column_name='recipient_id')         THEN 'v2 shape (recipient_id / is_read) — build v20 against this'
      WHEN EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='notifications'
                      AND column_name='user_id')              THEN 'v3 shape (user_id / read) — unexpected, stop and tell Claude'
      ELSE 'UNRECOGNISED — read the column list below'
    END AS detail
),
cols AS (
  SELECT 2, 'COLUMNS', column_name,
         data_type || CASE WHEN is_nullable='YES' THEN ' · nullable' ELSE ' · not null' END
         || COALESCE(' · default ' || column_default, '')
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='notifications'
),
cons AS (
  SELECT 3, 'CONSTRAINTS', con.conname, pg_get_constraintdef(con.oid)
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
   WHERE n.nspname='public' AND rel.relname='notifications'
),
pol AS (
  SELECT 4, 'POLICIES', polname,
         CASE polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
                     WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END
         || ' · using ' || COALESCE(pg_get_expr(polqual, polrelid),'—')
         || ' · check ' || COALESCE(pg_get_expr(polwithcheck, polrelid),'—')
    FROM pg_policy WHERE polrelid = 'public.notifications'::regclass
),
grants AS (
  SELECT 5, 'GRANTS', grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type)
    FROM information_schema.role_table_grants
   WHERE table_schema='public' AND table_name='notifications'
     AND grantee IN ('anon','authenticated')
   GROUP BY grantee
),
-- 9 rows already exist and nothing in the app writes them. Find out what they are.
contents AS (
  SELECT 6, 'EXISTING ROWS', type,
         COUNT(*)::text || ' row(s) · newest ' || COALESCE(MAX(created_at)::date::text,'—')
         || ' · ' || COUNT(*) FILTER (WHERE is_read)::text || ' read'
    FROM public.notifications GROUP BY type
),
rt AS (
  SELECT 7, 'REALTIME', 'published?',
    CASE WHEN EXISTS (SELECT 1 FROM pg_publication_tables
                       WHERE pubname='supabase_realtime' AND schemaname='public'
                         AND tablename='notifications')
         THEN 'yes' ELSE 'no — v20 must add it to the publication' END
),
rls AS (
  SELECT 8, 'RLS', 'enabled?',
    CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE oid='public.notifications'::regclass)
         THEN 'yes' ELSE 'NO — anyone could read every notification' END
)
SELECT section, item, detail FROM (
  SELECT * FROM shape
  UNION ALL SELECT * FROM cols
  UNION ALL SELECT * FROM cons
  UNION ALL SELECT * FROM pol
  UNION ALL SELECT * FROM grants
  UNION ALL SELECT * FROM contents
  UNION ALL SELECT * FROM rt
  UNION ALL SELECT * FROM rls
) x ORDER BY sort, item;
