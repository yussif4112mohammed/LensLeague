import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CommentSheet from '../CommentSheet/CommentSheet';
import VideoPlayer from '../VideoPlayer/VideoPlayer';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';
import { parseGearOrGetExif } from '../../utils/exif';
import { useApp } from '../../context/AppContext';
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  const { follows, followUser, unfollowUser, currentUser, comments, toggleLikePost, users } = useApp();
  const ownerProfile = users?.find(u => u.id === photo.ownerId) || {};
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(photo.likes);
  const [heartBurst, setHeartBurst] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const navigate = useNavigate();
  const lastTapRef = useRef(0);

  const isFollowing = currentUser && follows.some(f => f.follower_id === currentUser.id && f.following_id === photo.ownerId);
  const isOwnPhoto = currentUser && photo.ownerId === currentUser.id;
  const commentCount = comments.filter(c => c.photo_id === photo.id || c.item_id === photo.id).length;

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
        if (data) setLiked(true);
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

  const exif = parseGearOrGetExif(photo.gear, photo.id, photo.ownerName);
  const photoTitle = getPhotoTitle(photo.caption);

  const triggerLike = () => {
    if (!liked) {
      setLiked(true);
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

  const handleSave = (e) => {
    e.stopPropagation();
    setSaved(prev => !prev);
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
        className="group relative aspect-square overflow-hidden bg-zinc-900 rounded-none md:rounded-xl cursor-pointer"
        onClick={handleImageClick}
        id={`photo-tile-${photo.id}`}
      >
        <img
          src={getOptimizedImageUrl(photo.url, 400)}
          alt={photo.caption || `Photo by ${photo.ownerName}`}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Heart className={cn("w-6 h-6", liked ? "fill-white" : "")} />
            <span>{formatCount(likeCount)}</span>
          </div>
          <div className="flex items-center gap-2 text-white font-semibold">
            <MessageCircle className="w-6 h-6 fill-white" />
            <span>{formatCount(commentCount)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <article className="max-w-3xl mx-auto w-full mb-16 sm:mb-24 relative" id={`post-${photo.id}`}>
        {/* Header (Floating above the image or seamlessly integrated) */}
        <div className="flex items-center justify-between p-4 sm:px-2 mb-2">
          <button
            className="flex items-center gap-4 text-left group"
            onClick={() => navigate(`/profile/${photo.ownerId || '1'}`)}
            id={`post-author-${photo.id}`}
          >
            <Avatar className="w-12 h-12 ring-2 ring-transparent group-hover:ring-primary/50 transition-all duration-300 shadow-lg">
              <AvatarImage src={photo.ownerAvatar} alt={photo.ownerName} className="object-cover" />
              <AvatarFallback className="bg-zinc-800 text-xs">{photo.ownerName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-extrabold text-base tracking-tight group-hover:text-white transition-colors flex items-center gap-2">
                {photo.ownerName}
                {ownerProfile.verified && <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-primary/20 text-primary uppercase">Pro</Badge>}
              </div>
              <div className="text-xs text-zinc-500 font-medium tracking-wide mt-0.5 flex items-center gap-1">
                {photo.location && <span>{photo.location}</span>}
                {ownerProfile.role === 'photographer' && ownerProfile.starting_rate > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-emerald-400 font-bold">Starts at ${ownerProfile.starting_rate}</span>
                  </>
                )}
              </div>
            </div>
          </button>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {!isOwnPhoto && (
              <>
                {ownerProfile.role === 'photographer' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 rounded-full text-xs font-bold tracking-wide transition-transform duration-200 ease-out shadow-lg border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 hover:scale-[1.02] active:scale-[0.96]"
                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/${photo.ownerId}`); }}
                  >
                    Hire
                  </Button>
                )}
                <Button
                variant={isFollowing ? "secondary" : "default"}
                size="sm"
                className={cn("h-9 px-5 rounded-full text-xs font-bold tracking-wide transition-transform duration-200 ease-out shadow-lg", isFollowing ? "bg-white/10 hover:bg-white/20 text-white" : "bg-white text-black hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.96]")}
                onClick={handleFollowClick}
                id={`follow-${photo.id}`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            </>
          )}
            <button className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Frame */}
        <div 
          className="relative w-full aspect-[4/5] sm:aspect-auto sm:max-h-[85vh] bg-zinc-950/50 flex items-center justify-center cursor-pointer group rounded-none sm:rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/10 ring-inset"
          onClick={handleTap}
        >
          {photo.isVideo ? (
            <VideoPlayer
              src={photo.url}
              aspectRatio={photo.aspectRatio || '9/16'}
              autoPlay={false}
              className="w-full h-full"
            />
          ) : (
            <img
              src={getOptimizedImageUrl(photo.url, 1080)}
              alt={photo.caption || `Photo by ${photo.ownerName}`}
              className="w-full h-full object-contain sm:object-cover"
              loading="lazy"
            />
          )}

          {/* HUD Overlay for EXIF (Visible on Hover) */}
          <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none flex flex-col justify-end">
            <div className="flex items-end justify-between">
              <div>
                <h4 className="text-xl font-bold tracking-tight text-white mb-1 shadow-sm">“{photoTitle}”</h4>
                <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium tracking-wide">
                  <Camera className="w-3 h-3" />
                  <span>{exif.camera}</span>
                  <span className="opacity-50">•</span>
                  <span>{exif.lens}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-right">
                <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded border border-white/10 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest">Focal</span>
                  <span className="text-xs font-semibold text-zinc-100">{exif.focalLength}</span>
                </div>
                <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded border border-white/10 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest">Aperture</span>
                  <span className="text-xs font-semibold text-zinc-100">{exif.aperture}</span>
                </div>
                <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded border border-white/10 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest">Shutter</span>
                  <span className="text-xs font-semibold text-zinc-100">{exif.shutter}</span>
                </div>
                <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded border border-white/10 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest">ISO</span>
                  <span className="text-xs font-semibold text-zinc-100">{exif.iso}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Double-tap Heart Animation */}
          {showHeart && (
            <div className={cn("absolute inset-0 flex items-center justify-center pointer-events-none", heartBurst ? "animate-in zoom-in-50 duration-300" : "animate-out zoom-out-50 opacity-0 duration-500")}>
              <Heart className="w-24 h-24 text-white fill-white drop-shadow-2xl" />
            </div>
          )}
        </div>

        {/* Actions & Info */}
        <div className="p-4 sm:px-2 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button 
                onClick={handleLike} 
                className={cn("transition-transform duration-200 ease-out hover:scale-110 active:scale-[0.96]", liked ? "text-primary" : "text-zinc-400 hover:text-white")}
              >
                <Heart className={cn("w-7 h-7", liked ? "fill-current" : "")} strokeWidth={2} />
              </button>
              <button 
                onClick={handleComment} 
                className="text-zinc-400 hover:text-white hover:scale-110 active:scale-[0.96] transition-transform duration-200 ease-out"
              >
                <MessageCircle className="w-7 h-7" strokeWidth={2} />
              </button>
              <button 
                onClick={handleShare} 
                className="text-zinc-400 hover:text-white hover:scale-110 active:scale-[0.96] transition-transform duration-200 ease-out"
              >
                <Share className="w-7 h-7" strokeWidth={2} />
              </button>
            </div>
            <button 
              onClick={handleSave} 
              className={cn("transition-transform duration-200 ease-out hover:scale-110 active:scale-[0.96]", saved ? "text-white" : "text-zinc-400 hover:text-white")}
            >
              <Bookmark className={cn("w-7 h-7", saved ? "fill-current text-white" : "")} strokeWidth={2} />
            </button>
          </div>

          <div className="space-y-1">
            {likeCount > 0 && (
              <div className="font-semibold text-sm text-zinc-100">
                {formatCount(likeCount)} {likeCount === 1 ? 'like' : 'likes'}
              </div>
            )}

            {photo.caption && (
              <div className="text-sm">
                <span className="font-semibold mr-2 cursor-pointer hover:underline">{photo.ownerName}</span>
                <span className="text-zinc-300">{photo.caption}</span>
              </div>
            )}

            {commentCount > 0 && (
              <button 
                onClick={handleComment}
                className="text-sm text-zinc-500 font-medium hover:text-zinc-300 transition-colors pt-1"
              >
                View all {formatCount(commentCount)} comments
              </button>
            )}

            <div className="flex items-center gap-3 pt-2">
              <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">{photo.timestamp || '2 HOURS AGO'}</span>
              {photo.category && (
                <Badge variant="secondary" className="bg-zinc-900 text-zinc-400 hover:bg-zinc-800 text-[10px] uppercase tracking-wider rounded border border-zinc-800">
                  {photo.category}
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
