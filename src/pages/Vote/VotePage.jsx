import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BattleCard from '../../components/BattleCard/BattleCard';
import ProgressRing from '../../components/ProgressRing/ProgressRing';
import { useApp } from '../../context/AppContext';
import { ratioLabel } from '@/lib/photoMeta';
import { Button } from '@/components/ui/button';
import { Trophy, Timer, ArrowRight, RefreshCcw, Swords, Upload } from 'lucide-react';

// The ring shows progress toward a session goal. The REAL limit is enforced
// server-side (battle_settings.daily_vote_cap, migration v15) - a number in the
// browser caps nothing, and this one previously reset to 0 on "Vote again".
const SESSION_GOAL = 20;

// The shape a photograph was actually shot in, read from the pixels measured at
// upload. The lookup table that stood here mapped four hardcoded strings to
// labels, and since every photo in the product carried the same invented '3/4',
// it never matched and never rendered.
function shapeOf(photo) {
  return ratioLabel(photo?.width, photo?.height);
}

/**
 * Shared frame for the three states in which there is nothing to vote on.
 * One shape, so they cannot drift apart visually as the copy changes.
 */
function Interstitial({ icon: Icon, title, children, action }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10 animate-in fade-in duration-500">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-full border border-border bg-card sm:h-24 sm:w-24">
          <Icon className="h-9 w-9 text-foreground sm:h-11 sm:w-11" strokeWidth={1.5} />
        </div>
        <h2 className="mb-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        <div className="mb-8 space-y-2 text-[15px] leading-relaxed text-muted-foreground">
          {children}
        </div>
        {action}
      </div>
    </div>
  );
}

export default function VotePage() {
  const { battles, currentUser } = useApp();
  const navigate = useNavigate();
  const [votedCount, setVotedCount] = useState(0);
  // Tracked by battle ID, not by position.
  //
  // The old code pushed `currentIndex` - an index into the ALREADY FILTERED
  // `remaining` array - into a list that was then used to filter the ORIGINAL
  // `battles` array. Two different index spaces. After the first skip they
  // diverged, and each subsequent skip silently removed a different battle
  // than the one on screen.
  const [seenIds, setSeenIds] = useState([]);

  const remaining = battles.filter(b => !seenIds.includes(b.id));

  // ── NOTHING TO VOTE ON AT ALL ──────────────────────────────────────────────
  // Distinct from "you have been through them", and it used to be conflated
  // with it: a user who had never voted on anything was congratulated with
  // "You're on fire! You voted on 0 battles today." Since the platform has no
  // battles yet, that is what every single person saw. An empty product should
  // say it is empty and what to do about it.
  if (battles.length === 0) {
    return (
      <Interstitial
        icon={Swords}
        title="No battles yet"
        action={
          <Button
            onClick={() => navigate('/upload')}
            className="h-12 w-full font-bold sm:w-auto sm:px-8"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload a photograph
          </Button>
        }
      >
        <p>
          A battle pairs two photographs from the same category and lets other
          photographers decide. There are none running right now.
        </p>
        <p>
          {currentUser
            ? 'Upload something and it enters one automatically — no extra step.'
            : 'Sign in and upload something to start one.'}
        </p>
      </Interstitial>
    );
  }

  // ── SEEN EVERYTHING AVAILABLE ──────────────────────────────────────────────
  if (remaining.length === 0) {
    const votedSomething = votedCount > 0;
    return (
      <Interstitial
        icon={votedSomething ? Trophy : RefreshCcw}
        title={votedSomething ? 'That is all for now' : 'You skipped them all'}
        action={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              onClick={() => { setVotedCount(0); setSeenIds([]); }}
              className="h-12 font-bold sm:px-8"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Go through them again
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/feed')}
              className="h-12 sm:px-6"
            >
              Back to the feed
            </Button>
          </div>
        }
      >
        {votedSomething ? (
          <p>
            You voted on <strong className="font-bold text-foreground">{votedCount}</strong>
            {votedCount === 1 ? ' battle' : ' battles'}. New matchups appear as
            photographers upload.
          </p>
        ) : (
          <p>
            You passed on every open battle. They are still running — come back
            when you want to weigh in.
          </p>
        )}
      </Interstitial>
    );
  }

  const battle = remaining[0];
  const total = seenIds.length + remaining.length;

  const handleVote = () => {
    setVotedCount(c => c + 1);
    // Let the card play its result animation, then retire this battle by id.
    setTimeout(() => setSeenIds(prev => [...prev, battle.id]), 900);
  };

  const handleSkip = () => {
    setSeenIds(prev => [...prev, battle.id]);
  };

  const ratioA = shapeOf(battle.photoA);
  const ratioB = shapeOf(battle.photoB);

  return (
    // No background of its own: the shell already paints bg-background, and the
    // hardcoded bg-black here made this the one page that ignored the theme
    // tokens. No bottom padding either - the shell's scroll container owns that,
    // and adding more just pushed content under the mobile nav differently.
    <div className="flex w-full flex-col items-center">

      {/* Header. The progress bar lives here rather than pinned to the bottom of
          the viewport: the mobile nav is also fixed at bottom-0 with z-50, so the
          old bar was drawn into the same space. Anchoring it under the header
          removes the collision without magic offsets that break the moment the
          nav's height changes. */}
      <header className="sticky top-0 z-30 w-full max-w-4xl border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-6">
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">Vote</h1>
            <p className="mt-1 truncate text-[11px] font-medium uppercase tracking-widest text-muted-foreground sm:text-sm">
              Battle {seenIds.length + 1} of {total}
            </p>
          </div>
          <ProgressRing
            progress={Math.min(votedCount / SESSION_GOAL, 1)}
            size={56}
            strokeWidth={5}
            label={`${votedCount}`}
            sublabel={`/ ${SESSION_GOAL}`}
          />
        </div>
        <div className="h-1 w-full bg-card">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${(seenIds.length / Math.max(1, total)) * 100}%` }}
          />
        </div>
      </header>

      <main
        key={battle.id}
        className="w-full max-w-4xl px-4 py-6 animate-in fade-in slide-in-from-bottom-8 duration-500 sm:px-6 sm:py-8"
      >
        {/* Battle meta. Wraps rather than overflowing: a long category name on a
            narrow phone used to push the timer off the edge. */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="rounded-md bg-card px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:px-3 sm:text-xs">
              Category
            </span>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
            <span className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">
              {battle.category}
            </span>
          </div>
          {battle.endsIn && (
            <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground">
              <Timer className="h-4 w-4 text-muted-foreground" />
              {battle.endsIn}
            </div>
          )}
        </div>

        {/* Aspect ratios. Worth saying out loud on a photography platform: the
            frame is shown as it was shot, not cropped to fit the layout. */}
        {(ratioA || ratioB) && (
          <div className="mb-5 flex flex-wrap gap-2 sm:mb-6">
            {ratioA && (
              <span className="rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                A: {ratioA}
              </span>
            )}
            {ratioB && (
              <span className="rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                B: {ratioB}
              </span>
            )}
            <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Shown uncropped
            </span>
          </div>
        )}

        <div className="mb-5 sm:mb-6">
          <BattleCard battle={battle} onVote={handleVote} onSkip={handleSkip} />
        </div>

        {/* Touch hint on touch devices only — it is meaningless with a mouse. */}
        <div className="mb-6 text-center sm:hidden">
          <span className="inline-block rounded-full border border-border/50 bg-card/40 px-4 py-2 text-xs font-medium text-muted-foreground">
            Tap to vote · swipe up to skip
          </span>
        </div>

        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="h-11 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            Skip this match
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
