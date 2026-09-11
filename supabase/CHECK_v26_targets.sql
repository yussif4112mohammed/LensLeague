-- =================================================================================
-- FIVE QUESTIONS, ONE QUERY
--
-- 1. Is the like failing because the client selects a column likes does not have?
--    toggleLikePost does .from('likes').select('id'), and PostgREST rejects the
--    WHOLE select when one named column is absent - this codebase's signature
--    failure. migration_v3 declares likes with PRIMARY KEY (user_id, item_id)
--    and no id at all. Reading the LIVE columns rather than the migration file,
--    because assuming otherwise is what cost us tonight.
-- 2. What shape are saved_items and connections? Both are RLS-locked with no
--    policy - the same fault as albums - and v26 has to write policies against
--    their real columns.
-- 3. Did the uploaded photograph reach the battle queue at all?
-- 4. If it did, is it waiting for an opponent rather than broken? A battle needs
--    TWO photographs in the same category and experience band, and exactly one
--    has ever been published.
-- 5. Does the queue function still exist and is it callable?
-- =================================================================================
WITH cols AS (
  SELECT table_name AS t, string_agg(column_name, ', ' ORDER BY ordinal_position) AS names
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name IN ('likes','saved_items','connections','photo_battles')
   GROUP BY table_name
), findings AS (
  SELECT 1 AS n, 'likes columns (does it have `id`?)' AS label,
         COALESCE((SELECT names FROM cols WHERE t='likes'), 'TABLE MISSING') AS value,
         'if there is no id, .select(''id'') fails and every like read errors' AS meaning
  UNION ALL SELECT 2, 'saved_items columns',
         COALESCE((SELECT names FROM cols WHERE t='saved_items'), 'TABLE MISSING'),
         'v26 writes policies against these exact names'
  UNION ALL SELECT 3, 'connections columns',
         COALESCE((SELECT names FROM cols WHERE t='connections'), 'TABLE MISSING'),
         'same - and it tells us who the two sides of a connection are'
  UNION ALL SELECT 4, 'photo_battles columns',
         COALESCE((SELECT names FROM cols WHERE t='photo_battles'), 'TABLE MISSING'),
         'context for the rows below'
  UNION ALL SELECT 5, 'rows in photo_battles',
         (SELECT COUNT(*)::TEXT FROM public.photo_battles),
         'zero means the upload never reached the queue at all'
  UNION ALL SELECT 6, 'battles waiting for an opponent (photo_b_id IS NULL)',
         (SELECT COUNT(*)::TEXT FROM public.photo_battles WHERE photo_b_id IS NULL),
         'ONE here is CORRECT with one photo published - queued, not broken'
  UNION ALL SELECT 7, 'battles with two photographs',
         (SELECT COUNT(*)::TEXT FROM public.photo_battles WHERE photo_b_id IS NOT NULL),
         'needs a second upload in the same category and band'
  UNION ALL SELECT 8, 'the queue function exists',
         CASE WHEN to_regprocedure('public.queue_portfolio_item_for_battle(uuid)') IS NOT NULL
              THEN 'yes' ELSE '*** MISSING ***' END,
         'uploadPhoto calls this and only console.warns if it fails'
  UNION ALL SELECT 9, 'authenticated may call it',
         CASE WHEN to_regprocedure('public.queue_portfolio_item_for_battle(uuid)') IS NULL THEN 'n/a'
              WHEN has_function_privilege('authenticated',
                   'public.queue_portfolio_item_for_battle(uuid)','EXECUTE') THEN 'yes'
              ELSE '*** NO EXECUTE GRANT - the queue call is refused ***' END,
         'a missing grant here would fail silently, exactly like the RLS bug'
  UNION ALL SELECT 10, 'published photographs',
         (SELECT COUNT(*)::TEXT FROM public.portfolio_items),
         'one is enough to queue; two in a category are needed to pair'
  UNION ALL SELECT 11, 'rows in saved_items / likes',
         (SELECT COUNT(*)::TEXT FROM public.saved_items) || ' / ' ||
         (SELECT COUNT(*)::TEXT FROM public.likes),
         'both should be 0 now; both must grow once v26 lands'
)
SELECT n AS "#", label, value, meaning FROM findings ORDER BY n;
