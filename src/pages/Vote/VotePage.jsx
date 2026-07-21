import { useState } from 'react';
import BattleCard from '../../components/BattleCard/BattleCard';
import ProgressRing from '../../components/ProgressRing/ProgressRing';
import { useApp } from '../../context/AppContext';
import './VotePage.css';

const TOTAL_DAILY = 20;

function formatAspectRatio(ratio) {
  if (!ratio) return null;
  const labels = { '9/16': '9:16 Portrait', '16/9': '16:9 Landscape', '1/1': '1:1 Square', '4/5': '4:5 Portrait' };
  return labels[ratio] || ratio;
}

export default function VotePage() {
  const { battles, castBattleVote } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votedCount, setVotedCount]     = useState(0);
  const [skipped, setSkipped]           = useState([]);

  const remaining = battles.filter((_, i) => !skipped.includes(i));

  // Victory screen
  if (currentIndex >= remaining.length) {
    return (
      <div className="vote-done animate-fade-in">
        <div style={{ fontSize: 72 }}>🏆</div>
        <h2 className="display-lg">You're on fire!</h2>
        <p className="body-lg">You voted on <strong style={{ color: '#FF4D6D' }}>{votedCount}</strong> battles today.</p>
        <p className="body-md">Come back tomorrow for fresh matchups.</p>
        <button
          className="vote-done__restart"
          onClick={() => { setCurrentIndex(0); setVotedCount(0); setSkipped([]); }}
          id="restart-voting-btn"
        >
          Vote again →
        </button>
      </div>
    );
  }

  const battle = remaining[currentIndex];

  const handleVote = () => {
    setVotedCount(c => c + 1);
    setTimeout(() => setCurrentIndex(i => i + 1), 900);
  };

  const handleSkip = () => {
    setSkipped(prev => [...prev, currentIndex]);
    setCurrentIndex(i => i + 1);
  };

  const ratioA = formatAspectRatio(battle.photoA.aspectRatio);
  const ratioB = formatAspectRatio(battle.photoB.aspectRatio);

  return (
    <div className="vote-page">

      {/* Header + progress ring */}
      <div className="vote-header">
        <div>
          <h1 className="heading-1">Vote</h1>
          <p className="body-sm">Battle {currentIndex + 1} of {remaining.length}</p>
        </div>
        <ProgressRing
          progress={votedCount / TOTAL_DAILY}
          size={60}
          strokeWidth={5}
          label={`${votedCount}`}
          sublabel={`/ ${TOTAL_DAILY}`}
        />
      </div>

      <div className="vote-battle-wrap animate-fade-in" key={battle.id}>

        {/* Battle meta */}
        <div className="vote-battle-meta">
          <span className="label">Category</span>
          <span className="vote-battle-meta__dot" />
          <span className="body-md" style={{ color: '#FF4D6D', fontWeight: 700 }}>{battle.category}</span>
          <div className="vote-meta-timer">
            ⏱ {battle.endsIn}
          </div>
        </div>

        {/* Aspect ratio labels — transparent info so voters know both photos are shown in full */}
        {(ratioA || ratioB) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ratioA && <span className="vote-aspect-chip">📷 A: {ratioA}</span>}
            {ratioB && <span className="vote-aspect-chip">📷 B: {ratioB}</span>}
            <span className="vote-aspect-chip" style={{ color: '#34D399', borderColor: 'rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.06)' }}>
              ✓ Full photos shown
            </span>
          </div>
        )}

        {/* The battle card */}
        <BattleCard battle={battle} onVote={handleVote} onSkip={handleSkip} />

        {/* Mobile Swipe / Tap instructions */}
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <span className="vote-aspect-chip" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
            ☝️ Tap to vote now · Swipe up to skip
          </span>
        </div>

        {/* Skip */}
        <button className="vote-skip" onClick={handleSkip} id="skip-battle-btn">
          Skip this one
        </button>
      </div>

      {/* Progress bar at bottom of screen */}
      <div className="vote-progress-bar">
        <div
          className="vote-progress-bar__fill"
          style={{ width: `${(currentIndex / remaining.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
