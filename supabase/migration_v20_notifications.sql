-- =================================================================================
-- LENSLEAGUE MIGRATION V20: NOTIFICATIONS THAT ARE ACTUALLY REAL
-- ---------------------------------------------------------------------------------
-- Until now the notification drawer rendered three hardcoded objects naming people
-- who do not exist. Meanwhile the `notifications` table has sat in the database
-- since v2 with RLS on, correct policies, an index, and nine real rows in it - all
-- of type 'follow', newest 2026-08-15, none read. Something wrote them once and
-- nothing has read them since. So this migration is less "build notifications"
-- than "connect the two halves that were already there".
--
-- Introspected before writing (CHECK_notifications.sql), so none of this is
-- assumed: the live table is the v2 shape (recipient_id / is_read), RLS is on,
-- select-own and update-own policies exist, and realtime does NOT publish it.
--
-- ── WHAT THIS FIXES BEYOND THE FEATURE ───────────────────────────────────────
-- The introspection turned up a privilege problem. `anon` and `authenticated`
-- both hold DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE and UPDATE on
-- notifications. Today RLS saves us - there is no INSERT or DELETE policy, so
-- those are refused - but two of those grants are not RLS-governed at all, and
-- the whole set is far wider than any client needs. It is the same shape as the
-- S1 finding in v18: a permissive grant sitting behind a policy, waiting for
-- someone to add an innocent policy and open it. A client needs exactly two
-- things here: read your own, and mark your own as read.
--
-- ── DESIGN DECISIONS ─────────────────────────────────────────────────────────
--
-- 1. NOTHING IS WRITTEN BY A CLIENT. Every row is inserted by a trigger through
--    one SECURITY DEFINER helper. A notification is a claim that something
--    happened; if the browser could write one, it could forge one.
--
-- 2. YOU ARE NEVER NOTIFIED ABOUT YOUR OWN ACTION. Liking your own photograph,
--    commenting on your own work, following - if actor and recipient match, no
--    row. Checked in one place rather than in five triggers.
--
-- 3. A LOST ROUND IS NOT ANNOUNCED AS A LOSS. The product does not publish
--    losses. A private notification is not a public display, so the photographer
--    whose photograph did not win is still told their round finished - but it is
--    worded as a result, not a defeat, and the copy lives in the client. A
--    'no_votes' round notifies nobody, because nothing happened.
--
-- 4. THE PAYLOAD IS JOINED SERVER-SIDE. get_my_notifications returns the actor's
--    name and avatar with the row, so the drawer does not fire a second query per
--    notification.
--
-- Requires v14-v19. Safe to run more than once.
-- =================================================================================

BEGIN;

-- =================================================================================
-- 1. PRIVILEGES — take away everything a client has no business having
-- ---------------------------------------------------------------------------------
-- Read your own and mark your own read. Nothing else. INSERT belongs to the
-- triggers (which run as definer and bypass this), DELETE and TRUNCATE belong to
-- nobody, and TRUNCATE in particular is not governed by row-level security at
-- all - a policy would not have stopped it.
-- =================================================================================

REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT  SELECT, UPDATE ON public.notifications TO authenticated;
-- anon gets nothing: a signed-out visitor has no notifications by definition.

-- The v2 policies are correct and stay. Restated here only so a reader of this
-- file can see the full picture without opening v2.
--   notifications_select_own   SELECT USING (auth.uid() = recipient_id)
--   notifications_update_own   UPDATE USING/CHECK (auth.uid() = recipient_id)


-- =================================================================================
-- 2. THE TYPE VOCABULARY — add 'battle_result'
-- ---------------------------------------------------------------------------------
-- v2 allowed nine types, including 'competition_result'. Battles and competition
-- rooms (v12) are different things in this product, so they get different types
-- rather than one overloaded value that later has to be disambiguated by joining.
-- =================================================================================

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'like','comment','reply','follow','mention',
    'competition_result','booking_request','booking_update','message',
    'battle_result'
  ));


-- =================================================================================
-- 3. THE ONE WAY A NOTIFICATION IS EVER CREATED
-- =================================================================================

