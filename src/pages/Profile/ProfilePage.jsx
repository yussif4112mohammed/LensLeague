import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useApp, PROFILE_COLUMNS } from '../../context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PhotoCard from '../../components/PhotoCard/PhotoCard';
import CommentSheet from '../../components/CommentSheet/CommentSheet';
import Lightbox from '../../components/Lightbox/Lightbox';
import { supabase } from '../../lib/supabaseClient';
import { Camera, SearchX, LogIn, ImageOff, MessageSquare, Plus, Edit2, History, MapPin, X } from 'lucide-react';
import './ProfilePage.css';

function PhotoDetailModal({ photo, onClose, onNavigateProfile }) {
  const { currentUser, toggleLikePost, toggleSavedItem, savedItemIds } = useApp();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(photo?.likes || 0);
  const [showComments, setShowComments] = useState(false);

  // Check if current user has already liked this photo
  useEffect(() => {
    if (!currentUser || !photo) return;
    const checkLiked = async () => {
      try {
        const { data } = await supabase
          .from('likes')
          .select('user_id')
          .eq('user_id', currentUser.id)
          .eq('item_id', photo.id)
          .maybeSingle();
        if (data) setLiked(true);
      } catch (e) { /* ignore */ }
    };
    checkLiked();
  }, [currentUser, photo]);

  useEffect(() => {
    if (photo) setSaved(savedItemIds.includes(photo.id));
  }, [photo, savedItemIds]);

  if (!photo) return null;

  const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
        <Card className="max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row bg-card shadow-2xl border-border/50 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
          <div className="relative flex-1 bg-black/90 flex items-center justify-center overflow-hidden min-h-[300px] md:min-h-0">
            <img src={photo.url} alt={photo.caption} className="max-w-full max-h-full object-contain" />
            <button className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-black text-foreground rounded-full transition-colors md:hidden" onClick={onClose}>✕</button>
          </div>
          
          <div className="w-full md:w-[380px] flex flex-col bg-card border-l border-border/40">
            <div className="p-4 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { onClose(); onNavigateProfile?.(); }}>
                <Avatar className="h-10 w-10 border border-border group-hover:border-ring transition-colors">
                  <AvatarImage src={photo.ownerAvatar} />
                  <AvatarFallback>{photo.ownerName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-sm leading-tight group-hover:text-primary transition-colors">{photo.ownerName}</div>
                  {photo.location && <div className="text-xs text-muted-foreground">{photo.location}</div>}
                </div>
              </div>
              <button className="hidden md:block p-2 text-muted-foreground hover:text-foreground hover:scale-110 transition-all" onClick={onClose}>✕</button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {photo.caption && (
                <p className="text-sm mb-4">
                  <span className="font-bold mr-2">{photo.ownerName}</span>
                  {photo.caption}
                </p>
              )}
              {photo.gear && <p className="text-sm text-muted-foreground mb-2">📷 {photo.gear}</p>}
              {photo.category && <Badge variant="secondary" className="mb-4">#{photo.category?.toLowerCase()}</Badge>}
            </div>

            <div className="p-4 border-t border-border/40">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <button className={`hover:scale-110 active:scale-95 transition-transform ${liked ? 'text-red-500' : 'text-foreground'}`} onClick={() => { 
                    setLiked(!liked); 
                    setLikeCount(c => liked ? c - 1 : c + 1);
                    toggleLikePost(photo.id);
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </button>
                  <button className="hover:scale-110 active:scale-95 transition-transform" onClick={() => setShowComments(true)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                </div>
                <button className={`hover:scale-110 active:scale-95 transition-transform ${saved ? 'text-primary' : 'text-foreground'}`} onClick={async () => {
                  const previous = saved;
                  setSaved(!previous);
                  const result = await toggleSavedItem(photo.id);
                  if (!result.success) setSaved(previous);
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                </button>
              </div>
              {likeCount > 0 && <div className="text-sm font-bold mb-1">{fmt(likeCount)} likes</div>}
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowComments(true)}>
                View all {fmt(photo.comments || 24)} comments
              </button>
            </div>
          </div>
        </Card>
      </div>
      {showComments && <CommentSheet photo={photo} onClose={() => setShowComments(false)} />}
    </>
  );
}

function SkeletonProfile() {
  return (
    <div className="w-full min-h-screen bg-background animate-pulse pb-20">
      <div className="relative h-64 md:h-80 w-full bg-card border-b border-border/50" />
      <div className="max-w-5xl mx-auto px-6 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between mb-8">
          <div className="flex items-end gap-6">
            <div className="h-32 w-32 rounded-full bg-muted border-4 border-background shadow-xl" />
            <div className="pb-2 space-y-3">
              <div className="h-8 w-48 bg-muted rounded-md" />
              <div className="h-4 w-32 bg-muted rounded-md" />
            </div>
          </div>
          <div className="pb-2">
            <div className="h-10 w-32 bg-muted rounded-full" />
          </div>
        </div>
        <div className="space-y-3 mb-8 max-w-3xl">
          <div className="h-4 w-full bg-muted rounded-md" />
          <div className="h-4 w-5/6 bg-muted rounded-md" />
          <div className="h-4 w-4/6 bg-muted rounded-md" />
        </div>
        <div className="flex gap-4 mb-12">
          <div className="h-8 w-24 bg-muted rounded-xl" />
          <div className="h-8 w-24 bg-muted rounded-xl" />
          <div className="h-8 w-24 bg-muted rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-border rounded-3xl bg-card shadow-sm transition-all hover:bg-muted/50 my-8">
      <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mb-6 shadow-inner border border-border">
        <Icon className="w-10 h-10 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-3">{title}</h2>
      <p className="text-muted-foreground text-sm max-w-sm mb-8 leading-relaxed">
        {desc}
      </p>
      {action && action}
    </div>
  );
}

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addBookingRequest, users, updateProfile, follows, followUser, unfollowUser, currentUser, photos, sendInquiry } = useApp();
  
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  // Inquiry: the client's first message to a photographer. Deliberately a
  // message in the real messaging system, not a separate "contact" concept.
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryText, setInquiryText] = useState('');
  const [inquiryError, setInquiryError] = useState('');
  const [inquirySending, setInquirySending] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  // Both profile layouts from turn 1 are built; this picks between them.
  // 'grid'    = 1a, portfolio grid is the default view
  // 'journey' = 1b, featured work full-bleed then work grouped by year
  const [galleryMode, setGalleryMode] = useState(() => {
    try { return localStorage.getItem('ll_profile_layout') || 'grid'; } catch { return 'grid'; }
  });
  const setLayout = (mode) => {
    setGalleryMode(mode);
    try { localStorage.setItem('ll_profile_layout', mode); } catch { /* private mode */ }
  };
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [customMilestones, setCustomMilestones] = useState([]);
  
  const [fetchedUser, setFetchedUser] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (id === 'me') return;
    if (currentUser && id === currentUser.id) return;
    if (users.find(p => p.id === id)) return;
    
    const fetchProfile = async () => {
      setLoadingProfile(true);
      const { data } = await supabase
        .from('profiles')
        // Not select('*'): profiles.email/phone are no longer readable by
        // the anon and authenticated roles (migration v11).
        .select(PROFILE_COLUMNS)
        .eq('id', id)
        .single();
      if (data) setFetchedUser(data);
      setLoadingProfile(false);
    };
    fetchProfile();
  }, [id, currentUser, users]);

  // ── THE GALLERY QUERY ─────────────────────────────────────────────────────
  //
  // Scoped to one photographer, so it is unaffected by the platform-wide 100-row
  // cap that made a gallery go empty once the app held more than 100 photographs.
  //
  // ALBUM-READY BY CONSTRUCTION. The spec asked for albums to be introducible
  // later without a rewrite, and NOT to be built now. So:
  //   - portfolio_items already carries album_id, and every upload lands in a
  //     "Portfolio" album, so the relationship exists in the data today
  //   - this selects album_id and the album's title alongside each photograph
  //   - the rows are grouped through one function, groupIntoAlbums() below
  // Adding albums later means rendering that grouping with more than one bucket.
  // No query changes, no schema changes, no migration.
  useEffect(() => {
    const target = (currentUser && (id === currentUser.id || id === 'me'))
      ? currentUser?.id
      : id;
    if (!target || target === 'me') return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('id, media_url, caption, categories, custom_style, alt_text, location, like_count, comment_count, created_at, album_id, albums(title, privacy_level)')
        .eq('photographer_id', target)
        .order('created_at', { ascending: false })
        .limit(200);

      if (cancelled) return;
      if (error) {
        // Leave galleryPhotos null so the page falls back to whatever the
        // context already holds, rather than showing an empty gallery.
        console.warn('gallery query failed:', error.message);
        return;
      }
      setGalleryPhotos((data || []).map(row => ({
        id: row.id,
        url: row.media_url,
        caption: row.caption,
        category: row.categories?.[0] || null,
        customStyle: row.custom_style || null,
        alt: row.alt_text || null,
        location: row.location || null,
        likes: row.like_count || 0,
        comments: row.comment_count || 0,
        created_at: row.created_at,
        ownerId: target,
        albumId: row.album_id,
        albumTitle: row.albums?.title || 'Portfolio',
      })));
    })();
    return () => { cancelled = true; };
  }, [id, currentUser]);

  let photographer = (currentUser && (id === currentUser.id || id === 'me')) ? currentUser : users.find(p => p.id === id);
  if (!photographer) photographer = fetchedUser;

  const isOwnProfile = currentUser && (id === currentUser.id || id === 'me');

  const [bookingForm, setBookingForm] = useState({ date: '', budget: '', location: '', message: '' });
  const [editForm, setEditForm] = useState({ 
    name: '', username: '', bio: '', location: '', 
    availability_status: '', service_categories: ''
  });
  const [milestoneForm, setMilestoneForm] = useState({ title: '', desc: '', date: '', icon: '🏆' });

  const [showLocationNudge, setShowLocationNudge] = useState(() => {
    return !localStorage.getItem('lensleague_location_enabled');
  });

  const handleEnableLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          localStorage.setItem('lensleague_location_enabled', 'true');
          setShowLocationNudge(false);
        },
        (error) => {
          console.warn('Location access denied or failed', error);
          localStorage.setItem('lensleague_location_enabled', 'denied');
          setShowLocationNudge(false);
        }
      );
    }
  };

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  // The banner had no input at all: "Change cover" opened this modal, and the
  // modal had no cover field, so there was no way to set one.
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  // Upload failures used to go to console.warn and nowhere else, so a failed
  // image looked identical to a successful save that did nothing.
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (photographer) {
      setEditForm({
        name: photographer.name || '',
        username: photographer.username || '',
        bio: photographer.bio || '',
        location: photographer.location || '',
        availability_status: photographer.availability_status || '',
        service_categories: (photographer.service_categories || []).join(', ')
      });
      setAvatarPreview(photographer.avatar_url || photographer.avatar);
      setAvatarFile(null);
      setCoverPreview(photographer.cover_url || photographer.cover || null);
      setCoverFile(null);
      setEditError('');
    }
  }, [photographer]);

  const [isMeLoading, setIsMeLoading] = useState(id === 'me');
  useEffect(() => {
    if (id === 'me') {
      if (currentUser) setIsMeLoading(false);
      else {
        const timer = setTimeout(() => setIsMeLoading(false), 2000);
        return () => clearTimeout(timer);
      }
    } else {
      setIsMeLoading(false);
    }
  }, [id, currentUser]);

  if (!photographer) {
    if (loadingProfile || isMeLoading) return <SkeletonProfile />;
    if (!currentUser && id === 'me') return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
        <EmptyState 
          icon={LogIn} 
          title="Log In Required" 
          desc="You need to be logged in to view and edit your profile."
          action={
            <Button className="rounded-full px-8 hover:scale-105 active:scale-95 transition-all" onClick={() => navigate('/login')}>Sign In</Button>
          }
        />
      </div>
    );
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
        <EmptyState 
          icon={SearchX} 
          title="Profile Not Found" 
          desc="This creator doesn't exist or hasn't set up their profile yet."
          action={
            <Button variant="outline" className="rounded-full px-8 hover:scale-105 active:scale-95 transition-all" onClick={() => navigate('/feed')}>Return to Feed</Button>
          }
        />
      </div>
    );
  }

  // Gallery photographs come from a query scoped to THIS photographer.
  //
  // They used to be filtered out of the global `photos` array, which AppContext
  // caps at 100 rows across the entire platform. Once the 101st photograph
  // existed anywhere, a photographer could open their own profile and find their
  // gallery empty. Fetched per profile below; the context array is only the
  // initial paint while that query runs.
  const [galleryPhotos, setGalleryPhotos] = useState(null);
  const userPhotos = galleryPhotos ?? photos.filter(p => p.ownerId === photographer.id);

  // Recognition rail. Four tiers, no losses shown, no ranked position — per the
  // product spec. Built only from data we actually hold, so an empty record
  // renders nothing rather than a fabricated award.
  const recognition = [
    ...(photographer.wins > 0
      ? [{ tier: 'WINNER', tierLabel: 'Winner', label: `${photographer.wins} league ${photographer.wins === 1 ? 'win' : 'wins'}` }]
      : []),
    ...(photographer.competitions_won > 0 && photographer.competitions_won !== photographer.wins
      ? [{ tier: 'RUNNER-UP', tierLabel: 'Runner-up', label: `${photographer.competitions_won} placed entries` }]
      : []),
    ...(photographer.verified
      ? [{ tier: 'FEATURE', tierLabel: 'Feature', label: 'Verified creator' }]
      : []),
  ];

  // Only website. email and phone are REVOKED from the public roles at the
  // database level (migration v11) - they are not merely hidden in the UI, they
  // cannot be selected at all, so those rows could never render. `instagram` is
  // not a column on profiles either. Contact happens through Inquire, which is
  // the point: a conversation in the app, not an address to harvest.
  const contactRows = [
    photographer.website
      ? { label: String(photographer.website).replace(/^https?:\/\//, ''),
          href: photographer.website.startsWith('http') ? photographer.website : `https://${photographer.website}` }
      : null,
  ].filter(Boolean);

  // Journey view (1b): newest work leads, the rest grouped by year.
  const photosByYear = userPhotos.reduce((acc, ph) => {
    const y = ph.created_at ? new Date(ph.created_at).getFullYear() : 'Earlier';
    (acc[y] = acc[y] || []).push(ph);
    return acc;
  }, {});
  const journeyYears = Object.keys(photosByYear).sort((a, b) => String(b).localeCompare(String(a)));
  // There is no `reviews` table and no `profiles.reviews` column, so this was
  // always []. The tab has been removed rather than left as a permanently empty
  // section implying reviews exist somewhere.

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    setInquirySending(true);
    setInquiryError('');
    const result = await sendInquiry(photographer.id, inquiryText);
    setInquirySending(false);
    if (!result.success) {
      setInquiryError(result.error);
      return;
    }
    // Land them in the conversation, not on a "thanks, we'll be in touch" screen.
    setInquiryOpen(false);
    setInquiryText('');
    navigate('/inbox');
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    const result = await addBookingRequest(photographer.id, bookingForm);
    if (!result?.success) return;
    setBookingSuccess(true);
    setTimeout(() => {
      setBookingModalOpen(false);
      setBookingSuccess(false);
      setBookingForm({ date: '', budget: '', location: '', message: '' });
    }, 2000);
  };

  /**
   * Upload one image into the caller's own folder in the avatars bucket.
   *
   * The bucket's write policy is folder-scoped to auth.uid(), so both the avatar
   * and the cover live under `${currentUser.id}/` and are covered by the same
   * rule - no new bucket and no new policy needed.
   */
  const uploadProfileImage = async (file, kind) => {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${currentUser.id}/${kind}.${ext}`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw new Error(`${kind === 'avatar' ? 'Profile picture' : 'Banner'} upload failed: ${error.message}`);
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    // Cache-bust, or the browser keeps serving the previous image at this path.
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSavingEdit(true);
    setEditError('');

    try {
      const updateData = { ...editForm };
      updateData.service_categories =
        typeof updateData.service_categories === 'string' && updateData.service_categories.trim()
          ? updateData.service_categories.split(',').map(t => t.trim()).filter(Boolean)
          : [];

      if (avatarFile) {
        const url = await uploadProfileImage(avatarFile, 'avatar');
        // Both fields are written so the rail, the feed and the profile cannot
        // disagree about which avatar is current.
        updateData.avatar = url;
        updateData.avatar_url = url;
      }
      if (coverFile) {
        updateData.cover_url = await uploadProfileImage(coverFile, 'cover');
      }

      await updateProfile(photographer.id, updateData);
      setEditModalOpen(false);
    } catch (err) {
      // Say what went wrong, in the dialog, instead of closing as if it worked.
      setEditError(err.message || 'Could not save your changes. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const isFollowing = currentUser && follows.some(f => f.follower_id === currentUser.id && f.following_id === photographer.id);

  return (
    <div className="min-h-screen w-full animate-in fade-in bg-background text-foreground">

      {/* ── Cover + identity — mockups 2b (desktop) / 2d (tablet) ── */}
      <header className="relative h-[220px] flex-none xl:h-[250px]">
        {(photographer.cover_url || photographer.cover) ? (
          <img src={photographer.cover_url || photographer.cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{ backgroundImage: 'repeating-linear-gradient(115deg,#26272b 0 12px,#1c1d20 12px 24px)' }}
          />
        )}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(to top,rgba(13,13,14,.96),rgba(13,13,14,.1) 70%)' }}
        />

        <div className="absolute left-5 top-5 z-10 flex gap-2">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[.12] bg-black/40 text-white/80 backdrop-blur-md transition-colors hover:text-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          {isOwnProfile && (
            <button
              onClick={() => setEditModalOpen(true)}
              aria-label="Change cover"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[.12] bg-black/40 text-white/80 backdrop-blur-md transition-colors hover:text-foreground"
            >
              <Camera className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end gap-4 px-5 pb-5 md:px-7 md:gap-[18px] xl:gap-5 xl:px-[34px] xl:pb-[22px]">
          <Avatar className="h-[72px] w-[72px] flex-none border-[3px] border-background md:h-[88px] md:w-[88px] xl:h-[104px] xl:w-[104px]">
            <AvatarImage src={photographer.avatar_url || photographer.avatar} className="object-cover" />
            <AvatarFallback className="bg-muted text-xl font-bold text-white/60">
              {photographer.name?.[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-[200px] flex-1 flex-col gap-[7px] pb-1">
            <div className="flex items-center gap-[9px]">
              <h1 className="text-[23px] font-bold leading-none tracking-[-.02em] xl:text-[27px]">
                {photographer.name}
              </h1>
              {photographer.verified && (
                <span
                  className="flex h-[17px] w-[17px] flex-none items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-foreground"
                  title="Verified creator"
                >
                  ✓
                </span>
              )}
            </div>
            <span className="text-[13px] leading-none text-white/60 xl:text-[13.5px]">
              {[
                (photographer.service_categories || photographer.specialties || []).slice(0, 2).join(' & '),
                photographer.location,
                photographer.created_at ? `shooting since ${new Date(photographer.created_at).getFullYear()}` : null,
              ].filter(Boolean).join(' · ')}
            </span>
          </div>

          <div className="flex gap-[9px] pb-1.5">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => navigate('/upload')}
                  className="flex h-[38px] items-center rounded-[9px] bg-brand px-5 text-[13px] font-semibold text-brand-foreground transition-opacity hover:opacity-90"
                >
                  Upload
                </button>
                <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                  <DialogTrigger asChild>
                    <button className="flex h-[38px] items-center rounded-[9px] border border-white/20 px-5 text-[13px] font-semibold text-white/90 transition-colors hover:bg-white/[.06]">
                      Edit profile
                    </button>
                  </DialogTrigger>
                  <DialogContent className="border-border bg-background text-foreground sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
                      <div className="flex flex-col items-center gap-4">
                        <Avatar className="h-24 w-24 border border-border shadow-xl">
                          <AvatarImage src={avatarPreview} />
                        </Avatar>
                        <Button variant="secondary" size="sm" type="button" className="relative cursor-pointer overflow-hidden rounded-full border border-border bg-card text-foreground hover:bg-muted">
                          Change Avatar
                          <input type="file" className="absolute inset-0 cursor-pointer opacity-0" accept="image/*" onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
                          }} />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Banner</label>
                        <div className="relative h-24 w-full overflow-hidden rounded-lg border border-border bg-card">
                          {coverPreview ? (
                            <img src={coverPreview} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                              No banner yet
                            </div>
                          )}
                          <input
                            type="file"
                            aria-label="Change banner"
                            className="absolute inset-0 cursor-pointer opacity-0"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); }
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <Input value={editForm.name} onChange={e=>setEditForm({...editForm, name: e.target.value})} className="border-border bg-card" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Bio</label>
                        <Textarea value={editForm.bio} onChange={e=>setEditForm({...editForm, bio: e.target.value})} className="resize-none border-border bg-card" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Location</label>
                        <Input placeholder="City, Country" value={editForm.location} onChange={e=>setEditForm({...editForm, location: e.target.value})} className="border-border bg-card" />
                      </div>
                      {photographer.role === 'photographer' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Availability Status</label>
                            <Input placeholder="e.g. Available for booking" value={editForm.availability_status} onChange={e=>setEditForm({...editForm, availability_status: e.target.value})} className="border-border bg-card" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Services (comma separated)</label>
                            <Input placeholder="Wedding, Portrait, Event" value={editForm.service_categories} onChange={e=>setEditForm({...editForm, service_categories: e.target.value})} className="border-border bg-card" />
                          </div>
                        </>
                      )}
                      {editError && (
                        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {editError}
                        </p>
                      )}
                      <Button type="submit" className="h-11 w-full rounded-full font-bold" disabled={isSavingEdit}>{isSavingEdit ? 'Saving...' : 'Save Changes'}</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <>
                <button
                  onClick={() => isFollowing ? unfollowUser(photographer.id) : followUser(photographer.id)}
                  className={cn(
                    'flex h-[38px] items-center rounded-[9px] px-5 text-[13px] font-semibold transition-colors',
                    isFollowing
                      ? 'border border-white/20 text-white/90 hover:bg-white/[.06]'
                      : 'bg-brand text-brand-foreground hover:opacity-90'
                  )}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
                  <DialogTrigger asChild>
                    <button className="flex h-[38px] items-center rounded-[9px] border border-white/20 px-5 text-[13px] font-semibold text-white/90 transition-colors hover:bg-white/[.06]">
                      Hire me
                    </button>
                  </DialogTrigger>
                  <DialogContent className="border-border bg-background text-foreground sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Book {photographer.name}</DialogTitle>
                      <DialogDescription>Submit your project details directly to the creator.</DialogDescription>
                    </DialogHeader>
                    {bookingSuccess ? (
                      <div className="flex flex-col items-center py-12 text-center">
                        <div className="mb-4 animate-bounce text-5xl">🎉</div>
                        <h3 className="mb-2 text-xl font-bold">Request Sent</h3>
                        <p className="text-muted-foreground">Opening conversation thread...</p>
                      </div>
                    ) : (
                      <form onSubmit={handleBookingSubmit} className="space-y-4 pt-4">
                        <Input type="date" required value={bookingForm.date} onChange={e=>setBookingForm({...bookingForm, date: e.target.value})} className="border-border bg-card" />
                        <Input placeholder="Location" required value={bookingForm.location} onChange={e=>setBookingForm({...bookingForm, location: e.target.value})} className="border-border bg-card" />
                        <Input placeholder="Budget (e.g. $1000)" required value={bookingForm.budget} onChange={e=>setBookingForm({...bookingForm, budget: e.target.value})} className="border-border bg-card" />
                        <Textarea placeholder="Describe the shoot..." required value={bookingForm.message} onChange={e=>setBookingForm({...bookingForm, message: e.target.value})} className="border-border bg-card" />
                        <Button type="submit" className="w-full rounded-full font-bold">Send Request</Button>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>
                {/* Inquire, not a price. The spec was explicit: no fixed rate on
                    the profile, and no contact form that sends nowhere. This
                    opens a real thread in the real messaging system. */}
                <Dialog open={inquiryOpen} onOpenChange={setInquiryOpen}>
                  <DialogTrigger asChild>
                    <button
                      id="profile-inquire"
                      className="flex h-[38px] items-center rounded-[9px] bg-primary px-5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Inquire
                    </button>
                  </DialogTrigger>
                  <DialogContent className="border-border bg-card sm:max-w-[460px]">
                    <DialogHeader>
                      <DialogTitle>Contact {photographer.name?.split(' ')[0] || 'this photographer'}</DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        Tell them what you have in mind — the kind of shoot, roughly when,
                        and anything that matters to you. This starts a real conversation
                        in your inbox.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleInquirySubmit} className="space-y-3">
                      <Textarea
                        value={inquiryText}
                        onChange={(e) => { setInquiryText(e.target.value); setInquiryError(''); }}
                        placeholder="I'm looking for a photographer for..."
                        rows={5}
                        maxLength={2000}
                        required
                        className="border-border bg-background"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          {inquiryText.trim().length}/2000
                        </span>
                        {inquiryError && (
                          <span className="text-[12px] text-red-400">{inquiryError}</span>
                        )}
                      </div>
                      <Button
                        type="submit"
                        disabled={inquirySending}
                        className="w-full rounded-full font-bold"
                      >
                        {inquirySending ? 'Sending…' : 'Send message'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
      </header>

      {showLocationNudge && currentUser && isOwnProfile && (
        <div className="mx-auto mt-4 flex max-w-[1400px] items-center justify-between gap-3 rounded-lg border border-white/[.08] bg-card p-3 px-5 md:px-7">
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 flex-none text-white/60" />
            <p className="text-[13px] text-white/70">
              Turn on location to help nearby clients find you. Your exact position is never shown.
            </p>
          </div>
          <div className="flex flex-none items-center gap-2">
            <button onClick={handleEnableLocation} className="rounded-md bg-brand px-3 py-1.5 text-[12px] font-semibold text-brand-foreground">Enable</button>
            <button aria-label="Dismiss" onClick={() => { localStorage.setItem('lensleague_location_enabled','dismissed'); setShowLocationNudge(false); }} className="p-1 text-white/50 hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Body: work on the left, context on the right (2b). On tablet the
             right column drops inline under the identity block (2d). ── */}
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-5 pb-20 md:px-7 xl:flex-row xl:gap-0 xl:px-0">
        <div className="min-w-0 flex-1 xl:px-[34px]">

          {/* Tablet / mobile: bio, contact and recognition inline (2d) */}
          <div className="flex flex-col gap-3.5 pt-4 xl:hidden">
            {photographer.bio && (
              <p className="max-w-[560px] text-[14px] leading-[1.55] text-foreground/[.78] text-pretty">{photographer.bio}</p>
            )}
            {contactRows.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {contactRows.map((c) => (
                  <a key={c.label} href={c.href} target="_blank" rel="noreferrer"
                     className="flex h-[34px] items-center rounded-lg border border-white/[.13] px-3.5 text-[12px] text-foreground/[.72] transition-colors hover:text-foreground">
                    {c.label}
                  </a>
                ))}
              </div>
            )}
            {recognition.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recognition.map((r, i) => (
                  <span key={r.label}
                        className={cn(
                          'rounded-lg px-[11px] py-2 text-[11.5px]',
                          i === 0
                            ? 'border border-brand/[.28] bg-brand/[.11] text-brand-tint'
                            : 'bg-card text-foreground/[.72]'
                        )}>
                    {r.tierLabel} · {r.label}
                  </span>
                ))}
              </div>
            )}
          </div>

        <Tabs defaultValue="gallery" className="w-full">
          <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-b border-white/[.09]">
            <TabsList variant="line" className="h-auto justify-start gap-6 rounded-none bg-transparent p-0">
              {[
                { value: 'gallery', label: 'Gallery', count: userPhotos.length },
                { value: 'timeline', label: 'Journey' },
                { value: 'achievements', label: 'Recognition', count: recognition.length || undefined },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="relative rounded-none bg-transparent px-0 pb-[11px] text-[13px] font-semibold text-white/45 shadow-none transition-colors after:bottom-0 after:h-[2px] after:bg-brand hover:text-white/80 data-[active]:bg-transparent data-[active]:text-foreground data-[active]:shadow-none"
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-1.5 font-normal text-white/40">{tab.count}</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex items-center gap-1 pb-2">
              {[['grid', 'Grid'], ['journey', 'Journey']].map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setLayout(mode)}
                  aria-pressed={galleryMode === mode}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                    galleryMode === mode
                      ? 'bg-white/[.09] text-foreground'
                      : 'text-white/45 hover:text-white/80'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <TabsContent value="gallery" className="animate-in fade-in duration-300 pt-4">
            {userPhotos.length > 0 ? (
              galleryMode === 'grid' ? (
                /* 1a / 2b — portfolio grid. First frame is the anchor. */
                <div className="grid auto-rows-[150px] grid-cols-2 gap-2.5 md:auto-rows-[214px] xl:auto-rows-[162px] xl:grid-cols-3 xl:gap-[9px]">
                  {userPhotos.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => setLightboxIndex(i)}
                      aria-label={p.caption || 'Open photo'}
                      className={cn(
                        'group relative overflow-hidden rounded-lg bg-muted outline-none ring-brand focus-visible:ring-2',
                        i === 0 && 'col-span-2 xl:row-span-2'
                      )}
                    >
                      <img
                        src={p.url}
                        alt={p.caption || ''}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <span className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="truncate font-mono text-[9px] text-white/80">
                          {[p.customStyle && 'featured', p.category, p.caption].filter(Boolean).join(' · ').toLowerCase()}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                /* 1b — journey. Growth is the story, so the work is grouped by era. */
                <div className="flex flex-col gap-9">
                  <button
                    onClick={() => setLightboxIndex(0)}
                    className="group relative h-[280px] w-full overflow-hidden rounded-xl bg-muted outline-none ring-brand focus-visible:ring-2 md:h-[380px]"
                  >
                    <img src={userPhotos[0].url} alt={userPhotos[0].caption || ''} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 bg-gradient-to-t from-black/85 to-transparent p-6 text-left">
                      <span className="font-mono text-[9px] tracking-[.11em] text-brand">FEATURED</span>
                      <span className="text-[19px] font-semibold">{userPhotos[0].caption || 'Latest work'}</span>
                    </span>
                  </button>

                  {journeyYears.map(year => (
                    <section key={year} className="flex flex-col gap-3">
                      <div className="flex items-baseline gap-3">
                        <h3 className="font-mono text-[11px] font-semibold tracking-[.11em] text-foreground/[.42]">{String(year).toUpperCase()}</h3>
                        <span className="h-px flex-1 bg-white/[.08]" />
                        <span className="text-[11px] text-white/35">{photosByYear[year].length} frames</span>
                      </div>
                      <div className="grid auto-rows-[130px] grid-cols-3 gap-2.5 md:auto-rows-[170px] xl:grid-cols-4">
                        {photosByYear[year].map(p => (
                          <button
                            key={p.id}
                            onClick={() => setLightboxIndex(userPhotos.findIndex(x => x.id === p.id))}
                            aria-label={p.caption || 'Open photo'}
                            className="group relative overflow-hidden rounded-lg bg-muted outline-none ring-brand focus-visible:ring-2"
                          >
                            <img src={p.url} alt={p.caption || ''} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )
            ) : (
              <EmptyState 
                icon={ImageOff} 
                title="No Gallery Yet" 
                desc={isOwnProfile ? "Upload your first high-res shoot or video to start building your gallery." : "This creator hasn't uploaded any visual work yet."}
                action={isOwnProfile && (
                  <Button onClick={() => navigate('/upload')} className="rounded-full bg-card text-foreground font-bold hover:bg-muted hover:scale-105 active:scale-95 transition-all">
                    Upload Shoot
                  </Button>
                )}
              />
            )}
          </TabsContent>

          <TabsContent value="timeline" className="animate-in fade-in duration-300">
            <div className="max-w-2xl">
              {isOwnProfile && (
                <div className="mb-8 flex justify-end">
                  <Dialog open={milestoneModalOpen} onOpenChange={setMilestoneModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="secondary" className="rounded-full bg-card border border-border text-foreground hover:bg-muted hover:scale-105 active:scale-95 transition-all">
                        <Plus className="w-4 h-4 mr-2" /> Add Milestone
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground">
                      <DialogHeader>
                        <DialogTitle>Add Career Milestone</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={e => {
                        e.preventDefault();
                        if (!milestoneForm.title) return;
                        setCustomMilestones([{id:`ms_${Date.now()}`, ...milestoneForm}, ...customMilestones]);
                        setMilestoneModalOpen(false);
                        setMilestoneForm({title:'',desc:'',date:'',icon:'🏆'});
                      }} className="space-y-4">
                        <Input placeholder="Title" required value={milestoneForm.title} onChange={e=>setMilestoneForm({...milestoneForm, title: e.target.value})} className="bg-card border-border" />
                        <Input placeholder="Date (e.g. Sep 2026)" value={milestoneForm.date} onChange={e=>setMilestoneForm({...milestoneForm, date: e.target.value})} className="bg-card border-border" />
                        <Textarea placeholder="Description" value={milestoneForm.desc} onChange={e=>setMilestoneForm({...milestoneForm, desc: e.target.value})} className="bg-card border-border" />
                        <Button type="submit" className="w-full rounded-full bg-card text-foreground font-bold hover:bg-muted hover:scale-[1.02] active:scale-95 transition-all">Add to Timeline</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
              
              <div className="relative pl-8 border-l-2 border-border space-y-12 pb-12">
                {[...customMilestones, ...userPhotos.map(p => ({
                    id: `ph_${p.id}`,
                    date: p.timestamp || 'Recently',
                    icon: p.isVideo ? '🎥' : '📸',
                    title: p.isVideo ? 'Uploaded Video Shoot' : 'Published New Photo Shoot',
                    desc: p.caption || 'Added new visual work.',
                    photoUrl: p.url,
                    gear: p.gear
                  })), {id:'joined',date:'Member',icon:'✨',title:'Joined LensLeague',desc:'Created official creator profile.'}]
                .map((item, idx) => (
                  <div key={item.id||idx} className="relative group">
                    <div className="absolute -left-[45px] top-0 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center text-sm shadow-xl transition-transform group-hover:scale-110">
                      {item.icon}
                    </div>
                    <Card className="bg-card/40 hover:bg-card border-border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg group-hover:text-foreground transition-colors">{item.title}</h3>
                          <span className="text-xs font-mono text-muted-foreground">{item.date}</span>
                        </div>
                        <p className="text-muted-foreground text-sm">{item.desc}</p>
                        {item.photoUrl && <img src={item.photoUrl} className="mt-4 rounded-xl w-full h-48 object-cover border border-border transition-transform duration-500 hover:scale-[1.02]" alt="" />}
                        {item.gear && <div className="mt-3 text-xs text-muted-foreground font-mono">📷 {item.gear}</div>}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 'a1', icon: '📸', name: 'First Upload', desc: 'Uploaded your first shoot', unlocked: userPhotos.length >= 1 },
                { id: 'a2', icon: '🏆', name: 'First Win', desc: 'Won your first battle vote', unlocked: (photographer.points || 0) > 0 },
                { id: 'a3', icon: '⭐', name: 'Top Creator', desc: 'Earned 1,000+ creator points', unlocked: (photographer.points || 0) >= 1000 },
                { id: 'a4', icon: '💎', name: 'Diamond Pro', desc: 'Earned 10,000+ points', unlocked: (photographer.points || 0) >= 10000 },
                { id: 'a5', icon: '🔥', name: 'Prolific Creator', desc: 'Uploaded 5+ photos', unlocked: userPhotos.length >= 5 },
                { id: 'a6', icon: '👑', name: 'League Leader', desc: 'Reached top 5 global rank', unlocked: (photographer.global_rank || 99) <= 5 }
              ].map(ach => (
                <Card key={ach.id} className={`bg-card/40 border-border transition-all duration-300 hover:-translate-y-1 hover:bg-card ${ach.unlocked ? 'opacity-100 border-border' : 'opacity-40 grayscale'}`}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="text-4xl drop-shadow-md group-hover:scale-110 transition-transform">{ach.icon}</div>
                    <div>
                      <div className="font-bold text-sm flex items-center gap-2">{ach.name} {ach.unlocked && <span className="text-foreground text-xs">✓</span>}</div>
                      <div className="text-xs text-muted-foreground">{ach.desc}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

        </Tabs>

        </div>

        {/* ── Context rail (2b) ── */}
        <aside className="hidden w-[290px] flex-none flex-col gap-5 border-l border-white/[.08] px-6 pt-5 xl:flex">
          {photographer.bio && (
            <p className="text-[13.5px] leading-[1.55] text-foreground/[.78] text-pretty">{photographer.bio}</p>
          )}

          {recognition.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[9px] font-semibold tracking-[.11em] text-foreground/[.42]">RECOGNITION</span>
              {recognition.map((r, i) => (
                <div key={r.label}
                     className={cn(
                       'flex items-center gap-[9px] rounded-[9px] p-2.5',
                       i === 0
                         ? 'border border-brand/[.28] bg-brand/[.1]'
                         : 'bg-card'
                     )}>
                  <span className={cn(
                    'flex-none font-mono text-[10px] font-semibold',
                    i === 0 ? 'text-brand-tint' : 'text-white/50'
                  )}>{r.tier}</span>
                  <span className="text-[12px] leading-[1.3] text-foreground/[.85]">{r.label}</span>
                </div>
              ))}
            </div>
          )}

          {contactRows.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[9px] font-semibold tracking-[.11em] text-foreground/[.42]">CONTACT</span>
              <div className="flex flex-col gap-1.5 text-[12.5px] text-foreground/[.75]">
                {contactRows.map((c) => (
                  <a key={c.label} href={c.href} target="_blank" rel="noreferrer"
                     className="flex h-9 items-center truncate rounded-lg border border-white/[.13] px-3 transition-colors hover:text-foreground">
                    {c.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {selectedPhoto && (
        <PhotoDetailModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} onNavigateProfile={() => navigate(`/profile/${selectedPhoto.ownerId}`)} />
      )}

      {lightboxIndex !== null && (
        <Lightbox
          photos={userPhotos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
