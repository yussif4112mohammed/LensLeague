-- =================================================================================
-- CHECK: what the storage policies actually SAY
--
-- The dashboard lists policy names and the role they apply to, and neither
-- answers the question that matters. Most of these are "Applied to: public",
-- which in Postgres includes anon - signed-out visitors - so whether a stranger
-- can upload into the bucket depends entirely on the expression inside each
-- policy, which that screen does not show.
--
-- WHAT GOOD LOOKS LIKE. Every INSERT / UPDATE / DELETE policy should carry a
-- check tying the object's first folder segment to the caller, along the lines of
--
--     (storage.foldername(name))[1] = auth.uid()::text
--
-- With that, "Applied to: public" is harmless: auth.uid() is NULL for a
-- signed-out caller, so the comparison never matches and the write is refused.
-- Without it, a write policy granted to public is open to anyone with the
-- project's anon key - which is published in the browser bundle by design.
--
-- WHAT BAD LOOKS LIKE. A with_check of `true`, or NULL, on any INSERT, UPDATE or
-- DELETE row below. SELECT being open is fine and intended: these are public
-- buckets and the photographs are meant to be visible.
--
-- ONE query, because the SQL editor only shows the last statement's result.
-- =================================================================================
SELECT
  p.policyname,
  p.cmd,
  p.roles::TEXT                                  AS applies_to,
  CASE
    WHEN p.cmd = 'SELECT' THEN 'n/a - public read is intended'
    WHEN COALESCE(p.with_check, p.qual, '') ILIKE '%auth.uid()%' THEN 'OK - checks the caller'
    WHEN COALESCE(p.with_check, p.qual, 'true') IN ('true', '') THEN 'OPEN - anyone can do this'
    ELSE 'REVIEW - no auth.uid() in the expression'
  END                                            AS verdict,
  COALESCE(p.qual, '-')                          AS using_expression,
  COALESCE(p.with_check, '-')                    AS with_check_expression
FROM pg_policies p
WHERE p.schemaname = 'storage'
  AND p.tablename  = 'objects'
ORDER BY
  CASE p.cmd WHEN 'INSERT' THEN 1 WHEN 'UPDATE' THEN 2 WHEN 'DELETE' THEN 3 ELSE 4 END,
  p.policyname;
