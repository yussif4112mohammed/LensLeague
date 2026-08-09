import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  Eye,
  Heart,
  Users,
  Award,
  BarChart3,
  ArrowUpRight,
  ChevronRight,
  X,
  Camera,
  Trophy,
  Star,
  Crown,
  Share
} from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const PERIOD_OPTS = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: 'All Time', value: 'all' },
];

const STATS = [
  { label: 'Profile Views', value: '14,820', delta: '+18%', sparkline: [30, 45, 38, 60, 72, 55, 80], icon: Eye },
  { label: 'Votes Received', value: '3,241', delta: '+24%', sparkline: [20, 35, 42, 38, 55, 70, 65], icon: Heart },
  { label: 'Competition Wins', value: '87', delta: '+3 this month', sparkline: [2, 3, 1, 4, 2, 3, 5], icon: Trophy },
  { label: 'Follower Growth', value: '+842', delta: '+12% this week', sparkline: [60, 80, 100, 120, 90, 110, 150], icon: Users },
  { label: 'Booking Requests', value: '34', delta: '+8 this month', sparkline: [4, 6, 3, 8, 5, 7, 6], icon: ArrowUpRight },
  { label: 'Avg. Rating', value: '4.97 ★', delta: 'Stable', sparkline: [4.8, 4.9, 4.85, 4.95, 4.9, 4.97, 4.97], icon: Star },
];

