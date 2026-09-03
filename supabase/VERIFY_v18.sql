-- =================================================================================
-- VERIFY MIGRATION V18 — run AFTER migration_v18_security.sql
-- Read only. Every row should say PASS.
-- =================================================================================

WITH fn AS (
  SELECT p.proname, p.oid, p.prosrc AS src, p.prosecdef,
         COALESCE(p.proconfig, '{}'::text[]) AS cfg
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
),
checks(n, label, ok) AS (VALUES

  -- ── S3: the engine can pay again ──────────────────────────────────────────
  (1, 'engine_is_writing() exists',
      (SELECT COUNT(*) FROM fn WHERE proname = 'engine_is_writing') = 1),

  (2, 'guard_profile_privileged_columns lets the engine through',
      (SELECT bool_or(src LIKE '%engine_is_writing%') FROM fn
        WHERE proname = 'guard_profile_privileged_columns')),

  (3, 'guard_battles_played lets the engine through',
      (SELECT bool_or(src LIKE '%engine_is_writing%') FROM fn
        WHERE proname = 'guard_battles_played')),

  (4, 'finalize_battle raises and lowers the flag',
      (SELECT bool_or(src LIKE '%lensleague.engine_write'', ''on''%'
                  AND src LIKE '%lensleague.engine_write'', ''off''%') FROM fn
        WHERE proname = 'finalize_battle')),

  (5, 'finalize_battle is still not callable by clients',
      NOT EXISTS (SELECT 1 FROM fn, pg_roles r
                   WHERE fn.proname = 'finalize_battle'
                     AND r.rolname IN ('anon','authenticated')
                     AND has_function_privilege(r.oid, fn.oid, 'EXECUTE'))),

  -- ── S2: no point farming ──────────────────────────────────────────────────
  (6, 'queue RPC checks ownership',
      (SELECT bool_or(src LIKE '%only enter your own photographs%') FROM fn
        WHERE proname = 'queue_portfolio_item_for_battle')),

  (7, 'queue RPC refuses a photograph already in a battle',
      (SELECT bool_or(src LIKE '%already in a battle%') FROM fn
        WHERE proname = 'queue_portfolio_item_for_battle')),

  (8, 'queue RPC is not callable by anon',
      NOT EXISTS (SELECT 1 FROM fn, pg_roles r
                   WHERE fn.proname = 'queue_portfolio_item_for_battle'
                     AND r.rolname = 'anon'
                     AND has_function_privilege(r.oid, fn.oid, 'EXECUTE'))),

  (9, 'open-battle lookup is indexed on photo_b_id',
      EXISTS (SELECT 1 FROM pg_indexes
               WHERE schemaname = 'public'
                 AND indexname = 'photo_battles_open_b_lookup_idx')),

  -- ── S1: private messages ──────────────────────────────────────────────────
  (10, 'clients cannot write thread_participants directly',
      NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                   WHERE table_schema = 'public' AND table_name = 'thread_participants'
                     AND privilege_type IN ('INSERT','UPDATE','DELETE')
                     AND grantee IN ('anon','authenticated'))),

  (11, 'clients cannot write message_threads directly',
      NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                   WHERE table_schema = 'public' AND table_name = 'message_threads'
                     AND privilege_type IN ('INSERT','UPDATE','DELETE')
                     AND grantee IN ('anon','authenticated'))),

  (12, 'the "anyone signed in" participant policy is gone',
      NOT EXISTS (SELECT 1 FROM pg_policy
                   WHERE polrelid = 'public.thread_participants'::regclass
                     AND polcmd IN ('a','*')
                     AND pg_get_expr(polwithcheck, polrelid) LIKE '%IS NOT NULL%'
                     AND pg_get_expr(polwithcheck, polrelid) NOT LIKE '%thread_id%')),

  (13, 'get_or_create_thread checks that the caller is a participant',
      (SELECT bool_or(src LIKE '%only open a conversation you are part of%') FROM fn
        WHERE proname = 'get_or_create_thread')),

  (14, 'get_or_create_thread is not callable by anon',
      NOT EXISTS (SELECT 1 FROM fn, pg_roles r
                   WHERE fn.proname = 'get_or_create_thread'
                     AND r.rolname = 'anon'
                     AND has_function_privilege(r.oid, fn.oid, 'EXECUTE'))),

  (15, 'you can still read a thread you are in (policy present)',
      EXISTS (SELECT 1 FROM pg_policy
               WHERE polrelid = 'public.messages'::regclass AND polcmd IN ('r','*'))),

  -- ── S4: search_path ───────────────────────────────────────────────────────
  (16, 'no SECURITY DEFINER function has an unpinned search_path',
      NOT EXISTS (SELECT 1 FROM fn
                   WHERE prosecdef
                     AND NOT EXISTS (SELECT 1 FROM unnest(fn.cfg) AS c
                                      WHERE c LIKE 'search_path=%'))),

  -- ── Regression guards: things v18 must not have broken ────────────────────
  (17, 'photo_battles / votes still not directly writable',
      NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                   WHERE table_schema = 'public'
                     AND table_name IN ('photo_battles','photo_battle_votes')
                     AND privilege_type IN ('INSERT','UPDATE','DELETE')
                     AND grantee IN ('anon','authenticated'))),

  (18, 'profiles still has no table-wide SELECT grant (email/phone private)',
      NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                   WHERE table_schema = 'public' AND table_name = 'profiles'
                     AND privilege_type = 'SELECT' AND grantee IN ('anon','authenticated'))),

  (19, 'RLS is on for every table in public',
      NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity)),

  (20, 'voting is still one per person, self-vote blocked, and capped',
      (SELECT bool_or(src LIKE '%cannot vote in your own battle%'
                  AND src LIKE '%voting limit%') FROM fn
        WHERE proname = 'cast_photo_battle_vote'))
)
SELECT n AS "#",
       label AS check,
       CASE WHEN ok THEN 'PASS' ELSE '*** FAIL ***' END AS result
  FROM checks
 ORDER BY n;
