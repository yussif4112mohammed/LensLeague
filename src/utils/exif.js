/* ============================================================
   LensLeague EXIF Metadata Helper
   Parses existing gear properties or mocks realistic settings.
   ============================================================ */

export function parseGearOrGetExif(gear, photoId, name) {
  // Collection of premium cameras & lens setups to fallback on
  const defaultCameras = [
    { camera: 'Sony α7R V', lens: 'FE 85mm f/1.2 GM', focalLength: '85mm', aperture: 'f/1.2', shutter: '1/800s', iso: 'ISO 100' },
    { camera: 'Fujifilm X-T5', lens: 'XF 56mm f/1.2 R WR', focalLength: '56mm', aperture: 'f/1.2', shutter: '1/1000s', iso: 'ISO 160' },
    { camera: 'Canon EOS R5', lens: 'RF 50mm f/1.2 L USM', focalLength: '50mm', aperture: 'f/1.2', shutter: '1/1600s', iso: 'ISO 100' },
    { camera: 'Nikon Z8', lens: 'NIKKOR Z 85mm f/1.2 S', focalLength: '85mm', aperture: 'f/1.2', shutter: '1/1200s', iso: 'ISO 64' },
    { camera: 'Leica Q3', lens: 'Summilux 28mm f/1.7', focalLength: '28mm', aperture: 'f/1.7', shutter: '1/500s', iso: 'ISO 200' },
    { camera: 'Hasselblad X2D 100C', lens: 'XCD 55mm f/2.5', focalLength: '55mm', aperture: 'f/2.5', shutter: '1/320s', iso: 'ISO 64' }
  ];

  // Derive a stable deterministic seed index
  const seedStr = String(photoId || name || 'default');
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed += seedStr.charCodeAt(i);
  }

  const selectedDefault = defaultCameras[seed % defaultCameras.length];

  if (!gear) {
    return selectedDefault;
  }

  // Parse gear string (e.g., "Sony A7IV + 85mm f/1.4")
  let camera = '';
  let lens = '';
  
  if (gear.includes('+')) {
    const parts = gear.split('+');
    camera = parts[0].trim();
    lens = parts[1].trim();
  } else {
    const gl = gear.toLowerCase();
    if (gl.includes('sony') || gl.includes('canon') || gl.includes('nikon') || gl.includes('fujifilm') || gl.includes('leica') || gl.includes('hasselblad')) {
      camera = gear.trim();
      lens = selectedDefault.lens;
    } else {
      camera = selectedDefault.camera;
      lens = gear.trim();
    }
  }

  // Apply visual tweaks for professional nomenclature
  if (camera.toLowerCase() === 'sony a7iv') camera = 'Sony α7 IV';
  if (camera.toLowerCase() === 'sony a7rv') camera = 'Sony α7R V';
  if (camera.toLowerCase() === 'canon eos r5') camera = 'Canon EOS R5';
  if (camera.toLowerCase() === 'nikon z8') camera = 'Nikon Z8';
  if (camera.toLowerCase() === 'fujifilm gfx') camera = 'Fujifilm GFX 100 II';

  // Deterministic photo settings
  const apertures = ['f/1.2', 'f/1.4', 'f/1.8', 'f/2.8', 'f/4.0', 'f/5.6'];
  const shutters = ['1/250s', '1/500s', '1/800s', '1/1000s', '1/1600s', '1/2000s'];
  const isos = ['ISO 64', 'ISO 100', 'ISO 200', 'ISO 400', 'ISO 800'];

  let focalLength = selectedDefault.focalLength;
  const flMatch = lens.match(/(\d+mm)/i);
  if (flMatch) {
    focalLength = flMatch[1];
  }

  let aperture = apertures[(seed + 3) % apertures.length];
  const apMatch = lens.match(/(f\/\d+\.\d+|f\/\d+)/i);
  if (apMatch) {
    aperture = apMatch[1];
  }

  return {
    camera,
    lens,
    focalLength,
    aperture,
    shutter: shutters[(seed + 1) % shutters.length],
    iso: isos[(seed + 4) % isos.length]
  };
}
