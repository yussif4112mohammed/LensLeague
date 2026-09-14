-- =================================================================================
-- IS THE DATABASE COUNTING LIKES AT ALL?
--
-- The heart fills correctly now, so likedItemIds works. The NUMBER stays 0.
--
-- Two independent things could cause that and they need different fixes:
--
--   A. The client never updates the count on the feed. FeedPage keeps its own
--      feedPhotos array from fetchPhotosPaginated, while toggleLikePost updates
--      AppContext's separate photos array - two arrays, and the feed reads the
--      one that is not being updated. Confirmed in the code already.
--
--   B. portfolio_items.like_count is simply 0 in the database, because the v14
--      trigger that increments it is not firing. migration_v14 declares
--      trg_sync_item_like_count on likes - but migration_v3 also declared
--      policies that were never created, so a migration declaring something
--      proves nothing here.
--
-- If B is true, fixing A alone makes the number show 1 until the next refresh
-- and then fall back to 0, which is exactly the bug we are trying to end.
-- =================================================================================
WITH t AS (
  SELECT 1 AS n, 'rows in likes' AS label,
         (SELECT COUNT(*)::TEXT FROM public.likes) AS value,
         'each one is a real like somebody made' AS meaning
  UNION ALL SELECT 2, 'sum of portfolio_items.like_count',
         (SELECT COALESCE(SUM(like_count),0)::TEXT FROM public.portfolio_items),
         'should equal the row above. if it is 0 while likes is not, the trigger is dead'
  UNION ALL SELECT 3, 'the v14 trigger exists on likes',
         CASE WHEN EXISTS (
           SELECT 1 FROM pg_trigger tg JOIN pg_class c ON c.oid = tg.tgrelid
            WHERE c.relname = 'likes' AND NOT tg.tgisinternal
              AND tg.tgname = 'trg_sync_item_like_count')
         THEN 'yes' ELSE '*** MISSING - nothing increments like_count' END,
         'migration_v14 declares it; declaring is not applying'
  UNION ALL SELECT 4, 'the trigger is ENABLED',
         COALESCE((SELECT CASE tg.tgenabled WHEN 'O' THEN 'yes'
                                            WHEN 'D' THEN '*** DISABLED'
                                            ELSE tg.tgenabled::TEXT END
                     FROM pg_trigger tg JOIN pg_class c ON c.oid = tg.tgrelid
                    WHERE c.relname = 'likes' AND tg.tgname = 'trg_sync_item_like_count'),
                  'n/a - trigger absent'),
         'a disabled trigger looks present and does nothing'
  UNION ALL SELECT 5, 'likes rows carrying item_id',
         (SELECT COUNT(*)::TEXT FROM public.likes WHERE item_id IS NOT NULL),
         'the trigger only counts when item_id is set; likes also has a post_id'
  UNION ALL SELECT 6, 'likes rows carrying only post_id',
         (SELECT COUNT(*)::TEXT FROM public.likes WHERE item_id IS NULL AND post_id IS NOT NULL),
         'these would be invisible to the counter even with a working trigger'
  UNION ALL SELECT 7, 'the comment counter trigger, same question',
         CASE WHEN EXISTS (
           SELECT 1 FROM pg_trigger tg JOIN pg_class c ON c.oid = tg.tgrelid
            WHERE c.relname = 'comments' AND NOT tg.tgisinternal
              AND tg.tgname = 'trg_sync_item_comment_count')
         THEN 'yes' ELSE '*** MISSING - comment counts will do the same thing' END,
         'v14 declared this one too; worth knowing before it is reported'
)
SELECT n AS "#", label, value, meaning FROM t ORDER BY n;
