import { useState } from 'react';
import './PhotoCard.css';

export default function PhotoCard({ photo, compact = false }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(photo.likes);
  const [heartBurst, setHeartBurst] = useState(false);

  const handleLike = (e) => {
    e.stopPropagation();
    setLiked(prev => !prev);
    setLikeCount(c => liked ? c - 1 : c + 1);
    if (!liked) {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 600);
    }
  };

  const handleDoubleTap = () => {
    if (!liked) {
      setLiked(true);
      setLikeCount(c => c + 1);
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 600);
    }
  };

  return (
    <article className={`photo-card ${compact ? 'photo-card--compact' : ''}`} onDoubleClick={handleDoubleTap}>
      <div className="photo-card__image-wrap">
        <img
          src={photo.url}
          alt={photo.caption || `Photo by ${photo.ownerName}`}
          className="photo-card__image"
          style={{ aspectRatio: compact ? '4/3' : photo.aspectRatio || '3/4' }}
          loading="lazy"
        />
        {!compact && (
          <div className="photo-card__overlay">
            <div className="photo-card__author">
              <img src={photo.ownerAvatar} alt={photo.ownerName} className="photo-card__avatar" />
              <div>
                <div className="photo-card__name">{photo.ownerName}</div>
                <span className="photo-card__category label">{photo.category}</span>
              </div>
            </div>
            <div className="photo-card__actions">
              <button
                className={`photo-card__action ${liked ? 'photo-card__action--liked' : ''} ${heartBurst ? 'heart-burst' : ''}`}
                onClick={handleLike}
                aria-label={liked ? 'Unlike' : 'Like'}
                id={`like-${photo.id}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>{likeCount >= 1000 ? (likeCount/1000).toFixed(1)+'k' : likeCount}</span>
              </button>
              <button
                className={`photo-card__action ${saved ? 'photo-card__action--saved' : ''}`}
                onClick={(e) => { e.stopPropagation(); setSaved(p => !p); }}
                aria-label={saved ? 'Unsave' : 'Save'}
                id={`save-${photo.id}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
      {!compact && (
        <div className="photo-card__caption">
          <p className="body-md">{photo.caption}</p>
          <span className="body-sm text-tertiary">{photo.timestamp}</span>
        </div>
      )}
    </article>
  );
}
