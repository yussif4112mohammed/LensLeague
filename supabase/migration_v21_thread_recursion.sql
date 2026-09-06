-- =================================================================================
-- LENSLEAGUE MIGRATION V21: MESSAGING WAS UNUSABLE — RECURSIVE RLS POLICIES
-- ---------------------------------------------------------------------------------
-- Live symptom, hit by a real user sending an inquiry from a profile page:
--     infinite recursion detected in policy for relation "thread_participants"
--
-- ── WHAT POSTGRES IS COMPLAINING ABOUT ───────────────────────────────────────
-- A row-level security policy on a table may not read that same table. The
-- subquery is itself subject to the policy, which runs the subquery, which is
-- subject to the policy. Postgres detects the cycle and refuses the statement
-- rather than hanging.
--
-- The trap is that the natural way to write "you may see a thread you belong to"
-- is precisely a self-join, and it reads perfectly well:
--
--     USING (user_id = auth.uid()
--            OR EXISTS (SELECT 1 FROM thread_participants me
--                        WHERE me.thread_id = thread_participants.thread_id
--                          AND me.user_id = auth.uid()))
--
-- ── WHAT WAS ACTUALLY THERE (introspected, not assumed) ──────────────────────
-- TWO policies on thread_participants did this:
--
--   participants_select_own_threads   pre-existing, from v14 or earlier. This is
--                                     why threaded messaging has never worked.
--   participants_insert_self_only     added by v18, as belt and braces for a
--                                     grant that same migration had just revoked.
--                                     It protected nothing and added a second
--                                     cycle to a table that already had one.
--
-- Three more policies - messages_select_participant, messages_insert_own and
-- threads_select_participant - read thread_participants from another table.
-- That is legitimate and not itself recursive, but every one of them failed,
-- because evaluating them ran the recursive policy above.
--
-- ── THE FIX ──────────────────────────────────────────────────────────────────
-- A policy cannot query its own table, but a SECURITY DEFINER function can: it
-- runs as the owner, RLS does not apply inside it, and the cycle is broken.
--
-- The membership test therefore moves into one function, and every policy calls
-- it. That is also less code, and one place to be right rather than five.
--
-- Requires v14-v20. Safe to run more than once.
-- =================================================================================

BEGIN;

-- =================================================================================
-- 1. THE MEMBERSHIP TEST, ONCE
-- =================================================================================

/**
 * Is the caller a participant in this thread?
 *
 * SECURITY DEFINER so that reading thread_participants here does NOT re-enter
 * the policies on thread_participants. That is the entire point.
 *
 * It leaks nothing: it answers only about the caller, never about anyone else,
 * and returns a boolean rather than any row. Passing somebody else's thread id
 * tells you only that you are not in it.
 */
CREATE OR REPLACE FUNCTION public.is_thread_participant(p_thread_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.thread_participants
     WHERE thread_id = p_thread_id
       AND user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_thread_participant(UUID) IS
  'Thread membership for the CALLER only. SECURITY DEFINER so that RLS policies '
  'on thread_participants can use it without querying their own table, which '
  'Postgres rejects as infinite recursion.';

REVOKE EXECUTE ON FUNCTION public.is_thread_participant(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_thread_participant(UUID) TO authenticated;


-- =================================================================================
-- 2. thread_participants — the two policies that were recursing
-- =================================================================================

DROP POLICY IF EXISTS "participants_select_own_threads" ON public.thread_participants;
CREATE POLICY "participants_select_own_threads" ON public.thread_participants
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_thread_participant(thread_id)
  );

-- Kept as belt and braces only. v18 revoked INSERT on this table from every
-- client role, and get_or_create_thread (SECURITY DEFINER) does the writing, so
-- nothing reaches this policy today. It exists so that a later, innocent GRANT
-- cannot quietly reopen what v18 closed.
DROP POLICY IF EXISTS "participants_insert_self_only" ON public.thread_participants;
CREATE POLICY "participants_insert_self_only" ON public.thread_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_thread_participant(thread_id)
  );


-- =================================================================================
-- 3. The cross-table policies — same rule, one implementation
-- ---------------------------------------------------------------------------------
-- These were never recursive themselves; they failed because they evaluated the
-- policy above. Rewriting them through the helper is not required to fix the
-- bug, but it removes five copies of one rule, and it means a future change to
-- what "participant" means happens in a single place.
-- =================================================================================

DROP POLICY IF EXISTS "threads_select_participant" ON public.message_threads;
CREATE POLICY "threads_select_participant" ON public.message_threads
  FOR SELECT
  USING (public.is_thread_participant(id));

DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
CREATE POLICY "messages_select_participant" ON public.messages
  FOR SELECT
  USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
    OR (thread_id IS NOT NULL AND public.is_thread_participant(thread_id))
  );

DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY "messages_insert_own" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (thread_id IS NULL OR public.is_thread_participant(thread_id))
  );

COMMIT;
