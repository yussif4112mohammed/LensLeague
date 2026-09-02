import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RankBadge from '../../components/RankBadge/RankBadge';
import { useApp } from '../../context/AppContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, TrendingDown, Minus, Crown } from 'lucide-react';

function TrendArrow({ trend }) {
  if (trend === 0) return <div className="flex items-center text-muted-foreground"><Minus className="w-4 h-4" /></div>;
  if (trend > 0) return <div className="flex items-center text-emerald-500 font-bold"><TrendingUp className="w-4 h-4 mr-1" />{trend}</div>;
  return <div className="flex items-center text-red-500 font-bold"><TrendingDown className="w-4 h-4 mr-1" />{Math.abs(trend)}</div>;
}

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { users, currentUser } = useApp();
  const [scope, setScope] = useState('global');
  const [period, setPeriod] = useState('all');
  
  // Sort by points descending — this is the live source of truth
  // global_rank may lag behind in DB so we recompute locally
  const sortedUsers = [...users].sort((a, b) => (b.points || 0) - (a.points || 0));
  const entries = sortedUsers.slice(0, 50).map((u, i) => ({
    id: u.id,
    rank: i + 1,
    name: u.name || 'User',
    avatar: u.avatar_url || u.avatar,
    points: u.points || 0,
    trend: i % 3 === 0 ? +2 : (i % 5 === 0 ? -1 : 0),
    category: (u.categories && u.categories[0]) || (u.service_categories && u.service_categories[0]) || 'Photography',
    location: u.location || 'Global'
  }));

  const myRank = { 
    global: sortedUsers.findIndex(u => u.id === currentUser?.id) + 1 || currentUser?.global_rank || 99, 
    weeklyChange: 'Top 5%', 
    trend: +4,
    points: currentUser?.points || 0
  };

  return (
    <div className="min-h-screen bg-muted pb-24 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-6 md:px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Crown className="w-8 h-8 text-foreground" />
            Leaderboard
          </h1>
          <div className="flex flex-col sm:flex-row gap-3">
            <Tabs value={scope} onValueChange={setScope} className="w-full sm:w-auto">
              <TabsList className="bg-card border border-border shadow-sm">
                <TabsTrigger value="global" className="data-[active]:bg-primary data-[active]:text-primary-foreground text-muted-foreground font-bold">Global</TabsTrigger>
                <TabsTrigger value="country" className="data-[active]:bg-primary data-[active]:text-primary-foreground text-muted-foreground font-bold">Country</TabsTrigger>
                <TabsTrigger value="category" className="data-[active]:bg-primary data-[active]:text-primary-foreground text-muted-foreground font-bold">Category</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={period} onValueChange={setPeriod} className="w-full sm:w-auto">
              <TabsList className="bg-card border border-border shadow-sm">
                <TabsTrigger value="all" className="data-[active]:bg-background data-[active]:text-foreground text-muted-foreground font-bold">All-Time</TabsTrigger>
                <TabsTrigger value="month" className="data-[active]:bg-primary data-[active]:text-primary-foreground text-muted-foreground font-bold">Month</TabsTrigger>
                <TabsTrigger value="week" className="data-[active]:bg-primary data-[active]:text-primary-foreground text-muted-foreground font-bold">Week</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        
        {/* My Rank Card */}
        <div className="bg-gradient-to-r from-white to-zinc-50 border border-border rounded-2xl p-5 mb-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <RankBadge rank={myRank.global} size="lg" />
            <div>
              <div className="text-lg md:text-xl font-bold text-foreground">{myRank.global > 0 ? `You're #${myRank.global} globally` : 'Not yet ranked'}</div>
              <div className="text-sm font-medium text-muted-foreground">Compete in battles to earn ELO points</div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-2xl font-black text-foreground">{myRank.points.toLocaleString()} <span className="text-sm font-medium text-muted-foreground uppercase">ELO</span></div>
            <TrendArrow trend={myRank.trend} />
          </div>
        </div>

        {/* Algorithm info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-10 flex items-start gap-3">
          <span className="text-xl">⚡</span>
          <div>
            <div className="text-sm font-bold text-yellow-900 mb-0.5">How ranking works</div>
            <div className="text-xs text-yellow-800 leading-relaxed">Every vote in a battle changes both photographers' ELO scores. Winners gain points, losers lose points. The more you compete and win, the higher your rank climbs.</div>
          </div>
        </div>

        {/* Podium (Top 3) */}
        <div className="flex items-end justify-center gap-2 md:gap-6 mb-16 px-2">
          
          {/* Silver (#2) */}
          <div 
            className="flex flex-col items-center cursor-pointer group w-1/3 max-w-[160px]"
            onClick={() => navigate(`/profile/${entries[1]?.id}`)}
          >
            <div className="relative mb-4">
              <Avatar className="w-16 h-16 md:w-24 md:h-24 border-4 border-border shadow-[0_0_20px_rgba(0,0,0,0.05)] group-hover:scale-105 transition-transform">
                <AvatarImage src={entries[1]?.avatar} className="object-cover" />
                <AvatarFallback className="bg-muted text-muted-foreground font-bold text-xl">{entries[1]?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                <RankBadge rank={2} size="md" />
              </div>
            </div>
            <div className="text-center font-bold text-foreground truncate w-full px-2 mb-1">{entries[1]?.name?.split(' ')[0]}</div>
            <div className="text-xs font-bold text-muted-foreground mb-4">{(entries[1]?.points||0).toLocaleString()} ELO</div>
            <div className="w-full h-32 md:h-40 bg-gradient-to-t from-zinc-300/20 to-zinc-300/5 rounded-t-xl border-t border-border/30 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-1 bg-muted" />
            </div>
          </div>

          {/* Gold (#1) */}
          <div 
            className="flex flex-col items-center cursor-pointer group w-1/3 max-w-[180px] -mt-8 relative z-10"
            onClick={() => navigate(`/profile/${entries[0]?.id}`)}
          >
            <div className="relative mb-4">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-4xl animate-bounce">👑</div>
              <Avatar className="w-20 h-20 md:w-32 md:h-32 border-4 border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.2)] group-hover:scale-105 transition-transform">
                <AvatarImage src={entries[0]?.avatar} className="object-cover" />
                <AvatarFallback className="bg-muted text-muted-foreground font-bold text-2xl">{entries[0]?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                <RankBadge rank={1} size="lg" />
              </div>
            </div>
            <div className="text-center font-black text-foreground text-lg truncate w-full px-2 mb-1">{entries[0]?.name?.split(' ')[0]}</div>
            <div className="text-xs font-black text-foreground mb-4">{(entries[0]?.points||0).toLocaleString()} ELO</div>
            <div className="w-full h-40 md:h-52 bg-gradient-to-t from-gold/20 to-gold/5 rounded-t-xl border-t-2 border-white/40 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-card shadow-[0_0_10px_rgba(255,255,255,1)]" />
            </div>
          </div>

          {/* Bronze (#3) */}
          <div 
            className="flex flex-col items-center cursor-pointer group w-1/3 max-w-[160px]"
            onClick={() => navigate(`/profile/${entries[2]?.id}`)}
          >
            <div className="relative mb-4">
              <Avatar className="w-16 h-16 md:w-24 md:h-24 border-4 border-amber-700 shadow-[0_0_20px_rgba(180,83,9,0.1)] group-hover:scale-105 transition-transform">
                <AvatarImage src={entries[2]?.avatar} className="object-cover" />
                <AvatarFallback className="bg-muted text-muted-foreground font-bold text-xl">{entries[2]?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                <RankBadge rank={3} size="md" />
              </div>
            </div>
            <div className="text-center font-bold text-foreground truncate w-full px-2 mb-1">{entries[2]?.name?.split(' ')[0]}</div>
            <div className="text-xs font-medium text-muted-foreground mb-4">{(entries[2]?.points||0).toLocaleString()} ELO</div>
            <div className="w-full h-24 md:h-32 bg-gradient-to-t from-amber-700/20 to-amber-700/5 rounded-t-xl border-t border-amber-700/30 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-700" />
            </div>
          </div>

        </div>

        {/* List (Rank 4+) */}
        <div className="flex flex-col gap-2">
          {entries.slice(3).map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/profile/${p.id}`)}
              className="flex items-center gap-4 bg-card border border-border p-4 rounded-2xl hover:bg-muted transition-colors cursor-pointer group shadow-sm"
            >
              <div className="w-12 shrink-0 flex justify-center">
                <RankBadge rank={p.rank} size="sm" />
              </div>
              
              <Avatar className="w-12 h-12 border border-border group-hover:border-ring transition-colors">
                <AvatarImage src={p.avatar} className="object-cover" />
                <AvatarFallback className="bg-muted text-muted-foreground font-bold">{p.name.charAt(0)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="font-bold text-foreground truncate group-hover:text-primary transition-colors">{p.name}</div>
                <div className="text-xs text-muted-foreground truncate">{p.category} · {p.location}</div>
              </div>
              
              <div className="flex flex-col items-end shrink-0">
                <div className="font-bold text-foreground text-sm">{(p.points).toLocaleString()} <span className="text-[10px] text-muted-foreground uppercase font-medium">ELO</span></div>
                <TrendArrow trend={p.trend} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
