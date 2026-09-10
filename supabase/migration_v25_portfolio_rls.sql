-- =================================================================================
-- MIGRATION v25 — GIVE albums AND portfolio_items THE POLICIES THEY NEVER HAD
--
-- THE BUG
-- Nobody has ever published a photograph on LensLeague. portfolio_items has zero
-- rows, all time, and so does albums. Not "few" - zero, since the schema was
-- created.
--
-- Both tables have had RLS ENABLED since migration v3 with ZERO policies on
-- them. Postgres denies a command that has no policy permitting it, so every
-- insert was refused and every read returned nothing. The upload form worked,
-- storage worked, the file was uploaded and got a public URL - and then the row
-- that makes it a photograph was silently dropped.
--
-- HOW IT SURVIVED THIS LONG
--   1. v3 enabled RLS at line 335 and wrote the policies at line 353. The ALTER
--      statements clearly ran; the CREATE POLICY block clearly did not. Evidence:
--      profiles carries an INSERT policy in production that v3 never wrote, so
--      the policies live there came from v11, not v3.
--   2. v11 hardened this schema table by table and touched portfolio_items - but
--      only its triggers. It never checked whether the table had a policy.
--      albums is not mentioned in ANY migration after v10.
--   3. uploadPhoto() caught the refusal, logged console.warn, and returned the
--      photograph object anyway - so the app showed a success screen and
--      redirected to a feed the photograph was not in. Fixed separately.
--   4. Explore and the landing page read `posts`, which HAS policies and HAS
--      rows. So the product always had something on screen, and the dead path
--      was the one nobody could see was dead.
--   5. migration_v14's own header recorded "0 portfolio_items" as an
--      observation about a new platform. The evidence was written down eleven
--      migrations ago and read as youth rather than breakage.
--
-- The lesson worth keeping: RLS enabled with no policy is not "secure by
-- default", it is a table that silently rejects its own application. Section 5
-- adds a standing check so this can never hide again.
-- =================================================================================

BEGIN;

-- ---------------------------------------------------------------------------------
-- 1. VISIBILITY HELPERS
--
--    SECURITY DEFINER on purpose. A policy on portfolio_items has to ask about
--    the album it belongs to; asking directly would evaluate albums' own RLS
--    inside portfolio_items' policy, which is the recursion that migration v21
--    had to untangle for message threads. A definer function answers the
--    question once, outside RLS, and cannot cycle.
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.album_is_visible(p_album_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.albums a
     WHERE a.id = p_album_id
       AND (
         a.privacy_level IN ('public', 'unlisted')
         OR a.photographer_id = auth.uid()
         OR a.client_id = auth.uid()
       )
  );
$$;

COMMENT ON FUNCTION public.album_is_visible(UUID) IS
  'True when the caller may see this album. Used by portfolio_items policies so '
  'they never evaluate albums RLS from inside their own - see migration v21.';

