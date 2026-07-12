import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhotoCard from '../../components/PhotoCard/PhotoCard';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import { photos } from '../../data/photos';
import { battles } from '../../data/battles';
import './FeedPage.css';

function BattleSpotlightCard({ battle }) {
  const navigate = useNavigate();
  return (
    <div className="battle-spotlight" onClick={() => navigate('/compete/vote')}>
      <div className="battle-spotlight__header">
        <span className="label text-accent">⚡ Live Battle</span>
        <span className="body-sm text-tertiary">{battle.totalVotes.toLocaleString()} votes · {battle.endsIn}</span>
      </div>
      <div className="battle-spotlight__photos">
        <img src={battle.photoA.url} alt={battle.photoA.photographerName} className="battle-spotlight__img" />
        <div className="battle-spotlight__vs">VS</div>
        <img src={battle.photoB.url} alt={battle.photoB.photographerName} className="battle-spotlight__img" />
      </div>
      <div className="battle-spotlight__names">
        <span className="body-sm">{battle.photoA.photographerName}</span>
        <span className="body-sm">{battle.photoB.photographerName}</span>
      </div>
      <button className="battle-spotlight__cta label">Vote now →</button>
    </div>
  );
}

const FEED_SEGMENTS = [
  { label: 'For You', value: 'foryou' },
  { label: 'Following', value: 'following' },
];

export default function FeedPage() {
  const [tab, setTab] = useState('foryou');

  // Interleave battle cards every 5 posts
  const feedItems = [];
  photos.forEach((photo, i) => {
    feedItems.push({ type: 'photo', data: photo });
    if ((i + 1) % 5 === 0 && battles[Math.floor(i / 5)]) {
      feedItems.push({ type: 'battle', data: battles[Math.floor(i / 5)] });
    }
  });

  return (
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
  );
}
