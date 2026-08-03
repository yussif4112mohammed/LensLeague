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
import './ProfilePage.css';

const ACHIEVEMENTS = [
  { id: 'a1', icon: '🏆', name: 'First Win', desc: 'Won your first battle', unlocked: true },
  { id: 'a2', icon: '🔥', name: '10-Day Streak', desc: 'Uploaded 10 days in a row', unlocked: true },
  { id: 'a3', icon: '⭐', name: 'Top 10 Global', desc: 'Reached top 10 on the global leaderboard', unlocked: true },
  { id: 'a4', icon: '💎', name: 'Diamond Rank', desc: 'Reach 40,000 points', unlocked: true },
  { id: 'a5', icon: '📸', name: '100 Uploads', desc: 'Upload 100 photos', unlocked: false },
  { id: 'a6', icon: '👑', name: 'Challenge Champion', desc: 'Win 5 challenges', unlocked: false },
];

const REVIEWS = [
  { id: 'r1', reviewer: 'Jordan Blake', reviewerAvatar: 'https://ui-avatars.com/api/?name=Jordan+Blake', rating: 5, body: 'Absolutely stunning work. Captured our brand campaign with a level of artistry I hadn\'t seen before. Will book again.', type: 'Commercial Campaign', date: '2 weeks ago', verified: true },
  { id: 'r2', reviewer: 'Maria Santos', reviewerAvatar: 'https://ui-avatars.com/api/?name=Maria+Santos', rating: 5, body: 'Our family portraits turned out beyond expectations. Professional, warm, and incredibly talented.', type: 'Portrait Session', date: '1 month ago', verified: true },
  { id: 'r3', reviewer: 'Tech Ventures Ltd.', reviewerAvatar: 'https://ui-avatars.com/api/?name=Tech+Ventures', rating: 4, body: 'Great product photography for our launch. Fast turnaround, excellent communication.', type: 'Product Photography', date: '2 months ago', verified: true },
];

