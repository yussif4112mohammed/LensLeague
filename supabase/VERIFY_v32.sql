-- =================================================================================
-- VERIFY v32 — run AFTER migration_v32_photos_bucket_policy.sql. ONE query.
--
-- Check 1 is the finding closed. Check 2 is the one that matters going forward:
-- it asserts that NO write policy anywhere on storage.objects is missing a
-- caller check, so a policy added through the dashboard later - which is how
-- this one arrived - cannot quietly reopen the hole without failing here.
-- =================================================================================
WITH write_policies AS (
  SELECT policyname, cmd, COALESCE(with_check, qual, '') AS expr
    FROM pg_policies
   WHERE schemaname = 'storage'
     AND tablename  = 'objects'
     AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
),
checks AS (
  SELECT 1 AS n, 'the loose "Allow authenticated uploads" policy is gone' AS label,
         NOT EXISTS (SELECT 1 FROM pg_policies
                      WHERE schemaname = 'storage' AND tablename = 'objects'
                        AND policyname = 'Allow authenticated uploads') AS ok
  UNION ALL SELECT 2, 'EVERY write policy on storage now checks the caller',
         NOT EXISTS (SELECT 1 FROM write_policies
                      WHERE expr NOT ILIKE '%auth.uid()%')
  UNION ALL SELECT 3, 'its replacement scopes writes to the caller''s own folder',
         EXISTS (SELECT 1 FROM write_policies
                  WHERE policyname = 'photos_owner_write'
                    AND expr ILIKE '%foldername(name))[1]%')
  UNION ALL SELECT 4, 'the buckets the app actually uses are still writable by their owners',
         (SELECT COUNT(*) FROM write_policies
           WHERE expr ILIKE '%avatars%' OR expr ILIKE '%post-media%') >= 4
)
SELECT n,
       CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result,
       label,
       (SELECT COUNT(*) FROM write_policies) AS write_policies_total,
       (SELECT COUNT(*) FROM write_policies WHERE expr NOT ILIKE '%auth.uid()%') AS unchecked_remaining
  FROM checks
 ORDER BY (CASE WHEN ok THEN 1 ELSE 0 END), n;
