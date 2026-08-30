-- =================================================================================
-- LENSLEAGUE MIGRATION V11: SECURITY HARDENING
-- ---------------------------------------------------------------------------------
-- Closes the gaps found in the v1-v10 audit:
--   1. Tables with NO row level security (anyone holding the public anon key could
--      read AND write them). user_roles was the worst: self-granting admin.
--   2. profiles allowed a user to set their own verified / banned / points /
--      global_rank / role — reputation and moderation state were client-writable.
--   3. profiles.email and profiles.phone were world-readable through the
--      "public read" policy.
--   4. 13 SECURITY DEFINER functions ran with a mutable search_path.
--   5. Moderation was enforced only by a hardcoded email check in the browser.
--   6. Public storage buckets accepted any MIME type at any size.
--   7. Missing UPDATE / DELETE policies broke ordinary user actions.
--
-- Safe to run more than once.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 0. HELPERS
-- ---------------------------------------------------------------------------------

-- Single source of truth for privilege checks. SECURITY DEFINER so that policies
-- can consult user_roles without needing SELECT rights on it (and without
-- recursing through that table's own RLS).
CREATE OR REPLACE FUNCTION public.has_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name = p_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.has_role('admin') OR public.has_role('moderator');
$$;

-- Rewritten with a pinned search_path (the v7 version had none).
CREATE OR REPLACE FUNCTION public.user_has_permission(p_action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.action = p_action
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(TEXT) TO authenticated;


-- ---------------------------------------------------------------------------------
-- 1. RBAC TABLES — the privilege escalation path
--    user_roles had RLS switched off entirely. Supabase grants anon/authenticated
--    table privileges by default, so any visitor could INSERT themselves the
--    admin role. Writes are now reserved for service_role / definer functions.
-- ---------------------------------------------------------------------------------

ALTER TABLE public.roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles       ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.roles            FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.permissions      FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.role_permissions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles       FROM anon, authenticated;

DROP POLICY IF EXISTS "roles_read_authenticated" ON public.roles;
CREATE POLICY "roles_read_authenticated" ON public.roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "permissions_read_authenticated" ON public.permissions;
CREATE POLICY "permissions_read_authenticated" ON public.permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "role_permissions_read_staff" ON public.role_permissions;
CREATE POLICY "role_permissions_read_staff" ON public.role_permissions
  FOR SELECT TO authenticated USING (public.is_staff());

-- A user may see which roles they hold, and nobody else's.
DROP POLICY IF EXISTS "user_roles_read_own" ON public.user_roles;
CREATE POLICY "user_roles_read_own" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role('admin'));


-- ---------------------------------------------------------------------------------
-- 2. OTHER TABLES THAT SHIPPED WITHOUT RLS
--    payments (amounts + Stripe intent ids), sessions (IP + user agent),
--    proposals, counter_offers, job_requests, thread_participants,
--    collections, portfolio_collections, categories.
-- ---------------------------------------------------------------------------------

ALTER TABLE public.sessions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counter_offers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_participants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories            ENABLE ROW LEVEL SECURITY;

-- Sessions: strictly your own device records.
DROP POLICY IF EXISTS "sessions_own" ON public.sessions;
CREATE POLICY "sessions_own" ON public.sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Payments: readable by the two parties to the booking. Never client-writable —
-- money moves through the payment provider webhook (service_role) only.
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM anon, authenticated;
DROP POLICY IF EXISTS "payments_read_booking_parties" ON public.payments;
CREATE POLICY "payments_read_booking_parties" ON public.payments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = payments.booking_id
        AND (b.client_id = auth.uid() OR b.photographer_id = auth.uid())
    )
    OR public.has_role('admin')
  );

