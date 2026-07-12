import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { photographers, PHOTO_URLS } from '../../data/photographers';
import RankBadge from '../../components/RankBadge/RankBadge';
import StatPill from '../../components/StatPill/StatPill';
import { PrimaryButton, SecondaryButton } from '../../components/Buttons/Buttons';
import './ProfilePage.css';

const PROFILE_TABS = ['Portfolio', 'Timeline', 'Achievements', 'Reviews'];

const ACHIEVEMENTS = [
  { id: 'a1', icon: '🏆', name: 'First Win', desc: 'Won your first battle', unlocked: true },
  { id: 'a2', icon: '🔥', name: '10-Day Streak', desc: 'Uploaded 10 days in a row', unlocked: true },
  { id: 'a3', icon: '⭐', name: 'Top 10 Global', desc: 'Reached top 10 on the global leaderboard', unlocked: true },
  { id: 'a4', icon: '💎', name: 'Diamond Rank', desc: 'Reach 40,000 points', unlocked: true },
  { id: 'a5', icon: '📸', name: '100 Uploads', desc: 'Upload 100 photos', unlocked: false },
  { id: 'a6', icon: '👑', name: 'Challenge Champion', desc: 'Win 5 challenges', unlocked: false },
];

const REVIEWS = [
  { id: 'r1', reviewer: 'Jordan Blake', reviewerAvatar: PHOTO_URLS[12], rating: 5, body: 'Absolutely stunning work. Aria captured our brand campaign with a level of artistry I hadn\'t seen before. Will book again.', type: 'Commercial Campaign', date: '2 weeks ago', verified: true },
  { id: 'r2', reviewer: 'Maria Santos', reviewerAvatar: PHOTO_URLS[13], rating: 5, body: 'Our family portraits turned out beyond expectations. Professional, warm, and incredibly talented.', type: 'Portrait Session', date: '1 month ago', verified: true },
  { id: 'r3', reviewer: 'Tech Ventures Ltd.', reviewerAvatar: PHOTO_URLS[14], rating: 4, body: 'Great product photography for our launch. Fast turnaround, excellent communication.', type: 'Product Photography', date: '2 months ago', verified: true },
];

const TIMELINE_EVENTS = [
  { date: 'Jul 2026', icon: '🥇', title: 'Reached #1 Global Rank', desc: '48,200 points — highest ever recorded on LensLeague.' },
  { date: 'May 2026', icon: '🏆', title: 'Won "Golden Hour Portraits" Challenge', desc: 'Beat 847 entries with a single frame from Kyoto at 6:04 AM.' },
  { date: 'Mar 2026', icon: '📷', title: 'New gear: Leica M11', desc: 'Upgraded from Sony A7IV. You can see the shift in the portfolio.' },
  { date: 'Jan 2026', icon: '✨', title: '10,000 Followers', desc: 'A year of daily uploads and 64 competition wins brought this milestone.' },
  { date: 'Sep 2025', icon: '🌍', title: 'Featured by National Geographic', desc: 'The Shinjuku shot was used in NG\'s "Faces of the City" spread.' },
];

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Portfolio');
  const [following, setFollowing] = useState(false);

  const photographer = photographers.find(p => p.id === id) || photographers[0];
  const isOwnProfile = id === '1';

  const portfolioPhotos = PHOTO_URLS.slice(0, 9).map((url, i) => ({
    id: `port-${i}`, url, aspectRatio: i % 3 === 0 ? '3/4' : '4/3',
  }));

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-cover" style={{ backgroundImage: `url(${photographer.cover})` }}>
        <div className="profile-cover__overlay" />
        <div className="profile-cover__actions">
          <button className="profile-back" onClick={() => navigate(-1)} aria-label="Back" id="profile-back-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          {isOwnProfile && (
            <button className="profile-share" id="profile-share-btn" aria-label="Share profile">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="profile-info">
        <div className="profile-avatar-row">
          <img src={photographer.avatar} alt={photographer.name} className="profile-avatar" />
          <div className="profile-avatar-row__actions">
            {isOwnProfile ? (
              <SecondaryButton small id="edit-profile-btn">Edit Profile</SecondaryButton>
            ) : (
              <>
                <SecondaryButton small onClick={() => setFollowing(f => !f)} id="follow-btn">
                  {following ? '✓ Following' : 'Follow'}
                </SecondaryButton>
                <PrimaryButton small id="book-photographer-btn">Request Booking</PrimaryButton>
              </>
            )}
          </div>
        </div>

        <div className="profile-name-row">
          <h1 className="heading-1">{photographer.name}</h1>
          {photographer.verified && <span className="verified-badge" title="Verified">✓</span>}
          <RankBadge rank={photographer.globalRank} size="sm" />
        </div>
        <p className="body-sm text-secondary">@{photographer.username} · {photographer.location}</p>
        <p className="body-md profile-bio">{photographer.bio}</p>

        <div className="profile-stats">
          <StatPill icon="👥" value={(photographer.followers/1000).toFixed(1)+'k'} label="followers" />
          <StatPill icon="🏆" value={photographer.wins} label="wins" />
          <StatPill icon="⭐" value={photographer.avgRating} label="rating" />
          <StatPill icon="💎" value={(photographer.points/1000).toFixed(1)+'k'} label="pts" />
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        {PROFILE_TABS.map(tab => (
          <button
            key={tab}
            className={`profile-tab ${activeTab === tab ? 'profile-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
            id={`profile-tab-${tab.toLowerCase()}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="profile-tab-content animate-fade-in" key={activeTab}>
        {activeTab === 'Portfolio' && (
          <div className="portfolio-grid">
            {portfolioPhotos.map(p => (
              <div key={p.id} className="portfolio-item">
                <img src={p.url} alt="Portfolio piece" style={{ aspectRatio: p.aspectRatio }} className="portfolio-img" loading="lazy" />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Timeline' && (
          <div className="timeline">
            {TIMELINE_EVENTS.map((ev, i) => (
              <div key={i} className="timeline-entry">
                <div className="timeline-entry__icon">{ev.icon}</div>
                <div className="timeline-entry__connector" />
                <div className="timeline-entry__content">
                  <div className="body-sm text-tertiary timeline-entry__date">{ev.date}</div>
                  <div className="heading-2">{ev.title}</div>
                  <div className="body-md text-secondary">{ev.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Achievements' && (
          <div className="achievements-grid">
            {ACHIEVEMENTS.map(a => (
              <div key={a.id} className={`achievement ${a.unlocked ? 'achievement--unlocked' : 'achievement--locked'}`} id={`achievement-${a.id}`}>
                <div className="achievement__icon">{a.icon}</div>
                <div className="achievement__name body-sm">{a.name}</div>
                <div className="achievement__desc" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{a.desc}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Reviews' && (
          <div className="reviews-list">
            {REVIEWS.map(r => (
              <div key={r.id} className="review-card" id={`review-${r.id}`}>
                <div className="review-card__header">
                  <div className="review-card__reviewer">
                    <img src={r.reviewerAvatar} alt={r.reviewer} className="review-card__avatar" />
                    <div>
                      <div className="body-md">{r.reviewer}</div>
                      <div className="body-sm text-tertiary">{r.type} · {r.date}</div>
                    </div>
                  </div>
                  <div className="review-card__stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                </div>
                <p className="body-md review-card__body">{r.body}</p>
                {r.verified && <span className="review-card__verified label">✓ Verified Booking</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
