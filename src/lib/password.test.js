import { describe, it, expect } from 'vitest';
import { assessPassword, PASSWORD_MIN_LENGTH } from './password';

describe('assessPassword', () => {
  it('refuses something shorter than the minimum', () => {
    const r = assessPassword('short1');
    expect(r.acceptable).toBe(false);
    expect(r.problems.join(' ')).toMatch(new RegExp(`${PASSWORD_MIN_LENGTH} characters`));
  });

  it('refuses a password built from the account it protects', () => {
    const r = assessPassword('mohammed2026x', { username: 'mohammed', email: 'mohammed@example.com' });
    expect(r.acceptable).toBe(false);
    expect(r.problems.join(' ')).toMatch(/your own name, username or email/i);
  });

  it('catches the account identifiers regardless of case', () => {
    expect(assessPassword('MOHAMMEDrules99', { name: 'Mohammed' }).acceptable).toBe(false);
  });

  it('refuses the passwords at the top of every breach list', () => {
    expect(assessPassword('password1234').acceptable).toBe(false);
    expect(assessPassword('qwertyuiop12').acceptable).toBe(false);
    // Including the ones this product invites.
    expect(assessPassword('lensleague22').acceptable).toBe(false);
    expect(assessPassword('photographer1').acceptable).toBe(false);
  });

  it('refuses something long but made of almost no distinct characters', () => {
    expect(assessPassword('aaaaaaaaaaaaaaaa').acceptable).toBe(false);
  });

  it('accepts a long passphrase with no symbol in it', () => {
    // Length beats character-class theatre. A rule that rejects this and
    // accepts "Passw0rd!" has the security backwards.
    const r = assessPassword('correct horse battery staple');
    expect(r.acceptable).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(3);
  });

  it('scores a strong password higher than a merely adequate one', () => {
    const ok = assessPassword('driftwoodlamp');
    const strong = assessPassword('driftwood-Lamp-8821-quiet');
    expect(strong.score).toBeGreaterThan(ok.score);
    expect(strong.label).toBe('Strong');
  });

  it('never claims a password with a problem is more than weak', () => {
    const r = assessPassword('passwordpasswordpassword');
    expect(r.acceptable).toBe(false);
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it('handles nothing at all without throwing', () => {
    expect(assessPassword('').acceptable).toBe(false);
    expect(assessPassword(undefined).acceptable).toBe(false);
    expect(assessPassword(null, { username: null }).score).toBe(0);
  });
});
