import { describe, it, expect } from 'vitest';
import { isRateLimitError, humaniseWriteError } from './writeErrors';

const raw = (action) =>
  new Error(`RATE_LIMIT: you have reached the limit for ${action}. Try again later.`);

describe('isRateLimitError', () => {
  it('recognises a v24 refusal', () => {
    expect(isRateLimitError(raw('upload'))).toBe(true);
    expect(isRateLimitError('RATE_LIMIT: ...')).toBe(true);
  });

  it('does not claim ordinary failures', () => {
    expect(isRateLimitError(new Error('duplicate key value'))).toBe(false);
    expect(isRateLimitError(null)).toBe(false);
    expect(isRateLimitError(undefined)).toBe(false);
  });
});

describe('humaniseWriteError', () => {
  it('says what happened and when it clears', () => {
    expect(humaniseWriteError(raw('upload'))).toMatch(/upload limit/i);
    expect(humaniseWriteError(raw('upload'))).toMatch(/resets tomorrow/i);
    expect(humaniseWriteError(raw('thread'))).toMatch(/conversations/i);
  });

  it('never blames the photographer for losing work', () => {
    expect(humaniseWriteError(raw('upload'))).toMatch(/nothing was lost/i);
  });

  it('passes a real error through untouched, rather than disguising it', () => {
    // A limiter that hides genuine bugs is worse than no limiter.
    expect(humaniseWriteError(new Error('column "gear" does not exist')))
      .toBe('column "gear" does not exist');
  });

  it('falls back only when there is genuinely no message', () => {
    expect(humaniseWriteError(null)).toBe('Something went wrong. Try again.');
    expect(humaniseWriteError({}, 'custom')).toBe('custom');
  });

  it('copes with an action it has no copy for', () => {
    expect(humaniseWriteError(raw('somethingnew'))).toMatch(/hit a limit/i);
  });
});
