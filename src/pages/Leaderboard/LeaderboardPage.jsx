import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../context/AppContext';
import { Trophy, Loader2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The leaderboard.
 *
 * REBUILT, not repaired. The previous version:
 *   - was never routed (/leaderboard redirected to /leagues), so nobody saw it
 *   - re-sorted by points in the browser, with a comment admitting the database
 *     rank "may lag behind" - a second ranking system that could disagree with
 *     the first
 *   - labelled the column "ELO", though the points come from a flat award and
 *     never touched an Elo calculation
 *
 * Ranking is now defined once, in get_leaderboard() (migration v16), and this
 * page only displays what it returns. "This month" is recomputed from the
 * battles themselves using the same point values the engine awards, so the two
 * scopes cannot drift apart.
 */

const SCOPES = [
  { id: 'month',    label: 'This month', hint: 'Points earned since the 1st' },
  { id: 'all_time', label: 'All time',   hint: 'Every point ever awarded' },
];

function Medal({ rank }) {
  // Only the top three get a colour. Below that, a plain number reads better
  // than a wall of decoration.
  const tone =
    rank === 1 ? 'bg-brand text-brand-foreground'
    : rank === 2 ? 'bg-silver/25 text-silver'
    : rank === 3 ? 'bg-bronze/25 text-bronze'
    : null;

  if (!tone) {
    return (
      <span className="w-8 text-center font-mono text-[13px] tabular-nums text-muted-foreground">
        {rank}
      </span>
    );
  }
  return (
    <span className={cn(
      'flex h-8 w-8 flex-none items-center justify-center rounded-full font-mono text-[13px] font-bold tabular-nums',
      tone
    )}>
      {rank}
    </span>
  );
}

function Row({ row, isMe, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className={cn(
        'flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/40 sm:px-5',
        isMe && 'bg-brand/[.07]'
      )}
    >
      <Medal rank={row.rank} />

      {row.avatar_url ? (
        <img src={row.avatar_url} alt="" className="h-9 w-9 flex-none rounded-full object-cover" />
      ) : (
        <span
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[12px] font-semibold text-muted-foreground"
          style={{ backgroundImage: 'repeating-linear-gradient(135deg,#232427 0 6px,#1b1c1f 6px 12px)' }}
        >
          {(row.name || '?').trim().charAt(0).toUpperCase()}
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] font-semibold text-foreground">
          {row.name || 'Photographer'}
          {isMe && <span className="ml-2 text-[11px] font-normal text-brand">you</span>}
        </span>
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {row.battles_played} {row.battles_played === 1 ? 'battle' : 'battles'}
          {row.wins > 0 && ` · ${row.wins} won`}
        </span>
      </div>

      <span className="flex-none font-mono text-[15px] font-semibold tabular-nums text-foreground">
        {row.points.toLocaleString()}
      </span>
    </button>
  );
}

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { currentUser } = useApp();

  const [scope, setScope]     = useState('month');
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async (which) => {
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('get_leaderboard', {
      p_scope: which,
      p_limit: 100,
    });
    if (rpcError) {
      setError(rpcError.message);
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(scope); }, [scope, load]);

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-24 pt-6 sm:px-6">

      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Leaderboard</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Points come from battles — 3 for entering, 10 more for winning.
        </p>
      </header>

      {/* Scope */}
      <div className="mb-4 flex gap-1 rounded-xl border border-border bg-card p-1">
        {SCOPES.map((s) => (
          <button
            key={s.id}
            onClick={() => setScope(s.id)}
            title={s.hint}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors',
              scope === s.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-[13px]">Loading standings…</span>
          </div>
        ) : error ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[13.5px] text-muted-foreground">
              The leaderboard could not load. {error}
            </p>
          </div>
        ) : rows.length === 0 ? (
          /* An honest empty state. No invented names, no placeholder ranks. */
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
            <p className="text-[14px] font-semibold text-foreground">
              {scope === 'month' ? 'No battles have finished this month yet' : 'No points awarded yet'}
            </p>
            <p className="max-w-[42ch] text-[13px] leading-relaxed text-muted-foreground">
              Upload a photograph and it enters a battle automatically. Once that
              battle closes, points appear here.
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="mt-1 rounded-full bg-primary px-5 py-2.5 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Upload a photograph
            </button>
          </div>
        ) : (
          rows.map((row) => (
            <Row
              key={row.user_id}
              row={row}
              isMe={row.user_id === currentUser?.id}
              onOpen={() => navigate(`/profile/${row.user_id}`)}
            />
          ))
        )}
      </div>

      {!loading && rows.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 px-1 font-mono text-[11px] text-muted-foreground">
          <Trophy className="h-3 w-3" />
          {scope === 'month'
            ? 'Recomputed from battles finished this month'
            : 'Running total since launch'}
          {' · '}
          equal points share a position
        </p>
      )}
    </div>
  );
}
