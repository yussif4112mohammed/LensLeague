import { useState } from 'react';
import './BattleCard.css';

export default function BattleCard({ battle, onVote }) {
  const [voted, setVoted] = useState(null); // 'a' | 'b' | null
  const [impact, setImpact] = useState(null);

  const total = battle.photoA.votes + battle.photoB.votes;
  const pctA = Math.round((battle.photoA.votes / total) * 100);
  const pctB = 100 - pctA;

  const handleVote = (side) => {
    if (voted) return;
    setVoted(side);
    setImpact(side);
    setTimeout(() => setImpact(null), 600);
    onVote?.(side);
  };

  return (
    <div className="battle-card">
      <div className="battle-card__photos">
        {/* Photo A */}
        <button
          className={`battle-card__photo battle-card__photo--a ${voted === 'a' ? 'battle-card__photo--chosen' : ''} ${voted && voted !== 'a' ? 'battle-card__photo--unchosen' : ''} ${impact === 'a' ? 'battle-impact' : ''}`}
          onClick={() => handleVote('a')}
          aria-label={`Vote for ${battle.photoA.photographerName}`}
          id={`vote-a-${battle.id}`}
          disabled={!!voted}
        >
          <img src={battle.photoA.url} alt={`Entry by ${battle.photoA.photographerName}`} className="battle-card__img" />
          <div className="battle-card__photo-overlay">
            <div className="battle-card__photographer">
              <img src={battle.photoA.photographerAvatar} alt={battle.photoA.photographerName} />
              <span>{battle.photoA.photographerName}</span>
            </div>
            {voted && <div className="battle-card__pct">{pctA}%</div>}
          </div>
          {voted === 'a' && (
            <div className="battle-card__chosen-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Your vote
            </div>
          )}
        </button>

        {/* VS Divider */}
        <div className="battle-card__vs">VS</div>

        {/* Photo B */}
        <button
          className={`battle-card__photo battle-card__photo--b ${voted === 'b' ? 'battle-card__photo--chosen' : ''} ${voted && voted !== 'b' ? 'battle-card__photo--unchosen' : ''} ${impact === 'b' ? 'battle-impact' : ''}`}
          onClick={() => handleVote('b')}
          aria-label={`Vote for ${battle.photoB.photographerName}`}
          id={`vote-b-${battle.id}`}
          disabled={!!voted}
        >
          <img src={battle.photoB.url} alt={`Entry by ${battle.photoB.photographerName}`} className="battle-card__img" />
          <div className="battle-card__photo-overlay">
            <div className="battle-card__photographer">
              <img src={battle.photoB.photographerAvatar} alt={battle.photoB.photographerName} />
              <span>{battle.photoB.photographerName}</span>
            </div>
            {voted && <div className="battle-card__pct">{pctB}%</div>}
          </div>
          {voted === 'b' && (
            <div className="battle-card__chosen-badge battle-card__chosen-badge--b">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Your vote
            </div>
          )}
        </button>
      </div>

      {/* Vote bars */}
      <div className="battle-card__bars">
        <div className="battle-card__bar-track">
          <div
            className="battle-card__bar-fill battle-card__bar-fill--a"
            style={{ width: voted ? `${pctA}%` : '50%' }}
          />
          <div
            className="battle-card__bar-fill battle-card__bar-fill--b"
            style={{ width: voted ? `${pctB}%` : '50%' }}
          />
        </div>
        <div className="battle-card__bar-labels">
          <span className="body-sm">{(battle.photoA.votes + (voted === 'a' ? 1 : 0)).toLocaleString()} votes</span>
          <span className="body-sm text-secondary">{battle.totalVotes.toLocaleString()} total</span>
          <span className="body-sm">{(battle.photoB.votes + (voted === 'b' ? 1 : 0)).toLocaleString()} votes</span>
        </div>
      </div>

      {!voted && (
        <p className="battle-card__hint body-sm text-tertiary">Tap a photo to vote</p>
      )}
    </div>
  );
}
