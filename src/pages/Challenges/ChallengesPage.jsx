import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Trophy, Timer, CheckCircle2, Rocket, Medal } from 'lucide-react';

function Countdown({ endsAt }) {
  const [timeLeft, setTimeLeft] = useState(() => new Date(endsAt) - new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(endsAt) - new Date();
      setTimeLeft(diff);
      if (diff <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (timeLeft <= 0) return <span className="text-zinc-500 font-semibold">Ended</span>;

  const d = Math.floor(timeLeft / 86400000);
  const h = Math.floor((timeLeft % 86400000) / 3600000);
  const m = Math.floor((timeLeft % 3600000) / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="flex items-center gap-2 text-white font-mono bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-800">
      <Timer className="w-4 h-4 text-zinc-400" />
      {d > 0 && <span>{d}d</span>}
      <span>{h.toString().padStart(2, '0')}h</span>
      <span>{m.toString().padStart(2, '0')}m</span>
      <span className="text-zinc-400">{s.toString().padStart(2, '0')}s</span>
    </div>
  );
}

const MOCK_PORTFOLIO_PHOTOS = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=500&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=500&h=500&fit=crop&q=80',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=500&h=500&fit=crop&q=80'
];

export default function ChallengesPage() {
  const navigate = useNavigate();
  const { challenges, submissions, submitChallengeEntry } = useApp();
  
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const [entrySuccess, setEntrySuccess] = useState(false);

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const pastChallenges = challenges.filter(c => c.status === 'past');
  const featured = activeChallenges[0];

  const handleOpenEntry = (challenge) => {
    setSelectedChallenge(challenge);
    setSelectedPhoto(MOCK_PORTFOLIO_PHOTOS[0]);
    setEntrySuccess(false);
    setEntryModalOpen(true);
  };

  const handleConfirmSubmit = () => {
    if (!selectedPhoto) return;
    submitChallengeEntry(selectedChallenge.id, selectedPhoto);
    setEntrySuccess(true);
    setTimeout(() => {
      setEntryModalOpen(false);
      setSelectedChallenge(null);
      setSelectedPhoto('');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-black pb-24 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-zinc-900 px-4 py-6 md:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Challenges</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-zinc-900 border border-zinc-800 mb-8 p-1 rounded-xl">
            <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">
              Active Battles
            </TabsTrigger>
            <TabsTrigger value="past" className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white font-bold">
              Past Winners
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-12 focus:outline-none">
            
            {/* Featured Challenge */}
            {featured && (() => {
              const userSub = submissions.find(s => s.challengeId === featured.id);
              return (
                <div className="relative rounded-3xl overflow-hidden group shadow-2xl border border-zinc-800/50">
                  <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${featured.coverUrl})` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                  
                  <div className="relative p-6 md:p-10 flex flex-col justify-end min-h-[400px]">
                    <div className="mb-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 text-white text-xs font-bold uppercase tracking-widest rounded-full border border-white/30 backdrop-blur-md">
                        <Trophy className="w-3.5 h-3.5" />
                        Featured Challenge
                      </span>
                    </div>
                    
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">{featured.title}</h2>
                    <p className="text-lg text-zinc-300 mb-6 max-w-2xl">{featured.theme}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 mb-8">
                      <Countdown endsAt={featured.endsAt} />
                      <div className="px-3 py-1.5 bg-zinc-900/60 backdrop-blur-md rounded-lg text-sm font-medium text-zinc-300 border border-zinc-800">
                        {featured.entries.toLocaleString()} entries
                      </div>
                      <div className="px-3 py-1.5 bg-zinc-900/60 backdrop-blur-md rounded-lg text-sm font-bold text-white border border-white/20">
                        +{featured.prizePoints.toLocaleString()} pts
                      </div>
                    </div>

                    {userSub ? (
                      <div className="flex items-center gap-4 bg-zinc-900/80 backdrop-blur-md border border-zinc-700 p-2 pr-6 rounded-2xl w-fit">
                        <img src={userSub.photoUrl} alt="Your entry" className="w-12 h-12 rounded-xl object-cover" />
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                          <CheckCircle2 className="w-5 h-5" />
                          Entered Submission
                        </div>
                      </div>
                    ) : (
                      <Button 
                        size="lg" 
                        onClick={() => handleOpenEntry(featured)} 
                        className="w-full md:w-auto bg-primary text-primary-foreground font-black text-lg h-14 px-8 rounded-xl hover:bg-primary/90 shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all"
                      >
                        Enter Challenge
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Other Active Challenges */}
            {activeChallenges.length > 1 && (
              <div>
                <h3 className="text-xl font-bold text-white mb-6">More Challenges</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeChallenges.slice(1).map(ch => {
                    const userSub = submissions.find(s => s.challengeId === ch.id);
                    return (
                      <div key={ch.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors group flex flex-col">
                        <div className="relative h-48 overflow-hidden">
                          <img src={ch.coverUrl} alt={ch.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                            <span className="text-white font-bold text-sm drop-shadow-md">+{ch.prizePoints.toLocaleString()} pts</span>
                            <span className="text-xs font-medium text-white/90">{ch.entries} entries</span>
                          </div>
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <h4 className="font-bold text-lg text-white mb-4 line-clamp-1">{ch.title}</h4>
                          <div className="mb-6"><Countdown endsAt={ch.endsAt} /></div>
                          
                          <div className="mt-auto">
                            {userSub ? (
                              <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-2 rounded-xl">
                                <img src={userSub.photoUrl} alt="Entry" className="w-8 h-8 rounded-lg object-cover" />
                                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Submitted</span>
                              </div>
                            ) : (
                              <Button variant="outline" className="w-full border-zinc-700 text-white hover:bg-zinc-800" onClick={() => handleOpenEntry(ch)}>
                                Enter Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-12 focus:outline-none">
            {pastChallenges.map(ch => (
              <div key={ch.id} className="mb-12">
                <h3 className="text-2xl font-bold text-white mb-6 border-b border-zinc-800 pb-4">{ch.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {ch.winners.map(w => (
                    <div key={w.rank} className="relative group cursor-pointer" onClick={() => navigate(`/profile/${w.photographerId}`)}>
                      <div className="absolute -top-3 -left-3 z-10 w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg border-2 border-black" style={{
                        background: w.rank === 1 ? 'linear-gradient(135deg, #FFFFFF, #FFFFFF)' : w.rank === 2 ? 'linear-gradient(135deg, #E0E0E0, #9E9E9E)' : 'linear-gradient(135deg, #FFFFFF, #A0522D)'
                      }}>
                        {w.rank === 1 ? '🥇' : w.rank === 2 ? '🥈' : '🥉'}
                      </div>
                      <div className="rounded-2xl overflow-hidden border-2 border-zinc-800 group-hover:border-zinc-600 transition-colors">
                        <img src={w.photoUrl} alt={`Winner by ${w.photographerName}`} className="w-full aspect-square object-cover" />
                        <div className="p-4 bg-zinc-900 flex items-center gap-3">
                          <Avatar className="w-8 h-8 border border-zinc-700">
                            <AvatarImage src={w.photographerAvatar} />
                            <AvatarFallback className="bg-zinc-800">{w.photographerName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-sm text-white">{w.photographerName}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

        </Tabs>
      </div>

      {/* Entry Modal */}
      <Dialog open={entryModalOpen} onOpenChange={setEntryModalOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-white sm:max-w-md">
          {entrySuccess ? (
            <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
                <Rocket className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-black mb-2">Entry Submitted!</h2>
              <p className="text-zinc-400">Your photo has been entered into the arena. Good luck climbing the ranks!</p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Submit to Challenge</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Select a photo from your portfolio to enter into <strong className="text-white">{selectedChallenge?.title}</strong>.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-3 gap-3 py-4">
                {MOCK_PORTFOLIO_PHOTOS.map((url, i) => (
                  <div 
                    key={i} 
                    onClick={() => setSelectedPhoto(url)}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                      selectedPhoto === url ? 'border-primary shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-transparent hover:border-zinc-700'
                    }`}
                  >
                    <img src={url} alt={`Option ${i}`} className="w-full h-full object-cover" />
                    {selectedPhoto === url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-black shadow-lg">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setEntryModalOpen(false)} className="border-zinc-700 text-white hover:bg-zinc-800">
                  Cancel
                </Button>
                <Button onClick={handleConfirmSubmit} className="bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                  Confirm Submission
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
