/**
 * Photography identity: the platform's category, and the photographer's own style.
 *
 * THE PROBLEM THIS SOLVES
 * There were four separate hardcoded category lists in the app - 8 items in
 * AuthPages, 10 in UploadPage, 13 in DiscoverPage and 6 in ClientSearch - while
 * a real `categories` table sat in the database, seeded with 10 rows, queried by
 * nothing. The lists disagreed: a photo uploaded as "Documentary" was
 * unfilterable in client search, and a client filtering "Commercial" matched
 * nothing at all, because no other list contained it.
 *
 * THE SHAPE
 *   Category       platform-controlled, closed set, from the categories table.
 *                  This is what battles match on, what clients filter by, and
 *                  what the product can reason about.
 *
 *   Personal style photographer-owned free text - "Crazy Portrait". It is a
 *                  LABEL, deliberately not a taxonomy node: nothing filters or
 *                  matches on it, so it can never become an uncontrolled
 *                  taxonomy the platform has to maintain. It is validated and
 *                  sanitised, and it belongs to the photographer.
 *
 * Keeping those two ideas separate is the whole design. The category stays
 * governable; the style stays expressive.
 */

/**
 * Fallback only. The live list comes from the `categories` table via
 * AppContext. This mirrors the seeded rows so the UI still works if that query
 * fails, and so tests do not need a database.
 */
export const FALLBACK_CATEGORIES = [
  'Portrait', 'Street', 'Wildlife', 'Fashion', 'Sports',
  'Landscape', 'Wedding', 'Documentary', 'Product', 'Editorial',
];

export const PERSONAL_STYLE_MAX = 40;
export const PERSONAL_STYLE_MIN = 2;

/**
 * Validate and sanitise a photographer's personal style.
 *
 * Rules, and why each exists:
 *   - strip HTML tags and control characters  → it is rendered next to their
 *     name across the app; nothing markup-shaped should survive input
 *   - reject anything URL-like                → a style label is not an ad slot
 *   - collapse runs of whitespace             → "Crazy    Portrait" and
 *     "Crazy Portrait" are the same style and should not read as two
 *   - allow letters (any alphabet), digits, spaces, hyphen, apostrophe, &
 *     → "Black & White", "Nature's Edge", "35mm Street" are all legitimate;
 *       Ghanaian, Arabic and CJK names must work as well as Latin ones
 *   - cap at 40 characters                    → it sits inline under a name
 *
 * @returns {{ok: boolean, value: string, error: string|null}}
 */
export function validatePersonalStyle(input) {
  if (input == null || input === '') {
    return { ok: true, value: '', error: null }; // optional field
  }

  let value = String(input)
    .replace(/<[^>]*>/g, '')                      // markup
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, '')     // control characters
    .replace(/\s+/g, ' ')                         // collapse whitespace
    .trim();

  if (!value) {
    return { ok: true, value: '', error: null };
  }

  if (/https?:\/\/|www\.|\.[a-z]{2,}\/|@/i.test(value)) {
    return { ok: false, value, error: 'Style names cannot contain links or addresses.' };
  }

  if (value.length < PERSONAL_STYLE_MIN) {
    return { ok: false, value, error: 'That is a little short — try at least 2 characters.' };
  }

  if (value.length > PERSONAL_STYLE_MAX) {
    return {
      ok: false,
      value: value.slice(0, PERSONAL_STYLE_MAX),
      error: `Keep it under ${PERSONAL_STYLE_MAX} characters.`,
    };
  }

  // \p{L} covers every alphabet, not just A-Z.
  if (!/^[\p{L}\p{N} '\-&/]+$/u.test(value)) {
    return { ok: false, value, error: 'Use letters, numbers, spaces, hyphens and apostrophes.' };
  }

  return { ok: true, value, error: null };
}

/**
 * Is this a category the platform recognises? Used before anything is written,
 * so an edited request cannot introduce a category out of thin air.
 */
export function isKnownCategory(name, categories = FALLBACK_CATEGORIES) {
  if (!name) return false;
  return categories.some(c => String(c).toLowerCase() === String(name).toLowerCase());
}

/**
 * How a photographer's identity reads in one line, e.g.
 *   "Crazy Portrait · Portrait"      when they have made the style their own
 *   "Portrait"                       when they have not
 * The personal style leads, because that is the part that is theirs.
 */
export function describeStyle({ category, personalStyle }) {
  const style = (personalStyle || '').trim();
  const cat = (category || '').trim();
  if (style && cat && style.toLowerCase() !== cat.toLowerCase()) return `${style} · ${cat}`;
  return style || cat || '';
}
