import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Bell, Calendar, Heart, ChevronRight, Star, MapPin } from 'lucide-react';
import Logo from '@/components/Logo';

export default function ClientHome() {
  const navigate = useNavigate();
  const { currentUser, photos, users } = useApp();
  
  const featured = users.slice(0, 4).map(u => ({ 
    ...u, 
    globalRank: u.global_rank || 1, 
    categories: ['Portrait'], 
    startingPrice: '$500', 
    avgRating: '5.0', 
    cover: u.avatar 
  }));

  return (
    <div className="min-h-screen bg-background text-zinc-400 p-4 pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-zinc-800">
            <AvatarImage src={currentUser?.avatar} alt={currentUser?.name} />
            <AvatarFallback>{currentUser?.name?.charAt(0) || 'C'}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-white font-bold text-lg">Welcome back, {currentUser?.name?.split(' ')[0] || 'Client'}</h1>
            <p className="text-zinc-500 text-sm">Let's find your perfect shot</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 rounded-xl relative" onClick={() => navigate('/client/inbox')}>
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent-primary"></span>
          </Button>
        </div>
      </header>

      {/* Quick Actions */}
      <section className="grid grid-cols-3 gap-3 mb-8">
        <Card className="bg-zinc-900/50 border-zinc-800/50 rounded-2xl cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={() => navigate('/client/search')}>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white mb-1">
              <Search className="h-5 w-5" />
            </div>
            <span className="text-white text-xs font-semibold">Find<br/>Pros</span>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800/50 rounded-2xl cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={() => navigate('/client/bookings')}>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white mb-1">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-white text-xs font-semibold">My<br/>Bookings</span>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800/50 rounded-2xl cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={() => navigate('/client/saved')}>
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white mb-1">
              <Heart className="h-5 w-5" />
            </div>
            <span className="text-white text-xs font-semibold">Saved<br/>Items</span>
          </CardContent>
        </Card>
      </section>

      {/* Featured Carousel */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-bold text-lg">Featured Photographers</h2>
          <Button variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => navigate('/client/search')}>
            See all <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x no-scrollbar">
          {featured.map(p => (
            <Card key={p.id} className="min-w-[240px] bg-zinc-900/50 border-zinc-800/50 rounded-2xl overflow-hidden cursor-pointer snap-start" onClick={() => navigate(`/profile/${p.id}`)}>
              <div className="h-32 bg-zinc-800 relative bg-cover bg-center" style={{ backgroundImage: `url(${p.cover})` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 to-transparent"></div>
                <Badge className="absolute top-2 left-2 bg-black/50 text-white backdrop-blur-md border-zinc-700">
                  Rank #{p.globalRank}
                </Badge>
              </div>
              <CardContent className="p-4 relative">
                <Avatar className="h-16 w-16 border-4 border-zinc-900 absolute -top-10 right-4">
                  <AvatarImage src={p.avatar} alt={p.name} />
                  <AvatarFallback>{p.name[0]}</AvatarFallback>
                </Avatar>
                <h3 className="text-white font-bold truncate pr-16">{p.name}</h3>
                <div className="flex items-center text-zinc-500 text-xs mt-1 mb-3">
                  <MapPin className="h-3 w-3 mr-1" /> {p.location}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-300 bg-zinc-800 py-1 px-2 rounded-md">{p.categories[0]}</span>
                  <div className="flex items-center text-yellow-500 font-medium">
                    <Star className="h-3 w-3 mr-1 fill-current" /> {p.avgRating}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Browse Work */}
      <section>
        <h2 className="text-white font-bold text-lg mb-4">Recent Inspiration</h2>
        <div className="grid grid-cols-2 gap-3">
          {photos.slice(0, 6).map(photo => (
            <div key={photo.id} className="relative rounded-2xl overflow-hidden cursor-pointer group" onClick={() => navigate(`/profile/${photo.ownerId}`)}>
              <img src={photo.url} alt={photo.caption} className="w-full object-cover transition-transform duration-500 group-hover:scale-105" style={{ aspectRatio: photo.aspectRatio || '3/4' }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 flex flex-col justify-end p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 border border-zinc-700">
                    <AvatarImage src={photo.ownerAvatar} />
                    <AvatarFallback>{photo.ownerName[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-white text-xs font-medium truncate">{photo.ownerName}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
