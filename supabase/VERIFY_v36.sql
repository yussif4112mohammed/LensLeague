-- =================================================================================
-- VERIFY v36 — photographer search
--
-- Six checks, and two of them are behavioural rather than structural: they call
-- the function and look at what comes back.
--
--   Check 4 asserts that an unrated photographer comes back with a NULL rating
--   rather than a zero or a five. This is the bug the old client-side version
--   had: unrated defaulted to five stars, so a "4+ stars" filter matched
--   everybody and a control that looked like a quality signal did nothing.
--
--   Check 5 asserts that asking for four stars excludes the unrated. Being
--   shown people nobody has reviewed, after asking for four stars, is the
--   filter lying to you.
--
-- Every row must read PASS. ONE query.
-- =================================================================================
WITH probe_all AS (
  SELECT * FROM public.search_photographers(NULL, NULL, 0, FALSE, 'rating', 48, 0)
),
probe_rated AS (
  SELECT * FROM public.search_photographers(NULL, NULL, 4, FALSE, 'rating', 48, 0)
),
stats AS (
  SELECT
    (SELECT count(*) FROM probe_all)::INT   AS returned_all,
    (SELECT count(*) FROM probe_rated)::INT AS returned_rated,
    (SELECT count(*) FROM public.profiles
      WHERE COALESCE(role, account_type) = 'photographer'
        AND banned = false
        AND COALESCE(is_deactivated, false) = false)::INT AS findable_total
),
checks(n, ok, label) AS (

  SELECT 1, EXISTS (
           SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = 'search_photographers'
         ),
         'the function exists'

  UNION ALL
  SELECT 2, EXISTS (
           SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = 'search_photographers'
             AND p.prosecdef
             AND EXISTS (
               SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::TEXT[])) AS c(s)
               WHERE c.s LIKE 'search\_path=%'
             )
         ),
         'it is SECURITY DEFINER with a pinned search_path'

  UNION ALL
  SELECT 3, (
           SELECT count(*) FROM pg_indexes
           WHERE schemaname = 'public'
             AND indexname IN ('idx_profiles_findable', 'idx_profiles_service_categories',
                               'idx_profiles_specialties')
         ) = 3,
         'the filters it applies are indexed'

  UNION ALL
  SELECT 4, NOT EXISTS (
           SELECT 1 FROM probe_all WHERE review_count = 0 AND rating IS NOT NULL
         ),
         'AN UNRATED PHOTOGRAPHER COMES BACK UNRATED, NOT FIVE STARS'

  UNION ALL
  SELECT 5, NOT EXISTS (
           SELECT 1 FROM probe_rated
           WHERE review_count = 0 OR rating IS NULL OR rating < 4
         ),
         'A FOUR-STAR FILTER RETURNS ONLY PEOPLE WITH FOUR STARS'

  UNION ALL
  SELECT 6, NOT EXISTS (
           SELECT 1 FROM probe_all pa
           JOIN public.profiles pr ON pr.id = pa.id
           WHERE pr.banned OR COALESCE(pr.is_deactivated, false)
         ),
         'banned and deactivated accounts are not findable'
)
SELECT
  c.n,
  CASE WHEN c.ok THEN 'PASS' ELSE 'FAIL' END AS result,
  c.label,
  s.findable_total,
  s.returned_all,
  s.returned_rated
FROM checks c
CROSS JOIN stats s
ORDER BY c.n;
