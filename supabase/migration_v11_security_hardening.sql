-- =================================================================================
-- LENSLEAGUE MIGRATION V11: SECURITY HARDENING  (self-adapting edition)
-- ---------------------------------------------------------------------------------
-- Closes the gaps found in the v1-v10 audit:
--   1. Tables with NO row level security (anyone holding the public anon key could
--      read AND write them). user_roles was the worst: self-granting admin.
--   2. profiles allowed a user to set their own verified / banned / points /
--      global_rank — reputation and moderation state were client-writable.
--   3. profiles.email and profiles.phone were world-readable.
--   4. SECURITY DEFINER functions ran with a mutable search_path.
--   5. Moderation was enforced only by a hardcoded email check in the browser.
--   6. Public storage buckets accepted any MIME type at any size.
--   7. Missing UPDATE / DELETE policies broke ordinary user actions.
--
-- IMPORTANT: earlier migration files in this repo were not all applied to this
-- database, so some tables they define do not exist. Every block below checks
-- for its table first and prints a NOTICE if it is missing, rather than failing.
-- Read the NOTICES after running: they tell you exactly what was skipped.
--
-- Safe to run more than once.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 0. PREREQUISITES
--    The role tables are the backbone of every permission check below, so they are
--    created here if the v7 migration never ran.
-- ---------------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

INSERT INTO public.roles (name, description) VALUES
    ('admin',        'Full platform administrator'),
    ('moderator',    'Content moderator'),
    ('photographer', 'Standard photographer account'),
    ('client',       'Standard client account')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (action, description) VALUES
    ('ban_user',             'Ban or unban a user account'),
    ('verify_user',          'Grant or revoke verification'),
    ('moderate_content',     'Review and resolve content reports'),
    ('manage_challenges',    'Create, edit and close competitions'),
    ('view_audit_logs',      'View the platform audit log'),
    ('manage_bookings',      'Override booking states for disputes'),
    ('view_admin_dashboard', 'Access the admin dashboard')
