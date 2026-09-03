import { describe, it, expect } from 'vitest';
import {
  validatePersonalStyle,
  isKnownCategory,
  describeStyle,
  FALLBACK_CATEGORIES,
  PERSONAL_STYLE_MAX,
} from './photography';

describe('validatePersonalStyle', () => {
  it('accepts a normal style', () => {
    const r = validatePersonalStyle('Crazy Portrait');
    expect(r.ok).toBe(true);
    expect(r.value).toBe('Crazy Portrait');
  });

  it('collapses whitespace so one style cannot masquerade as two', () => {
    expect(validatePersonalStyle('  Crazy   Portrait  ').value).toBe('Crazy Portrait');
  });

  it('allows the punctuation photographers actually use', () => {
    for (const s of ['Black & White', "Nature's Edge", '35mm Street', 'Low-Key', 'Half/Light']) {
      expect(validatePersonalStyle(s).ok, s).toBe(true);
    }
  });

  it('allows non-Latin alphabets', () => {
    // A Ghanaian, Arabic or Japanese photographer must be able to name their
    // own style. \p{L} rather than A-Z is the whole point.
    for (const s of ['Kwabena Portrait', 'صورة', '肖像写真']) {
      expect(validatePersonalStyle(s).ok, s).toBe(true);
    }
  });

  it('strips markup rather than storing it', () => {
    const r = validatePersonalStyle('<b>Bold</b> Portrait');
    expect(r.value).not.toContain('<');
    expect(r.value).toBe('Bold Portrait');
  });

  it('rejects a style that is really an advert', () => {
    for (const s of ['visit http://spam.com', 'www.me.com', 'dm @handle']) {
      expect(validatePersonalStyle(s).ok, s).toBe(false);
    }
  });

  it('rejects a script tag outright rather than silently emptying it', () => {
    // Tags are stripped first, so this becomes 'alert(1)' - which then fails
    // the character rule because of the parentheses. Either way nothing
    // executable survives.
    const r = validatePersonalStyle('<script>alert(1)</script>');
    expect(r.value).not.toMatch(/<|>/);
  });

  it('enforces the length bounds', () => {
    expect(validatePersonalStyle('x').ok).toBe(false);
    const long = validatePersonalStyle('A'.repeat(PERSONAL_STYLE_MAX + 20));
    expect(long.ok).toBe(false);
    expect(long.value.length).toBe(PERSONAL_STYLE_MAX);
  });

  it('treats empty as valid, because the field is optional', () => {
    for (const s of ['', null, undefined, '   ']) {
      const r = validatePersonalStyle(s);
      expect(r.ok, String(s)).toBe(true);
      expect(r.value).toBe('');
    }
  });
});

describe('isKnownCategory', () => {
  it('accepts a seeded category regardless of case', () => {
    expect(isKnownCategory('Portrait')).toBe(true);
    expect(isKnownCategory('portrait')).toBe(true);
  });

  it('rejects one the platform does not define', () => {
    // 'Commercial' appeared in ClientSearch's hardcoded list and nowhere else,
    // so filtering by it matched nothing. It is not a real category.
    expect(isKnownCategory('Commercial')).toBe(false);
    expect(isKnownCategory('')).toBe(false);
    expect(isKnownCategory(null)).toBe(false);
  });

  it('matches the seeded list', () => {
    expect(FALLBACK_CATEGORIES).toContain('Documentary');
    expect(FALLBACK_CATEGORIES).toHaveLength(10);
  });
});

describe('describeStyle', () => {
  it('leads with the personal style', () => {
    expect(describeStyle({ category: 'Portrait', personalStyle: 'Crazy Portrait' }))
      .toBe('Crazy Portrait · Portrait');
  });

  it('falls back to the category alone', () => {
    expect(describeStyle({ category: 'Portrait', personalStyle: '' })).toBe('Portrait');
  });

  it('does not repeat itself when the style equals the category', () => {
    expect(describeStyle({ category: 'Portrait', personalStyle: 'Portrait' })).toBe('Portrait');
  });

  it('is empty when there is nothing to say', () => {
    expect(describeStyle({})).toBe('');
  });
});
