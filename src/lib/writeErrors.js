/**
 * Turning a database refusal into a sentence a photographer can act on.
 *
 * Migration v24 enforces write limits in Postgres, because with no application
 * server the database is the only place a limit is actually a limit. The cost of
 * that choice is what a refusal looks like when it reaches the browser: a raw
 * PostgREST error, something like
 *
 *   'RATE_LIMIT: you have reached the limit for upload. Try again later.'
 *
 * which is a fine thing for a log and a terrible thing to show somebody who has
 * just spent ten minutes preparing a photograph. This maps it to plain English,
 * and leaves every other error alone rather than swallowing it.
 */

const LIMIT_COPY = {
  upload:  'You have reached today’s upload limit. It resets tomorrow — your work is safe, nothing was lost.',
  comment: 'You have posted a lot of comments in the last hour. Give it a little while.',
  follow:  'You have followed a lot of people today. Try again tomorrow.',
  like:    'You are liking faster than we can keep up. Give it a moment.',
  thread:  'You have started a lot of new conversations today. Existing ones still work — this resets tomorrow.',
  message: 'You have sent a lot of messages this hour. Give it a little while.',
};

/** True when the database refused this write because of a v24 limit. */
export function isRateLimitError(err) {
  const msg = typeof err === 'string' ? err : err?.message || '';
  return msg.includes('RATE_LIMIT:');
}

/**
 * A message worth showing a person.
 *
 * Returns the original text unchanged when the error is not a rate limit, so a
 * genuine failure is never disguised as one - a limiter that hides real bugs is
 * worse than no limiter.
 */
export function humaniseWriteError(err, fallback = 'Something went wrong. Try again.') {
  const msg = typeof err === 'string' ? err : err?.message || '';
  if (!msg) return fallback;
  if (!isRateLimitError(msg)) return msg;

  const action = msg.match(/limit for (\w+)/)?.[1];
  return LIMIT_COPY[action] || 'You have hit a limit on how often that can be done. Try again a little later.';
}
