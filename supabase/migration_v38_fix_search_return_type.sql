-- =================================================================================
-- migration v38 — fix the return type of search_photographers
--
-- WHAT WENT WRONG, AND IT IS THE FAILURE THIS PROJECT KEEPS HAVING
--
-- v36 declared `starting_rate TEXT` in the function's RETURNS TABLE. The live
-- column is INTEGER. plpgsql does not check a function body against its own
-- declared result type until the function RUNS, so v36 created cleanly, the
-- migration reported success, and the first actual call raised
--
--     structure of query does not match function result type
--     Returned type integer does not match expected type text in column 9
--
-- Exactly the shape of the v29 vote bug and the trigger functions v33 had to
-- rewrite. VERIFY_v36 is what caught it, because two of its checks CALL the
-- function rather than asking whether it exists. A structural check would have
-- passed and this would have surfaced on a client's first search.
--
-- WHY INTEGER AND NOT A CAST TO TEXT
--
-- Because the column is an integer and saying so is true. A cast would have
-- worked and left the next person reading the signature believing the database
-- stores "GHS 800" when it stores 800.
--
-- Worth recording: migration_v3_prd_schema.sql declares this column NUMERIC and
-- migration_v8_marketplace_fields.sql declares it INTEGER. v3 is the migration
-- that never ran, so v8 is what is live. Two files on disk disagreed and the
-- database settled it - which is the standing lesson in docs/DATABASE.md.
--
-- Run once, in the Supabase SQL editor. Then VERIFY_v36.sql, which is what
-- failed and is therefore the right thing to re-run.
-- =================================================================================
BEGIN;

-- CREATE OR REPLACE cannot change a function's return type - Postgres refuses
-- with "cannot change return type of existing function" - and column 9 is
-- exactly what is changing. So the broken one is dropped first.
--
-- Safe to drop: nothing depends on it. No view selects from it, no other
-- function calls it, and the only caller is the browser, which reaches it by
-- name over PostgREST and will find the new one.
DROP FUNCTION IF EXISTS public.search_photographers(TEXT, TEXT, NUMERIC, BOOLEAN, TEXT, INT, INT);

CREATE FUNCTION public.search_photographers(
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
  starting_rate       INTEGER,
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
