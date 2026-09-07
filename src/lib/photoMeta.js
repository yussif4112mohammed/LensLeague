/**
 * What a photograph can tell us about itself.
 *
 * THE PROBLEM THIS SOLVES
 * The upload form asked photographers to type their camera, lens, aperture,
 * shutter speed and ISO by hand - five fields, on a form that already had
 * eleven - while those exact values sat unread in the file they had just
 * chosen. A photographer's first reaction to the product was that publishing
 * one frame took too long, and they were right.
 *
 * Worse, `src/utils/exif.js` did not read EXIF at all. Its own header said it
 * "mocks realistic settings": it picked from six hardcoded premium bodies and
 * presented one as that photographer's gear. Somebody who shot on a phone could
 * have their work captioned "Hasselblad X2D 100C · XCD 55mm f/2.5 · ISO 64".
 * Inventing a person's equipment on their own photograph is the least
 * forgivable version of a fabrication this codebase has had.
 *
 * DELIBERATELY NOT READ: GPS.
 * EXIF very often carries the exact coordinates a photograph was taken at, and
 * for a lot of people that is their home, their child's school, or a client's
 * house. Publishing it because it happened to be in the file is not a feature.
 * If location is ever wanted it should be asked for, per photograph, in words.
 */

/** ISO 100 rather than 100. Small dignities. */
function formatIso(v) {
  const n = Array.isArray(v) ? v[0] : v;
  return Number.isFinite(Number(n)) ? `ISO ${Math.round(Number(n))}` : '';
}

/** f/1.4, and never f/1.40. */
function formatAperture(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return '';
  const s = n.toFixed(1).replace(/\.0$/, '');
  return `f/${s}`;
}

/**
 * 1/1000s for fast, 2s for long.
 *
 * EXIF stores exposure time in seconds, so a fast shutter arrives as a tiny
 * decimal (0.001) that means nothing to a photographer. They think in
 * fractions.
 */
function formatShutter(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1) return `${Number(n.toFixed(1).replace(/\.0$/, ''))}s`;
  return `1/${Math.round(1 / n)}s`;
}

/** 85mm. */
function formatFocalLength(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? `${Math.round(n)}mm` : '';
}

/**
 * "Canon" + "Canon EOS R5" should read as "Canon EOS R5", not
 * "Canon Canon EOS R5" - most bodies repeat the maker in the model string.
 */
export function joinMakeAndModel(make, model) {
  const mk = (make || '').trim();
  const md = (model || '').trim();
  if (!md) return mk;
  if (!mk) return md;
  return md.toLowerCase().startsWith(mk.toLowerCase()) ? md : `${mk} ${md}`;
}

/**
 * Turn whatever exifr found into the five things this product shows.
 *
 * Split out from the reading so it can be tested without a file, a browser or
 * the library.
 */
export function normaliseExif(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const camera = joinMakeAndModel(raw.Make, raw.Model);
  const lens = (raw.LensModel || raw.Lens || raw.LensID || '').toString().trim();
  const aperture = formatAperture(raw.FNumber ?? raw.ApertureValue);
  const shutter = formatShutter(raw.ExposureTime);
  const iso = formatIso(raw.ISO ?? raw.ISOSpeedRatings);
  const focalLength = formatFocalLength(raw.FocalLength);

  const found = { camera, lens, aperture, shutter, iso, focalLength };
  // An object of five empty strings is not metadata. Say so, so callers can
  // show "no camera details in this file" rather than five blank fields.
  const hasAnything = Object.values(found).some(v => v !== '');
  return hasAnything ? found : null;
}

/**
 * Read a still's true pixel dimensions.
 *
 * createImageBitmap decodes off the main thread and needs no DOM, so a 40MP
 * file does not freeze the page. The Image fallback covers Safari versions that
 * do not accept a Blob here.
 */
export async function readImageDimensions(file) {
  if (typeof createImageBitmap === 'function') {
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      return { width: bitmap.width, height: bitmap.height };
    } catch {
      // fall through
    } finally {
      // Free the decoded surface rather than waiting for GC - these are large.
      bitmap?.close?.();
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the image dimensions.'));
    };
    img.src = url;
  });
}

/** The same for video, from its metadata rather than a decoded frame. */
export async function readVideoDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const dims = { width: video.videoWidth, height: video.videoHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the video dimensions.'));
    };
    video.src = url;
  });
}

/**
 * Everything a file can tell us, in one call.
 *
 * exifr is imported dynamically so it is code-split out of the main bundle:
 * only somebody who actually opens the upload page downloads a parser, and the
 * other twenty-seven screens never pay for it.
 *
 * Nothing here is allowed to fail the upload. A file with no EXIF, a stripped
 * screenshot, a format the parser does not know - all of those are ordinary,
 * and the photograph still publishes. Dimensions are the one thing worth
 * retrying for, because the shape of the frame is the point.
 */
