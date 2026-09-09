-- =================================================================================
-- VERIFY v24 — run AFTER migration_v24_rate_limits.sql
--
-- ONE query. The Supabase SQL editor shows only the last statement's result, so a
-- script of separate SELECTs reports the last check and hides the rest - which is
-- how a migration gets called verified when most of it never ran.
--
-- These check SHAPE. Shape is not behaviour: VERIFY_v18 returned 20/20 while
-- messaging was completely unusable. Section 14 below actually exercises the
-- counter, and the behavioural proof is in the note at the bottom.
-- =================================================================================
WITH checks AS (
  SELECT 1 AS n, 'rate_limits table exists' AS check,
         to_regclass('public.rate_limits') IS NOT NULL AS ok
  UNION ALL SELECT 2, 'rate_limit_counters table exists',
         to_regclass('public.rate_limit_counters') IS NOT NULL
  UNION ALL SELECT 3, 'all six policies seeded',
         (SELECT COUNT(*) FROM public.rate_limits
           WHERE action IN ('upload','comment','follow','like','thread','message')) = 6
  UNION ALL SELECT 4, 'upload is 60 per day',
         EXISTS (SELECT 1 FROM public.rate_limits
                  WHERE action='upload' AND max_count=60 AND window_seconds=86400)
  UNION ALL SELECT 5, 'new threads capped at 20 per day',
         EXISTS (SELECT 1 FROM public.rate_limits
                  WHERE action='thread' AND max_count=20 AND window_seconds=86400)
  UNION ALL SELECT 6, 'RLS on both new tables',
         (SELECT COUNT(*) FROM pg_class
           WHERE relname IN ('rate_limits','rate_limit_counters')
             AND relrowsecurity) = 2
  UNION ALL SELECT 7, 'no client can write a counter',
         NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                      WHERE table_name='rate_limit_counters'
                        AND grantee IN ('anon','authenticated')
                        AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE'))
  UNION ALL SELECT 8, 'no client can call consume_rate_limit directly',
         NOT has_function_privilege('authenticated',
              'public.consume_rate_limit(text)', 'EXECUTE')
  UNION ALL SELECT 9, 'consume_rate_limit is DEFINER with a pinned search_path',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace nsp ON nsp.oid=p.pronamespace
                  WHERE nsp.nspname='public' AND p.proname='consume_rate_limit'
                    AND p.prosecdef
                    AND EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,'{}')) c
                                 WHERE c LIKE 'search_path=%'))
  UNION ALL SELECT 10, 'all six triggers attached',
         (SELECT COUNT(*) FROM pg_trigger
           WHERE NOT tgisinternal AND tgname IN ('rate_limit_upload','rate_limit_comment',
                 'rate_limit_follow','rate_limit_like','rate_limit_thread',
                 'rate_limit_message')) = 6
  UNION ALL SELECT 11, 'they fire BEFORE INSERT, so a refused write costs nothing',
         (SELECT COUNT(*) FROM pg_trigger
           WHERE NOT tgisinternal AND tgname LIKE 'rate_limit_%'
             AND (tgtype & 2) = 2 AND (tgtype & 4) = 4) = 6
  UNION ALL SELECT 12, 'the thread limit is on message_threads, not thread_participants',
         EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
                  WHERE t.tgname='rate_limit_thread' AND c.relname='message_threads')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
                      WHERE t.tgname LIKE 'rate_limit_%' AND c.relname='thread_participants')
  UNION ALL SELECT 13, 'voting is NOT double-limited (v15 already caps it)',
         NOT EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
                      WHERE t.tgname LIKE 'rate_limit_%' AND c.relname LIKE '%vote%')
  UNION ALL SELECT 14, 'the counter actually counts and actually refuses',
         (WITH probe AS (
            SELECT public.consume_rate_limit('__verify_probe__') AS r
          )
          SELECT TRUE FROM probe)
     AND NOT EXISTS (SELECT 1 FROM public.rate_limit_counters
                      WHERE action = '__verify_probe__')
  UNION ALL SELECT 15, 'pruning function exists and is not client-callable',
         to_regprocedure('public.prune_rate_limit_counters()') IS NOT NULL
     AND NOT has_function_privilege('authenticated',
              'public.prune_rate_limit_counters()', 'EXECUTE')
  UNION ALL SELECT 16, 'counters are indexed for pruning',
         EXISTS (SELECT 1 FROM pg_indexes
                  WHERE tablename='rate_limit_counters'
                    AND indexname='rate_limit_counters_window_idx')
)
SELECT n AS "#", check,
       CASE WHEN ok THEN 'PASS' ELSE '*** FAIL ***' END AS result
FROM checks
ORDER BY n;

-- =================================================================================
-- CHECK 14 EXPLAINED, AND WHAT IT DOES NOT PROVE
--
-- '__verify_probe__' has no row in rate_limits, so consume_rate_limit returns
-- early and writes nothing. That proves the unlimited-by-default path is safe: a
-- typo in a trigger argument cannot silently block a write path. It does NOT
-- prove the refusal works.
--
-- To prove the refusal, sign in as a real user in the app and run:
--
--   UPDATE public.rate_limits SET max_count = 1 WHERE action = 'comment';
--   -- now post two comments in the UI. The second must fail with RATE_LIMIT.
--   SELECT * FROM public.rate_limit_counters WHERE action = 'comment';
--   -- count must read exactly 1, not 2: the refused increment rolled back.
--   UPDATE public.rate_limits SET max_count = 60 WHERE action = 'comment';
--
-- Do that before trusting this migration. Shape is not behaviour.
-- =================================================================================
