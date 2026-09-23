-- =================================================================================
-- VERIFY v33 — did collapsing the photograph tables actually hold?
--
-- Eight checks. The ones that matter most are 4 and 8.
--
--   Check 4 is behavioural, not structural: it looks for Eben's 31 July upload
--   BY ITS FILENAME inside portfolio_items. A migration that dropped the table
--   without rescuing that row would pass every other check on this page.
--
--   Check 8 asks whether liking anything still notifies the photographer. That
--   is the thing this migration could most plausibly have broken, because it
--   rewrote the function that does it while removing the column it used to read.
--
-- Every row must read PASS. ONE query.
-- =================================================================================
WITH stats AS (
  SELECT
    (SELECT count(*) FROM public.portfolio_items)::INT AS items_total,
    (SELECT count(*) FROM public.profiles pr
      WHERE COALESCE(pr.posts_count, 0) <> (
        SELECT count(*) FROM public.portfolio_items pi WHERE pi.photographer_id = pr.id
      ))::INT AS profiles_wrong
),
checks(n, ok, label) AS (

  SELECT 1, to_regclass('public.posts') IS NULL,
         'the posts table is gone'

  UNION ALL
  SELECT 2, to_regclass('public.photos') IS NULL,
         'the photos table is gone'

  UNION ALL
  SELECT 3, NOT EXISTS (
           SELECT 1 FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname IN ('on_like_insert', 'on_like_delete', 'on_post_insert',
                               'get_feed', 'check_entry_category_matches_post')
         ),
         'the functions that only served those tables are gone'

  UNION ALL
  SELECT 4, EXISTS (
           SELECT 1 FROM public.portfolio_items pi
           WHERE pi.media_url LIKE '%1785462227914_jqnrd2.jpg'
         ),
         'THE RESCUED PHOTOGRAPH IS ACTUALLY IN portfolio_items'

  UNION ALL
  SELECT 5, NOT EXISTS (
           SELECT 1 FROM public.portfolio_items pi
           WHERE pi.media_url LIKE '%picsum.photos%'
         ),
         'the placeholder row was discarded, not copied in'

  UNION ALL
  SELECT 6, NOT EXISTS (
           SELECT 1 FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname IN ('tg_notify_like', 'tg_notify_comment')
             AND (p.prosrc ~* '\mpost_id\M' OR p.prosrc ~* '\mphoto_id\M')
         ),
         'no notification trigger still reads a column of a dropped table'

  UNION ALL
  SELECT 7, (SELECT s.profiles_wrong FROM stats s) = 0,
         'every profile posts_count matches its real portfolio_items rows'

  UNION ALL
  SELECT 8, EXISTS (
           SELECT 1 FROM pg_trigger t
           JOIN pg_proc p ON p.oid = t.tgfoid
           WHERE NOT t.tgisinternal
             AND t.tgrelid = 'public.likes'::REGCLASS
             AND p.proname = 'tg_notify_like'
         ) AND EXISTS (
           SELECT 1 FROM pg_trigger t
           WHERE NOT t.tgisinternal
             AND t.tgrelid = 'public.portfolio_items'::REGCLASS
             AND t.tgname  = 'trg_sync_profile_post_count'
         ),
         'LIKING STILL NOTIFIES, AND UPLOADING STILL COUNTS'
)
SELECT
  c.n,
  CASE WHEN c.ok THEN 'PASS' ELSE 'FAIL' END AS result,
  c.label,
  s.items_total,
  s.profiles_wrong
FROM checks c
CROSS JOIN stats s
ORDER BY c.n;
