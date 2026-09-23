import { describe, it, expect } from 'vitest';
import { entriesLeft, canEnter, callToAction, formatRemaining } from './brief';

describe('entriesLeft', () => {
  it('is zero when no brief is open, whatever the counts say', () => {
    expect(entriesLeft({ is_open: false, max_entries: 3, my_entries: 0 })).toBe(0);
    expect(entriesLeft(null)).toBe(0);
  });

  it('counts down from the cap the database sent', () => {
    expect(entriesLeft({ is_open: true, max_entries: 3, my_entries: 0 })).toBe(3);
    expect(entriesLeft({ is_open: true, max_entries: 3, my_entries: 2 })).toBe(1);
  });

  it('never goes negative when the server count is ahead of this screen', () => {
    expect(entriesLeft({ is_open: true, max_entries: 3, my_entries: 5 })).toBe(0);
  });

  it('falls back to three only when the cap is genuinely missing', () => {
    expect(entriesLeft({ is_open: true, my_entries: 1 })).toBe(2);
  });
});

describe('canEnter', () => {
  it('offers entry only while a brief is open and entries remain', () => {
    expect(canEnter({ is_open: true, max_entries: 3, my_entries: 0 })).toBe(true);
    expect(canEnter({ is_open: true, max_entries: 3, my_entries: 3 })).toBe(false);
    expect(canEnter({ is_open: false, max_entries: 3, my_entries: 0 })).toBe(false);
    expect(canEnter(undefined)).toBe(false);
  });
});

describe('callToAction', () => {
  it('changes state rather than saying the same thing forever', () => {
    expect(callToAction({ is_open: true, max_entries: 3, my_entries: 0 })).toEqual({ label: 'Shoot this', done: false });
    expect(callToAction({ is_open: true, max_entries: 3, my_entries: 1 })).toEqual({ label: 'Add another (2 left)', done: false });
    expect(callToAction({ is_open: true, max_entries: 3, my_entries: 2 })).toEqual({ label: 'Add another (1 left)', done: false });
    expect(callToAction({ is_open: true, max_entries: 3, my_entries: 3 })).toEqual({ label: "You're in", done: true });
  });

  it('has nothing to say about a closed brief', () => {
    expect(callToAction({ is_open: false })).toBeNull();
  });
});

describe('formatRemaining', () => {
  it('uses the largest honest unit', () => {
    expect(formatRemaining(3 * 86400 + 4 * 3600)).toBe('3d 4h left');
    expect(formatRemaining(5 * 3600 + 30 * 60)).toBe('5h 30m left');
    expect(formatRemaining(12 * 60)).toBe('12m left');
  });

  it('reads "closed" rather than counting through zero into negatives', () => {
    expect(formatRemaining(0)).toBe('closed');
    expect(formatRemaining(-500)).toBe('closed');
    expect(formatRemaining(undefined)).toBe('closed');
    expect(formatRemaining(null)).toBe('closed');
  });

  it('says closing now in the last minute instead of "0m left"', () => {
    expect(formatRemaining(40)).toBe('closing now');
  });
});
