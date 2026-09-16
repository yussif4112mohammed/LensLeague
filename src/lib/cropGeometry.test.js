import { describe, it, expect } from 'vitest';
import { clamp, coverCrop, maxZoom, cropRect, panCenter } from './cropGeometry';

const landscape = { imageWidth: 3000, imageHeight: 2000 };
const portrait = { imageWidth: 2000, imageHeight: 3000 };

describe('coverCrop', () => {
  it('takes the full height of a landscape frame when cropping square', () => {
    expect(coverCrop(3000, 2000, 1)).toEqual({ width: 2000, height: 2000 });
  });

  it('takes the full width of a portrait frame when cropping square', () => {
    expect(coverCrop(2000, 3000, 1)).toEqual({ width: 2000, height: 2000 });
  });

  it('handles a wide banner aspect', () => {
    expect(coverCrop(3000, 2000, 3)).toEqual({ width: 3000, height: 1000 });
  });

  it('returns null rather than a nonsense rectangle', () => {
    expect(coverCrop(0, 100, 1)).toBeNull();
    expect(coverCrop(100, 100, 0)).toBeNull();
    expect(coverCrop(NaN, 100, 1)).toBeNull();
    expect(coverCrop(undefined, undefined, 1)).toBeNull();
  });
});

describe('cropRect', () => {
  it('centres the zoom-1 crop, which is what object-cover was doing', () => {
    expect(cropRect({ ...landscape })).toEqual({ x: 500, y: 0, width: 2000, height: 2000 });
  });

  it('halves the rectangle at zoom 2 and keeps it centred', () => {
    expect(cropRect({ ...landscape, zoom: 2 })).toEqual({ x: 1000, y: 500, width: 1000, height: 1000 });
  });

  it('never lets the rectangle leave the photograph', () => {
    const topLeft = cropRect({ ...landscape, zoom: 2, centerX: -5, centerY: -5 });
    expect(topLeft).toEqual({ x: 0, y: 0, width: 1000, height: 1000 });

    const bottomRight = cropRect({ ...landscape, zoom: 2, centerX: 9, centerY: 9 });
    expect(bottomRight).toEqual({ x: 2000, y: 1000, width: 1000, height: 1000 });
  });

  it('ignores a centre at zoom 1, because there is no slack to pan into', () => {
    const a = cropRect({ ...landscape, zoom: 1, centerX: 0 });
    const b = cropRect({ ...landscape, zoom: 1, centerX: 1 });
    expect(a.y).toBe(0);
    expect(b.y).toBe(0);
    expect(a.height).toBe(2000);
    // Horizontally there IS slack on a landscape frame cropped square, so the
    // centre still bites on that axis - it is the short axis that is pinned.
    expect(a.x).toBe(0);
    expect(b.x).toBe(1000);
  });

  it('refuses to zoom past the point where it would be enlarging mush', () => {
    // 2000px short edge, 96px floor -> about 20x, capped at 10x.
    const rect = cropRect({ ...landscape, zoom: 999 });
    expect(rect.width).toBeCloseTo(200, 5);
    expect(rect.width).toBeGreaterThanOrEqual(96);
  });

  it('refuses to zoom out below the cover framing', () => {
    expect(cropRect({ ...landscape, zoom: 0.25 })).toEqual(cropRect({ ...landscape, zoom: 1 }));
  });

  it('returns null for an image it cannot measure', () => {
    expect(cropRect({ imageWidth: 0, imageHeight: 0 })).toBeNull();
    expect(cropRect()).toBeNull();
  });

  it('crops a portrait square without squashing it', () => {
    const rect = cropRect({ ...portrait });
    expect(rect.width).toBe(rect.height);
  });
});

describe('maxZoom', () => {
  it('is 1 when there is nothing to zoom into', () => {
    expect(maxZoom(96, 96, 1)).toBe(1);
    expect(maxZoom(40, 40, 1)).toBe(1);
  });

  it('grows with the size of the photograph', () => {
    expect(maxZoom(480, 480, 1)).toBeCloseTo(5, 5);
    expect(maxZoom(6000, 4000, 1)).toBe(10);
  });
});

describe('panCenter', () => {
  const state = { ...landscape, zoom: 2 };

  it('moves the picture with the pointer, one display pixel to one', () => {
    // The frame is shown 500px wide and the crop is 1000 source px, so one
    // display pixel is two source pixels.
    const next = panCenter(state, 50, 0, 500, 500);
    const rect = cropRect({ ...state, ...next });
    expect(rect.x).toBe(900); // dragged right by 100 source px
  });

  it('drags down as well as across', () => {
    const next = panCenter(state, 0, -50, 500, 500);
    const rect = cropRect({ ...state, ...next });
    expect(rect.y).toBe(600);
  });

  it('stops at the edge instead of building up invisible slack', () => {
    // A long drag past the left edge, then one small drag back. If the excess
    // were remembered, the second drag would appear to do nothing.
    const pastEdge = panCenter(state, 5000, 0, 500, 500);
    const rectAtEdge = cropRect({ ...state, ...pastEdge });
    expect(rectAtEdge.x).toBe(0);

    const back = panCenter({ ...state, ...pastEdge }, -25, 0, 500, 500);
    const rectBack = cropRect({ ...state, ...back });
    expect(rectBack.x).toBe(50);
  });

  it('has nothing to move at zoom 1 on the pinned axis', () => {
    const next = panCenter({ ...landscape, zoom: 1 }, 0, 200, 500, 500);
    const rect = cropRect({ ...landscape, zoom: 1, ...next });
    expect(rect.y).toBe(0);
  });

  it('survives a zero-sized frame rather than returning NaN', () => {
    const next = panCenter(state, 10, 10, 0, 0);
    expect(Number.isFinite(next.centerX)).toBe(true);
    expect(Number.isFinite(next.centerY)).toBe(true);
  });
});

describe('clamp', () => {
  it('bounds a value', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('falls back to the low bound for a value that is not a number', () => {
    expect(clamp(NaN, 2, 10)).toBe(2);
    expect(clamp(undefined, 2, 10)).toBe(2);
  });
});
