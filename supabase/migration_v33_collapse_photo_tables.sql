-- =================================================================================
-- migration v33 — one table for a photograph, not three
--
-- WHAT WAS WRONG
--
-- Publishing a photograph wrote it to three tables: portfolio_items, photos and
-- posts. Only portfolio_items was ever read back. The other two writes were
-- fire-and-forget, so when they failed nobody was told, and when their schemas
-- drifted nobody noticed - which is how alt_text and location were collected
-- from photographers for months and thrown away, written to a table that has no
-- such columns.
--
-- WHAT THE DATABASE SAID (CHECK_photo_tables.sql, CHECK_photo_tables_2.sql)
--
--   photos   0 rows. Three foreign keys point at it. All three child columns
--            are 100% NULL.
--   posts    10 rows, 8 of them the same photographs already in
--            portfolio_items. Seven foreign keys point at it. All seven child
--            columns are 100% NULL.
--
-- So nothing depends on the DATA. What depends on these tables is CODE, and
-- that is the dangerous part.
--
-- THE TRAP THIS MIGRATION IS BUILT AROUND
--
-- Four trigger functions read columns that belong to the tables being removed:
-- tg_notify_like and on_like_insert/on_like_delete read post_id on `likes`,
-- tg_notify_comment reads photo_id on `comments`. plpgsql resolves a column
-- reference when the function RUNS, not when it is created. Those branches are
-- never taken today because the columns are always NULL - which is exactly how
-- cast_photo_battle_vote stayed broken through six migrations. Remove the
-- tables without rewriting the functions and the failure surfaces on the next
-- like, not here.
--
-- So the functions are rewritten FIRST, the tables go afterwards, and step 0
-- refuses to run at all if anything references posts or photos that this
-- migration has not accounted for.
--
-- WHAT IS DELIBERATELY NOT DONE HERE
--
--   * The dead child columns (likes.post_id, comments.photo_id and the rest)
--     are LEFT IN PLACE. DROP TABLE ... CASCADE removes the foreign keys, which
--     is all that is needed to free the tables. Dropping the columns as well
--     would mean rewriting public.notify(), which this migration has not read.
--     Inert nullable columns cost nothing; a broken notify() costs every
--     notification in the product. They come out in their own migration.
--   * The empty satellite tables (mentions, post_hashtags, post_shares,
--     saved_posts, competition_entries, votes) are left standing. Same reason:
--     separate, reviewable, later.
--   * The `photos` storage bucket is left alone. Its one file is an orphaned
--     avatar from July that nothing points at. Deleting a bucket is not
--     reversible and does not belong in the same breath as a schema change.
--
-- WHICH ROWS SURVIVE
--
-- Two posts rows exist nowhere else. The rule applied is not "keep the one I
-- like" but a principle that generalises: an orphan whose image actually lives
-- in LensLeague storage is somebody's photograph and is copied across; an
-- orphan pointing at a third-party placeholder URL is seed junk and is not.
-- That keeps Eben's upload from 31 July and discards the picsum.photos row.
--
-- posts_count
--
-- on_post_insert was the ONLY thing maintaining profiles.posts_count, and it
-- fired on inserts into `posts`. Removing that table without replacing it would
-- have frozen every photographer's post count silently. It is replaced with a
-- trigger on portfolio_items that RECOMPUTES the number from the rows rather
-- than incrementing a counter, so it can heal instead of drifting - the same
-- discipline as v31. posts_count is a guarded column (v18), so the trigger
-- announces itself with lensleague.engine_write.
--
-- Run once, in the Supabase SQL editor. Then VERIFY_v33.sql.
-- =================================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- STEP 0. Refuse to run if something references these tables that this
-- migration does not handle. Better to abort now than to discover it on a like.
-- ---------------------------------------------------------------------------
DO $guard$
DECLARE
  v_functions TEXT;
  v_views     TEXT;
BEGIN
  SELECT string_agg(p.proname, ', ' ORDER BY p.proname)
    INTO v_functions
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND (p.prosrc ~* '\mposts\M' OR p.prosrc ~* '\mphotos\M')
    AND p.proname NOT IN (
      -- every one of these is rewritten or dropped below
      'on_like_insert', 'on_like_delete', 'get_feed',
      'tg_notify_like', 'tg_notify_comment', 'on_post_insert',
      'check_entry_category_matches_post',
      -- this one already guards itself with to_regclass and degrades to a
      -- clean error once the table is gone, so it is left as it is
      'award_competition_recognition'
    );

  IF v_functions IS NOT NULL THEN
    RAISE EXCEPTION
      'Aborting: function(s) reference posts/photos and are not handled by v33: %',
      v_functions;
  END IF;

  SELECT string_agg(v.table_name, ', ' ORDER BY v.table_name)
    INTO v_views
  FROM information_schema.views v
  WHERE v.table_schema = 'public'
    AND (v.view_definition ~* '\mposts\M' OR v.view_definition ~* '\mphotos\M');

  IF v_views IS NOT NULL THEN
    RAISE EXCEPTION 'Aborting: view(s) reference posts/photos: %', v_views;
  END IF;
