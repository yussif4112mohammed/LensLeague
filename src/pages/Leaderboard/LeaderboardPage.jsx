import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import RankBadge from '../../components/RankBadge/RankBadge';
import { leaderboard, myRank } from '../../data/leaderboard';
import './LeaderboardPage.css';

const SCOPE_OPTS = [
  { label: 'Global', value: 'global' },
  { label: 'Country', value: 'country' },
  { label: 'Category', value: 'category' },
];
const PERIOD_OPTS = [
  { label: 'All-Time', value: 'all' },
  { label: 'This Month', value: 'month' },
  { label: 'This Week', value: 'week' },
];

function TrendArrow({ trend }) {
  if (trend === 0) return <span className="trend trend--flat">—</span>;
  if (trend > 0) return <span className="trend trend--up">↑{Math.abs(trend)}</span>;
  return <span className="trend trend--down">↓{Math.abs(trend)}</span>;
}

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [scope, setScope] = useState('global');
  const [period, setPeriod] = useState('all');
  const entries = leaderboard.global;

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <h1 className="display-lg">Leaderboard</h1>
        <div className="leaderboard-controls">
          <SegmentedControl options={SCOPE_OPTS} value={scope} onChange={setScope} id="lb-scope" />
          <SegmentedControl options={PERIOD_OPTS} value={period} onChange={setPeriod} id="lb-period" />
        </div>
      </div>

      {/* My rank pinned card */}
      <div className="my-rank-card">
        <div className="my-rank-card__left">
          <RankBadge rank={myRank.global} size="md" />
          <div>
            <div className="heading-2">You're #{myRank.global} globally</div>
            <div className="body-sm text-secondary">{myRank.weeklyChange}</div>
          </div>
        </div>
        <TrendArrow trend={myRank.trend} />
      </div>

      {/* Top 3 podium */}
      <div className="podium">
        {/* Silver (#2) */}
        <div className="podium__entry podium__entry--2" onClick={() => navigate(`/profile/${entries[1]?.id}`)} id={`podium-rank-2`}>
          <img src={entries[1]?.avatar} alt={entries[1]?.name} className="podium__avatar" />
          <RankBadge rank={2} size="sm" />
          <div className="podium__name body-sm">{entries[1]?.name.split(' ')[0]}</div>
          <div className="podium__pts body-sm text-secondary">{((entries[1]?.points||0)/1000).toFixed(1)}k</div>
          <div className="podium__bar podium__bar--2" />
        </div>
        {/* Gold (#1) */}
        <div className="podium__entry podium__entry--1" onClick={() => navigate(`/profile/${entries[0]?.id}`)} id={`podium-rank-1`}>
          <div className="podium__crown">👑</div>
          <img src={entries[0]?.avatar} alt={entries[0]?.name} className="podium__avatar podium__avatar--1" />
          <RankBadge rank={1} size="md" />
          <div className="podium__name body-sm">{entries[0]?.name.split(' ')[0]}</div>
          <div className="podium__pts body-sm text-gold">{((entries[0]?.points||0)/1000).toFixed(1)}k</div>
          <div className="podium__bar podium__bar--1" />
        </div>
        {/* Bronze (#3) */}
        <div className="podium__entry podium__entry--3" onClick={() => navigate(`/profile/${entries[2]?.id}`)} id={`podium-rank-3`}>
          <img src={entries[2]?.avatar} alt={entries[2]?.name} className="podium__avatar" />
          <RankBadge rank={3} size="sm" />
          <div className="podium__name body-sm">{entries[2]?.name.split(' ')[0]}</div>
          <div className="podium__pts body-sm text-secondary">{((entries[2]?.points||0)/1000).toFixed(1)}k</div>
          <div className="podium__bar podium__bar--3" />
        </div>
      </div>

      {/* Rank list */}
      <div className="lb-list">
        {entries.slice(3).map((p) => (
          <div
            key={p.id}
            className="lb-row"
            onClick={() => navigate(`/profile/${p.id}`)}
            id={`lb-row-${p.id}`}
          >
            <RankBadge rank={p.rank} size="sm" />
            <img src={p.avatar} alt={p.name} className="lb-row__avatar" />
            <div className="lb-row__info">
              <div className="lb-row__name body-lg">{p.name}</div>
              <div className="lb-row__cat body-sm text-secondary">{p.categories[0]} · {p.location}</div>
            </div>
            <div className="lb-row__right">
              <div className="lb-row__pts heading-2">{(p.points/1000).toFixed(1)}k</div>
              <TrendArrow trend={p.trend} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
