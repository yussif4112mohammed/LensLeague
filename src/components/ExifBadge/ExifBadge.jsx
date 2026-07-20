import './ExifBadge.css';

export default function ExifBadge({ gear, camera, lens, aperture, shutter, iso, location }) {
  const hasExif = gear || camera || lens || aperture || shutter || iso;
  if (!hasExif && !location) return null;

  return (
    <div className="exif-badge">
      <div className="exif-badge__header">
        <span className="exif-badge__icon">📷</span>
        <span className="exif-badge__title">{gear || camera || 'Camera Specs'}</span>
      </div>
      <div className="exif-badge__details">
        {lens && <span className="exif-tag">{lens}</span>}
        {aperture && <span className="exif-tag">ƒ/{aperture}</span>}
        {shutter && <span className="exif-tag">{shutter}s</span>}
        {iso && <span className="exif-tag">ISO {iso}</span>}
        {location && <span className="exif-tag exif-tag--loc">📍 {location}</span>}
      </div>
    </div>
  );
}
