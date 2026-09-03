import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../context/AppContext';
import { describeStyle } from '../../lib/photography';
import {
  Loader2, Trophy, Camera, Heart, MessageCircle, Swords, Minus, ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Your month.
 *
 * REPLACES a page where every headline figure was a string literal:
 *   '14,820' profile views · '3,241' votes · '87' wins · '4.97 ★' rating
 *   plus a "12-day upload streak" and an audience split of US 28% / UK 18%.
 * The 7D / 30D / All-Time tabs set a useState that nothing read, so the numbers
 * never moved. It was labelled "Your Analytics" and a photographer had no way
 * to tell any of it was invented.
 *
 * Everything below is counted by get_my_wrap() (migration v17).
 *
 * DELIBERATELY MISSING: profile views, audience by country, and a star rating.
 * Nothing records views or viewer location, and there is no reviews table, so
 * there is no honest number to show. An empty space beats a confident lie.
 */

function monthLabel(d) {
  return new Date(d).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** A counted figure. `hint` explains where it comes from, so nothing is mysterious. */
function Stat({ icon: Icon, label, value, hint, accent }) {
  const empty = value === null || value === undefined;
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <span className={cn(
        'font-mono text-2xl font-bold tabular-nums',
        empty ? 'text-muted-foreground/40' : accent ? 'text-brand' : 'text-foreground'
      )}>
        {empty ? '—' : value}
      </span>
      {hint && <span className="text-[11px] leading-snug text-muted-foreground">{hint}</span>}
    </div>
  );
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { currentUser } = useApp();

  const [wrap, setWrap]       = useState(null);
  const [platform, setPlatform] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    const [wrapRes, statsRes, histRes] = await Promise.all([
      supabase.rpc('get_my_wrap'),
      supabase.rpc('get_month_stats'),
      supabase.rpc('get_my_battle_history', { p_limit: 10 }),
    ]);

    if (wrapRes.error) setError(wrapRes.error.message);
    else setWrap(wrapRes.data?.[0] || null);

    if (!statsRes.error) setPlatform(statsRes.data?.[0] || null);
    if (!histRes.error)  setHistory(histRes.data || []);

    setLoading(false);
  }, []);

  useEffect(() => { if (currentUser?.id) load(); else setLoading(false); }, [currentUser?.id, load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-[13px]">Counting your month…</span>
      </div>
    );
  }

  if (!currentUser?.id) {
    return (
      <div className="mx-auto max-w-[560px] px-5 py-24 text-center">
        <p className="text-[14px] text-muted-foreground">Sign in to see your month.</p>
      </div>
    );
  }

  const nothingYet =
    wrap && wrap.photos_uploaded === 0 && wrap.battles_entered === 0;

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 pb-24 pt-6 sm:px-6">

      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand">
          {wrap ? monthLabel(wrap.month_start) : monthLabel(new Date())}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Your month</h1>
        <p className="mt-1 max-w-[58ch] text-[13.5px] leading-relaxed text-muted-foreground">
          Counted from your uploads and finished battles. Nothing here is estimated.
        </p>
      </header>

      {error && (
        <div className="mb-5 rounded-xl border border-border bg-card p-4">
          <p className="text-[13px] text-muted-foreground">Could not load your month. {error}</p>
        </div>
      )}

      {nothingYet ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <Camera className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
          <p className="text-[14px] font-semibold text-foreground">Nothing to count yet this month</p>
          <p className="max-w-[44ch] text-[13px] leading-relaxed text-muted-foreground">
            Upload a photograph and it enters a battle automatically. Your figures
            appear here as battles finish.
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="mt-1 rounded-full bg-primary px-5 py-2.5 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Upload a photograph
          </button>
        </div>
      ) : wrap && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat icon={Camera}  label="Uploaded"  value={wrap.photos_uploaded}
                  hint="photographs this month" />
            <Stat icon={Swords}  label="Battles"   value={wrap.battles_entered}
                  hint="entered and finished" />
            <Stat icon={Trophy}  label="Won"       value={wrap.battles_won} accent
                  hint={wrap.battles_tied > 0 ? `${wrap.battles_tied} tied` : 'decided in your favour'} />
            <Stat icon={ArrowUpRight} label="Points" value={wrap.points_earned?.toLocaleString()} accent
                  hint="3 per battle, 10 per win" />
            <Stat icon={Heart}   label="Likes"     value={wrap.likes_received}
                  hint="on your work this month" />
            <Stat icon={MessageCircle} label="Comments" value={wrap.comments_received}
                  hint="left on your work" />
          </div>

          {/* Win rate is null, not zero, when nothing has been decided —
              zero would read as "you lost everything". */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Win rate
              </span>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">
                {wrap.win_rate === null ? '—' : `${wrap.win_rate}%`}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {wrap.battles_entered > 0
                  ? `${wrap.battles_won} of ${wrap.battles_entered} decided battles`
                  : 'no battles finished yet'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                What you shot most
              </span>
              <p className="mt-1 text-[15px] font-semibold text-foreground">
                {describeStyle({ category: wrap.top_category, personalStyle: wrap.top_style }) || '—'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {wrap.top_category ? 'your most-uploaded category this month' : 'nothing uploaded yet'}
              </p>
            </div>
          </div>

          {history.length > 0 && (
            <section className="mt-7">
              <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recent battles
              </h2>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                {history.map((b) => (
                  <div key={b.battle_id}
                       className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                    <span className={cn(
                      'flex h-7 w-7 flex-none items-center justify-center rounded-full',
                      b.i_won ? 'bg-brand/20 text-brand'
                      : b.outcome === 'tie' ? 'bg-muted text-muted-foreground'
                      : 'bg-muted/60 text-muted-foreground'
                    )}>
                      {b.i_won ? <Trophy className="h-3.5 w-3.5" />
                               : <Minus className="h-3.5 w-3.5" />}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[13.5px] font-medium text-foreground">
                        {b.i_won ? 'Won' : b.outcome === 'tie' ? 'Tied' : 'Not this time'}
                        <span className="ml-2 text-[12px] font-normal text-muted-foreground">
                          {b.category}
                        </span>
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {b.my_votes}–{b.their_votes} votes ·{' '}
                        {new Date(b.finalized_at).toLocaleDateString(undefined,
                          { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 px-1 text-[11px] text-muted-foreground">
                Your own record. Losses are never shown on your public profile.
              </p>
            </section>
          )}
        </>
      )}

      {/* Platform-wide, so a quiet month for you still shows the place is alive. */}
      {platform && (
        <section className="mt-8 rounded-xl border border-border bg-card p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            LensLeague this month
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-foreground">
            {platform.photographers > 0 ? (
              <>
                <strong className="font-mono tabular-nums">{platform.photographers}</strong>
                {platform.photographers === 1 ? ' photographer' : ' photographers'} uploaded{' '}
                <strong className="font-mono tabular-nums">{platform.photos_uploaded}</strong>
                {platform.photos_uploaded === 1 ? ' photograph' : ' photographs'},{' '}
                <strong className="font-mono tabular-nums">{platform.battles_completed}</strong>
                {platform.battles_completed === 1 ? ' battle' : ' battles'} finished, and{' '}
                <strong className="font-mono tabular-nums">{platform.votes_cast}</strong>
                {platform.votes_cast === 1 ? ' vote was' : ' votes were'} cast.
              </>
            ) : (
              'No uploads yet this month. Be the first.'
            )}
          </p>
        </section>
      )}
    </div>
  );
}
