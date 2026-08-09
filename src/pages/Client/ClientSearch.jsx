import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Star, MapPin, MessageSquare, Verified, Users } from 'lucide-react';

const CATEGORIES = ['All', 'Portrait', 'Wedding', 'Commercial', 'Street', 'Nature'];
const SORT_OPTS = ['Top Rated', 'Most Booked', 'Nearest', 'Price'];

export default function ClientSearch() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('Top Rated');
  const [isLoading, setIsLoading] = useState(true);

  const { users = [] } = useApp();

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  const safeLower = (str) => (str || '').toLowerCase();
  const searchLower = safeLower(search);

  // Derive search data realistically
  const mappedUsers = users.map(u => ({ 
    ...u, 
    avgRating: u.rating || 5.0, 
    globalRank: u.global_rank || 1, 
    categories: u.categories || ['Portrait'], 
    startingPrice: u.startingPrice || '$500', 
    wins: u.wins || 0,
    location: u.location || 'Global'
  }));

  const filtered = mappedUsers.filter(p =>
    (category === 'All' || p.categories.includes(category)) &&
    p.avgRating >= minRating &&
    (searchLower === '' || 
      safeLower(p.name).includes(searchLower) || 
      safeLower(p.location).includes(searchLower) ||
      p.categories.some(c => safeLower(c).includes(searchLower))
    )
  );

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* Header & Search Bar */}
      <div className="max-w-5xl mx-auto mb-10">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-white transition-all hover:scale-[1.01]">
          Find a Photographer
        </h1>
        <p className="text-zinc-400 mb-8 max-w-lg">
          Search our global network of elite visual creators by style, location, or name.
        </p>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 transition-colors group-hover:text-primary" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, location, or style..."
            className="w-full h-14 pl-12 bg-zinc-900/80 border-zinc-800 text-lg rounded-2xl placeholder:text-zinc-500 focus-visible:ring-primary shadow-xl transition-all hover:bg-zinc-900"
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-8">
          <div>
            <h3 className="text-sm font-bold tracking-widest text-zinc-500 uppercase mb-4">Categories</h3>
            <div className="flex flex-wrap lg:flex-col gap-2">
              {CATEGORIES.map(c => (
                <button 
                  key={c} 
                  onClick={() => setCategory(c)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all text-left active:scale-95 ${
                    category === c 
                      ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-[1.02]' 
                      : 'bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:-translate-y-0.5'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold tracking-widest text-zinc-500 uppercase mb-4">Min Rating</h3>
            <div className="flex flex-wrap gap-2">
              {[0, 4, 4.5, 4.8].map(r => (
                <button 
                  key={r} 
                  onClick={() => setMinRating(r)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                    minRating === r 
                      ? 'bg-primary text-primary-foreground hover:scale-[1.02]' 
                      : 'bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:-translate-y-0.5'
                  }`}
                >
                  {r === 0 ? 'Any' : `${r}★+`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold tracking-widest text-zinc-500 uppercase mb-4">Sort By</h3>
            <select 
              value={sort} 
              onChange={e => setSort(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary appearance-none transition-colors hover:border-zinc-700 cursor-pointer"
            >
              {SORT_OPTS.map(s => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
            </select>
          </div>
        </aside>

        {/* Results List */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {isLoading ? (
            <div className="flex flex-col gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-zinc-900/50 rounded-xl animate-pulse border border-zinc-800/50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
              <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 transition-transform hover:scale-110 hover:bg-zinc-800">
                <Users className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No photographers found</h3>
              <p className="text-zinc-400 max-w-sm mb-6">
                Try broadening your filters or searching for something else.
              </p>
              <Button 
                variant="outline" 
                onClick={() => { setSearch(''); setCategory('All'); setMinRating(0); }} 
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all hover:scale-[1.02] active:scale-95"
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            filtered.map(p => (
              <Card key={p.id} className="bg-zinc-900/40 border-zinc-800/50 overflow-hidden transition-all hover:bg-zinc-900/80 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    
                    {/* Photographer Info */}
                    <div className="flex flex-1 gap-4">
                      <Avatar className="w-20 h-20 border-2 border-zinc-800 shadow-xl transition-transform hover:scale-105 cursor-pointer" onClick={() => navigate(`/profile/${p.id}`)}>
                        <AvatarImage src={p.avatar} className="object-cover" />
                        <AvatarFallback className="bg-zinc-800 text-xl">{p?.name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-xl font-bold text-white hover:text-primary transition-colors cursor-pointer" onClick={() => navigate(`/profile/${p.id}`)}>
                            {p.name}
                          </h2>
                          {p.verified && <Verified className="w-5 h-5 text-blue-500 fill-blue-500/20" />}
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm text-zinc-400 mb-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {p.location}
                          </div>
                          <div className="w-1 h-1 rounded-full bg-zinc-700" />
                          <div className="flex items-center gap-1 text-white">
                            <Star className="w-4 h-4 fill-gold" />
                            <span className="font-medium">{p.avgRating}</span>
                            <span className="text-zinc-500 ml-1">({p.wins})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {p.categories.map(cat => (
                            <span key={cat} className="px-2.5 py-1 rounded-md bg-zinc-800 text-xs font-medium text-zinc-300">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions & Price */}
                    <div className="flex flex-col md:items-end justify-between gap-4 md:w-48 shrink-0 border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-6">
                      <div className="text-left md:text-right w-full">
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">Starting at</div>
                        <div className="text-2xl font-black text-white">{p.startingPrice}</div>
                      </div>
                      
                      <div className="flex flex-col gap-2 w-full">
                        <Button onClick={() => navigate(`/profile/${p.id}`)} className="w-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-95">
                          View Portfolio
                        </Button>
                        <Button variant="outline" className="w-full border-zinc-700 text-white hover:bg-zinc-800 transition-all hover:scale-[1.02] active:scale-95">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Message
                        </Button>
                      </div>
                    </div>
                    
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
