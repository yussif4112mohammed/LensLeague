/**
 * One answer to "what picture goes next to this person's name".
 *
 * THE BUG THIS EXISTS TO PREVENT
 * The inbox showed two different faces for the same person on one screen. The
 * conversation list fell back to ui-avatars.com - an external service that
 * renders initials, with background=random, so the colour changed on reload -
 * while the chat header did something worse:
 *
 *   src={isPhotographer ? 'https://images.unsplash.com/photo-1544005313-...'
 *                       : selectedThread.photographerAvatar}
 *
 * A hardcoded stock photograph of a stranger, shown unconditionally, ignoring
 * the real person's avatar even when they had one. A photographer updated his
 * profile picture, said so in the chat, and the header kept showing a woman he
 * has never met. That is not a placeholder; it is asserting a false thing about
 * a real user.
 *
 * So: this module returns the person's actual picture, or nothing. When there is
 * nothing, the caller renders initials with the component library's own
 * AvatarFallback - no third-party request, no invented face, and the same letter
 * on every screen.
 */

/**
 * The real picture, or null.
 *
 * Reads every spelling the schema has accumulated (profiles.avatar_url is
 * canonical; avatar predates it; the thread objects carry their own flattened
 * copies) and refuses anything that is not a usable URL.
 */
export function avatarUrlOf(...candidates) {
  for (const c of candidates) {
    if (!c) continue;
    const url = typeof c === 'string' ? c.trim() : '';
    if (!url) continue;
    // A stock photo hardcoded in the source is not this person's face. Reject
    // the old fallbacks explicitly so reintroducing one is visibly wrong rather
    // than quietly plausible.
    if (url.includes('images.unsplash.com')) continue;
    if (url.includes('ui-avatars.com')) continue;
    if (url.startsWith('http') || url.startsWith('/') || url.startsWith('data:')) return url;
  }
  return null;
}

/**
 * One or two letters for the fallback.
 *
 * Two initials where a name offers them, because a wall of conversations all
 * reading "E" is no more useful than a wall of blanks.
 */
export function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
