-- =================================================================================
-- MIGRATION v26 — THE LAST TWO TABLES RLS HAD LOCKED AGAINST THE APP
--
-- audit_rls_without_policies(), added in v25, found exactly two survivors:
--
--   connections   RLS enabled, no policy
--   saved_items   RLS enabled, no policy
--
-- Same fault as albums and portfolio_items, same silent symptom: saving a
-- photograph appeared to work and the Saved page stayed empty forever, because
-- the insert was refused and the read returned nothing. The client code for both
-- is correct and always has been.
--
-- COLUMNS VERIFIED AGAINST THE LIVE DATABASE, not against a migration file:
--   saved_items  id, user_id, photo_id, collection_name, created_at,
--                target_type, target_id
--   connections  id, user_a_id, user_b_id, status, requested_by, created_at
--
-- v25 failed its first run because I took a column name from migration_v3's
-- policy text instead of asking the database. That is the whole reason
-- CHECK_v26_targets.sql exists and was run before a line of this was written.
-- =================================================================================

BEGIN;

-- ---------------------------------------------------------------------------------
-- 1. SAVED ITEMS
--
--    Strictly private. A saved list is a person's own shortlist of work they are
--    considering - a client deciding who to hire, a photographer keeping
--    references. Nobody else has any business reading it, so there is one rule
--    for all four commands: it is yours or it does not exist to you.
--
--    The table carries both an older photo_id and the polymorphic
--    target_type/target_id pair the app writes today. Ownership is user_id
--    either way, so these policies hold for both shapes.
-- ---------------------------------------------------------------------------------
DROP POLICY IF EXISTS saved_items_own ON public.saved_items;
CREATE POLICY saved_items_own ON public.saved_items
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

REVOKE ALL ON public.saved_items FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_items TO authenticated;

-- ---------------------------------------------------------------------------------
-- 2. CONNECTIONS
--
--    Two-sided by nature: user_a_id and user_b_id are both participants, and
--    requested_by records who asked. So both sides may read it, either side may
--    leave, but only the person who sent a request may create one - and they
--    cannot forge one they are not part of.
-- ---------------------------------------------------------------------------------
DROP POLICY IF EXISTS connections_participant_read   ON public.connections;
DROP POLICY IF EXISTS connections_request            ON public.connections;
DROP POLICY IF EXISTS connections_participant_update ON public.connections;
DROP POLICY IF EXISTS connections_participant_delete ON public.connections;

CREATE POLICY connections_participant_read ON public.connections
  FOR SELECT TO authenticated
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- The requester must be one of the two people in the row. Without this a
-- signed-in user could manufacture a connection between two strangers.
CREATE POLICY connections_request ON public.connections
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND (user_a_id = auth.uid() OR user_b_id = auth.uid())
  );

-- Accepting or declining is an UPDATE by the OTHER side. Both participants may
-- update, which also lets the requester withdraw.
CREATE POLICY connections_participant_update ON public.connections
  FOR UPDATE TO authenticated
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid())
  WITH CHECK (user_a_id = auth.uid() OR user_b_id = auth.uid());

CREATE POLICY connections_participant_delete ON public.connections
  FOR DELETE TO authenticated
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

REVOKE ALL ON public.connections FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connections TO authenticated;

COMMIT;

-- ---------------------------------------------------------------------------------
-- 3. THE AUDIT SHOULD NOW BE EMPTY
-- ---------------------------------------------------------------------------------
DO $do$
DECLARE v_n INTEGER; v_names TEXT;
BEGIN
  SELECT COUNT(*), string_agg(table_name, ', ')
    INTO v_n, v_names FROM public.audit_rls_without_policies();
  IF v_n = 0 THEN
    RAISE NOTICE 'RLS audit clean: no table in public is locked against its own application';
  ELSE
    RAISE WARNING 'STILL LOCKED (% table(s)): %', v_n, v_names;
  END IF;
END
$do$;
