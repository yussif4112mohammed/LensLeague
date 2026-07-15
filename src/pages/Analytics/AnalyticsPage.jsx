import { useState } from 'react';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import { photographers, PHOTO_URLS } from '../../data/photographers';
import './AnalyticsPage.css';

const ME = photographers[0];

const PERIOD_OPTS = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: 'All Time', value: 'all' },
];

const STATS = [
  { label: 'Profile Views', value: '14,820', delta: '+18%', sparkline: [30, 45, 38, 60, 72, 55, 80] },
  { label: 'Votes Received', value: '3,241', delta: '+24%', sparkline: [20, 35, 42, 38, 55, 70, 65] },
  { label: 'Competition Wins', value: '87', delta: '+3 this month', sparkline: [2, 3, 1, 4, 2, 3, 5] },
  { label: 'Follower Growth', value: '+842', delta: '+12% this week', sparkline: [60, 80, 100, 120, 90, 110, 150] },
  { label: 'Booking Requests', value: '34', delta: '+8 this month', sparkline: [4, 6, 3, 8, 5, 7, 6] },
  { label: 'Avg. Rating', value: '4.97 ★', delta: 'Stable', sparkline: [4.8, 4.9, 4.85, 4.95, 4.9, 4.97, 4.97] },
];

const TOP_PHOTOS = PHOTO_URLS.slice(0, 5).map((url, i) => ({
  id: `top-${i}`, url,
  votes: [4780, 3420, 3120, 2810, 2340][i],
  category: ['Portrait', 'Landscape', 'Portrait', 'Nature', 'Street'][i],
}));

