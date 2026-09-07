import { describe, it, expect } from 'vitest';
import {
  normaliseExif,
  joinMakeAndModel,
  aspectRatioOf,
  orientationOf,
  splitGear,
  fromStoredExif,
  exifSummary,
  ratioLabel,
} from './photoMeta';

describe('joinMakeAndModel', () => {
  it('does not repeat the maker when the model already carries it', () => {
    expect(joinMakeAndModel('Canon', 'Canon EOS R5')).toBe('Canon EOS R5');
  });

  it('joins them when the model does not', () => {
    expect(joinMakeAndModel('NIKON CORPORATION', 'Z 8')).toBe('NIKON CORPORATION Z 8');
  });

  it('is case-insensitive about the repetition', () => {
    expect(joinMakeAndModel('SONY', 'Sony A7 IV')).toBe('Sony A7 IV');
  });

  it('copes with either side missing', () => {
    expect(joinMakeAndModel('', 'X-T5')).toBe('X-T5');
    expect(joinMakeAndModel('Leica', '')).toBe('Leica');
    expect(joinMakeAndModel('', '')).toBe('');
  });
});

describe('normaliseExif', () => {
  it('formats a typical frame the way a photographer reads it', () => {
    const out = normaliseExif({
      Make: 'Canon',
      Model: 'Canon EOS R5',
      LensModel: 'RF50mm F1.2 L USM',
      FNumber: 1.2,
      ExposureTime: 0.001,
      ISO: 100,
      FocalLength: 50,
    });
    expect(out).toEqual({
      camera: 'Canon EOS R5',
      lens: 'RF50mm F1.2 L USM',
      aperture: 'f/1.2',
      shutter: '1/1000s',
      iso: 'ISO 100',
      focalLength: '50mm',
    });
  });

  it('writes a long exposure in seconds, not as a fraction', () => {
    expect(normaliseExif({ ExposureTime: 2 }).shutter).toBe('2s');
    expect(normaliseExif({ ExposureTime: 1 }).shutter).toBe('1s');
    expect(normaliseExif({ ExposureTime: 1.5 }).shutter).toBe('1.5s');
  });

  it('drops the trailing zero from a whole-stop aperture', () => {
    expect(normaliseExif({ FNumber: 8 }).aperture).toBe('f/8');
    expect(normaliseExif({ FNumber: 1.8 }).aperture).toBe('f/1.8');
  });

  it('reads ISO from either of the two tags cameras use', () => {
    expect(normaliseExif({ ISO: 640 }).iso).toBe('ISO 640');
    expect(normaliseExif({ ISOSpeedRatings: 640 }).iso).toBe('ISO 640');
    // Some bodies write it as an array.
    expect(normaliseExif({ ISO: [200] }).iso).toBe('ISO 200');
  });

  it('returns null when the file carries nothing usable, rather than five blanks', () => {
    expect(normaliseExif({})).toBeNull();
    expect(normaliseExif({ Make: '', Model: '' })).toBeNull();
    expect(normaliseExif(null)).toBeNull();
    expect(normaliseExif('not an object')).toBeNull();
  });

  it('keeps a partial read rather than discarding it', () => {
    const out = normaliseExif({ Make: 'FUJIFILM', Model: 'X-T5' });
    expect(out.camera).toBe('FUJIFILM X-T5');
    expect(out.lens).toBe('');
  });

  it('ignores nonsense values instead of printing them', () => {
    const out = normaliseExif({ FNumber: 0, ExposureTime: -1, ISO: 'abc', FocalLength: 0 });
    expect(out).toBeNull();
  });
});

describe('aspectRatioOf', () => {
  it('returns a CSS-ready ratio', () => {
    expect(aspectRatioOf(3000, 2000)).toBe('3000 / 2000');
    expect(aspectRatioOf(1080, 1350)).toBe('1080 / 1350');
  });

  it('returns null when the dimensions are unknown or nonsense', () => {
    // This is the point: a caller must be able to tell "unknown" from a value,
    // instead of inheriting the 3/4 that used to be assumed for everything.
    expect(aspectRatioOf(0, 100)).toBeNull();
    expect(aspectRatioOf(100, 0)).toBeNull();
    expect(aspectRatioOf(null, null)).toBeNull();
    expect(aspectRatioOf(undefined, 500)).toBeNull();
    expect(aspectRatioOf(-10, 10)).toBeNull();
  });
});

