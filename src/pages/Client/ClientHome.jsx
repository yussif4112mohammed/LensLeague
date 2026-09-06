import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Bell, Calendar, Heart, ChevronRight, Star, MapPin, Users, ImageOff } from 'lucide-react';
import Logo from '@/components/Logo';

export default function ClientHome() {
  const navigate = useNavigate();
  const { currentUser, photos, users } = useApp();
  
  // Every field here used to be invented: each photographer was shown as
  // "Portrait", "$500" and a 5.0 star rating regardless of who they were. A
  // client comparing photographers was comparing three constants. Nothing is
  // shown now unless the database holds it.
  const featured = users
    .filter(u => (u.role || u.account_type) !== 'client')
    .slice(0, 4)
    .map(u => ({
      ...u,
      // Ranking is awarded by the database; absent means unranked, and the UI
      // hides the badge rather than defaulting anyone to first.
      globalRank: u.global_rank ?? null,
      // Their own stated specialisms, in their own order.
      category: (u.service_categories?.[0]) || (u.specialties?.[0]) || null,
      // A rating with no reviews behind it is not a rating.
      rating: u.review_count > 0 ? Number(u.rating).toFixed(1) : null,
      reviewCount: u.review_count || 0,
      cover: u.cover_url || u.avatar_url || u.avatar || null,
    }));

  return (
    <div className="min-h-screen bg-background text-muted-foreground p-4 pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-border">
            <AvatarImage src={currentUser?.avatar} alt={currentUser?.name} />
            <AvatarFallback>{currentUser?.name?.charAt(0) || 'C'}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-foreground font-bold text-lg">Welcome back, {currentUser?.name?.split(' ')[0] || 'Client'}</h1>
            <p className="text-muted-foreground text-sm">Let's find your perfect shot</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="bg-card border-border text-foreground hover:bg-muted rounded-xl relative" onClick={() => navigate('/client/inbox')}>
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent-primary"></span>
          </Button>
        </div>
      </header>

      {/* Quick Actions */}
      <section className="grid grid-cols-3 gap-3 mb-8">
        <Card className="bg-card/50 border-border/50 rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/client/search')}>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-foreground mb-1">
              <Search className="h-5 w-5" />
            </div>
            <span className="text-foreground text-xs font-semibold">Find<br/>Pros</span>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50 rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/client/bookings')}>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-foreground mb-1">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-foreground text-xs font-semibold">My<br/>Bookings</span>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50 rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/client/saved')}>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-foreground mb-1">
              <Heart className="h-5 w-5" />
            </div>
            <span className="text-foreground text-xs font-semibold">Saved<br/>Items</span>
          </CardContent>
        </Card>
      </section>

      {/* Featured Carousel */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-foreground font-bold text-lg">Featured Photographers</h2>
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => navigate('/client/search')}>
            See all <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        {featured.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
            <Users className="h-7 w-7 text-muted-foreground/50" strokeWidth={1.4} />
            <p className="text-sm font-semibold text-foreground">No photographers yet</p>
            <p className="max-w-[300px] text-xs leading-relaxed text-muted-foreground">
              As photographers join, they will appear here with the work they have
              published.
            </p>
          </div>
        ) : (
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x no-scrollbar">
          {featured.map(p => (
            <Card key={p.id} className="min-w-[240px] bg-card/50 border-border/50 rounded-2xl overflow-hidden cursor-pointer snap-start" onClick={() => navigate(`/profile/${p.id}`)}>
              <div className="h-32 bg-muted relative bg-cover bg-center" style={{ backgroundImage: `url(${p.cover})` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent"></div>
                {/* Only badge a rank the photographer actually holds. This
                    printed "Rank #" followed by nothing for everyone unranked,
                    which is every photographer until battles start resolving. */}
                {p.globalRank ? (
                  <Badge className="absolute top-2 left-2 bg-black/50 text-foreground backdrop-blur-md border-border">
                    Rank #{p.globalRank}
                  </Badge>
                ) : null}
              </div>
              <CardContent className="p-4 relative">
                <Avatar className="h-16 w-16 border-4 border-border absolute -top-10 right-4">
                  <AvatarImage src={p.avatar} alt={p.name} />
                  <AvatarFallback>{(p.name || p.username || '?').charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h3 className="text-foreground font-bold truncate pr-16">{p.name}</h3>
                <div className="flex items-center text-muted-foreground text-xs mt-1 mb-3">
                  <MapPin className="h-3 w-3 mr-1" /> {p.location}
                </div>
                <div className="flex justify-between items-center gap-2 text-xs">
                  {p.category ? (
                    <span className="truncate text-foreground bg-muted py-1 px-2 rounded-md">{p.category}</span>
                  ) : (
                    <span className="truncate text-muted-foreground">Photographer</span>
                  )}
                  {p.rating && (
                    <div className="flex shrink-0 items-center font-medium text-foreground">
                      <Star className="h-3 w-3 mr-1 fill-current" /> {p.rating}
                      <span className="ml-1 text-muted-foreground">({p.reviewCount})</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </section>

      {/* Browse Work */}
      <section>
        <h2 className="text-foreground font-bold text-lg mb-4">Recent Inspiration</h2>
        {photos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
            <ImageOff className="h-7 w-7 text-muted-foreground/50" strokeWidth={1.4} />
            <p className="text-sm font-semibold text-foreground">Nothing published yet</p>
            <p className="max-w-[300px] text-xs leading-relaxed text-muted-foreground">
              Photographs appear here as photographers publish them. Check back
              shortly.
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.slice(0, 6).map(photo => (
            <div key={photo.id} className="relative rounded-2xl overflow-hidden cursor-pointer group" onClick={() => navigate(`/profile/${photo.ownerId}`)}>
              <img src={photo.url} alt={photo.caption} className="w-full object-cover transition-transform duration-500 group-hover:scale-105" style={{ aspectRatio: photo.aspectRatio || '3/4' }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 flex flex-col justify-end p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 border border-border">
                    <AvatarImage src={photo.ownerAvatar} />
                    <AvatarFallback>{(photo.ownerName || '?').charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-foreground text-xs font-medium truncate">{photo.ownerName}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </section>
    </div>
  );
}
