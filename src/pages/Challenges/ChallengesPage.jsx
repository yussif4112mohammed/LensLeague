import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Trophy, Timer, CheckCircle2, Rocket, Medal, Image as ImageIcon, Camera } from 'lucide-react';

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

  if (timeLeft <= 0) return <span className="text-muted-foreground font-semibold">Ended</span>;

  const d = Math.floor(timeLeft / 86400000);
  const h = Math.floor((timeLeft % 86400000) / 3600000);
  const m = Math.floor((timeLeft % 3600000) / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="flex items-center gap-2 text-foreground font-mono bg-card/80 px-3 py-1.5 rounded-lg border border-border transition-all hover:border-border">
      <Timer className="w-4 h-4 text-muted-foreground" />
      {d > 0 && <span>{d}d</span>}
      <span>{h.toString().padStart(2, '0')}h</span>
      <span>{m.toString().padStart(2, '0')}m</span>
      <span className="text-muted-foreground">{s.toString().padStart(2, '0')}s</span>
    </div>
  );
}

export default function ChallengesPage() {
  const navigate = useNavigate();
  const { challenges = [], submissions = [], submitChallengeEntry, currentUser } = useApp();
  
  const [isLoading, setIsLoading] = useState(true);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const [entrySuccess, setEntrySuccess] = useState(false);

  useEffect(() => {
    // Simulate premium loading state
    const t = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const pastChallenges = challenges.filter(c => c.status === 'past');
  const featured = activeChallenges[0];
  
  const portfolioPhotos = currentUser?.portfolio || [];

  const handleOpenEntry = (challenge) => {
    setSelectedChallenge(challenge);
    setSelectedPhoto('');
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
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-border px-4 py-6 md:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground transition-all hover:scale-[1.02]">Challenges</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-card border border-border mb-8 p-1 rounded-xl">
            <TabsTrigger value="active" className="rounded-lg data-[active]:bg-primary data-[active]:text-primary-foreground font-bold transition-all active:scale-95">
              Active Battles
            </TabsTrigger>
            <TabsTrigger value="past" className="rounded-lg data-[active]:bg-muted data-[active]:text-foreground font-bold transition-all active:scale-95">
              Past Winners
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-12 focus:outline-none">
            {isLoading ? (
              <div className="space-y-6">
                <div className="h-[400px] bg-card/50 rounded-3xl animate-pulse border border-border/50" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-[300px] bg-card/50 rounded-2xl animate-pulse border border-border/50" />
                  ))}
                </div>
              </div>
            ) : activeChallenges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-dashed border-border rounded-3xl bg-card/20">
                <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center mb-6">
                  <Trophy className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">No Active Challenges</h3>
                <p className="text-muted-foreground max-w-md mb-8">
                  There are currently no active photo battles. Check back later to compete and win points!
                </p>
                <Button variant="outline" className="border-border text-foreground hover:bg-muted transition-all hover:scale-[1.02] active:scale-95" onClick={() => navigate('/')}>
                  Explore Top Photos
                </Button>
              </div>
            ) : (
              <>
                {/* Featured Challenge */}
                {featured && (() => {
                  const userSub = submissions.find(s => s.challengeId === featured.id);
                  return (
                    <div className="relative rounded-3xl overflow-hidden group shadow-2xl border border-border/50 transition-all hover:-translate-y-1 hover:shadow-primary/10">
                      <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.03]" style={{ backgroundImage: `url(${featured.coverUrl})` }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                      
                      <div className="relative p-6 md:p-10 flex flex-col justify-end min-h-[400px]">
                        <div className="mb-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 text-foreground text-xs font-bold uppercase tracking-widest rounded-full border border-white/30 backdrop-blur-md">
                            <Trophy className="w-3.5 h-3.5" />
                            Featured Challenge
                          </span>
                        </div>
                        
                        <h2 className="text-3xl md:text-5xl font-black text-foreground tracking-tight mb-2">{featured.title}</h2>
                        <p className="text-lg text-foreground mb-6 max-w-2xl">{featured.theme}</p>
                        
                        <div className="flex flex-wrap items-center gap-4 mb-8">
                          <Countdown endsAt={featured.endsAt} />
                          <div className="px-3 py-1.5 bg-card/60 backdrop-blur-md rounded-lg text-sm font-medium text-foreground border border-border transition-colors hover:border-border">
                            {featured.entries.toLocaleString()} entries
                          </div>
                          <div className="px-3 py-1.5 bg-card/60 backdrop-blur-md rounded-lg text-sm font-bold text-foreground border border-white/20 transition-colors hover:border-white/40">
                            +{featured.prizePoints.toLocaleString()} pts
                          </div>
                        </div>

                        {userSub ? (
                          <div className="flex items-center gap-4 bg-card/80 backdrop-blur-md border border-border p-2 pr-6 rounded-2xl w-fit transition-all hover:scale-[1.02]">
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
                            className="w-full md:w-auto bg-primary text-primary-foreground font-black text-lg h-14 px-8 rounded-xl hover:bg-primary/90 shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:scale-[1.02] active:scale-95"
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
                    <h3 className="text-xl font-bold text-foreground mb-6">More Challenges</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {activeChallenges.slice(1).map(ch => {
                        const userSub = submissions.find(s => s.challengeId === ch.id);
                        return (
                          <div key={ch.id} className="bg-card/40 border border-border rounded-2xl overflow-hidden hover:border-border transition-all hover:-translate-y-1 hover:shadow-xl group flex flex-col">
                            <div className="relative h-48 overflow-hidden">
                              <img src={ch.coverUrl} alt={ch.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                                <span className="text-foreground font-bold text-sm drop-shadow-md">+{ch.prizePoints.toLocaleString()} pts</span>
                                <span className="text-xs font-medium text-white/90">{ch.entries} entries</span>
                              </div>
                            </div>
                            <div className="p-5 flex flex-col flex-1">
                              <h4 className="font-bold text-lg text-foreground mb-4 line-clamp-1">{ch.title}</h4>
                              <div className="mb-6"><Countdown endsAt={ch.endsAt} /></div>
                              
                              <div className="mt-auto">
                                {userSub ? (
                                  <div className="flex items-center gap-3 bg-card border border-border p-2 rounded-xl transition-all hover:scale-[1.02]">
                                    <img src={userSub.photoUrl} alt="Entry" className="w-8 h-8 rounded-lg object-cover" />
                                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Submitted</span>
                                  </div>
                                ) : (
                                  <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted transition-all active:scale-95" onClick={() => handleOpenEntry(ch)}>
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
              </>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-12 focus:outline-none">
            {isLoading ? (
              <div className="space-y-12">
                {[1, 2].map(i => (
                  <div key={i}>
                    <div className="h-8 w-64 bg-card animate-pulse rounded mb-6" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[1, 2, 3].map(j => (
                        <div key={j} className="h-64 bg-card/50 rounded-2xl animate-pulse border border-border/50" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : pastChallenges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-dashed border-border rounded-3xl bg-card/20">
                <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center mb-6">
                  <Medal className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">No Past Winners Yet</h3>
                <p className="text-muted-foreground max-w-md">
                  Once challenges conclude, the winning photos will be displayed here in all their glory.
                </p>
              </div>
            ) : (
              pastChallenges.map(ch => (
                <div key={ch.id} className="mb-12">
                  <h3 className="text-2xl font-bold text-foreground mb-6 border-b border-border pb-4">{ch.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {ch.winners.map(w => (
                      <div key={w.rank} className="relative group cursor-pointer transition-all hover:-translate-y-1 hover:scale-[1.02]" onClick={() => navigate(`/profile/${w.photographerId}`)}>
                        <div className="absolute -top-3 -left-3 z-10 w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg border-2 border-border transition-transform group-hover:scale-110" style={{
                          background: w.rank === 1 ? 'linear-gradient(135deg, #FFFFFF, #FFFFFF)' : w.rank === 2 ? 'linear-gradient(135deg, #E0E0E0, #9E9E9E)' : 'linear-gradient(135deg, #FFFFFF, #A0522D)'
                        }}>
                          {w.rank === 1 ? '🥇' : w.rank === 2 ? '🥈' : '🥉'}
                        </div>
                        <div className="rounded-2xl overflow-hidden border-2 border-border group-hover:border-border transition-colors shadow-lg">
                          <img src={w.photoUrl} alt={`Winner by ${w.photographerName}`} className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-105" />
                          <div className="p-4 bg-card flex items-center gap-3">
                            <Avatar className="w-8 h-8 border border-border">
                              <AvatarImage src={w.photographerAvatar} />
                              <AvatarFallback className="bg-muted">{w.photographerName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-sm text-foreground">{w.photographerName}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

        </Tabs>
      </div>

      {/* Entry Modal */}
      <Dialog open={entryModalOpen} onOpenChange={setEntryModalOpen}>
        <DialogContent className="bg-background border border-border text-foreground sm:max-w-md">
          {entrySuccess ? (
            <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
                <Rocket className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-black mb-2">Entry Submitted!</h2>
              <p className="text-muted-foreground">Your photo has been entered into the arena. Good luck climbing the ranks!</p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Submit to Challenge</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Select a photo from your portfolio to enter into <strong className="text-foreground">{selectedChallenge?.title}</strong>.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                {portfolioPhotos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border rounded-xl bg-card/30">
                    <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
                    <h4 className="text-lg font-bold text-foreground mb-2">Your portfolio is empty</h4>
                    <p className="text-sm text-muted-foreground mb-6">Upload photos to your portfolio to compete in challenges.</p>
                    <Button onClick={() => navigate('/upload')} className="bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-95">
                      <Camera className="w-4 h-4 mr-2" />
                      Upload Photo
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 max-h-[40vh] overflow-y-auto pr-2">
                    {portfolioPhotos.map((url, i) => (
                      <div 
                        key={i} 
                        onClick={() => setSelectedPhoto(url)}
                        className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all hover:scale-[1.02] ${
                          selectedPhoto === url ? 'border-primary shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-[1.02]' : 'border-transparent hover:border-border'
                        }`}
                      >
                        <img src={url} alt={`Option ${i}`} className="w-full h-full object-cover" />
                        {selectedPhoto === url && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center animate-in fade-in duration-200">
                            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-foreground shadow-lg">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setEntryModalOpen(false)} className="border-border text-foreground hover:bg-muted transition-all active:scale-95">
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmSubmit} 
                  disabled={!selectedPhoto}
                  className="bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95"
                >
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
