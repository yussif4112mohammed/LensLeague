import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const PHOTO_MOSAIC = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=85',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=85',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=600&q=85',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=85',
  'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&q=85',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&q=85',
];

const STATS = [
  { value: '48K+', label: 'Photographers' },
  { value: '1,240', label: 'Competitions' },
  { value: '12.8K', label: 'Bookings Made' },
];

const HOW_STEPS = [
  { icon: '📷', step: '01', title: 'Upload Your Work', desc: 'Share photos to your portfolio, feed, or enter live competitions — all in one place.' },
  { icon: '⚔️', step: '02', title: 'Compete & Get Voted', desc: 'Battle other photographers head-to-head. Community votes decide who rises on the leaderboard.' },
  { icon: '💼', step: '03', title: 'Get Hired', desc: 'Clients search by rank, style, and location. Your score is your credential.' },
];

const TOP_PHOTOGRAPHERS = [
  { name: 'Aria Nakamura', rank: 1, location: 'Tokyo', pts: '48.2k', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&q=80' },
  { name: 'Marcus Osei', rank: 2, location: 'Lagos', pts: '42.1k', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=80' },
  { name: 'Sofia Reyes', rank: 3, location: 'Mexico City', pts: '38.7k', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&q=80' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing">

      {/* ── TOP NAV ── */}
      <header className="lp-nav">
        <div className="lp-nav__logo" onClick={() => navigate('/')}>
          <span className="lp-nav__brand">LensLeague</span>
        </div>
        <div className="lp-nav__actions">
          <button className="lp-nav__login" onClick={() => navigate('/login')} id="nav-login-btn">Log in</button>
          <button className="lp-nav__signup" onClick={() => navigate('/signup')} id="nav-signup-btn">Sign up</button>
        </div>
      </header>

      {/* ── HERO — Split layout ── */}
      <section className="lp-hero">
        {/* Left: text */}
        <div className="lp-hero__left">
          <div className="lp-hero__badge">
            <span className="badge-dot" />
            The competitive platform for photographers
          </div>

          <h1 className="lp-hero__headline">
            Where your<br />
            portfolio has<br />
            <span className="lp-hero__accent">a scoreboard.</span>
          </h1>

          <p className="lp-hero__sub">
            Upload. Compete. Rank up. Get hired.<br />
            Join 48,000+ photographers proving their skill every day.
          </p>

          <div className="lp-hero__ctas">
            <button className="lp-btn-primary lp-btn-lg" onClick={() => navigate('/signup?role=photographer')} id="cta-join-photographer">
              Join as Photographer
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
            <button className="lp-btn-secondary lp-btn-lg" onClick={() => navigate('/signup?role=client')} id="cta-find-photographer">
              Find a Photographer
            </button>
          </div>

          <div className="lp-hero__stats">
            {STATS.map(s => (
              <div key={s.label} className="lp-stat">
                <span className="lp-stat__value">{s.value}</span>
                <span className="lp-stat__label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: photo mosaic */}
        <div className="lp-hero__right">
          <div className="lp-mosaic">
            {PHOTO_MOSAIC.map((url, i) => (
              <div key={i} className={`lp-mosaic__tile lp-mosaic__tile--${i}`}>
                <img src={url} alt="" loading={i < 3 ? 'eager' : 'lazy'} />
              </div>
            ))}
            {/* Floating badge */}
            <div className="lp-mosaic__badge lp-mosaic__badge--rank">
              <span className="lp-mosaic__badge-icon">🏆</span>
              <div>
                <div className="lp-mosaic__badge-title">#1 Global</div>
                <div className="lp-mosaic__badge-sub">Aria Nakamura</div>
              </div>
            </div>
            <div className="lp-mosaic__badge lp-mosaic__badge--votes">
              <span style={{ fontSize: 18 }}>⚡</span>
              <div>
                <div className="lp-mosaic__badge-title">24,810 votes</div>
                <div className="lp-mosaic__badge-sub">live right now</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-section lp-how">
        <div className="lp-section__inner">
          <div className="lp-section__label">How it works</div>
          <h2 className="lp-section__title">Three steps to the top</h2>
          <div className="lp-how__grid">
            {HOW_STEPS.map(s => (
              <div key={s.step} className="lp-how__card">
                <div className="lp-how__icon">{s.icon}</div>
                <div className="lp-how__step-num">{s.step}</div>
                <h3 className="lp-how__step-title">{s.title}</h3>
                <p className="lp-how__step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE LEADERBOARD TEASER ── */}
      <section className="lp-section lp-leaderboard">
        <div className="lp-section__inner lp-leaderboard__inner">
          <div className="lp-leaderboard__text">
            <div className="lp-section__label">Live Rankings</div>
            <h2 className="lp-section__title">Global Leaderboard</h2>
            <p className="lp-leaderboard__desc">
              Every vote counts. Every upload matters. The top photographers are ranked in real-time based on community votes and competition wins.
            </p>
            <button className="lp-btn-primary" onClick={() => navigate('/signup')} id="view-full-leaderboard-btn">
              See the full leaderboard →
            </button>
          </div>
          <div className="lp-leaderboard__list">
            {TOP_PHOTOGRAPHERS.map((p, i) => (
              <div key={p.name} className={`lp-lb-row ${i === 0 ? 'lp-lb-row--gold' : ''}`}>
                <div className={`lp-lb-rank ${i === 0 ? 'lp-lb-rank--gold' : i === 1 ? 'lp-lb-rank--silver' : 'lp-lb-rank--bronze'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                </div>
                <img src={p.avatar} alt={p.name} className="lp-lb-avatar" />
                <div className="lp-lb-info">
                  <div className="lp-lb-name">{p.name}</div>
                  <div className="lp-lb-location">{p.location}</div>
                </div>
                <div className="lp-lb-pts">{p.pts} <span>pts</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="lp-section lp-cta-section">
        <div className="lp-cta-inner">
          <div className="lp-cta-glow" />
          <h2 className="lp-cta-title">Ready to prove<br />your skill?</h2>
          <p className="lp-cta-sub">Join the world's most competitive photography community. It's completely free to start.</p>
          <div className="lp-hero__ctas" style={{ justifyContent: 'center' }}>
            <button className="lp-btn-primary lp-btn-lg" onClick={() => navigate('/signup?role=photographer')} id="final-cta-photographer">
              Join as Photographer
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
            <button className="lp-btn-ghost lp-btn-lg" onClick={() => navigate('/signup?role=client')} id="final-cta-client">
              I'm hiring a photographer
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer__logo">
          LensLeague
        </div>
        <div className="lp-footer__links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Support</a>
          <a href="#">Blog</a>
        </div>
        <p className="lp-footer__copy">© 2026 LensLeague. All rights reserved.</p>
      </footer>
    </div>
  );
}
