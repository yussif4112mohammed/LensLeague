-- =================================================================================
-- migration v31 — make a written review change what a client sees
--
-- THE GAP v27 LEFT
--
-- v27 built the reviews table properly: a permission function that requires a
-- completed booking and the caller to be a party to it, one review per booking
-- per reviewer, a 1-to-5 check, public reads, and a trigger freezing the
-- identity fields so an edit can change the opinion but not who it is about.
-- All of that is right.
--
-- What it did not do is connect a review to the number a client actually reads.
-- ClientHome and ClientSearch both sort and filter on profiles.rating and
-- profiles.review_count, and nothing maintains either column. So a photographer
-- could collect ten honest reviews and still read "No reviews yet" on every
-- screen that matters, and the rating filter could never match anybody. Writing
-- the review UI alone would have shipped that.
--
-- WHY A TRIGGER AND NOT A VIEW
--
-- Those two columns already exist, four screens already read them, and the
-- search RPC already orders by them. Recomputing on write is cheaper than
-- rewriting five read paths, and it keeps the marketplace's sort order on an
-- indexed column.
--
-- THE GUARD
--
-- rating and review_count are in guard_profile_columns' guarded list, alongside
-- points and verified - a client must never be able to write its own rating.
-- So this trigger announces itself with lensleague.engine_write, exactly as
-- v28 taught sync_item_like_count to do. Without that the trigger's own UPDATE
-- would be silently reverted to the old value by the guard, and reviews would
-- appear to save while changing nothing - the failure mode this codebase has
-- now produced three times.
-- =================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_profile_review_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  target UUID := COALESCE(NEW.reviewee_id, OLD.reviewee_id);
BEGIN
  -- Recomputed from the rows rather than incremented, so the stored figures
  -- cannot drift from the truth - and a backfill is the same code path.
  PERFORM set_config('lensleague.engine_write', 'on', true);

  UPDATE public.profiles p
     SET review_count = agg.n,
         rating        = agg.avg_rating
    FROM (
      SELECT COUNT(*)::INTEGER AS n,
             ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating
        FROM public.reviews
       WHERE reviewee_id = target
    ) agg
   WHERE p.id = target;

  PERFORM set_config('lensleague.engine_write', 'off', true);

  RETURN NULL;   -- AFTER trigger; the return value is not used
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_review_stats ON public.reviews;
CREATE TRIGGER trg_sync_profile_review_stats
  AFTER INSERT OR UPDATE OF rating, reviewee_id OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_review_stats();

-- The table is empty today, so this is a no-op now and correctness insurance
-- later: every profile's stored figures are set from the rows that exist.
DO $do$
BEGIN
  PERFORM set_config('lensleague.engine_write', 'on', true);

  UPDATE public.profiles p
     SET review_count = COALESCE(agg.n, 0),
         rating        = agg.avg_rating
    FROM (
      SELECT pr.id,
             (SELECT COUNT(*)::INTEGER FROM public.reviews r WHERE r.reviewee_id = pr.id) AS n,
             (SELECT ROUND(AVG(r.rating)::NUMERIC, 2) FROM public.reviews r WHERE r.reviewee_id = pr.id) AS avg_rating
        FROM public.profiles pr
    ) agg
   WHERE p.id = agg.id
     AND (COALESCE(p.review_count, -1) <> COALESCE(agg.n, 0)
          OR COALESCE(p.rating, -1) IS DISTINCT FROM agg.avg_rating);

  PERFORM set_config('lensleague.engine_write', 'off', true);
END
$do$;

COMMIT;
