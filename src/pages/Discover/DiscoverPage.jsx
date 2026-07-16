import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import CommentSheet from '../../components/CommentSheet/CommentSheet';
import './DiscoverPage.css';

const CATEGORIES = ['All', 'Portrait', 'Landscape', 'Street', 'Wedding', 'Product', 'Nature', 'Editorial', 'Architecture'];

function PhotoDetailModal({ photo, onClose }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(photo?.likes || 0);
  const [showComments, setShowComments] = useState(false);

  if (!photo) return null;
  const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n;

  return (
    <>
      <div className="post-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="post-modal" role="dialog" aria-modal="true">
        <button className="post-modal__close" onClick={onClose} id="discover-modal-close" aria-label="Close">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="post-modal__image-panel">
          <img src={photo.url} alt={photo.caption} className="post-modal__image" />
        </div>

        <div className="post-modal__info-panel">
          <div className="post-modal__author">
            <img src={photo.ownerAvatar} alt={photo.ownerName} className="post-modal__avatar" />
            <div>
              <div className="post-modal__author-name">{photo.ownerName}</div>
              {photo.location && <div className="post-modal__author-loc">{photo.location}</div>}
            </div>
            <button
              className="post-modal__profile-btn"
              onClick={() => { onClose(); navigate(`/profile/${photo.ownerId}`); }}
              id="discover-view-profile-btn"
            >
              View Profile
            </button>
          </div>

          <div className="post-modal__body">
            {photo.caption && (
              <p className="post-modal__caption">
                <span className="post-modal__caption-name">{photo.ownerName}</span>
                {photo.caption}
              </p>
            )}
            {photo.gear && <p className="post-modal__gear">📷 {photo.gear}</p>}
            {photo.category && <p className="post-modal__tag">#{photo.category?.toLowerCase()}</p>}
          </div>

          <div className="post-modal__actions">
            <div className="post-modal__actions-left">
              <button
                className={`post-modal__action-btn ${liked ? 'post-modal__action-btn--liked' : ''}`}
                onClick={() => { setLiked(p => !p); setLikeCount(c => liked ? c - 1 : c + 1); }}
                aria-label={liked ? 'Unlike' : 'Like'}
                id="discover-modal-like"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
              <button
                className="post-modal__action-btn"
                onClick={() => setShowComments(true)}
                aria-label="Comment"
                id="discover-modal-comment"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
            </div>
            <button
              className={`post-modal__action-btn ${saved ? 'post-modal__action-btn--saved' : ''}`}
              onClick={() => setSaved(p => !p)}
              aria-label={saved ? 'Unsave' : 'Save'}
              id="discover-modal-save"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>

          {likeCount > 0 && (
            <div className="post-modal__like-count">{fmt(likeCount)} {likeCount === 1 ? 'like' : 'likes'}</div>
          )}
          <button className="post-modal__comments-link" onClick={() => setShowComments(true)} id="discover-modal-view-comments">
            View all {fmt(photo.comments || 24)} comments
          </button>
        </div>
      </div>

      {showComments && <CommentSheet photo={photo} onClose={() => setShowComments(false)} />}
    </>
  );
}


export default function DiscoverPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const { photos } = useApp();

  const filtered = photos.filter(p =>
    (activeCategory === 'All' || p.category === activeCategory) &&
    (search === '' || p.ownerName.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="discover-page">
      {/* Search Input Row */}
      <div className="discover-search-row">
        <div className="discover-search-wrap">
          <svg className="discover-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            id="discover-search"
            className="discover-search"
            type="search"
            placeholder="Search photographers, styles, locations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="discover-content">
        {/* Categories Rail (Left sidebar on desktop, horizontal scroll on mobile) */}
        <aside className="discover-sidebar-filters">
          <span className="discover-sidebar-label label">Categories</span>
          <div className="discover-categories">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`discover-cat ${activeCategory === cat ? 'discover-cat--active' : ''}`}
                onClick={() => setActiveCategory(cat)}
                id={`cat-filter-${cat.toLowerCase()}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </aside>

        {/* Results column */}
        <div className="discover-results">
          {filtered.length === 0 ? (
            <div className="discover-empty animate-fade-in">
              <div style={{ fontSize: 48 }}>🔍</div>
              <p className="heading-2">No results found</p>
              <p className="body-md text-secondary">Try a different search or filter.</p>
            </div>
          ) : (
            <div className="masonry-grid animate-fade-in">
              {filtered.map(photo => (
                <div
                  key={photo.id}
                  className="masonry-item"
                  onClick={() => setSelectedPhoto(photo)}
                  id={`discover-photo-${photo.id}`}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption}
                    className="masonry-img"
                    style={{ aspectRatio: photo.aspectRatio || '3/4' }}
                    loading="lazy"
                  />
                  <div className="masonry-overlay">
                    <img src={photo.ownerAvatar} alt={photo.ownerName} className="masonry-avatar" />
                    <div>
                      <div className="masonry-name">{photo.ownerName}</div>
                      <div className="masonry-cat label">{photo.category}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedPhoto && (
        <PhotoDetailModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
      )}
    </div>
  );
}
