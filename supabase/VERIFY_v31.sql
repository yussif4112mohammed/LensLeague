-- =================================================================================
-- VERIFY v31 — run AFTER migration_v31_review_aggregates.sql. ONE query.
--
-- Check 4 is the behavioural one: it compares the stored figures against the
-- actual review rows. With an empty reviews table it passes trivially, and it
-- keeps passing only if the trigger really fires - which is the assertion that
-- matters, because a trigger silently reverted by the profile guard would look
-- installed and do nothing.
-- =================================================================================
WITH checks AS (
  SELECT 1 AS n, 'the aggregate trigger exists on reviews' AS label,
         EXISTS (SELECT 1 FROM pg_trigger
                  WHERE tgname = 'trg_sync_profile_review_stats'
                    AND tgrelid = 'public.reviews'::regclass
                    AND NOT tgisinternal) AS ok
  UNION ALL SELECT 2, 'it announces itself to the profile guard',
         (SELECT prosrc LIKE '%lensleague.engine_write%'
            FROM pg_proc WHERE proname = 'sync_profile_review_stats')
  UNION ALL SELECT 3, 'a review still requires a completed booking you were party to',
         (SELECT prosrc LIKE '%completed%'
            FROM pg_proc WHERE proname = 'can_review_booking')
  UNION ALL SELECT 4, 'STORED review_count MATCHES the real review rows, for every profile',
         NOT EXISTS (
           SELECT 1 FROM public.profiles p
            WHERE COALESCE(p.review_count, 0) <>
                  (SELECT COUNT(*) FROM public.reviews r WHERE r.reviewee_id = p.id))
  UNION ALL SELECT 5, 'stored rating matches the real average',
         NOT EXISTS (
           SELECT 1 FROM public.profiles p
            WHERE COALESCE(p.rating, -1) IS DISTINCT FROM
                  COALESCE((SELECT ROUND(AVG(r.rating)::NUMERIC, 2)
                              FROM public.reviews r WHERE r.reviewee_id = p.id), -1)
              AND (SELECT COUNT(*) FROM public.reviews r WHERE r.reviewee_id = p.id) > 0)
  UNION ALL SELECT 6, 'no rating sits outside 1 to 5',
         NOT EXISTS (SELECT 1 FROM public.reviews WHERE rating < 1 OR rating > 5)
  UNION ALL SELECT 7, 'nobody has reviewed themselves',
         NOT EXISTS (SELECT 1 FROM public.reviews WHERE reviewer_id = reviewee_id)
)
SELECT n,
       CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result,
       label,
       (SELECT COUNT(*) FROM public.reviews) AS reviews_total,
       (SELECT COUNT(*) FROM public.bookings WHERE status = 'completed') AS bookings_completed
  FROM checks
 ORDER BY (CASE WHEN ok THEN 1 ELSE 0 END), n;
