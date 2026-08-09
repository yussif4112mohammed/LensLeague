import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar, MapPin, DollarSign, MessageCircle, Star, Plus } from 'lucide-react';

const STATUS_CONFIG = {
  accepted:  { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Confirmed' },
  requested: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Pending' },
  completed: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Completed' },
  declined:  { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Declined' },
};

export default function ClientBookings() {
  const navigate = useNavigate();
  const { bookings, threads } = useApp();

  const clientBookings = bookings.filter(b => b.clientId === 'client_1');

  const getFilteredBookings = (status) => {
    if (status === 'all') return clientBookings;
    if (status === 'confirmed') return clientBookings.filter(b => b.status === 'accepted');
    return clientBookings.filter(b => b.status === status);
  };

  const BookingList = ({ status }) => {
    const list = getFilteredBookings(status);
    
    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <div className="h-16 w-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
            <Calendar className="h-8 w-8 text-zinc-700" />
          </div>
          <p className="text-zinc-400 font-medium">No {status !== 'all' ? status : ''} bookings found</p>
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
            <Card key={b.id} className="bg-zinc-900/50 border-zinc-800/50 rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 border-b border-zinc-800/50 flex justify-between items-start">
                  <div className="flex gap-3">
                    <Avatar className="h-12 w-12 border border-zinc-700 cursor-pointer" onClick={() => navigate(`/profile/${b.photographerId}`)}>
                      <AvatarImage src={b.photographerAvatar} alt={b.photographerName} />
                      <AvatarFallback>{b.photographerName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-white font-bold cursor-pointer" onClick={() => navigate(`/profile/${b.photographerId}`)}>{b.photographerName}</h3>
                      <p className="text-zinc-500 text-sm">Photography Shoot</p>
                    </div>
                  </div>
                  <Badge className={cn("px-2 py-1 border", st.bg, st.color, st.border)}>
                    {st.label}
                  </Badge>
                </div>
                
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center text-zinc-300">
                      <Calendar className="h-4 w-4 mr-2 text-zinc-500" /> {b.date}
                    </div>
                    <div className="flex items-center text-zinc-300">
                      <DollarSign className="h-4 w-4 mr-2 text-zinc-500" /> {b.budget}
                    </div>
                    <div className="flex items-center text-zinc-300 col-span-2">
                      <MapPin className="h-4 w-4 mr-2 text-zinc-500" /> {b.location}
                    </div>
                  </div>
                  
                  {b.message && (
                    <div className="mt-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800/50 text-zinc-400 text-sm italic">
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
                    <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl">
                      <Star className="h-4 w-4 mr-2" /> Leave Review
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1 bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 rounded-xl" onClick={() => navigate(`/profile/${b.photographerId}`)}>
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
    <div className="min-h-screen bg-background text-zinc-400 p-4 pb-24 animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-white font-bold text-2xl">My Bookings</h1>
        <Button size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl" onClick={() => navigate('/client/search')}>
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full bg-zinc-900 border border-zinc-800 rounded-xl mb-6 p-1">
          <TabsTrigger value="all" className="flex-1 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white">All</TabsTrigger>
          <TabsTrigger value="requested" className="flex-1 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Pending</TabsTrigger>
          <TabsTrigger value="confirmed" className="flex-1 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Confirmed</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Completed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all"><BookingList status="all" /></TabsContent>
        <TabsContent value="requested"><BookingList status="requested" /></TabsContent>
        <TabsContent value="confirmed"><BookingList status="confirmed" /></TabsContent>
        <TabsContent value="completed"><BookingList status="completed" /></TabsContent>
      </Tabs>
    </div>
  );
}
