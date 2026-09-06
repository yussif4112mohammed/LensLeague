-- =================================================================================
-- LENSLEAGUE MIGRATION V22: THE LAST OF THE MIGRATION-V3 GHOSTS
-- ---------------------------------------------------------------------------------
-- Live symptom, immediately after v21 removed the recursion:
--     column "user_id" of relation "notifications" does not exist
--
-- ── WHAT IS HAPPENING ────────────────────────────────────────────────────────
-- Two trigger functions from migration_v6 insert into `notifications` using
-- migration_v3's column names:
--
--     INSERT INTO public.notifications
--       (user_id, type, source_type, source_id, actor_id, message, read)
--
-- The live table is v2's shape - recipient_id, is_read, post_id, comment_id,
-- booking_id. v3 never ran. So both functions have raised an error every time
-- they fired, since 2026-07-30.
--
-- ── HOW BAD ──────────────────────────────────────────────────────────────────
-- These are AFTER triggers, so the exception rolls the whole statement back:
--
--   notify_on_new_message     on messages   → no threaded message could be sent
--   notify_on_booking_change  on bookings   → NO BOOKING COULD BE CREATED OR
--                                             HAVE ITS STATUS CHANGED, EVER
--
-- The booking one is the surprise. Bookings were assessed as working on the
-- strength of the client code, which is correct; the trigger behind them was not.
-- Nothing in the marketplace has ever completed.
--
-- ── THE FIX ──────────────────────────────────────────────────────────────────
-- Not a rewrite of v6's functions - a deletion. Migration v20 already built one
-- notification path: a SECURITY DEFINER notify() that no client can call, with
-- triggers for follows, likes, comments, battle results and bookings, all
-- against the real column names. v6's booking trigger duplicates v20's, and its
-- message trigger is the one thing v20 did not cover.
--
-- So: drop both v6 functions, and add the message notification to v20's path.
-- One writer, one set of column names, one place to be wrong.
--
-- Requires v20. Safe to run more than once.
-- =================================================================================

BEGIN;

-- =================================================================================
-- 1. REMOVE THE BROKEN WRITERS
-- ---------------------------------------------------------------------------------
-- CASCADE drops the triggers that depend on them. Named individually first so
-- that this file records exactly what is being removed.
-- =================================================================================

DROP TRIGGER IF EXISTS trg_notify_on_new_message    ON public.messages;
DROP TRIGGER IF EXISTS trg_notify_on_booking_change ON public.bookings;
DROP TRIGGER IF EXISTS trg_booking_insert_notify    ON public.bookings;
DROP TRIGGER IF EXISTS trg_booking_update_notify    ON public.bookings;

DROP FUNCTION IF EXISTS public.notify_on_new_message()    CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_booking_change() CASCADE;


-- =================================================================================
-- 2. ONE UNREAD MARKER PER CONVERSATION, NOT ONE PER MESSAGE
-- ---------------------------------------------------------------------------------
-- The obvious implementation - insert a notification for every recipient of
-- every message - is wrong at any real volume. A thread with fifty messages
-- would produce fifty rows and fifty drawer entries, and the table would grow
-- with total message traffic rather than with anything a person needs to see.
--
-- What a person actually wants to know is "this conversation has something new",
-- once, until they look at it. So there is at most ONE unread message
-- notification per recipient per thread, and a new message bumps it to the top
-- rather than adding another. Read it, and the next message creates a fresh one.
--
-- That bounds the table by (people x conversations) instead of by message count,
-- and it is also how every messaging product a photographer has ever used
-- behaves.
-- =================================================================================

-- notifications had no thread_id: v2 gave it post_id, comment_id and booking_id.
-- Without it there is nothing to deduplicate on, and nothing for the drawer to
-- link to.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.message_threads(id) ON DELETE CASCADE;

