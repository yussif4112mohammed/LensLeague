import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2 } from 'lucide-react';
import PhotoCard from '../../components/PhotoCard/PhotoCard';

const CATEGORIES = ['All', 'Portrait', 'Landscape', 'Street', 'Wedding', 'Product', 'Nature', 'Editorial', 'Architecture', 'Sports'];

export default function DiscoverPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const { photos, users } = useApp();
  const navigate = useNavigate();

  const safeLower = (str) => (str || '').toLowerCase();
  const searchLower = safeLower(search);

  const filtered = photos.filter(p =>
    (activeCategory === 'All' || p.category === activeCategory) &&
    (searchLower === '' || 
      safeLower(p.caption).includes(searchLower) || 
      safeLower(p.ownerName).includes(searchLower) || 
      safeLower(p.category).includes(searchLower))
  );
  
  const matchingUsers = searchLower === '' ? [] : users.filter(u => 
    safeLower(u.name).includes(searchLower) || 
    safeLower(u.username).includes(searchLower) ||
    safeLower(u.handle).includes(searchLower)
  );

  return (
    <div className="min-h-screen bg-black pb-24 animate-in fade-in duration-500">
      {/* Header & Search */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-zinc-900 px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-white self-start md:self-auto">Discover</h1>
          
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search photographers, styles, locations..."
              className="w-full pl-10 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-primary h-11"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Categories Sidebar */}
        <aside className="w-full md:w-48 shrink-0 flex overflow-x-auto md:flex-col gap-2 pb-4 md:pb-0 scrollbar-hide border-b md:border-b-0 border-zinc-900">
          <div className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 hidden md:block">Categories</div>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeCategory === cat 
                  ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(212,175,55,0.2)]' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          
          {/* Matching Users */}
          {matchingUsers.length > 0 && (
            <div className="mb-10">
              <h2 className="text-sm font-bold tracking-widest text-zinc-500 uppercase mb-4">Photographers</h2>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {matchingUsers.map(u => (
                  <button 
                    key={u.id} 
                    onClick={() => navigate(`/profile/${u.id}`)}
                    className="flex flex-col items-center gap-2 min-w-[90px] snap-start group"
                  >
                    <Avatar className="w-16 h-16 ring-2 ring-transparent group-hover:ring-primary transition-all shadow-xl">
                      <AvatarImage src={u.avatar} className="object-cover" />
                      <AvatarFallback className="bg-zinc-800 text-zinc-400">{u?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <div className="font-semibold text-xs text-white truncate w-[90px] group-hover:text-primary transition-colors">{u?.name || 'User'}</div>
                      <div className="text-[10px] text-zinc-500">@{u?.handle || u?.username || 'user'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Photos Grid */}
          <div className="mb-4">
            <h2 className="text-sm font-bold tracking-widest text-zinc-500 uppercase mb-4">
              {search ? 'Search Results' : (activeCategory === 'All' ? 'Trending Photography' : `${activeCategory} Photography`)}
            </h2>
          </div>

          {filtered.length === 0 && matchingUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
              <Search className="w-12 h-12 text-zinc-600 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No results found</h3>
              <p className="text-zinc-400 max-w-sm">
                We couldn't find any photos or photographers matching "{search}". Try exploring a different category.
              </p>
              <Button 
                variant="outline" 
                className="mt-6 border-zinc-700 hover:bg-zinc-800 text-white"
                onClick={() => { setSearch(''); setActiveCategory('All'); }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
              {filtered.map(photo => (
                <div key={photo.id} className="break-inside-avoid">
                  <PhotoCard photo={photo} />
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
