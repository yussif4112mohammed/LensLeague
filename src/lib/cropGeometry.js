/**
 * The geometry behind the crop step, kept out of the component so it can be
 * reasoned about and tested without a DOM, a canvas or a pointer.
 *
 * Why this exists: avatars were uploaded exactly as chosen and the circular
 * frame relied on CSS `object-cover`, which crops to the middle of whatever
 * you gave it. On a close portrait that middle is a nose; on a full-length
 * mirror selfie it is a wall, with the head clipped off the top. The two need
 * opposite corrections - one moved up, one zoomed in - so no automatic rule
 * fixes both. The person framing the picture has to be the one who decides.
 *
 * Model: the crop is a rectangle measured in SOURCE pixels. At zoom 1 it is the
 * largest rectangle of the requested aspect that fits inside the photograph -
 * the same "cover" framing CSS was doing. Zooming shrinks that rectangle; the
 * centre may then be moved, and is always clamped so the rectangle stays
 * wholly inside the photograph. Zoom never goes below 1 and there is nothing
 * to pan at zoom 1, so the frame can never show empty space.
 */

export function clamp(value, low, high) {
  if (!Number.isFinite(value)) return low;
  return Math.min(high, Math.max(low, value));
}

function usable(imageWidth, imageHeight, aspect) {
  return (
    Number.isFinite(imageWidth) && imageWidth > 0 &&
    Number.isFinite(imageHeight) && imageHeight > 0 &&
    Number.isFinite(aspect) && aspect > 0
  );
}

/**
 * The zoom-1 rectangle: the biggest one of this aspect that fits inside.
 * A 3000x2000 photograph cropped square gives 2000x2000; cropped 3:1 it gives
 * 3000x1000.
 */
export function coverCrop(imageWidth, imageHeight, aspect = 1) {
  if (!usable(imageWidth, imageHeight, aspect)) return null;
  if (imageWidth / imageHeight > aspect) {
    return { width: imageHeight * aspect, height: imageHeight };
  }
  return { width: imageWidth, height: imageWidth / aspect };
}

/**
 * How far in the person may zoom before they are enlarging mush.
 *
 * Capped so the crop never draws from fewer than `minSourcePx` on its short
 * edge - past that the output is upscaled guesswork, and letting someone zoom
 * to a four-pixel square would produce an avatar worse than the one we are
 * fixing. Also capped at 10x so a 6000px file does not offer absurd range.
 */
export function maxZoom(imageWidth, imageHeight, aspect = 1, minSourcePx = 96) {
  const base = coverCrop(imageWidth, imageHeight, aspect);
  if (!base) return 1;
  const shortest = Math.min(base.width, base.height);
  return clamp(shortest / minSourcePx, 1, 10);
}

/**
 * The source rectangle to draw, for a given zoom and centre.
 *
 * `centerX` / `centerY` are fractions of the image (0.5, 0.5 is the middle).
 * The returned rectangle is always inside the image, so a caller can hand it
 * straight to drawImage without checking anything.
 */
export function cropRect({
  imageWidth,
  imageHeight,
  aspect = 1,
  zoom = 1,
  centerX = 0.5,
  centerY = 0.5,
} = {}) {
  const base = coverCrop(imageWidth, imageHeight, aspect);
  if (!base) return null;

  const z = clamp(zoom, 1, maxZoom(imageWidth, imageHeight, aspect));
  const width = base.width / z;
  const height = base.height / z;

  // Clamped in source pixels rather than in fractions, because the amount of
  // slack depends on the zoom: at zoom 1 there is none.
  const x = clamp(centerX * imageWidth - width / 2, 0, imageWidth - width);
  const y = clamp(centerY * imageHeight - height / 2, 0, imageHeight - height);

  return { x, y, width, height };
}

/**
 * Where the centre lands after a drag.
 *
 * The drag arrives in display pixels, and one display pixel is worth
 * `rect.width / displayWidth` source pixels - so the photograph tracks the
 * pointer exactly at any zoom. Dragging right moves the picture right, which
 * means moving the crop window left, hence the subtraction.
 */
export function panCenter(state, dxDisplay, dyDisplay, displayWidth, displayHeight) {
  const rect = cropRect(state);
  if (!rect || !(displayWidth > 0) || !(displayHeight > 0)) {
    return { centerX: state?.centerX ?? 0.5, centerY: state?.centerY ?? 0.5 };
  }

  const dxSource = (dxDisplay * rect.width) / displayWidth;
  const dySource = (dyDisplay * rect.height) / displayHeight;

  const centerX = (rect.x + rect.width / 2 - dxSource) / state.imageWidth;
  const centerY = (rect.y + rect.height / 2 - dySource) / state.imageHeight;

  // Re-clamped through cropRect so the returned centre is one the rectangle
  // can actually sit at - otherwise repeated drags past an edge accumulate an
  // offset that has to be "paid back" before the picture moves again.
  const settled = cropRect({ ...state, centerX, centerY });
  return {
    centerX: (settled.x + settled.width / 2) / state.imageWidth,
    centerY: (settled.y + settled.height / 2) / state.imageHeight,
  };
}
