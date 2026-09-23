-- =================================================================================
-- migration v34 — the admin console reads the database, and removal removes
--
-- FOUR THINGS ARE WRONG TODAY, ALL PROVEN BEFORE BEING FIXED
--
-- 1. NOBODY CAN SEE A REPORT. `reports` is written correctly by the client and
--    read by nothing. In AppContext the queue is `useState([])`, and the only
--    calls to setReports are local mutations, so the moderation tab shows
--    reports filed in the current browser tab and nothing else. A report filed
--    yesterday, by anyone, on any device, is invisible forever.
--
--    The RPC to read them - admin_get_reports - has existed since v7. It was
--    never called. This migration replaces it with one that returns enough to
--    render a report of any target type, and the client starts calling it.
--
-- 2. "REMOVE PHOTO" DOES NOT REMOVE A PHOTO. The button calls
--    admin_resolve_report(status => 'resolved'), which writes a status on the
--    report row. The photograph stays in the feed. A moderator clicks Remove,
--    the queue clears, and the reported content is still public. This is the
--    worst kind of false completion: the screen says the job is done.
--
--    Fixed with a real moderation state on portfolio_items, enforced in RLS so
--    every read path is covered - including ones written later that nobody
--    remembers to filter.
--
-- 3. THE disputes TABLE IS WORLD-WRITABLE. schema.sql created
--    "Allow admin operations on disputes" ON public.disputes FOR ALL USING (true)
--    with the comment "Full policy validation done at application level". No
--    later migration drops it. FOR ALL USING (true) granted to the `public` role
--    includes anon, so anyone holding the anon key - which ships in the browser
--    bundle by design - can read, edit and delete every dispute. The identical
--    policy on `reports` died when v7 dropped and recreated that table. This one
--    survived because nothing recreated disputes.
--
-- 4. SECURITY DEFINER FUNCTIONS WITH NO PINNED search_path. docs/SECURITY.md
--    states that every one of them pins `search_path = public, pg_temp`. The
--    v4-v7 series does not: user_has_permission, admin_get_reports,
--    log_admin_report_action, the v5 booking triggers and the v6 messaging
--    triggers all run with whatever search_path the caller brings. A function
--    that runs as its owner and resolves table names through a caller-controlled
--    path is the textbook privilege-escalation shape.
--
--    Fixed by a sweep rather than a list: every SECURITY DEFINER function in
--    public that has no search_path setting gets one. ALTER FUNCTION ... SET
--    changes the setting and not the body, so this cannot break a function by
--    rewriting it from a stale copy on disk - which matters, because the files
--    in this folder are not proof of what is live.
--
-- WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
--   * It does not delete a reported photograph. Removal is a reversible state
--     change with an author, a timestamp and a reason, so a mistaken removal can
--     be undone and an argument about one can be settled by evidence.
--   * It does not touch bans. Removing content and removing a person are
--     different decisions and stay different buttons.
--
-- Run once, in the Supabase SQL editor. Then VERIFY_v34.sql.
-- =================================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- STEP 1. Close the open policy on disputes.
--
-- Nothing in the client has ever written to this table; the admin console
-- resolves a dispute through admin_resolve_dispute, which is SECURITY DEFINER
-- and checks its caller. So the grant is revoked outright rather than left in
-- place behind a policy - a later innocent GRANT cannot then reopen it.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow admin operations on disputes" ON public.disputes;
DROP POLICY IF EXISTS disputes_staff_read ON public.disputes;

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.disputes FROM anon, authenticated;
REVOKE SELECT                 ON public.disputes FROM anon;

-- Staff read it through the RPC below, which is SECURITY DEFINER, so this
-- policy exists to make a direct select safe rather than to enable one.
CREATE POLICY disputes_staff_read ON public.disputes
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- ---------------------------------------------------------------------------
-- STEP 2. Pin search_path on every SECURITY DEFINER function that lacks one.
--
-- A sweep, not a list, so functions this migration has never heard of are
-- covered too. proconfig is NULL when a function carries no SET clauses.
-- ---------------------------------------------------------------------------
DO $pin$
DECLARE
  f       RECORD;
  v_fixed INT := 0;
BEGIN
  FOR f IN
    SELECT p.oid::REGPROCEDURE AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND NOT EXISTS (
        SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::TEXT[])) AS c(setting)
        WHERE c.setting LIKE 'search\_path=%'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f.sig);
    v_fixed := v_fixed + 1;
  END LOOP;

  RAISE NOTICE 'v34: pinned search_path on % SECURITY DEFINER function(s)', v_fixed;
END
$pin$;

