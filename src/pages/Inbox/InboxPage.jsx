import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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

  const myId = currentUser?.id || '1';

  // Auto-select chat thread if URL contains a query (e.g. ?chat=2)
  useEffect(() => {
    const chatPartnerId = searchParams.get('chat');
    if (chatPartnerId) {
      const userThreads = threads.filter(t => t.photographerId === myId || t.clientId === myId);
      const targetThread = userThreads.find(t => t.clientId === chatPartnerId || t.photographerId === chatPartnerId);
      if (targetThread) {
        setSelectedThreadId(targetThread.id);
        setActiveTab('chats');
      }
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
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Header for Mobile/Global */}
      <div className="flex-none p-4 md:px-8 md:py-6 border-b border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Inbox</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage your messages and bookings</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-[300px]">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-1 h-auto">
            <TabsTrigger 
              value="chats" 
              className="rounded-lg py-2 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400"
            >
              Chats
            </TabsTrigger>
            <TabsTrigger 
              value="bookings"
              className="rounded-lg py-2 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400"
            >
              {isPhotographer ? 'Requests' : 'Bookings'}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Threads/Bookings List */}
        <div className={cn(
          "w-full md:w-[380px] lg:w-[420px] flex flex-col border-r border-zinc-800/50 transition-all duration-300",
          selectedThreadId ? "hidden md:flex" : "flex"
        )}>
          {activeTab === 'chats' && (
            <div className="p-4 border-b border-zinc-800/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input 
                  placeholder="Search conversations..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-zinc-900/50 border-zinc-800 focus-visible:ring-zinc-700 h-10 rounded-xl text-white placeholder:text-zinc-600"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-800">
            {activeTab === 'chats' ? (
              <div className="p-2 space-y-1">
                {filteredThreads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center px-4 animate-in fade-in duration-500">
                    <MessageCircle className="h-10 w-10 text-zinc-700 mb-3" />
                    <p className="text-zinc-400 text-sm">No conversations found.</p>
                  </div>
                ) : (
                  filteredThreads.map((t, index) => {
                    const lastMsg = t.messages[t.messages.length - 1];
                    const partnerName = isPhotographer ? t.clientName : t.photographerName;
                    const avatarUrl = t.photographerAvatar || t.clientAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName)}&background=random`;
                    const isActive = selectedThreadId === t.id;
                    
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedThreadId(t.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 group animate-in slide-in-from-left-4",
                          isActive 
                            ? "bg-zinc-800/80" 
                            : "hover:bg-zinc-900/50"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="relative">
                          <Avatar className="h-12 w-12 border border-zinc-800">
                            <AvatarImage src={avatarUrl} alt={partnerName} />
                            <AvatarFallback className="bg-zinc-800 text-zinc-400">{partnerName[0]}</AvatarFallback>
                          </Avatar>
                          {isActive && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="font-semibold text-white truncate pr-2">{partnerName}</span>
                            <span className="text-xs text-zinc-500 flex-shrink-0">
                              {lastMsg?.timestamp?.split(' ')[0] || ''}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-400 truncate">
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
                    <Calendar className="h-10 w-10 text-zinc-700 mb-3" />
                    <p className="text-zinc-400 text-sm">No bookings found.</p>
                  </div>
                ) : (
                  roleBookings.map((b, index) => (
                    <Card key={b.id} className="bg-zinc-900/50 border-zinc-800/50 overflow-hidden rounded-2xl animate-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 100}ms` }}>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-white text-base">
                              {isPhotographer ? b.clientName : `With ${b.photographerName}`}
                            </h3>
                            <p className="text-sm text-zinc-400">{b.location}</p>
                          </div>
                          <Badge variant="outline" className={cn("px-2 py-0.5 rounded-full capitalize border", getStatusColor(b.status))}>
                            {b.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-zinc-500 mb-4 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/50">
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
                          <div className="bg-background/50 rounded-xl p-3 mb-4 text-sm text-zinc-300 italic border border-zinc-800/50">
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
                              className="w-full bg-zinc-800 text-white hover:bg-zinc-700 rounded-xl"
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
              <div className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-4 bg-zinc-950/80 backdrop-blur-md z-10 sticky top-0">
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full"
                    onClick={() => setSelectedThreadId(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  
                  <Avatar className="h-10 w-10 border border-zinc-800">
                    <AvatarImage 
                      src={isPhotographer ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&q=80' : selectedThread.photographerAvatar} 
                      alt={isPhotographer ? selectedThread.clientName : selectedThread.photographerName} 
                    />
                    <AvatarFallback className="bg-zinc-800 text-zinc-400">
                      {(isPhotographer ? selectedThread.clientName : selectedThread.photographerName)[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="font-semibold text-white">
                      {isPhotographer ? selectedThread.clientName : selectedThread.photographerName}
                    </div>
                    <div className="text-xs text-zinc-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      Online
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white rounded-full hidden sm:flex">
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white rounded-full hidden sm:flex">
                    <Video className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white rounded-full">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
                {selectedThread.messages.map((msg, index) => {
                  const isMe = msg.senderId === (isPhotographer ? '1' : 'client_1');
                  const isSys = msg.senderId === 'system';

                  if (isSys) {
                    return (
                      <div key={msg.id} className="flex justify-center my-4 animate-in fade-in duration-300">
                        <div className="bg-zinc-900/80 text-zinc-400 text-xs px-4 py-1.5 rounded-full border border-zinc-800/50">
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
                            : "bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-sm"
                        )}>
                          {msg.body}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500 px-1">
                          <span>{msg.timestamp}</span>
                          {isMe && (
                            <CheckCheck className="h-3.5 w-3.5 text-zinc-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Input Area */}
              <div className="p-4 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800/50 sticky bottom-0">
                <form 
                  onSubmit={handleSendMessage}
                  className="flex items-end gap-2 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-1.5 focus-within:border-zinc-600 transition-colors"
                >
                  <Input 
                    type="text" 
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-zinc-500 h-11 px-3 shadow-none rounded-xl"
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    disabled={!messageText.trim()}
                    className="h-11 w-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 disabled:opacity-50 disabled:hover:bg-white transition-all"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-700">
              <div className="w-20 h-20 bg-zinc-900/50 border border-zinc-800 rounded-full flex items-center justify-center mb-6">
                <MessageCircle className="h-8 w-8 text-zinc-600" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Your Messages</h2>
              <p className="text-zinc-500 max-w-sm">
                Select a conversation from the sidebar to view messages, send photos, or manage bookings.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