-- The dedupe key. Partial, so it constrains only what it needs to: read
-- notifications are history and may repeat, unread ones are a to-do list and
-- must not.
CREATE UNIQUE INDEX IF NOT EXISTS notifications_one_unread_per_thread
  ON public.notifications (recipient_id, thread_id)
  WHERE type = 'message' AND is_read = FALSE;

-- The badge does COUNT(*) WHERE recipient_id = me AND is_read = false on every
-- load. Partial index so that count touches only unread rows, whose number stays
-- small, rather than scanning a person's whole history.
CREATE INDEX IF NOT EXISTS notifications_unread_by_recipient
  ON public.notifications (recipient_id)
  WHERE is_read = FALSE;

/**
 * Tell everyone else in the thread, once.
 *
 * Set-based rather than a loop with a function call per participant: one
 * statement regardless of how many people are in the conversation. The loop
 * version is fine for a two-person DM and pointless work for anything larger.
 */
CREATE OR REPLACE FUNCTION public.tg_notify_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- Legacy direct messages carry a recipient and no thread. Nothing to
  -- deduplicate against, so they take the ordinary path.
  IF NEW.thread_id IS NULL THEN
    PERFORM public.notify(NEW.recipient_id, NEW.sender_id, 'message');
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (recipient_id, actor_id, type, thread_id)
  SELECT tp.user_id, NEW.sender_id, 'message', NEW.thread_id
    FROM public.thread_participants tp
   WHERE tp.thread_id = NEW.thread_id
     AND tp.user_id <> NEW.sender_id
  ON CONFLICT (recipient_id, thread_id) WHERE (type = 'message' AND is_read = FALSE)
  DO UPDATE SET
    created_at = NOW(),              -- move it back to the top of the drawer
    actor_id   = EXCLUDED.actor_id;  -- and name whoever spoke most recently

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_message ON public.messages;
CREATE TRIGGER trg_notify_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_message();


-- =================================================================================
-- 3. NOTHING ELSE MAY WRITE THE OLD SHAPE
-- ---------------------------------------------------------------------------------
-- The two functions above were found by reading migration files. This asserts
-- against the LIVE database that no function anywhere still references v3's
-- column names for this table, so the same ghost cannot be hiding somewhere the
-- files do not describe. It fails the migration rather than reporting quietly.
-- =================================================================================

DO $do$
DECLARE offenders TEXT;
BEGIN
  SELECT string_agg(p.proname, ', ')
    INTO offenders
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.prosrc ILIKE '%INSERT INTO%notifications%'
     AND p.prosrc ILIKE '%user_id%'
     AND p.prosrc NOT ILIKE '%recipient_id%';

  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION
      'Still writing notifications with migration_v3 column names: %', offenders;
  END IF;

  RAISE NOTICE 'No function writes notifications with the v3 shape.';
END
$do$;

-- =================================================================================
-- 4. THE READER RETURNS thread_id, SO A NOTIFICATION CAN BE ACTED ON
-- ---------------------------------------------------------------------------------
-- A "new message" the drawer cannot open is a dead end. The return type changes,
-- so the function is dropped and recreated rather than replaced.
-- =================================================================================

DROP FUNCTION IF EXISTS public.get_my_notifications(INT, BOOLEAN);

CREATE FUNCTION public.get_my_notifications(
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
  booking_id   UUID,
  thread_id    UUID
)
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT n.id, n.type, n.is_read, n.created_at,
         n.actor_id,
         COALESCE(p.display_name, p.name, p.username),
         COALESCE(p.avatar_url, p.avatar),
         n.post_id, n.comment_id, n.booking_id, n.thread_id
    FROM public.notifications n
    LEFT JOIN public.profiles p ON p.id = n.actor_id
   WHERE n.recipient_id = auth.uid()
     AND (NOT p_only_unread OR n.is_read = FALSE)
   ORDER BY n.created_at DESC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_notifications(INT, BOOLEAN) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_notifications(INT, BOOLEAN) TO authenticated;

COMMIT;