-- ---------------------------------------------------------------------------
-- STEP 3. A real moderation state for a photograph.
--
-- Not a delete. A removal carries who did it, when, and why, so it can be
-- reversed and defended. `visible` is the default, so every existing row and
-- every future upload is unaffected.
-- ---------------------------------------------------------------------------
ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS moderated_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

DO $ck$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'portfolio_items_moderation_status_check'
      AND conrelid = 'public.portfolio_items'::REGCLASS
  ) THEN
    ALTER TABLE public.portfolio_items
      ADD CONSTRAINT portfolio_items_moderation_status_check
      CHECK (moderation_status IN ('visible', 'removed'));
  END IF;
END
$ck$;

-- Every public read filters on this column, so it is worth an index that only
-- carries the rows those reads actually want.
CREATE INDEX IF NOT EXISTS idx_portfolio_items_visible
  ON public.portfolio_items (created_at DESC)
  WHERE moderation_status = 'visible';

-- ---------------------------------------------------------------------------
-- STEP 4. Enforce removal in RLS, not in each query.
--
-- Filtering in the client would mean every current read path remembering to,
-- and every future one too. One policy covers all of them. The author still
-- sees their own removed work - being told it was removed is the point, and
-- hiding it from them just produces a support ticket.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS portfolio_items_select ON public.portfolio_items;

CREATE POLICY portfolio_items_select ON public.portfolio_items
  FOR SELECT TO anon, authenticated
  USING (
    (
      photographer_id = auth.uid()
      OR public.album_is_visible(album_id)
    )
    AND (
      moderation_status = 'visible'
      OR photographer_id = auth.uid()
      OR public.is_staff()
    )
  );

-- ---------------------------------------------------------------------------
-- STEP 5. Removed work cannot enter a battle.
--
-- A trigger rather than an edit to queue_portfolio_item_for_battle, because it
-- covers every path into photo_battles - including the brief entry flow that
-- does not exist yet and whoever writes it not remembering this rule.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_removed_photo_in_battle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.portfolio_items pi
    WHERE pi.id IN (NEW.photo_a_id, NEW.photo_b_id)
      AND pi.moderation_status <> 'visible'
  ) THEN
    RAISE EXCEPTION 'That photograph has been removed by moderation and cannot compete';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_reject_removed_photo_in_battle ON public.photo_battles;
CREATE TRIGGER trg_reject_removed_photo_in_battle
BEFORE INSERT OR UPDATE OF photo_a_id, photo_b_id ON public.photo_battles
FOR EACH ROW EXECUTE FUNCTION public.reject_removed_photo_in_battle();

