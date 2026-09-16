import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { cropRect, maxZoom, panCenter } from '../../lib/cropGeometry';

/**
 * Frame a picture before it is uploaded.
 *
 * Avatars used to be uploaded exactly as chosen, and the circular frame left
 * the cropping to CSS `object-cover` - which always takes the middle. A close
 * portrait became a nose; a full-length selfie became a wall with the head
 * clipped off. Those want opposite corrections, so this asks instead of
 * guessing: drag to move, zoom to fill, and what is inside the frame is what
 * gets uploaded.
 *
 * It also settles a second problem nobody had noticed: the original camera file
 * WAS the avatar, so every screen showing a photographer downloaded a
 * multi-megabyte photograph to paint a 32px circle. The confirmed crop is
 * re-encoded at `outputSize`, so an avatar is tens of kilobytes.
 *
 * The geometry lives in lib/cropGeometry.js and is tested there.
 */
export default function ImageCropper({
  file,
  aspect = 1,
  circle = false,
  outputSize = 512,
  title = 'Frame your picture',
  onCancel,
  onConfirm,
}) {
  const [image, setImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ centerX: 0.5, centerY: 0.5 });
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const dragRef = useRef(null);

  // Decode the chosen file once. The object URL is revoked on the way out so a
  // few rounds of "actually, this other photo" does not leak them.
  useEffect(() => {
    if (!file) return undefined;
    let cancelled = false;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setImage(img);
      setZoom(1);
      setCenter({ centerX: 0.5, centerY: 0.5 });
    };
    img.onerror = () => { if (!cancelled) setLoadFailed(true); };
    img.src = url;
    return () => { cancelled = true; URL.revokeObjectURL(url); };
  }, [file]);

  const state = image
    ? { imageWidth: image.naturalWidth, imageHeight: image.naturalHeight, aspect, zoom, ...center }
    : null;

  const limit = image ? maxZoom(image.naturalWidth, image.naturalHeight, aspect) : 1;

  // Paint the live preview: just the cropped region, drawn to fill the canvas.
  // What you see here is exactly the pixels that will be uploaded.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state) return;
    const rect = cropRect(state);
    if (!rect) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
  }, [image, state, zoom, center]);

  const onPointerDown = e => {
    if (!state) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerMove = e => {
    if (!dragRef.current || !state) return;
    const frame = frameRef.current;
    if (!frame) return;
    const { width, height } = frame.getBoundingClientRect();
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current = { x: e.clientX, y: e.clientY };
    setCenter(panCenter(state, dx, dy, width, height));
  };

  const endDrag = e => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const onWheel = e => {
    if (!state) return;
    e.preventDefault();
    setZoom(z => Math.min(limit, Math.max(1, z * (e.deltaY > 0 ? 0.92 : 1.08))));
  };

  const confirm = useCallback(async () => {
    if (!state || busy) return;
    setBusy(true);
    try {
      const rect = cropRect(state);
      const out = document.createElement('canvas');
      out.width = Math.round(aspect >= 1 ? outputSize : outputSize * aspect);
      out.height = Math.round(aspect >= 1 ? outputSize / aspect : outputSize);

      const ctx = out.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, out.width, out.height);

      const blob = await new Promise(resolve => out.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('Could not process this picture. Please try another.');

      // A File rather than a Blob, because the upload names the object from
      // the extension and a Blob has no name to take one from.
      const name = (file?.name || 'image').replace(/\.[^.]+$/, '') + '.jpg';
      onConfirm(new File([blob], name, { type: 'image/jpeg' }));
    } catch (err) {
      setLoadFailed(true);
      console.warn('Crop failed:', err);
    } finally {
      setBusy(false);
    }
  }, [state, busy, aspect, outputSize, image, file, onConfirm]);

  // The preview canvas is fixed at a comfortable on-screen size; the output is
  // rendered separately at outputSize, so this is presentation only.
  const frameWidth = 288;
  const frameHeight = Math.round(frameWidth / aspect);

  return (
    <Dialog open onOpenChange={open => { if (!open) onCancel?.(); }}>
      <DialogContent className="border-border bg-background text-foreground sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Drag to move, zoom to fill the frame.
          </DialogDescription>
        </DialogHeader>

        {loadFailed ? (
          <p className="py-6 text-sm text-muted-foreground">
            That file could not be read as an image. Please choose another.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">
            <div
              ref={frameRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onWheel={onWheel}
              style={{ width: frameWidth, height: frameHeight }}
              className={`relative touch-none overflow-hidden border border-border bg-muted ${
                circle ? 'rounded-full' : 'rounded-lg'
              } ${image ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              <canvas
                ref={canvasRef}
                width={frameWidth * 2}
                height={frameHeight * 2}
                className="h-full w-full select-none"
              />
              {!image && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                  Loading…
                </div>
              )}
            </div>

            <div className="flex w-full items-center gap-3">
              <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                id="image-cropper-zoom"
                type="range"
                min={1}
                max={limit}
                step={0.01}
                value={zoom}
                aria-label="Zoom"
                disabled={!image || limit <= 1}
                onChange={e => setZoom(Number(e.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
              <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onCancel?.()}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={confirm}
            disabled={!image || busy || loadFailed}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {busy ? 'Saving…' : 'Use this'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
