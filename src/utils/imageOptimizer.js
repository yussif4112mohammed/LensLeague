/**
 * Rewrites an image URL so the CDN serves a right-sized version instead of the
 * full-resolution original.
 *
 * Why this file changed:
 *
 * 1. The Supabase branch matched the bucket `photos`, but LensLeague uploads to
 *    `post-media` (avatars go to `avatars`). It therefore never fired on a
 *    single real user photograph - only on the Unsplash placeholder data. The
 *    feed was serving originals at full resolution.
 *
 * 2. It appended `?width=` to `/storage/v1/object/public/...`, which Supabase
 *    ignores. Transformation is a different endpoint: `/render/image/public/`.
 *
 * NOTE ON PLANS: Supabase image transformation is a paid feature. On the free
 * tier `/render/image/` responds 400. Callers must therefore render with
 * `onError` falling back to the original URL - see `SmartImage` below - so the
 * photograph still appears either way. Nothing here breaks if the feature is
 * off; it simply stops saving bandwidth.
 *
 * @param {string} url      Original image URL
 * @param {number} width    Target width in CSS pixels (the DPR multiplier is applied here)
 * @param {number} quality  1-100
 * @returns {string} A URL the CDN can resize, or the original when it cannot
 */

const TRANSFORMABLE_BUCKETS = ['post-media', 'avatars', 'photos'];

export function getOptimizedImageUrl(url, width = 600, quality = 80) {
  if (!url || typeof url !== 'string') return '';

  // Serve a sharper file to high-density screens, capped so we never request
  // something absurd for a 3x phone.
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const targetWidth = Math.round(width * dpr);

  // ---- Unsplash (placeholder/demo imagery) --------------------------------
  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('w', String(targetWidth));
      parsed.searchParams.set('q', String(quality));
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      return parsed.toString();
    } catch {
      return `${url}&w=${targetWidth}&q=${quality}&fit=crop`;
    }
  }

  // ---- Supabase Storage ----------------------------------------------------
  if (url.includes('/storage/v1/object/public/')) {
    const bucket = url.split('/storage/v1/object/public/')[1]?.split('/')[0];
    if (!TRANSFORMABLE_BUCKETS.includes(bucket)) return url;
    try {
      const parsed = new URL(url);
      // /object/public/<bucket>/<path>  ->  /render/image/public/<bucket>/<path>
      parsed.pathname = parsed.pathname.replace(
        '/storage/v1/object/public/',
        '/storage/v1/render/image/public/'
      );
      parsed.searchParams.set('width', String(targetWidth));
      parsed.searchParams.set('quality', String(quality));
      parsed.searchParams.set('resize', 'cover');
      return parsed.toString();
    } catch {
      return url;
    }
  }

  return url;
}

/**
 * Width to request for a given surface. Kept in one place so the feed, the
 * gallery grid and avatars cannot drift apart.
 */
export const IMAGE_SIZES = {
  avatarSmall: 64,
  avatarLarge: 160,
  gridTile: 400,
  feedPost: 900,
  lightbox: 1600,
};