function PhotoDetailModal({ photo, onClose, onNavigateProfile }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(photo?.likes || 0);
  const [showComments, setShowComments] = useState(false);

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
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => { onClose(); onNavigateProfile?.(); }}>
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={photo.ownerAvatar} />
                  <AvatarFallback>{photo.ownerName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-sm leading-tight hover:underline">{photo.ownerName}</div>
                  {photo.location && <div className="text-xs text-muted-foreground">{photo.location}</div>}
                </div>
              </div>
              <button className="hidden md:block p-2 text-muted-foreground hover:text-foreground transition-colors" onClick={onClose}>✕</button>
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
                  <button className={`hover:scale-110 transition-transform ${liked ? 'text-red-500' : 'text-foreground'}`} onClick={() => { setLiked(!liked); setLikeCount(c => liked ? c - 1 : c + 1); }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </button>
                  <button className="hover:scale-110 transition-transform" onClick={() => setShowComments(true)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                </div>
                <button className={`hover:scale-110 transition-transform ${saved ? 'text-primary' : 'text-foreground'}`} onClick={() => setSaved(!saved)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                </button>
              </div>
              {likeCount > 0 && <div className="text-sm font-bold mb-1">{fmt(likeCount)} likes</div>}
              <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setShowComments(true)}>
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
  const [editForm, setEditForm] = useState({ name: '', username: '', bio: '', location: '' });
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
        location: photographer.location || ''
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
        const timer = setTimeout(() => setIsMeLoading(false), 4000);
        return () => clearTimeout(timer);
      }
    } else {
      setIsMeLoading(false);
    }
  }, [id, currentUser]);

  if (!photographer) {
    if (loadingProfile || isMeLoading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading profile...</div>;
    if (!currentUser && id === 'me') return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
        <Card className="p-8 max-w-sm w-full bg-card/60 backdrop-blur-xl border-border/50">
          <h2 className="text-2xl font-bold mb-2">Log In Required</h2>
          <p className="text-muted-foreground mb-6">You need to be logged in to view your profile.</p>
          <Button className="w-full rounded-full" onClick={() => navigate('/login')}>Sign In</Button>
        </Card>
      </div>
    );
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
        <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
        <p className="text-muted-foreground mb-6">This creator doesn't exist or hasn't setup their profile.</p>
        <Button variant="outline" className="rounded-full" onClick={() => navigate('/feed')}>Return to Feed</Button>
      </div>
    );
  }

  const userPhotos = photos.filter(p => p.ownerId === photographer.id);

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
      const { error: uploadError } = await supabase.storage.from('photos').upload(fileName, avatarFile);
      if (!uploadError) {
        const { data } = supabase.storage.from('photos').getPublicUrl(fileName);
        newAvatarUrl = data.publicUrl;
      }
    }
    const updateData = { ...editForm };
    if (newAvatarUrl) updateData.avatar = newAvatarUrl;
    updateProfile(photographer.id, updateData);
    setIsSavingEdit(false);
    setEditModalOpen(false);
  };

  const isFollowing = currentUser && follows.some(f => f.follower_id === currentUser.id && f.following_id === photographer.id);

  return (
    <div className="w-full min-h-screen bg-background text-foreground animate-in fade-in pb-20">
      
      {/* Cover */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        {photographer.cover ? (
          <img src={photographer.cover} className="w-full h-full object-cover" alt="Cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-secondary/40 to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
          <Button variant="secondary" size="icon" className="rounded-full bg-background/50 hover:bg-background/80 backdrop-blur-md" onClick={() => navigate(-1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </Button>
          {isOwnProfile && (
            <Button variant="secondary" size="icon" className="rounded-full bg-background/50 hover:bg-background/80 backdrop-blur-md">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between mb-8">
          <div className="flex items-end gap-6">
            <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
              <AvatarImage src={photographer.avatar} className="object-cover" />
              <AvatarFallback className="text-3xl">{photographer.name[0]}</AvatarFallback>
            </Avatar>
            <div className="pb-2">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-2">
                {photographer.name}
                {photographer.verified && <Badge variant="secondary" className="bg-primary/20 text-primary">✓ Verified</Badge>}
              </h1>
              <div className="text-muted-foreground font-medium mt-1">@{photographer.username} · {photographer.location}</div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 pb-2">
            {isOwnProfile ? (
              <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-full font-bold">Edit Profile</Button>
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
                      <Input value={editForm.name} onChange={e=>setEditForm({...editForm, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Bio</label>
                      <Textarea value={editForm.bio} onChange={e=>setEditForm({...editForm, bio: e.target.value})} className="resize-none" />
                    </div>
                    <Button type="submit" className="w-full rounded-full" disabled={isSavingEdit}>{isSavingEdit ? 'Saving...' : 'Save Changes'}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            ) : (
              <>
                <Button variant="secondary" className="rounded-full font-bold" onClick={() => navigate(`/inbox?chat=${photographer.id}`)}>Message</Button>
                <Button variant={isFollowing ? "outline" : "secondary"} className="rounded-full font-bold" onClick={() => isFollowing ? unfollowUser(photographer.id) : followUser(photographer.id)}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-full font-bold text-black bg-white hover:bg-gray-200 shadow-lg shadow-white/10">Request Booking</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
                    <DialogHeader>
                      <DialogTitle>Book {photographer.name}</DialogTitle>
                      <DialogDescription>Submit your project details directly to the creator.</DialogDescription>
                    </DialogHeader>
                    {bookingSuccess ? (
                      <div className="py-12 text-center flex flex-col items-center">
                        <div className="text-5xl mb-4">🎉</div>
                        <h3 className="text-xl font-bold mb-2">Request Sent</h3>
                        <p className="text-muted-foreground">Opening conversation thread...</p>
                      </div>
                    ) : (
                      <form onSubmit={handleBookingSubmit} className="space-y-4 pt-4">
                        <Input type="date" required value={bookingForm.date} onChange={e=>setBookingForm({...bookingForm, date: e.target.value})} />
                        <Input placeholder="Location" required value={bookingForm.location} onChange={e=>setBookingForm({...bookingForm, location: e.target.value})} />
                        <Input placeholder="Budget (e.g. $1000)" required value={bookingForm.budget} onChange={e=>setBookingForm({...bookingForm, budget: e.target.value})} />
                        <Textarea placeholder="Describe the shoot..." required value={bookingForm.message} onChange={e=>setBookingForm({...bookingForm, message: e.target.value})} />
                        <Button type="submit" className="w-full rounded-full bg-primary text-primary-foreground">Send Request</Button>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        <p className="text-lg leading-relaxed max-w-3xl mb-8">{photographer.bio}</p>

        {/* Stats Flex */}
        <div className="flex flex-wrap items-center gap-4 mb-12">
          <Badge variant="secondary" className="px-4 py-2 rounded-xl text-sm gap-2">👥 <span className="font-bold">{follows.filter(f=>f.following_id===photographer.id).length}</span> followers</Badge>
          <Badge variant="secondary" className="px-4 py-2 rounded-xl text-sm gap-2">🏆 <span className="font-bold">{photographer.wins||0}</span> wins</Badge>
          <Badge variant="secondary" className="px-4 py-2 rounded-xl text-sm gap-2">⭐ <span className="font-bold">{photographer.avgRating||'5.0'}</span> rating</Badge>
          <Badge variant="secondary" className="px-4 py-2 rounded-xl text-sm gap-2 text-primary border border-primary/20 bg-primary/10">💎 <span className="font-bold">{photographer.points||0}</span> pts</Badge>
          <Badge variant="secondary" className="px-4 py-2 rounded-xl text-sm gap-2 bg-gradient-to-r from-muted to-muted">🌍 <span className="font-bold">#{photographer.global_rank || 99}</span> Global</Badge>
        </div>

        <Tabs defaultValue="portfolio" className="w-full">
          <TabsList className="bg-transparent border-b border-border/40 w-full justify-start rounded-none p-0 h-auto mb-8 space-x-6 overflow-x-auto">
            {['Portfolio', 'Timeline', 'Achievements', 'Reviews'].map(tab => (
              <TabsTrigger 
                key={tab} 
                value={tab.toLowerCase()}
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none border-b-2 border-transparent px-0 py-3 font-semibold text-muted-foreground hover:text-foreground"
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
              <div className="py-24 text-center text-muted-foreground border border-dashed border-border/50 rounded-2xl">
                No visual work uploaded yet.
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="animate-in fade-in duration-300">
            <div className="max-w-2xl">
              {isOwnProfile && (
                <div className="mb-8 flex justify-end">
                  <Dialog open={milestoneModalOpen} onOpenChange={setMilestoneModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="secondary" className="rounded-full">+ Add Milestone</Button>
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
                        <Input placeholder="Title" required value={milestoneForm.title} onChange={e=>setMilestoneForm({...milestoneForm, title: e.target.value})} />
                        <Input placeholder="Date (e.g. Sep 2026)" value={milestoneForm.date} onChange={e=>setMilestoneForm({...milestoneForm, date: e.target.value})} />
                        <Textarea placeholder="Description" value={milestoneForm.desc} onChange={e=>setMilestoneForm({...milestoneForm, desc: e.target.value})} />
                        <Button type="submit" className="w-full rounded-full">Add to Timeline</Button>
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
                  <div key={item.id||idx} className="relative">
                    <div className="absolute -left-[45px] top-0 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center text-sm shadow-xl">
                      {item.icon}
                    </div>
                    <Card className="bg-card/40 hover:bg-card border-border/40 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg">{item.title}</h3>
                          <span className="text-xs font-mono text-muted-foreground">{item.date}</span>
                        </div>
                        <p className="text-muted-foreground text-sm">{item.desc}</p>
                        {item.photoUrl && <img src={item.photoUrl} className="mt-4 rounded-xl w-full h-48 object-cover border border-border/30" alt="" />}
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
                <Card key={ach.id} className={`bg-card/40 border-border/40 transition-opacity ${ach.unlocked ? 'opacity-100 border-primary/30' : 'opacity-40 grayscale'}`}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="text-4xl drop-shadow-md">{ach.icon}</div>
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
            <div className="space-y-4 max-w-3xl">
              {REVIEWS.map(rev => (
                <Card key={rev.id} className="bg-card/40 border-border/40">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border">
                          <AvatarImage src={rev.reviewerAvatar} />
                        </Avatar>
                        <div>
                          <div className="font-bold text-sm">{rev.reviewer}</div>
                          <div className="text-xs text-muted-foreground">{rev.type} · {rev.date}</div>
                        </div>
                      </div>
                      <div className="text-primary text-sm font-black tracking-widest">{'★'.repeat(rev.rating)}</div>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">"{rev.body}"</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {selectedPhoto && (
        <PhotoDetailModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} onNavigateProfile={() => navigate(`/profile/${selectedPhoto.ownerId}`)} />
      )}
    </div>
  );
}
