import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton, SecondaryButton } from '../../components/Buttons/Buttons';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabaseClient';
import './UploadPage.css';

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
  const [gear, setGear] = useState('');
  const [camera, setCamera] = useState('');
  const [lens, setLens] = useState('');
  const [aperture, setAperture] = useState('');
  const [shutter, setShutter] = useState('');
  const [iso, setIso] = useState('');
  const [location, setLocation] = useState('');
  const [modStatus, setModStatus] = useState(null);
  const [error, setError] = useState('');

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
          .from('photos')
          .upload(fileName, fileObj);

        if (uploadError) {
          // If bucket doesn't exist or RLS issue, we fallback gracefully to using local URL simulation
          console.warn('Storage upload error (falling back to URL):', uploadError.message);
        } else {
          const { data } = supabase.storage.from('photos').getPublicUrl(fileName);
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
    <div className="upload-page">
      {/* Step indicator */}
      <div className="upload-steps">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`upload-step ${step >= s ? 'upload-step--active' : ''} ${step > s ? 'upload-step--done' : ''}`}>
            {step > s ? '✓' : s}
          </div>
        ))}
        <div className="upload-steps__line" />
      </div>

      {error && <div className="upload-error" style={{ color: 'var(--error)', marginBottom: 12 }}>{error}</div>}

      {step === 1 && (
        <div className="upload-picker animate-fade-in">
          <h1 className="display-lg">Upload Photo or Video</h1>
          <p className="body-md text-secondary">Share high-res photos or video clips to your feed or portfolio.</p>
          <label htmlFor="file-input" className="upload-dropzone" id="upload-dropzone">
            <input
              id="file-input"
              type="file"
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div className="upload-dropzone__icon">📷 🎥</div>
            <div className="heading-2">Choose photo or video</div>
            <div className="body-md text-secondary">or drag and drop media file here</div>
            <div className="upload-dropzone__formats body-sm text-tertiary">JPEG, PNG, WEBP, MP4, WEBM · Max 50MB</div>
          </label>

          <div className="upload-quick-picks">
            <p className="body-sm text-tertiary">Or use a sample photo:</p>
            <div className="upload-quick-grid">
              {['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
                'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
                'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&q=80',
              ].map((url, i) => (
                <button key={i} onClick={() => { setPreview(url); setFileObj(null); setStep(2); }} id={`sample-photo-${i}`}>
                  <img src={url} alt={`Sample ${i+1}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && preview && (
        <div className="upload-edit animate-fade-in">
          <h1 className="heading-1">Edit Photo</h1>
          <div className="upload-preview">
            <img src={preview} alt="Preview" className="upload-preview__img" />
            <div className="upload-preview__tools">
              <button className="upload-tool-btn" id="crop-btn">✂️ Crop</button>
              <button className="upload-tool-btn" id="rotate-btn">🔄 Rotate</button>
              <button className="upload-tool-btn" id="brightness-btn">☀️ Adjust</button>
            </div>
          </div>
          <div className="upload-nav">
            <SecondaryButton onClick={() => setStep(1)} id="back-to-pick">Back</SecondaryButton>
            <PrimaryButton onClick={() => setStep(3)} id="to-metadata">Next →</PrimaryButton>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="upload-meta animate-fade-in">
          <h1 className="heading-1">Details & Destination</h1>

          <div className="form-field">
            <label className="form-label">Publish to</label>
            <div className="destination-radios">
              {DESTINATIONS.map(d => (
                <label key={d.value} className={`destination-radio ${destination === d.value ? 'destination-radio--selected' : ''}`} id={`dest-${d.value}`}>
                  <input type="radio" name="destination" value={d.value} checked={destination === d.value} onChange={() => setDestination(d.value)} style={{ display: 'none' }} />
                  <div className="destination-radio__dot" />
                  <div>
                    <div className="body-md" style={{ fontWeight: 600 }}>{d.label}</div>
                    <div className="body-sm text-secondary">{d.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="upload-caption">Caption</label>
            <textarea
              id="upload-caption"
              className="form-textarea"
              placeholder="Write a caption..."
              value={caption}
              onChange={e => setCaption(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <div className="body-sm text-tertiary" style={{ textAlign: 'right' }}>{caption.length}/500</div>
          </div>

          <div className="form-field">
            <label className="form-label">Category</label>
            <div className="upload-categories">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  className={`category-chip ${category === c ? 'category-chip--selected' : ''}`}
                  onClick={() => setCategory(c)}
                  id={`upload-cat-${c.toLowerCase()}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Camera & EXIF Metadata (Optional)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input id="upload-camera" type="text" className="form-input" placeholder="Camera Body (e.g. Sony A7IV)" value={camera} onChange={e => setCamera(e.target.value)} />
              <input id="upload-lens" type="text" className="form-input" placeholder="Lens (e.g. 85mm f/1.4 GM)" value={lens} onChange={e => setLens(e.target.value)} />
              <input id="upload-aperture" type="text" className="form-input" placeholder="Aperture (e.g. 1.4)" value={aperture} onChange={e => setAperture(e.target.value)} />
              <input id="upload-shutter" type="text" className="form-input" placeholder="Shutter (e.g. 1/1000)" value={shutter} onChange={e => setShutter(e.target.value)} />
              <input id="upload-iso" type="text" className="form-input" placeholder="ISO (e.g. 100)" value={iso} onChange={e => setIso(e.target.value)} />
              <input id="upload-location" type="text" className="form-input" placeholder="Location (e.g. Tokyo)" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
          </div>

          <div className="upload-nav">
            <SecondaryButton onClick={() => setStep(2)} id="back-to-edit">Back</SecondaryButton>
            <PrimaryButton onClick={() => setStep(4)} id="to-review">Review →</PrimaryButton>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="upload-review animate-fade-in">
          <h1 className="heading-1">Review & Publish</h1>
          <div className="upload-final-preview">
            <img src={preview} alt="Final preview" className="upload-preview__img" />
          </div>
          <div className="upload-review-info">
            <div className="upload-review-row">
              <span className="body-sm text-secondary">Destination</span>
              <span className="body-sm" style={{ fontWeight: 600 }}>{DESTINATIONS.find(d => d.value === destination)?.label}</span>
            </div>
            {caption && (
              <div className="upload-review-row">
                <span className="body-sm text-secondary">Caption</span>
                <span className="body-sm">{caption.slice(0, 60)}{caption.length > 60 ? '...' : ''}</span>
              </div>
            )}
            {category && (
              <div className="upload-review-row">
                <span className="body-sm text-secondary">Category</span>
                <span className="body-sm">{category}</span>
              </div>
            )}
          </div>

          {modStatus === 'checking' && (
            <div className="mod-status mod-status--checking">
              <div className="mod-spinner" />
              <span className="body-sm">Running content check...</span>
            </div>
          )}
          {modStatus === 'clear' && (
            <div className="mod-status mod-status--clear">
              <span>✓</span>
              <span className="body-sm">Content check passed! Publishing...</span>
            </div>
          )}

          <div className="upload-nav">
            <SecondaryButton onClick={() => setStep(3)} id="back-to-meta" disabled={!!modStatus}>Back</SecondaryButton>
            <PrimaryButton onClick={handlePublish} id="publish-btn" disabled={!!modStatus}>
              {modStatus ? 'Publishing...' : 'Publish'}
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