END
$guard$;

-- ---------------------------------------------------------------------------
-- STEP 1. Rescue the orphans worth rescuing, BEFORE anything is dropped.
--
-- rate_limit_upload is a BEFORE INSERT trigger on portfolio_items that counts
-- an upload against the photographer's daily allowance (v24). This is a
-- migration moving a row they already published, not a new upload, so the
-- trigger is switched off for the duration rather than silently spending
-- somebody's quota.
-- ---------------------------------------------------------------------------
ALTER TABLE public.portfolio_items DISABLE TRIGGER rate_limit_upload;

DO $rescue$
DECLARE
  r        RECORD;
  v_album  UUID;
  v_copied INT := 0;
  v_left   INT := 0;
BEGIN
  IF to_regclass('public.posts') IS NULL THEN
    RAISE NOTICE 'v33: posts is already gone, nothing to rescue';
    RETURN;
  END IF;

  PERFORM set_config('lensleague.engine_write', 'on', true);

  FOR r IN
    SELECT po.author_id, po.image_url, po.caption, po.location, po.created_at
    FROM public.posts po
    WHERE po.image_url IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.portfolio_items pi WHERE pi.media_url = po.image_url
      )
      -- the principle: it is a real photograph only if the file is ours
      AND po.image_url LIKE '%/storage/v1/object/public/%'
  LOOP
    SELECT a.id INTO v_album
    FROM public.albums a
    WHERE a.photographer_id = r.author_id
      AND a.privacy_level = 'public'
    LIMIT 1;

    IF v_album IS NULL THEN
      INSERT INTO public.albums (photographer_id, title, privacy_level)
      VALUES (r.author_id, 'Portfolio', 'public')
      RETURNING id INTO v_album;
    END IF;

    -- categories is the app's own default. The photographer can change it from
    -- the UI; inventing a category here would be guessing on their behalf.
    INSERT INTO public.portfolio_items
      (album_id, photographer_id, media_url, caption, categories, location, created_at)
    VALUES
      (v_album, r.author_id, r.image_url, COALESCE(r.caption, ''),
       ARRAY['Nature'], NULLIF(btrim(COALESCE(r.location, '')), ''), r.created_at);

    v_copied := v_copied + 1;
  END LOOP;

  SELECT count(*) INTO v_left
  FROM public.posts po
  WHERE NOT EXISTS (
    SELECT 1 FROM public.portfolio_items pi WHERE pi.media_url = po.image_url
  );

  PERFORM set_config('lensleague.engine_write', 'off', true);

  RAISE NOTICE 'v33: rescued % row(s); % row(s) discarded as placeholders', v_copied, v_left;
END
$rescue$;

ALTER TABLE public.portfolio_items ENABLE TRIGGER rate_limit_upload;

-- ---------------------------------------------------------------------------
-- STEP 2. Rewrite the two notification triggers so neither reads a column that
-- belongs to a table being removed. Behaviour is unchanged: the branches being
-- deleted could never be reached, because post_id and photo_id are NULL on
-- every row in the database.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_notify_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
DECLARE
  v_owner UUID;
BEGIN
  IF NEW.item_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT photographer_id INTO v_owner
  FROM public.portfolio_items
  WHERE id = NEW.item_id;

  PERFORM public.notify(v_owner, NEW.user_id, 'like', NULL::UUID);
  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.tg_notify_like() IS
  'Notifies a photographer that their portfolio item was liked. v33 removed the '
  'posts branch: likes.post_id was NULL on every row and the table it pointed at '
  'no longer exists.';

CREATE OR REPLACE FUNCTION public.tg_notify_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
DECLARE
  v_owner UUID;
BEGIN
  IF NEW.item_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT photographer_id INTO v_owner
  FROM public.portfolio_items
  WHERE id = NEW.item_id;

  PERFORM public.notify(v_owner, NEW.user_id, 'comment', NULL::UUID, NEW.id);
  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.tg_notify_comment() IS
  'Notifies a photographer that their portfolio item was commented on. v33 '
  'removed the photos branch: comments.photo_id was NULL on every row.';

