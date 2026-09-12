-- =================================================================================
-- MIGRATION v27 — MAKE REVIEWS POSSIBLE
--
-- THE BUG
-- public.reviews carries exactly two policies:
--
--   UPDATE: reviewer_id = auth.uid()
--   DELETE: reviewer_id = auth.uid() OR is_staff()
--
-- There is no SELECT and no INSERT. Nobody can write a review and nobody can
-- read one. In a marketplace where strangers hire strangers, reviews ARE the
-- trust mechanism - the reason a client picks one photographer over another -
-- and the table has been inert since it was created.
--
-- This is a stranger failure than the albums one. There, nobody wrote any
-- policy. Here somebody wrote the two policies that govern changing and
-- removing a review, and never wrote the two that let one exist. The edit path
-- was built for rows that could never be created.
--
-- COLUMNS AND VALUES VERIFIED AGAINST THE LIVE CATALOG, not migration_v3:
--   reviews   id, booking_id, reviewer_id, reviewee_id, rating, body, created_at
--   bookings  id, client_id, photographer_id, date, budget, location, message,
--             status, created_at, time_slot, format, requirements, updated_at
--   bookings.status CHECK: requested | accepted | declined | completed
--
-- I asked for both rather than reading them out of a migration, which has now
-- misled me three times in this project.
-- =================================================================================

BEGIN;

-- ---------------------------------------------------------------------------------
-- 1. WHO IS ENTITLED TO WRITE A REVIEW
--
--    Only somebody who was actually party to the booking, only about the other
--    party, and only once the work is done. Without the participation check any
--    signed-in person could review anyone, which is worse than having no
--    reviews: a marketplace with forgeable reviews actively misleads the people
--    relying on them.
--
--    SECURITY DEFINER so a policy on reviews never evaluates bookings' own RLS
--    from inside its own - the recursion migration v21 had to untangle for
--    message threads, and the reason v25 uses the same shape.
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_review_booking(p_booking_id UUID, p_reviewee UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
     WHERE b.id = p_booking_id
       -- Deliberately 'completed' only. A review written while the shoot is
       -- still being negotiated is a bargaining chip, not a review.
       AND b.status = 'completed'
       AND (
         -- Either direction: the client reviews the photographer, or the
         -- photographer reviews the client. Both sides of a job are worth
         -- knowing about, and a photographer deciding whether to take work
         -- needs the same signal a client does.
         (b.client_id = auth.uid()       AND b.photographer_id = p_reviewee)
         OR (b.photographer_id = auth.uid() AND b.client_id     = p_reviewee)
       )
  );
$$;

COMMENT ON FUNCTION public.can_review_booking(UUID, UUID) IS
  'True when the caller was party to this completed booking and the reviewee was '
  'the other party. The only route to inserting a review.';

GRANT EXECUTE ON FUNCTION public.can_review_booking(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------------
-- 2. ONE REVIEW PER BOOKING PER PERSON
--
--    Enforced by the database, not by the form. Without it a disgruntled client
--    can write the same review ten times and sink a rating, and the client is
--    not the one who would notice the bug.
-- ---------------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_booking_per_reviewer
  ON public.reviews (booking_id, reviewer_id);

-- Reading a photographer's reviews is the commonest query this table will ever
-- serve, and it had no index for it.
CREATE INDEX IF NOT EXISTS reviews_reviewee_idx
  ON public.reviews (reviewee_id, created_at DESC);

-- ---------------------------------------------------------------------------------
-- 3. A RATING HAS TO BE A RATING
--
--    The column is plain and unconstrained, so nothing stopped a 0, a 47 or a
--    negative. Safe to add: the table is empty, so no existing row can violate it.
-- ---------------------------------------------------------------------------------
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.reviews'::regclass AND conname = 'reviews_rating_1_to_5'
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_rating_1_to_5 CHECK (rating BETWEEN 1 AND 5);
  END IF;
END
$do$;

-- ---------------------------------------------------------------------------------
-- 4. THE TWO POLICIES THAT WERE MISSING
-- ---------------------------------------------------------------------------------
DROP POLICY IF EXISTS reviews_select        ON public.reviews;
DROP POLICY IF EXISTS reviews_insert_earned ON public.reviews;

-- Public on purpose. A review nobody can read protects nobody; the whole point
-- is that a prospective client sees it before deciding. This is the one table
-- where visibility to strangers IS the feature.
CREATE POLICY reviews_select ON public.reviews
  FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY reviews_insert_earned ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND public.can_review_booking(booking_id, reviewee_id)
    AND NOT public.viewer_is_banned()
  );

-- ---------------------------------------------------------------------------------
-- 5. AN EDIT MAY CHANGE THE OPINION, NOT THE FACTS
--
--    The pre-existing UPDATE policy checks only reviewer_id = auth.uid(), and
--    USING alone governs which rows are visible to the update - not what they
--    may become. So the author could repoint booking_id or reviewee_id and move
--    a five-star review onto a photographer they have never hired. A guard
--    trigger is the pattern this schema already uses for exactly this (v11 on
--    portfolio_items.votes, v14 on the counters).
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_review_identity()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF public.is_staff() THEN RETURN NEW; END IF;
  IF NEW.booking_id  IS DISTINCT FROM OLD.booking_id
     OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id
     OR NEW.reviewee_id IS DISTINCT FROM OLD.reviewee_id THEN
    RAISE EXCEPTION 'A review stays attached to the booking and the people it was written about.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_review_identity ON public.reviews;
CREATE TRIGGER trg_guard_review_identity
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.guard_review_identity();

-- Give the existing UPDATE policy a WITH CHECK as well, so the row it becomes
-- is judged, not only the row it was.
DROP POLICY IF EXISTS reviews_update_own ON public.reviews;
CREATE POLICY reviews_update_own ON public.reviews
  FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());

-- ---------------------------------------------------------------------------------
-- 6. GRANTS
-- ---------------------------------------------------------------------------------
REVOKE ALL ON public.reviews FROM anon, authenticated;
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;

COMMIT;

-- ---------------------------------------------------------------------------------
-- 7. THE STANDING AUDIT
-- ---------------------------------------------------------------------------------
DO $do$
DECLARE v_n INTEGER; v_names TEXT;
BEGIN
  SELECT COUNT(*), string_agg(table_name, ', ')
    INTO v_n, v_names FROM public.audit_rls_without_policies();
  IF v_n = 0 THEN
    RAISE NOTICE 'RLS audit clean';
  ELSE
    RAISE WARNING 'RLS enabled with NO policies on % table(s): %', v_n, v_names;
  END IF;
END
$do$;