CREATE OR REPLACE FUNCTION public.album_is_mine(p_album_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.albums a
     WHERE a.id = p_album_id AND a.photographer_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.album_is_mine(UUID) IS
  'True when the caller owns this album. Stops a photograph being inserted into '
  'somebody else''s portfolio.';

CREATE OR REPLACE FUNCTION public.viewer_is_banned()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
  SELECT COALESCE(
    (SELECT p.banned FROM public.profiles p WHERE p.id = auth.uid()),
    FALSE
  );
$$;

COMMENT ON FUNCTION public.viewer_is_banned() IS
  'Definer so a write policy can check it without reading profiles under RLS.';

GRANT EXECUTE ON FUNCTION public.album_is_visible(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.album_is_mine(UUID)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.viewer_is_banned()     TO authenticated;

-- ---------------------------------------------------------------------------------
-- 2. ALBUMS
--
--    An album is the container uploadPhoto() looks for and creates on demand.
--    With no INSERT policy that creation was refused, which is where the whole
--    upload died - before portfolio_items was even reached.
-- ---------------------------------------------------------------------------------
DROP POLICY IF EXISTS albums_select        ON public.albums;
DROP POLICY IF EXISTS albums_insert_own    ON public.albums;
DROP POLICY IF EXISTS albums_update_own    ON public.albums;
DROP POLICY IF EXISTS albums_delete_own    ON public.albums;
-- v3's names too, in case a partial run left one behind.
DROP POLICY IF EXISTS "Albums viewable by everyone if public" ON public.albums;
DROP POLICY IF EXISTS "Private albums viewable by client"     ON public.albums;
DROP POLICY IF EXISTS "Users can manage own albums"           ON public.albums;

-- One SELECT policy rather than v3's two. Multiple permissive policies on the
-- same command are OR-ed, which works, but it means two expressions to keep in
-- step; the owner case was missing from both of v3's, so a photographer could
-- not see their own private album.
CREATE POLICY albums_select ON public.albums
  FOR SELECT TO anon, authenticated
  USING (
    privacy_level IN ('public', 'unlisted')
    OR photographer_id = auth.uid()
    OR client_id = auth.uid()
  );

CREATE POLICY albums_insert_own ON public.albums
  FOR INSERT TO authenticated
  WITH CHECK (photographer_id = auth.uid() AND NOT public.viewer_is_banned());

CREATE POLICY albums_update_own ON public.albums
  FOR UPDATE TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY albums_delete_own ON public.albums
  FOR DELETE TO authenticated
  USING (photographer_id = auth.uid());

-- ---------------------------------------------------------------------------------
-- 3. PORTFOLIO ITEMS
--
--    The canonical gallery. The feed, profiles, search, likes, comments, saved
--    items and the battle queue all read this table.
-- ---------------------------------------------------------------------------------
DROP POLICY IF EXISTS portfolio_items_select     ON public.portfolio_items;
DROP POLICY IF EXISTS portfolio_items_insert_own ON public.portfolio_items;
DROP POLICY IF EXISTS portfolio_items_update_own ON public.portfolio_items;
DROP POLICY IF EXISTS portfolio_items_delete_own ON public.portfolio_items;
DROP POLICY IF EXISTS "Portfolio items viewable by album privacy" ON public.portfolio_items;
DROP POLICY IF EXISTS "Users can manage own portfolio items"      ON public.portfolio_items;

CREATE POLICY portfolio_items_select ON public.portfolio_items
  FOR SELECT TO anon, authenticated
  USING (
    -- Own work is always visible to its author, even mid-upload or in a private
    -- album, so a photographer is never shown an empty portfolio of their own.
    photographer_id = auth.uid()
    OR public.album_is_visible(album_id)
  );

CREATE POLICY portfolio_items_insert_own ON public.portfolio_items
  FOR INSERT TO authenticated
  WITH CHECK (
    photographer_id = auth.uid()
    AND public.album_is_mine(album_id)
    AND NOT public.viewer_is_banned()
  );

-- UPDATE is scoped to the owner, and v11's trg_guard_portfolio_item_votes plus
-- v14's trg_guard_item_counters still stop them writing their own Elo score,
-- like_count or comment_count. Those triggers were the only protection this
-- table had, and they were guarding a door in a wall with no door.
CREATE POLICY portfolio_items_update_own ON public.portfolio_items
  FOR UPDATE TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY portfolio_items_delete_own ON public.portfolio_items
  FOR DELETE TO authenticated
  USING (photographer_id = auth.uid());

-- ---------------------------------------------------------------------------------
-- 4. GRANTS
--
--    Policies decide WHICH rows; grants decide whether the role may attempt the
--    command at all. Both tables already carry broad grants to authenticated,
--    which is why this was invisible in the Supabase table editor - the
--    permission looked present and the policy was the thing missing.
--
--    TRUNCATE is not governed by RLS, so it is revoked explicitly, the same
--    correction migration v20 made for notifications.
-- ---------------------------------------------------------------------------------
REVOKE TRUNCATE ON public.albums          FROM anon, authenticated;
REVOKE TRUNCATE ON public.portfolio_items FROM anon, authenticated;
REVOKE ALL       ON public.albums          FROM anon;
REVOKE ALL       ON public.portfolio_items FROM anon;
GRANT  SELECT    ON public.albums          TO anon, authenticated;
GRANT  SELECT    ON public.portfolio_items TO anon, authenticated;
GRANT  INSERT, UPDATE, DELETE ON public.albums          TO authenticated;
GRANT  INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;

COMMIT;

-- ---------------------------------------------------------------------------------
-- 5. A STANDING CHECK, SO THIS CANNOT HIDE AGAIN
--
--    Any table in public with RLS enabled and no policy is not locked down, it
--    is broken: it rejects the application that owns it. This raises a NOTICE
--    naming every such table. Run it after any migration that enables RLS.
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_rls_without_policies()
RETURNS TABLE (table_name TEXT, verdict TEXT)
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT c.relname::TEXT,
         'RLS enabled with no policy - denies every client read and write'::TEXT
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND c.relrowsecurity
     AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
   ORDER BY c.relname;
$$;

COMMENT ON FUNCTION public.audit_rls_without_policies() IS
  'Lists tables that RLS has locked against their own application. This state '
  'cost LensLeague every upload it ever received; the check is cheap, run it.';

DO $do$
DECLARE v_n INTEGER; v_names TEXT;
BEGIN
  SELECT COUNT(*), string_agg(table_name, ', ')
    INTO v_n, v_names FROM public.audit_rls_without_policies();
  IF v_n = 0 THEN
    RAISE NOTICE 'RLS audit clean: every table with RLS has at least one policy';
  ELSE
    RAISE WARNING 'RLS enabled with NO policies on % table(s): %', v_n, v_names;
  END IF;
END
$do$;
