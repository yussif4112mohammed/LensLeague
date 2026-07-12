import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { photos } from '../../data/photos';
import './DiscoverPage.css';

const CATEGORIES = ['All', 'Portrait', 'Landscape', 'Street', 'Wedding', 'Product', 'Nature', 'Editorial', 'Architecture'];

function PhotoDetailModal({ photo, onClose }) {
  const navigate = useNavigate();
  if (!photo) return null;
  return (
    <div className="photo-modal-backdrop" onClick={onClose}>
      <div className="photo-modal" onClick={e => e.stopPropagation()}>
        <button className="photo-modal__close" onClick={onClose} id="photo-modal-close" aria-label="Close">✕</button>
        <img src={photo.url} alt={photo.caption} className="photo-modal__img" />
        <div className="photo-modal__info">
          <div className="photo-modal__author">
            <img src={photo.ownerAvatar} alt={photo.ownerName} className="photo-modal__avatar" />
            <div>
              <div className="heading-2">{photo.ownerName}</div>
              <div className="body-sm text-secondary">{photo.category} · {photo.location}</div>
            </div>
          </div>
          <p className="body-md" style={{ marginTop: 'var(--space-3)' }}>{photo.caption}</p>
          {photo.gear && <p className="body-sm text-tertiary" style={{ marginTop: 'var(--space-2)' }}>📷 {photo.gear}</p>}
          <div className="photo-modal__actions">
            <button className="photo-modal__stat">❤️ {photo.likes.toLocaleString()}</button>
            <button className="photo-modal__stat">💬 {photo.comments}</button>
            <button className="photo-modal__view-btn" onClick={() => navigate(`/profile/${photo.ownerId}`)} id="view-profile-btn">
              View Portfolio →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const filtered = photos.filter(p =>
    (activeCategory === 'All' || p.category === activeCategory) &&
    (search === '' || p.ownerName.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="discover-page">
      <div className="discover-header">
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
      </div>

      {filtered.length === 0 ? (
        <div className="discover-empty">
          <div style={{ fontSize: 48 }}>🔍</div>
          <p className="heading-2">No results found</p>
          <p className="body-md text-secondary">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="masonry-grid">
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

      {selectedPhoto && (
        <PhotoDetailModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
      )}
    </div>
  );
}