describe('orientationOf', () => {
  it('names the three shapes a grid cares about', () => {
    expect(orientationOf(1600, 900)).toBe('landscape');
    expect(orientationOf(900, 1600)).toBe('portrait');
    expect(orientationOf(1000, 1000)).toBe('square');
  });

  it('treats near-square as square rather than splitting hairs', () => {
    expect(orientationOf(1000, 1020)).toBe('square');
    expect(orientationOf(1020, 1000)).toBe('square');
  });

  it('returns null when unknown', () => {
    expect(orientationOf(0, 0)).toBeNull();
  });
});

describe('splitGear', () => {
  it('splits a body and a lens the photographer typed', () => {
    expect(splitGear('Canon EOS R5 + RF 50mm f/1.2')).toEqual({
      camera: 'Canon EOS R5',
      lens: 'RF 50mm f/1.2',
    });
  });

  it('treats a lone string as the body rather than guessing', () => {
    expect(splitGear('Fujifilm X-T5')).toEqual({ camera: 'Fujifilm X-T5', lens: '' });
  });

  it('handles nothing', () => {
    expect(splitGear('')).toEqual({ camera: '', lens: '' });
    expect(splitGear(null)).toEqual({ camera: '', lens: '' });
  });
});

describe('fromStoredExif', () => {
  it('returns exactly what the row holds', () => {
    expect(
      fromStoredExif({
        camera: 'Canon EOS R5',
        lens: 'RF50mm F1.2 L USM',
        aperture: 'f/1.2',
        shutter: '1/1000s',
        iso: 'ISO 100',
      })
    ).toEqual({
      camera: 'Canon EOS R5',
      lens: 'RF50mm F1.2 L USM',
      aperture: 'f/1.2',
      shutter: '1/1000s',
      iso: 'ISO 100',
      focalLength: '',
    });
  });

  it('leaves missing fields missing instead of inventing them', () => {
    const out = fromStoredExif({ camera: 'Pixel 8 Pro' });
    expect(out.camera).toBe('Pixel 8 Pro');
    expect(out.lens).toBe('');
    expect(out.aperture).toBe('');
    expect(out.shutter).toBe('');
    expect(out.iso).toBe('');
    expect(out.focalLength).toBe('');
  });

  it('returns null when the row knows nothing, so a card can omit the panel', () => {
    expect(fromStoredExif(null)).toBeNull();
    expect(fromStoredExif({})).toBeNull();
    expect(fromStoredExif({ camera: '', lens: '' })).toBeNull();
    expect(fromStoredExif('nonsense')).toBeNull();
  });

  it('reads the older camera_model shape as well as the current one', () => {
    expect(fromStoredExif({ camera_model: 'Nikon Z 8' }).camera).toBe('Nikon Z 8');
  });

  it('falls back to the gear the photographer typed, and only to that', () => {
    const out = fromStoredExif(null, 'Sony A7 IV + 85mm f/1.4');
    expect(out.camera).toBe('Sony A7 IV');
    expect(out.lens).toBe('85mm f/1.4');
    expect(out.iso).toBe('');
  });

  it('prefers the file over the typed field when both exist', () => {
    const out = fromStoredExif({ camera: 'Leica Q3' }, 'Some Other Body');
    expect(out.camera).toBe('Leica Q3');
  });

  it('does not fabricate a camera from the photo id', () => {
    expect(fromStoredExif(null, '')).toBeNull();
    expect(fromStoredExif({}, '')).toBeNull();
  });
});

describe('exifSummary', () => {
  it('joins only what is present', () => {
    expect(exifSummary({ camera: 'Canon EOS R5', lens: '', aperture: '', shutter: '', iso: 'ISO 100', focalLength: '' }))
      .toBe('Canon EOS R5  ·  ISO 100');
  });

  it('is empty for nothing', () => {
    expect(exifSummary(null)).toBe('');
  });
});

describe('ratioLabel', () => {
  it('names the ratio a photographer would name', () => {
    expect(ratioLabel(3000, 2000)).toBe('3:2 landscape');
    expect(ratioLabel(1080, 1350)).toBe('4:5 portrait');
    expect(ratioLabel(1000, 1000)).toBe('1:1 square');
    expect(ratioLabel(1920, 1080)).toBe('16:9 landscape');
  });

  it('snaps a frame that is a couple of pixels off a named ratio', () => {
    expect(ratioLabel(6000, 4001)).toBe('3:2 landscape');
  });

  it('falls back to pixels rather than an unreadable reduced ratio', () => {
    expect(ratioLabel(1880, 1000)).toBe('1880 × 1000');
  });

  it('returns null when unknown', () => {
    expect(ratioLabel(null, null)).toBeNull();
    expect(ratioLabel(0, 100)).toBeNull();
  });
});