ON CONFLICT (action) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.name = 'moderator'
  AND p.action IN ('moderate_content', 'view_audit_logs', 'view_admin_dashboard')
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------------
-- 0b. HELPERS — the single source of truth for privilege checks.
--     SECURITY DEFINER so policies can consult user_roles without needing rights
--     on it, and without recursing through its own RLS.
-- ---------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_role(p_role TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = p_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.has_role('admin') OR public.has_role('moderator');
$$;

CREATE OR REPLACE FUNCTION public.user_has_permission(p_action TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid() AND p.action = p_action
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(TEXT)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff()                TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(TEXT) TO authenticated;


-- ---------------------------------------------------------------------------------
-- 1. RBAC LOCKDOWN — the privilege escalation path.
--    user_roles had RLS off. Supabase grants anon/authenticated table privileges
--    by default, so any visitor could INSERT themselves the admin role.
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

DROP POLICY IF EXISTS "user_roles_read_own" ON public.user_roles;
CREATE POLICY "user_roles_read_own" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role('admin'));


-- ---------------------------------------------------------------------------------
-- 2. EVERY OTHER TABLE THAT SHIPPED WITHOUT RLS
--    Each block is skipped with a NOTICE if the table is not in this database.
-- ---------------------------------------------------------------------------------

DO $do$
BEGIN
  -- sessions: device records (IP, user agent) — strictly your own.
  IF to_regclass('public.sessions') IS NULL THEN
    RAISE NOTICE 'skip: public.sessions does not exist';
  ELSE
    EXECUTE 'ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "sessions_own" ON public.sessions';
    EXECUTE $p$CREATE POLICY "sessions_own" ON public.sessions
               FOR ALL TO authenticated
               USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())$p$;
    RAISE NOTICE 'secured: public.sessions';
  END IF;

  -- payments: amounts and payment-provider ids. Readable by the two parties to
  -- the booking; never client-writable — money moves via the provider webhook.
  IF to_regclass('public.payments') IS NULL THEN
    RAISE NOTICE 'skip: public.payments does not exist';
  ELSE
    EXECUTE 'ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.payments FROM anon, authenticated';
    EXECUTE 'DROP POLICY IF EXISTS "payments_read_booking_parties" ON public.payments';
    IF to_regclass('public.bookings') IS NOT NULL THEN
      EXECUTE $p$CREATE POLICY "payments_read_booking_parties" ON public.payments
                 FOR SELECT TO authenticated USING (
                   EXISTS (SELECT 1 FROM public.bookings b
                           WHERE b.id = payments.booking_id
                             AND (b.client_id = auth.uid() OR b.photographer_id = auth.uid()))
                   OR public.has_role('admin')
                 )$p$;
    ELSE
      EXECUTE $p$CREATE POLICY "payments_read_booking_parties" ON public.payments
                 FOR SELECT TO authenticated USING (public.has_role('admin'))$p$;
    END IF;
    RAISE NOTICE 'secured: public.payments';
  END IF;

  -- job_requests: open briefs are public; only the client who posted one edits it.
  IF to_regclass('public.job_requests') IS NULL THEN
    RAISE NOTICE 'skip: public.job_requests does not exist';
  ELSE
    EXECUTE 'ALTER TABLE public.job_requests ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "job_requests_read_open"   ON public.job_requests';
    EXECUTE 'DROP POLICY IF EXISTS "job_requests_insert_own"  ON public.job_requests';
    EXECUTE 'DROP POLICY IF EXISTS "job_requests_update_own"  ON public.job_requests';
    EXECUTE 'DROP POLICY IF EXISTS "job_requests_delete_own"  ON public.job_requests';
    EXECUTE $p$CREATE POLICY "job_requests_read_open" ON public.job_requests
               FOR SELECT USING (status = 'open' OR client_id = auth.uid() OR public.is_staff())$p$;
    EXECUTE $p$CREATE POLICY "job_requests_insert_own" ON public.job_requests
               FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid())$p$;
    EXECUTE $p$CREATE POLICY "job_requests_update_own" ON public.job_requests
               FOR UPDATE TO authenticated USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid())$p$;
    EXECUTE $p$CREATE POLICY "job_requests_delete_own" ON public.job_requests
               FOR DELETE TO authenticated USING (client_id = auth.uid())$p$;
    RAISE NOTICE 'secured: public.job_requests';
  END IF;

  -- proposals: a pitch and its price belong to its author and the client who
  -- posted the brief — not to competing photographers.
  IF to_regclass('public.proposals') IS NULL THEN
    RAISE NOTICE 'skip: public.proposals does not exist';
  ELSE
    EXECUTE 'ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "proposals_read_involved"   ON public.proposals';
    EXECUTE 'DROP POLICY IF EXISTS "proposals_insert_own"      ON public.proposals';
    EXECUTE 'DROP POLICY IF EXISTS "proposals_update_involved" ON public.proposals';
    EXECUTE 'DROP POLICY IF EXISTS "proposals_delete_own"      ON public.proposals';
    IF to_regclass('public.job_requests') IS NOT NULL THEN
      EXECUTE $p$CREATE POLICY "proposals_read_involved" ON public.proposals
                 FOR SELECT TO authenticated USING (
                   photographer_id = auth.uid()
                   OR EXISTS (SELECT 1 FROM public.job_requests j
                              WHERE j.id = proposals.job_request_id AND j.client_id = auth.uid())
                 )$p$;
      EXECUTE $p$CREATE POLICY "proposals_update_involved" ON public.proposals
                 FOR UPDATE TO authenticated USING (
                   photographer_id = auth.uid()
                   OR EXISTS (SELECT 1 FROM public.job_requests j
                              WHERE j.id = proposals.job_request_id AND j.client_id = auth.uid())
                 )$p$;
    ELSE
      EXECUTE $p$CREATE POLICY "proposals_read_involved" ON public.proposals
                 FOR SELECT TO authenticated USING (photographer_id = auth.uid())$p$;
      EXECUTE $p$CREATE POLICY "proposals_update_involved" ON public.proposals
                 FOR UPDATE TO authenticated USING (photographer_id = auth.uid())$p$;
    END IF;
    EXECUTE $p$CREATE POLICY "proposals_insert_own" ON public.proposals
               FOR INSERT TO authenticated WITH CHECK (photographer_id = auth.uid())$p$;
    EXECUTE $p$CREATE POLICY "proposals_delete_own" ON public.proposals
               FOR DELETE TO authenticated USING (photographer_id = auth.uid())$p$;
    RAISE NOTICE 'secured: public.proposals';
  END IF;

  -- counter_offers: parties to the booking.
  IF to_regclass('public.counter_offers') IS NULL THEN
    RAISE NOTICE 'skip: public.counter_offers does not exist';
  ELSIF to_regclass('public.bookings') IS NULL THEN
    EXECUTE 'ALTER TABLE public.counter_offers ENABLE ROW LEVEL SECURITY';
    RAISE NOTICE 'partial: counter_offers RLS on, but bookings is missing so no read policy was added';
  ELSE
    EXECUTE 'ALTER TABLE public.counter_offers ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "counter_offers_involved"        ON public.counter_offers';
    EXECUTE 'DROP POLICY IF EXISTS "counter_offers_insert_involved" ON public.counter_offers';
    EXECUTE 'DROP POLICY IF EXISTS "counter_offers_update_involved" ON public.counter_offers';
    EXECUTE $p$CREATE POLICY "counter_offers_involved" ON public.counter_offers
               FOR SELECT TO authenticated USING (
                 EXISTS (SELECT 1 FROM public.bookings b
                         WHERE b.id = counter_offers.booking_id
                           AND (b.client_id = auth.uid() OR b.photographer_id = auth.uid()))
               )$p$;
    EXECUTE $p$CREATE POLICY "counter_offers_insert_involved" ON public.counter_offers
               FOR INSERT TO authenticated WITH CHECK (
                 actor_id = auth.uid()
                 AND EXISTS (SELECT 1 FROM public.bookings b
                             WHERE b.id = counter_offers.booking_id
                               AND (b.client_id = auth.uid() OR b.photographer_id = auth.uid()))
               )$p$;
    EXECUTE $p$CREATE POLICY "counter_offers_update_involved" ON public.counter_offers
               FOR UPDATE TO authenticated USING (
                 EXISTS (SELECT 1 FROM public.bookings b
                         WHERE b.id = counter_offers.booking_id
                           AND (b.client_id = auth.uid() OR b.photographer_id = auth.uid()))
               )$p$;
    RAISE NOTICE 'secured: public.counter_offers';
  END IF;

  -- thread_participants: you can see the membership of threads you are in.
  IF to_regclass('public.thread_participants') IS NULL THEN
    RAISE NOTICE 'skip: public.thread_participants does not exist';
  ELSE
    EXECUTE 'ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "thread_participants_read_own_threads" ON public.thread_participants';
    EXECUTE 'DROP POLICY IF EXISTS "thread_participants_insert_self"      ON public.thread_participants';
    EXECUTE $p$CREATE POLICY "thread_participants_read_own_threads" ON public.thread_participants
               FOR SELECT TO authenticated USING (
                 user_id = auth.uid()
                 OR EXISTS (SELECT 1 FROM public.thread_participants me
                            WHERE me.thread_id = thread_participants.thread_id
                              AND me.user_id = auth.uid())
               )$p$;
    EXECUTE $p$CREATE POLICY "thread_participants_insert_self" ON public.thread_participants
               FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())$p$;
    RAISE NOTICE 'secured: public.thread_participants';
  END IF;

  -- collections and their contents belong to their owner.
  IF to_regclass('public.collections') IS NULL THEN
    RAISE NOTICE 'skip: public.collections does not exist';
  ELSE
    EXECUTE 'ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "collections_owner" ON public.collections';
    EXECUTE $p$CREATE POLICY "collections_owner" ON public.collections
               FOR ALL TO authenticated
               USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())$p$;
    RAISE NOTICE 'secured: public.collections';

    IF to_regclass('public.portfolio_collections') IS NOT NULL THEN
      EXECUTE 'ALTER TABLE public.portfolio_collections ENABLE ROW LEVEL SECURITY';
      EXECUTE 'DROP POLICY IF EXISTS "portfolio_collections_owner" ON public.portfolio_collections';
      EXECUTE $p$CREATE POLICY "portfolio_collections_owner" ON public.portfolio_collections
                 FOR ALL TO authenticated
                 USING (EXISTS (SELECT 1 FROM public.collections c
                                WHERE c.id = portfolio_collections.collection_id AND c.owner_id = auth.uid()))
                 WITH CHECK (EXISTS (SELECT 1 FROM public.collections c
                                     WHERE c.id = portfolio_collections.collection_id AND c.owner_id = auth.uid()))$p$;
      RAISE NOTICE 'secured: public.portfolio_collections';
    END IF;
  END IF;

  -- categories: reference data. Readable by all, writable by nobody.
  IF to_regclass('public.categories') IS NULL THEN
    RAISE NOTICE 'skip: public.categories does not exist';
  ELSE
    EXECUTE 'ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.categories FROM anon, authenticated';
    EXECUTE 'DROP POLICY IF EXISTS "categories_read_all" ON public.categories';
    EXECUTE $p$CREATE POLICY "categories_read_all" ON public.categories FOR SELECT USING (true)$p$;
    RAISE NOTICE 'secured: public.categories';
  END IF;
