import { describe, it, expect } from 'vitest';
import { avatarUrlOf, initialsOf } from './avatars';

describe('avatarUrlOf', () => {
  it('returns the first real picture it is given', () => {
    expect(avatarUrlOf(null, '', 'https://cdn.test/me.jpg')).toBe('https://cdn.test/me.jpg');
  });

  it('accepts the shapes the app actually stores', () => {
    expect(avatarUrlOf('/uploads/me.png')).toBe('/uploads/me.png');
    expect(avatarUrlOf('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
  });

  it('refuses the hardcoded stock photograph', () => {
    // This is the whole point. A stranger's face is not a missing avatar, it is
    // a wrong one, and the inbox header showed it in place of a real person's
    // updated picture.
    expect(avatarUrlOf('https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100')).toBeNull();
  });

  it('refuses the external initials service too', () => {
    // It leaked the person's name to a third party and re-randomised its colour
    // on every reload, so the same contact looked different on each visit.
    expect(avatarUrlOf('https://ui-avatars.com/api/?name=Ebenezer&background=random')).toBeNull();
  });

  it('skips a rejected candidate and keeps looking', () => {
    expect(avatarUrlOf('https://images.unsplash.com/photo-1', 'https://cdn.test/real.jpg'))
      .toBe('https://cdn.test/real.jpg');
  });

  it('returns null rather than something when there is nothing', () => {
    expect(avatarUrlOf()).toBeNull();
    expect(avatarUrlOf(null, undefined, '')).toBeNull();
    expect(avatarUrlOf('   ')).toBeNull();
  });
});

describe('initialsOf', () => {
  it('takes both ends of a full name', () => {
    expect(initialsOf('Ebenezer Hodzi')).toBe('EH');
    expect(initialsOf('Mohammed Yussif Adam')).toBe('MA');
  });

  it('takes two letters from a single name', () => {
    expect(initialsOf('Ama')).toBe('AM');
  });

  it('copes with nothing', () => {
    expect(initialsOf('')).toBe('?');
    expect(initialsOf(null)).toBe('?');
    expect(initialsOf('   ')).toBe('?');
  });
});
