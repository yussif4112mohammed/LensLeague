import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PhotoCard from '../../components/PhotoCard/PhotoCard';
import StoriesBar from '../../components/StoriesBar/StoriesBar';
import { useApp } from '../../context/AppContext';
import { battles } from '../../data/battles';
import { challenges } from '../../data/challenges';
import { photographers } from '../../data/photographers';
import './FeedPage.css';

function BattleSpotlightCard({ battle }) {
  const navigate = useNavigate();
  return (
    <div className="battle-spotlight" onClick={() => navigate('/compete/vote')} id={`spotlight-${battle.id}`}>
      <div className="battle-spotlight__header">
        <span className="battle-spotlight__label">⚡ Live Battle — {battle.category}</span>
        <span className="battle-spotlight__meta">{battle.totalVotes.toLocaleString()} votes · {battle.endsIn}</span>
      </div>
      <div className="battle-spotlight__photos">
        <div className="battle-spotlight__cinema">
          <img src={battle.photoA.url} alt={battle.photoA.photographerName} className="battle-spotlight__img" />
          <div className="battle-spotlight__name">{battle.photoA.photographerName}</div>
        </div>
        <div className="battle-spotlight__vs">VS</div>
        <div className="battle-spotlight__cinema">
          <img src={battle.photoB.url} alt={battle.photoB.photographerName} className="battle-spotlight__img" />
          <div className="battle-spotlight__name">{battle.photoB.photographerName}</div>
        </div>
      </div>
      <button className="battle-spotlight__cta">Tap to vote →</button>
    </div>
  );
}

const FEED_TABS = ['For You', 'Following'];

export default function FeedPage() {
  const [tab, setTab] = useState('For You');
  const navigate = useNavigate();
  const { fetchPhotosPaginated } = useApp();

  const [feedPhotos, setFeedPhotos] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // Initialize and load page 0
  useEffect(() => {
    let active = true;
    const initFetch = async () => {
      setLoading(true);
      const initial = await fetchPhotosPaginated(0, 9);
      if (active) {
        setFeedPhotos(initial);
        if (initial.length < 10) {
          setHasMore(false);
        } else {
          setPage(1);
          setHasMore(true);
        }
        setLoading(false);
      }
    };
    initFetch();
    return () => {
      active = false;
    };
  }, [fetchPhotosPaginated]);

  // Load subsequent pages
  const loadNextPage = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPagePhotos = await fetchPhotosPaginated(page * 10, (page + 1) * 10 - 1);
    if (nextPagePhotos.length === 0) {
      setHasMore(false);
    } else {
      setFeedPhotos(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const filtered = nextPagePhotos.filter(p => !existingIds.has(p.id));
        return [...prev, ...filtered];
      });
      setPage(p => p + 1);
      if (nextPagePhotos.length < 10) {
        setHasMore(false);
      }
    }
    setLoading(false);
  }, [page, loading, hasMore, fetchPhotosPaginated]);

  // Scroll sentinel trigger hook
  const observerRef = useRef();
  const lastPhotoRef = useCallback(node => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadNextPage();
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, loadNextPage]);

  const feedItems = [];
  feedPhotos.forEach((photo, i) => {
    feedItems.push({ type: 'photo', data: photo });
    if ((i + 1) % 5 === 0 && battles[Math.floor(i / 5)]) {
      feedItems.push({ type: 'battle', data: battles[Math.floor(i / 5)] });
    }
  });

  const activeChallenges = challenges.filter(c => c.status === 'active').slice(0, 2);
  const trendingPhotographers = photographers.slice(0, 3);

  return (
    <div className="feed-container">
      {/* ── Main feed column ── */}
      <div className="feed-page">
        {/* Sticky top bar */}
        <header className="feed-header">
          <div className="feed-header__logo">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#FF4D6D"/>
              <path d="M8 22l6-8 4 5 3-3 5 6H8z" fill="white" opacity="0.9"/>
              <circle cx="22" cy="10" r="3" fill="white"/>
            </svg>
            <span className="feed-header__brand">LensLeague</span>
          </div>
          <div className="feed-header__actions">
            <button className="feed-header__pill" aria-label="Your streak" id="streak-btn">
              🔥 <span>12</span>
            </button>
            <button
              className="feed-header__icon-btn"
              onClick={() => navigate('/inbox')}
              aria-label="Inbox"
              id="inbox-btn"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              <span className="feed-header__badge">1</span>
            </button>
            <button
              className="feed-header__icon-btn"
              aria-label="Notifications"
              id="notifications-btn"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="feed-header__badge">3</span>
            </button>
          </div>
        </header>

        {/* Tab bar */}
        <div className="feed-tabs">
          {FEED_TABS.map(t => (
            <button
              key={t}
              className={`feed-tab ${tab === t ? 'feed-tab--active' : ''}`}
              onClick={() => setTab(t)}
              id={`feed-tab-${t.replace(' ', '-').toLowerCase()}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Stories row */}
        <StoriesBar />

        {/* Feed list */}
        <div className="feed-list">
          {feedItems.map((item) =>
            item.type === 'photo'
              ? <PhotoCard key={item.data.id} photo={item.data} />
              : <BattleSpotlightCard key={`battle-${item.data.id}`} battle={item.data} />
          )}

          {/* Loading spinner sentinel */}
          {hasMore && (
            <div ref={lastPhotoRef} className="feed-loading-sentinel">
              <div className="feed-spinner" />
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop right rail ── */}
      <aside className="feed-right-rail">
        {/* Active Challenges */}
        <div className="rail-box">
          <div className="rail-box__header">
            <span className="rail-box__label text-accent">⚡ Active Challenges</span>
            <button className="rail-box__link" onClick={() => navigate('/compete/challenges')}>View All</button>
          </div>
          <div className="rail-list">
            {activeChallenges.map(c => (
              <div key={c.id} className="rail-challenge" onClick={() => navigate('/compete/challenges')}>
                <img src={c.coverUrl} alt={c.title} className="rail-challenge__img" />
                <div className="rail-challenge__info">
                  <div className="rail-challenge__title">{c.title}</div>
                  <div className="rail-challenge__meta">🏆 {c.prizePoints} pts · {c.entries} entries</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top standings */}
        <div className="rail-box">
          <div className="rail-box__header">
            <span className="rail-box__label text-gold">🏆 Top Standings</span>
            <button className="rail-box__link" onClick={() => navigate('/leaderboard')}>Board</button>
          </div>
          <div className="rail-list">
            {trendingPhotographers.map(p => (
              <div key={p.id} className="rail-user" onClick={() => navigate(`/profile/${p.id}`)}>
                <img src={p.avatar} alt={p.name} className="rail-user__avatar" />
                <div className="rail-user__info">
                  <div className="rail-user__name">{p.name}</div>
                  <div className="rail-user__meta">Rank #{p.globalRank} · {p.points.toLocaleString()} pts</div>
                </div>
                <div className="rail-user__arrow">›</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
