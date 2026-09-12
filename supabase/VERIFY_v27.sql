-- =================================================================================
-- VERIFY v27 — run AFTER migration_v27_reviews.sql. ONE query.
-- Shape only. The proof is a real review on a real completed booking, and there
-- are no bookings yet - see the note at the bottom.
-- =================================================================================
WITH checks AS (
  SELECT 1 AS n, 'a review can be READ - this was missing' AS label,
         EXISTS (SELECT 1 FROM pg_policies
                  WHERE tablename='reviews' AND cmd='SELECT') AS ok
  UNION ALL SELECT 2, 'a review can be WRITTEN - this was missing',
         EXISTS (SELECT 1 FROM pg_policies
                  WHERE tablename='reviews' AND cmd='INSERT')
  UNION ALL SELECT 3, 'anyone may read them, which is the point of a review',
         EXISTS (SELECT 1 FROM pg_policies
                  WHERE tablename='reviews' AND cmd='SELECT'
                    AND 'anon' = ANY(roles))
  UNION ALL SELECT 4, 'only a party to the booking may write one',
         EXISTS (SELECT 1 FROM pg_policies
                  WHERE tablename='reviews' AND cmd='INSERT'
                    AND COALESCE(with_check,'') LIKE '%can_review_booking%')
  UNION ALL SELECT 5, 'and only about the other party, on a completed booking',
         (SELECT prosrc LIKE '%completed%' AND prosrc LIKE '%photographer_id%'
                        AND prosrc LIKE '%client_id%'
            FROM pg_proc WHERE proname = 'can_review_booking')
  UNION ALL SELECT 6, 'the helper is DEFINER with a pinned search_path',
         EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace nsp ON nsp.oid=p.pronamespace
                  WHERE nsp.nspname='public' AND p.proname='can_review_booking'
                    AND p.prosecdef
                    AND EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,'{}')) c
                                 WHERE c LIKE 'search_path=%'))
  UNION ALL SELECT 7, 'one review per booking per person',
         EXISTS (SELECT 1 FROM pg_indexes
                  WHERE tablename='reviews'
                    AND indexname='reviews_one_per_booking_per_reviewer')
  UNION ALL SELECT 8, 'a rating must be 1 to 5',
         EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid='public.reviews'::regclass
                    AND conname='reviews_rating_1_to_5')
  UNION ALL SELECT 9, 'an edit cannot move a review to another booking or person',
         EXISTS (SELECT 1 FROM pg_trigger
                  WHERE NOT tgisinternal AND tgname='trg_guard_review_identity')
  UNION ALL SELECT 10, 'the UPDATE policy judges the row it becomes, not only the row it was',
         EXISTS (SELECT 1 FROM pg_policies
                  WHERE tablename='reviews' AND cmd='UPDATE'
                    AND with_check IS NOT NULL)
  UNION ALL SELECT 11, 'anon cannot write a review',
         NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                      WHERE table_name='reviews' AND grantee='anon'
                        AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE'))
  UNION ALL SELECT 12, 'reading a photographer''s reviews is indexed',
         EXISTS (SELECT 1 FROM pg_indexes
                  WHERE tablename='reviews' AND indexname='reviews_reviewee_idx')
  UNION ALL SELECT 13, 'no table in public is RLS-locked against its own app',
         (SELECT COUNT(*) FROM public.audit_rls_without_policies()) = 0
)
SELECT n AS "#", label AS check,
       CASE WHEN ok THEN 'PASS' ELSE '*** FAIL ***' END AS result
FROM checks ORDER BY n;

-- =================================================================================
-- WHY THIS ONE CANNOT BE PROVEN IN THE APP YET
--
-- A review requires a COMPLETED booking, and bookings has 0 rows - the
-- marketplace has never been used. So unlike v25 and v26, there is no "go and
-- do it in the app" step available today.
--
-- The honest test, when there is a booking:
--   1. A client books a photographer; the photographer accepts; mark it completed.
--   2. The client writes a review. It saves.
--   3. Sign out entirely. The review is still visible on that photographer -
--      that is check 3 doing its job.
--   4. As a third person, try to review that same booking. It must be refused.
--
-- Until step 4 has been refused with somebody's own hands, treat this migration
-- as structurally correct and behaviourally unproven. Thirteen green rows here
-- mean the policies exist, which is what VERIFY_v18 meant while messaging was
-- completely broken.
-- =================================================================================
