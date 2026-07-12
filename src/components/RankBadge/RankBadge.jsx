import './RankBadge.css';

const RANK_CONFIG = {
  1: { color: 'gold', label: '#1', glow: true },
  2: { color: 'silver', label: '#2', glow: false },
  3: { color: 'bronze', label: '#3', glow: false },
};

export default function RankBadge({ rank, size = 'md' }) {
  const config = RANK_CONFIG[rank] || { color: 'neutral', label: `#${rank}`, glow: false };

  return (
    <div
      className={`rank-badge rank-badge--${config.color} rank-badge--${size} ${config.glow ? 'rank-badge--glow' : ''}`}
      aria-label={`Rank ${rank}`}
    >
      {rank === 1 && (
        <svg className="rank-badge__crown" width="12" height="10" viewBox="0 0 24 18" fill="currentColor">
          <path d="M1 17L5 5l7 6 7-6 4 12H1z"/>
        </svg>
      )}
      <span className="rank-badge__number">{config.label}</span>
    </div>
  );
}
