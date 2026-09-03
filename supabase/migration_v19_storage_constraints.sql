-- =================================================================================
-- LENSLEAGUE MIGRATION V19: STORAGE CONSTRAINTS
-- ---------------------------------------------------------------------------------
-- The one finding from the v14-v18 security audit that v18 did not close.
--
--   S7  MEDIUM  The `photos` bucket has no MIME allow-list and no size limit.
--
-- ── WHAT THE AUDIT ACTUALLY FOUND ────────────────────────────────────────────
-- Three buckets exist. Only one failed:
--
--   avatars      constrained already. Written by uploadAvatar().
--   post-media   constrained already. Written by every real photo and video
--                upload, and additionally gated client-side by EXT_BY_TYPE in
--                AppContext.
--   photos       NO constraints. Written by NOTHING.
--
-- That last line is the whole risk assessment. `supabase.from('photos')` in the
-- client is the legacy *table*, not the bucket; the bucket is a leftover from
-- before uploads moved to post-media. So it is an unauthenticated-shaped hole
-- with no legitimate traffic through it — which also means constraining it
-- cannot break a single working code path. There is nothing to regress.
--
-- ── WHY AN OPEN BUCKET MATTERS ───────────────────────────────────────────────
-- No MIME allow-list: the bucket accepts an .html upload, and Supabase serves a
-- stored object with the content type it was stored under. A page served from
-- your own storage origin is a cross-site scripting foothold that no CSP in
-- vercel.json can help with, because the file genuinely is on an allowed origin.
--
-- No size limit: one request can store an arbitrarily large object. On a free
-- tier that is a billing incident, and it needs no account and no cleverness.
--
-- ── DECISIONS, AND WHY THESE VALUES ──────────────────────────────────────────
--
-- 1. STILLS ONLY, AND NO SVG.
--    photos is a stills bucket, so no video types. SVG is excluded
--    deliberately and permanently: an SVG is an XML document that may carry
--    <script>, so allowing it re-opens exactly the hole this migration closes.
--    If a future feature needs vector assets, they belong in their own bucket
--    served from a different origin, not here.
--
-- 2. THE LIST MIRRORS WHAT THE APP ALREADY ACCEPTS.
--    JPEG, PNG, WebP, AVIF, HEIC/HEIF are the image half of EXT_BY_TYPE in
--    AppContext. Keeping one vocabulary means a photograph that uploads
--    through post-media today would also be valid here, so wiring this bucket
--    up later needs no second decision. HEIF is listed alongside HEIC because
--    iOS reports either depending on version.
--
-- 3. 15 MB.
--    Comfortably above a full-frame JPEG or a HEIC burst frame, and below a
--    RAW file or a mistaken video. imageOptimizer downscales on the way in, so
--    a real upload lands far under this; the ceiling exists to bound the damage
--    of an abusive one, not to shape normal use.
--
-- 4. VISIBILITY IS LEFT EXACTLY AS IT IS.
--    Making an unused public bucket private is tempting and is the one change
--    here that could break something: any seeded or legacy row still pointing
--    at a /object/public/photos/ URL would start 404ing, and this migration
--    cannot see those rows. Constraining what may ENTER a bucket is safe;
--    changing who may READ it is not. Left alone on purpose.
--
-- Requires nothing. Touches no table the app reads. Safe to run more than once.
-- =================================================================================

BEGIN;

-- storage.buckets is owned by the storage extension, so this is an UPDATE of
-- configuration rather than DDL of our own. Scoped to the one bucket by id;
-- avatars and post-media are already constrained and are not touched, because
-- silently rewriting a working bucket's limits is how you break uploads while
-- believing you hardened them.
UPDATE storage.buckets
   SET allowed_mime_types = ARRAY[
         'image/jpeg',
         'image/png',
         'image/webp',
         'image/avif',
         'image/heic',
         'image/heif'
       ],
       file_size_limit = 15728640   -- 15 MiB
 WHERE id = 'photos';

-- Report the resulting state of every bucket, so the person running this sees
-- what the database now believes rather than what this file intended.
DO $do$
DECLARE
  b RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'photos') THEN
    RAISE NOTICE 'photos bucket does not exist — nothing to constrain, and nothing is broken';
  END IF;

  FOR b IN SELECT id, public, file_size_limit, allowed_mime_types
             FROM storage.buckets ORDER BY id
  LOOP
    RAISE NOTICE 'bucket % | public=% | size_limit=% | mime=%',
      rpad(b.id, 12),
      b.public,
      COALESCE(b.file_size_limit::text, 'UNLIMITED'),
      COALESCE(array_to_string(b.allowed_mime_types, ','), 'ANY');
  END LOOP;
END
$do$;

COMMIT;
