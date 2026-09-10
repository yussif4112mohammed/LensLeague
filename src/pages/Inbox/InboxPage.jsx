import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { avatarUrlOf, initialsOf } from '@/lib/avatars';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Send, Search, ArrowLeft, MessageCircle, Phone, Video, MoreVertical, Check, CheckCheck, Calendar, DollarSign } from 'lucide-react';

export default function InboxPage() {
  const { currentRole, currentUser, bookings, threads, acceptBooking, declineBooking, sendMessage, completeBooking } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'bookings'
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // No '1' fallback: it matched nothing real, so a signed-out or still-loading
  // user silently saw an empty inbox that looked like "you have no messages"
  // rather than "not signed in".
  const myId = currentUser?.id || null;

  // Open a specific conversation from a link.
  //
  //   ?thread=<id>  addresses the conversation itself, which is what a message
  //                 notification carries and what keeps working when a thread
  //                 has more than two people in it.
  //   ?chat=<id>    addresses the other person. Kept because existing links use
  //                 it, and it is the natural thing to write from a profile.
  useEffect(() => {
    const threadId = searchParams.get('thread');
    const chatPartnerId = searchParams.get('chat');
    if (!threadId && !chatPartnerId) return;

    const mine = threads.filter(t => t.photographerId === myId || t.clientId === myId);
    const target = threadId
      ? mine.find(t => t.id === threadId)
      : mine.find(t => t.clientId === chatPartnerId || t.photographerId === chatPartnerId);

    if (target) {
      setSelectedThreadId(target.id);
      setActiveTab('chats');
    }
  }, [searchParams, threads, myId]);

  // Filter bookings and threads based on current logged in user
  const isPhotographer = currentRole === 'photographer';
  
  const roleBookings = bookings.filter(b => b.photographerId === myId || b.clientId === myId);
  const roleThreads = threads.filter(t => t.photographerId === myId || t.clientId === myId);
  
  const filteredThreads = roleThreads.filter(t => {
    const partnerName = isPhotographer ? t.clientName : t.photographerName;
    return partnerName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const selectedThread = roleThreads.find(t => t.id === selectedThreadId);

  // Who the open conversation is with, derived once so the header, the name and
  // any future use cannot disagree with the list about the same person.
  const partnerName = selectedThread
    ? (isPhotographer ? selectedThread.clientName : selectedThread.photographerName) || 'Someone'
    : '';
  const partnerAvatar = selectedThread
    ? avatarUrlOf(
        isPhotographer ? selectedThread.clientAvatar : selectedThread.photographerAvatar,
        selectedThread.photographerAvatar,
        selectedThread.clientAvatar
      )
    : null;

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMessage(selectedThreadId, messageText);
    setMessageText('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'requested': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'accepted': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'declined': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted-foreground/10 text-muted-foreground border-ring/20';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Header for Mobile/Global */}
      <div className="flex-none p-4 md:px-8 md:py-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Inbox</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your messages and bookings</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-[300px]">
          <TabsList className="grid w-full grid-cols-2 bg-card/50 border border-border/50 rounded-xl p-1 h-auto">
            <TabsTrigger 
              value="chats" 
              className="rounded-lg py-2 data-[active]:bg-muted data-[active]:text-foreground text-muted-foreground"
            >
              Chats
            </TabsTrigger>
            <TabsTrigger 
              value="bookings"
              className="rounded-lg py-2 data-[active]:bg-muted data-[active]:text-foreground text-muted-foreground"
            >
              {isPhotographer ? 'Requests' : 'Bookings'}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Threads/Bookings List */}
        <div className={cn(
          "w-full md:w-[380px] lg:w-[420px] flex flex-col border-r border-border/50 transition-all duration-300",
          selectedThreadId ? "hidden md:flex" : "flex"
        )}>
          {activeTab === 'chats' && (
            <div className="p-4 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search conversations..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-card/50 border-border focus-visible:ring-border h-10 rounded-xl text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-800">
            {activeTab === 'chats' ? (
              <div className="p-2 space-y-1">
                {filteredThreads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center px-4 animate-in fade-in duration-500">
                    <MessageCircle className="h-10 w-10 text-foreground mb-3" />
                    <p className="text-muted-foreground text-sm">No conversations found.</p>
                  </div>
                ) : (
                  filteredThreads.map((t, index) => {
                    const lastMsg = t.messages[t.messages.length - 1];
                    const partnerName = isPhotographer ? t.clientName : t.photographerName;
                    // The partner's own picture, or none - the AvatarFallback
                    // below draws their initials. This used to reach out to
                    // ui-avatars.com, which sent the person's name to a third
                    // party and, with background=random, gave the same contact a
                    // different colour on every reload.
                    const avatarUrl = avatarUrlOf(
                      isPhotographer ? t.clientAvatar : t.photographerAvatar,
                      t.photographerAvatar,
                      t.clientAvatar
                    );
                    const isActive = selectedThreadId === t.id;
                    
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedThreadId(t.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 group animate-in slide-in-from-left-4",
                          isActive 
                            ? "bg-muted/80" 
                            : "hover:bg-card/50"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="relative">
                          <Avatar className="h-12 w-12 border border-border">
                            <AvatarImage src={avatarUrl} alt={partnerName} />
                            <AvatarFallback className="bg-muted text-muted-foreground">{initialsOf(partnerName)}</AvatarFallback>
                          </Avatar>
                          {isActive && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="font-semibold text-foreground truncate pr-2">{partnerName}</span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {lastMsg?.timestamp?.split(' ')[0] || ''}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {lastMsg ? lastMsg.body : 'No messages yet'}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {roleBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center animate-in fade-in duration-500">
                    <Calendar className="h-10 w-10 text-foreground mb-3" />
                    <p className="text-muted-foreground text-sm">No bookings found.</p>
                  </div>
                ) : (
                  roleBookings.map((b, index) => (
                    <Card key={b.id} className="bg-card/50 border-border/50 overflow-hidden rounded-2xl animate-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 100}ms` }}>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-foreground text-base">
                              {isPhotographer ? b.clientName : `With ${b.photographerName}`}
                            </h3>
                            <p className="text-sm text-muted-foreground">{b.location}</p>
                          </div>
                          <Badge variant="outline" className={cn("px-2 py-0.5 rounded-full capitalize border", getStatusColor(b.status))}>
                            {b.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 bg-card/80 p-3 rounded-xl border border-border/50">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            <span>{b.date}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="h-4 w-4" />
                            <span>{b.budget}</span>
                          </div>
                        </div>

                        {b.message && (
                          <div className="bg-background/50 rounded-xl p-3 mb-4 text-sm text-foreground italic border border-border/50">
                            "{b.message}"
                          </div>
                        )}

                        <div className="flex gap-2 mt-2">
                          {isPhotographer && b.status === 'requested' && (
                            <>
                              <Button 
                                variant="outline" 
                                className="flex-1 bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 hover:text-red-300 rounded-xl"
                                onClick={() => declineBooking(b.id)}
                              >
                                Decline
                              </Button>
                              <Button 
                                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl"
                                onClick={() => acceptBooking(b.id)}
                              >
                                Accept
                              </Button>
                            </>
                          )}

                          {isPhotographer && b.status === 'accepted' && (
                            <Button 
                              className="w-full bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:text-blue-300 rounded-xl"
                              onClick={() => completeBooking(b.id)}
                            >
                              Mark Completed
                            </Button>
                          )}

                          {!isPhotographer && b.status === 'accepted' && (
                            <Button 
                              className="w-full bg-muted text-foreground hover:bg-muted rounded-xl"
                              onClick={() => {
                                const thread = roleThreads.find(t => t.photographerId === b.photographerId);
                                if (thread) {
                                  setSelectedThreadId(thread.id);
                                  setActiveTab('chats');
                                }
                              }}
                            >
                              Message Photographer
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Active Conversation */}
        <div className={cn(
          "flex-1 flex flex-col bg-background/50 relative transition-all duration-300",
          !selectedThreadId ? "hidden md:flex" : "flex"
        )}>
          {selectedThread ? (
            <>
              {/* Chat Header */}
              <div className="h-16 border-b border-border/50 flex items-center justify-between px-4 bg-background/80 backdrop-blur-md z-10 sticky top-0">
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
                    onClick={() => setSelectedThreadId(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  
                  {/* The same picture the list shows, from the same helper.
                      What stood here was a hardcoded stock photograph of a
                      stranger, rendered unconditionally for one side of every
                      conversation and ignoring the real person's avatar even
                      when they had one - so a photographer could update his
                      profile picture, say so in the chat, and still be shown as
                      a woman he has never met. */}
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage
                      src={partnerAvatar || undefined}
                      alt={partnerName}
                    />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {initialsOf(partnerName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="font-semibold text-foreground">
                      {partnerName}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      Online
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-full hidden sm:flex">
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-full hidden sm:flex">
                    <Video className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-full">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
                {selectedThread.messages.map((msg, index) => {
                  // Was: msg.senderId === (isPhotographer ? '1' : 'client_1').
                  // Real senders are UUIDs, so that comparison was never true and
                  // YOUR OWN messages rendered as though the other person sent
                  // them - left-aligned and grey, in every conversation.
                  const isMe = !!currentUser?.id && msg.senderId === currentUser.id;
                  const isSys = msg.senderId === 'system';

                  if (isSys) {
                    return (
                      <div key={msg.id} className="flex justify-center my-4 animate-in fade-in duration-300">
                        <div className="bg-card/80 text-muted-foreground text-xs px-4 py-1.5 rounded-full border border-border/50">
                          {msg.body}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex w-full animate-in slide-in-from-bottom-2 duration-300",
                        isMe ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[75%] md:max-w-[65%] flex flex-col gap-1",
                        isMe ? "items-end" : "items-start"
                      )}>
                        <div className={cn(
                          "px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm",
                          isMe 
                            ? "bg-primary text-primary-foreground rounded-br-sm" 
                            : "bg-card border border-border text-foreground rounded-bl-sm"
                        )}>
                          {msg.body}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground px-1">
                          <span>{msg.timestamp}</span>
                          {isMe && (
                            <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Input Area */}
              <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border/50 sticky bottom-0">
                <form 
                  onSubmit={handleSendMessage}
                  className="flex items-end gap-2 bg-card/50 border border-border/80 rounded-2xl p-1.5 focus-within:border-border transition-colors"
                >
                  <Input 
                    type="text" 
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground h-11 px-3 shadow-none rounded-xl"
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    disabled={!messageText.trim()}
                    className="h-11 w-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 disabled:opacity-50 disabled:hover:bg-muted transition-all"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-700">
              <div className="w-20 h-20 bg-card/50 border border-border rounded-full flex items-center justify-center mb-6">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Your Messages</h2>
              <p className="text-muted-foreground max-w-sm">
                Select a conversation from the sidebar to view messages, send photos, or manage bookings.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

