import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, MapPin, DollarSign, MessageCircle, Star, Plus } from 'lucide-react';

const STATUS_CONFIG = {
  accepted:  { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Confirmed' },
  requested: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Pending' },
  completed: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Completed' },
  declined:  { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Declined' },
};

/**
 * Leave a review on a finished shoot.
 *
 * The database has been ready for this since v27 and the button that opens it
 * had no click handler, so a client could never say anything about a
 * photographer they had hired - which makes the rating on every search result
 * permanently "No reviews yet". The star row is the whole point; the note is
 * optional, because a rating with no words is still information and demanding
 * a paragraph is how you get no reviews at all.
 */
function ReviewDialog({ booking, onClose }) {
  const { submitReview } = useApp();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const shown = hovered || rating;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);
    const result = await submitReview({
      bookingId: booking.id,
      revieweeId: booking.photographerId,
      rating,
      body,
    });
    setSending(false);
    if (!result?.success) {
      setError(result?.error || 'Could not save your review.');
      return;
    }
    setDone(true);
    setTimeout(onClose, 1400);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="border-border bg-card text-foreground sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Review {booking.photographerName || 'this photographer'}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Clients searching for a photographer see this. Say what the shoot was
            actually like.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <p role="status" className="py-6 text-sm text-muted-foreground">
            Thank you — your review is live on their profile.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                  onMouseEnter={() => setHovered(n)}
                  onFocus={() => setHovered(n)}
                  onClick={() => { setRating(n); setError(''); }}
                  className="rounded p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      'h-7 w-7',
                      n <= shown ? 'fill-primary text-primary' : 'text-muted-foreground'
                    )}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating ? `${rating} of 5` : 'Choose a rating'}
              </span>
            </div>

            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="How was the shoot? Anything another client should know?"
              rows={4}
              maxLength={2000}
              className="border-border bg-background"
            />

            {error && <p role="status" className="text-[12px] text-destructive">{error}</p>}

            <Button
              type="submit"
              disabled={sending || rating === 0}
              className="w-full rounded-full font-bold"
            >
              {sending ? 'Saving…' : 'Post review'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ClientBookings() {
  const navigate = useNavigate();
  const { bookings, currentUser } = useApp();
  const [reviewing, setReviewing] = useState(null);

  const clientBookings = bookings.filter(b => b.clientId === currentUser?.id);

  const getFilteredBookings = (status) => {
    if (status === 'all') return clientBookings;
    if (status === 'confirmed') return clientBookings.filter(b => b.status === 'accepted');
    return clientBookings.filter(b => b.status === status);
  };

  const BookingList = ({ status }) => {
    const list = getFilteredBookings(status);
    
    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="h-16 w-16 rounded-full bg-card flex items-center justify-center mb-4 border border-border">
            <Calendar className="h-8 w-8 text-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">No {status !== 'all' ? status : ''} bookings found</p>
          <p className="text-sm mt-1">Ready for your next photoshoot?</p>
          <Button className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl" onClick={() => navigate('/client/search')}>
            Find Photographers
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {list.map(b => {
          const st = STATUS_CONFIG[b.status] || STATUS_CONFIG.requested;
          return (
            <Card key={b.id} className="bg-card/50 border-border/50 rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 border-b border-border/50 flex justify-between items-start">
                  <div className="flex gap-3">
                    <Avatar className="h-12 w-12 border border-border cursor-pointer" onClick={() => navigate(`/profile/${b.photographerId}`)}>
                      <AvatarImage src={b.photographerAvatar} alt={b.photographerName} />
                      <AvatarFallback>{b.photographerName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-foreground font-bold cursor-pointer" onClick={() => navigate(`/profile/${b.photographerId}`)}>{b.photographerName}</h3>
                      <p className="text-muted-foreground text-sm">Photography Shoot</p>
                    </div>
                  </div>
                  <Badge className={cn("px-2 py-1 border", st.bg, st.color, st.border)}>
                    {st.label}
                  </Badge>
                </div>
                
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center text-foreground">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" /> {b.date}
                    </div>
                    <div className="flex items-center text-foreground">
                      <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" /> {b.budget}
                    </div>
                    <div className="flex items-center text-foreground col-span-2">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" /> {b.location}
                    </div>
                  </div>
                  
                  {b.message && (
                    <div className="mt-3 p-3 bg-card rounded-xl border border-border/50 text-muted-foreground text-sm italic">
                      "{b.message}"
                    </div>
                  )}
                </div>
                
                <div className="p-4 pt-0 flex gap-2">
                  {b.status === 'accepted' && (
                    <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl" onClick={() => navigate('/client/inbox')}>
                      <MessageCircle className="h-4 w-4 mr-2" /> Message
                    </Button>
                  )}
                  {b.status === 'completed' && (
                    <Button
                      onClick={() => setReviewing(b)}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl"
                    >
                      <Star className="h-4 w-4 mr-2" /> Leave Review
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1 bg-card text-foreground border-border hover:bg-muted rounded-xl" onClick={() => navigate(`/profile/${b.photographerId}`)}>
                    View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-muted-foreground p-4 pb-24 animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-foreground font-bold text-2xl">My Bookings</h1>
        <Button size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl" onClick={() => navigate('/client/search')}>
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full bg-card border border-border rounded-xl mb-6 p-1">
          <TabsTrigger value="all" className="flex-1 rounded-lg data-[active]:bg-muted data-[active]:text-foreground">All</TabsTrigger>
          <TabsTrigger value="requested" className="flex-1 rounded-lg data-[active]:bg-muted data-[active]:text-foreground">Pending</TabsTrigger>
          <TabsTrigger value="confirmed" className="flex-1 rounded-lg data-[active]:bg-muted data-[active]:text-foreground">Confirmed</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 rounded-lg data-[active]:bg-muted data-[active]:text-foreground">Completed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all"><BookingList status="all" /></TabsContent>
        <TabsContent value="requested"><BookingList status="requested" /></TabsContent>
        <TabsContent value="confirmed"><BookingList status="confirmed" /></TabsContent>
        <TabsContent value="completed"><BookingList status="completed" /></TabsContent>
      </Tabs>

      {reviewing && (
        <ReviewDialog booking={reviewing} onClose={() => setReviewing(null)} />
      )}
    </div>
  );
}