END
$do$;


-- ---------------------------------------------------------------------------------
-- 3. PROFILES — stop users writing their own reputation and moderation state.
--    The old policy was FOR UPDATE USING (auth.uid() = id) with no column limits,
--    so a user could POST { verified: true, points: 999999, banned: false }.
--    A BEFORE trigger is used rather than column GRANTs so that `select *` and
--    partial updates from the client keep working.
-- ---------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
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

  IF (new_j ? 'id') THEN
    new_j := jsonb_set(new_j, ARRAY['id'], old_j -> 'id');
  END IF;

  NEW := jsonb_populate_record(NEW, new_j);
  RETURN NEW;
END;
$$;

DO $do$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE NOTICE 'skip: public.profiles does not exist — nothing else here will help you';
  ELSE
    EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_guard_profile_privileged_columns ON public.profiles';
    EXECUTE 'CREATE TRIGGER trg_guard_profile_privileged_columns
             BEFORE INSERT OR UPDATE ON public.profiles
             FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns()';

    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON public.profiles';
    EXECUTE $p$CREATE POLICY "Allow authenticated users to update their own profile" ON public.profiles
               FOR UPDATE TO authenticated
               USING (auth.uid() = id) WITH CHECK (auth.uid() = id)$p$;

    EXECUTE 'DROP POLICY IF EXISTS "Allow users to insert their own profile record" ON public.profiles';
    EXECUTE $p$CREATE POLICY "Allow users to insert their own profile record" ON public.profiles
               FOR INSERT TO authenticated WITH CHECK (auth.uid() = id)$p$;
    RAISE NOTICE 'secured: public.profiles (privileged columns are now server-owned)';
  END IF;
