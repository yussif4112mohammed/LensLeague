-- =================================================================================
-- VERIFY MIGRATION V19 — run AFTER migration_v19_storage_constraints.sql
-- Read only. Every row should say PASS.
-- =================================================================================

WITH b AS (SELECT * FROM storage.buckets),
checks(n, label, ok) AS (VALUES

  (1, 'photos has a size limit',
      (SELECT file_size_limit IS NOT NULL FROM b WHERE id = 'photos')),

  (2, 'photos size limit is 15 MiB',
      (SELECT file_size_limit = 15728640 FROM b WHERE id = 'photos')),

  (3, 'photos has a MIME allow-list',
      (SELECT allowed_mime_types IS NOT NULL FROM b WHERE id = 'photos')),

  (4, 'photos accepts JPEG (a real photograph still would)',
      (SELECT 'image/jpeg' = ANY(allowed_mime_types) FROM b WHERE id = 'photos')),

  -- The point of the whole migration: the two things that turn a bucket into an
  -- XSS foothold must not be on the list.
  (5, 'photos refuses text/html',
      (SELECT NOT ('text/html' = ANY(allowed_mime_types)) FROM b WHERE id = 'photos')),

  (6, 'photos refuses image/svg+xml',
      (SELECT NOT ('image/svg+xml' = ANY(allowed_mime_types)) FROM b WHERE id = 'photos')),

  -- Regression guards: v19 must not have disturbed the buckets the app uses.
  (7, 'post-media still constrained (untouched)',
      (SELECT file_size_limit IS NOT NULL AND allowed_mime_types IS NOT NULL
         FROM b WHERE id = 'post-media')),

  (8, 'avatars still constrained (untouched)',
      (SELECT file_size_limit IS NOT NULL AND allowed_mime_types IS NOT NULL
         FROM b WHERE id = 'avatars')),

  -- The audit's own S7 rule, re-run: no bucket anywhere may be unconstrained.
  (9, 'no bucket is left without a MIME list or size limit',
      NOT EXISTS (SELECT 1 FROM b
                   WHERE allowed_mime_types IS NULL OR file_size_limit IS NULL))
)
SELECT n AS "#",
       label AS check,
       CASE WHEN ok THEN 'PASS' ELSE '*** FAIL ***' END AS result
  FROM checks
 ORDER BY n;
