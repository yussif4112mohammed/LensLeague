import { useState } from 'react';
import BattleCard from '../../components/BattleCard/BattleCard';
import ProgressRing from '../../components/ProgressRing/ProgressRing';
import { useApp } from '../../context/AppContext';
import { Button } from '@/components/ui/button';
import { Trophy, Timer, ArrowRight, RefreshCcw } from 'lucide-react';

// The ring shows progress toward a session goal. The REAL limit is enforced
// server-side (battle_settings.daily_vote_cap, migration v15) - a number in the
// browser caps nothing, and this one previously reset to 0 on "Vote again".
const SESSION_GOAL = 20;

function formatAspectRatio(ratio) {
  if (!ratio) return null;
  const labels = { '9/16': '9:16 Portrait', '16/9': '16:9 Landscape', '1/1': '1:1 Square', '4/5': '4:5 Portrait' };
  return labels[ratio] || ratio;
}

export default function VotePage() {
  const { battles } = useApp();
  const [votedCount, setVotedCount]     = useState(0);
  // Tracked by battle ID, not by position.
  //
  // The old code pushed `currentIndex` - an index into the ALREADY FILTERED
  // `remaining` array - into a list that was then used to filter the ORIGINAL
  // `battles` array. Two different index spaces. After the first skip they
  // diverged, and each subsequent skip silently removed a different battle
  // than the one on screen.
  const [seenIds, setSeenIds] = useState([]);

  const remaining = battles.filter(b => !seenIds.includes(b.id));

  // Victory screen
  if (remaining.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 animate-in fade-in duration-700">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(255,255,255,0.15)]">
            <Trophy className="w-12 h-12 text-foreground" />
          </div>
          <h2 className="text-4xl font-black text-foreground mb-4 tracking-tight">You're on fire!</h2>
          <p className="text-lg text-muted-foreground mb-2">
            You voted on <strong className="text-foreground font-bold">{votedCount}</strong> battles today.
          </p>
          <p className="text-muted-foreground mb-8">Come back tomorrow for fresh matchups.</p>
          <Button
            onClick={() => { setVotedCount(0); setSeenIds([]); }}
            className="w-full h-12 bg-primary text-primary-foreground font-bold hover:bg-primary/90 text-lg shadow-[0_0_15px_rgba(255,255,255,0.2)]"
          >
            <RefreshCcw className="w-5 h-5 mr-2" />
            Vote again
          </Button>
        </div>
      </div>
    );
  }

  const battle = remaining[0];

  const handleVote = () => {
    setVotedCount(c => c + 1);
    // Let the card play its result animation, then retire this battle by id.
    setTimeout(() => setSeenIds(prev => [...prev, battle.id]), 900);
  };

  const handleSkip = () => {
    setSeenIds(prev => [...prev, battle.id]);
  };

  const ratioA = formatAspectRatio(battle.photoA.aspectRatio);
  const ratioB = formatAspectRatio(battle.photoB.aspectRatio);

  return (
    <div className="min-h-screen bg-black pb-24 relative flex flex-col items-center">
      
      {/* Header + progress ring */}
      <header className="w-full max-w-4xl px-4 py-6 flex items-center justify-between sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Vote</h1>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-1">
            Battle {seenIds.length + 1} of {seenIds.length + remaining.length}
          </p>
        </div>
        <ProgressRing
          progress={votedCount / SESSION_GOAL}
          size={60}
          strokeWidth={5}
          label={`${votedCount}`}
          sublabel={`/ ${SESSION_GOAL}`}
        />
      </header>

      <main className="w-full max-w-4xl px-4 py-8 animate-in fade-in slide-in-from-bottom-8 duration-500" key={battle.id}>
        
        {/* Battle meta */}
        <div className="flex flex-wrap items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-card rounded-md text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Category
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-muted" />
            <span className="text-lg font-bold text-foreground tracking-tight">{battle.category}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg text-sm font-semibold text-foreground">
            <Timer className="w-4 h-4 text-muted-foreground" />
            {battle.endsIn}
          </div>
        </div>

        {/* Aspect ratio labels */}
        {(ratioA || ratioB) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {ratioA && <span className="px-3 py-1 bg-card/50 border border-border rounded-full text-xs font-medium text-muted-foreground">📷 A: {ratioA}</span>}
            {ratioB && <span className="px-3 py-1 bg-card/50 border border-border rounded-full text-xs font-medium text-muted-foreground">📷 B: {ratioB}</span>}
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
              ✓ Full photos shown
            </span>
          </div>
        )}

        {/* The battle card */}
        <div className="mb-6">
          <BattleCard battle={battle} onVote={handleVote} onSkip={handleSkip} />
        </div>

        {/* Mobile Swipe / Tap instructions */}
        <div className="text-center mb-8">
          <span className="px-4 py-2 bg-card/40 border border-border/50 rounded-full text-xs font-medium text-muted-foreground inline-block">
            ☝️ Tap to vote now · Swipe up to skip
          </span>
        </div>

        {/* Skip */}
        <div className="flex justify-center">
          <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground hover:text-foreground hover:bg-card transition-colors">
            Skip this match
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </main>

      {/* Progress bar at bottom of screen */}
      <div className="fixed bottom-0 left-0 right-0 h-1.5 bg-card z-50">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${(seenIds.length / Math.max(1, seenIds.length + remaining.length)) * 100}%` }}
        />
      </div>
    </div>
  );
}