END
$do$;


-- ---------------------------------------------------------------------------------
-- 4. PROFILES PII — email and phone were readable by anyone with the anon key.
--    Column-level REVOKE keeps rows public while making contact details private.
-- ---------------------------------------------------------------------------------

DO $do$
DECLARE cols TEXT;
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE NOTICE 'skip: profiles PII (table missing)';
    RETURN;
  END IF;

  -- A column-level REVOKE is a no-op while the role still holds a table-wide
  -- SELECT grant: column privileges are additive to table privileges. So the
  -- table grant is removed and SELECT is granted back column by column, minus
  -- the contact fields.
  --
  -- NOTE: a column added to profiles later will NOT be readable by anon until
  -- this block is re-run. Re-run migration_v11 after any schema change here.
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles'
    AND column_name NOT IN ('email', 'phone');

  EXECUTE 'REVOKE SELECT ON public.profiles FROM anon, authenticated';
  EXECUTE format('GRANT SELECT (%s) ON public.profiles TO anon, authenticated', cols);

  RAISE NOTICE 'secured: profiles.email / .phone are no longer readable by anon or authenticated';
END
$do$;

-- Your own contact details stay reachable through a definer function.
CREATE OR REPLACE FUNCTION public.get_my_contact_details()
RETURNS TABLE (email TEXT, phone TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  RETURN QUERY
    SELECT (to_jsonb(p) ->> 'email')::TEXT, (to_jsonb(p) ->> 'phone')::TEXT
    FROM public.profiles p WHERE p.id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_contact_details() TO authenticated;

-- The public_profiles view must not be a way around the revoke.
DO $do$
DECLARE cols TEXT;
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE NOTICE 'skip: public_profiles view (profiles missing)';
    RETURN;
  END IF;

  -- Build the column list from what this database actually has, minus contact fields.
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles'
    AND column_name NOT IN ('email', 'phone');

  EXECUTE 'DROP VIEW IF EXISTS public.public_profiles';
  EXECUTE format('CREATE VIEW public.public_profiles AS SELECT %s FROM public.profiles', cols);

  IF current_setting('server_version_num')::INT >= 150000 THEN
    EXECUTE 'ALTER VIEW public.public_profiles SET (security_invoker = true)';
  END IF;

  EXECUTE 'GRANT SELECT ON public.public_profiles TO anon, authenticated';
  RAISE NOTICE 'rebuilt: public_profiles view without contact columns';
END
$do$;


-- ---------------------------------------------------------------------------------
-- 5. MISSING POLICIES — features that RLS was silently blocking.
--    RLS fails closed, which is right, but it hides gaps as inexplicable no-ops.
-- ---------------------------------------------------------------------------------

DO $do$
BEGIN
  -- Users could write comments but never edit or delete them.
  IF to_regclass('public.comments') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "comments_update_own"        ON public.comments';
    EXECUTE 'DROP POLICY IF EXISTS "comments_delete_own_or_staff" ON public.comments';
    EXECUTE $p$CREATE POLICY "comments_update_own" ON public.comments
               FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())$p$;
    EXECUTE $p$CREATE POLICY "comments_delete_own_or_staff" ON public.comments
               FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_staff())$p$;
    RAISE NOTICE 'policies added: comments (edit / delete your own)';
  ELSE RAISE NOTICE 'skip: public.comments does not exist';
  END IF;

  IF to_regclass('public.messages') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "messages_update_own" ON public.messages';
    EXECUTE 'DROP POLICY IF EXISTS "messages_delete_own" ON public.messages';
    EXECUTE $p$CREATE POLICY "messages_update_own" ON public.messages
               FOR UPDATE TO authenticated USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid())$p$;
    EXECUTE $p$CREATE POLICY "messages_delete_own" ON public.messages
               FOR DELETE TO authenticated USING (sender_id = auth.uid())$p$;
    RAISE NOTICE 'policies added: messages';
  ELSE RAISE NOTICE 'skip: public.messages does not exist';
  END IF;

  -- settings had SELECT and UPDATE but no INSERT, so a new account could never
  -- create its own settings row.
  IF to_regclass('public.settings') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "settings_insert_own" ON public.settings';
    EXECUTE $p$CREATE POLICY "settings_insert_own" ON public.settings
               FOR INSERT TO authenticated WITH CHECK (auth.uid() = id)$p$;
    RAISE NOTICE 'policy added: settings insert';
  ELSE RAISE NOTICE 'skip: public.settings does not exist';
  END IF;

  IF to_regclass('public.message_threads') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "message_threads_insert_authenticated" ON public.message_threads';
    EXECUTE $p$CREATE POLICY "message_threads_insert_authenticated" ON public.message_threads
               FOR INSERT TO authenticated WITH CHECK (true)$p$;
    RAISE NOTICE 'policy added: message_threads insert';
  ELSE RAISE NOTICE 'skip: public.message_threads does not exist';
  END IF;

  -- Photo owners could insert and delete but not edit a caption.
  IF to_regclass('public.photos') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "photos_update_own" ON public.photos';
    EXECUTE $p$CREATE POLICY "photos_update_own" ON public.photos
               FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id)$p$;
    RAISE NOTICE 'policy added: photos update';
  ELSE RAISE NOTICE 'skip: public.photos does not exist';
  END IF;

  IF to_regclass('public.reviews') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "reviews_update_own"         ON public.reviews';
    EXECUTE 'DROP POLICY IF EXISTS "reviews_delete_own_or_staff" ON public.reviews';
    EXECUTE $p$CREATE POLICY "reviews_update_own" ON public.reviews
               FOR UPDATE TO authenticated USING (reviewer_id = auth.uid()) WITH CHECK (reviewer_id = auth.uid())$p$;
    EXECUTE $p$CREATE POLICY "reviews_delete_own_or_staff" ON public.reviews
               FOR DELETE TO authenticated USING (reviewer_id = auth.uid() OR public.is_staff())$p$;
    RAISE NOTICE 'policies added: reviews';
  ELSE RAISE NOTICE 'skip: public.reviews does not exist';
  END IF;

  -- Challenges and competitions are platform-run: read-only for everyone else.
  IF to_regclass('public.challenges') IS NOT NULL THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.challenges FROM anon, authenticated';
    EXECUTE 'DROP POLICY IF EXISTS "challenges_manage_staff" ON public.challenges';
    EXECUTE $p$CREATE POLICY "challenges_manage_staff" ON public.challenges
               FOR ALL TO authenticated
               USING (public.user_has_permission('manage_challenges'))
               WITH CHECK (public.user_has_permission('manage_challenges'))$p$;
    RAISE NOTICE 'secured: challenges';
  END IF;

  IF to_regclass('public.competitions') IS NOT NULL THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.competitions FROM anon, authenticated';
    RAISE NOTICE 'secured: competitions';
  END IF;

  -- photo_battles are written only by the definer RPCs.
  IF to_regclass('public.photo_battles') IS NOT NULL THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.photo_battles FROM anon, authenticated';
  END IF;
  IF to_regclass('public.photo_battle_votes') IS NOT NULL THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON public.photo_battle_votes FROM anon, authenticated';
  END IF;