-- ---------------------------------------------------------------------------
-- STEP 3. Replace posts_count maintenance before the thing that maintained it
-- disappears.
--
-- Recomputed from the rows, not incremented, so a miscount heals on the next
-- upload instead of persisting forever.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_profile_post_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
DECLARE
  v_owner UUID;
BEGIN
  v_owner := COALESCE(NEW.photographer_id, OLD.photographer_id);
  IF v_owner IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- posts_count is one of the columns the profile guard freezes (v18), so the
  -- platform has to identify itself as the writer.
  PERFORM set_config('lensleague.engine_write', 'on', true);

  UPDATE public.profiles p
     SET posts_count = (
       SELECT count(*) FROM public.portfolio_items pi
       WHERE pi.photographer_id = v_owner
     )
   WHERE p.id = v_owner;

  PERFORM set_config('lensleague.engine_write', 'off', true);

  RETURN COALESCE(NEW, OLD);
END;
$fn$;

COMMENT ON FUNCTION public.sync_profile_post_count() IS
  'Keeps profiles.posts_count equal to the photographer real portfolio_items '
  'rows. Replaces on_post_insert, which counted inserts into the posts table '
  'that v33 removed.';

DROP TRIGGER IF EXISTS trg_sync_profile_post_count ON public.portfolio_items;
CREATE TRIGGER trg_sync_profile_post_count
AFTER INSERT OR DELETE ON public.portfolio_items
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_post_count();

-- ---------------------------------------------------------------------------
-- STEP 4. Retire the functions that exist only to serve the two tables.
-- CASCADE takes their triggers with them wherever those happen to be attached,
-- which is deliberate: it does not depend on this migration guessing correctly.
--
-- on_like_insert / on_like_delete wrote like counts to posts and inserted
-- notifications joined to posts. Both matched zero rows on every like ever
-- cast, because likes.post_id is NULL. tg_notify_like is what actually notifies.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.on_like_insert() CASCADE;
DROP FUNCTION IF EXISTS public.on_like_delete() CASCADE;
DROP FUNCTION IF EXISTS public.on_post_insert() CASCADE;
DROP FUNCTION IF EXISTS public.check_entry_category_matches_post() CASCADE;
DROP FUNCTION IF EXISTS public.get_feed(UUID, TIMESTAMPTZ, INTEGER) CASCADE;

-- ---------------------------------------------------------------------------
-- STEP 5. The tables themselves.
--
-- CASCADE here removes the eleven foreign key CONSTRAINTS on the child tables.
-- It does not remove the child columns, and that is intended - see the header.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.posts  CASCADE;
DROP TABLE IF EXISTS public.photos CASCADE;

-- ---------------------------------------------------------------------------
-- STEP 6. Backfill posts_count now that portfolio_items is the only source.
-- ---------------------------------------------------------------------------
DO $backfill$
DECLARE
  v_fixed INT;
BEGIN
  PERFORM set_config('lensleague.engine_write', 'on', true);

  WITH truth AS (
    SELECT pr.id,
           (SELECT count(*) FROM public.portfolio_items pi
             WHERE pi.photographer_id = pr.id)::INT AS n
    FROM public.profiles pr
  )
  UPDATE public.profiles p
     SET posts_count = t.n
    FROM truth t
   WHERE p.id = t.id
     AND COALESCE(p.posts_count, 0) <> t.n;

  GET DIAGNOSTICS v_fixed = ROW_COUNT;
  PERFORM set_config('lensleague.engine_write', 'off', true);

  RAISE NOTICE 'v33: corrected posts_count on % profile(s)', v_fixed;
END
$backfill$;

-- ---------------------------------------------------------------------------
-- STEP 7. Assert the state this migration claims to have produced, inside the
-- transaction, so a surprise rolls the whole thing back instead of shipping.
-- ---------------------------------------------------------------------------
DO $assert$
BEGIN
  IF to_regclass('public.posts') IS NOT NULL THEN
    RAISE EXCEPTION 'v33 failed: posts still exists';
  END IF;
  IF to_regclass('public.photos') IS NOT NULL THEN
    RAISE EXCEPTION 'v33 failed: photos still exists';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('tg_notify_like', 'tg_notify_comment')
      AND (p.prosrc ~* '\mpost_id\M' OR p.prosrc ~* '\mphoto_id\M')
  ) THEN
    RAISE EXCEPTION
      'v33 failed: a notification trigger still reads a column of a dropped table';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE NOT t.tgisinternal
      AND t.tgrelid = 'public.portfolio_items'::REGCLASS
      AND t.tgname  = 'trg_sync_profile_post_count'
  ) THEN
    RAISE EXCEPTION 'v33 failed: nothing is maintaining profiles.posts_count';
  END IF;
END
$assert$;

COMMIT;
