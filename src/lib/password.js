/**
 * Password quality, assessed in the browser.
 *
 * WHAT THIS IS NOT. It is not a security control. The browser holds the anon
 * key and talks to Supabase Auth directly, so anything checked here is checked
 * by something an attacker can skip. The control is Supabase's own minimum
 * length and its leaked-password check, both set in the dashboard.
 *
 * WHAT IT IS FOR. Telling somebody their password is weak at the moment they
 * choose it, rather than never. Signup currently accepts anything Supabase
 * accepts, with no feedback at all, which is how a platform ends up full of
 * accounts secured by the owner's own username.
 *
 * The rules are the ones that actually correlate with compromise - length,
 * reuse of the account's own identifiers, and the handful of passwords that
 * appear at the top of every breach corpus - rather than the character-class
 * theatre that pushes people towards "Password1!".
 */

const MIN_LENGTH = 10;

// Not a dictionary. These are the shapes that appear in the first hundred
// guesses of any credential-stuffing run, plus the ones this product invites.
const OBVIOUS = [
  'password', 'passw0rd', '12345678', '123456789', '1234567890', 'qwerty',
  'qwertyuiop', 'letmein', 'welcome', 'admin', 'iloveyou', 'monkey',
  'dragon', 'football', 'abc123', 'photography', 'photographer', 'lensleague',
  'camera', 'canon', 'nikon'
];

/**
 * @param {string} password
 * @param {{email?: string, username?: string, name?: string}} identity
 */
export function assessPassword(password, identity = {}) {
  const value = typeof password === 'string' ? password : '';
  const problems = [];

  if (value.length < MIN_LENGTH) {
    problems.push(`Use at least ${MIN_LENGTH} characters.`);
  }

  const lower = value.toLowerCase();

  if (OBVIOUS.some(word => lower.includes(word))) {
    problems.push('This contains a word that appears in every password-guessing list.');
  }

  // A password built from the account it protects is the first thing tried.
  const parts = [
    identity.username,
    identity.name,
    typeof identity.email === 'string' ? identity.email.split('@')[0] : null
  ]
    .filter(p => typeof p === 'string' && p.trim().length >= 3)
    .map(p => p.trim().toLowerCase());

  if (parts.some(p => lower.includes(p))) {
    problems.push('Do not use your own name, username or email in your password.');
  }

  if (value.length > 0 && new Set(value).size <= 3) {
    problems.push('This repeats too few different characters.');
  }

  // Length first, variety second - which is the order that matters. A long
  // passphrase of only lowercase letters beats a short one with a symbol in it.
  const variety =
    (/[a-z]/.test(value) ? 1 : 0) +
    (/[A-Z]/.test(value) ? 1 : 0) +
    (/[0-9]/.test(value) ? 1 : 0) +
    (/[^a-zA-Z0-9]/.test(value) ? 1 : 0);

  let score = 0;
  if (value.length >= MIN_LENGTH) score += 1;
  if (value.length >= 14) score += 1;
  if (value.length >= 20) score += 1;
  if (variety >= 2) score += 1;
  if (variety >= 3) score += 1;
  if (problems.length > 0) score = Math.min(score, 1);
  score = Math.max(0, Math.min(4, score));

  return {
    score,
    label: ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][score],
    problems,
    // The bar for proceeding is the absence of a known problem, not a high
    // score. Refusing a long, fine password because it has no symbol in it
    // teaches people to write their password on a sticky note.
    acceptable: problems.length === 0
  };
}

export const PASSWORD_MIN_LENGTH = MIN_LENGTH;
