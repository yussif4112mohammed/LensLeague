import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import { useApp } from '../../context/AppContext';
import './ChallengesPage.css';

// Real-time ticking countdown timer component
function Countdown({ endsAt }) {
  const [timeLeft, setTimeLeft] = useState(() => new Date(endsAt) - new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(endsAt) - new Date();
      setTimeLeft(diff);
      if (diff <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endsAt]);

  if (timeLeft <= 0) return <span className="body-sm text-tertiary">Ended</span>;

  const d = Math.floor(timeLeft / 86400000);
  const h = Math.floor((timeLeft % 86400000) / 3600000);
  const m = Math.floor((timeLeft % 3600000) / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="countdown">
      {d > 0 && <><span className="countdown__val">{d}</span><span className="countdown__unit">d</span></>}
      <span className="countdown__val">{h}</span><span className="countdown__unit">h</span>
      <span className="countdown__val">{m}</span><span className="countdown__unit">m</span>
      <span className="countdown__val">{s}</span><span className="countdown__unit">s</span>
    </div>
  );
}

const SEG_OPTS = [{ label: 'Active', value: 'active' }, { label: 'Past Winners', value: 'past' }];

const MOCK_PORTFOLIO_PHOTOS = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=500&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=500&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=500&h=500&fit=crop&q=80'
];

export default function ChallengesPage() {
  const navigate = useNavigate();
  const { challenges, submissions, submitChallengeEntry } = useApp();
  const [tab, setTab] = useState('active');

  // Modal State
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const [entrySuccess, setEntrySuccess] = useState(false);

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const pastChallenges = challenges.filter(c => c.status === 'past');
  const featured = activeChallenges[0];

  const handleOpenEntry = (challenge) => {
    setSelectedChallenge(challenge);
    setSelectedPhoto(MOCK_PORTFOLIO_PHOTOS[0]);
    setEntryModalOpen(true);
  };

  const handleConfirmSubmit = (e) => {
    e.preventDefault();
    if (!selectedPhoto) return;
    submitChallengeEntry(selectedChallenge.id, selectedPhoto);
    setEntrySuccess(true);
    setTimeout(() => {
      setEntryModalOpen(false);
      setEntrySuccess(false);
      setSelectedChallenge(null);
      setSelectedPhoto('');
    }, 1500);
  };

  return (
    <div className="challenges-page">
      <div className="challenges-header">
        <h1 className="display-lg">Challenges</h1>
        <SegmentedControl options={SEG_OPTS} value={tab} onChange={setTab} id="challenges-seg" />
      </div>

      {tab === 'active' && (
        <>
          {/* Featured challenge */}
          {featured && (() => {
            const userSub = submissions.find(s => s.challengeId === featured.id);
            return (
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

                  {userSub ? (
                    <div className="submitted-status-row">
                      <img src={userSub.photoUrl} alt="Your entry" className="submitted-status-thumb" />
                      <div className="submitted-badge">✓ Entered Submission</div>
                    </div>
                  ) : (
                    <button className="challenge-hero__enter" onClick={() => handleOpenEntry(featured)} id="enter-featured-challenge-btn">
                      Enter This Challenge →
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Other active challenges */}
          <div className="challenge-list-section">
            <h3 className="heading-2" style={{ padding: 'var(--space-4) var(--screen-px) 0' }}>More Challenges</h3>
            <div className="challenge-mini-list">
              {activeChallenges.slice(1).map(ch => {
                const userSub = submissions.find(s => s.challengeId === ch.id);
                return (
                  <div key={ch.id} className="challenge-mini-card" id={`challenge-${ch.id}`}>
                    <img src={ch.coverUrl} alt={ch.title} className="challenge-mini-card__img" />
                    <div className="challenge-mini-card__info">
                      <div className="heading-2">{ch.title}</div>
                      <div className="body-sm text-secondary">{ch.entries} entries · <span className="text-gold">+{ch.prizePoints.toLocaleString()} pts</span></div>
                      <Countdown endsAt={ch.endsAt} />
                    </div>

                    {userSub ? (
                      <div className="mini-submitted-wrap">
                        <img src={userSub.photoUrl} alt="Your entry" className="mini-submitted-thumb" />
                        <span className="mini-submitted-badge">✓ Submitted</span>
                      </div>
                    ) : (
                      <button className="challenge-mini-card__btn" onClick={() => handleOpenEntry(ch)} id={`enter-${ch.id}-btn`}>Enter</button>
                    )}
                  </div>
                );
              })}
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

      {/* Challenge Entry Photo Picker Modal */}
      {entryModalOpen && selectedChallenge && (
        <div className="photo-modal-backdrop" onClick={() => setEntryModalOpen(false)}>
          <div className="photo-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <button className="photo-modal__close" onClick={() => setEntryModalOpen(false)}>✕</button>
            <div className="photo-modal__info">
              <h2 className="heading-1" style={{ marginBottom: '4px' }}>Submit to Challenge</h2>
              <p className="body-sm text-secondary" style={{ marginBottom: '16px' }}>
                Select a photo from your timeline to enter into <strong>{selectedChallenge.title}</strong>.
              </p>

              {entrySuccess ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--success)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🚀</div>
                  <p className="heading-2">Entry Submitted!</p>
                  <p className="body-sm text-secondary">Good luck in the standings!</p>
                </div>
              ) : (
                <form onSubmit={handleConfirmSubmit}>
                  <div className="photo-select-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                    {MOCK_PORTFOLIO_PHOTOS.map((url, i) => (
                      <div 
                        key={i} 
                        className={`photo-select-item ${selectedPhoto === url ? 'photo-select-item--active' : ''}`}
                        onClick={() => setSelectedPhoto(url)}
                        style={{
                          aspectRatio: '1',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          position: 'relative',
                          border: selectedPhoto === url ? '3.5px solid var(--accent-primary)' : '2.5px solid transparent',
                          transition: 'border-color 0.15s'
                        }}
                      >
                        <img src={url} alt={`Option ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {selectedPhoto === url && (
                          <div style={{
                            position: 'absolute', inset: 0, background: 'rgba(255,77,109,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <span style={{ background: 'var(--accent-primary)', color: 'white', borderRadius: '50px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button type="submit" className="btn btn--primary btn--full" style={{ height: '46px' }} id="confirm-challenge-entry-btn">
                    Confirm Submission
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