/**
 * Record that something happened to somebody.
 *
 * SECURITY DEFINER because no client role can INSERT here any more, and that is
 * the point. Returns quietly rather than raising when there is nothing to say -
 * a missing recipient, or an actor notifying themselves - so no trigger has to
 * guard its own call.
 */
CREATE OR REPLACE FUNCTION public.notify(
  p_recipient  UUID,
  p_actor      UUID,
  p_type       TEXT,
  p_post_id    UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_recipient IS NULL THEN RETURN; END IF;
  -- Rule 2: nobody is told about their own action.
  IF p_actor IS NOT NULL AND p_actor = p_recipient THEN RETURN; END IF;

  INSERT INTO public.notifications
    (recipient_id, actor_id, type, post_id, comment_id, booking_id)
  VALUES
    (p_recipient, p_actor, p_type, p_post_id, p_comment_id, p_booking_id);
END;
$$;

COMMENT ON FUNCTION public.notify(UUID,UUID,TEXT,UUID,UUID,UUID) IS
  'The only path by which a notification row is created. Called from triggers, '
  'never from a client - clients hold no INSERT privilege on notifications.';

REVOKE EXECUTE ON FUNCTION public.notify(UUID,UUID,TEXT,UUID,UUID,UUID) FROM PUBLIC, anon, authenticated;


-- =================================================================================
-- 4. TRIGGERS — the four things worth telling someone about
-- =================================================================================

-- ── FOLLOW ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_notify_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.notify(NEW.following_id, NEW.follower_id, 'follow');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_follow ON public.follows;
CREATE TRIGGER trg_notify_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_follow();


-- ── LIKE ─────────────────────────────────────────────────────────────────────
-- v14 gave likes an `item_id` pointing at portfolio_items, alongside the legacy
-- `post_id`. Resolve whichever is populated rather than assuming, because both
-- shapes are live during the drift period documented in docs/DATABASE.md.
CREATE OR REPLACE FUNCTION public.tg_notify_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_owner UUID;
BEGIN
  IF NEW.item_id IS NOT NULL THEN
    SELECT photographer_id INTO v_owner FROM portfolio_items WHERE id = NEW.item_id;
  ELSIF NEW.post_id IS NOT NULL THEN
    SELECT author_id INTO v_owner FROM posts WHERE id = NEW.post_id;
  END IF;

  PERFORM public.notify(v_owner, NEW.user_id, 'like', NEW.post_id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_like ON public.likes;
CREATE TRIGGER trg_notify_like
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_like();


-- ── COMMENT ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_notify_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_owner UUID;
BEGIN
  IF NEW.item_id IS NOT NULL THEN
    SELECT photographer_id INTO v_owner FROM portfolio_items WHERE id = NEW.item_id;
  ELSIF NEW.photo_id IS NOT NULL THEN
    SELECT ph.owner_id INTO v_owner FROM photos ph WHERE ph.id = NEW.photo_id;
  END IF;

  PERFORM public.notify(v_owner, NEW.user_id, 'comment', NULL, NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_comment ON public.comments;
CREATE TRIGGER trg_notify_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_comment();


-- ── BATTLE RESULT ────────────────────────────────────────────────────────────
-- Hooked to the row rather than to finalize_battle(), so it fires however a
-- battle comes to be finalised - the engine, a scheduled sweep, or a hand
-- correction - and finalize_battle needs no edit.
--
-- Both photographers are told. 'no_votes' tells nobody: a round nobody saw is
-- not news, and v15 requeues those photographs anyway.
CREATE OR REPLACE FUNCTION public.tg_notify_battle_finalized()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE owner_a UUID; owner_b UUID;
BEGIN
  IF NEW.status <> 'finalized' OR OLD.status = 'finalized' THEN RETURN NEW; END IF;
  IF NEW.outcome = 'no_votes' THEN RETURN NEW; END IF;

  SELECT photographer_id INTO owner_a FROM portfolio_items WHERE id = NEW.photo_a_id;
  SELECT photographer_id INTO owner_b FROM portfolio_items WHERE id = NEW.photo_b_id;

  -- actor is NULL: no person did this to you, the engine did.
  PERFORM public.notify(owner_a, NULL, 'battle_result');
  PERFORM public.notify(owner_b, NULL, 'battle_result');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_battle_finalized ON public.photo_battles;
CREATE TRIGGER trg_notify_battle_finalized
  AFTER UPDATE OF status ON public.photo_battles
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_battle_finalized();


-- ── BOOKINGS ─────────────────────────────────────────────────────────────────
-- A request goes to the photographer. Every later status change goes to the
-- other party - whoever did not cause it.
CREATE OR REPLACE FUNCTION public.tg_notify_booking()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify(NEW.photographer_id, NEW.client_id, 'booking_request', NULL, NULL, NEW.id);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Tell the party who did not make the change. auth.uid() is the actor here.
    IF auth.uid() = NEW.photographer_id THEN
      PERFORM public.notify(NEW.client_id, NEW.photographer_id, 'booking_update', NULL, NULL, NEW.id);
    ELSE
      PERFORM public.notify(NEW.photographer_id, NEW.client_id, 'booking_update', NULL, NULL, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_booking ON public.bookings;
CREATE TRIGGER trg_notify_booking
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_booking();


-- =================================================================================
-- 5. READING THEM
-- =================================================================================

/**
 * Your notifications, newest first, with the actor already joined on.
 *
 * Not SECURITY DEFINER: the v2 select-own policy already restricts this to the
 * caller's own rows, and letting RLS do that job means there is no second place
 * where the "only your own" rule could be got wrong.
 */
CREATE OR REPLACE FUNCTION public.get_my_notifications(
  p_limit       INT     DEFAULT 30,
  p_only_unread BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id           UUID,
  type         TEXT,
  is_read      BOOLEAN,
  created_at   TIMESTAMPTZ,
  actor_id     UUID,
  actor_name   TEXT,
  actor_avatar TEXT,
  post_id      UUID,
  comment_id   UUID,
  booking_id   UUID
)
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT n.id, n.type, n.is_read, n.created_at,
         n.actor_id,
         COALESCE(p.display_name, p.name, p.username),
         COALESCE(p.avatar_url, p.avatar),
         n.post_id, n.comment_id, n.booking_id
    FROM public.notifications n
    LEFT JOIN public.profiles p ON p.id = n.actor_id
   WHERE n.recipient_id = auth.uid()
     AND (NOT p_only_unread OR n.is_read = FALSE)
   ORDER BY n.created_at DESC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
$$;

/**
 * How many unread - for the badge. Cheap enough to poll.
 */
CREATE OR REPLACE FUNCTION public.unread_notification_count()
RETURNS INT
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT COUNT(*)::INT FROM public.notifications
   WHERE recipient_id = auth.uid() AND is_read = FALSE;
$$;

/**
 * Mark yours as read. Pass ids, or nothing to mark all of them.
 *
 * The update-own policy already prevents touching anyone else's row, so a
 * hostile id list simply matches nothing.
 */
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids UUID[] DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE n INT;
BEGIN
  UPDATE public.notifications
     SET is_read = TRUE
   WHERE recipient_id = auth.uid()
     AND is_read = FALSE
     AND (p_ids IS NULL OR id = ANY(p_ids));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_notifications(INT, BOOLEAN)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.unread_notification_count()          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_notifications_read(UUID[])      FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_notifications(INT, BOOLEAN)   TO authenticated;
GRANT  EXECUTE ON FUNCTION public.unread_notification_count()          TO authenticated;
GRANT  EXECUTE ON FUNCTION public.mark_notifications_read(UUID[])      TO authenticated;


-- =================================================================================
-- 6. DELIVERY — publish the table so the drawer can update without polling
-- ---------------------------------------------------------------------------------
-- The same mechanism already used for `messages`. RLS still applies to realtime,
-- so a subscriber receives only rows they could have selected anyway.
-- =================================================================================

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
       AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    RAISE NOTICE 'notifications added to the supabase_realtime publication';
  ELSE
    RAISE NOTICE 'notifications was already published';
  END IF;
END
$do$;

COMMIT;