function MiniSparkline({ data }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 64, h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="sparkline">
      <polyline points={points} fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d');
  const [showWrapped, setShowWrapped] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scorecardShared, setScorecardShared] = useState(false);

  // Auto-advance logic for story slides
  useEffect(() => {
    if (!showWrapped) return;

    if (currentSlide < 4) {
      const timer = setTimeout(() => {
        setCurrentSlide(prev => prev + 1);
      }, 4000); // 4 seconds per slide
      return () => clearTimeout(timer);
    }
  }, [showWrapped, currentSlide]);

  const handleOpenWrapped = () => {
    setCurrentSlide(0);
    setScorecardShared(false);
    setShowWrapped(true);
  };

  const handleCloseWrapped = () => {
    setShowWrapped(false);
    setCurrentSlide(0);
  };

  const handleNextSlide = () => {
    if (currentSlide < 4) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleShareScorecard = () => {
    setScorecardShared(true);
    setTimeout(() => {
      setScorecardShared(false);
    }, 2500);
  };

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h1 className="display-lg">Your Analytics</h1>
          <p className="body-md text-secondary">Track your growth and performance.</p>
        </div>
        <button className="wrapped-btn" onClick={handleOpenWrapped} id="wrapped-btn">
          <span>📊</span>
          <div>
            <div className="body-sm" style={{ fontWeight: 700 }}>July Wrapped</div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Tap to view</div>
          </div>
        </button>
      </div>

      <div className="analytics-seg">
        <SegmentedControl options={PERIOD_OPTS} value={period} onChange={setPeriod} id="analytics-period" />
      </div>

      {/* Stats grid */}
      <div className="stat-grid">
        {STATS.map(s => (
          <div key={s.label} className="stat-card" id={`stat-${s.label.toLowerCase().replace(/\s+/g,'-')}`}>
            <div className="stat-card__header">
              <span className="stat-card__label body-sm text-secondary">{s.label}</span>
              <MiniSparkline data={s.sparkline} />
            </div>
            <div className="stat-card__value">{s.value}</div>
            <div className="stat-card__delta body-sm" style={{ color: s.delta.startsWith('+') ? 'var(--success)' : 'var(--text-tertiary)' }}>
              {s.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Top performing work */}
      <div className="analytics-section">
        <h2 className="heading-1">Top Performing Work</h2>
        <div className="top-photos-list">
          {TOP_PHOTOS.map((p, i) => (
            <div key={p.id} className="top-photo-row" id={`top-photo-${i}`}>
              <span className="top-photo-rank">{i + 1}</span>
              <img src={p.url} alt="" className="top-photo-thumb" />
              <div className="top-photo-info">
                <div className="body-md">{p.category}</div>
                <div className="body-sm text-secondary">❤️ {p.votes.toLocaleString()} votes</div>
              </div>
              <button className="top-photo-promote body-sm" id={`promote-${i}-btn`}>
                + Portfolio
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Audience */}
      <div className="analytics-section">
        <h2 className="heading-1">Audience</h2>
        <div className="audience-list">
          {[
            { country: 'United States', pct: 28, flag: '🇺🇸' },
            { country: 'United Kingdom', pct: 18, flag: '🇬🇧' },
            { country: 'Japan', pct: 15, flag: '🇯🇵' },
            { country: 'Australia', pct: 11, flag: '🇦🇺' },
            { country: 'Other', pct: 28, flag: '🌍' },
          ].map(a => (
            <div key={a.country} className="audience-row">
              <span className="audience-flag">{a.flag}</span>
              <div className="audience-bar-wrap">
                <div className="audience-label body-sm">{a.country}</div>
                <div className="audience-bar">
                  <div className="audience-bar__fill" style={{ width: `${a.pct}%` }} />
                </div>
              </div>
              <span className="body-sm text-secondary">{a.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Story-style Wrapped Modal */}
      {showWrapped && (
        <div className="wrapped-modal-backdrop" onClick={handleCloseWrapped}>
          <div className="wrapped-modal" onClick={e => e.stopPropagation()}>
            <button className="wrapped-modal__close" onClick={handleCloseWrapped} id="close-wrapped-btn">✕</button>
            
            {/* Horizontal Story Progress Bars */}
            <div className="wrapped-progress-container">
              {[0, 1, 2, 3, 4].map(idx => {
                let fillClass = '';
                if (idx < currentSlide) fillClass = 'wrapped-progress-bar__fill--completed';
                else if (idx === currentSlide) fillClass = 'wrapped-progress-bar__fill--active';
                return (
                  <div key={idx} className="wrapped-progress-bar">
                    <div className={`wrapped-progress-bar__fill ${fillClass}`} />
                  </div>
                );
              })}
            </div>

            {/* Tap zones for left/right navigation */}
            <div className="wrapped-nav-overlay">
              <div className="wrapped-nav-zone" onClick={handlePrevSlide} />
              <div className="wrapped-nav-zone" onClick={handleNextSlide} />
            </div>

            {/* Slide 0: Intro */}
            {currentSlide === 0 && (
              <div className="wrapped-slide">
                <span className="wrapped-slide__icon">📸</span>
                <h2 className="wrapped-slide__title text-primary">Your July<br/><span className="gradient-text" style={{ background: 'linear-gradient(135deg, #ff4d6d, #ff8fa3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Wrapped</span></h2>
                <p className="wrapped-slide__desc text-secondary">Let's look back at your creative achievements this month on LensLeague.</p>
              </div>
            )}

            {/* Slide 1: Votes */}
            {currentSlide === 1 && (
              <div className="wrapped-slide">
                <span className="wrapped-slide__icon">❤️</span>
                <p className="body-sm text-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Total Love</p>
                <h2 className="display-xl text-primary font-black" style={{ fontSize: '44px', margin: '8px 0' }}>3,241</h2>
                <h2 className="wrapped-slide__title text-primary">Votes Received</h2>
                <p className="wrapped-slide__desc text-secondary">Your photos inspired the global community, racking up thousands of visual reactions!</p>
              </div>
            )}

            {/* Slide 2: Wins */}
            {currentSlide === 2 && (
              <div className="wrapped-slide">
                <span className="wrapped-slide__icon">🏆</span>
                <p className="body-sm text-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Victory Lap</p>
                <h2 className="wrapped-slide__title text-primary" style={{ margin: '8px 0', fontSize: '32px' }}>87 Wins</h2>
                <p className="wrapped-slide__desc text-secondary">You dominated head-to-head vote battles with a max 12-day upload streak.</p>
              </div>
            )}

            {/* Slide 3: Top Photo */}
            {currentSlide === 3 && (
              <div className="wrapped-slide">
                <span className="wrapped-slide__icon">🌟</span>
                <p className="body-sm text-tertiary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, marginBottom: '4px' }}>Your Masterpiece</p>
                <img src={TOP_PHOTOS[0].url} alt="Masterpiece" className="wrapped-highlight-thumb" />
                <p className="body-md text-primary" style={{ fontWeight: 600 }}>Portrait Session</p>
                <p className="body-sm text-secondary">❤️ {TOP_PHOTOS[0].votes.toLocaleString()} votes</p>
              </div>
            )}

            {/* Slide 4: Final Scorecard */}
            {currentSlide === 4 && (
              <div className="wrapped-slide">
                <span className="wrapped-slide__icon">👑</span>
                <h2 className="wrapped-slide__title text-primary" style={{ fontSize: '20px' }}>Your July Scorecard</h2>
                
                <div className="wrapped-scorecard">
                  <img src={ME.avatar} alt={ME.name} className="wrapped-scorecard__avatar" />
                  <div>
                    <div className="body-md font-bold text-primary">{ME.name}</div>
                    <div className="body-sm text-secondary">Rank #{ME.globalRank} Globally</div>
                  </div>
                  
                  <div className="wrapped-scorecard__row">
                    <div className="wrapped-scorecard__stat">
                      <span className="wrapped-scorecard__val">3.2k</span>
                      <span className="wrapped-scorecard__lbl">Votes</span>
                    </div>
                    <div className="wrapped-scorecard__stat">
                      <span className="wrapped-scorecard__val">87</span>
                      <span className="wrapped-scorecard__lbl">Wins</span>
                    </div>
                    <div className="wrapped-scorecard__stat">
                      <span className="wrapped-scorecard__val">4.97</span>
                      <span className="wrapped-scorecard__lbl">Rating</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer action button */}
            <button className="wrapped-share-btn" onClick={handleShareScorecard} id="share-wrapped-btn">
              {scorecardShared ? '✓ Scorecard Saved!' : 'Download Scorecard'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
