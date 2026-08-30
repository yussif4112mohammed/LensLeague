-- =================================================================================
-- LENSLEAGUE MIGRATION V13: USER FEEDBACK
-- ---------------------------------------------------------------------------------
-- Backs the in-app "Send feedback" button. One row per submission.
--   * Anyone may submit — signed-out visitors included. A signed-in submission is
--     stamped with the submitter's id; an anonymous one leaves user_id NULL.
--   * A submitter can read their own rows back; staff (migration_v11 is_staff())
--     can read everything. No UPDATE/DELETE policy: feedback is append-only.
--
-- Safe to run more than once. Apply migration_v11 first (is_staff()).
-- =================================================================================

CREATE TABLE IF NOT EXISTS public.feedback (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  message    TEXT NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 2000),
  page       TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON public.feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_user_id_idx    ON public.feedback (user_id);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Submitters and staff can read feedback" ON public.feedback;
CREATE POLICY "Submitters and staff can read feedback"
  ON public.feedback FOR SELECT
  USING (user_id = auth.uid() OR public.is_staff());
