import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PhotoCard from '../../components/PhotoCard/PhotoCard';
import StoriesBar from '../../components/StoriesBar/StoriesBar';
import NotificationsDrawer from '../../components/Notifications/NotificationsDrawer';
import { useApp } from '../../context/AppContext';
import { PlusSquare, Inbox, Bell, Loader2, Sparkles, ChevronRight, Zap, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';

function BattleSpotlightCard({ battle }) {
  const navigate = useNavigate();
  return (
    <div 
      className="relative overflow-hidden bg-zinc-950 border border-zinc-800 rounded-2xl mb-12 cursor-pointer group hover:border-zinc-700 transition-colors" 
      onClick={() => navigate('/compete/vote')} 
      id={`spotlight-${battle.id}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-transparent to-zinc-950 z-10 pointer-events-none" />
      
      <div className="relative z-20 flex items-center justify-between p-4 border-b border-zinc-800/50 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-100">Live Battle — {battle.category}</span>
        </div>
        <span className="text-xs font-medium text-zinc-400">{battle.totalVotes.toLocaleString()} votes · {battle.endsIn}</span>
      </div>

      <div className="relative flex aspect-[21/9]">
        <div className="w-1/2 h-full relative">
          <img src={battle.photoA.url} alt={battle.photoA.photographerName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
            <span className="text-sm font-semibold text-white drop-shadow-md">{battle.photoA.photographerName}</span>
          </div>
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-12 h-12 rounded-full bg-black border-4 border-zinc-950 shadow-2xl">
          <span className="text-sm font-black italic text-zinc-300">VS</span>
        </div>
        <div className="w-1/2 h-full relative">
          <img src={battle.photoB.url} alt={battle.photoB.photographerName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
            <span className="text-sm font-semibold text-white drop-shadow-md text-right w-full">{battle.photoB.photographerName}</span>
          </div>
        </div>
      </div>

      <div className="relative z-20 p-4 bg-black/50 backdrop-blur-sm text-center border-t border-zinc-800/50">
        <span className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors">Tap to vote &rarr;</span>
      </div>
    </div>
  );
}

const FEED_TABS = ['For You', 'Following'];

export default function FeedPage() {
  const [tab, setTab] = useState('For You');
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const { fetchPhotosPaginated, battles, challenges, users, currentUser } = useApp();

  const [feedPhotos, setFeedPhotos] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // Initialize and load page 0
  useEffect(() => {
    let active = true;
    const initFetch = async () => {
      setLoading(true);
      setFeedPhotos([]);
      setPage(0);
      setHasMore(true);
      const filterType = tab === 'Following' ? 'following' : 'for-you';
      const initial = await fetchPhotosPaginated(0, 9, filterType);
      if (active) {
        setFeedPhotos(initial);
        if (initial.length < 10) {
          setHasMore(false);
        } else {
          setPage(1);
          setHasMore(true);
        }
        setLoading(false);
      }
    };
    initFetch();
    return () => {
      active = false;
    };
  }, [fetchPhotosPaginated, tab]);

  // Load subsequent pages
  const loadNextPage = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const filterType = tab === 'Following' ? 'following' : 'for-you';
    const nextPagePhotos = await fetchPhotosPaginated(page * 10, (page + 1) * 10 - 1, filterType);
    if (nextPagePhotos.length === 0) {
      setHasMore(false);
    } else {
      setFeedPhotos(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const filtered = nextPagePhotos.filter(p => !existingIds.has(p.id));
        return [...prev, ...filtered];
      });
      setPage(p => p + 1);
      if (nextPagePhotos.length < 10) {
        setHasMore(false);
      }
    }
    setLoading(false);
  }, [page, loading, hasMore, fetchPhotosPaginated, tab]);

  // Scroll sentinel trigger hook
  const observerRef = useRef();
  const lastPhotoRef = useCallback(node => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadNextPage();
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, loadNextPage]);

  const feedItems = [];
  feedPhotos.forEach((photo, i) => {
    feedItems.push({ type: 'photo', data: photo });
    if ((i + 1) % 5 === 0 && battles[Math.floor(i / 5)]) {
      feedItems.push({ type: 'battle', data: battles[Math.floor(i / 5)] });
    }
  });

  const activeChallenges = challenges.filter(c => c.status === 'active').slice(0, 2);
  const trendingPhotographers = users.slice(0, 3);

  return (
    <div className="min-h-screen bg-black text-zinc-50 pb-20 md:pb-0">
      
      {/* ── Mobile/Tablet Sticky Header ── */}
      <header className="sticky top-0 z-40 md:hidden flex items-center justify-between p-4 bg-black/70 backdrop-blur-xl border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <Logo withText={true} className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/upload')} className="text-zinc-100 hover:text-zinc-300 transition-colors">
            <PlusSquare className="w-6 h-6" />
          </button>
          <button onClick={() => navigate('/inbox')} className="text-zinc-100 hover:text-zinc-300 transition-colors relative">
            <Inbox className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black" />
          </button>
          <button onClick={() => setNotifOpen(true)} className="text-zinc-100 hover:text-zinc-300 transition-colors relative">
            <Bell className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black" />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto md:px-6 lg:px-8 md:py-8 lg:grid lg:grid-cols-[1fr_340px] lg:gap-12">
        
        {/* ── Main Feed Column ── */}
        <main className="w-full max-w-2xl mx-auto lg:mx-0">
          
          {/* Desktop Header (Hidden on Mobile) */}
          <div className="hidden md:flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Feed</h1>
            
            {/* Feed Tabs */}
            <div className="flex items-center p-1 bg-zinc-900/50 rounded-full border border-zinc-800">
              {FEED_TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-6 py-2 rounded-full text-sm font-semibold tracking-wide transition-all",
                    tab === t 
                      ? "bg-zinc-800 text-white shadow-sm" 
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Feed Tabs */}
          <div className="md:hidden flex items-center justify-center gap-2 p-4 mb-2">
            {FEED_TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-semibold tracking-wide transition-all",
                  tab === t 
                    ? "bg-zinc-800 text-white" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Stories Bar placeholder (Optional) */}
          {/* <StoriesBar /> */}

          {/* Feed Content */}
          <div className="space-y-4 md:space-y-8">
            {feedPhotos.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-center border border-zinc-800/50 rounded-3xl bg-zinc-950/30">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
                  <Camera className="w-8 h-8 text-zinc-500" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight mb-3">
                  {tab === 'Following' ? 'Your Timeline is Quiet' : 'Welcome to the Feed'}
                </h2>
                <p className="text-zinc-400 text-sm max-w-sm mb-8 leading-relaxed">
                  {tab === 'Following' 
                    ? 'Follow more photographers to see their latest shoots and video clips appear here.' 
                    : 'Be the first photographer to post today. Share your high-res photos or video clips.'}
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Button 
                    onClick={() => navigate('/upload')}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-full px-8 shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.5)]"
                  >
                    Upload Shoot
                  </Button>
                  {tab === 'Following' && (
                    <Button 
                      variant="outline"
                      onClick={() => setTab('For You')}
                      className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-full px-8"
                    >
                      Explore Creators
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              feedItems.map((item, index) =>
                item.type === 'photo'
                  ? <PhotoCard key={item.data.id} photo={item.data} />
                  : <BattleSpotlightCard key={`battle-${item.data.id}-${index}`} battle={item.data} />
              )
            )}

            {/* Loading Sentinel */}
            {hasMore && (
              <div ref={lastPhotoRef} className="py-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
              </div>
            )}
          </div>
        </main>

        {/* ── Desktop Right Rail ── */}
        <aside className="hidden lg:block space-y-8 sticky top-8 h-fit">
          
          {/* Profile Mini Card */}
          {currentUser && (
            <div className="flex items-center justify-between">
              <button 
                onClick={() => navigate(`/profile/${currentUser.id}`)}
                className="flex items-center gap-4 group"
              >
                <Avatar className="w-12 h-12 ring-2 ring-transparent group-hover:ring-zinc-700 transition-all">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} className="object-cover" />
                  <AvatarFallback className="bg-zinc-800">{currentUser?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="font-bold text-sm group-hover:underline">{currentUser?.name || 'User'}</div>
                  <div className="text-zinc-400 text-xs">@{currentUser?.handle || currentUser?.name?.toLowerCase().replace(' ', '') || 'user'}</div>
                </div>
              </button>
              <button className="text-xs font-semibold text-blue-500 hover:text-white transition-colors">Switch</button>
            </div>
          )}

          {/* Active Challenges */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-400">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold tracking-wide uppercase">Active Challenges</span>
              </div>
              <button 
                onClick={() => navigate('/compete/challenges')}
                className="text-xs font-semibold text-zinc-100 hover:text-zinc-300"
              >
                See All
              </button>
            </div>
            
            <div className="space-y-3">
              {activeChallenges.length > 0 ? (
                activeChallenges.map(c => (
                  <button 
                    key={c.id}
                    onClick={() => navigate('/compete/challenges')}
                    className="w-full flex items-center gap-4 p-2 rounded-xl hover:bg-zinc-900 transition-colors group text-left"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                      <img src={c.coverUrl} alt={c.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="font-semibold text-sm truncate group-hover:text-white text-zinc-200">{c.title}</div>
                      <div className="text-xs text-zinc-500 mt-0.5 truncate">
                        <span className="text-yellow-500 font-medium">🏆 {c.prizePoints} pts</span> · {c.entries} entries
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-sm text-zinc-500 p-4 text-center border border-dashed border-zinc-800 rounded-xl">
                  No active challenges right now.
                </div>
              )}
            </div>
          </div>

          {/* Top Standings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold tracking-wide uppercase text-zinc-400">
                Top Standings
              </div>
              <button 
                onClick={() => navigate('/leaderboard')}
                className="text-xs font-semibold text-zinc-100 hover:text-zinc-300"
              >
                Leaderboard
              </button>
            </div>

            <div className="space-y-3">
              {trendingPhotographers.length > 0 ? (
                trendingPhotographers.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => navigate(`/profile/${p.id}`)}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-zinc-900 transition-colors group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-zinc-800">
                        <AvatarImage src={p.avatar} alt={p.name} className="object-cover" />
                        <AvatarFallback className="bg-zinc-800 text-xs">{p?.name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm text-zinc-200 group-hover:text-white">{p.name}</div>
                        <div className="text-xs text-zinc-500">Rank #{p.globalRank || 1} · {(p.points || 0).toLocaleString()} pts</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </button>
                ))
              ) : (
                <div className="text-sm text-zinc-500 p-4 text-center border border-dashed border-zinc-800 rounded-xl">
                  Join & post to rank!
                </div>
              )}
            </div>
          </div>

          {/* Footer links */}
          <div className="pt-4 border-t border-zinc-900">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-zinc-500 font-medium">
              <a href="#" className="hover:text-zinc-300">About</a>
              <a href="#" className="hover:text-zinc-300">Help</a>
              <a href="#" className="hover:text-zinc-300">Press</a>
              <a href="#" className="hover:text-zinc-300">API</a>
              <a href="#" className="hover:text-zinc-300">Jobs</a>
              <a href="#" className="hover:text-zinc-300">Privacy</a>
              <a href="#" className="hover:text-zinc-300">Terms</a>
            </div>
            <div className="text-[11px] text-zinc-600 mt-4">
              © 2026 LENSLEAGUE FROM APERTURE INC.
            </div>
          </div>

        </aside>
      </div>

      <NotificationsDrawer isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
