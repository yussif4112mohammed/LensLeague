import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import RankBadge from '../../components/RankBadge/RankBadge';
import './ClientHome.css';

export default function ClientHome() {
  const navigate = useNavigate();
  const { photos, users } = useApp();
  const featured = users.slice(0, 4).map(u => ({ ...u, globalRank: u.global_rank || 1, categories: ['Portrait'], startingPrice: '$500', avgRating: '5.0', cover: u.avatar }));

  return (
    <div className="client-home">
      <div className="client-home__header">
        <div>
          <h1 className="display-lg">Find Your Photographer</h1>
          <p className="body-md text-secondary">Discover top-ranked talent for your next project.</p>
        </div>
        <div className="client-home__actions" style={{ display: 'flex', gap: '8px' }}>
          <button className="client-home__notif" onClick={() => navigate('/client/inbox')} id="client-inbox-btn" style={{ position: 'relative' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            <span className="feed-header__badge" style={{ position: 'absolute', top: '1px', right: '1px', width: '14px', height: '14px', background: 'var(--accent-primary)', borderRadius: '100px', fontSize: '9px', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--bg-base)' }}>2</span>
          </button>
          <button className="client-home__notif" id="client-notif-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search shortcut */}
      <button className="client-home__search-cta" onClick={() => navigate('/client/search')} id="client-search-cta">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span className="text-secondary body-md">Search by style, location, or name...</span>
      </button>

      {/* Featured photographers */}
      <section className="client-home__section">
        <div className="client-home__section-header">
          <h2 className="heading-1">Top Ranked</h2>
          <button className="client-home__see-all" onClick={() => navigate('/client/search')} id="see-all-btn">See all →</button>
        </div>
        <div className="featured-photographers">
          {featured.map(p => (
            <div key={p.id} className="featured-card" onClick={() => navigate(`/profile/${p.id}`)} id={`featured-${p.id}`}>
              <div className="featured-card__cover" style={{ backgroundImage: `url(${p.cover})` }}>
                <RankBadge rank={p.globalRank} size="sm" />
              </div>
              <div className="featured-card__info">
                <img src={p.avatar} alt={p.name} className="featured-card__avatar" />
                <div className="featured-card__text">
                  <div className="body-md" style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="body-sm text-secondary">{p.categories[0]} · {p.location}</div>
                  <div className="body-sm text-gold">★ {p.avgRating} · from {p.startingPrice}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent photos (discovery feed for clients) */}
      <section className="client-home__section">
        <h2 className="heading-1">Browse Work</h2>
        <div className="client-photo-grid">
          {photos.slice(0, 6).map(photo => (
            <div key={photo.id} className="client-photo-item" onClick={() => navigate(`/profile/${photo.ownerId}`)} id={`client-photo-${photo.id}`}>
              <img src={photo.url} alt={photo.caption} className="client-photo-img" style={{ aspectRatio: photo.aspectRatio || '3/4' }} />
              <div className="client-photo-overlay">
                <img src={photo.ownerAvatar} alt={photo.ownerName} className="client-photo-avatar" />
                <span className="body-sm">{photo.ownerName}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
