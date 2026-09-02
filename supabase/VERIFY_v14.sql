-- =================================================================================
-- LENSLEAGUE — VERIFY MIGRATION V14  (READ ONLY, SAFE TO RE-RUN)
-- ---------------------------------------------------------------------------------
-- Run this on its own. It changes nothing.
--
-- Why it exists separately: the verification block at the end of v14 called
-- has_column_privilege(... 'phone' ...), and profiles has no `phone` column.
-- That function RAISES on a missing column rather than returning false, so the
-- readout failed — after COMMIT, which means the migration itself had already
-- applied. This version asks information_schema first and never assumes a
-- column exists.
-- =================================================================================

WITH col AS (
  SELECT table_name, column_name, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
),
checks(sort, label, ok) AS (VALUES

  -- ---- profiles: the seven that broke every profile query -------------------
  (1, 'profiles.cover_url',         EXISTS (SELECT 1 FROM col WHERE table_name='profiles' AND column_name='cover_url')),
  (1, 'profiles.account_type',      EXISTS (SELECT 1 FROM col WHERE table_name='profiles' AND column_name='account_type')),
  (1, 'profiles.rating',            EXISTS (SELECT 1 FROM col WHERE table_name='profiles' AND column_name='rating')),
  (1, 'profiles.review_count',      EXISTS (SELECT 1 FROM col WHERE table_name='profiles' AND column_name='review_count')),
  (1, 'profiles.specialties',       EXISTS (SELECT 1 FROM col WHERE table_name='profiles' AND column_name='specialties')),
  (1, 'profiles.profile_completed', EXISTS (SELECT 1 FROM col WHERE table_name='profiles' AND column_name='profile_completed')),

  -- ---- social interactions --------------------------------------------------
  (2, 'likes.item_id',              EXISTS (SELECT 1 FROM col WHERE table_name='likes' AND column_name='item_id')),
  (2, 'likes.post_id optional',     EXISTS (SELECT 1 FROM col WHERE table_name='likes' AND column_name='post_id' AND is_nullable='YES')),
  (2, 'comments.item_id',           EXISTS (SELECT 1 FROM col WHERE table_name='comments' AND column_name='item_id')),
  (2, 'saved_items.target_id',      EXISTS (SELECT 1 FROM col WHERE table_name='saved_items' AND column_name='target_id')),
  (2, 'saved_items.target_type',    EXISTS (SELECT 1 FROM col WHERE table_name='saved_items' AND column_name='target_type')),

  -- ---- upload flow ----------------------------------------------------------
  (3, 'portfolio_items.alt_text',   EXISTS (SELECT 1 FROM col WHERE table_name='portfolio_items' AND column_name='alt_text')),
  (3, 'portfolio_items.location',   EXISTS (SELECT 1 FROM col WHERE table_name='portfolio_items' AND column_name='location')),
  (3, 'portfolio_items.like_count', EXISTS (SELECT 1 FROM col WHERE table_name='portfolio_items' AND column_name='like_count')),

  -- ---- messaging ------------------------------------------------------------
  (4, 'message_threads table',      to_regclass('public.message_threads')     IS NOT NULL),
  (4, 'thread_participants table',  to_regclass('public.thread_participants') IS NOT NULL),
  (4, 'messages.thread_id',         EXISTS (SELECT 1 FROM col WHERE table_name='messages' AND column_name='thread_id')),
  (4, 'messages.read_at',           EXISTS (SELECT 1 FROM col WHERE table_name='messages' AND column_name='read_at')),

  -- ---- triggers that keep counts honest -------------------------------------
  (5, 'like counter trigger',       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_sync_item_like_count')),
  (5, 'comment counter trigger',    EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_sync_item_comment_count')),
  (5, 'counter guard trigger',      EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_guard_item_counters')),

  -- ---- security still intact after the re-grant ------------------------------
  -- Asked via information_schema so a missing column can never raise.
  (6, 'email NOT readable by anon',
      NOT EXISTS (SELECT 1 FROM information_schema.column_privileges
                   WHERE table_schema='public' AND table_name='profiles'
                     AND column_name='email' AND grantee='anon' AND privilege_type='SELECT')),
  (6, 'name IS readable by anon',
      EXISTS (SELECT 1 FROM information_schema.column_privileges
               WHERE table_schema='public' AND table_name='profiles'
                 AND column_name='name' AND grantee='anon' AND privilege_type='SELECT')),
  (6, 'RLS on message_threads',
      COALESCE((SELECT relrowsecurity FROM pg_class
                 WHERE oid = to_regclass('public.message_threads')), false)),
  (6, 'no waitlist table (removed)', to_regclass('public.waitlist') IS NULL)
)
SELECT
  CASE WHEN ok THEN 'OK' ELSE '>> FAIL' END AS result,
  label
FROM checks
ORDER BY (NOT ok) DESC, sort, label;