END
$do$;

-- portfolio_items.votes is an Elo score the client was writing directly.
CREATE OR REPLACE FUNCTION public.guard_portfolio_item_votes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

DO $do$
BEGIN
  IF to_regclass('public.portfolio_items') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_guard_portfolio_item_votes ON public.portfolio_items';
    EXECUTE 'CREATE TRIGGER trg_guard_portfolio_item_votes
             BEFORE UPDATE ON public.portfolio_items
             FOR EACH ROW EXECUTE FUNCTION public.guard_portfolio_item_votes()';
    RAISE NOTICE 'secured: portfolio_items.votes';
  ELSE RAISE NOTICE 'skip: public.portfolio_items does not exist';
  END IF;
END
$do$;


-- ---------------------------------------------------------------------------------
-- 6. AUDIT LOG INTEGRITY — append only. An audit trail its subject can edit is
--    worse than none, because it looks like evidence.
-- ---------------------------------------------------------------------------------

DO $do$
BEGIN
  IF to_regclass('public.audit_logs') IS NULL THEN
    RAISE NOTICE 'skip: public.audit_logs does not exist';
  ELSE
    EXECUTE 'ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE UPDATE, DELETE ON public.audit_logs FROM anon, authenticated';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs';
    EXECUTE $p$CREATE POLICY "Users can insert audit logs" ON public.audit_logs
               FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id)$p$;
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs';
    EXECUTE $p$CREATE POLICY "Admins can view audit logs" ON public.audit_logs
               FOR SELECT TO authenticated USING (public.has_role('admin'))$p$;
    RAISE NOTICE 'secured: audit_logs (append only)';
  END IF;
