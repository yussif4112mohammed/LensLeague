import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { photographers } from '../../data/photographers';
import RankBadge from '../../components/RankBadge/RankBadge';
import { PrimaryButton } from '../../components/Buttons/Buttons';
import './ClientSearch.css';

const SORT_OPTS = ['Top Rated', 'Most Booked', 'Nearest', 'Price'];

export default function ClientSearch() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('Top Rated');

  const CATEGORIES = ['All', 'Portrait', 'Wedding', 'Commercial', 'Street', 'Nature'];

  const filtered = photographers.filter(p =>
    (category === 'All' || p.categories.includes(category)) &&
    p.avgRating >= minRating &&
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="client-search">
      <div className="client-search__header">
        <h1 className="display-lg">Find a Photographer</h1>
        <p className="body-md text-secondary">Search by style, location, or name.</p>
      </div>

      <div className="client-search__bar-wrap">
        <svg className="client-search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          id="client-search-input"
          className="client-search__input"
          type="search"
          placeholder="Search by name, location, or style..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="client-filters">
        <div className="client-filter-row">
          {CATEGORIES.map(c => (
            <button key={c} className={`discover-cat ${category === c ? 'discover-cat--active' : ''}`} onClick={() => setCategory(c)} id={`client-cat-${c.toLowerCase()}`}>{c}</button>
          ))}
        </div>
        <div className="client-filter-row" style={{ marginTop: 'var(--space-2)' }}>
          <span className="body-sm text-secondary">Min Rating:</span>
          {[0, 4, 4.5, 4.8].map(r => (
            <button key={r} className={`client-rating-btn ${minRating === r ? 'client-rating-btn--active' : ''}`} onClick={() => setMinRating(r)} id={`rating-filter-${r}`}>
              {r === 0 ? 'Any' : `${r}★+`}
            </button>
          ))}
          <div className="client-sort-wrap">
            <select className="client-sort" value={sort} onChange={e => setSort(e.target.value)} id="client-sort-select">
              {SORT_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="search-results">
        {filtered.length === 0 ? (
          <div className="discover-empty">
            <div style={{ fontSize: 48 }}>😔</div>
            <p className="heading-2">No photographers found</p>
            <p className="body-md text-secondary">Try broadening your filters.</p>
          </div>
        ) : (
          filtered.map(p => (
            <div key={p.id} className="photographer-result-card" id={`result-${p.id}`}>
              <div className="result-card__header">
                <img src={p.avatar} alt={p.name} className="result-card__avatar" />
                <div className="result-card__info">
                  <div className="result-card__name-row">
                    <span className="heading-2">{p.name}</span>
                    {p.verified && <span className="verified-badge" style={{ width: 18, height: 18, fontSize: 10 }}>✓</span>}
                    <RankBadge rank={p.globalRank} size="sm" />
                  </div>
                  <div className="body-sm text-secondary">{p.categories.join(' · ')} · {p.location}</div>
                  <div className="result-card__rating">
                    <span className="text-gold">{'★'.repeat(Math.round(p.avgRating))}</span>
                    <span className="body-sm text-secondary">{p.avgRating} ({p.wins} reviews)</span>
                  </div>
                </div>
                <div className="result-card__price body-md" style={{ fontWeight: 700 }}>from {p.startingPrice}</div>
              </div>

              {/* Portfolio thumbnails */}
              <div className="result-card__thumbs">
                {[0, 2, 4].map(i => (
                  <img
                    key={i}
                    src={`https://images.unsplash.com/photo-${['1506905925346-21bda4d32df4', '1426604966848-d7adac402bff', '1447752875215-b2761acb3c5d'][i/2]}?w=200&q=80`}
                    alt="Portfolio thumbnail"
                    className="result-card__thumb"
                  />
                ))}
              </div>

              <div className="result-card__actions">
                <PrimaryButton small onClick={() => navigate(`/profile/${p.id}`)} id={`view-profile-${p.id}`}>
                  View Portfolio
                </PrimaryButton>
                <button className="result-card__message-btn" id={`message-${p.id}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Message
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
