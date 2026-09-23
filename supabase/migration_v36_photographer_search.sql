-- =================================================================================
-- migration v36 — clients can find a photographer who is not in the first hundred
--
-- WHAT WAS WRONG
--
-- ClientSearch filters `users` out of AppContext. AppContext fills that list on
-- mount with
--
--     supabase.from('profiles').select(PROFILE_COLUMNS).limit(100)
--
-- so the client-facing search of a photography marketplace searches the first
-- hundred profiles the database happens to return, in no meaningful order, and
-- nothing else. Photographer one hundred and one cannot be found by anybody, by
-- name, ever. At eight users this is invisible. It is also the exact shape the
-- standing rule in docs/PRODUCT.md warns about: never pull a whole table into
-- client state "for now".
--
-- The filtering logic that sits on top of it is careful and correct - it
-- refuses to treat an unrated photographer as five stars, and it will not pass
-- someone who declared no categories through a category filter. That thinking
-- is preserved here; it just moves to where it can see every row.
--
-- TWO SORTS ARE DELETED RATHER THAN MOVED
--
-- The UI offered "Most Booked" and "Nearest". Nothing counts bookings per
-- photographer and nothing stores a coordinate, so both controls sorted by
-- nothing while looking like they sorted by something. Under the standing rule
-- - if nothing records it, the screen does not show it - they are gone rather
-- than reimplemented against a number that does not exist.
--
-- WHAT IS DELIBERATELY NOT HERE
--
-- Recognition tier as an input to ranking. That is item 3 of the build order in
-- docs/PRODUCT.md, it comes after The Weekly Cover, and it needs both sides of
-- the platform populated before it means anything. The ORDER BY below is
-- written as one CASE so that adding it later is one clause in one function
-- rather than a rewrite.
--
-- PAGINATION
--
-- Offset, bounded to ten pages. Keyset would be better and is not possible
-- across three user-chosen sort orders without three cursors. The bound is the
-- honest mitigation: a client who has looked at 240 photographers needs a
-- better filter, not page eleven.
--
-- Run once, in the Supabase SQL editor. Then VERIFY_v36.sql.
-- =================================================================================
BEGIN;

-- The read every client search makes: photographers who are actually available
-- to be found. Partial, so it does not carry banned or deactivated rows.
CREATE INDEX IF NOT EXISTS idx_profiles_findable
  ON public.profiles (rating DESC NULLS LAST, review_count DESC NULLS LAST)
  WHERE role = 'photographer'
    AND banned = false
    AND COALESCE(is_deactivated, false) = false;

CREATE INDEX IF NOT EXISTS idx_profiles_service_categories
  ON public.profiles USING gin (service_categories);

CREATE INDEX IF NOT EXISTS idx_profiles_specialties
  ON public.profiles USING gin (specialties);

CREATE OR REPLACE FUNCTION public.search_photographers(
  p_query          TEXT    DEFAULT NULL,
  p_category       TEXT    DEFAULT NULL,
  p_min_rating     NUMERIC DEFAULT 0,
  p_available_only BOOLEAN DEFAULT FALSE,
  p_sort           TEXT    DEFAULT 'rating',
  p_limit          INT     DEFAULT 24,
  p_page           INT     DEFAULT 0
)
RETURNS TABLE (
  id                  UUID,
  name                TEXT,
  username            TEXT,
  avatar_url          TEXT,
  bio                 TEXT,
  location            TEXT,
  specialties         TEXT[],
  service_categories  TEXT[],
  starting_rate       TEXT,
  availability_status TEXT,
  rating              NUMERIC,
  review_count        INT,
  wins                INT,
  points              INT,
  verified            BOOLEAN,
  total_matches       INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_limit INT := GREATEST(1, LEAST(COALESCE(p_limit, 24), 48));
  v_page  INT := GREATEST(0, LEAST(COALESCE(p_page, 0), 9));
  v_q     TEXT := NULLIF(btrim(COALESCE(p_query, '')), '');
  v_cat   TEXT := NULLIF(btrim(COALESCE(p_category, '')), '');
BEGIN
  RETURN QUERY
  WITH findable AS (
    SELECT p.*
    FROM public.profiles p
    WHERE COALESCE(p.role, p.account_type) = 'photographer'
      AND p.banned = false
      AND COALESCE(p.is_deactivated, false) = false

      -- A category filter must not silently pass photographers who declared
      -- none. Their own stated specialisms; empty means empty.
      AND (
        v_cat IS NULL
        OR v_cat = ANY(COALESCE(p.service_categories, ARRAY[]::TEXT[]))
        OR v_cat = ANY(COALESCE(p.specialties, ARRAY[]::TEXT[]))
      )

      -- A minimum rating excludes the unrated. Asking for four stars and being
      -- shown people nobody has reviewed is the filter lying to you. A rating
      -- with no reviews behind it is not a rating.
      AND (
        COALESCE(p_min_rating, 0) <= 0
        OR (p.review_count > 0 AND p.rating IS NOT NULL AND p.rating >= p_min_rating)
      )

      AND (
        NOT COALESCE(p_available_only, FALSE)
        OR COALESCE(p.availability_status, '') ILIKE 'available%'
      )

      AND (
        v_q IS NULL
        OR p.name     ILIKE '%' || v_q || '%'
        OR p.username ILIKE '%' || v_q || '%'
        OR p.bio      ILIKE '%' || v_q || '%'
        OR p.location ILIKE '%' || v_q || '%'
        OR EXISTS (
          SELECT 1 FROM unnest(
            COALESCE(p.service_categories, ARRAY[]::TEXT[]) ||
            COALESCE(p.specialties,        ARRAY[]::TEXT[])
          ) AS c(v) WHERE c.v ILIKE '%' || v_q || '%'
        )
      )
  ),
  counted AS (
    SELECT f.*, count(*) OVER ()::INT AS total_matches FROM findable f
  )
  SELECT
    c.id, c.name, c.username, c.avatar_url, c.bio, c.location,
    COALESCE(c.specialties,        ARRAY[]::TEXT[]),
    COALESCE(c.service_categories, ARRAY[]::TEXT[]),
    c.starting_rate,
    c.availability_status,
    -- Null, not zero, and not five. The screen decides how to say "unrated";
    -- it must not be handed a number that looks like an opinion.
    CASE WHEN c.review_count > 0 THEN c.rating END,
    COALESCE(c.review_count, 0),
    COALESCE(c.wins, 0),
    COALESCE(c.points, 0),
    COALESCE(c.verified, FALSE),
    c.total_matches
  FROM counted c
  ORDER BY
    -- One CASE, so that adding recognition tier later (build order item 3) is
    -- a clause here rather than a rewrite of the function.
    CASE WHEN p_sort = 'reviews' THEN c.review_count END DESC NULLS LAST,
    CASE WHEN p_sort = 'recent'  THEN c.created_at   END DESC NULLS LAST,
    CASE WHEN p_sort = 'wins'    THEN c.wins         END DESC NULLS LAST,
    CASE WHEN COALESCE(p_sort, 'rating') = 'rating'
         THEN (CASE WHEN c.review_count > 0 THEN c.rating END) END DESC NULLS LAST,
    c.review_count DESC NULLS LAST,
    c.id
  LIMIT v_limit
  OFFSET v_page * v_limit;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.search_photographers(TEXT, TEXT, NUMERIC, BOOLEAN, TEXT, INT, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.search_photographers(TEXT, TEXT, NUMERIC, BOOLEAN, TEXT, INT, INT) TO anon, authenticated;

COMMIT;
