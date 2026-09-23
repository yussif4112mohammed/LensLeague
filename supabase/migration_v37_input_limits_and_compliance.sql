-- =================================================================================
-- migration v37 — bound what a user can type, rate-limit the paths that were not,
--                 and make "delete my account" mean something
--
-- WHY
--
-- Every user-supplied text column in this database is an unbounded `TEXT`. At
-- eight users that is invisible. At ten thousand it is one person pasting four
-- megabytes into their bio, which is then read by every profile view, every
-- search result, every feed card that carries their name, and every one of the
-- hundred profiles AppContext pulls on mount. Nothing about that requires an
-- attacker; a broken paste does it.
--
-- Validation already exists on the client. That is a hint, not a rule: the
-- browser holds the anon key and talks to PostgREST directly, so a `maxlength`
-- attribute is a suggestion an attacker declines.
--
-- WHAT IS HERE
--
--   1. Length bounds on every user-typed column, added NOT VALID.
--   2. A scheme allow-list on profiles.website - http and https only.
--   3. Rate limits on the four write paths v24 did not cover.
--   4. Data export and account deletion, because "delete my account" currently
--      sets is_deactivated and nothing else.
--
-- WHY NOT VALID, AND WHY THAT IS NOT A COMPROMISE
--
-- A CHECK added NOT VALID is enforced on every INSERT and UPDATE from the
-- moment it exists. The only thing it skips is the scan of rows already there.
-- So the rule is live immediately, and a legacy row that violates it cannot
-- fail this migration at three in the morning. Each one is then VALIDATEd in a
-- block that reports rather than aborts, so the migration tells you which
-- column has legacy data instead of refusing to run.
--
-- Run once, in the Supabase SQL editor. Then VERIFY_v37.sql.
-- =================================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. LENGTH BOUNDS
--
-- Driven from a table rather than written out, so a column that does not exist
-- in this database is skipped instead of aborting the migration. The files in
-- this folder are not proof of what is live; this migration assumes that.
--
-- The numbers are chosen from what the thing actually is. A bio is a paragraph.
-- A caption on a photograph is Instagram's 2,200, which nobody has ever needed
-- to exceed. A name is a name.
-- ---------------------------------------------------------------------------
DO $bounds$
DECLARE
  r        RECORD;
  v_added  INT := 0;
  v_name   TEXT;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('profiles',        'name',                 120),
      ('profiles',        'display_name',         120),
      ('profiles',        'username',              30),
      ('profiles',        'bio',                  600),
      ('profiles',        'location',             120),
      ('profiles',        'website',              300),
      ('profiles',        'photography_style',     80),
      ('profiles',        'camera_gear',          300),
      ('profiles',        'availability_status',   60),
      ('profiles',        'avatar_url',          1000),
      ('profiles',        'cover_url',           1000),
      ('portfolio_items', 'caption',             2200),
      ('portfolio_items', 'alt_text',            1000),
      ('portfolio_items', 'location',             120),
      ('portfolio_items', 'custom_style',          80),
      ('portfolio_items', 'media_url',           1000),
      ('reports',         'reason',              1000),
      ('reports',         'resolution_notes',    2000),
      ('briefs',          'title',                120),
      ('briefs',          'prompt',               600)
    ) AS t(tbl, col, maxlen)
  LOOP
    -- Skip anything this database does not have, and anything that is not
    -- text.
    --
    -- The second half of that is not defensive padding. The first version of
    -- this list had profiles.starting_rate in it, which is an INTEGER, and
    -- char_length(integer) does not exist - so the migration aborted on a
    -- column bound that made no sense in the first place. The list is written
    -- from what the columns are believed to be; this checks what they are.
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name  = r.tbl
        AND column_name = r.col
        AND data_type IN ('text', 'character varying')
    );

    v_name := format('%s_%s_maxlen', r.tbl, r.col);
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = v_name AND conrelid = format('public.%I', r.tbl)::REGCLASS
    );

    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I IS NULL OR char_length(%I) <= %s) NOT VALID',
      r.tbl, v_name, r.col, r.col, r.maxlen
    );
    v_added := v_added + 1;
  END LOOP;

  RAISE NOTICE 'v37: added % length bound(s)', v_added;
  RAISE NOTICE 'v37: any column in the list that is missing or not text was skipped rather than bounded';
END
$bounds$;

