import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PhotoCard from '../../components/PhotoCard/PhotoCard';
import NotificationsDrawer from '../../components/Notifications/NotificationsDrawer';
import { useApp } from '../../context/AppContext';
import { PlusSquare, Inbox, Bell, Loader2, Sparkles, ChevronRight, Zap, Camera, ImageOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';

function BattleSpotlightCard({ battle }) {
  const navigate = useNavigate();
  return (
    <div 
      className="relative overflow-hidden bg-white border border-zinc-200 rounded-2xl mb-12 cursor-pointer group hover:border-zinc-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/5" 
      onClick={() => navigate('/compete/vote')} 
      id={`spotlight-${battle.id}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-white z-10 pointer-events-none" />
      
      <div className="relative z-20 flex items-center justify-between p-4 border-b border-zinc-200/50 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-950">Live Battle — {battle.category}</span>
        </div>
        <span className="text-xs font-medium text-zinc-500">{battle.totalVotes.toLocaleString()} votes · {battle.endsIn}</span>
      </div>

      <div className="relative flex aspect-[21/9]">
        <div className="w-1/2 h-full relative overflow-hidden">
          <img src={battle.photoA.url} alt={battle.photoA.photographerName} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
            <span className="text-sm font-semibold text-white drop-shadow-md">{battle.photoA.photographerName}</span>
          </div>
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-12 h-12 rounded-full bg-white border-4 border-white shadow-2xl transition-transform duration-300 group-hover:scale-110">
          <span className="text-sm font-black italic text-zinc-500">VS</span>
        </div>
        <div className="w-1/2 h-full relative overflow-hidden">
          <img src={battle.photoB.url} alt={battle.photoB.photographerName} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
            <span className="text-sm font-semibold text-white drop-shadow-md text-right w-full">{battle.photoB.photographerName}</span>
          </div>
        </div>
      </div>

      <div className="relative z-20 p-4 bg-white/50 backdrop-blur-sm text-center border-t border-zinc-200/50">
        <span className="text-sm font-semibold text-zinc-600 group-hover:text-zinc-950 transition-colors flex items-center justify-center gap-2">Tap to vote <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
      </div>
    </div>
  );
}

function SkeletonPhotoCard() {
  return (
    <div className="w-full bg-white border border-zinc-200 rounded-[2rem] overflow-hidden mb-8 shadow-sm">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-200 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 bg-zinc-200 rounded-md w-32 animate-pulse" />
            <div className="h-3 bg-zinc-100 rounded-md w-20 animate-pulse" />
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-zinc-100 animate-pulse" />
      </div>
      {/* The main image placeholder with a subtle shimmer gradient */}
      <div className="w-full aspect-[4/5] bg-gradient-to-tr from-zinc-100 via-zinc-200 to-zinc-100 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_linear]" />
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <div className="w-6 h-6 rounded-full bg-zinc-200 animate-pulse" />
            <div className="w-6 h-6 rounded-full bg-zinc-200 animate-pulse" />
            <div className="w-6 h-6 rounded-full bg-zinc-200 animate-pulse" />
          </div>
          <div className="w-6 h-6 rounded-full bg-zinc-200 animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-zinc-200 rounded-md w-3/4 animate-pulse" />
          <div className="h-4 bg-zinc-100 rounded-md w-1/2 animate-pulse" />
        </div>
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

  // Track whether we've already loaded for the current tab so navigating
  // away and back doesn't cause a full reset/flicker
  const loadedTabRef = useRef(null);

  useEffect(() => {
    // Don't re-fetch if we already have data for this tab (prevents flicker on tab switch in shell)
    if (loadedTabRef.current === tab && feedPhotos.length > 0) return;

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
        loadedTabRef.current = tab;
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
  // Only depend on tab — fetchPhotosPaginated is now stable via useCallback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);


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
    <div className="min-h-screen bg-zinc-50 text-zinc-950 pb-20 md:pb-0 font-sans selection:bg-zinc-200">
      
      <header className="sticky top-0 z-40 md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-3xl border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <Logo withText={true} className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/upload')} className="text-zinc-500 hover:text-zinc-950 hover:scale-110 active:scale-95 transition-all">
            <PlusSquare className="w-6 h-6" />
          </button>
          <button onClick={() => navigate('/inbox')} className="text-zinc-500 hover:text-zinc-950 hover:scale-110 active:scale-95 transition-all relative">
            <Inbox className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white" />
          </button>
          <button onClick={() => setNotifOpen(true)} className="text-zinc-500 hover:text-zinc-950 hover:scale-110 active:scale-95 transition-all relative">
            <Bell className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white" />
          </button>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto md:px-6 lg:px-12 md:py-8 lg:grid lg:grid-cols-[1fr_360px] lg:gap-16">
        
        <main className="w-full max-w-3xl mx-auto lg:mx-0 lg:ml-auto">
          
          <div className="flex items-center justify-between mb-8 px-4 md:px-0">
            <h1 className="text-3xl font-extrabold tracking-tight hidden md:block">Feed</h1>
            
            <div className="flex items-center p-1 bg-white shadow-sm backdrop-blur-md rounded-full border border-zinc-200 mx-auto md:mx-0">
              {FEED_TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-8 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all duration-300",
                    tab === t 
                      ? "bg-zinc-950 text-white shadow-lg shadow-zinc-950/20 scale-105" 
                      : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 active:scale-95"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6 md:space-y-12">
            {loading && feedPhotos.length === 0 ? (
              <div className="animate-in fade-in duration-500 space-y-8">
                <div className="flex items-center justify-center gap-2 text-zinc-500 font-medium pb-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading your feed...
                </div>
                <SkeletonPhotoCard />
                <SkeletonPhotoCard />
                <SkeletonPhotoCard />
              </div>
            ) : feedPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center border border-zinc-200 rounded-[2rem] bg-white shadow-sm backdrop-blur-sm transition-all">
                <div className="w-24 h-24 bg-gradient-to-tr from-zinc-100 to-zinc-50 rounded-full flex items-center justify-center mb-8 shadow-inner border border-zinc-200">
                  <ImageOff className="w-10 h-10 text-zinc-400" />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight mb-4 text-zinc-950">
                  {tab === 'Following' ? 'Your Timeline is Quiet' : 'Welcome to the Feed'}
                </h2>
                <p className="text-zinc-500 text-sm max-w-sm mb-8 leading-relaxed">
                  {tab === 'Following' 
                    ? 'Follow more photographers to see their latest shoots and video clips appear here.' 
                    : 'Be the first photographer to post today. Share your high-res photos or video clips.'}
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Button 
                    onClick={() => navigate('/upload')}
                    className="bg-zinc-950 text-white hover:bg-zinc-800 font-bold rounded-full px-8 transition-all hover:scale-105 active:scale-95"
                  >
                    Upload Shoot
                  </Button>
                  {tab === 'Following' && (
                    <Button 
                      variant="outline"
                      onClick={() => setTab('For You')}
                      className="border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 rounded-full px-8 transition-all hover:scale-105 active:scale-95"
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

            {loading && feedPhotos.length > 0 && (
              <div className="py-8">
                <SkeletonPhotoCard />
              </div>
            )}

            {hasMore && !loading && feedPhotos.length > 0 && (
              <div ref={lastPhotoRef} className="py-12 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center shadow-sm">
                  <RefreshCw className="w-5 h-5 text-zinc-500 animate-spin" />
                </div>
              </div>
            )}
            
            {!hasMore && feedPhotos.length > 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-zinc-500 space-y-3">
                <div className="w-2 h-2 bg-zinc-300 rounded-full" />
                <span className="text-sm font-medium">You're all caught up</span>
              </div>
            )}
          </div>
        </main>

        <aside className="hidden lg:block space-y-12 sticky top-12 h-fit pr-4">
          
          {currentUser && (
            <div className="flex items-center justify-between bg-white p-5 rounded-[2rem] border border-zinc-200 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50">
              <button 
                onClick={() => navigate(`/profile/${currentUser.id}`)}
                className="flex items-center gap-4 group text-left"
              >
                <Avatar className="w-14 h-14 ring-2 ring-transparent group-hover:ring-primary/50 transition-all duration-300">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} className="object-cover" />
                  <AvatarFallback className="bg-zinc-100 text-zinc-600 font-bold">{currentUser?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-extrabold text-base group-hover:text-zinc-950 transition-colors">{currentUser?.name || 'User'}</div>
                  <div className="text-zinc-500 text-sm mt-0.5 font-medium">@{currentUser?.handle || currentUser?.name?.toLowerCase().replace(' ', '') || 'user'}</div>
                </div>
              </button>
              <button className="text-xs font-bold text-primary hover:text-primary transition-colors px-4 py-2 rounded-full hover:bg-primary/10 active:scale-95">Switch</button>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-500">
                <Sparkles className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-bold tracking-widest uppercase">Active Challenges</span>
              </div>
              <button 
                onClick={() => navigate('/compete/challenges')}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-950 transition-colors"
              >
                See All
              </button>
            </div>
            
            <div className="space-y-4">
              {activeChallenges.length > 0 ? (
                activeChallenges.map(c => (
                  <button 
                    key={c.id}
                    onClick={() => navigate('/compete/challenges')}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl border border-transparent hover:bg-zinc-50 transition-all duration-300 group text-left"
                  >
                    <div className="w-16 h-16 rounded-[1rem] overflow-hidden shrink-0 shadow-sm border border-zinc-200">
                      <img src={c.coverUrl} alt={c.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="font-extrabold text-sm truncate text-zinc-950 transition-colors">{c.title}</div>
                      <div className="text-xs text-zinc-500 mt-1 truncate font-medium">
                        <span className="text-primary">💎 {c.prizePoints} pts</span> · {c.entries} entries
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-sm font-medium text-zinc-600 p-4 text-left">
                  No active challenges right now.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold tracking-widest uppercase text-zinc-500">
                Top Standings
              </div>
              <button 
                onClick={() => navigate('/leaderboard')}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-950 transition-colors"
              >
                Leaderboard
              </button>
            </div>

            <div className="space-y-2">
              {trendingPhotographers.length > 0 ? (
                trendingPhotographers.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => navigate(`/profile/${p.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-transparent hover:bg-zinc-50 transition-all duration-300 group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 ring-2 ring-transparent group-hover:ring-zinc-200 transition-all">
                        <AvatarImage src={p.avatar} alt={p.name} className="object-cover" />
                        <AvatarFallback className="bg-zinc-100 text-zinc-600 font-bold text-xs">{p?.name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-extrabold text-sm text-zinc-950 transition-colors">{p.name}</div>
                        <div className="text-xs text-zinc-500 mt-0.5 font-medium">Rank #{p.globalRank || 1} · {(p.points || 0).toLocaleString()} pts</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950 group-hover:translate-x-1 transition-all" />
                  </button>
                ))
              ) : (
                <div className="text-sm font-medium text-zinc-600 p-4 text-left">
                  Join & post to rank!
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-200">
            <div className="flex flex-wrap gap-x-4 gap-y-3 text-[12px] text-zinc-500 font-medium">
              <a href="#" className="hover:text-zinc-950 transition-colors">About</a>
              <a href="#" className="hover:text-zinc-950 transition-colors">Help</a>
              <a href="#" className="hover:text-zinc-950 transition-colors">Press</a>
              <a href="#" className="hover:text-zinc-950 transition-colors">API</a>
              <a href="#" className="hover:text-zinc-950 transition-colors">Jobs</a>
              <a href="#" className="hover:text-zinc-950 transition-colors">Privacy</a>
              <a href="#" className="hover:text-zinc-950 transition-colors">Terms</a>
            </div>
            <div className="text-[12px] text-zinc-600 mt-6 font-medium">
              © 2026 LENSLEAGUE FROM APERTURE INC.
            </div>
          </div>

        </aside>
      </div>

      <NotificationsDrawer isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
