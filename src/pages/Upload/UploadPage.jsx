import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { readPhotoMeta, rotateImageFile } from '@/lib/photoMeta';
import { Upload, ArrowLeft, ArrowRight, Check, Loader2, Camera, MapPin, Image as ImageIcon, RotateCcw } from 'lucide-react';

const DESTINATIONS = [
  { value: 'feed', label: 'Add to Feed', desc: 'Share to your followers\' feed' },
  { value: 'gallery', label: 'Add to Gallery', desc: 'Curate your professional showcase' },
];

export default function UploadPage() {
  // Categories come from the database (one platform-controlled list) rather
  // than a hardcoded array. There used to be four such arrays across the app,
  // all disagreeing - a photo uploaded as one category was unfilterable in
  // another screen, and one list's "Commercial" existed nowhere else at all.
  const { categories: CATEGORIES } = useApp();
  const navigate = useNavigate();
  const { currentUser, uploadPhoto } = useApp();
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [destination, setDestination] = useState('feed');
  const [category, setCategory] = useState('');
  const [customStyle, setCustomStyle] = useState('');
  const [caption, setCaption] = useState('');
  const [altText, setAltText] = useState('');
  const [gear, setGear] = useState('');
  const [camera, setCamera] = useState('');
  const [lens, setLens] = useState('');
  const [aperture, setAperture] = useState('');
  const [shutter, setShutter] = useState('');
  const [iso, setIso] = useState('');
  const [location, setLocation] = useState('');
  const [modStatus, setModStatus] = useState(null);
  const [error, setError] = useState('');
  const [fileObj, setFileObj] = useState(null);
  // Measured from the file, never typed and never guessed.
  const [dimensions, setDimensions] = useState({ width: null, height: null });
  const [exifFound, setExifFound] = useState(false);
  const [readingMeta, setReadingMeta] = useState(false);
  const [rotating, setRotating] = useState(false);

  /**
   * A quarter turn to the right, applied to the FILE and not just the preview.
   *
   * Crop, Rotate and Adjust sat here as three buttons with no onClick - an
   * editor that did nothing when pressed. Rotate is the one a photographer
   * actually needs (a frame that came off the camera sideways is the frame
   * everybody else then votes on), so it is real now. Crop and Adjust are gone
   * rather than left as decoration; they can come back when they work.
   */
  const handleRotate = async () => {
    if (!fileObj || isVideo || rotating) return;
    setRotating(true);
    setError('');
    try {
      const rotated = await rotateImageFile(fileObj, { quarterTurns: 1 });
      setFileObj(rotated.file);
      // Release the old object URL rather than leaking one per rotation.
      setPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(rotated.file); });
      if (rotated.width && rotated.height) {
        setDimensions({ width: rotated.width, height: rotated.height });
      }
    } catch (err) {
      setError(err.message || 'Could not rotate this image.');
    } finally {
      setRotating(false);
    }
  };

  // The accept="" attribute is only a file-picker hint — it is trivially
  // bypassed. The bucket enforces these same limits server-side (migration v11);
  // this check is here so the user gets a clear message instead of a failed
  // upload, and so an .html or .svg masquerading as an image never gets sent.
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic'];
  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
  const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB, matches the post-media bucket

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const type = (file.type || '').toLowerCase();
    const isAllowedImage = ALLOWED_IMAGE_TYPES.includes(type);
    const isAllowedVideo = ALLOWED_VIDEO_TYPES.includes(type);

    if (!isAllowedImage && !isAllowedVideo) {
      setError('That file type is not supported. Upload a JPEG, PNG, WEBP, AVIF, HEIC, MP4, WEBM or MOV.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 50MB.`);
      e.target.value = '';
      return;
    }

    setError('');
    setFileObj(file);
    setIsVideo(isAllowedVideo);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setStep(2);

    // Ask the file what it knows, rather than asking the photographer to retype
    // it. Camera, lens, aperture, shutter and ISO were five fields on an
    // eleven-field form, and the answers were already in the file.
    //
    // Never blocks publishing: a screenshot, a stripped export or a format the
    // parser does not recognise are all ordinary, and the frame still goes up.
    setReadingMeta(true);
    setExifFound(false);
    setDimensions({ width: null, height: null });
    readPhotoMeta(file, { isVideo: isAllowedVideo })
      .then(meta => {
        if (meta.width && meta.height) {
          setDimensions({ width: meta.width, height: meta.height });
        }
        if (meta.exif) {
          setExifFound(true);
          // Prefilled, not locked. The file is usually right and the
          // photographer always knows better.
          if (meta.exif.camera)   setCamera(meta.exif.camera);
          if (meta.exif.lens)     setLens(meta.exif.lens);
          if (meta.exif.aperture) setAperture(meta.exif.aperture);
          if (meta.exif.shutter)  setShutter(meta.exif.shutter);
          if (meta.exif.iso)      setIso(meta.exif.iso);
        }
      })
      .catch(() => { /* dimensions and EXIF are both optional */ })
      .finally(() => setReadingMeta(false));
  };

  const handlePublish = async () => {
    setModStatus('checking');
    setError('');
    
    try {
      if (!currentUser) throw new Error('Please sign in before publishing.');
      await uploadPhoto({
        file: fileObj,
        url: fileObj ? undefined : preview,
        caption,
        category,
        customStyle,
        gear: gear || camera,
        location,
        destination,
        alt_text: altText,
        exifData: { camera, lens, aperture, shutter, iso },
        // The shape of the frame, measured. Everything downstream used to
        // assume 3/4 for every photograph in the product.
        width: dimensions.width,
        height: dimensions.height
      });

      setModStatus('clear');
      setTimeout(() => navigate('/feed'), 1200);
    } catch (err) {
      console.error('Publish error:', err);
      setError(err.message || 'Error occurred while publishing your photo.');
      setModStatus(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 pb-24">
      <div className="max-w-3xl mx-auto">
        {/* Step indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted rounded-full z-0"></div>
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-card rounded-full z-0 transition-all duration-300"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            ></div>
            {[1, 2, 3, 4].map(s => (
              <div 
                key={s} 
                className={cn(
                  "relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-300",
                  step >= s ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border-2 border-border"
                )}
              >
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-3">Upload Photo or Video</h1>
              <p className="text-muted-foreground">Share high-res photos or video clips to your feed or portfolio.</p>
            </div>

            <label htmlFor="file-input" className="group block cursor-pointer mb-8">
              <div className="border-2 border-dashed border-border hover:border-ring bg-card/50 hover:bg-card transition-all rounded-3xl p-12 text-center">
                <input
                  id="file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,image/heic,video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10 text-muted-foreground" />
                </div>
                <div className="text-xl font-semibold text-foreground mb-2">Choose photo or video</div>
                <div className="text-muted-foreground mb-6">or drag and drop media file here</div>
                <div className="text-sm text-muted-foreground font-medium">JPEG, PNG, WEBP, MP4, WEBM · Max 50MB</div>
              </div>
            </label>

            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">Or use a sample photo:</p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
                  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
                  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&q=80',
                ].map((url, i) => (
                  <button 
                    key={i} 
                    onClick={() => { setPreview(url); setFileObj(null); setStep(2); }}
                    className="relative aspect-[4/3] rounded-2xl overflow-hidden group border border-border hover:border-ring transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <img src={url} alt={`Sample ${i+1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && preview && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <h1 className="text-3xl font-bold text-foreground mb-8">Edit Photo</h1>
            <div className="bg-card/50 border border-border rounded-3xl p-6 mb-8">
              <div className="rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center mb-6">
                {isVideo ? (
                  <video src={preview} controls className="max-w-full max-h-[60vh] object-contain" />
                ) : (
                  <img src={preview} alt="Preview" className="max-w-full max-h-[60vh] object-contain" />
                )}
              </div>
              {!isVideo && (
                <div className="flex flex-col items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleRotate}
                    disabled={rotating || !fileObj}
                    className="bg-muted hover:bg-muted text-foreground rounded-xl"
                  >
                    {rotating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Rotating…</>
                    ) : (
                      <><RotateCcw className="w-4 h-4 mr-2" /> Rotate</>
                    )}
                  </Button>
                  {dimensions.width && dimensions.height && (
                    <span className="text-xs text-muted-foreground">
                      {dimensions.width} × {dimensions.height}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setStep(1)} 
                className="text-muted-foreground hover:text-foreground hover:bg-card rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl px-8"
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <h1 className="text-3xl font-bold text-foreground mb-8">Details & Destination</h1>

            <div className="space-y-8 bg-card/30 border border-border/50 p-6 sm:p-8 rounded-3xl mb-8">
              {/* 1g: category is required, so it is asked first — not last. */}
              <div className="space-y-3">
                <span className="block font-mono text-[9px] font-semibold tracking-[.11em] text-foreground/[.42]">
                  CATEGORY · REQUIRED
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      aria-pressed={category === c}
                      className={cn(
                        'rounded-[7px] px-2.5 py-[7px] text-[11.5px] transition-colors',
                        category === c
                          ? 'bg-brand font-semibold text-brand-foreground'
                          : 'bg-white/[.07] text-white/70 hover:bg-white/[.12] hover:text-foreground'
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {category && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-sm font-semibold text-foreground" htmlFor="custom-style">What do you call your style of {category}?</label>
                    <Input
                      id="custom-style"
                      type="text"
                      className="mt-2 h-12 rounded-xl border-border bg-card/50 text-foreground placeholder:text-muted-foreground"
                      placeholder="e.g. Cinematic Portrait, Moody Street, Dreamy Landscape"
                      value={customStyle}
                      onChange={e => setCustomStyle(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <label className="text-sm font-semibold text-foreground">Publish to</label>
                <div className="grid sm:grid-cols-3 gap-4">
                  {DESTINATIONS.map(d => (
                    <label 
                      key={d.value} 
                      className={cn(
                        "relative flex flex-col p-4 cursor-pointer rounded-2xl border transition-all duration-200",
                        destination === d.value 
                          ? "bg-muted/80 border-ring shadow-md" 
                          : "bg-card/50 border-border hover:bg-muted"
                      )}
                    >
                      <input 
                        type="radio" 
                        name="destination" 
                        value={d.value} 
                        checked={destination === d.value} 
                        onChange={() => setDestination(d.value)} 
                        className="sr-only" 
                      />
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-foreground">{d.label}</span>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                          destination === d.value ? "border-primary" : "border-border"
                        )}>
                          {destination === d.value && <div className="w-2.5 h-2.5 bg-card rounded-full" />}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{d.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="upload-caption">Caption</label>
                <Textarea
                  id="upload-caption"
                  className="bg-card/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl resize-none min-h-[100px]"
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  maxLength={500}
                />
                <div className="text-xs text-muted-foreground text-right">{caption.length}/500</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="upload-alt-text">Screen Reader Alt Text</label>
                <Input
                  id="upload-alt-text"
                  type="text"
                  className="bg-card/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12"
                  placeholder="Describe the image for screen readers..."
                  value={altText}
                  onChange={e => setAltText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Adding alt text helps more people experience your work.</p>
              </div>


              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                  <label className="text-sm font-semibold text-foreground">Camera details</label>
                </div>

                {/* Read from the file, not typed. These five fields were the
                    bulk of the form, and the answers were already in the
                    photograph. They stay editable - the file is usually right
                    and the photographer always knows better - but they are
                    folded away, because a filled-in field nobody needs to touch
                    should not take up the screen. */}
                <div className="mb-4 rounded-xl border border-border bg-card/30 p-4">
                  {readingMeta ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Reading the camera details from your file…
                    </p>
                  ) : exifFound ? (
                    <>
                      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Check className="h-4 w-4" />
                        Read from your file
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[camera, lens, aperture, shutter, iso].filter(Boolean).join('  ·  ')}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      This file carries no camera details. That is common with
                      screenshots and exports — you can add them yourself below,
                      or leave them out.
                    </p>
                  )}
                  {dimensions.width && dimensions.height && (
                    <p className="mt-2 font-mono text-xs text-muted-foreground">
                      {dimensions.width} × {dimensions.height}
                      {' · shown at its own shape, never cropped to a square'}
                    </p>
                  )}
                </div>

                <details className="mb-4 group">
                  <summary className="cursor-pointer list-none text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                    {exifFound ? 'Correct the camera details' : 'Add camera details'}
                  </summary>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input id="upload-camera" className="bg-card/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12" placeholder="Camera body" value={camera} onChange={e => setCamera(e.target.value)} />
                    <Input id="upload-lens" className="bg-card/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12" placeholder="Lens" value={lens} onChange={e => setLens(e.target.value)} />
                    <Input id="upload-aperture" className="bg-card/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12" placeholder="Aperture" value={aperture} onChange={e => setAperture(e.target.value)} />
                    <Input id="upload-shutter" className="bg-card/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12" placeholder="Shutter" value={shutter} onChange={e => setShutter(e.target.value)} />
                    <Input id="upload-iso" className="bg-card/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12" placeholder="ISO" value={iso} onChange={e => setIso(e.target.value)} />
                  </div>
                </details>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input id="upload-location" className="bg-card/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12 pl-10" placeholder="Location (e.g. Paris)" value={location} onChange={e => setLocation(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setStep(2)} 
                className="text-muted-foreground hover:text-foreground hover:bg-card rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={() => setStep(4)} 
                disabled={!category} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl px-8 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Review <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <h1 className="text-3xl font-bold text-foreground mb-8">Review & Publish</h1>
            
            <div className="bg-card/50 border border-border rounded-3xl p-6 mb-8">
              <div className="flex flex-col sm:flex-row gap-8">
                <div className="sm:w-1/2 shrink-0">
                  <div className="rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center">
                    {isVideo ? (
                      <video src={preview} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <img src={preview} alt="Final preview" className="max-w-full max-h-full object-contain" />
                    )}
                  </div>
                </div>
                <div className="sm:w-1/2 flex flex-col justify-center space-y-6">
                  <div className="space-y-4 bg-card/50 p-6 rounded-2xl border border-border">
                    <div className="flex justify-between items-start border-b border-border/50 pb-4">
                      <span className="text-sm text-muted-foreground">Destination</span>
                      <span className="text-sm font-semibold text-foreground text-right">
                        {DESTINATIONS.find(d => d.value === destination)?.label}
                      </span>
                    </div>
                    {caption && (
                      <div className="flex justify-between items-start border-b border-border/50 pb-4">
                        <span className="text-sm text-muted-foreground">Caption</span>
                        <span className="text-sm text-foreground text-right max-w-[200px] line-clamp-2">
                          {caption}
                        </span>
                      </div>
                    )}
                    {category && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">Category</span>
                        <span className="text-sm font-medium text-foreground px-3 py-1 bg-muted rounded-full">
                          {category}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {modStatus === 'checking' && (
              <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center gap-3 animate-in fade-in zoom-in">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium">Running content check...</span>
              </div>
            )}
            {modStatus === 'clear' && (
              <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl flex items-center justify-center gap-3 animate-in fade-in zoom-in">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
                <span className="font-medium">Content check passed! Publishing...</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setStep(3)} 
                disabled={!!modStatus}
                className="text-muted-foreground hover:text-foreground hover:bg-card rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={handlePublish} 
                disabled={!!modStatus}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl px-8 min-w-[140px]"
              >
                {modStatus ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" /> Publish
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
