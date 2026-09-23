-- =================================================================================
-- CHECK: the three photograph tables, before collapsing them into one
--
-- The app writes every published photograph to THREE tables:
--
--   portfolio_items  - canonical. The only one anything reads: profile, feed,
--                      search, likes, saved items, and the battle queue.
--   photos           - written "for backward compatibility", read by nothing.
--   posts            - written "for the new production table", read by nothing.
--
-- Two of those writes are fire-and-forget: if either fails the photographer is
-- never told, and until this session the same was true of the one that matters.
-- Three tables holding the same photograph is also why alt_text and location
-- were silently discarded for months - they were being written to a table that
-- has no such columns.
--
-- This script does NOT change anything. It asks the database what is actually
-- there, so the collapse migration is written from facts rather than memory:
--
--   1. how many rows are in each table
--   2. what columns each one actually has
--   3. what foreign keys point AT them (these block a DROP)
--   4. what triggers hang off them
--   5. what RLS policies exist on them
--   6. which functions mention them
--   7. which views mention them
--   8. whether any row in photos/posts has a URL that portfolio_items does not
--      have - those are rows that would be LOST by dropping the table
--   9. what is in the storage buckets
--
-- READ SECTION 8 FIRST. If it says STOP, the collapse is a data migration and
-- those rows must be copied across before anything is dropped. If it says SAFE
-- for both tables, dropping them loses nothing.
--
-- ONE query, because the Supabase SQL editor only shows the last statement's
-- result and a multi-statement check silently hides everything but its last line.
-- =================================================================================
WITH target(tbl, url_col) AS (
  VALUES ('portfolio_items', 'media_url'),
         ('photos',          'url'),
         ('posts',           'image_url')
),
present AS (
  SELECT
    t.tbl,
    t.url_col,
    to_regclass('public.' || t.tbl)                    AS tbl_oid,
    (to_regclass('public.' || t.tbl) IS NOT NULL)      AS tbl_exists,
    EXISTS (
      SELECT 1 FROM information_schema.columns ic
       WHERE ic.table_schema = 'public'
         AND ic.table_name   = t.tbl
         AND ic.column_name  = t.url_col
    )                                                  AS has_url_col
  FROM target t
),
counts AS (
  SELECT
    p.*,
    CASE WHEN p.tbl_exists THEN (
      xpath('/row/c/text()',
            query_to_xml(format('SELECT count(*) AS c FROM public.%I', p.tbl),
                         false, true, ''))
    )[1]::TEXT::BIGINT END AS row_count
  FROM present p
),
orphans AS (
  SELECT
    c.tbl,
    CASE WHEN c.tbl_exists AND c.has_url_col AND c.tbl <> 'portfolio_items' THEN (
      xpath('/row/c/text()',
            query_to_xml(format(
              'SELECT count(*) AS c FROM public.%I x '
              'WHERE NOT EXISTS (SELECT 1 FROM public.portfolio_items pi WHERE pi.media_url = x.%I)',
              c.tbl, c.url_col), false, true, ''))
    )[1]::TEXT::BIGINT END AS orphan_count
  FROM counts c
),
findings AS (

  SELECT '1. TABLES'::TEXT AS section,
         c.tbl::TEXT       AS item,
         CASE WHEN c.tbl_exists THEN c.row_count::TEXT || ' rows'
              ELSE 'does not exist' END::TEXT AS detail,
         CASE WHEN NOT c.tbl_exists       THEN 'ABSENT - nothing to collapse'
              WHEN c.tbl = 'portfolio_items' THEN 'CANONICAL - keep this one'
              WHEN c.row_count = 0        THEN 'EMPTY - dropping it loses nothing'
              ELSE 'HAS ROWS - see section 8' END::TEXT AS verdict
  FROM counts c

  UNION ALL
  SELECT '2. COLUMNS',
         ic.table_name::TEXT,
         string_agg(ic.column_name || ' ' || ic.data_type, ', ' ORDER BY ic.ordinal_position),
         count(*)::TEXT || ' columns'
  FROM information_schema.columns ic
  WHERE ic.table_schema = 'public'
    AND ic.table_name IN ('portfolio_items', 'photos', 'posts')
  GROUP BY ic.table_name

  UNION ALL
  SELECT '3. FOREIGN KEYS POINTING AT THEM',
         con.conrelid::REGCLASS::TEXT || '.' || con.conname,
         pg_get_constraintdef(con.oid),
         CASE WHEN con.confrelid::REGCLASS::TEXT IN ('photos', 'posts')
              THEN 'BLOCKS DROP - this child must be handled first'
              ELSE 'points at portfolio_items - stays' END
  FROM pg_constraint con
  WHERE con.contype = 'f'
    AND con.confrelid IN (SELECT tbl_oid FROM present WHERE tbl_oid IS NOT NULL)

  UNION ALL
  SELECT '4. TRIGGERS',
         tg.tgrelid::REGCLASS::TEXT || '.' || tg.tgname,
         pg_get_triggerdef(tg.oid),
         CASE WHEN tg.tgrelid::REGCLASS::TEXT IN ('photos', 'posts')
              THEN 'REVIEW - does anything downstream depend on it firing?'
              ELSE 'on portfolio_items - stays' END
  FROM pg_trigger tg
  WHERE NOT tg.tgisinternal
    AND tg.tgrelid IN (SELECT tbl_oid FROM present WHERE tbl_oid IS NOT NULL)

  UNION ALL
  SELECT '5. RLS POLICIES',
         pol.tablename || ' / ' || pol.policyname,
         pol.cmd || ' to ' || pol.roles::TEXT,
         CASE WHEN pol.tablename IN ('photos', 'posts')
              THEN 'drops with the table'
              ELSE 'on portfolio_items - stays' END
  FROM pg_policies pol
  WHERE pol.schemaname = 'public'
    AND pol.tablename IN ('portfolio_items', 'photos', 'posts')

  UNION ALL
  SELECT '6. FUNCTIONS MENTIONING THEM',
         pr.proname::TEXT,
         btrim(
           CASE WHEN pr.prosrc ~* '\mphotos\M' THEN 'photos ' ELSE '' END ||
           CASE WHEN pr.prosrc ~* '\mposts\M'  THEN 'posts '  ELSE '' END
         ),
         'REVIEW - repoint at portfolio_items or drop with the table'
  FROM pg_proc pr
  JOIN pg_namespace ns ON ns.oid = pr.pronamespace
  WHERE ns.nspname = 'public'
    AND (pr.prosrc ~* '\mphotos\M' OR pr.prosrc ~* '\mposts\M')

  UNION ALL
  SELECT '7. VIEWS MENTIONING THEM',
         v.table_name::TEXT,
         btrim(
           CASE WHEN v.view_definition ~* '\mphotos\M' THEN 'photos ' ELSE '' END ||
           CASE WHEN v.view_definition ~* '\mposts\M'  THEN 'posts '  ELSE '' END
         ),
         'BLOCKS DROP unless dropped or repointed first'
  FROM information_schema.views v
  WHERE v.table_schema = 'public'
    AND (v.view_definition ~* '\mphotos\M' OR v.view_definition ~* '\mposts\M')

  UNION ALL
  SELECT '8. DATA THAT WOULD BE LOST',
         o.tbl::TEXT,
         COALESCE(o.orphan_count::TEXT, '-') ||
           ' row(s) whose image URL is not in portfolio_items',
         CASE WHEN o.orphan_count IS NULL THEN 'n/a - table or column missing'
              WHEN o.orphan_count = 0     THEN 'SAFE - every row is mirrored'
              ELSE 'STOP - these rows exist ONLY here, copy them first' END
  FROM orphans o
  WHERE o.tbl <> 'portfolio_items'

  UNION ALL
  SELECT '9. STORAGE BUCKETS',
         b.id::TEXT,
         (SELECT count(*) FROM storage.objects ob WHERE ob.bucket_id = b.id)::TEXT || ' objects',
         CASE WHEN (SELECT count(*) FROM storage.objects ob WHERE ob.bucket_id = b.id) = 0
              THEN 'empty'
              ELSE 'in use - do not delete this bucket' END
  FROM storage.buckets b
)
SELECT f.section, f.item, f.detail, f.verdict
FROM findings f
ORDER BY f.section, f.item;
