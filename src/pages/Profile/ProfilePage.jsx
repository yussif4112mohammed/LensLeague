import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PhotoCard from '../../components/PhotoCard/PhotoCard';
import CommentSheet from '../../components/CommentSheet/CommentSheet';
import { supabase } from '../../lib/supabaseClient';
import { Camera, SearchX, LogIn, ImageOff, MessageSquare, Plus, Edit2, History } from 'lucide-react';
import './ProfilePage.css';

function PhotoDetailModal({ photo, onClose, onNavigateProfile }) {
  const { currentUser, toggleLikePost } = useApp();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(photo?.likes || 0);
  const [showComments, setShowComments] = useState(false);

  // Check if current user has already liked this photo
  useEffect(() => {
    if (!currentUser || !photo) return;
    const checkLiked = async () => {
      try {
        const { data } = await supabase
          .from('likes')
          .select('user_id')
          .eq('user_id', currentUser.id)
          .eq('item_id', photo.id)
          .maybeSingle();
        if (data) setLiked(true);
      } catch (e) { /* ignore */ }
    };
    checkLiked();
  }, [currentUser, photo]);

  if (!photo) return null;

  const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
        <Card className="max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row bg-card shadow-2xl border-border/50 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
          <div className="relative flex-1 bg-black/90 flex items-center justify-center overflow-hidden min-h-[300px] md:min-h-0">
            <img src={photo.url} alt={photo.caption} className="max-w-full max-h-full object-contain" />
            <button className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-black text-white rounded-full transition-colors md:hidden" onClick={onClose}>✕</button>
          </div>
          
          <div className="w-full md:w-[380px] flex flex-col bg-card border-l border-border/40">
            <div className="p-4 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { onClose(); onNavigateProfile?.(); }}>
                <Avatar className="h-10 w-10 border border-border group-hover:border-zinc-500 transition-colors">
                  <AvatarImage src={photo.ownerAvatar} />
                  <AvatarFallback>{photo.ownerName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-sm leading-tight group-hover:text-primary transition-colors">{photo.ownerName}</div>
                  {photo.location && <div className="text-xs text-muted-foreground">{photo.location}</div>}
                </div>
              </div>
              <button className="hidden md:block p-2 text-muted-foreground hover:text-foreground hover:scale-110 transition-all" onClick={onClose}>✕</button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {photo.caption && (
                <p className="text-sm mb-4">
                  <span className="font-bold mr-2">{photo.ownerName}</span>
                  {photo.caption}
                </p>
              )}
              {photo.gear && <p className="text-sm text-muted-foreground mb-2">📷 {photo.gear}</p>}
              {photo.category && <Badge variant="secondary" className="mb-4">#{photo.category?.toLowerCase()}</Badge>}
            </div>

            <div className="p-4 border-t border-border/40">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <button className={`hover:scale-110 active:scale-95 transition-transform ${liked ? 'text-red-500' : 'text-foreground'}`} onClick={() => { 
                    setLiked(!liked); 
                    setLikeCount(c => liked ? c - 1 : c + 1);
                    toggleLikePost(photo.id);
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </button>
                  <button className="hover:scale-110 active:scale-95 transition-transform" onClick={() => setShowComments(true)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                </div>
                <button className={`hover:scale-110 active:scale-95 transition-transform ${saved ? 'text-primary' : 'text-foreground'}`} onClick={() => setSaved(!saved)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                </button>
              </div>
              {likeCount > 0 && <div className="text-sm font-bold mb-1">{fmt(likeCount)} likes</div>}
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowComments(true)}>
                View all {fmt(photo.comments || 24)} comments
              </button>
            </div>
          </div>
        </Card>
      </div>
      {showComments && <CommentSheet photo={photo} onClose={() => setShowComments(false)} />}
    </>
  );
}

function SkeletonProfile() {
  return (
    <div className="w-full min-h-screen bg-background animate-pulse pb-20">
      <div className="relative h-64 md:h-80 w-full bg-zinc-900 border-b border-border/50" />
      <div className="max-w-5xl mx-auto px-6 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between mb-8">
          <div className="flex items-end gap-6">
            <div className="h-32 w-32 rounded-full bg-zinc-800 border-4 border-background shadow-xl" />
            <div className="pb-2 space-y-3">
              <div className="h-8 w-48 bg-zinc-800 rounded-md" />
              <div className="h-4 w-32 bg-zinc-800 rounded-md" />
            </div>
          </div>
          <div className="pb-2">
            <div className="h-10 w-32 bg-zinc-800 rounded-full" />
          </div>
        </div>
        <div className="space-y-3 mb-8 max-w-3xl">
          <div className="h-4 w-full bg-zinc-800 rounded-md" />
          <div className="h-4 w-5/6 bg-zinc-800 rounded-md" />
          <div className="h-4 w-4/6 bg-zinc-800 rounded-md" />
        </div>
        <div className="flex gap-4 mb-12">
          <div className="h-8 w-24 bg-zinc-800 rounded-xl" />
          <div className="h-8 w-24 bg-zinc-800 rounded-xl" />
          <div className="h-8 w-24 bg-zinc-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-border/50 rounded-3xl bg-card/30 transition-all hover:bg-card/50 my-8">
      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6 shadow-inner border border-border/50">
        <Icon className="w-10 h-10 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-3">{title}</h2>
      <p className="text-muted-foreground text-sm max-w-sm mb-8 leading-relaxed">
        {desc}
      </p>
      {action && action}
    </div>
  );
}

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addBookingRequest, users, updateProfile, follows, followUser, unfollowUser, currentUser, photos } = useApp();
  
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [customMilestones, setCustomMilestones] = useState([]);
  
  const [fetchedUser, setFetchedUser] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (id === 'me') return;
    if (currentUser && id === currentUser.id) return;
    if (users.find(p => p.id === id)) return;
    
    const fetchProfile = async () => {
      setLoadingProfile(true);
      const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (data) setFetchedUser(data);
      setLoadingProfile(false);
    };
    fetchProfile();
  }, [id, currentUser, users]);

  let photographer = (currentUser && (id === currentUser.id || id === 'me')) ? currentUser : users.find(p => p.id === id);
  if (!photographer) photographer = fetchedUser;

  const isOwnProfile = currentUser && (id === currentUser.id || id === 'me');

  const [bookingForm, setBookingForm] = useState({ date: '', budget: '', location: '', message: '' });
  const [editForm, setEditForm] = useState({ 
    name: '', username: '', bio: '', location: '', 
    starting_rate: '', availability_status: '', service_categories: '' 
  });
  const [milestoneForm, setMilestoneForm] = useState({ title: '', desc: '', date: '', icon: '📷' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (photographer) {
      setEditForm({
        name: photographer.name || '',
        username: photographer.username || '',
        bio: photographer.bio || '',
        location: photographer.location || '',
        starting_rate: photographer.starting_rate || '',
        availability_status: photographer.availability_status || '',
        service_categories: (photographer.service_categories || []).join(', ')
      });
      setAvatarPreview(photographer.avatar);
      setAvatarFile(null);
    }
  }, [photographer]);

  const [isMeLoading, setIsMeLoading] = useState(id === 'me');
  useEffect(() => {
    if (id === 'me') {
      if (currentUser) setIsMeLoading(false);
      else {
        const timer = setTimeout(() => setIsMeLoading(false), 2000);
        return () => clearTimeout(timer);
      }
    } else {
      setIsMeLoading(false);
    }
  }, [id, currentUser]);

  if (!photographer) {
    if (loadingProfile || isMeLoading) return <SkeletonProfile />;
    if (!currentUser && id === 'me') return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
        <EmptyState 
          icon={LogIn} 
          title="Log In Required" 
          desc="You need to be logged in to view and edit your profile."
          action={
            <Button className="rounded-full px-8 hover:scale-105 active:scale-95 transition-all" onClick={() => navigate('/login')}>Sign In</Button>
          }
        />
      </div>
    );
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
        <EmptyState 
          icon={SearchX} 
          title="Profile Not Found" 
          desc="This creator doesn't exist or hasn't set up their profile yet."
          action={
            <Button variant="outline" className="rounded-full px-8 hover:scale-105 active:scale-95 transition-all" onClick={() => navigate('/feed')}>Return to Feed</Button>
          }
        />
      </div>
    );
  }

  const userPhotos = photos.filter(p => p.ownerId === photographer.id);
  const userReviews = photographer.reviews || [];

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    addBookingRequest(photographer.id, bookingForm);
    setBookingSuccess(true);
    setTimeout(() => {
      setBookingModalOpen(false);
      setBookingSuccess(false);
      setBookingForm({ date: '', budget: '', location: '', message: '' });
    }, 2000);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSavingEdit(true);
    let newAvatarUrl = null;
    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `avatars/${currentUser.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile);
      if (!uploadError) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        newAvatarUrl = data.publicUrl;
      }
    }
    const updateData = { ...editForm };
    if (updateData.starting_rate) updateData.starting_rate = parseInt(updateData.starting_rate, 10);
    if (updateData.service_categories) {
      updateData.service_categories = updateData.service_categories.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (newAvatarUrl) updateData.avatar = newAvatarUrl;
    updateProfile(photographer.id, updateData);
    setIsSavingEdit(false);
    setEditModalOpen(false);
  };

  const isFollowing = currentUser && follows.some(f => f.follower_id === currentUser.id && f.following_id === photographer.id);

  return (
    <div className="w-full min-h-screen bg-background text-foreground animate-in fade-in pb-20 selection:bg-zinc-800">
      
      {/* Cover */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden group">
        {photographer.cover ? (
          <img src={photographer.cover} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Cover" />
        ) : (
          <div className="w-full h-full bg-zinc-900 border-b border-border/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
        
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
          <Button variant="secondary" size="icon" className="rounded-full bg-background/50 hover:bg-background/80 backdrop-blur-md hover:scale-110 active:scale-95 transition-all" onClick={() => navigate(-1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </Button>
          {isOwnProfile && (
            <Button variant="secondary" size="icon" className="rounded-full bg-background/50 hover:bg-background/80 backdrop-blur-md hover:scale-110 active:scale-95 transition-all">
              <Camera className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between mb-8">
          <div className="flex items-end gap-6">
            <Avatar className="h-32 w-32 border-4 border-background shadow-xl hover:scale-[1.02] transition-transform">
              <AvatarImage src={photographer.avatar} className="object-cover" />
              <AvatarFallback className="text-3xl bg-zinc-900">{photographer.name[0]}</AvatarFallback>
            </Avatar>
            <div className="pb-2">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-2">
                {photographer.name}
                {photographer.verified && <Badge variant="secondary" className="bg-primary/20 text-primary">✓ Verified</Badge>}
              </h1>
              <div className="text-muted-foreground font-medium mt-1 flex items-center gap-2 flex-wrap">
                <span>@{photographer.username}</span>
                <span>·</span>
                <span>{photographer.location}</span>
                {photographer.role === 'photographer' && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-yellow-500">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                      {photographer.points || 1200} Elo
                    </span>
                    <span>·</span>
                    <span className="text-emerald-400 font-bold">{photographer.starting_rate ? `Starting at $${photographer.starting_rate}` : 'Rates on request'}</span>
                  </>
                )}
              </div>
              {photographer.role === 'photographer' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className={photographer.availability_status === 'Unavailable' ? 'border-red-500/50 text-red-500' : 'border-emerald-500/50 text-emerald-500'}>
                    <div className={cn("w-2 h-2 rounded-full mr-2", photographer.availability_status === 'Unavailable' ? "bg-red-500" : "bg-emerald-500 animate-pulse")} />
                    {photographer.availability_status || 'Available for booking'}
                  </Badge>
                  {photographer.service_categories?.map(cat => (
                    <Badge key={cat} variant="secondary" className="bg-zinc-800">{cat}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 pb-2">
            {isOwnProfile ? (
              <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-full font-bold hover:scale-105 active:scale-95 transition-all">
                    <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-card border-border/50 backdrop-blur-xl">
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
                    <div className="flex flex-col items-center gap-4">
                      <Avatar className="h-20 w-20 border border-border">
                        <AvatarImage src={avatarPreview} />
                      </Avatar>
                      <Button variant="secondary" size="sm" type="button" className="relative cursor-pointer overflow-hidden rounded-full">
                        Change Avatar
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
                        }} />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input value={editForm.name} onChange={e=>setEditForm({...editForm, name: e.target.value})} className="bg-background" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Bio</label>
                      <Textarea value={editForm.bio} onChange={e=>setEditForm({...editForm, bio: e.target.value})} className="resize-none bg-background" />
                    </div>
                    {photographer.role === 'photographer' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Starting Rate ($)</label>
                          <Input type="number" value={editForm.starting_rate} onChange={e=>setEditForm({...editForm, starting_rate: e.target.value})} className="bg-background" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Availability Status</label>
                          <Input placeholder="e.g. Available for booking" value={editForm.availability_status} onChange={e=>setEditForm({...editForm, availability_status: e.target.value})} className="bg-background" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Services (comma separated)</label>
                          <Input placeholder="Wedding, Portrait, Event" value={editForm.service_categories} onChange={e=>setEditForm({...editForm, service_categories: e.target.value})} className="bg-background" />
                        </div>
                      </>
                    )}
                    <Button type="submit" className="w-full rounded-full" disabled={isSavingEdit}>{isSavingEdit ? 'Saving...' : 'Save Changes'}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            ) : (
              <>
                <Button variant="secondary" className="rounded-full font-bold hover:scale-105 active:scale-95 transition-all" onClick={() => navigate(`/inbox?chat=${photographer.id}`)}>
                  Message
                </Button>
                <Button variant={isFollowing ? "outline" : "secondary"} className="rounded-full font-bold hover:scale-105 active:scale-95 transition-all" onClick={() => isFollowing ? unfollowUser(photographer.id) : followUser(photographer.id)}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-full font-bold text-black bg-white hover:bg-gray-200 shadow-lg shadow-white/10 hover:scale-105 active:scale-95 transition-all">Request Booking</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
                    <DialogHeader>
                      <DialogTitle>Book {photographer.name}</DialogTitle>
                      <DialogDescription>Submit your project details directly to the creator.</DialogDescription>
                    </DialogHeader>
                    {bookingSuccess ? (
                      <div className="py-12 text-center flex flex-col items-center">
                        <div className="text-5xl mb-4 animate-bounce">🎉</div>
                        <h3 className="text-xl font-bold mb-2">Request Sent</h3>
                        <p className="text-muted-foreground">Opening conversation thread...</p>
                      </div>
                    ) : (
                      <form onSubmit={handleBookingSubmit} className="space-y-4 pt-4">
                        <Input type="date" required value={bookingForm.date} onChange={e=>setBookingForm({...bookingForm, date: e.target.value})} className="bg-background" />
                        <Input placeholder="Location" required value={bookingForm.location} onChange={e=>setBookingForm({...bookingForm, location: e.target.value})} className="bg-background" />
                        <Input placeholder="Budget (e.g. $1000)" required value={bookingForm.budget} onChange={e=>setBookingForm({...bookingForm, budget: e.target.value})} className="bg-background" />
                        <Textarea placeholder="Describe the shoot..." required value={bookingForm.message} onChange={e=>setBookingForm({...bookingForm, message: e.target.value})} className="bg-background" />
                        <Button type="submit" className="w-full rounded-full bg-zinc-100 text-black hover:bg-white transition-all hover:scale-[1.02] active:scale-95 font-bold">Send Request</Button>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {photographer.bio && (
          <p className="text-lg leading-relaxed max-w-3xl mb-8 text-zinc-300">{photographer.bio}</p>
        )}

        {/* Stats Flex */}
        <div className="flex flex-wrap items-center gap-4 mb-12">
          <Badge variant="secondary" className="px-4 py-2 rounded-xl text-sm gap-2 hover:scale-105 transition-transform cursor-default">👥 <span className="font-bold">{follows.filter(f=>f.following_id===photographer.id).length}</span> followers</Badge>
          <Badge variant="secondary" className="px-4 py-2 rounded-xl text-sm gap-2 hover:scale-105 transition-transform cursor-default">🏆 <span className="font-bold">{photographer.wins||0}</span> wins</Badge>
          <Badge variant="secondary" className="px-4 py-2 rounded-xl text-sm gap-2 hover:scale-105 transition-transform cursor-default">⭐ <span className="font-bold">{photographer.avgRating||'5.0'}</span> rating</Badge>
          <Badge variant="secondary" className="px-4 py-2 rounded-xl text-sm gap-2 text-primary border border-primary/20 bg-primary/10 hover:scale-105 transition-transform cursor-default">💎 <span className="font-bold">{photographer.points||0}</span> pts</Badge>
          <Badge variant="secondary" className="px-4 py-2 rounded-xl text-sm gap-2 bg-gradient-to-r from-muted to-muted hover:scale-105 transition-transform cursor-default">🌍 <span className="font-bold">#{photographer.global_rank || 99}</span> Global</Badge>
        </div>

        <Tabs defaultValue="portfolio" className="w-full">
          <TabsList className="bg-transparent border-b border-border/40 w-full justify-start rounded-none p-0 h-auto mb-8 space-x-6 overflow-x-auto">
            {['Portfolio', 'Timeline', 'Achievements', 'Reviews'].map(tab => (
              <TabsTrigger 
                key={tab} 
                value={tab.toLowerCase()}
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none border-b-2 border-transparent px-0 py-3 font-semibold text-muted-foreground hover:text-foreground transition-all"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="portfolio" className="animate-in fade-in duration-300">
            {userPhotos.length > 0 ? (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                {userPhotos.map(p => (
                  <div key={p.id} className="break-inside-avoid">
                    <PhotoCard photo={p} compact onPhotoClick={() => setSelectedPhoto(p)} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState 
                icon={ImageOff} 
                title="No Portfolio Yet" 
                desc={isOwnProfile ? "Upload your first high-res shoot or video to start building your portfolio." : "This creator hasn't uploaded any visual work yet."}
                action={isOwnProfile && (
                  <Button onClick={() => navigate('/upload')} className="rounded-full bg-zinc-100 text-black font-bold hover:bg-white hover:scale-105 active:scale-95 transition-all">
                    Upload Shoot
                  </Button>
                )}
              />
            )}
          </TabsContent>

          <TabsContent value="timeline" className="animate-in fade-in duration-300">
            <div className="max-w-2xl">
              {isOwnProfile && (
                <div className="mb-8 flex justify-end">
                  <Dialog open={milestoneModalOpen} onOpenChange={setMilestoneModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="secondary" className="rounded-full hover:scale-105 active:scale-95 transition-all">
                        <Plus className="w-4 h-4 mr-2" /> Add Milestone
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
                      <DialogHeader>
                        <DialogTitle>Add Career Milestone</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={e => {
                        e.preventDefault();
                        if (!milestoneForm.title) return;
                        setCustomMilestones([{id:`ms_${Date.now()}`, ...milestoneForm}, ...customMilestones]);
                        setMilestoneModalOpen(false);
                        setMilestoneForm({title:'',desc:'',date:'',icon:'🏆'});
                      }} className="space-y-4">
                        <Input placeholder="Title" required value={milestoneForm.title} onChange={e=>setMilestoneForm({...milestoneForm, title: e.target.value})} className="bg-background" />
                        <Input placeholder="Date (e.g. Sep 2026)" value={milestoneForm.date} onChange={e=>setMilestoneForm({...milestoneForm, date: e.target.value})} className="bg-background" />
                        <Textarea placeholder="Description" value={milestoneForm.desc} onChange={e=>setMilestoneForm({...milestoneForm, desc: e.target.value})} className="bg-background" />
                        <Button type="submit" className="w-full rounded-full hover:scale-[1.02] active:scale-95 transition-all">Add to Timeline</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
              
              <div className="relative pl-8 border-l-2 border-border/40 space-y-12 pb-12">
                {[...customMilestones, ...userPhotos.map(p => ({
                    id: `ph_${p.id}`,
                    date: p.timestamp || 'Recently',
                    icon: p.isVideo ? '🎥' : '📸',
                    title: p.isVideo ? 'Uploaded Video Shoot' : 'Published New Photo Shoot',
                    desc: p.caption || 'Added new visual work.',
                    photoUrl: p.url,
                    gear: p.gear
                  })), {id:'joined',date:'Member',icon:'✨',title:'Joined LensLeague',desc:'Created official creator profile.'}]
                .map((item, idx) => (
                  <div key={item.id||idx} className="relative group">
                    <div className="absolute -left-[45px] top-0 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center text-sm shadow-xl transition-transform group-hover:scale-110">
                      {item.icon}
                    </div>
                    <Card className="bg-card/40 hover:bg-card border-border/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{item.title}</h3>
                          <span className="text-xs font-mono text-muted-foreground">{item.date}</span>
                        </div>
                        <p className="text-muted-foreground text-sm">{item.desc}</p>
                        {item.photoUrl && <img src={item.photoUrl} className="mt-4 rounded-xl w-full h-48 object-cover border border-border/30 transition-transform duration-500 hover:scale-[1.02]" alt="" />}
                        {item.gear && <div className="mt-3 text-xs text-muted-foreground font-mono">📷 {item.gear}</div>}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 'a1', icon: '📸', name: 'First Upload', desc: 'Uploaded your first shoot', unlocked: userPhotos.length >= 1 },
                { id: 'a2', icon: '🏆', name: 'First Win', desc: 'Won your first battle vote', unlocked: (photographer.points || 0) > 0 },
                { id: 'a3', icon: '⭐', name: 'Top Creator', desc: 'Earned 1,000+ creator points', unlocked: (photographer.points || 0) >= 1000 },
                { id: 'a4', icon: '💎', name: 'Diamond Pro', desc: 'Earned 10,000+ points', unlocked: (photographer.points || 0) >= 10000 },
                { id: 'a5', icon: '🔥', name: 'Prolific Creator', desc: 'Uploaded 5+ photos', unlocked: userPhotos.length >= 5 },
                { id: 'a6', icon: '👑', name: 'League Leader', desc: 'Reached top 5 global rank', unlocked: (photographer.global_rank || 99) <= 5 }
              ].map(ach => (
                <Card key={ach.id} className={`bg-card/40 border-border/40 transition-all duration-300 hover:-translate-y-1 hover:bg-card ${ach.unlocked ? 'opacity-100 border-primary/30' : 'opacity-40 grayscale'}`}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="text-4xl drop-shadow-md group-hover:scale-110 transition-transform">{ach.icon}</div>
                    <div>
                      <div className="font-bold text-sm flex items-center gap-2">{ach.name} {ach.unlocked && <span className="text-primary text-xs">✓</span>}</div>
                      <div className="text-xs text-muted-foreground">{ach.desc}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="animate-in fade-in duration-300">
            {userReviews.length > 0 ? (
              <div className="space-y-4 max-w-3xl">
                {userReviews.map(rev => (
                  <Card key={rev.id} className="bg-card/40 border-border/40 transition-all duration-300 hover:-translate-y-1 hover:bg-card">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-border">
                            <AvatarImage src={rev.reviewerAvatar || `https://ui-avatars.com/api/?name=${rev.reviewer}`} />
                          </Avatar>
                          <div>
                            <div className="font-bold text-sm">{rev.reviewer}</div>
                            <div className="text-xs text-muted-foreground">{rev.type || 'Booking'} · {rev.date || 'Recently'}</div>
                          </div>
                        </div>
                        <div className="text-primary text-sm font-black tracking-widest">{'★'.repeat(rev.rating || 5)}</div>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">"{rev.body}"</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState 
                icon={MessageSquare}
                title="No Reviews Yet"
                desc={isOwnProfile ? "Complete bookings through LensLeague to start earning verified client reviews." : "This creator hasn't received any verified reviews yet."}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedPhoto && (
        <PhotoDetailModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} onNavigateProfile={() => navigate(`/profile/${selectedPhoto.ownerId}`)} />
      )}
    </div>
  );
}
