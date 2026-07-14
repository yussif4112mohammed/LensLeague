import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhotoCard from '../../components/PhotoCard/PhotoCard';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import { photos } from '../../data/photos';
import { battles } from '../../data/battles';
import { challenges } from '../../data/challenges';
import { photographers } from '../../data/photographers';
import './FeedPage.css';

function BattleSpotlightCard({ battle }) {
  const navigate = useNavigate();
  return (
    <div className="battle-spotlight" onClick={() => navigate('/compete/vote')} id={`spotlight-${battle.id}`}>
      <div className="battle-spotlight__header">
        <span className="label text-accent">⚡ Live Battle — {battle.category}</span>
        <span className="body-sm text-tertiary">{battle.totalVotes.toLocaleString()} votes · {battle.endsIn}</span>
      </div>
      <div className="battle-spotlight__photos">
        {/* Cinema box A */}
        <div className="battle-spotlight__cinema">
          <img src={battle.photoA.url} alt={battle.photoA.photographerName} className="battle-spotlight__img" />
          <div className="battle-spotlight__name">{battle.photoA.photographerName}</div>
        </div>
        <div className="battle-spotlight__vs">VS</div>
        {/* Cinema box B */}
        <div className="battle-spotlight__cinema">
          <img src={battle.photoB.url} alt={battle.photoB.photographerName} className="battle-spotlight__img" />
          <div className="battle-spotlight__name">{battle.photoB.photographerName}</div>
        </div>
      </div>
      <button className="battle-spotlight__cta label">Tap to vote →</button>
    </div>
  );
}

const FEED_SEGMENTS = [
  { label: 'For You', value: 'foryou' },
  { label: 'Following', value: 'following' },
];

export default function FeedPage() {
  const [tab, setTab] = useState('foryou');
  const navigate = useNavigate();

  // Interleave battle cards every 5 posts
  const feedItems = [];
  photos.forEach((photo, i) => {
    feedItems.push({ type: 'photo', data: photo });
    if ((i + 1) % 5 === 0 && battles[Math.floor(i / 5)]) {
      feedItems.push({ type: 'battle', data: battles[Math.floor(i / 5)] });
    }
  });

  // Get first 2 active challenges for right rail
  const activeChallenges = challenges.filter(c => c.status === 'active').slice(0, 2);

  // Get top 3 trending photographers for right rail
  const trendingPhotographers = photographers.slice(0, 3);

  return (
    <div className="feed-container">
      {/* Main Feed Column */}
      <div className="feed-page">
        <header className="feed-header">
          <div className="feed-header__logo">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#FF4D6D"/>
              <path d="M8 22l6-8 4 5 3-3 5 6H8z" fill="white" opacity="0.9"/>
              <circle cx="22" cy="10" r="3" fill="white"/>
            </svg>
            <span className="heading-2">LensLeague</span>
          </div>
          <div className="feed-header__actions">
            <button className="feed-header__streak" aria-label="Your streak" id="streak-btn">
              🔥 <span>12</span>
            </button>
            <button className="feed-header__bell" aria-label="Notifications" id="notifications-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="feed-header__badge">3</span>
            </button>
          </div>
        </header>

        <div className="feed-seg-wrap">
          <SegmentedControl options={FEED_SEGMENTS} value={tab} onChange={setTab} id="feed-seg" />
        </div>

        <div className="feed-list">
          {feedItems.map((item, i) => (
            item.type === 'photo'
              ? <PhotoCard key={item.data.id} photo={item.data} />
              : <BattleSpotlightCard key={`battle-${item.data.id}`} battle={item.data} />
          ))}
        </div>
      </div>

      {/* Persistent Right Rail (Desktop only) */}
      <aside className="feed-right-rail">
        {/* Active Challenges Box */}
        <div className="rail-box">
          <div className="rail-box__header">
            <span className="label text-accent">⚡ Active Challenges</span>
            <button className="rail-box__link" onClick={() => navigate('/compete/challenges')}>View All</button>
          </div>
          <div className="rail-challenges-list">
            {activeChallenges.map(c => (
              <div key={c.id} className="rail-challenge-card" onClick={() => navigate('/compete/challenges')}>
                <img src={c.coverUrl} alt={c.title} className="rail-challenge-card__img" />
                <div className="rail-challenge-card__info">
                  <div className="rail-challenge-card__title body-sm font-bold">{c.title}</div>
                  <div className="rail-challenge-card__meta text-tertiary">🏆 {c.prizePoints} pts · {c.entries} entries</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trending Photographers Box */}
        <div className="rail-box">
          <div className="rail-box__header">
            <span className="label text-gold">🏆 Top Standings</span>
            <button className="rail-box__link" onClick={() => navigate('/leaderboard')}>Board</button>
          </div>
          <div className="rail-users-list">
            {trendingPhotographers.map(p => (
              <div key={p.id} className="rail-user-row" onClick={() => navigate(`/profile/${p.id}`)}>
                <img src={p.avatar} alt={p.name} className="rail-user-row__avatar" />
                <div className="rail-user-row__info">
                  <div className="rail-user-row__name body-sm font-bold">{p.name}</div>
                  <div className="rail-user-row__meta text-tertiary">Rank #{p.globalRank} · {p.points.toLocaleString()} pts</div>
                </div>
                <div className="rail-user-row__chevron">➔</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
