import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { fromStoredExif } from '@/lib/photoMeta';
import './BattleCard.css';

export default function BattleCard({ battle, onVote, onSkip }) {
  const { castBattleVote } = useApp();
  const [voted, setVoted] = useState(null); // 'a' | 'b' | null
  const [impact, setImpact] = useState(null);
  // What the server actually returned: vote counts and status. It does NOT
  // return an Elo delta - castBattleVote stopped inventing those when the fake
  // ratings were removed - and reading a field it never sends is what crashed
  // this page on every vote.
  const [result, setResult] = useState(null);
  const [voteError, setVoteError] = useState('');
  const [touchStartY, setTouchStartY] = useState(null);

  const handleTouchStart = (e) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e) => {
    if (!touchStartY) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diffY = touchStartY - touchEndY;
    if (diffY > 60) {
      // Swiped UP -> trigger skip
      onSkip?.();
    }
    setTouchStartY(null);
  };

  // ONE source for every number on this card.
  //
  // Two separate crashes lived in the old arithmetic. battle.totalVotes was
  // read with .toLocaleString() and generateFairBattles does not set it - or
  // any vote count - so a battle from that fallback took the page down the
  // instant somebody voted. And `battle.photoA.votes + battle.photoB.votes`
  // on undefined gives NaN, which is falsy, so the bar silently showed a
  // 50/50 split that no one had voted for.
  //
  // After a vote the server's counts win: castBattleVote returns the true
  // tally, which is better than adding one to a number we started unsure of.
  const votesA = result ? result.votesA : (battle.photoA.votes || 0);
  const votesB = result ? result.votesB : (battle.photoB.votes || 0);
  const totalVotes = votesA + votesB;
  const pctA = totalVotes ? Math.round((votesA / totalVotes) * 100) : 50;
  const pctB = 100 - pctA;

  // Real metadata or none. parseGearOrGetExif invented all of this from the
  // photo id, which on a page whose whole purpose is comparing two photographs
  // meant the "Canon EOS R5 / f/1.2 / ISO 100" under one frame and the
  // "Leica Q3 / f/1.7 / ISO 200" under the other were both fiction, and voters
  // were weighing gear that did not exist.
  const exifA = battle.photoA.exif || fromStoredExif(battle.photoA.exif_data, battle.photoA.gear);
  const exifB = battle.photoB.exif || fromStoredExif(battle.photoB.exif_data, battle.photoB.gear);

  const exifPills = (exif) =>
    exif
      ? [
          ['Focal', exif.focalLength],
          ['Aperture', exif.aperture],
          ['Shutter', exif.shutter],
          ['ISO', exif.iso],
        ].filter(([, v]) => v)
      : [];

  const handleVote = async (side) => {
    if (voted) return;
    setVoteError('');
    setVoted(side);
    setImpact(side);
    
    const results = await castBattleVote(battle.id, side);

    // `if (results)` was always true - a refusal is an object too, so
    // { success: false, error: 'You have already voted' } was stored as a
    // result and rendered as one. Check what it actually says.
    if (results?.success) {
      setResult(results);
    } else {
      // Put the card back so the voter can try again, and tell them why.
      setVoted(null);
      setVoteError(results?.error || 'Your vote was not recorded.');
      setTimeout(() => setImpact(null), 600);
      return;
    }

    setTimeout(() => setImpact(null), 600);
    onVote?.(side);
  };

  return (
    <div className="battle-card" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

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
          <div className="battle-card__cinema">
            <img
              src={battle.photoA.url}
              alt={`Entry by ${battle.photoA.photographerName}`}
              className="battle-card__img"
            />
            {/* EXIF HUD Overlay */}
            <div className="battle-card__hud-overlay">
              {(exifA?.camera || exifA?.lens) && (
                <div className="hud-exif-header">
                  {exifA.camera && <div className="hud-exif-camera">{exifA.camera}</div>}
                  {exifA.lens && <div className="hud-exif-lens">{exifA.lens}</div>}
                </div>
              )}
              {exifPills(exifA).length > 0 && (
                <div className="hud-exif-grid">
                  {exifPills(exifA).map(([label, value]) => (
                    <div key={label} className="hud-exif-pill">
                      <span className="hud-exif-pill__val">{value}</span>
                      <span className="hud-exif-pill__lbl">{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Info row at bottom */}
          <div className="battle-card__info">
            <div className="battle-card__photographer">
              <img src={battle.photoA.photographerAvatar} alt={battle.photoA.photographerName} />
              <div>
                <span className="battle-card__name">{battle.photoA.photographerName}</span>
                <div className="battle-card__elo">
                  {/* The real tally, or nothing. This read eloResults.newRatingA
                      and eloResults.changeA - two fields the server has never
                      sent since the invented ratings were removed - so every
                      vote threw on undefined.startsWith and took the page down. */}
                  {`${votesA.toLocaleString()} ${votesA === 1 ? 'vote' : 'votes'}`}
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
            {/* EXIF HUD Overlay */}
            <div className="battle-card__hud-overlay">
              {(exifB?.camera || exifB?.lens) && (
                <div className="hud-exif-header">
                  {exifB.camera && <div className="hud-exif-camera">{exifB.camera}</div>}
                  {exifB.lens && <div className="hud-exif-lens">{exifB.lens}</div>}
                </div>
              )}
              {exifPills(exifB).length > 0 && (
                <div className="hud-exif-grid">
                  {exifPills(exifB).map(([label, value]) => (
                    <div key={label} className="hud-exif-pill">
                      <span className="hud-exif-pill__val">{value}</span>
                      <span className="hud-exif-pill__lbl">{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="battle-card__info">
            <div className="battle-card__photographer">
              <img src={battle.photoB.photographerAvatar} alt={battle.photoB.photographerName} />
              <div>
                <span className="battle-card__name">{battle.photoB.photographerName}</span>
                <div className="battle-card__elo">
                  {/* The real tally, or nothing. This read eloResults.newRatingB
                      and eloResults.changeB - two fields the server has never
                      sent since the invented ratings were removed - so every
                      vote threw on undefined.startsWith and took the page down. */}
                  {`${votesB.toLocaleString()} ${votesB === 1 ? 'vote' : 'votes'}`}
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
            <span className="body-sm" style={{ color: '#FFB020', fontWeight: 700 }}>
              {`${votesA.toLocaleString()} ${votesA === 1 ? 'vote' : 'votes'}`}
            </span>
            <span className="body-sm" style={{ color: '#6E6E76' }}>
              {`${totalVotes.toLocaleString()} total`}
            </span>
            <span className="body-sm" style={{ color: '#00E5FF', fontWeight: 700 }}>
              {`${votesB.toLocaleString()} ${votesB === 1 ? 'vote' : 'votes'}`}
            </span>
          </div>
        </div>
      )}

      {voteError && (
        // The database raises readable messages for the cases a voter actually
        // hits - already voted, own battle, closed, daily cap. They were being
        // thrown away, so a refused vote looked like a broken button.
        <p className="battle-card__hint body-sm" role="status">{voteError}</p>
      )}

      {!voted && !voteError && (
        <p className="battle-card__hint body-sm">Pick the photo that resonates most with you</p>
      )}
    </div>
  );
}
