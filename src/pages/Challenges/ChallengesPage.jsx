import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import { challenges } from '../../data/challenges';
import './ChallengesPage.css';

function Countdown({ endsAt }) {
  const diff = new Date(endsAt) - new Date();
  if (diff <= 0) return <span className="body-sm text-tertiary">Ended</span>;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return (
    <div className="countdown">
      {d > 0 && <><span className="countdown__val">{d}</span><span className="countdown__unit">d</span></>}
      <span className="countdown__val">{h}</span><span className="countdown__unit">h</span>
      <span className="countdown__val">{m}</span><span className="countdown__unit">m</span>
    </div>
  );
}

const SEG_OPTS = [{ label: 'Active', value: 'active' }, { label: 'Past Winners', value: 'past' }];

export default function ChallengesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('active');
  const activeChallenges = challenges.filter(c => c.status === 'active');
  const pastChallenges = challenges.filter(c => c.status === 'past');
  const featured = activeChallenges[0];

  return (
    <div className="challenges-page">
      <div className="challenges-header">
        <h1 className="display-lg">Challenges</h1>
        <SegmentedControl options={SEG_OPTS} value={tab} onChange={setTab} id="challenges-seg" />
      </div>

      {tab === 'active' && (
        <>
          {/* Featured challenge */}
          {featured && (
            <div className="challenge-hero" style={{ backgroundImage: `url(${featured.coverUrl})` }}>
              <div className="challenge-hero__overlay" />
              <div className="challenge-hero__content">
                <span className="challenge-hero__badge label">🏆 Featured Challenge</span>
                <h2 className="display-lg">{featured.title}</h2>
                <p className="body-md" style={{ opacity: 0.85 }}>{featured.theme}</p>
                <div className="challenge-hero__meta">
                  <Countdown endsAt={featured.endsAt} />
                  <span className="body-sm">{featured.entries.toLocaleString()} entries</span>
                  <span className="body-sm text-gold">+{featured.prizePoints.toLocaleString()} pts</span>
                </div>
                <button className="challenge-hero__enter" onClick={() => navigate('/upload')} id="enter-featured-challenge-btn">
                  Enter This Challenge →
                </button>
              </div>
            </div>
          )}

          {/* Other active challenges */}
          <div className="challenge-list-section">
            <h3 className="heading-2" style={{ padding: 'var(--space-4) var(--screen-px) 0' }}>More Challenges</h3>
            <div className="challenge-mini-list">
              {activeChallenges.slice(1).map(ch => (
                <div key={ch.id} className="challenge-mini-card" id={`challenge-${ch.id}`}>
                  <img src={ch.coverUrl} alt={ch.title} className="challenge-mini-card__img" />
                  <div className="challenge-mini-card__info">
                    <div className="heading-2">{ch.title}</div>
                    <div className="body-sm text-secondary">{ch.entries} entries · <span className="text-gold">+{ch.prizePoints.toLocaleString()} pts</span></div>
                    <Countdown endsAt={ch.endsAt} />
                  </div>
                  <button className="challenge-mini-card__btn" onClick={() => navigate('/upload')} id={`enter-${ch.id}-btn`}>Enter</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'past' && (
        <div className="past-winners">
          {pastChallenges.map(ch => (
            <div key={ch.id} className="past-challenge">
              <h3 className="heading-2" style={{ padding: '0 var(--screen-px)' }}>{ch.title}</h3>
              <div className="winners-row">
                {ch.winners.map(w => (
                  <div key={w.rank} className={`winner-card winner-card--rank-${w.rank}`} onClick={() => navigate(`/profile/${w.photographerId}`)} id={`winner-${w.photographerId}`}>
                    <div className="winner-card__rank">{w.rank === 1 ? '🥇' : w.rank === 2 ? '🥈' : '🥉'}</div>
                    <img src={w.photoUrl} alt={`Winner by ${w.photographerName}`} className="winner-card__photo" />
                    <div className="winner-card__info">
                      <img src={w.photographerAvatar} alt={w.photographerName} className="winner-card__avatar" />
                      <span className="body-sm">{w.photographerName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
