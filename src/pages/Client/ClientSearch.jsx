import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Star, MapPin, MessageSquare, Verified, Users } from 'lucide-react';

const SORT_OPTS = ['Top Rated', 'Most Booked', 'Nearest'];

export default function ClientSearch() {
  // Categories come from the database (one platform-controlled list) rather
  // than a hardcoded array. There used to be four such arrays across the app,
  // all disagreeing - a photo uploaded as one category was unfilterable in
  // another screen, and one list's "Commercial" existed nowhere else at all.
  const { categories } = useApp();
  const CATEGORIES = ['All', ...categories];
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

  // These defaults used to decide who a client FOUND, not merely what was
  // displayed.
  //
  // The rating fell back to five stars for anyone unrated, so filtering by
  // "4+ stars" matched everybody: the control looked like a quality signal and
  // was a no-op.
  //
  // The category fell back to a single hardcoded value, and did so off a field
  // that does not exist on profiles at all - the real columns are
  // service_categories and specialties. So every photographer carried the same
  // one category, and filtering by any other returned nobody.
  const mappedUsers = users.map(u => ({
    ...u,
    // A rating with no reviews behind it is not a rating.
    avgRating: u.review_count > 0 && u.rating != null ? Number(u.rating) : null,
    reviewCount: u.review_count || 0,
    // Never default an unranked photographer to 1 - see ClientHome.
    globalRank: u.global_rank ?? null,
    // Their own stated specialisms. Empty means empty.
    categories: u.service_categories?.length ? u.service_categories
              : u.specialties?.length      ? u.specialties
              : [],
    wins: u.wins || 0,
    location: u.location || null,
  }));

  const filtered = mappedUsers.filter(p => {
    if (p.role !== 'photographer') return false;
    if (p.banned || p.is_deactivated) return false;

    // A category filter must not silently pass photographers who declared none.
    if (category !== 'All' && !p.categories.includes(category)) return false;

    // A minimum rating excludes the unrated. Asking for four stars and being
    // shown people nobody has reviewed is the filter lying to you.
    if (minRating > 0 && (p.avgRating === null || p.avgRating < minRating)) return false;

    if (searchLower === '') return true;
    return safeLower(p.name).includes(searchLower)
        || safeLower(p.username).includes(searchLower)
        || safeLower(p.location).includes(searchLower)
        || p.categories.some(c => safeLower(c).includes(searchLower));
  });

  return (
    <div className="min-h-screen bg-black text-foreground p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* Header & Search Bar */}
      <div className="max-w-5xl mx-auto mb-10">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-foreground transition-all hover:scale-[1.01]">
          Find a Photographer
        </h1>
        <p className="text-muted-foreground mb-8 max-w-lg">
          Search our global network of elite visual creators by style, location, or name.
        </p>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-hover:text-primary" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, location, or style..."
            className="w-full h-14 pl-12 bg-card/80 border-border text-lg rounded-2xl placeholder:text-muted-foreground focus-visible:ring-primary shadow-xl transition-all hover:bg-card"
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-8">
          <div>
            <h3 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-4">Categories</h3>
            <div className="flex flex-wrap lg:flex-col gap-2">
              {CATEGORIES.map(c => (
                <button 
                  key={c} 
                  onClick={() => setCategory(c)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all text-left active:scale-95 ${
                    category === c 
                      ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-[1.02]' 
                      : 'bg-card/50 text-muted-foreground hover:text-foreground hover:bg-muted hover:-translate-y-0.5'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-4">Min Rating</h3>
            <div className="flex flex-wrap gap-2">
              {[0, 4, 4.5, 4.8].map(r => (
                <button 
                  key={r} 
                  onClick={() => setMinRating(r)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                    minRating === r 
                      ? 'bg-primary text-primary-foreground hover:scale-[1.02]' 
                      : 'bg-card/50 text-muted-foreground hover:text-foreground hover:bg-muted hover:-translate-y-0.5'
                  }`}
                >
                  {r === 0 ? 'Any' : `${r}★+`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-4">Sort By</h3>
            <select 
              value={sort} 
              onChange={e => setSort(e.target.value)}
              className="w-full bg-card/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none transition-colors hover:border-border cursor-pointer"
            >
              {SORT_OPTS.map(s => <option key={s} value={s} className="bg-card">{s}</option>)}
            </select>
          </div>
        </aside>

        {/* Results List */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {isLoading ? (
            <div className="flex flex-col gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-card/50 rounded-xl animate-pulse border border-border/50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-3xl bg-card/20">
              <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mb-4 transition-transform hover:scale-110 hover:bg-muted">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">No photographers found</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                Try broadening your filters or searching for something else.
              </p>
              <Button 
                variant="outline" 
                onClick={() => { setSearch(''); setCategory('All'); setMinRating(0); }} 
                className="border-border text-foreground hover:bg-muted hover:text-foreground transition-all hover:scale-[1.02] active:scale-95"
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            filtered.map(p => (
              <Card key={p.id} className="bg-card/40 border-border/50 overflow-hidden transition-all hover:bg-card/80 hover:-translate-y-1 hover:border-border hover:shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    
                    {/* Photographer Info */}
                    <div className="flex flex-1 gap-4">
                      <Avatar className="w-20 h-20 border-2 border-border shadow-xl transition-transform hover:scale-105 cursor-pointer" onClick={() => navigate(`/profile/${p.id}`)}>
                        <AvatarImage src={p.avatar} className="object-cover" />
                        <AvatarFallback className="bg-muted text-xl">{p?.name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer" onClick={() => navigate(`/profile/${p.id}`)}>
                            {p.name}
                          </h2>
                          {p.verified && <Verified className="w-5 h-5 text-blue-500 fill-blue-500/20" />}
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {p.location}
                          </div>
                          <div className="w-1 h-1 rounded-full bg-muted" />
                          <div className="flex items-center gap-1 text-foreground">
                            <Star className="w-4 h-4 fill-gold" />
                            <span className="font-medium">{p.avgRating != null ? p.avgRating.toFixed(1) : 'No reviews yet'}</span>
                            <span className="text-muted-foreground ml-1">({p.wins})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {p.categories.map(cat => (
                            <span key={cat} className="px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-foreground">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Inquiry-only action; photographers set scope after contact. */}
                    <div className="flex flex-col md:items-end justify-between gap-4 md:w-48 shrink-0 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                      <div className="flex flex-col gap-2 w-full">
                        <Button onClick={() => navigate(`/profile/${p.id}`)} className="w-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-95">
                          View Portfolio
                        </Button>
                        <Button variant="outline" onClick={() => navigate(`/client/inbox?chat=${p.id}`)} className="w-full border-border text-foreground hover:bg-muted transition-all hover:scale-[1.02] active:scale-95">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Inquire
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
