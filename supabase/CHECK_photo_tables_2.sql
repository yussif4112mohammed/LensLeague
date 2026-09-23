-- =================================================================================
-- CHECK 2: the parts of the collapse that CHECK_photo_tables.sql said to look at
--
-- The first check answered "can we drop these tables". The answer was no, not
-- yet, for three reasons, and this script asks about each one:
--
--   1. Two rows live in `posts` and nowhere else. Before deciding whether to
--      copy or discard them, we need to see what they are. All ten rows are
--      listed so the two are in context rather than floating on their own.
--
--   2. Eleven foreign keys point at `posts` and `photos`. A foreign key blocks a
--      DROP, but that is not the real question - the question is whether those
--      child columns hold any DATA. The app writes likes and comments through
--      `item_id`; `post_id` and `photo_id` look like leftovers from an earlier
--      schema. If they are all NULL, they are dead weight and drop cleanly. If
--      they are not, someone's like or comment is hanging off the wrong table.
--
--   3. Seven functions mention `posts` or `photos`. Two of them are trigger
--      functions on `likes`, which fire on every like in the product right now,
--      so what they do with `posts` decides whether like counts are being
--      written somewhere nothing reads. Their bodies are printed in full
--      because guessing at a function body is exactly the mistake that cost us
--      an evening on cast_photo_battle_vote.
--
-- Also included: what the single object in the `photos` storage bucket is, and
-- whether anything in the database points at it.
--
-- Still read-only. Still ONE query.
-- =================================================================================
WITH post_rows AS (
  SELECT
    po.id,
    po.author_id,
    po.image_url,
    po.caption,
    po.created_at,
    po.visibility,
    po.like_count,
    po.comment_count,
    po.vote_count,
    (SELECT to_jsonb(pr) ->> 'username' FROM public.profiles pr WHERE pr.id = po.author_id) AS author_username,
    EXISTS (
      SELECT 1 FROM public.portfolio_items pi WHERE pi.media_url = po.image_url
    ) AS mirrored
  FROM public.posts po
),
fk_children AS (
  SELECT
    child.relname::TEXT  AS child_table,
    att.attname::TEXT    AS child_column,
    parent.relname::TEXT AS parent_table
  FROM pg_constraint con
  JOIN pg_class  child  ON child.oid  = con.conrelid
  JOIN pg_class  parent ON parent.oid = con.confrelid
  CROSS JOIN LATERAL unnest(con.conkey) AS k(attnum)
  JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k.attnum
  WHERE con.contype = 'f'
    AND parent.relname IN ('posts', 'photos')
    AND parent.relnamespace = 'public'::REGNAMESPACE
),
fk_usage AS (
  SELECT
    f.*,
    (xpath('/row/c/text()',
           query_to_xml(format('SELECT count(*) AS c FROM public.%I', f.child_table),
                        false, true, '')))[1]::TEXT::BIGINT AS total_rows,
    (xpath('/row/c/text()',
           query_to_xml(format('SELECT count(%I) AS c FROM public.%I', f.child_column, f.child_table),
                        false, true, '')))[1]::TEXT::BIGINT AS filled_rows
  FROM fk_children f
),
findings AS (

  SELECT '1. EVERY ROW IN posts'::TEXT AS section,
         (CASE WHEN r.mirrored THEN 'mirrored  ' ELSE 'ORPHAN    ' END || r.created_at::TEXT)::TEXT AS item,
         ('author=' || COALESCE(r.author_username, r.author_id::TEXT, 'null')
           || ' | url=' || COALESCE(r.image_url, '(none)')
           || ' | caption=' || COALESCE(NULLIF(btrim(r.caption), ''), '(empty)')
           || ' | visibility=' || COALESCE(r.visibility, '-')
           || ' | likes=' || COALESCE(r.like_count, 0)::TEXT
           || ' comments=' || COALESCE(r.comment_count, 0)::TEXT
           || ' votes=' || COALESCE(r.vote_count, 0)::TEXT)::TEXT AS detail,
         CASE WHEN r.mirrored           THEN 'safe - the same photograph is in portfolio_items'
              WHEN r.image_url IS NULL  THEN 'JUNK - no image at all, discard'
              ELSE 'DECIDE - copy into portfolio_items, or discard' END::TEXT AS verdict
  FROM post_rows r

  UNION ALL
  SELECT '2. ARE THE CHILD COLUMNS ACTUALLY USED',
         u.child_table || '.' || u.child_column || ' -> ' || u.parent_table,
         u.filled_rows::TEXT || ' of ' || u.total_rows::TEXT || ' rows have a value',
         CASE WHEN u.filled_rows = 0
              THEN 'DEAD - column holds nothing, drops cleanly'
              ELSE 'LIVE - ' || u.filled_rows::TEXT || ' row(s) depend on ' || u.parent_table END
  FROM fk_usage u

  UNION ALL
  SELECT '3. FUNCTION BODIES',
         pr.proname::TEXT,
         pg_get_functiondef(pr.oid),
         'read it - do not assume'
  FROM pg_proc pr
  JOIN pg_namespace ns ON ns.oid = pr.pronamespace
  WHERE ns.nspname = 'public'
    AND pr.proname IN (
      'on_like_insert', 'on_like_delete', 'tg_notify_like', 'tg_notify_comment',
      'on_post_insert', 'search_posts', 'get_feed',
      'award_competition_recognition', 'check_entry_category_matches_post'
    )

  UNION ALL
  SELECT '4. THE photos BUCKET',
         ob.name::TEXT,
         'uploaded ' || COALESCE(ob.created_at::TEXT, 'unknown')
           || ' | owner=' || COALESCE(ob.owner::TEXT, 'none'),
         CASE WHEN EXISTS (SELECT 1 FROM public.portfolio_items pi WHERE pi.media_url LIKE '%' || ob.name)
                THEN 'IN USE by portfolio_items - leave the bucket alone'
              WHEN EXISTS (SELECT 1 FROM public.posts po WHERE po.image_url LIKE '%' || ob.name)
                THEN 'referenced only by posts - goes when posts goes'
              ELSE 'ORPHAN FILE - nothing in the database points at it' END
  FROM storage.objects ob
  WHERE ob.bucket_id = 'photos'
)
SELECT f.section, f.item, f.detail, f.verdict
FROM findings f
ORDER BY f.section, f.item;
