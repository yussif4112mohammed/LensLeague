/**
 * Turning something a user typed into a URL the browser will act on.
 *
 * Three places in this product build a URL out of a value a person controls:
 * the website link on a profile, and two `backgroundImage: url(...)`
 * interpolations behind a cover image. React escapes text; it does not escape
 * a string you hand to `href` or drop inside a CSS declaration.
 *
 * The profile link used to be guarded like this:
 *
 *     href: w.startsWith('http') ? w : `https://${w}`
 *
 * which happens to neutralise `javascript:` today, by accident, because the
 * prefix makes the scheme unparseable. That is not a control; it is a
 * coincidence that the next person to touch the line can remove without
 * noticing. An allow-list of schemes is a control.
 */

// Only these two ever reach an href or a CSS url(). Everything else - including
// javascript:, data:, vbscript:, file: and blob: - is refused rather than
// escaped, because there is no legitimate reason for a profile link to carry one.
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * A URL safe to put in an href, or null.
 *
 * Returns null rather than a fallback: a link that silently points somewhere
 * other than what the user typed is worse than no link at all.
 */
export function safeExternalUrl(value) {
  if (typeof value !== 'string') return null;

  // Strip control characters first. `java\tscript:alert(1)` is a real bypass
  // against naive scheme checks, because browsers ignore tabs and newlines
  // inside a scheme; URL parsing here does not, but the input may be compared
  // elsewhere and should be clean before anything looks at it.
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!cleaned) return null;

  // A bare domain is the common case - people type "studio.com", not a scheme.
  // Only assume https for something that has no scheme at all; never prepend a
  // scheme onto a string that already carries one, which is how "javascript:"
  // becomes "https://javascript:" and looks handled while the rule that was
  // supposed to catch it never ran.
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(cleaned)
    ? cleaned
    : `https://${cleaned}`;

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
  if (!parsed.hostname) return null;

  return parsed.toString();
}

/** What to show for a link: the URL without its scheme, or null. */
export function displayUrl(value) {
  const safe = safeExternalUrl(value);
  if (!safe) return null;
  return safe.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/**
 * A value safe to interpolate into `backgroundImage: url(...)`, or null.
 *
 * An inline style is a property assignment rather than a stylesheet, so a
 * hostile value cannot open a new rule - but it can still end the url() early
 * and append declarations, and it can point the browser at any host it likes.
 * The scheme check handles the second; refusing quotes, parentheses,
 * backslashes and whitespace handles the first.
 *
 * Callers use it as: `const bg = cssUrl(p.cover); style={bg ? { backgroundImage: bg } : undefined}`
 */
export function cssUrl(value) {
  const safe = safeExternalUrl(value);
  if (!safe) return null;
  if (/["'()\\\s]/.test(safe)) return null;
  return `url("${safe}")`;
}
