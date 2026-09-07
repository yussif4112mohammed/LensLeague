import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CommentSheet from '../CommentSheet/CommentSheet';
import VideoPlayer from '../VideoPlayer/VideoPlayer';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';
import { fromStoredExif, ratioLabel } from '@/lib/photoMeta';
import { useApp } from '../../context/AppContext';
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import SmartImage from '../SmartImage/SmartImage';
import { IMAGE_SIZES } from '../../utils/imageOptimizer';

function getPhotoTitle(caption) {
  if (!caption) return 'Untitled';
  const clean = caption
    .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .trim();
  const words = clean.split(/\s+/).slice(0, 3).join(' ');
  return words || 'Untitled';
}

export default function PhotoCard({ photo, compact = false, onPhotoClick }) {
  const { follows, followUser, unfollowUser, currentUser, comments, toggleLikePost, toggleSavedItem, savedItemIds, users } = useApp();
  const ownerProfile = users?.find(u => u.id === photo.ownerId) || {};
  const [liked, setLiked] = useState(() => localStorage.getItem(`liked_${photo.id}`) === 'true');
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(photo.likes + (localStorage.getItem(`liked_${photo.id}`) === 'true' && !photo.likes ? 1 : 0));
  const [heartBurst, setHeartBurst] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const navigate = useNavigate();
  const lastTapRef = useRef(0);

  const isFollowing = currentUser && follows.some(f => f.follower_id === currentUser.id && f.following_id === photo.ownerId);
  const isOwnPhoto = currentUser && photo.ownerId === currentUser.id;
  const commentCount = comments.filter(c => c.photo_id === photo.id || c.item_id === photo.id).length;

  // Keep likes synced with backend, but preserve local anon likes
  useEffect(() => {
    const isLocalLiked = localStorage.getItem(`liked_${photo.id}`) === 'true';
    setLikeCount(photo.likes + (isLocalLiked && !photo.likes ? 1 : 0));
  }, [photo.likes, photo.id]);

  useEffect(() => {
    setSaved(savedItemIds.includes(photo.id));
  }, [photo.id, savedItemIds]);

  // Check if current user has already liked this photo
  useEffect(() => {
    if (!currentUser) return;
    const checkLiked = async () => {
      try {
        const { supabase } = await import('../../lib/supabaseClient');
        const { data } = await supabase
          .from('likes')
          .select('user_id')
          .eq('user_id', currentUser.id)
          .eq('item_id', photo.id)
          .maybeSingle();
        if (data) {
          setLiked(true);
          localStorage.setItem(`liked_${photo.id}`, 'true');
        }
      } catch (e) { /* ignore */ }
    };
    checkLiked();
  }, [currentUser, photo.id]);

  const handleFollowClick = (e) => {
    e.stopPropagation();
    if (isFollowing) {
      unfollowUser(photo.ownerId);
    } else {
      followUser(photo.ownerId);
    }
  };

  // Only what this photograph actually carries. parseGearOrGetExif stood here
  // and read no file at all: it summed the character codes of the photo id and
  // used that to pick one of six premium bodies, then presented it as this
  // photographer's gear. A frame shot on a phone was captioned as a Hasselblad.
  // fromStoredExif returns null when the row knows nothing, and the panel below
  // is rendered only when there is something true to put in it.
  const exif = photo.exif || fromStoredExif(photo.exif_data, photo.gear);
  const exifCells = exif
    ? [
        ['Focal', exif.focalLength],
        ['Aperture', exif.aperture],
        ['Shutter', exif.shutter],
        ['ISO', exif.iso],
      ].filter(([, v]) => v)
    : [];
  const shapeLabel = ratioLabel(photo.width, photo.height);
  const photoTitle = getPhotoTitle(photo.caption);

  const triggerLike = () => {
    if (!liked) {
      setLiked(true);
      localStorage.setItem(`liked_${photo.id}`, 'true');
      setLikeCount(c => c + 1);
      setHeartBurst(true);
      setShowHeart(true);
      toggleLikePost(photo.id); // Persist to Supabase
      setTimeout(() => setHeartBurst(false), 700);
      setTimeout(() => setShowHeart(false), 900);
    }
  };

  const handleLike = (e) => {
    e.stopPropagation();
    if (liked) {
      setLiked(false);
      localStorage.removeItem(`liked_${photo.id}`);
      setLikeCount(c => c - 1);
      toggleLikePost(photo.id); // Persist unlike to Supabase
    } else {
      triggerLike();
    }
  };

  const handleTap = () => {
    if (compact) {
      onPhotoClick?.();
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      triggerLike();
    }
    lastTapRef.current = now;
  };

  const handleImageClick = () => {
    if (!compact) return;
    onPhotoClick?.();
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    const previous = saved;
    setSaved(!previous);
    const result = await toggleSavedItem(photo.id);
    if (!result.success) setSaved(previous);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    navigator.share?.({ title: photo.caption, url: window.location.href });
  };

  const handleComment = (e) => {
    e.stopPropagation();
    setShowComments(true);
  };

  const handleCommentAdded = () => {
    setCommentCount(c => c + 1);
  };

  const formatCount = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n;

  if (compact) {
    return (
      <div
        // The frame as it was shot. This was a hardcoded aspect-square, so a
        // portfolio of 3:2 landscapes and 4:5 portraits was centre-cropped into
        // identical boxes - the exact "photos should be their original aspect
        // ratio, not 1:1" that the first outside photographer reported. The
        // square is kept only as the fallback for rows uploaded before the
        // dimensions existed, where the true shape is genuinely unknown.
        className={cn(
          "group relative overflow-hidden bg-card rounded-none md:rounded-xl cursor-pointer border border-border",
          photo.aspectRatio ? "" : "aspect-square"
        )}
        style={photo.aspectRatio ? { aspectRatio: photo.aspectRatio } : undefined}
        onClick={handleImageClick}
        id={`photo-tile-${photo.id}`}
      >
        <SmartImage
          src={photo.url}
          alt={photo.caption || `Photo by ${photo.ownerName}`}
          width={IMAGE_SIZES.gridTile}
          wrapperClassName="w-full h-full"
          className="transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Heart className={cn("w-6 h-6", liked ? "fill-white" : "")} />
            <span>{formatCount(likeCount)}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <MessageCircle className="w-6 h-6 fill-white" />
            <span>{formatCount(commentCount)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <article className="max-w-3xl mx-auto w-full mb-16 sm:mb-24 relative bg-background shadow-sm border border-border rounded-xl overflow-hidden" id={`post-${photo.id}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 mb-1 border-b border-border">
          <button
            className="flex items-center gap-4 text-left group"
            onClick={() => photo.ownerId && navigate(`/profile/${photo.ownerId}`)}
            id={`post-author-${photo.id}`}
          >
            <Avatar className="w-12 h-12 ring-1 ring-border group-hover:ring-border transition-all duration-300 shadow-sm">
              <AvatarImage src={photo.ownerAvatar} alt={photo.ownerName} className="object-cover" />
              <AvatarFallback className="bg-card text-muted-foreground text-xs font-bold">{photo.ownerName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-bold text-base tracking-tight text-foreground flex items-center gap-2">
                {photo.ownerName}
                {ownerProfile.verified && <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-card text-foreground uppercase">PRO</Badge>}
              </div>
              <div className="text-xs text-muted-foreground font-medium tracking-wide mt-0.5 flex items-center gap-2">
                {photo.location && <span>{photo.location}</span>}
              </div>
            </div>
          </button>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {!isOwnPhoto && (
              <>
                {ownerProfile.role === 'photographer' && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-9 px-5 rounded-md text-xs font-bold tracking-widest transition-all duration-300 ease-out bg-card text-foreground hover:bg-muted hover:scale-[1.02] active:scale-[0.96]"
                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/${photo.ownerId}`); }}
                  >
                    INQUIRE
                  </Button>
                )}
                <Button
                  variant={isFollowing ? "secondary" : "outline"}
                  size="sm"
                  className={cn(
                    "h-9 px-5 rounded-md text-xs font-bold tracking-wide transition-all duration-300 ease-out",
                    isFollowing 
                      ? "bg-muted hover:bg-muted text-foreground border-transparent"
                      : "bg-background text-foreground border-border hover:bg-card hover:scale-[1.02] active:scale-[0.96]"
                  )}
                  onClick={handleFollowClick}
                  id={`follow-${photo.id}`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
              </>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); alert('Post options (Share, Report, Copy Link) coming soon.'); }}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Frame */}
        <div
          className={cn(
            "relative w-full sm:max-h-[85vh] bg-black flex items-center justify-center cursor-pointer group overflow-hidden border-b border-border transition-transform duration-500",
            photo.aspectRatio ? "" : "aspect-[4/5] sm:aspect-auto"
          )}
          style={photo.aspectRatio ? { aspectRatio: photo.aspectRatio } : undefined}
          onClick={handleTap}
        >
          {photo.isVideo ? (
            <VideoPlayer
              src={photo.url}
              aspectRatio={photo.aspectRatio || undefined}
              autoPlay={false}
              className="w-full h-full"
            />
          ) : (
            <img
              src={getOptimizedImageUrl(photo.url, 1080)}
              alt={photo.caption || `Photo by ${photo.ownerName}`}
              className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-[1.02]"
              loading="lazy"
            />
          )}

          {/* Camera details, when the file carried any. Previously this block
              was unconditional and every cell was invented; now an absent value
              simply is not drawn, and a photograph with no metadata shows its
              title and its shape instead of six fabricated readings. */}
          <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none flex flex-col justify-end">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h4 className="text-xl font-bold tracking-tight text-foreground mb-1 truncate">“{photoTitle}”</h4>
                {exif?.camera || exif?.lens ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-foreground font-medium tracking-wide">
                    <Camera className="w-3 h-3 shrink-0 text-muted-foreground" />
                    {exif.camera && <span>{exif.camera}</span>}
                    {exif.camera && exif.lens && <span className="opacity-50">•</span>}
                    {exif.lens && <span>{exif.lens}</span>}
                  </div>
                ) : shapeLabel ? (
                  <div className="text-xs font-medium tracking-wide text-muted-foreground">{shapeLabel}</div>
                ) : null}
              </div>
              {exifCells.length > 0 && (
                <div className="grid shrink-0 grid-cols-2 gap-2 text-right">
                  {exifCells.map(([label, value]) => (
                    <div key={label} className="bg-black/40 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center justify-between gap-4">
                      <span className="text-[9px] text-foreground uppercase tracking-widest">{label}</span>
                      <span className="text-xs font-bold text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Double-tap Heart Animation */}
          {showHeart && (
            <div className={cn("absolute inset-0 flex items-center justify-center pointer-events-none", heartBurst ? "animate-in zoom-in-50 duration-300" : "animate-out zoom-out-50 opacity-0 duration-500")}>
              <Heart className="w-24 h-24 text-foreground fill-white drop-shadow-2xl" />
            </div>
          )}
        </div>

        {/* Actions & Info */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button 
                onClick={handleLike} 
                className={cn("transition-transform duration-200 ease-out hover:scale-110 active:scale-[0.96] flex items-center gap-2 group", liked ? "text-red-500" : "text-muted-foreground hover:text-foreground")}
              >
                <Heart className={cn("w-7 h-7 transition-colors", liked ? "fill-red-500" : "")} strokeWidth={2} />
                <span className="text-sm font-bold tracking-wide">{formatCount(likeCount)}</span>
              </button>

              <button 
                onClick={handleComment}
                className="transition-transform duration-200 ease-out hover:scale-110 active:scale-[0.96] text-muted-foreground hover:text-foreground flex items-center gap-2 group"
              >
                <MessageCircle className="w-7 h-7 transition-colors" strokeWidth={2} />
                <span className="text-sm font-bold tracking-wide">{formatCount(commentCount)}</span>
              </button>

              <button 
                onClick={handleShare}
                className="transition-transform duration-200 ease-out hover:scale-110 active:scale-[0.96] text-muted-foreground hover:text-foreground group"
              >
                <Share className="w-6 h-6 transition-colors" strokeWidth={2} />
              </button>
            </div>
            
            <button 
              onClick={handleSave}
              className={cn("transition-transform duration-200 ease-out hover:scale-110 active:scale-[0.96]", saved ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <Bookmark className={cn("w-6 h-6 transition-colors", saved ? "fill-white" : "")} strokeWidth={2} />
            </button>
          </div>
          
          <div className="space-y-1">
            {photo.caption && (
              <div className="text-sm text-foreground">
                <span className="font-bold text-foreground mr-2 cursor-pointer hover:underline">{photo.ownerName}</span>
                {photo.caption}
              </div>
            )}

            {commentCount > 0 && (
              <button 
                onClick={handleComment}
                className="text-sm text-muted-foreground font-medium hover:text-foreground transition-colors pt-1"
              >
                View all {formatCount(commentCount)} comments
              </button>
            )}

            <div className="flex items-center gap-3 pt-2">
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">{photo.timestamp || '2 HOURS AGO'}</span>
              {photo.category && (
                <Badge variant="secondary" className="bg-card text-muted-foreground hover:bg-muted text-[10px] uppercase tracking-wider rounded border border-border">
                  {photo.category}
                </Badge>
              )}
              {photo.customStyle && (
                <Badge variant="outline" className="bg-background text-foreground hover:bg-card text-[10px] uppercase tracking-wider rounded border border-border">
                  {photo.customStyle}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </article>

      {showComments && (
        <CommentSheet
          photo={photo}
          onClose={() => setShowComments(false)}
          onCommentAdded={handleCommentAdded}
        />
      )}
    </>
  );
}