END
$do$;


-- ---------------------------------------------------------------------------------
-- 7. MODERATION RPCs
--    The admin console previously wrote to profiles / reports / disputes straight
--    from the browser and gated itself on a hardcoded email string.
--    plpgsql bodies are not validated until they run, so these create cleanly even
--    if a table is missing; they raise a clear error at call time instead.
-- ---------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_set_user_verified(p_user_id UUID, p_verified BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.user_has_permission('verify_user') THEN
    RAISE EXCEPTION 'Unauthorized: missing verify_user permission';
  END IF;
  UPDATE public.profiles SET verified = p_verified WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_banned(p_user_id UUID, p_banned BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.user_has_permission('ban_user') THEN
    RAISE EXCEPTION 'Unauthorized: missing ban_user permission';
  END IF;
  UPDATE public.profiles SET banned = p_banned WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resolve_report(p_report_id UUID, p_status TEXT, p_notes TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.user_has_permission('moderate_content') THEN
    RAISE EXCEPTION 'Unauthorized: missing moderate_content permission';
  END IF;
  IF p_status NOT IN ('pending', 'investigating', 'resolved', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid report status: %', p_status;
  END IF;
  UPDATE public.reports
     SET status = p_status, resolution_notes = COALESCE(p_notes, resolution_notes)
   WHERE id = p_report_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(p_dispute_id UUID, p_resolution TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.user_has_permission('manage_bookings') THEN
    RAISE EXCEPTION 'Unauthorized: missing manage_bookings permission';
  END IF;
  UPDATE public.disputes SET status = 'resolved', resolution = p_resolution WHERE id = p_dispute_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_console_access()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
-- 8. STORAGE — public buckets accepted any file of any size.
--    An HTML or SVG file in a public bucket is served back as markup.
-- ---------------------------------------------------------------------------------

UPDATE storage.buckets
   SET file_size_limit = 5242880,
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/avif']
 WHERE id = 'avatars';

UPDATE storage.buckets
   SET file_size_limit = 52428800,
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/avif','image/heic',
                                  'video/mp4','video/webm','video/quicktime']
 WHERE id = 'post-media';

UPDATE storage.buckets
   SET file_size_limit = 104857600,
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/avif',
                                  'image/tiff','image/x-adobe-dng','application/octet-stream']
 WHERE id = 'post-originals';

DROP POLICY IF EXISTS "post_originals_owner_update" ON storage.objects;
CREATE POLICY "post_originals_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'post-originals' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "post_originals_owner_delete" ON storage.objects;
CREATE POLICY "post_originals_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'post-originals' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ---------------------------------------------------------------------------------
-- 9. SEARCH_PATH ON EVERY SECURITY DEFINER FUNCTION
--    A definer function with a mutable search_path can be hijacked by an object
--    planted in a schema earlier on the caller's path.
-- ---------------------------------------------------------------------------------

DO $do$
DECLARE r RECORD; n INT := 0;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.prosecdef
       AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig,'{}'::TEXT[])) c
                        WHERE c LIKE 'search\_path=%')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'pinned search_path on % function(s)', n;
END
$do$;

DO $do$
BEGIN
  IF to_regproc('public.queue_portfolio_item_for_battle') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.queue_portfolio_item_for_battle(UUID) FROM PUBLIC, anon';
    EXECUTE 'GRANT  EXECUTE ON FUNCTION public.queue_portfolio_item_for_battle(UUID) TO authenticated';
  END IF;
  IF to_regproc('public.cast_photo_battle_vote') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.cast_photo_battle_vote(UUID, UUID) FROM PUBLIC, anon';
    EXECUTE 'GRANT  EXECUTE ON FUNCTION public.cast_photo_battle_vote(UUID, UUID) TO authenticated';
  END IF;
END
$do$;


-- ---------------------------------------------------------------------------------
-- 10. VERIFICATION — run these after applying.
-- ---------------------------------------------------------------------------------
-- Any public table still without RLS (expect zero rows):
--   SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--    WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity;
--
-- Definer functions still missing a pinned search_path (expect zero rows):
--   SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public' AND p.prosecdef
--      AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig,'{}')) c WHERE c LIKE 'search\_path=%');
--
-- Confirm email is no longer anon-readable (expect false):
--   SELECT has_column_privilege('anon','public.profiles','email','SELECT');
