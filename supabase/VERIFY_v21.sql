-- =================================================================================
-- VERIFY MIGRATION V21 — run AFTER migration_v21_thread_recursion.sql
-- Read only. Every row should say PASS.
--
-- NOTE ON WHAT THIS CAN AND CANNOT PROVE.
-- VERIFY_v18 returned 20/20 while messaging was completely unusable, because it
-- checked that a policy EXISTED, not that anybody could send a message. Shape is
-- not behaviour. These checks are still mostly shape - the SQL editor runs as an
-- owner, so it bypasses the very policies at issue.
--
-- THE REAL TEST IS IN THE APP: open a photographer's profile, press Inquire, and
-- send a message. That exercises get_or_create_thread, the participant policies
-- and the message insert as an actual signed-in user. Do that before believing
-- this is fixed.
-- =================================================================================

WITH pol AS (
  SELECT c.relname AS tbl, p.polname,
         COALESCE(pg_get_expr(p.polqual, p.polrelid), '')      AS using_expr,
         COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') AS check_expr
    FROM pg_policy p
    JOIN pg_class c     ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname IN ('thread_participants', 'message_threads', 'messages')
),
fn AS (
  SELECT p.proname, p.prosecdef, p.provolatile,
         COALESCE(p.proconfig, '{}'::text[]) AS cfg
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
),
checks(n, label, ok) AS (VALUES

  -- ── the helper ────────────────────────────────────────────────────────────
  (1, 'is_thread_participant exists',
      (SELECT COUNT(*) FROM fn WHERE proname = 'is_thread_participant') = 1),

  (2, 'it is SECURITY DEFINER — without this the cycle is not broken',
      (SELECT bool_or(prosecdef) FROM fn WHERE proname = 'is_thread_participant')),

  (3, 'it pins search_path',
      (SELECT bool_or(cfg::text LIKE '%search_path%') FROM fn WHERE proname = 'is_thread_participant')),

  (4, 'anon cannot call it',
      NOT has_function_privilege('anon', 'public.is_thread_participant(uuid)', 'EXECUTE')),

  (5, 'authenticated can call it',
      has_function_privilege('authenticated', 'public.is_thread_participant(uuid)', 'EXECUTE')),

  -- Behavioural, as far as this context allows: the function actually runs and
  -- returns a value rather than erroring on a broken body or search_path.
  (6, 'it executes and answers false for a thread you are not in',
      public.is_thread_participant('00000000-0000-0000-0000-000000000000'::uuid) IS FALSE),

  -- ── no policy reads its own table any more ────────────────────────────────
  (7, 'no thread_participants policy queries thread_participants',
      NOT EXISTS (SELECT 1 FROM pol
                   WHERE tbl = 'thread_participants'
                     AND (using_expr LIKE '%FROM thread_participants%'
                       OR check_expr LIKE '%FROM thread_participants%'))),

  (8, 'the pre-existing recursive SELECT policy is gone',
      NOT EXISTS (SELECT 1 FROM pol
                   WHERE polname = 'participants_select_own_threads'
                     AND using_expr LIKE '%FROM thread_participants%')),

  (9, 'the v18 recursive INSERT policy is gone',
      NOT EXISTS (SELECT 1 FROM pol
                   WHERE polname = 'participants_insert_self_only'
                     AND check_expr LIKE '%FROM thread_participants%')),

  -- ── the rule still exists, via the helper ─────────────────────────────────
  (10, 'participants SELECT still restricted, through the helper',
      EXISTS (SELECT 1 FROM pol WHERE polname = 'participants_select_own_threads'
                AND using_expr LIKE '%is_thread_participant%')),

  (11, 'threads SELECT still restricted, through the helper',
      EXISTS (SELECT 1 FROM pol WHERE polname = 'threads_select_participant'
                AND using_expr LIKE '%is_thread_participant%')),

  (12, 'messages SELECT still restricted, through the helper',
      EXISTS (SELECT 1 FROM pol WHERE polname = 'messages_select_participant'
                AND using_expr LIKE '%is_thread_participant%')),

  (13, 'messages INSERT still requires you to be the sender',
      EXISTS (SELECT 1 FROM pol WHERE polname = 'messages_insert_own'
                AND check_expr LIKE '%sender_id = auth.uid()%')),

  -- ── v18's actual protection must survive this ─────────────────────────────
  (14, 'clients still hold no INSERT on thread_participants (the v18 fix)',
      NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                   WHERE table_schema = 'public' AND table_name = 'thread_participants'
                     AND privilege_type = 'INSERT' AND grantee IN ('anon', 'authenticated'))),

  (15, 'get_or_create_thread still checks its caller',
      (SELECT bool_or(prosrc LIKE '%You can only open a conversation you are part of%')
         FROM pg_proc WHERE proname = 'get_or_create_thread')),

  (16, 'RLS still enabled on all three tables',
      (SELECT bool_and(relrowsecurity) FROM pg_class
        WHERE oid IN ('public.thread_participants'::regclass,
                      'public.message_threads'::regclass,
                      'public.messages'::regclass)))
)
SELECT n AS "#",
       label AS check,
       CASE WHEN ok THEN 'PASS' ELSE '*** FAIL ***' END AS result
  FROM checks
 ORDER BY n;
