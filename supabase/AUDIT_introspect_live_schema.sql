-- =================================================================================
-- LENSLEAGUE — LIVE SCHEMA INTROSPECTION  (READ ONLY — ONE QUERY, ONE RESULT)
-- ---------------------------------------------------------------------------------
-- Select ALL of this and press Run. It is a single statement, so the editor
-- shows the whole thing (the previous version was six statements and the editor
-- only displayed the last one).
--
-- It reports only what is MISSING or notable, so the output stays short enough
-- to screenshot. Roughly 30-60 rows.
-- =================================================================================

WITH expected_tables(t) AS (VALUES
  ('profiles'),('photos'),('posts'),('portfolio_items'),('albums'),
  ('messages'),('message_threads'),('thread_participants'),
  ('bookings'),('comments'),('likes'),('saved_items'),('saved_posts'),
  ('follows'),('notifications'),('settings'),('categories'),
  ('challenges'),('challenge_entries'),('competitions'),('competition_entries'),
  ('photo_battles'),('photo_battle_votes'),('votes'),('reviews'),('reports'),
  ('disputes'),('audit_logs'),('user_roles'),('roles'),('permissions'),
  ('sessions'),('waitlist'),('competition_recognition')
),
expected_cols(tbl, col) AS (VALUES
  -- the columns the frontend actually queries today
  ('profiles','cover'),('profiles','cover_url'),('profiles','account_type'),
  ('profiles','rating'),('profiles','review_count'),('profiles','specialties'),
  ('profiles','profile_completed'),('profiles','photography_style'),
  ('profiles','service_categories'),('profiles','starting_rate'),
  ('profiles','is_public'),('profiles','push_notifs'),('profiles','email_notifs'),
  ('profiles','is_deactivated'),('profiles','points'),('profiles','wins'),
  ('profiles','display_name'),('profiles','avatar'),('profiles','avatar_url'),
  ('messages','thread_id'),('messages','read_at'),('messages','recipient_id'),
  ('messages','timestamp'),('messages','body'),
  ('bookings','event_date'),('bookings','total_price'),('bookings','notes'),
  ('bookings','date'),('bookings','budget'),('bookings','message'),
  ('comments','item_id'),('comments','photo_id'),('comments','body'),
  ('likes','item_id'),('likes','post_id'),
  ('saved_items','target_id'),('saved_items','target_type'),('saved_items','photo_id'),
  ('portfolio_items','votes'),('portfolio_items','custom_style'),
  ('portfolio_items','categories'),('portfolio_items','exif_data'),
  ('portfolio_items','media_url'),('portfolio_items','photographer_id'),
  ('portfolio_items','album_id'),
  ('photos','alt_text'),('photos','destination'),
  ('photo_battles','category'),('photo_battles','status'),('photo_battles','closes_at')
),
expected_fns(fn) AS (VALUES
  ('get_feed'),('search_users'),('search_posts'),('is_username_available'),
  ('get_or_create_thread'),('queue_portfolio_item_for_battle'),
  ('cast_photo_battle_vote'),('admin_console_access'),('admin_resolve_report'),
  ('admin_set_user_verified'),('admin_set_user_banned'),('admin_resolve_dispute'),
  ('get_room_recognition'),('award_competition_recognition'),('handle_new_user')
)

--  1. Which expected tables are absent
SELECT '1 MISSING TABLE' AS section, e.t AS name, '' AS detail
FROM expected_tables e
WHERE to_regclass('public.' || e.t) IS NULL

UNION ALL
--  2. Which queried columns are absent (only for tables that DO exist)
SELECT '2 MISSING COLUMN', e.tbl || '.' || e.col, ''
FROM expected_cols e
WHERE to_regclass('public.' || e.tbl) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema='public' AND c.table_name=e.tbl AND c.column_name=e.col
  )

UNION ALL
--  3. Which RPCs the app calls are absent
SELECT '3 MISSING RPC', e.fn, ''
FROM expected_fns e
WHERE NOT EXISTS (
  SELECT 1 FROM pg_proc p
  WHERE p.proname = e.fn AND p.pronamespace = 'public'::regnamespace
)

UNION ALL
--  4. Every table that exists, as one compact row
SELECT '4 TABLES PRESENT', 'all', string_agg(tablename, ', ' ORDER BY tablename)
FROM pg_tables WHERE schemaname='public'

UNION ALL
--  5. Tables without row-level security enabled
SELECT '5 RLS OFF', c.relname, ''
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity

UNION ALL
--  6. Storage buckets
SELECT '6 BUCKET', id, CASE WHEN public THEN 'public' ELSE 'private' END
FROM storage.buckets

UNION ALL
--  7. Row counts, so we know what is real data vs empty
SELECT '7 ROWS', 'profiles', COUNT(*)::text FROM public.profiles
UNION ALL SELECT '7 ROWS', 'follows',   COUNT(*)::text FROM public.follows

ORDER BY 1, 2;