-- ---------------------------------------------------------------------------
-- STEP 6. Search must not return removed work.
--
-- search_posts is SECURITY DEFINER, so it runs as its owner and RLS does not
-- apply to it. The policy in step 4 does not cover this function; only this
-- does. Body otherwise unchanged from what is live.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_posts(query TEXT, p_limit INT DEFAULT 20)
RETURNS TABLE (
  id UUID, url TEXT, caption TEXT, owner_id UUID,
  owner_name TEXT, owner_avatar TEXT, category TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.media_url        AS url,
    i.caption,
    i.photographer_id  AS owner_id,
    pr.name            AS owner_name,
    pr.avatar_url      AS owner_avatar,
    i.categories[1]    AS category
  FROM public.portfolio_items i
  JOIN public.albums   a  ON i.album_id = a.id
  JOIN public.profiles pr ON i.photographer_id = pr.id
  WHERE a.privacy_level = 'public'
    AND pr.banned = false
    AND i.moderation_status = 'visible'
    AND (
      i.caption ILIKE '%' || query || '%'
      OR query = ANY(i.categories)
      OR query = ANY(i.tags)
    )
  ORDER BY i.created_at DESC
  LIMIT p_limit;
END;
$fn$;

-- ---------------------------------------------------------------------------
-- STEP 7. A report the console can actually render.
--
-- The old signature returned target_type and target_id and left the client to
-- work out what was reported - which it could not do, because RLS hides another
-- person's private work from the moderator's own session. Resolving the target
-- here, inside a function that has already checked the caller, is the only
-- place it can be done correctly.
--
-- Output columns change, so the old function is dropped rather than replaced.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_get_reports(TEXT, INT);

CREATE FUNCTION public.admin_get_reports(p_status TEXT DEFAULT NULL, p_limit INT DEFAULT 50)
RETURNS TABLE (
  id                UUID,
  reporter_id       UUID,
  reporter_name     TEXT,
  target_type       TEXT,
  target_id         UUID,
  target_label      TEXT,
  target_preview    TEXT,
  target_owner_id   UUID,
  target_owner_name TEXT,
  target_removed    BOOLEAN,
  reason            TEXT,
  status            TEXT,
  resolution_notes  TEXT,
  created_at        TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF NOT public.user_has_permission('moderate_content') THEN
    RAISE EXCEPTION 'Unauthorized: missing moderate_content permission';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.reporter_id,
    COALESCE(rp.name, 'Deleted user')::TEXT AS reporter_name,
    r.target_type::TEXT,
    r.target_id,
    CASE r.target_type
      WHEN 'portfolio_item' THEN COALESCE(NULLIF(btrim(pi.caption), ''), 'Untitled photograph')
      WHEN 'profile'        THEN COALESCE(tp.name, 'Deleted profile')
      ELSE initcap(replace(r.target_type, '_', ' '))
    END::TEXT AS target_label,
    CASE r.target_type
      WHEN 'portfolio_item' THEN pi.media_url
      WHEN 'profile'        THEN tp.avatar_url
      ELSE NULL
    END::TEXT AS target_preview,
    CASE r.target_type
      WHEN 'portfolio_item' THEN pi.photographer_id
      WHEN 'profile'        THEN tp.id
      ELSE NULL
    END AS target_owner_id,
    CASE r.target_type
      WHEN 'portfolio_item' THEN COALESCE(po.name, 'Deleted user')
      WHEN 'profile'        THEN COALESCE(tp.name, 'Deleted profile')
      ELSE NULL
    END::TEXT AS target_owner_name,
    (r.target_type = 'portfolio_item' AND pi.moderation_status = 'removed') AS target_removed,
    r.reason,
    r.status::TEXT,
    r.resolution_notes,
    r.created_at
  FROM public.reports r
  LEFT JOIN public.profiles        rp ON rp.id = r.reporter_id
  LEFT JOIN public.portfolio_items pi ON r.target_type = 'portfolio_item' AND pi.id = r.target_id
  LEFT JOIN public.profiles        po ON po.id = pi.photographer_id
  LEFT JOIN public.profiles        tp ON r.target_type = 'profile' AND tp.id = r.target_id
  WHERE (p_status IS NULL OR r.status = p_status)
  ORDER BY
    CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END,
    r.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
END;
$fn$;

-- ---------------------------------------------------------------------------
-- STEP 8. Removal that removes.
--
-- Takes the report, hides the content, records who and why, discards any battle
-- the photograph is still in - nobody should win or lose against work that has
-- been taken down - and resolves the report. One transaction, so a moderator
-- cannot end up with a cleared queue and live content.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_remove_content(p_report_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS TABLE (removed_item_id UUID, battles_voided INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_target_type TEXT;
  v_target_id   UUID;
  v_actor       UUID := auth.uid();
  v_voided      INT  := 0;
BEGIN
  IF NOT public.user_has_permission('moderate_content') THEN
    RAISE EXCEPTION 'Unauthorized: missing moderate_content permission';
  END IF;

  SELECT r.target_type, r.target_id
    INTO v_target_type, v_target_id
  FROM public.reports r
  WHERE r.id = p_report_id;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Report not found';
  END IF;

  IF v_target_type <> 'portfolio_item' THEN
    RAISE EXCEPTION
      'Only a photograph can be removed here. To act on a % report, use the ban or verify controls.',
      v_target_type;
  END IF;

  UPDATE public.portfolio_items pi
     SET moderation_status = 'removed',
         moderated_at      = NOW(),
         moderated_by      = v_actor,
         moderation_reason = COALESCE(NULLIF(btrim(p_notes), ''), 'Removed by moderation')
   WHERE pi.id = v_target_id
     AND pi.moderation_status <> 'removed';

  DELETE FROM public.photo_battles b
   WHERE b.status IN ('queued', 'active')
     AND (b.photo_a_id = v_target_id OR b.photo_b_id = v_target_id);
  GET DIAGNOSTICS v_voided = ROW_COUNT;

  UPDATE public.reports r
     SET status           = 'resolved',
         resolution_notes = COALESCE(NULLIF(btrim(p_notes), ''), 'Content removed by moderation')
   WHERE r.id = p_report_id;

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (v_actor, 'CONTENT_REMOVED', v_target_type, v_target_id,
          jsonb_build_object('report_id', p_report_id, 'battles_voided', v_voided));

  RETURN QUERY SELECT v_target_id, v_voided;
END;
$fn$;

-- The other half of reversible: a removal that was wrong can be undone, and the
-- undo is logged the same way the removal was.
CREATE OR REPLACE FUNCTION public.admin_restore_content(p_item_id UUID, p_notes TEXT DEFAULT NULL)
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

  UPDATE public.portfolio_items
     SET moderation_status = 'visible',
         moderated_at      = NOW(),
         moderated_by      = v_actor,
         moderation_reason = NULLIF(btrim(p_notes), '')
   WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Photograph not found';
  END IF;

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (v_actor, 'CONTENT_RESTORED', 'portfolio_item', p_item_id,
          jsonb_build_object('notes', p_notes));
END;
$fn$;

-- ---------------------------------------------------------------------------
-- STEP 9. The other two admin queues, read through authorised functions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_disputes(p_status TEXT DEFAULT NULL, p_limit INT DEFAULT 50)
RETURNS TABLE (
  id         UUID,
  title      TEXT,
  reason     TEXT,
  reporter   TEXT,
  votes_a    INT,
  votes_b    INT,
  status     TEXT,
  resolution TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF NOT public.user_has_permission('manage_bookings') THEN
    RAISE EXCEPTION 'Unauthorized: missing manage_bookings permission';
  END IF;

  RETURN QUERY
  SELECT d.id, d.title, d.reason, d.reporter,
         d.votes_a, d.votes_b, d.status, d.resolution, d.created_at
  FROM public.disputes d
  WHERE (p_status IS NULL OR d.status = p_status)
  ORDER BY
    CASE WHEN d.status = 'pending' THEN 0 ELSE 1 END,
    d.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
END;
$fn$;

CREATE OR REPLACE FUNCTION public.admin_get_audit_log(p_limit INT DEFAULT 100)
RETURNS TABLE (
  id          UUID,
  actor_id    UUID,
  actor_name  TEXT,
  action      TEXT,
  target_type TEXT,
  target_id   UUID,
  metadata    JSONB,
  created_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF NOT public.user_has_permission('view_audit_logs') THEN
    RAISE EXCEPTION 'Unauthorized: missing view_audit_logs permission';
  END IF;

  RETURN QUERY
  SELECT a.id, a.actor_id,
         COALESCE(p.name, 'System')::TEXT AS actor_name,
         a.action, a.target_type, a.target_id, a.metadata, a.created_at
  FROM public.audit_logs a
  LEFT JOIN public.profiles p ON p.id = a.actor_id
  ORDER BY a.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
END;
$fn$;

-- ---------------------------------------------------------------------------
-- STEP 10. Platform counts, counted.
--
-- The console's three stat tiles are currently derived from the 100 profiles
-- AppContext happens to have loaded, so "Banned Accounts" means "banned among
-- the first hundred". At eight users that is invisible; at ten thousand it is a
-- wrong number on an admin screen, which is worse than no number.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_platform_stats()
RETURNS TABLE (
  users_total          INT,
  photographers_total  INT,
  clients_total        INT,
  banned_total         INT,
  verified_total       INT,
  items_total          INT,
  items_removed        INT,
  battles_active       INT,
  bookings_total       INT,
  reports_pending      INT,
  disputes_pending     INT,
  signups_last_7_days  INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF NOT public.user_has_permission('view_admin_dashboard') THEN
    RAISE EXCEPTION 'Unauthorized: missing view_admin_dashboard permission';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.profiles)::INT,
    (SELECT count(*) FROM public.profiles WHERE role = 'photographer')::INT,
    (SELECT count(*) FROM public.profiles WHERE role = 'client')::INT,
    (SELECT count(*) FROM public.profiles WHERE banned)::INT,
    (SELECT count(*) FROM public.profiles WHERE verified)::INT,
    (SELECT count(*) FROM public.portfolio_items)::INT,
    (SELECT count(*) FROM public.portfolio_items WHERE moderation_status = 'removed')::INT,
    (SELECT count(*) FROM public.photo_battles WHERE status IN ('queued', 'active'))::INT,
    (SELECT count(*) FROM public.bookings)::INT,
    (SELECT count(*) FROM public.reports  WHERE status = 'pending')::INT,
    (SELECT count(*) FROM public.disputes WHERE status = 'pending')::INT,
    (SELECT count(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '7 days')::INT;
END;
$fn$;

-- ---------------------------------------------------------------------------
-- STEP 11. Grants. Narrowest that works: signed-in only, and each function
-- checks the caller's permission for itself.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.admin_get_reports(TEXT, INT)        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_disputes(TEXT, INT)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_audit_log(INT)            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_platform_stats()          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_remove_content(UUID, TEXT)    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_restore_content(UUID, TEXT)   FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_get_reports(TEXT, INT)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_disputes(TEXT, INT)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_audit_log(INT)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_platform_stats()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_content(UUID, TEXT)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_content(UUID, TEXT)    TO authenticated;

COMMIT;
