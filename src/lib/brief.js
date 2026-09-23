/**
 * The Brief — the pure parts.
 *
 * Kept out of the page component so they can be tested without a DOM, and so
 * the upload screen and the brief screen cannot drift into two different
 * answers to "how many entries do I have left".
 */

/** How many entries this photographer may still make in the open brief. */
export function entriesLeft(brief) {
  if (!brief?.is_open) return 0;
  const max = Number.isFinite(brief.max_entries) ? brief.max_entries : 3;
  const used = Number.isFinite(brief.my_entries) ? brief.my_entries : 0;
  return Math.max(0, max - used);
}

/** Whether entering should even be offered. */
export function canEnter(brief) {
  return Boolean(brief?.is_open) && entriesLeft(brief) > 0;
}

/**
 * The call to action, which changes state rather than staying "Enter" forever:
 * Shoot this -> Add another (n left) -> You're in.
 */
export function callToAction(brief) {
  if (!brief?.is_open) return null;
  const left = entriesLeft(brief);
  const used = Number.isFinite(brief.my_entries) ? brief.my_entries : 0;
  if (used === 0) return { label: 'Shoot this', done: false };
  if (left > 0) return { label: `Add another (${left} left)`, done: false };
  return { label: "You're in", done: true };
}

/**
 * Time left, in the largest honest unit.
 *
 * Never invents a number: a brief with no time left reads "closed" rather than
 * counting down through zero into negatives.
 */
export function formatRemaining(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return 'closed';
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days >= 1) return `${days}d ${hours}h left`;
  if (hours >= 1) return `${hours}h ${minutes}m left`;
  if (minutes >= 1) return `${minutes}m left`;
  return 'closing now';
}
