import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PhotoCard from '../../components/PhotoCard/PhotoCard';
import FeedPost from '../../components/FeedPost/FeedPost';
import Lightbox from '../../components/Lightbox/Lightbox';
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
      className="relative overflow-hidden bg-card border border-border rounded-2xl mb-12 cursor-pointer group hover:border-border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/20"
      onClick={() => navigate('/compete/vote')} 
      id={`spotlight-${battle.id}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background z-10 pointer-events-none" />
      
      <div className="relative z-20 flex items-center justify-between p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-foreground">Live Battle — {battle.category}</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{battle.totalVotes.toLocaleString()} votes · {battle.endsIn}</span>
      </div>

      <div className="relative flex aspect-[16/9] md:aspect-[21/9]">
        <div className="w-1/2 h-full relative overflow-hidden">
          <img src={battle.photoA.url} alt={battle.photoA.photographerName} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex items-end p-4">
            <span className="text-sm font-semibold text-foreground drop-shadow-md">{battle.photoA.photographerName}</span>
          </div>
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-12 h-12 rounded-full bg-background border-4 border-border shadow-2xl transition-transform duration-300 group-hover:scale-110">
          <span className="text-sm font-black italic text-muted-foreground">VS</span>
        </div>
        <div className="w-1/2 h-full relative overflow-hidden">
          <img src={battle.photoB.url} alt={battle.photoB.photographerName} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex items-end p-4">
            <span className="text-sm font-semibold text-foreground drop-shadow-md text-right w-full">{battle.photoB.photographerName}</span>
          </div>
        </div>
      </div>

      <div className="relative z-20 p-4 bg-card/50 backdrop-blur-sm text-center border-t border-border/50">
        <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors flex items-center justify-center gap-2">Tap to vote <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
      </div>
    </div>
  );
}

function SkeletonPhotoCard() {
  return (
    <div className="w-full bg-background border border-border rounded-[2rem] overflow-hidden mb-8 shadow-sm">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded-md w-32 animate-pulse" />
            <div className="h-3 bg-card rounded-md w-20 animate-pulse" />
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-card animate-pulse" />
      </div>
      {/* The main image placeholder with a subtle shimmer gradient */}
      <div className="w-full aspect-[4/5] bg-gradient-to-tr from-card via-muted to-card bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_linear]" />
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
            <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
            <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded-md w-3/4 animate-pulse" />
          <div className="h-4 bg-card rounded-md w-1/2 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// 1d puts the region alongside the two feed sources.
const FEED_TABS = ['Following', 'For You', 'Ghana'];

export default function FeedPage() {
  const [tab, setTab] = useState('For You');
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const { fetchPhotosPaginated, battles, challenges, users, currentUser, unreadNotificationCount } = useApp();

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
    <div className="min-h-screen bg-background text-foreground pb-6 font-sans md:pb-0">
      
      <header className="sticky top-0 z-40 md:hidden flex items-center justify-between p-4 bg-background/80 backdrop-blur-3xl border-b border-border">
        <div className="flex items-center gap-2">
          <Logo withText={true} className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/upload')} className="text-muted-foreground hover:text-foreground hover:scale-110 active:scale-95 transition-all">
            <PlusSquare className="w-6 h-6" />
          </button>
          <button onClick={() => navigate('/inbox')} className="text-muted-foreground hover:text-foreground hover:scale-110 active:scale-95 transition-all relative">
            <Inbox className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-border" />
          </button>
          {/* The dot here used to be unconditional - it announced unread
              notifications whether or not any existed. It is now a real count,
              and it is absent when there is nothing to report. */}
          <button
            onClick={() => setNotifOpen(true)}
            aria-label={unreadNotificationCount > 0
              ? `Notifications, ${unreadNotificationCount} unread`
              : 'Notifications'}
            className="text-muted-foreground hover:text-foreground hover:scale-110 active:scale-95 transition-all relative"
          >
            <Bell className="w-6 h-6" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold tabular-nums rounded-full border-2 border-border">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto md:px-6 lg:px-12 md:py-8 lg:grid lg:grid-cols-[1fr_360px] lg:gap-16">
        
        <main className="w-full max-w-3xl mx-auto lg:mx-0 lg:ml-auto">
          
          <div className="mb-5 flex items-center justify-between px-5 md:mb-8 md:px-0">
            <h1 className="text-3xl font-extrabold tracking-tight hidden md:block">Feed</h1>
            
            <div className="flex items-center gap-4">
              {FEED_TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'text-[13px] font-semibold transition-colors',
                    tab === t ? 'text-foreground' : 'text-foreground/[.38] hover:text-white/70'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-[18px] md:space-y-10">
            {loading && feedPhotos.length === 0 ? (
              <div className="animate-in fade-in duration-500 space-y-8">
                <div className="flex items-center justify-center gap-2 text-muted-foreground font-medium pb-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading your feed...
                </div>
                <SkeletonPhotoCard />
                <SkeletonPhotoCard />
                <SkeletonPhotoCard />
              </div>
            ) : feedPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center border border-border rounded-[2rem] bg-card shadow-sm backdrop-blur-sm transition-all">
                <div className="w-24 h-24 bg-gradient-to-tr from-muted to-card rounded-full flex items-center justify-center mb-8 shadow-inner border border-border">
                  <ImageOff className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight mb-4 text-foreground">
                  {tab === 'Following' ? 'Your Timeline is Quiet' : 'Welcome to the Feed'}
                </h2>
                <p className="text-muted-foreground text-sm max-w-sm mb-8 leading-relaxed">
                  {tab === 'Following' 
                    ? 'Follow more photographers to see their latest shoots and video clips appear here.' 
                    : 'Be the first photographer to post today. Share your high-res photos or video clips.'}
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Button 
                    onClick={() => navigate('/upload')}
                    className="bg-card text-foreground hover:bg-muted font-bold rounded-full px-8 transition-all hover:scale-105 active:scale-95"
                  >
                    Upload Shoot
                  </Button>
                  {tab === 'Following' && (
                    <Button 
                      variant="outline"
                      onClick={() => setTab('For You')}
                      className="border-border text-foreground hover:bg-muted hover:text-foreground rounded-full px-8 transition-all hover:scale-105 active:scale-95"
                    >
                      Explore Creators
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              feedItems.map((item, index) =>
                item.type === 'photo'
                  ? <FeedPost
                      key={item.data.id}
                      photo={item.data}
                      onOpen={() => setLightboxIndex(feedPhotos.findIndex(ph => ph.id === item.data.id))}
                    />
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
                <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
                  <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
                </div>
              </div>
            )}
            
            {!hasMore && feedPhotos.length > 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground space-y-3">
                <div className="w-2 h-2 bg-muted rounded-full" />
                <span className="text-sm font-medium">You're all caught up</span>
              </div>
            )}
          </div>
        </main>

        <aside className="hidden lg:block space-y-12 sticky top-12 h-fit pr-4">
          
          {currentUser && (
            <div className="flex items-center justify-between bg-background p-5 rounded-[2rem] border border-border shadow-sm transition-all hover:border-border hover:bg-card">
              <button 
                onClick={() => navigate(`/profile/${currentUser.id}`)}
                className="flex items-center gap-4 group text-left"
              >
                <Avatar className="w-14 h-14 ring-2 ring-transparent group-hover:ring-white/50 transition-all duration-300">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} className="object-cover" />
                  <AvatarFallback className="bg-muted text-muted-foreground font-bold">{currentUser?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-extrabold text-base group-hover:text-foreground text-foreground transition-colors">{currentUser?.name || 'User'}</div>
                  <div className="text-muted-foreground text-sm mt-0.5 font-medium">@{currentUser?.handle || currentUser?.name?.toLowerCase().replace(' ', '') || 'user'}</div>
                </div>
              </button>
              <button className="text-xs font-bold text-foreground hover:text-foreground transition-colors px-4 py-2 rounded-full hover:bg-muted active:scale-95">Switch</button>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold tracking-widest uppercase">Active Challenges</span>
              </div>
              <button 
                onClick={() => navigate('/compete/challenges')}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
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
                    className="w-full flex items-center gap-4 p-3 rounded-2xl border border-transparent hover:bg-card transition-all duration-300 group text-left"
                  >
                    <div className="w-16 h-16 rounded-[1rem] overflow-hidden shrink-0 shadow-sm border border-border">
                      <img src={c.coverUrl} alt={c.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="font-extrabold text-sm truncate text-foreground transition-colors">{c.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 truncate font-medium">
                        <span className="text-foreground">💎 {c.prizePoints} pts</span> · {c.entries} entries
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-sm font-medium text-muted-foreground p-4 text-left">
                  No active challenges right now.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {/* Was a standings panel linking to a leaderboard the product
                  deliberately does not publish (docs/PRODUCT.md), above a rank
                  line whose fallback turned "unranked" into "first" - so three
                  photographers on zero points were each shown as number one. */}
              <div className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
                Photographers
              </div>
              <button 
                onClick={() => navigate('/discover')}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Explore
              </button>
            </div>

            <div className="space-y-2">
              {trendingPhotographers.length > 0 ? (
                trendingPhotographers.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => navigate(`/profile/${p.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-transparent hover:bg-card transition-all duration-300 group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 ring-2 ring-transparent group-hover:ring-border transition-all">
                        <AvatarImage src={p.avatar} alt={p.name} className="object-cover" />
                        <AvatarFallback className="bg-muted text-muted-foreground font-bold text-xs">{p?.name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-extrabold text-sm text-foreground transition-colors">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                          {p.points > 0
                            ? `${p.points.toLocaleString()} pts`
                            : (p.location || 'New here')}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                  </button>
                ))
              ) : (
                <div className="text-sm font-medium text-muted-foreground p-4 text-left">
                  Join & post to rank!
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <div className="flex flex-wrap gap-x-4 gap-y-3 text-[12px] text-muted-foreground font-medium">
              <a href="#" className="hover:text-foreground transition-colors">About</a>
              <a href="#" className="hover:text-foreground transition-colors">Help</a>
              <a href="#" className="hover:text-foreground transition-colors">Press</a>
              <a href="#" className="hover:text-foreground transition-colors">API</a>
              <a href="#" className="hover:text-foreground transition-colors">Jobs</a>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link to="/guidelines" className="hover:text-foreground transition-colors">Guidelines</Link>
            </div>
            <div className="text-[12px] text-muted-foreground mt-6 font-medium">
              © 2026 NOBLE STATURE STUDIOS
            </div>
          </div>

        </aside>
      </div>

      {lightboxIndex !== null && lightboxIndex >= 0 && (
        <Lightbox
          photos={feedPhotos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <NotificationsDrawer isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
