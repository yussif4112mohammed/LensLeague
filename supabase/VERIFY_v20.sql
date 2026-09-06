-- =================================================================================
-- VERIFY MIGRATION V20 — run AFTER migration_v20_notifications.sql
-- Read only. Every row should say PASS.
-- =================================================================================

WITH fn AS (
  SELECT p.proname, p.oid, p.prosrc AS src, p.prosecdef,
         COALESCE(p.proconfig, '{}'::text[]) AS cfg
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
),
trg AS (
  SELECT t.tgname, c.relname
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND NOT t.tgisinternal
),
checks(n, label, ok) AS (VALUES

  -- ── privileges: the point of section 1 ────────────────────────────────────
  (1, 'clients can no longer INSERT notifications',
      NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                   WHERE table_schema='public' AND table_name='notifications'
                     AND privilege_type='INSERT' AND grantee IN ('anon','authenticated'))),

  (2, 'clients can no longer DELETE or TRUNCATE notifications',
      NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                   WHERE table_schema='public' AND table_name='notifications'
                     AND privilege_type IN ('DELETE','TRUNCATE')
                     AND grantee IN ('anon','authenticated'))),

  (3, 'anon holds nothing on notifications',
      NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                   WHERE table_schema='public' AND table_name='notifications'
                     AND grantee='anon')),

  (4, 'authenticated keeps SELECT and UPDATE',
      (SELECT COUNT(*) FROM information_schema.role_table_grants
        WHERE table_schema='public' AND table_name='notifications'
          AND grantee='authenticated' AND privilege_type IN ('SELECT','UPDATE')) = 2),

  (5, 'RLS still enabled',
      (SELECT relrowsecurity FROM pg_class WHERE oid='public.notifications'::regclass)),

  (6, 'select-own and update-own policies intact',
      (SELECT COUNT(*) FROM pg_policy WHERE polrelid='public.notifications'::regclass) >= 2),

  -- ── vocabulary ────────────────────────────────────────────────────────────
  (7, 'battle_result is an allowed type',
      EXISTS (SELECT 1 FROM pg_constraint
               WHERE conrelid='public.notifications'::regclass
                 AND conname='notifications_type_check'
                 AND pg_get_constraintdef(oid) LIKE '%battle_result%')),

  (8, 'the original nine types survive',
      EXISTS (SELECT 1 FROM pg_constraint
               WHERE conrelid='public.notifications'::regclass
                 AND conname='notifications_type_check'
                 AND pg_get_constraintdef(oid) LIKE '%booking_request%'
                 AND pg_get_constraintdef(oid) LIKE '%competition_result%')),

  -- ── the writer ────────────────────────────────────────────────────────────
  (9, 'notify() exists and is SECURITY DEFINER',
      (SELECT bool_or(prosecdef) FROM fn WHERE proname='notify')),

  (10, 'notify() pins its search_path',
      (SELECT bool_or(cfg::text LIKE '%search_path%') FROM fn WHERE proname='notify')),

  (11, 'notify() refuses to notify you about your own action',
      (SELECT bool_or(src LIKE '%p_actor = p_recipient%') FROM fn WHERE proname='notify')),

  (12, 'no client role can call notify() directly',
      NOT has_function_privilege('authenticated',
            'public.notify(uuid,uuid,text,uuid,uuid,uuid)', 'EXECUTE')),

  -- ── triggers ──────────────────────────────────────────────────────────────
  (13, 'follow trigger installed',        EXISTS (SELECT 1 FROM trg WHERE tgname='trg_notify_follow'   AND relname='follows')),
  (14, 'like trigger installed',          EXISTS (SELECT 1 FROM trg WHERE tgname='trg_notify_like'     AND relname='likes')),
  (15, 'comment trigger installed',       EXISTS (SELECT 1 FROM trg WHERE tgname='trg_notify_comment'  AND relname='comments')),
  (16, 'battle-result trigger installed', EXISTS (SELECT 1 FROM trg WHERE tgname='trg_notify_battle_finalized' AND relname='photo_battles')),
  (17, 'booking trigger installed',       EXISTS (SELECT 1 FROM trg WHERE tgname='trg_notify_booking'  AND relname='bookings')),

  (18, 'a zero-vote round notifies nobody',
      (SELECT bool_or(src LIKE '%no_votes%') FROM fn WHERE proname='tg_notify_battle_finalized')),

  (19, 'battle trigger only fires on the transition into finalized',
      (SELECT bool_or(src LIKE '%OLD.status = ''finalized''%') FROM fn WHERE proname='tg_notify_battle_finalized')),

  -- ── readers ───────────────────────────────────────────────────────────────
  (20, 'get_my_notifications exists',        (SELECT COUNT(*) FROM fn WHERE proname='get_my_notifications') = 1),
  (21, 'unread_notification_count exists',   (SELECT COUNT(*) FROM fn WHERE proname='unread_notification_count') = 1),
  (22, 'mark_notifications_read exists',     (SELECT COUNT(*) FROM fn WHERE proname='mark_notifications_read') = 1),

  (23, 'the readers are NOT definer — RLS does the filtering',
      (SELECT bool_and(NOT prosecdef) FROM fn
        WHERE proname IN ('get_my_notifications','unread_notification_count','mark_notifications_read'))),

  (24, 'every reader scopes to auth.uid()',
      (SELECT bool_and(src LIKE '%auth.uid()%') FROM fn
        WHERE proname IN ('get_my_notifications','unread_notification_count','mark_notifications_read'))),

  (25, 'anon cannot read notifications through the RPC',
      NOT has_function_privilege('anon', 'public.get_my_notifications(int,boolean)', 'EXECUTE')),

  (26, 'authenticated can',
      has_function_privilege('authenticated', 'public.get_my_notifications(int,boolean)', 'EXECUTE')),

  -- ── delivery ──────────────────────────────────────────────────────────────
  (27, 'notifications is published for realtime',
      EXISTS (SELECT 1 FROM pg_publication_tables
               WHERE pubname='supabase_realtime' AND schemaname='public'
                 AND tablename='notifications')),

  -- ── the nine pre-existing rows are untouched ──────────────────────────────
  (28, 'the 9 historical follow notifications survive',
      (SELECT COUNT(*) FROM public.notifications WHERE type='follow') >= 9)
)
SELECT n AS "#",
       label AS check,
       CASE WHEN ok THEN 'PASS' ELSE '*** FAIL ***' END AS result
  FROM checks
 ORDER BY n;