-- ---------------------------------------------------------------------------
-- 2. profiles.website MUST BE http OR https
--
-- The client builds an href out of this value. A `javascript:` URL there is
-- stored XSS: it executes for every visitor who clicks the link on that
-- profile, with that visitor's session. The browser-side guard now refuses it
-- (src/lib/safeUrl.js), and this is the same rule in the only place that
-- cannot be skipped.
--
-- Existing values are normalised first - a bare "studio.com" becomes
-- "https://studio.com", which is what the old client-side code displayed
-- anyway - and anything that is neither is set to NULL rather than silently
-- kept in a state the constraint would reject.
-- ---------------------------------------------------------------------------
DO $website$
DECLARE
  v_fixed   INT;
  v_dropped INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'website'
  ) THEN
    RAISE NOTICE 'v37: profiles.website does not exist, skipping';
    RETURN;
  END IF;

  PERFORM set_config('lensleague.engine_write', 'on', true);

  UPDATE public.profiles
     SET website = 'https://' || btrim(website)
   WHERE website IS NOT NULL
     AND btrim(website) <> ''
     AND website !~* '^[a-z][a-z0-9+.-]*:'
     AND btrim(website) ~ '^[A-Za-z0-9]';
  GET DIAGNOSTICS v_fixed = ROW_COUNT;

  UPDATE public.profiles
     SET website = NULL
   WHERE website IS NOT NULL
     AND website !~* '^https?://';
  GET DIAGNOSTICS v_dropped = ROW_COUNT;

  PERFORM set_config('lensleague.engine_write', 'off', true);

  RAISE NOTICE 'v37: normalised % website value(s), cleared % that were not web addresses', v_fixed, v_dropped;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_website_scheme' AND conrelid = 'public.profiles'::REGCLASS
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_website_scheme
      CHECK (website IS NULL OR website ~* '^https?://[^[:space:]]+$');
  END IF;
END
$website$;

-- ---------------------------------------------------------------------------
-- 3. THE RATE LIMITS v24 DID NOT COVER
--
-- v24 bounded upload, comment, follow, like, thread and message. It left the
-- four paths below open, and two of them are the ones an abuser actually wants:
-- a report queue that can be flooded is a moderation denial-of-service, and a
-- booking request costs the photographer attention rather than bytes.
--
-- The numbers are set where a real person never meets them.
-- ---------------------------------------------------------------------------
INSERT INTO public.rate_limits (action, window_seconds, max_count, note) VALUES
  ('report',      86400, 30,
   'Flagging is meant to be easy, so this is loose. It exists so one account cannot bury the moderation queue, which costs a person time rather than a machine cycles.'),
  ('booking',     86400, 20,
   'Twenty enquiries in a day is a client shopping hard. Two hundred is someone spraying every photographer on the platform.'),
  ('review',      86400, 20,
   'A review requires a completed booking you were party to, so this is a backstop rather than the control. The control is the eligibility rule.'),
  ('brief_entry', 86400, 20,
   'The real cap is three entries per brief, enforced in enter_brief. This only stops a loop retrying.')
ON CONFLICT (action) DO NOTHING;

DO $attach$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('reports',       'rate_limit_report',      'report'),
      ('bookings',      'rate_limit_booking',     'booking'),
      ('reviews',       'rate_limit_review',      'review'),
      ('brief_entries', 'rate_limit_brief_entry', 'brief_entry')
    ) AS t(tbl, trg, action)
  LOOP
    CONTINUE WHEN to_regclass(format('public.%I', r.tbl)) IS NULL;
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.trg, r.tbl);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit(%L)',
      r.trg, r.tbl, r.action
    );
  END LOOP;
END
$attach$;

-- ---------------------------------------------------------------------------
-- 4. DATA EXPORT
--
-- "Applicable compliance" is not a checkbox; it is two operations a person can
-- perform on their own data. This is the first: everything this platform holds
-- about the caller, in one call, scoped to the caller by auth.uid() and by
-- nothing the client sends.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_uid UUID := auth.uid();
  v_out JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to export your data';
  END IF;

  SELECT jsonb_build_object(
    'exported_at', NOW(),
    'profile', (
      SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = v_uid
    ),
    'photographs', COALESCE((
      SELECT jsonb_agg(to_jsonb(pi) ORDER BY pi.created_at)
      FROM public.portfolio_items pi WHERE pi.photographer_id = v_uid
    ), '[]'::JSONB),
    'comments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('body', c.body, 'created_at', c.created_at))
      FROM public.comments c WHERE c.user_id = v_uid
    ), '[]'::JSONB),
    'bookings', COALESCE((
      SELECT jsonb_agg(to_jsonb(b) ORDER BY b.created_at)
      FROM public.bookings b
      WHERE b.client_id = v_uid OR b.photographer_id = v_uid
    ), '[]'::JSONB),
    'reviews_written', COALESCE((
      SELECT jsonb_agg(to_jsonb(rv)) FROM public.reviews rv WHERE rv.reviewer_id = v_uid
    ), '[]'::JSONB),
    'reviews_received', COALESCE((
      SELECT jsonb_agg(to_jsonb(rv)) FROM public.reviews rv WHERE rv.reviewee_id = v_uid
    ), '[]'::JSONB)
  ) INTO v_out;

  RETURN v_out;
END;
$fn$;