function MiniSparkline({ data }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 32;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline 
        points={points} 
        fill="none" 
        stroke="url(#gradient)" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="drop-shadow-[0_2px_4px_rgba(255,255,255,0.2)]"
      />
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#71717a" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function AnalyticsPage() {
  const { currentUser, photos } = useApp();
  const ME = currentUser || { name: 'You', avatar: 'https://ui-avatars.com/api/?name=You', globalRank: 42 };
  
  const TOP_PHOTOS = photos.slice(0, 5).map((p, i) => ({
    id: p.id, url: p.url,
    votes: p.likes || [4780, 3420, 3120, 2810, 2340][i] || 100,
    category: p.category,
  }));

  const [period, setPeriod] = useState('30d');
  const [showWrapped, setShowWrapped] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scorecardShared, setScorecardShared] = useState(false);

  useEffect(() => {
    if (!showWrapped) return;

    if (currentSlide < 4) {
      const timer = setTimeout(() => {
        setCurrentSlide(prev => prev + 1);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showWrapped, currentSlide]);

  const handleOpenWrapped = () => {
    setCurrentSlide(0);
    setScorecardShared(false);
    setShowWrapped(true);
  };

  const handleCloseWrapped = () => {
    setShowWrapped(false);
    setCurrentSlide(0);
  };

  const handleNextSlide = () => {
    if (currentSlide < 4) setCurrentSlide(prev => prev + 1);
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) setCurrentSlide(prev => prev - 1);
  };

  const handleShareScorecard = () => {
    setScorecardShared(true);
    setTimeout(() => setScorecardShared(false), 2500);
  };

  return (
    <div className="min-h-screen bg-background text-white pb-20 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-zinc-400" />
              Your Analytics
            </h1>
            <p className="text-zinc-400 text-lg">Track your growth and performance.</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Button 
              onClick={handleOpenWrapped} 
              id="wrapped-btn"
              className="bg-gradient-to-r from-zinc-800 to-zinc-900 border border-zinc-700 hover:border-zinc-500 text-white h-14 px-6 rounded-2xl shadow-lg relative overflow-hidden group transition-all duration-300 w-full md:w-auto flex items-center gap-4"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <div className="bg-white/10 p-2 rounded-xl">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-sm leading-tight">July Wrapped</div>
                <div className="text-xs text-zinc-400">Tap to view</div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            </Button>
          </div>
        </div>

        {/* Period Tabs */}
        <Tabs value={period} onValueChange={setPeriod} className="w-full md:w-auto">
          <TabsList className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-1 h-12">
            {PERIOD_OPTS.map(opt => (
              <TabsTrigger 
                key={opt.value} 
                value={opt.value}
                className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:text-black font-medium transition-all h-full"
              >
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STATS.map(s => {
            const Icon = s.icon;
            const isPositive = s.delta.startsWith('+');
            return (
              <Card key={s.label} className="bg-zinc-900/50 border-zinc-800/50 rounded-2xl hover:bg-zinc-900/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {s.label}
                  </CardTitle>
                  <MiniSparkline data={s.sparkline} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white tracking-tight">{s.value}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={cn(
                      "bg-transparent rounded-lg font-medium border-0 px-0",
                      isPositive ? "text-emerald-400" : "text-zinc-500"
                    )}>
                      {isPositive && <TrendingUp className="w-3 h-3 mr-1" />}
                      {s.delta}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Performing Work */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-zinc-400" />
              Top Performing Work
            </h2>
            <Card className="bg-zinc-900/50 border-zinc-800/50 rounded-2xl overflow-hidden">
              <div className="divide-y divide-zinc-800/50">
                {TOP_PHOTOS.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-zinc-800/20 transition-colors group">
                    <div className="w-8 text-center font-bold text-zinc-500">#{i + 1}</div>
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 relative">
                      <img src={p.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">{p.category}</div>
                      <div className="text-sm text-zinc-400 flex items-center gap-1.5 mt-1">
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                        {p.votes.toLocaleString()} votes
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="hidden sm:flex bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg">
                      + Portfolio
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Audience */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-zinc-400" />
              Audience
            </h2>
            <Card className="bg-zinc-900/50 border-zinc-800/50 rounded-2xl p-6">
              <div className="space-y-6">
                {[
                  { country: 'United States', pct: 28, flag: '🇺🇸' },
                  { country: 'United Kingdom', pct: 18, flag: '🇬🇧' },
                  { country: 'Japan', pct: 15, flag: '🇯🇵' },
                  { country: 'Australia', pct: 11, flag: '🇦🇺' },
                  { country: 'Other', pct: 28, flag: '🌍' },
                ].map(a => (
                  <div key={a.country} className="flex items-center gap-3">
                    <span className="text-xl">{a.flag}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-medium text-zinc-300">{a.country}</span>
                        <span className="text-xs font-bold text-zinc-500">{a.pct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${a.pct}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Interactive Story-style Wrapped Modal */}
      <Dialog open={showWrapped} onOpenChange={setShowWrapped}>
        <DialogContent className="sm:max-w-[400px] h-[700px] max-h-[90vh] p-0 bg-black border-zinc-800 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl [&>button]:hidden">
          
          {/* Progress Bars */}
          <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-4 pt-6 bg-gradient-to-b from-black/80 to-transparent">
            {[0, 1, 2, 3, 4].map(idx => (
              <div key={idx} className="h-1 flex-1 bg-zinc-800/50 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-[4000ms] ease-linear",
                    idx < currentSlide ? "bg-white w-full" : 
                    idx === currentSlide ? "bg-white w-full" : "bg-transparent w-0"
                  )}
                  style={{
                    transitionDuration: idx === currentSlide ? '4000ms' : '0ms',
                    width: idx < currentSlide ? '100%' : idx === currentSlide ? '100%' : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          <button 
            onClick={handleCloseWrapped}
            className="absolute top-12 right-4 z-50 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:bg-black/80 hover:text-white backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Nav Zones */}
          <div className="absolute inset-0 z-40 flex">
            <div className="w-1/3 h-full cursor-pointer" onClick={handlePrevSlide} />
            <div className="w-2/3 h-full cursor-pointer" onClick={handleNextSlide} />
          </div>

          {/* Slides */}
          <div className="relative flex-1 flex flex-col items-center justify-center text-center p-8 z-30 pointer-events-none">
            
            {currentSlide === 0 && (
              <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-700">
                <div className="w-20 h-20 mx-auto bg-zinc-900 rounded-3xl flex items-center justify-center rotate-12 shadow-2xl border border-zinc-800/50">
                  <Camera className="w-10 h-10 text-white -rotate-12" />
                </div>
                <div>
                  <h2 className="text-4xl font-black text-white leading-tight">
                    Your July<br/>
                    <span className="bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">Wrapped</span>
                  </h2>
                </div>
                <p className="text-zinc-400 text-lg">Let's look back at your creative achievements this month on LensLeague.</p>
              </div>
            )}

            {currentSlide === 1 && (
              <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-700">
                <div className="w-20 h-20 mx-auto bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20">
                  <Heart className="w-10 h-10 text-rose-500" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-widest font-bold text-rose-500/80 mb-2">Total Love</div>
                  <h2 className="text-6xl font-black text-white">3,241</h2>
                  <h3 className="text-2xl font-bold text-zinc-300 mt-2">Votes Received</h3>
                </div>
                <p className="text-zinc-400">Your photos inspired the global community, racking up thousands of visual reactions!</p>
              </div>
            )}

            {currentSlide === 2 && (
              <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-700">
                <div className="w-20 h-20 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20">
                  <Trophy className="w-10 h-10 text-amber-500" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-widest font-bold text-amber-500/80 mb-2">Victory Lap</div>
                  <h2 className="text-5xl font-black text-white">87 Wins</h2>
                </div>
                <p className="text-zinc-400">You dominated head-to-head vote battles with a max 12-day upload streak.</p>
              </div>
            )}

            {currentSlide === 3 && (
              <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-700 w-full">
                <div className="text-sm uppercase tracking-widest font-bold text-zinc-500 mb-2">Your Masterpiece</div>
                <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
                  <img src={TOP_PHOTOS[0].url} alt="Masterpiece" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 text-left">
                    <p className="text-2xl font-bold text-white mb-1">Portrait Session</p>
                    <div className="flex items-center gap-2 text-rose-400 font-medium">
                      <Heart className="w-4 h-4 fill-rose-400" />
                      {TOP_PHOTOS[0].votes.toLocaleString()} votes
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentSlide === 4 && (
              <div className="w-full space-y-6 animate-in zoom-in-95 fade-in duration-700">
                <Crown className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white">Your July Scorecard</h2>
                
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full" />
                  
                  <div className="flex flex-col items-center gap-4 relative z-10">
                    <Avatar className="w-20 h-20 border-2 border-zinc-700">
                      <AvatarImage src={ME.avatar} alt={ME.name} />
                      <AvatarFallback>{ME.name[0]}</AvatarFallback>
                    </Avatar>
                    
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">{ME.name}</div>
                      <Badge variant="secondary" className="mt-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-0">
                        Rank #{ME.globalRank || 42} Globally
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 w-full mt-4 pt-4 border-t border-zinc-800/50">
                      <div className="text-center">
                        <div className="text-2xl font-black text-white">3.2k</div>
                        <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider mt-1">Votes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-black text-white">87</div>
                        <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider mt-1">Wins</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-black text-white">4.97</div>
                        <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider mt-1">Rating</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 pointer-events-auto relative z-50">
                  <Button 
                    onClick={handleShareScorecard} 
                    className={cn(
                      "w-full h-14 rounded-xl font-bold text-base transition-all duration-300",
                      scorecardShared 
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    {scorecardShared ? (
                      <>✓ Scorecard Saved!</>
                    ) : (
                      <>
                        <Share className="w-5 h-5 mr-2" />
                        Download Scorecard
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
