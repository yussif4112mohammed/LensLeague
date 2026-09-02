import { useState } from 'react';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';
import { cn } from '@/lib/utils';

/**
 * One image element for photography surfaces.
 *
 * It exists because three separate problems were showing up as "the feed feels
 * slow", and each needed the same three lines in every <img> in the app:
 *
 *   1. Full-resolution originals were being downloaded for thumbnails, because
 *      the optimizer matched the wrong storage bucket. `width` now drives a real
 *      CDN resize.
 *
 *   2. Images arrived with no reserved space, so every one that loaded shoved
 *      the rest of the feed downwards. `aspectRatio` reserves the box before the
 *      bytes arrive, which is what makes scrolling feel settled rather than
 *      jumpy. This is cumulative layout shift, and it reads to a user as
 *      slowness even when the network is fine.
 *
 *   3. Supabase image transformation is a paid feature. If it is not enabled,
 *      the resize endpoint 400s and the photograph would simply not appear.
 *      `onError` falls back to the untransformed original exactly once, so the
 *      picture always shows.
 *
 * `priority` marks the one image that is on screen at first paint: it opts out
 * of lazy loading and asks the browser to fetch it early. Everything else stays
 * lazy.
 */
export default function SmartImage({
  src,
  alt = '',
  width = 900,
  quality = 80,
  aspectRatio,
  priority = false,
  className,
  wrapperClassName,
  onClick,
  ...rest
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src) {
    return (
      <div
        className={cn('bg-muted', wrapperClassName)}
        style={aspectRatio ? { aspectRatio } : undefined}
        aria-hidden="true"
      />
    );
  }

  // On failure, fall back to the original URL rather than showing nothing.
  const resolved = failed ? src : getOptimizedImageUrl(src, width, quality);

  return (
    <div
      className={cn('relative overflow-hidden bg-muted', wrapperClassName)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      <img
        src={resolved}
        alt={alt}
        onClick={onClick}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchpriority={priority ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        onError={() => {
          // Only retry once, and only to the untransformed original.
          if (!failed) setFailed(true);
        }}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...rest}
      />
    </div>
  );
}
