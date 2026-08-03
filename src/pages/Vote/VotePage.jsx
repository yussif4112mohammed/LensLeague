import { useState } from 'react';
import BattleCard from '../../components/BattleCard/BattleCard';
import ProgressRing from '../../components/ProgressRing/ProgressRing';
import { useApp } from '../../context/AppContext';
import { Button } from '@/components/ui/button';
import { Trophy, Timer, ArrowRight, RefreshCcw } from 'lucide-react';

const TOTAL_DAILY = 20;

function formatAspectRatio(ratio) {
  if (!ratio) return null;
  const labels = { '9/16': '9:16 Portrait', '16/9': '16:9 Landscape', '1/1': '1:1 Square', '4/5': '4:5 Portrait' };
  return labels[ratio] || ratio;
}

export default function VotePage() {
  const { battles } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votedCount, setVotedCount]     = useState(0);
  const [skipped, setSkipped]           = useState([]);

  const remaining = battles.filter((_, i) => !skipped.includes(i));

  // Victory screen
  if (currentIndex >= remaining.length) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 animate-in fade-in duration-700">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(212,175,55,0.15)]">
            <Trophy className="w-12 h-12 text-gold" />
          </div>
          <h2 className="text-4xl font-black text-white mb-4 tracking-tight">You're on fire!</h2>
          <p className="text-lg text-zinc-400 mb-2">
            You voted on <strong className="text-gold font-bold">{votedCount}</strong> battles today.
          </p>
          <p className="text-zinc-500 mb-8">Come back tomorrow for fresh matchups.</p>
          <Button
            onClick={() => { setCurrentIndex(0); setVotedCount(0); setSkipped([]); }}
            className="w-full h-12 bg-primary text-primary-foreground font-bold hover:bg-primary/90 text-lg shadow-[0_0_15px_rgba(212,175,55,0.2)]"
          >
            <RefreshCcw className="w-5 h-5 mr-2" />
            Vote again
          </Button>
        </div>
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
    <div className="min-h-screen bg-black pb-24 relative flex flex-col items-center">
      
      {/* Header + progress ring */}
      <header className="w-full max-w-4xl px-4 py-6 flex items-center justify-between sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-zinc-900">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Vote</h1>
          <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest mt-1">
            Battle {currentIndex + 1} of {remaining.length}
          </p>
        </div>
        <ProgressRing
          progress={votedCount / TOTAL_DAILY}
          size={60}
          strokeWidth={5}
          label={`${votedCount}`}
          sublabel={`/ ${TOTAL_DAILY}`}
        />
      </header>

      <main className="w-full max-w-4xl px-4 py-8 animate-in fade-in slide-in-from-bottom-8 duration-500" key={battle.id}>
        
        {/* Battle meta */}
        <div className="flex flex-wrap items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-zinc-900 rounded-md text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Category
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
            <span className="text-lg font-bold text-gold tracking-tight">{battle.category}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-semibold text-zinc-300">
            <Timer className="w-4 h-4 text-zinc-500" />
            {battle.endsIn}
          </div>
        </div>

        {/* Aspect ratio labels */}
        {(ratioA || ratioB) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {ratioA && <span className="px-3 py-1 bg-zinc-900/50 border border-zinc-800 rounded-full text-xs font-medium text-zinc-400">📷 A: {ratioA}</span>}
            {ratioB && <span className="px-3 py-1 bg-zinc-900/50 border border-zinc-800 rounded-full text-xs font-medium text-zinc-400">📷 B: {ratioB}</span>}
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
          <span className="px-4 py-2 bg-zinc-900/40 border border-zinc-800/50 rounded-full text-xs font-medium text-zinc-500 inline-block">
            ☝️ Tap to vote now · Swipe up to skip
          </span>
        </div>

        {/* Skip */}
        <div className="flex justify-center">
          <Button variant="ghost" onClick={handleSkip} className="text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
            Skip this match
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </main>

      {/* Progress bar at bottom of screen */}
      <div className="fixed bottom-0 left-0 right-0 h-1.5 bg-zinc-900 z-50">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${(currentIndex / remaining.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