-- Job requests: open briefs are public; only the client who posted one may edit it.
DROP POLICY IF EXISTS "job_requests_read_open" ON public.job_requests;
CREATE POLICY "job_requests_read_open" ON public.job_requests
  FOR SELECT USING (status = 'open' OR client_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "job_requests_insert_own" ON public.job_requests;
CREATE POLICY "job_requests_insert_own" ON public.job_requests
  FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "job_requests_update_own" ON public.job_requests;
CREATE POLICY "job_requests_update_own" ON public.job_requests
  FOR UPDATE TO authenticated USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "job_requests_delete_own" ON public.job_requests;
CREATE POLICY "job_requests_delete_own" ON public.job_requests
  FOR DELETE TO authenticated USING (client_id = auth.uid());

-- Proposals: a pitch and its price are visible to the photographer who wrote it
-- and the client who posted the brief — not to competing photographers.
DROP POLICY IF EXISTS "proposals_read_involved" ON public.proposals;
CREATE POLICY "proposals_read_involved" ON public.proposals
  FOR SELECT TO authenticated USING (
    photographer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.job_requests j
      WHERE j.id = proposals.job_request_id AND j.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "proposals_insert_own" ON public.proposals;
CREATE POLICY "proposals_insert_own" ON public.proposals
  FOR INSERT TO authenticated WITH CHECK (photographer_id = auth.uid());

DROP POLICY IF EXISTS "proposals_update_involved" ON public.proposals;
CREATE POLICY "proposals_update_involved" ON public.proposals
  FOR UPDATE TO authenticated USING (
    photographer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.job_requests j
      WHERE j.id = proposals.job_request_id AND j.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "proposals_delete_own" ON public.proposals;
CREATE POLICY "proposals_delete_own" ON public.proposals
  FOR DELETE TO authenticated USING (photographer_id = auth.uid());

-- Counter offers: parties to the booking.
DROP POLICY IF EXISTS "counter_offers_involved" ON public.counter_offers;
CREATE POLICY "counter_offers_involved" ON public.counter_offers
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = counter_offers.booking_id
        AND (b.client_id = auth.uid() OR b.photographer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "counter_offers_insert_involved" ON public.counter_offers;
CREATE POLICY "counter_offers_insert_involved" ON public.counter_offers
  FOR INSERT TO authenticated WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = counter_offers.booking_id
        AND (b.client_id = auth.uid() OR b.photographer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "counter_offers_update_involved" ON public.counter_offers;
CREATE POLICY "counter_offers_update_involved" ON public.counter_offers
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = counter_offers.booking_id
        AND (b.client_id = auth.uid() OR b.photographer_id = auth.uid())
    )
  );

-- Thread participants: you can see the membership of threads you are in.
DROP POLICY IF EXISTS "thread_participants_read_own_threads" ON public.thread_participants;
CREATE POLICY "thread_participants_read_own_threads" ON public.thread_participants
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.thread_participants me
      WHERE me.thread_id = thread_participants.thread_id
        AND me.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "thread_participants_insert_self" ON public.thread_participants;
CREATE POLICY "thread_participants_insert_self" ON public.thread_participants
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Collections and their contents belong to their owner.
DROP POLICY IF EXISTS "collections_owner" ON public.collections;
CREATE POLICY "collections_owner" ON public.collections
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "portfolio_collections_owner" ON public.portfolio_collections;
CREATE POLICY "portfolio_collections_owner" ON public.portfolio_collections
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = portfolio_collections.collection_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = portfolio_collections.collection_id AND c.owner_id = auth.uid()
    )
  );

-- Categories: reference data. Readable by everyone, writable by nobody but staff.
REVOKE INSERT, UPDATE, DELETE ON public.categories FROM anon, authenticated;
DROP POLICY IF EXISTS "categories_read_all" ON public.categories;
CREATE POLICY "categories_read_all" ON public.categories FOR SELECT USING (true);


-- ---------------------------------------------------------------------------------
-- 3. PROFILES — stop users writing their own reputation and moderation state
--    The old policy was FOR UPDATE USING (auth.uid() = id) with no column limits,
--    so a user could POST { verified: true, points: 999999, banned: false }.
--    A BEFORE trigger is used rather than column GRANTs so that `select *` and
--    partial updates from the client keep working.
-- ---------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Columns the platform owns. Anything here is server-controlled.
  guarded TEXT[] := ARRAY[
    'verified', 'banned', 'points', 'wins', 'global_rank',
    'rating', 'review_count', 'competitions_won',
    'followers_count', 'following_count', 'posts_count'
  ];
  col TEXT;
  new_j JSONB := to_jsonb(NEW);
  old_j JSONB := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
BEGIN
  -- service_role and the definer functions below bypass this guard.
  IF auth.uid() IS NULL OR public.has_role('admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- A brand new profile always starts from the column defaults, whatever the
    -- client sent. Rebuilding NEW from defaults is not possible in plpgsql, so
    -- the known-numeric and known-boolean guards are zeroed explicitly.
    FOREACH col IN ARRAY guarded LOOP
      IF new_j ? col THEN
        IF jsonb_typeof(new_j -> col) = 'boolean' THEN
          new_j := jsonb_set(new_j, ARRAY[col], 'false'::jsonb);
        ELSIF jsonb_typeof(new_j -> col) = 'number' THEN
          new_j := jsonb_set(new_j, ARRAY[col], '0'::jsonb);
        END IF;
      END IF;
    END LOOP;
    NEW := jsonb_populate_record(NEW, new_j);
    RETURN NEW;
  END IF;

  -- UPDATE: silently revert any attempt to change a guarded column.
  FOREACH col IN ARRAY guarded LOOP
    IF new_j ? col AND (new_j -> col) IS DISTINCT FROM (old_j -> col) THEN
      new_j := jsonb_set(new_j, ARRAY[col], COALESCE(old_j -> col, 'null'::jsonb));
    END IF;
  END LOOP;

  -- id must never move.
  IF (new_j ? 'id') THEN
    new_j := jsonb_set(new_j, ARRAY['id'], old_j -> 'id');
  END IF;

  NEW := jsonb_populate_record(NEW, new_j);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER trg_guard_profile_privileged_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();

-- Re-state the profiles write policies with an explicit WITH CHECK.
DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON public.profiles;
CREATE POLICY "Allow authenticated users to update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to insert their own profile record" ON public.profiles;
CREATE POLICY "Allow users to insert their own profile record" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);


-- ---------------------------------------------------------------------------------
-- 4. PROFILES PII — email and phone were readable by anyone with the anon key
--    Column-level REVOKE keeps the rows public while making the two contact
--    columns private. `select('*')` on profiles must be replaced with an explicit
--    column list in the client (done in src/context/AppContext.jsx).
-- ---------------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    EXECUTE 'REVOKE SELECT (email) ON public.profiles FROM anon, authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    EXECUTE 'REVOKE SELECT (phone) ON public.profiles FROM anon, authenticated';
  END IF;
END $$;

-- Your own contact details stay reachable through a definer function.
CREATE OR REPLACE FUNCTION public.get_my_contact_details()
RETURNS TABLE (email TEXT, phone TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  RETURN QUERY
    SELECT p.email::TEXT,
           CASE WHEN to_jsonb(p) ? 'phone' THEN (to_jsonb(p) ->> 'phone') ELSE NULL END
    FROM public.profiles p
    WHERE p.id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_contact_details() TO authenticated;

-- The public_profiles view must not be a way around the revoke. It is recreated
-- without contact columns and, on PG15+, made security_invoker so the caller's
-- own RLS applies rather than the view owner's.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
SELECT
  id, username, name, display_name, bio,
  avatar, avatar_url, website, location,
  camera_gear, photography_style, role, points,
  followers_count, following_count,
  posts_count, competitions_won, created_at
FROM public.profiles;

DO $$
BEGIN
  IF current_setting('server_version_num')::INT >= 150000 THEN
    EXECUTE 'ALTER VIEW public.public_profiles SET (security_invoker = true)';
  END IF;
END $$;

GRANT SELECT ON public.public_profiles TO anon, authenticated;


-- ---------------------------------------------------------------------------------
-- 5. MISSING POLICIES — features that RLS was silently blocking
-- ---------------------------------------------------------------------------------

-- Users could write comments but never edit or delete them.
DROP POLICY IF EXISTS "comments_update_own" ON public.comments;
CREATE POLICY "comments_update_own" ON public.comments
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comments_delete_own_or_staff" ON public.comments;
CREATE POLICY "comments_delete_own_or_staff" ON public.comments
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_staff());

-- Messages: mark as read / delete your own.
DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
CREATE POLICY "messages_update_own" ON public.messages
  FOR UPDATE TO authenticated USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;
CREATE POLICY "messages_delete_own" ON public.messages
  FOR DELETE TO authenticated USING (sender_id = auth.uid());

-- settings had SELECT and UPDATE but no INSERT, so a new account could never
-- create its own settings row.
DROP POLICY IF EXISTS "settings_insert_own" ON public.settings;
CREATE POLICY "settings_insert_own" ON public.settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- message_threads had SELECT only; thread creation went through an RPC but the
-- direct path is needed by the inbox.
DROP POLICY IF EXISTS "message_threads_insert_authenticated" ON public.message_threads;
CREATE POLICY "message_threads_insert_authenticated" ON public.message_threads
  FOR INSERT TO authenticated WITH CHECK (true);

-- Photos: owners could insert and delete but not edit a caption.
DROP POLICY IF EXISTS "photos_update_own" ON public.photos;
CREATE POLICY "photos_update_own" ON public.photos
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Reviews: edit or withdraw your own.
DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE TO authenticated USING (reviewer_id = auth.uid()) WITH CHECK (reviewer_id = auth.uid());

DROP POLICY IF EXISTS "reviews_delete_own_or_staff" ON public.reviews;
CREATE POLICY "reviews_delete_own_or_staff" ON public.reviews
  FOR DELETE TO authenticated USING (reviewer_id = auth.uid() OR public.is_staff());

-- Challenges and competitions are platform-run: read-only for everyone else.
REVOKE INSERT, UPDATE, DELETE ON public.challenges   FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.competitions FROM anon, authenticated;

DROP POLICY IF EXISTS "challenges_manage_staff" ON public.challenges;
CREATE POLICY "challenges_manage_staff" ON public.challenges
  FOR ALL TO authenticated
  USING (public.user_has_permission('manage_challenges'))
  WITH CHECK (public.user_has_permission('manage_challenges'));

-- photo_battles / photo_battle_votes are written only by the definer RPCs.
REVOKE INSERT, UPDATE, DELETE ON public.photo_battles      FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.photo_battle_votes FROM anon, authenticated;

-- portfolio_items.votes is an Elo score the client was updating directly.
-- Leave the owner policy in place but keep score writes server-side.
CREATE OR REPLACE FUNCTION public.guard_portfolio_item_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role('admin')
     AND to_jsonb(NEW) ? 'votes'
     AND (to_jsonb(NEW) -> 'votes') IS DISTINCT FROM (to_jsonb(OLD) -> 'votes') THEN
    NEW := jsonb_populate_record(NEW, jsonb_set(to_jsonb(NEW), ARRAY['votes'], to_jsonb(OLD) -> 'votes'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_portfolio_item_votes ON public.portfolio_items;
CREATE TRIGGER trg_guard_portfolio_item_votes
  BEFORE UPDATE ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_portfolio_item_votes();


-- ---------------------------------------------------------------------------------
-- 6. AUDIT LOG INTEGRITY
--    Users may append their own entries but must not rewrite or erase history,
--    and must not claim someone else's actor_id.
-- ---------------------------------------------------------------------------------

REVOKE UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;

DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);


-- ---------------------------------------------------------------------------------
-- 7. MODERATION RPCs
--    The admin console previously wrote to profiles / reports / disputes straight
--    from the browser and gated itself on a hardcoded email string. These are the
--    server-side equivalents; every one checks a real permission.
-- ---------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_set_user_verified(p_user_id UUID, p_verified BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.user_has_permission('verify_user') THEN
    RAISE EXCEPTION 'Unauthorized: missing verify_user permission';
  END IF;
  UPDATE public.profiles SET verified = p_verified WHERE id = p_user_id;
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(),
          CASE WHEN p_verified THEN 'USER_VERIFIED' ELSE 'USER_UNVERIFIED' END,
          'profile', p_user_id, jsonb_build_object('verified', p_verified));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_banned(p_user_id UUID, p_banned BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.user_has_permission('ban_user') THEN
    RAISE EXCEPTION 'Unauthorized: missing ban_user permission';
  END IF;
  UPDATE public.profiles SET banned = p_banned WHERE id = p_user_id;
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(),
          CASE WHEN p_banned THEN 'USER_BANNED' ELSE 'USER_UNBANNED' END,
          'profile', p_user_id, jsonb_build_object('banned', p_banned));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resolve_report(
  p_report_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.user_has_permission('moderate_content') THEN
    RAISE EXCEPTION 'Unauthorized: missing moderate_content permission';
  END IF;
  IF p_status NOT IN ('pending', 'investigating', 'resolved', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid report status: %', p_status;
  END IF;
  UPDATE public.reports
     SET status = p_status,
         resolution_notes = COALESCE(p_notes, resolution_notes)
   WHERE id = p_report_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(p_dispute_id UUID, p_resolution TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.user_has_permission('manage_bookings') THEN
    RAISE EXCEPTION 'Unauthorized: missing manage_bookings permission';
  END IF;
  UPDATE public.disputes
     SET status = 'resolved', resolution = p_resolution
   WHERE id = p_dispute_id;
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'DISPUTE_RESOLVED', 'dispute', p_dispute_id,
          jsonb_build_object('resolution', p_resolution));
END;
$$;

-- The console asks this before rendering anything.
CREATE OR REPLACE FUNCTION public.admin_console_access()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.user_has_permission('view_admin_dashboard');
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_verified(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_banned(UUID, BOOLEAN)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_report(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_dispute(UUID, TEXT)      FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_set_user_verified(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_banned(UUID, BOOLEAN)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_dispute(UUID, TEXT)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_console_access()                 TO authenticated;


-- ---------------------------------------------------------------------------------
-- 8. STORAGE — public buckets accepted any file of any size
--    An HTML or SVG file uploaded to a public bucket is served back as markup.
-- ---------------------------------------------------------------------------------

UPDATE storage.buckets
   SET file_size_limit = 5242880,  -- 5 MB
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
 WHERE id = 'avatars';

UPDATE storage.buckets
   SET file_size_limit = 52428800, -- 50 MB
       allowed_mime_types = ARRAY[
         'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic',
         'video/mp4', 'video/webm', 'video/quicktime'
       ]
 WHERE id = 'post-media';

UPDATE storage.buckets
   SET file_size_limit = 104857600, -- 100 MB
       allowed_mime_types = ARRAY[
         'image/jpeg', 'image/png', 'image/webp', 'image/avif',
         'image/tiff', 'image/x-adobe-dng', 'application/octet-stream'
       ]
 WHERE id = 'post-originals';

-- post-originals had no UPDATE or DELETE policy, so owners could not replace or
-- remove their own raw files.
DROP POLICY IF EXISTS "post_originals_owner_update" ON storage.objects;
CREATE POLICY "post_originals_owner_update" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'post-originals'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "post_originals_owner_delete" ON storage.objects;
CREATE POLICY "post_originals_owner_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'post-originals'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ---------------------------------------------------------------------------------
-- 9. SEARCH_PATH ON EVERY SECURITY DEFINER FUNCTION
--    v4-v7 shipped 13 definer functions with a mutable search_path. A user who
--    can create objects in a schema earlier on the path can hijack an unqualified
--    reference and run code as the function owner. Pin them all.
-- ---------------------------------------------------------------------------------

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef
       AND NOT EXISTS (
         SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}'::TEXT[])) c
          WHERE c LIKE 'search\_path=%'
       )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
    RAISE NOTICE 'Pinned search_path on %', r.sig;
  END LOOP;
END $$;

-- Definer functions should not be executable by anonymous visitors unless they
-- are genuinely public reads.
REVOKE EXECUTE ON FUNCTION public.queue_portfolio_item_for_battle(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.queue_portfolio_item_for_battle(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cast_photo_battle_vote(UUID, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.cast_photo_battle_vote(UUID, UUID) TO authenticated;


-- ---------------------------------------------------------------------------------
-- 10. VERIFICATION — run this after applying. Every row should come back clean.
-- ---------------------------------------------------------------------------------
-- Tables in public with RLS switched off:
--   SELECT tablename FROM pg_tables t
--    WHERE schemaname = 'public'
--      AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--                       WHERE n.nspname='public' AND c.relname=t.tablename AND c.relrowsecurity);
--
-- Definer functions still missing a pinned search_path:
--   SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public' AND p.prosecdef
--      AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig,'{}')) c WHERE c LIKE 'search\_path=%');
--
-- Confirm email is no longer anon-readable:
--   SELECT has_column_privilege('anon', 'public.profiles', 'email', 'SELECT');  -- expect false
