import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Search } from 'lucide-react';

export default function ClientSaved() {
  const navigate = useNavigate();
  const { photos, savedItemIds, toggleSavedItem } = useApp();
  
  const savedPhotos = photos.filter(photo => savedItemIds.includes(photo.id));

  return (
    <div className="min-h-screen bg-background text-muted-foreground p-4 pb-24 animate-in fade-in duration-500">
      <header className="mb-6">
        <h1 className="text-foreground font-bold text-2xl">Saved Inspiration</h1>
        <p className="text-muted-foreground text-sm mt-1">{savedPhotos.length} items saved</p>
      </header>

      {savedPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="h-16 w-16 rounded-full bg-card border border-border flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-foreground" />
          </div>
          <h2 className="text-foreground text-lg font-bold mb-2">No saved items yet</h2>
          <p className="text-muted-foreground mb-6 max-w-[250px]">Heart your favorite photos and photographers to save them here for later.</p>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl" onClick={() => navigate('/client/search')}>
            <Search className="h-4 w-4 mr-2" /> Browse Inspiration
          </Button>
        </div>
      ) : (
        <div className="columns-2 gap-3 space-y-3">
          {savedPhotos.map(p => (
            <div 
              key={p.id} 
              className="break-inside-avoid relative rounded-2xl overflow-hidden cursor-pointer group"
              onClick={() => navigate(`/profile/${p.ownerId}`)}
            >
              <img 
                src={p.url} 
                alt={p.caption} 
                className="w-full object-cover transition-transform duration-500 group-hover:scale-105" 
                style={p.aspectRatio ? { aspectRatio: p.aspectRatio } : undefined} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 flex flex-col justify-end p-3">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute top-2 right-2 h-8 w-8 bg-black/40 backdrop-blur-md rounded-full text-foreground hover:bg-black/60 hover:text-red-500 border border-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSavedItem(p.id);
                  }}
                >
                  <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                </Button>
                
                <div className="flex items-center gap-2 mt-auto">
                  <Avatar className="h-7 w-7 border border-border">
                    <AvatarImage src={p.ownerAvatar} />
                    <AvatarFallback>{p.ownerName[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-foreground text-xs font-medium truncate drop-shadow-md">{p.ownerName}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
