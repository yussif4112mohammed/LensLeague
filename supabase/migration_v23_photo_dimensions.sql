-- =================================================================================
-- LENSLEAGUE MIGRATION V23: PHOTOGRAPHS KEEP THEIR OWN SHAPE
-- ---------------------------------------------------------------------------------
-- Reported by a photographer, via Eben, 2026-09-06:
--   "the photos you upload should automatically be their original aspect ratio,
--    not 1:1"
--
-- He is describing PhotoCard, which hardcodes `aspect-square`. But the crop is
-- only the visible half of the problem. The other half is that the platform does
-- not know the shape of a single photograph it holds:
--
--     aspectRatio: p.media_url?.includes('.mp4') ? '9/16' : '3/4'
--
-- That is the whole of it, in AppContext. Every photograph is assumed to be 3:4
-- and every video 9:16, decided by a substring of the filename. portfolio_items
-- has no column for it at all, so there was nowhere to put the truth even if
-- anyone had measured it.
--
-- A photography platform that discards the frame is failing at the one thing it
-- exists to present. A portrait shot at 4:5, a panorama at 3:1 and a square are
-- three different photographs, and cropping them to a common shape is an
-- editorial act nobody asked for.
--
-- ── WHAT IS STORED, AND WHY ALL THREE ────────────────────────────────────────
-- width and height are the source of truth: they are what the browser measures,
-- they never lie, and every ratio anyone will ever want can be derived from
-- them. aspect_ratio is stored alongside as a generated column so that queries
-- and CSS can use it directly without every caller re-deriving it - and being
-- generated, it cannot drift from the dimensions it came from.
--
-- Nothing is backfilled: there are no rows. This is the cheapest possible moment
-- for this change, and it will not come again.
--
-- Requires v14. Safe to run more than once.
-- =================================================================================

BEGIN;

ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS width  INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER;

-- Guard the obvious nonsense. A zero or negative dimension is not a photograph,
-- and an absurd one is a client sending junk rather than a measurement.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.portfolio_items'::regclass
       AND conname  = 'portfolio_items_dimensions_sane'
  ) THEN
    ALTER TABLE public.portfolio_items
      ADD CONSTRAINT portfolio_items_dimensions_sane CHECK (
        (width IS NULL AND height IS NULL)
        OR (width BETWEEN 1 AND 100000 AND height BETWEEN 1 AND 100000)
      );
  END IF;
END
$do$;

-- Derived, not duplicated. A stored ratio that can disagree with its own
-- dimensions is a bug waiting to be written; this one cannot.
ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS aspect_ratio NUMERIC(8,5)
  GENERATED ALWAYS AS (
    CASE WHEN width IS NOT NULL AND height IS NOT NULL AND height > 0
         THEN ROUND(width::NUMERIC / height::NUMERIC, 5)
    END
  ) STORED;

COMMENT ON COLUMN public.portfolio_items.width IS
  'Pixel width as measured in the browser at upload. Source of truth for shape.';
COMMENT ON COLUMN public.portfolio_items.height IS
  'Pixel height as measured in the browser at upload.';
COMMENT ON COLUMN public.portfolio_items.aspect_ratio IS
  'width / height, generated. Never set directly - it cannot drift from the '
  'dimensions because it is derived from them.';

-- Orientation is what most surfaces actually branch on - a grid wants to know
-- "tall, wide or square", not 1.33333. Partial-free plain index: the column is
-- generated and stored, so this is a cheap ordinary index.
CREATE INDEX IF NOT EXISTS portfolio_items_aspect_ratio_idx
  ON public.portfolio_items (aspect_ratio)
  WHERE aspect_ratio IS NOT NULL;

COMMIT;
