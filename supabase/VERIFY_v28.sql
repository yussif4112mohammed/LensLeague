-- =================================================================================
-- VERIFY v28 — run AFTER migration_v28_counter_guard.sql. ONE query.
--
-- Check 3 is the one that matters and it is BEHAVIOURAL, not structural: it
-- compares the stored counts against the actual rows. That is the assertion
-- that was false before this migration while every piece of machinery involved
-- looked present and enabled.
-- =================================================================================
WITH checks AS (
  SELECT 1 AS n, 'the guard now recognises the platform''s own bookkeeping' AS label,
         (SELECT prosrc LIKE '%engine_is_writing%'
            FROM pg_proc WHERE proname = 'guard_item_counters') AS ok
  UNION ALL SELECT 2, 'the counter triggers announce themselves with the v18 flag',
         (SELECT bool_and(prosrc LIKE '%lensleague.engine_write%')
            FROM pg_proc WHERE proname IN ('sync_item_like_count','sync_item_comment_count'))
  UNION ALL SELECT 3, 'STORED like_count MATCHES the real rows in likes',
         (SELECT COALESCE(SUM(like_count),0) FROM public.portfolio_items)
         = (SELECT COUNT(*) FROM public.likes WHERE item_id IS NOT NULL)
  UNION ALL SELECT 4, 'stored comment_count matches the real rows in comments',
         (SELECT COALESCE(SUM(comment_count),0) FROM public.portfolio_items)
         = (SELECT COUNT(*) FROM public.comments WHERE item_id IS NOT NULL)
  UNION ALL SELECT 5, 'a client still cannot write its own counters',
         (SELECT prosrc LIKE '%NEW.like_count    := OLD.like_count%'
            FROM pg_proc WHERE proname = 'guard_item_counters')
  UNION ALL SELECT 6, 'no count is negative',
         NOT EXISTS (SELECT 1 FROM public.portfolio_items
                      WHERE like_count < 0 OR comment_count < 0)
  UNION ALL SELECT 7, 'the flag is transaction-local, so it cannot leak',
         (SELECT bool_and(prosrc LIKE '%''on'', true%')
            FROM pg_proc WHERE proname IN ('sync_item_like_count','sync_item_comment_count'))
)
SELECT n AS "#", label AS check,
       CASE WHEN ok THEN 'PASS' ELSE '*** FAIL ***' END AS result
FROM checks ORDER BY n;

-- =================================================================================
-- THE PROOF, IN THE APP
--   1. Like a photograph on the feed. The number goes up.
--   2. Refresh. It is STILL up - that is the half that has never worked.
--   3. Unlike it. The number goes down and stays down.
--
--   SELECT COALESCE(SUM(like_count),0) FROM public.portfolio_items;
--   SELECT COUNT(*) FROM public.likes WHERE item_id IS NOT NULL;
--   -- these two must stay equal for the rest of this platform's life.
-- =================================================================================
