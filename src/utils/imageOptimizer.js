/**
 * Dynamically resizes image URLs utilizing CDN parameters.
 * Supports both Unsplash API and Supabase Storage transformation query parameters.
 * 
 * @param {string} url Original image source URL
 * @param {number} width Target preview width (e.g. 600)
 * @param {number} quality Compression quality percentage (e.g. 80)
 * @returns {string} Optimized URL string
 */
export function getOptimizedImageUrl(url, width = 600, quality = 80) {
  if (!url) return '';

  // Unsplash CDN Optimization
  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('w', width.toString());
      parsed.searchParams.set('q', quality.toString());
      parsed.searchParams.set('fit', 'crop');
      return parsed.toString();
    } catch {
      return `${url}&w=${width}&q=${quality}&fit=crop`;
    }
  }

  // Supabase CDN Image Resizing Hook
  if (url.includes('supabase.co/storage/v1/object/public/photos')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('width', width.toString());
      parsed.searchParams.set('quality', quality.toString());
      return parsed.toString();
    } catch {
      return `${url}?width=${width}&quality=${quality}`;
    }
  }

  return url;
}
