import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2, MapPin, DollarSign, Calendar, X } from 'lucide-react';
import PhotoCard from '../../components/PhotoCard/PhotoCard';

const CATEGORIES = ['All', 'Portrait', 'Landscape', 'Street', 'Wedding', 'Product', 'Nature', 'Editorial', 'Architecture', 'Sports'];

export default function DiscoverPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [viewMode, setViewMode] = useState('photographers'); // 'photographers' or 'photos'
  const { photos, users } = useApp();
  const navigate = useNavigate();

  const [showLocationNudge, setShowLocationNudge] = useState(() => {
    return !localStorage.getItem('lensleague_location_enabled');
  });

  const handleEnableLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          localStorage.setItem('lensleague_location_enabled', 'true');
          setShowLocationNudge(false);
        },
        (error) => {
          console.warn('Location access denied or failed', error);
          localStorage.setItem('lensleague_location_enabled', 'denied');
          setShowLocationNudge(false);
        }
      );
    }
  };

  const safeLower = (str) => (str || '').toLowerCase();
  const searchLower = safeLower(search);
  const locationLower = safeLower(locationFilter);

  // Filter photographers
  const filteredPhotographers = users.filter(u => {
    if (u.role !== 'photographer') return false;
    
    // Text search
    const matchesSearch = searchLower === '' || 
      safeLower(u.name).includes(searchLower) || 
      safeLower(u.username).includes(searchLower) ||
      (u.service_categories || []).some(cat => safeLower(cat).includes(searchLower));
      
    // Location filter
    const matchesLocation = locationLower === '' || safeLower(u.location).includes(locationLower);
    
    // Category filter
    const matchesCategory = activeCategory === 'All' || (u.service_categories || []).includes(activeCategory);
    
    // Budget filter
    const matchesBudget = maxBudget === '' || (u.starting_rate && u.starting_rate <= parseInt(maxBudget, 10));
    
    return matchesSearch && matchesLocation && matchesCategory && matchesBudget;
  });

  // Filter photos (Legacy view)
  const filteredPhotos = photos.filter(p =>
    (activeCategory === 'All' || p.category === activeCategory) &&
    (searchLower === '' || 
      safeLower(p.caption).includes(searchLower) || 
      safeLower(p.ownerName).includes(searchLower) || 
      safeLower(p.category).includes(searchLower))
  );

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 animate-in fade-in duration-500">
      {/* Header & Search */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-200 px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 self-start md:self-auto">Discover</h1>
            
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search photographers, styles..."
                className="w-full pl-10 bg-white border-zinc-200 text-zinc-950 placeholder:text-zinc-500 focus-visible:ring-primary h-11 shadow-sm"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                placeholder="Location (e.g. New York)"
                className="w-full pl-10 bg-white border-zinc-200 text-zinc-950 placeholder:text-zinc-500 h-9 text-sm shadow-sm"
              />
            </div>
            <div className="relative flex-1 min-w-[150px]">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="number"
                value={maxBudget}
                onChange={e => setMaxBudget(e.target.value)}
                placeholder="Max Budget"
                className="w-full pl-10 bg-white border-zinc-200 text-zinc-950 placeholder:text-zinc-500 h-9 text-sm shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-lg border border-zinc-200 shrink-0">
              <button 
                onClick={() => setViewMode('photographers')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'photographers' ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-950 border border-transparent'}`}
              >
                Photographers
              </button>
              <button 
                onClick={() => setViewMode('photos')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'photos' ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-950 border border-transparent'}`}
              >
                Portfolio Work
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Categories Sidebar */}
        <aside className="w-full md:w-48 shrink-0 flex overflow-x-auto md:flex-col gap-2 pb-4 md:pb-0 scrollbar-hide border-b md:border-b-0 border-zinc-200">
          <div className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 hidden md:block">Categories</div>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeCategory === cat 
                  ? 'bg-zinc-950 text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          
          {showLocationNudge && (
            <div className="mb-6 bg-zinc-900 text-white p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between shadow-lg animate-in slide-in-from-top-2 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-zinc-300" />
                </div>
                <div className="text-sm">
                  <span className="font-bold">📍 Enable location</span> to see photographers near you.
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button size="sm" className="bg-white text-black hover:bg-zinc-200 text-xs font-bold rounded-full h-8 px-4" onClick={handleEnableLocation}>Enable</Button>
                <button className="p-1 hover:bg-white/10 rounded-full transition-colors" onClick={() => {
                  localStorage.setItem('lensleague_location_enabled', 'dismissed');
                  setShowLocationNudge(false);
                }}>
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </div>
          )}

          <div className="mb-4">
            <h2 className="text-sm font-bold tracking-widest text-zinc-500 uppercase mb-4">
              {viewMode === 'photographers' 
                ? (search || locationFilter || maxBudget ? 'Search Results' : 'Top Photographers')
                : (search ? 'Search Results' : (activeCategory === 'All' ? 'Trending Photography' : `${activeCategory} Photography`))
              }
            </h2>
          </div>

          {(viewMode === 'photographers' && filteredPhotographers.length === 0) || (viewMode === 'photos' && filteredPhotos.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-200 rounded-2xl bg-white shadow-sm">
              <Search className="w-12 h-12 text-zinc-400 mb-4" />
              <h3 className="text-xl font-bold text-zinc-950 mb-2">No results found</h3>
              <p className="text-zinc-500 max-w-sm">
                We couldn't find any {viewMode} matching your criteria. Try adjusting your filters.
              </p>
              <Button 
                variant="outline" 
                className="mt-6 border-zinc-200 hover:bg-zinc-50 text-zinc-950"
                onClick={() => { setSearch(''); setActiveCategory('All'); setLocationFilter(''); setMaxBudget(''); }}
              >
                Clear Filters
              </Button>
            </div>
          ) : viewMode === 'photographers' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPhotographers.map(user => {
                const userPhotos = photos.filter(p => p.ownerId === user.id).slice(0, 3);
                return (
                  <div key={user.id} className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-zinc-300 hover:-translate-y-1 hover:shadow-lg transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${user.id}`)}>
                        <Avatar className="w-12 h-12 border-2 border-transparent group-hover:border-primary/50 transition-colors">
                          <AvatarImage src={user.avatar} className="object-cover" />
                          <AvatarFallback className="bg-zinc-100 text-zinc-600 font-bold">{user.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-sm text-zinc-950 group-hover:text-primary transition-colors flex items-center gap-1">
                            {user.name}
                            {user.verified && <span className="text-primary text-[10px] uppercase font-black px-1 bg-primary/20 rounded">Pro</span>}
                          </div>
                          <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {user.location || 'Remote'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {user.starting_rate > 0 && (
                        <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                          Starts at ${user.starting_rate}
                        </div>
                      )}
                      <div className="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-md">
                        {user.points || 1200} Elo
                      </div>
                    </div>

                    <div className="flex gap-2 mb-5 overflow-hidden h-24 rounded-lg">
                      {userPhotos.length > 0 ? (
                        userPhotos.map(p => (
                          <img key={p.id} src={p.url} className="w-1/3 h-full object-cover bg-zinc-100" alt="portfolio item" />
                        ))
                      ) : (
                        <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-xs text-zinc-500 font-medium">No portfolio items</div>
                      )}
                    </div>

                    <Button 
                      className="w-full bg-zinc-950 text-white hover:bg-zinc-800 font-bold"
                      onClick={() => navigate(`/profile/${user.id}`)}
                    >
                      View & Hire
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
              {filteredPhotos.map(photo => (
                <div key={photo.id} className="break-inside-avoid rounded-[2rem] overflow-hidden hover:shadow-2xl transition-all duration-300">
                  <PhotoCard photo={photo} compact={true} />
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