export async function readPhotoMeta(file, { isVideo = false } = {}) {
  const result = { width: null, height: null, exif: null, exifError: null };

  try {
    const dims = isVideo ? await readVideoDimensions(file) : await readImageDimensions(file);
    if (dims.width > 0 && dims.height > 0) {
      result.width = dims.width;
      result.height = dims.height;
    }
  } catch (err) {
    result.exifError = err.message;
  }

  if (isVideo) return result;

  try {
    const exifr = await import('exifr');
    const raw = await exifr.parse(file, {
      // Only the blocks that carry camera settings. gps is off deliberately -
      // see the note at the top of this file.
      tiff: true,
      exif: true,
      gps: false,
      ifd1: false,
      interop: false,
      // Ask for exactly what is displayed, so the parser does less work.
      pick: [
        'Make', 'Model', 'LensModel', 'Lens', 'LensID',
        'FNumber', 'ApertureValue', 'ExposureTime',
        'ISO', 'ISOSpeedRatings', 'FocalLength',
      ],
    });
    result.exif = normaliseExif(raw);
  } catch (err) {
    // A file without EXIF is not an error the photographer needs to see.
    result.exifError = err?.message || 'Could not read camera details.';
  }

  return result;
}

/**
 * A CSS aspect-ratio value from measured pixels.
 *
 * Returns a string because that is what `style={{ aspectRatio }}` wants, and
 * null when unknown - so a caller can choose its own fallback rather than
 * inheriting a wrong one. The old code assumed 3/4 for every photograph in the
 * product; a guess presented as a measurement is worse than no measurement.
 */
export function aspectRatioOf(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return `${w} / ${h}`;
}

/** Tall, wide or square - what a grid actually branches on. */
export function orientationOf(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  const r = w / h;
  if (r > 1.05) return 'landscape';
  if (r < 0.95) return 'portrait';
  return 'square';
}

/**
 * Split a free-text gear string into a body and a lens.
 *
 * This is parsing, not guessing: photographers type this field themselves,
 * usually as "Canon EOS R5 + RF 50mm f/1.2". When there is no separator the
 * whole string is the body, because that is the commoner case and because
 * pretending to know which half is a lens would be inventing again.
 */
export function splitGear(gear) {
  const g = (gear || '').toString().trim();
  if (!g) return { camera: '', lens: '' };
  const i = g.indexOf('+');
  if (i === -1) return { camera: g, lens: '' };
  return { camera: g.slice(0, i).trim(), lens: g.slice(i + 1).trim() };
}

/**
 * What a stored row actually knows about the camera, and nothing else.
 *
 * This replaces `src/utils/exif.js`, which despite its name never read a file.
 * It hashed the photo's id into a list of six premium bodies and returned one
 * as fact - so a frame shot on a phone was captioned "Hasselblad X2D 100C ·
 * XCD 55mm f/2.5 · ISO 64" on the photographer's own portfolio. Every value on
 * every card in the product was fabricated.
 *
 * Here, a field is present only if it is in the row. Missing stays missing, and
 * the return is null when the row knows nothing at all - so a card can leave
 * the panel out rather than draw six empty pills.
 *
 * `exif_data` shapes seen in the table: the current one written by the upload
 * form (camera/lens/aperture/shutter/iso), and older rows using camera_model.
 * Both are read; neither is filled in.
 */
export function fromStoredExif(exifData, gear = '') {
  const src = exifData && typeof exifData === 'object' ? exifData : {};
  const str = v => (v === null || v === undefined ? '' : String(v).trim());

  const fromGear = splitGear(gear);

  const out = {
    camera: str(src.camera) || str(src.camera_model) || fromGear.camera,
    lens: str(src.lens) || str(src.lens_model) || fromGear.lens,
    aperture: str(src.aperture),
    shutter: str(src.shutter) || str(src.shutter_speed),
    iso: str(src.iso),
    focalLength: str(src.focalLength) || str(src.focal_length),
  };

  return Object.values(out).some(v => v !== '') ? out : null;
}

/**
 * The one-line form used under a photograph.
 *
 * Only the parts that exist, so it reads "Canon EOS R5 · ISO 100" rather than
 * "Canon EOS R5 ·  ·  · ISO 100" when a body wrote a partial header.
 */
export function exifSummary(exif) {
  if (!exif) return '';
  return [exif.camera, exif.lens, exif.focalLength, exif.aperture, exif.shutter, exif.iso]
    .filter(Boolean)
    .join('  ·  ');
}

/**
 * A human label for a measured ratio: "3:2 landscape", not "3000 / 2000".
 *
 * Reduced with the greatest common divisor so 3000x2000 and 6000x4000 read the
 * same, and snapped to a named ratio when it is within a percent of one -
 * sensor crops and lens corrections leave real files a pixel or two off 3:2.
 */
export function ratioLabel(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;

  const named = [
    [1, 1], [4, 5], [5, 4], [2, 3], [3, 2], [3, 4], [4, 3],
    [9, 16], [16, 9], [10, 16], [16, 10], [1, 2], [2, 1], [65, 24],
  ];
  const r = w / h;
  for (const [a, b] of named) {
    if (Math.abs(r - a / b) / (a / b) < 0.01) {
      return `${a}:${b} ${orientationOf(w, h)}`;
    }
  }

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(Math.round(w), Math.round(h)) || 1;
  const a = Math.round(w) / g;
  const b = Math.round(h) / g;
  // An unreduceable ratio (a prime-ish crop) is more honest as pixels.
  if (a > 40 || b > 40) return `${Math.round(w)} × ${Math.round(h)}`;
  return `${a}:${b} ${orientationOf(w, h)}`;
}
