-- =================================================================================
-- migration v32 — close the one loose storage policy
--
-- THE FINDING
--
-- CHECK_storage_policies.sql printed every policy expression on storage.objects.
-- Twelve of the thirteen are right: avatars, post-media and post-originals all
-- gate INSERT, UPDATE and DELETE on
--
--     (storage.foldername(name))[1] = (auth.uid())::text
--
-- so a caller may only write inside a folder named after their own user id.
-- Those policies are granted to the `public` role, which includes anon, and
-- that is harmless precisely because of this check: auth.uid() is NULL for a
-- signed-out caller and the comparison never matches.
--
-- The thirteenth, created through the dashboard and named "Allow authenticated
-- uploads", checks only:
--
--     (bucket_id = 'photos')
--
-- No folder check, no owner check. Any signed-in user could upload to any path
-- in that bucket, including over another user's files. Sign-up is free and open,
-- so "authenticated" is effectively anyone prepared to register.
--
-- SEVERITY, HONESTLY
--
-- Moderate, not urgent. It needs an account rather than a bare anon key, and
-- nothing in the product uses this bucket: the only two bucket names anywhere
-- in src/ are `avatars` and `post-media`. So the exposure is an unused bucket
-- usable as free file hosting under the project's domain, and as a way to eat
-- the storage quota - not a path to anyone's photographs.
--
-- WHY TIGHTEN RATHER THAN DELETE
--
-- Deleting the bucket is the real answer, since the `photos` TABLE it belongs to
-- is one of the three duplicate photo tables due to be collapsed, and both
-- should go together. But dropping a bucket destroys whatever is in it, and
-- that is not a thing to do inside a migration at the end of a long session.
-- This closes the hole now; the bucket goes with the table later.
--
-- The UPDATE policy on the same bucket is left alone - it already checks
-- `auth.uid() = owner`, which is correct.
-- =================================================================================

BEGIN;

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;

-- Named and shaped like its siblings, so the next person reading the policy
-- list sees one pattern rather than an exception.
CREATE POLICY photos_owner_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

COMMIT;