-- ---------------------------------------------------------------------------
-- 5. ACCOUNT DELETION, HONESTLY
--
-- Today the settings screen sets `is_deactivated = true` and calls that
-- deleting an account. It is not: the profile, the photographs, the name and
-- the email are all still there.
--
-- Actually erasing the auth user requires the service role key, which must
-- never reach a browser - so a single button that claims to delete everything
-- would be a lie no matter how it was written. Instead this is a two-step
-- process that is true at every step:
--
--   request_account_deletion()  the person asks. Their account is deactivated
--                               and their work leaves every public surface
--                               immediately, so the visible effect is instant.
--   admin_complete_account_deletion(user_id)
--                               an operator erases the personal data and
--                               removes the content, leaving an anonymous
--                               tombstone so other people's threads and
--                               bookings do not break.
--
-- The auth user itself is deleted by the operator in the Supabase dashboard.
-- That step is named in the request row rather than pretended away.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  user_id      UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason       TEXT CHECK (reason IS NULL OR char_length(reason) <= 1000),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.account_deletion_requests FROM anon, authenticated;
REVOKE SELECT ON public.account_deletion_requests FROM anon;

DROP POLICY IF EXISTS deletion_requests_own_or_staff ON public.account_deletion_requests;
CREATE POLICY deletion_requests_own_or_staff ON public.account_deletion_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff());

CREATE OR REPLACE FUNCTION public.request_account_deletion(p_reason TEXT DEFAULT NULL)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_uid UUID := auth.uid();
  v_at  TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to delete your account';
  END IF;

  INSERT INTO public.account_deletion_requests (user_id, reason)
  VALUES (v_uid, NULLIF(btrim(p_reason), ''))
  ON CONFLICT (user_id) DO UPDATE SET requested_at = NOW(), reason = EXCLUDED.reason
  RETURNING requested_at INTO v_at;

  -- Deactivating is a guarded column, so the platform identifies itself.
  PERFORM set_config('lensleague.engine_write', 'on', true);
  UPDATE public.profiles SET is_deactivated = TRUE WHERE id = v_uid;
  PERFORM set_config('lensleague.engine_write', 'off', true);

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (v_uid, 'ACCOUNT_DELETION_REQUESTED', 'profile', v_uid, jsonb_build_object('reason', p_reason));

  RETURN v_at;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.admin_complete_account_deletion(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_actor UUID := auth.uid();
BEGIN
  IF NOT public.user_has_permission('moderate_content') THEN
    RAISE EXCEPTION 'Unauthorized: missing moderate_content permission';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.account_deletion_requests WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'No deletion request exists for that account';
  END IF;

  DELETE FROM public.portfolio_items WHERE photographer_id = p_user_id;

  -- An anonymous tombstone rather than a deleted row: bookings, threads and
  -- reviews belonging to OTHER people reference this id, and erasing it would
  -- destroy their records to satisfy this one. Nothing identifying remains.
  PERFORM set_config('lensleague.engine_write', 'on', true);
  UPDATE public.profiles
     SET name                = 'Deleted user',
         display_name        = NULL,
         username            = 'deleted_' || left(replace(p_user_id::TEXT, '-', ''), 12),
         bio                 = NULL,
         location            = NULL,
         website             = NULL,
         avatar_url          = NULL,
         avatar              = NULL,
         cover_url           = NULL,
         camera_gear         = NULL,
         photography_style   = NULL,
         availability_status = NULL,
         is_deactivated      = TRUE
   WHERE id = p_user_id;
  PERFORM set_config('lensleague.engine_write', 'off', true);

  UPDATE public.account_deletion_requests
     SET completed_at = NOW(), completed_by = v_actor
   WHERE user_id = p_user_id;

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (v_actor, 'ACCOUNT_DELETION_COMPLETED', 'profile', p_user_id,
          jsonb_build_object('note', 'Personal data cleared. The auth user must still be deleted in the Supabase dashboard.'));
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.export_my_data()                        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_account_deletion(TEXT)          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_complete_account_deletion(UUID)   FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.export_my_data()                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(TEXT)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_complete_account_deletion(UUID)    TO authenticated;

COMMIT;

-- ---------------------------------------------------------------------------
-- Validate the bounds against rows that already exist.
--
-- Outside the transaction above, and each one caught, so a legacy value that
-- breaks a rule is REPORTED rather than rolling back the whole migration. The
-- rule is already enforced on new writes either way; this only settles whether
-- the old rows comply.
-- ---------------------------------------------------------------------------
DO $validate$
DECLARE
  c        RECORD;
  v_ok     INT := 0;
  v_legacy TEXT := '';
BEGIN
  FOR c IN
    SELECT con.conname, rel.relname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE con.contype = 'c'
      AND NOT con.convalidated
      AND rel.relnamespace = 'public'::REGNAMESPACE
      AND (con.conname LIKE '%\_maxlen' OR con.conname = 'profiles_website_scheme')
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', c.relname, c.conname);
      v_ok := v_ok + 1;
    EXCEPTION WHEN check_violation THEN
      v_legacy := v_legacy || c.conname || ' ';
    END;
  END LOOP;

  RAISE NOTICE 'v37: validated % bound(s) against existing rows', v_ok;
  IF v_legacy <> '' THEN
    RAISE NOTICE 'v37: existing rows still exceed: %  (new writes are already blocked)', v_legacy;
  END IF;
END
$validate$;
