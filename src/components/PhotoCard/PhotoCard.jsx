import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CommentSheet from '../CommentSheet/CommentSheet';
import VideoPlayer from '../VideoPlayer/VideoPlayer';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';
import { parseGearOrGetExif } from '../../utils/exif';
import { useApp } from '../../context/AppContext';
import './PhotoCard.css';

function getPhotoTitle(caption) {
  if (!caption) return 'Untitled';
  // Strip emojis and punctuation
  const clean = caption
    .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .trim();
  const words = clean.split(/\s+/).slice(0, 3).join(' ');
  return words || 'Untitled';
}

export default function PhotoCard({ photo, compact = false, onPhotoClick }) {
  const { follows, followUser, unfollowUser, currentUser, comments } = useApp();
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
  const commentCount = comments.filter(c => c.photo_id === photo.id).length;

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
      setTimeout(() => setHeartBurst(false), 700);
      setTimeout(() => setShowHeart(false), 900);
    }
  };

  const handleLike = (e) => {
    e.stopPropagation();
    if (liked) {
      setLiked(false);
      setLikeCount(c => c - 1);
    } else {
      triggerLike();
    }
  };

  const handleTap = () => {
    if (compact) {
      onPhotoClick?.();
      return;
    }
    // Double-tap detection for like
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

  // ── Compact grid tile (Profile / Discover) ──────────────────────
  if (compact) {
    return (
      <div className="photo-tile" onClick={handleImageClick} id={`photo-tile-${photo.id}`}>
        <img
          src={getOptimizedImageUrl(photo.url, 400)}
          alt={photo.caption || `Photo by ${photo.ownerName}`}
          className="photo-tile__img"
          loading="lazy"
        />
        <div className="photo-tile__hover">
          <span className="photo-tile__stat">❤️ {formatCount(likeCount)}</span>
          <span className="photo-tile__stat">💬 {formatCount(commentCount)}</span>
        </div>
      </div>
    );
  }

  // ── Full Instagram-style post card ──────────────────────────────
  return (
    <>
      <article className="post-card" id={`post-${photo.id}`}>
        {/* Header */}
        <div className="post-card__header">
          <button
            className="post-card__author"
            onClick={() => navigate(`/profile/${photo.ownerId || '1'}`)}
            id={`post-author-${photo.id}`}
          >
            <div className="post-card__avatar-ring">
              <img src={photo.ownerAvatar} alt={photo.ownerName} className="post-card__avatar" />
            </div>
            <div className="post-card__author-info">
              <span className="post-card__name">{photo.ownerName}</span>
              {photo.location && (
                <span className="post-card__location">{photo.location}</span>
              )}
            </div>
          </button>
          <div className="post-card__header-right">
            {!isOwnPhoto && (
              <button
                className={`post-card__follow-btn ${isFollowing ? 'post-card__follow-btn--active' : ''}`}
                onClick={handleFollowClick}
                id={`follow-${photo.id}`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
            <button className="post-card__more" aria-label="More options" id={`more-${photo.id}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Image or Video wrapped in Passepartout frame */}
        <div className="post-card__image-wrap" onClick={handleTap}>
          {photo.isVideo ? (
            <VideoPlayer
              src={photo.url}
              aspectRatio={photo.aspectRatio || '9/16'}
              autoPlay={false}
            />
          ) : (
            <img
              src={getOptimizedImageUrl(photo.url, 800)}
              alt={photo.caption || `Photo by ${photo.ownerName}`}
              className="post-card__image"
              loading="lazy"
            />
          )}
          {/* Double-tap heart overlay */}
          {showHeart && (
            <div className={`post-card__heart-overlay ${heartBurst ? 'post-card__heart-overlay--burst' : ''}`}>
              <svg viewBox="0 0 24 24" fill="white">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
          )}

          {/* EXIF HUD Overlay */}
          <div className="post-card__hud-overlay">
            <div className="hud-exif-header">
              <div className="hud-exif-camera">{exif.camera}</div>
              <div className="hud-exif-lens">{exif.lens}</div>
            </div>
            <div className="hud-exif-grid">
              <div className="hud-exif-pill">
                <span className="hud-exif-pill__val">{exif.focalLength}</span>
                <span className="hud-exif-pill__lbl">Focal</span>
              </div>
              <div className="hud-exif-pill">
                <span className="hud-exif-pill__val">{exif.aperture}</span>
                <span className="hud-exif-pill__lbl">Aperture</span>
              </div>
              <div className="hud-exif-pill">
                <span className="hud-exif-pill__val">{exif.shutter}</span>
                <span className="hud-exif-pill__lbl">Shutter</span>
              </div>
              <div className="hud-exif-pill">
                <span className="hud-exif-pill__val">{exif.iso}</span>
                <span className="hud-exif-pill__lbl">ISO</span>
              </div>
            </div>
          </div>

          {/* Printed Passepartout Label */}
          <div className="post-card__passepartout-label">
            <div className="passepartout-title">“{photoTitle}”</div>
            <div className="passepartout-exif">
              {exif.camera} • {exif.lens}
            </div>
          </div>
        </div>

        {/* Actions bar */}
        <div className="post-card__actions">
          <div className="post-card__actions-left">
            {/* Like */}
            <button
              className={`post-card__action-btn ${liked ? 'post-card__action-btn--liked' : ''}`}
              onClick={handleLike}
              aria-label={liked ? 'Unlike' : 'Like'}
              id={`like-btn-${photo.id}`}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>

            {/* Comment */}
            <button
              className="post-card__action-btn"
              onClick={handleComment}
              aria-label="Comment"
              id={`comment-btn-${photo.id}`}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>

            {/* Share */}
            <button
              className="post-card__action-btn"
              onClick={handleShare}
              aria-label="Share"
              id={`share-btn-${photo.id}`}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>

          {/* Save */}
          <button
            className={`post-card__action-btn ${saved ? 'post-card__action-btn--saved' : ''}`}
            onClick={handleSave}
            aria-label={saved ? 'Unsave' : 'Save'}
            id={`save-btn-${photo.id}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>

        {/* Like count */}
        <div className="post-card__info">
          {likeCount > 0 && (
            <div className="post-card__like-count">
              {formatCount(likeCount)} {likeCount === 1 ? 'like' : 'likes'}
            </div>
          )}

          {/* Caption */}
          {photo.caption && (
            <div className="post-card__caption">
              <span className="post-card__caption-name">{photo.ownerName}</span>
              <span className="post-card__caption-text">{photo.caption}</span>
            </div>
          )}

          {/* Comments link */}
          {commentCount > 0 && (
            <button
              className="post-card__view-comments"
              onClick={handleComment}
              id={`view-comments-${photo.id}`}
            >
              View all {formatCount(commentCount)} comments
            </button>
          )}

          {/* Category / gear */}
          {photo.category && (
            <span className="post-card__tag">#{photo.category?.toLowerCase()}</span>
          )}

          {/* Timestamp */}
          <div className="post-card__timestamp">{photo.timestamp || '2 hours ago'}</div>
        </div>
      </article>

      {/* Comment sheet */}
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
