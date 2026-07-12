import { useNavigate } from 'react-router-dom';
import { PrimaryButton, SecondaryButton } from '../../components/Buttons/Buttons';
import { photographers, PHOTO_URLS } from '../../data/photographers';
import RankBadge from '../../components/RankBadge/RankBadge';
import './LandingPage.css';

const STATS = [
  { value: '48,200+', label: 'Photographers' },
  { value: '1,240', label: 'Competitions Run' },
  { value: '12,800', label: 'Bookings Made' },
];

const HOW_STEPS = [
  { num: '01', title: 'Upload Your Work', desc: 'Share your photos to your portfolio, feed, or enter live competitions — all in one place.' },
  { num: '02', title: 'Compete & Get Voted', desc: 'Battle other photographers head-to-head. Community votes decide who rises on the global leaderboard.' },
  { num: '03', title: 'Get Hired', desc: 'Clients search by rank, style, and location. Your score is your credential.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* Sticky top nav */}
      <header className="landing-nav">
        <div className="landing-nav__logo">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#FF4D6D"/>
            <path d="M8 22l6-8 4 5 3-3 5 6H8z" fill="white" opacity="0.9"/>
            <circle cx="22" cy="10" r="3" fill="white"/>
          </svg>
          <span>LensLeague</span>
        </div>
        <button className="landing-nav__login" onClick={() => navigate('/login')} id="nav-login-btn">
          Log in
        </button>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero__grid">
          {PHOTO_URLS.slice(0, 9).map((url, i) => (
            <div key={i} className="hero__tile" style={{ animationDelay: `${i * 0.15}s` }}>
              <img src={url} alt="" loading={i < 4 ? 'eager' : 'lazy'} />
            </div>
          ))}
        </div>
        <div className="hero__overlay" />
        <div className="hero__content animate-fade-in">
          <div className="hero__badge label">🏆 The Competitive Platform for Photographers</div>
          <h1 className="display-xl hero__title">
            Where your portfolio<br />
            <span className="gradient-text">has a scoreboard.</span>
          </h1>
          <p className="hero__subtitle body-lg text-secondary">
            Upload. Compete. Rank up. Get hired.<br />
            Join 48,000+ photographers proving their skill.
          </p>
          <div className="hero__ctas">
            <PrimaryButton id="cta-join-photographer" onClick={() => navigate('/signup?role=photographer')}>
              Join as Photographer
            </PrimaryButton>
            <SecondaryButton id="cta-find-photographer" onClick={() => navigate('/signup?role=client')}>
              Find a Photographer
            </SecondaryButton>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-section">
        <div className="how-section__inner">
          <h2 className="display-lg" style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>How it works</h2>
          <div className="how-steps">
            {HOW_STEPS.map(step => (
              <div key={step.num} className="how-step">
                <div className="how-step__num gradient-text">{step.num}</div>
                <h3 className="heading-2">{step.title}</h3>
                <p className="body-md text-secondary">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live leaderboard teaser */}
      <section className="leaderboard-teaser">
        <div className="leaderboard-teaser__inner">
          <h2 className="heading-1" style={{ marginBottom: 'var(--space-6)' }}>Live Leaderboard</h2>
          <div className="leaderboard-teaser__list">
            {photographers.slice(0, 3).map((p, i) => (
              <div
                key={p.id}
                className="leaderboard-teaser__row"
                onClick={() => navigate(`/profile/${p.id}`)}
                id={`leaderboard-teaser-${p.id}`}
              >
                <RankBadge rank={i + 1} />
                <img src={p.avatar} alt={p.name} className="leaderboard-teaser__avatar" />
                <div className="leaderboard-teaser__info">
                  <div className="heading-2">{p.name}</div>
                  <div className="body-sm text-secondary">{p.categories[0]} · {p.location}</div>
                </div>
                <div className="leaderboard-teaser__pts">
                  <div className="heading-2 text-gold">{(p.points/1000).toFixed(1)}k</div>
                  <div className="body-sm text-tertiary">pts</div>
                </div>
              </div>
            ))}
          </div>
          <button className="leaderboard-teaser__view-all" onClick={() => navigate('/signup')}>
            View full leaderboard →
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section">
        {STATS.map(s => (
          <div key={s.label} className="stats-section__item">
            <div className="display-lg gradient-text">{s.value}</div>
            <div className="body-md text-secondary">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Final CTA */}
      <section className="landing-cta">
        <h2 className="display-lg">Ready to prove your skill?</h2>
        <p className="body-lg text-secondary" style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          Join the world's most competitive photography community.
        </p>
        <PrimaryButton id="final-cta-btn" onClick={() => navigate('/signup?role=photographer')}>
          Get Started — It's Free
        </PrimaryButton>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer__brand">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#FF4D6D"/>
            <path d="M8 22l6-8 4 5 3-3 5 6H8z" fill="white" opacity="0.9"/>
            <circle cx="22" cy="10" r="3" fill="white"/>
          </svg>
          LensLeague
        </div>
        <div className="landing-footer__links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Support</a>
          <a href="#">Blog</a>
        </div>
        <p className="body-sm text-tertiary">© 2026 LensLeague. All rights reserved.</p>
      </footer>
    </div>
  );
}
