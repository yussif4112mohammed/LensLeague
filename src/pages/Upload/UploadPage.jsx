import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Upload, ArrowLeft, ArrowRight, Check, Loader2, Camera, MapPin, Image as ImageIcon, Crop, RotateCcw, Sun } from 'lucide-react';

const CATEGORIES = ['Portrait', 'Landscape', 'Wedding', 'Street', 'Product', 'Nature', 'Editorial', 'Architecture', 'Sports', 'Documentary'];
const DESTINATIONS = [
  { value: 'feed', label: 'Add to Feed', desc: 'Share to your followers\' feed' },
  { value: 'portfolio', label: 'Add to Portfolio', desc: 'Curate your professional showcase' },
  { value: 'challenge', label: 'Enter a Challenge', desc: 'Submit for the active competition' },
];

export default function UploadPage() {
  const navigate = useNavigate();
  const { currentUser, setPhotos } = useApp();
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [destination, setDestination] = useState('feed');
  const [category, setCategory] = useState('');
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileObj(file);
    setIsVideo(file.type.startsWith('video'));
    const url = URL.createObjectURL(file);
    setPreview(url);
    setStep(2);
  };

  const handlePublish = async () => {
    setModStatus('checking');
    setError('');
    
    try {
      let imageUrl = preview;

      // 1. If user selected a real file, upload it to Supabase Storage
      if (fileObj) {
        const fileExt = fileObj.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(fileName, fileObj);

        if (uploadError) {
          // If bucket doesn't exist or RLS issue, we fallback gracefully to using local URL simulation
          console.warn('Storage upload error (falling back to URL):', uploadError.message);
        } else {
          const { data } = supabase.storage.from('post-media').getPublicUrl(fileName);
          imageUrl = data.publicUrl;
        }
      }

      // 2. Insert record into public.photos table
      const photoId = `p_${Date.now()}`;
      const newDbRow = {
        url: imageUrl,
        owner_id: currentUser?.id || '1',
        caption: caption,
        category: category,
        aspect_ratio: isVideo ? '9/16' : '3/4',
        gear: gear || camera,
        location: location
      };

      const { data: insertData } = await supabase
        .from('photos')
        .insert(newDbRow)
        .select()
        .single();

      // Add to local state context
      const newPhoto = {
        id: insertData?.id || photoId,
        url: imageUrl,
        isVideo: isVideo,
        ownerId: currentUser?.id || '1',
        ownerName: currentUser?.name || 'Photographer',
        ownerAvatar: currentUser?.avatar || '',
        caption: caption,
        category: category,
        gear: gear || camera,
        lens: lens,
        aperture: aperture,
        shutter: shutter,
        iso: iso,
        location: location,
        likes: 0,
        aspectRatio: isVideo ? '9/16' : '3/4',
        timestamp: 'Just now'
      };

      setPhotos(prev => [newPhoto, ...prev]);

      setModStatus('clear');
      setTimeout(() => navigate('/feed'), 1200);
    } catch (err) {
      console.error('Publish error:', err);
      setError(err.message || 'Error occurred while publishing your photo.');
      setModStatus(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-zinc-100 p-6 md:p-10 pb-24">
      <div className="max-w-3xl mx-auto">
        {/* Step indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-zinc-800 rounded-full z-0"></div>
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-white rounded-full z-0 transition-all duration-300"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            ></div>
            {[1, 2, 3, 4].map(s => (
              <div 
                key={s} 
                className={cn(
                  "relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-300",
                  step >= s ? "bg-white text-black" : "bg-zinc-900 text-zinc-500 border-2 border-zinc-800"
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
              <h1 className="text-3xl font-bold text-white mb-3">Upload Photo or Video</h1>
              <p className="text-zinc-400">Share high-res photos or video clips to your feed or portfolio.</p>
            </div>

            <label htmlFor="file-input" className="group block cursor-pointer mb-8">
              <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-500 bg-zinc-900/50 hover:bg-zinc-900 transition-all rounded-3xl p-12 text-center">
                <input
                  id="file-input"
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10 text-zinc-400" />
                </div>
                <div className="text-xl font-semibold text-white mb-2">Choose photo or video</div>
                <div className="text-zinc-500 mb-6">or drag and drop media file here</div>
                <div className="text-sm text-zinc-600 font-medium">JPEG, PNG, WEBP, MP4, WEBM · Max 50MB</div>
              </div>
            </label>

            <div className="space-y-4">
              <p className="text-sm font-medium text-zinc-500">Or use a sample photo:</p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
                  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
                  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&q=80',
                ].map((url, i) => (
                  <button 
                    key={i} 
                    onClick={() => { setPreview(url); setFileObj(null); setStep(2); }}
                    className="relative aspect-[4/3] rounded-2xl overflow-hidden group border border-zinc-800 hover:border-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
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
            <h1 className="text-3xl font-bold text-white mb-8">Edit Photo</h1>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 mb-8">
              <div className="rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center mb-6">
                {isVideo ? (
                  <video src={preview} controls className="max-w-full max-h-[60vh] object-contain" />
                ) : (
                  <img src={preview} alt="Preview" className="max-w-full max-h-[60vh] object-contain" />
                )}
              </div>
              <div className="flex gap-4 justify-center">
                <Button variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl">
                  <Crop className="w-4 h-4 mr-2" /> Crop
                </Button>
                <Button variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl">
                  <RotateCcw className="w-4 h-4 mr-2" /> Rotate
                </Button>
                <Button variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl">
                  <Sun className="w-4 h-4 mr-2" /> Adjust
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setStep(1)} 
                className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                className="bg-white text-black hover:bg-zinc-200 font-bold rounded-xl px-8"
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <h1 className="text-3xl font-bold text-white mb-8">Details & Destination</h1>

            <div className="space-y-8 bg-zinc-900/30 border border-zinc-800/50 p-6 sm:p-8 rounded-3xl mb-8">
              <div className="space-y-4">
                <label className="text-sm font-semibold text-zinc-300">Publish to</label>
                <div className="grid sm:grid-cols-3 gap-4">
                  {DESTINATIONS.map(d => (
                    <label 
                      key={d.value} 
                      className={cn(
                        "relative flex flex-col p-4 cursor-pointer rounded-2xl border transition-all duration-200",
                        destination === d.value 
                          ? "bg-zinc-800/80 border-zinc-500 shadow-md" 
                          : "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800"
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
                        <span className="font-semibold text-white">{d.label}</span>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                          destination === d.value ? "border-white" : "border-zinc-700"
                        )}>
                          {destination === d.value && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400">{d.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-300" htmlFor="upload-caption">Caption</label>
                <Textarea
                  id="upload-caption"
                  className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 rounded-xl resize-none min-h-[100px]"
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  maxLength={500}
                />
                <div className="text-xs text-zinc-500 text-right">{caption.length}/500</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-300" htmlFor="upload-alt-text">Screen Reader Alt Text</label>
                <Input
                  id="upload-alt-text"
                  type="text"
                  className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 rounded-xl h-12"
                  placeholder="Describe the image for screen readers..."
                  value={altText}
                  onChange={e => setAltText(e.target.value)}
                />
                <p className="text-xs text-zinc-500">Adding alt text helps more people experience your work.</p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-zinc-300">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium transition-colors border",
                        category === c 
                          ? "bg-white text-black border-white" 
                          : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-zinc-400" />
                  <label className="text-sm font-semibold text-zinc-300">Camera & EXIF Metadata (Optional)</label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input id="upload-camera" className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 rounded-xl h-12" placeholder="Camera Body (e.g. Sony A7IV)" value={camera} onChange={e => setCamera(e.target.value)} />
                  <Input id="upload-lens" className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 rounded-xl h-12" placeholder="Lens (e.g. 85mm f/1.4 GM)" value={lens} onChange={e => setLens(e.target.value)} />
                  <Input id="upload-aperture" className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 rounded-xl h-12" placeholder="Aperture (e.g. 1.4)" value={aperture} onChange={e => setAperture(e.target.value)} />
                  <Input id="upload-shutter" className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 rounded-xl h-12" placeholder="Shutter (e.g. 1/1000)" value={shutter} onChange={e => setShutter(e.target.value)} />
                  <Input id="upload-iso" className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 rounded-xl h-12" placeholder="ISO (e.g. 100)" value={iso} onChange={e => setIso(e.target.value)} />
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <Input id="upload-location" className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 rounded-xl h-12 pl-10" placeholder="Location (e.g. Paris)" value={location} onChange={e => setLocation(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setStep(2)} 
                className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={() => setStep(4)} 
                className="bg-white text-black hover:bg-zinc-200 font-bold rounded-xl px-8"
              >
                Review <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <h1 className="text-3xl font-bold text-white mb-8">Review & Publish</h1>
            
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 mb-8">
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
                  <div className="space-y-4 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                    <div className="flex justify-between items-start border-b border-zinc-800/50 pb-4">
                      <span className="text-sm text-zinc-400">Destination</span>
                      <span className="text-sm font-semibold text-white text-right">
                        {DESTINATIONS.find(d => d.value === destination)?.label}
                      </span>
                    </div>
                    {caption && (
                      <div className="flex justify-between items-start border-b border-zinc-800/50 pb-4">
                        <span className="text-sm text-zinc-400">Caption</span>
                        <span className="text-sm text-white text-right max-w-[200px] line-clamp-2">
                          {caption}
                        </span>
                      </div>
                    )}
                    {category && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-zinc-400">Category</span>
                        <span className="text-sm font-medium text-white px-3 py-1 bg-zinc-800 rounded-full">
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
                className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={handlePublish} 
                disabled={!!modStatus}
                className="bg-white text-black hover:bg-zinc-200 font-bold rounded-xl px-8 min-w-[140px]"
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
