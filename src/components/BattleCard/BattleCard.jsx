import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import './BattleCard.css';

export default function BattleCard({ battle, onVote }) {
  const { castBattleVote } = useApp();
  const [voted, setVoted] = useState(null); // 'a' | 'b' | null
  const [impact, setImpact] = useState(null);
  const [eloResults, setEloResults] = useState(null);

  const total = battle.photoA.votes + battle.photoB.votes;
  const pctA = Math.round((battle.photoA.votes / total) * 100);
  const pctB = 100 - pctA;

  const handleVote = async (side) => {
    if (voted) return;
    setVoted(side);
    setImpact(side);
    
    // Calculate and trigger Elo adjustments in database and local state
    const results = await castBattleVote(battle.id, side);
    if (results) {
      setEloResults(results);
    }

    setTimeout(() => setImpact(null), 600);
    onVote?.(side);
  };

  return (
    <div className="battle-card">

      {/* ── STACKED layout: Photo A on top, Photo B below ── */}
      <div className="battle-card__photos">

        {/* Photo A */}
        <button
          className={`battle-card__photo ${voted === 'a' ? 'battle-card__photo--chosen' : ''} ${voted && voted !== 'a' ? 'battle-card__photo--unchosen' : ''} ${impact === 'a' ? 'battle-impact' : ''}`}
          onClick={() => handleVote('a')}
          aria-label={`Vote for ${battle.photoA.photographerName}`}
          id={`vote-a-${battle.id}`}
          disabled={!!voted}
        >
          {/* Dark cinema box — shows FULL image regardless of aspect ratio */}
          <div className="battle-card__cinema">
            <img
              src={battle.photoA.url}
              alt={`Entry by ${battle.photoA.photographerName}`}
              className="battle-card__img"
            />
          </div>

          {/* Info row at bottom */}
          <div className="battle-card__info">
            <div className="battle-card__photographer">
              <img src={battle.photoA.photographerAvatar} alt={battle.photoA.photographerName} />
              <div>
                <span className="battle-card__name">{battle.photoA.photographerName}</span>
                <div className="battle-card__elo">
                  ⚡ {eloResults ? eloResults.newRatingA : (battle.photoA.rating || 1200)}
                  {eloResults && (
                    <span className={`elo-badge ${eloResults.changeA.startsWith('+') ? 'elo-badge--up' : 'elo-badge--down'}`}>
                      {eloResults.changeA}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {voted
              ? <div className="battle-card__pct battle-card__pct--a">{pctA}%</div>
              : <div className="battle-card__vote-hint">Tap to vote</div>
            }
          </div>

          {voted === 'a' && (
            <div className="battle-card__chosen-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Your vote
            </div>
          )}
        </button>

        {/* VS divider */}
        <div className="battle-card__vs-row">
          <div className="battle-card__vs-line" />
          <div className="battle-card__vs-badge">VS</div>
          <div className="battle-card__vs-line" />
        </div>

        {/* Photo B */}
        <button
          className={`battle-card__photo ${voted === 'b' ? 'battle-card__photo--chosen' : ''} ${voted && voted !== 'b' ? 'battle-card__photo--unchosen' : ''} ${impact === 'b' ? 'battle-impact' : ''}`}
          onClick={() => handleVote('b')}
          aria-label={`Vote for ${battle.photoB.photographerName}`}
          id={`vote-b-${battle.id}`}
          disabled={!!voted}
        >
          <div className="battle-card__cinema">
            <img
              src={battle.photoB.url}
              alt={`Entry by ${battle.photoB.photographerName}`}
              className="battle-card__img"
            />
          </div>

          <div className="battle-card__info">
            <div className="battle-card__photographer">
              <img src={battle.photoB.photographerAvatar} alt={battle.photoB.photographerName} />
              <div>
                <span className="battle-card__name">{battle.photoB.photographerName}</span>
                <div className="battle-card__elo">
                  ⚡ {eloResults ? eloResults.newRatingB : (battle.photoB.rating || 1200)}
                  {eloResults && (
                    <span className={`elo-badge ${eloResults.changeB.startsWith('+') ? 'elo-badge--up' : 'elo-badge--down'}`}>
                      {eloResults.changeB}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {voted
              ? <div className="battle-card__pct battle-card__pct--b">{pctB}%</div>
              : <div className="battle-card__vote-hint">Tap to vote</div>
            }
          </div>

          {voted === 'b' && (
            <div className="battle-card__chosen-badge battle-card__chosen-badge--b">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Your vote
            </div>
          )}
        </button>
      </div>

      {/* ── Vote bar (only visible after voting) ── */}
      {voted && (
        <div className="battle-card__bars animate-fade-in">
          <div className="battle-card__bar-track">
            <div className="battle-card__bar-fill battle-card__bar-fill--a" style={{ width: `${pctA}%` }} />
            <div className="battle-card__bar-fill battle-card__bar-fill--b" style={{ width: `${pctB}%` }} />
          </div>
          <div className="battle-card__bar-labels">
            <span className="body-sm" style={{ color: '#FF4D6D', fontWeight: 700 }}>
              {(battle.photoA.votes + (voted === 'a' ? 1 : 0)).toLocaleString()} votes
            </span>
            <span className="body-sm" style={{ color: '#6E6E76' }}>
              {battle.totalVotes.toLocaleString()} total
            </span>
            <span className="body-sm" style={{ color: '#6E5BFF', fontWeight: 700 }}>
              {(battle.photoB.votes + (voted === 'b' ? 1 : 0)).toLocaleString()} votes
            </span>
          </div>
        </div>
      )}

      {!voted && (
        <p className="battle-card__hint body-sm">Pick the photo that resonates most with you</p>
      )}
    </div>
  );
}
