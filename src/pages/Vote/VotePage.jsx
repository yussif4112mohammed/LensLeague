import { useState } from 'react';
import BattleCard from '../../components/BattleCard/BattleCard';
import ProgressRing from '../../components/ProgressRing/ProgressRing';
import { battles } from '../../data/battles';
import './VotePage.css';

export default function VotePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votedCount, setVotedCount] = useState(0);
  const [skipped, setSkipped] = useState([]);

  const totalVotes = 20;
  const remaining = battles.filter((_, i) => !skipped.includes(i));

  if (currentIndex >= remaining.length) {
    return (
      <div className="vote-done">
        <div style={{ fontSize: 64 }}>🏆</div>
        <h2 className="display-lg">You're on fire!</h2>
        <p className="body-lg text-secondary">You voted on {votedCount} battles today.</p>
        <p className="body-md text-tertiary">Come back tomorrow for more matchups.</p>
        <button className="vote-done__restart" onClick={() => { setCurrentIndex(0); setVotedCount(0); setSkipped([]); }} id="restart-voting-btn">
          Start over
        </button>
      </div>
    );
  }

  const battle = remaining[currentIndex];

  const handleVote = () => {
    setVotedCount(c => c + 1);
    setTimeout(() => setCurrentIndex(i => i + 1), 800);
  };

  const handleSkip = () => {
    setSkipped(prev => [...prev, currentIndex]);
    setCurrentIndex(i => i + 1);
  };

  return (
    <div className="vote-page">
      <div className="vote-header">
        <div>
          <h1 className="heading-1">Compete</h1>
          <p className="body-sm text-secondary">Vote on today's battles</p>
        </div>
        <ProgressRing
          progress={votedCount / totalVotes}
          size={64}
          strokeWidth={5}
          label={`${votedCount}`}
          sublabel={`/ ${totalVotes}`}
        />
      </div>

      <div className="vote-battle-wrap animate-fade-in" key={battle.id}>
        <div className="vote-battle-meta">
          <span className="label text-secondary">Category</span>
          <span className="body-md" style={{ color: 'var(--accent-primary)' }}>{battle.category}</span>
          <span className="body-sm text-tertiary">Ends in {battle.endsIn}</span>
        </div>

        <BattleCard battle={battle} onVote={handleVote} />

        <button className="vote-skip" onClick={handleSkip} id="skip-battle-btn">
          Skip this one
        </button>
      </div>

      <div className="vote-progress-bar">
        <div className="vote-progress-bar__fill" style={{ width: `${(currentIndex / remaining.length) * 100}%` }} />
      </div>
    </div>
  );
}
