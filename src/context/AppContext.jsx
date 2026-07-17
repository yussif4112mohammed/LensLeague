import { createContext, useContext, useState, useEffect } from 'react';
import { photographers } from '../data/photographers';
import { challenges as initialChallenges } from '../data/challenges';
import { photos as initialPhotos } from '../data/photos';
import { battles as initialBattles } from '../data/battles';
import { calculateElo } from '../lib/elo';
import { supabase } from '../lib/supabaseClient';

const AppContext = createContext(null);

const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

const DEFAULT_BOOKINGS = [
  {
    id: 'bk_1',
    clientId: 'client_1',
    clientName: 'Sarah Jenkins',
    photographerId: '1',
    photographerName: 'Aria Nakamura',
    photographerAvatar: photographers[0].avatar,
    date: '2026-08-15',
    budget: '$1,200',
    location: 'Studio, Tokyo',
    message: 'Looking for a high-fashion editorial shoot for our autumn clothing line catalog release.',
    status: 'requested',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bk_2',
    clientId: 'client_1',
    clientName: 'Sarah Jenkins',
    photographerId: '2',
    photographerName: 'Marcus Osei',
    photographerAvatar: photographers[1].avatar,
    date: '2026-07-30',
    budget: '$800',
    location: 'Outdoor, Lagos',
    message: 'Need documentary style street portraits of our team at the Lagos tech hub space.',
    status: 'accepted',
    createdAt: new Date().toISOString(),
  }
];

const DEFAULT_THREADS = [
  {
    id: 'th_1',
    photographerId: '1',
    photographerName: 'Aria Nakamura',
    photographerAvatar: photographers[0].avatar,
    clientId: 'client_1',
    clientName: 'Sarah Jenkins',
    messages: [
      {
        id: 'msg_1',
        senderId: 'client_1',
        senderName: 'Sarah Jenkins',
        body: 'Hello Aria! I just submitted a booking request for August 15th. Do you have studio space available?',
        timestamp: '10:32 AM',
      },
      {
        id: 'msg_2',
        senderId: '1',
        senderName: 'Aria Nakamura',
        body: 'Hi Sarah! Yes, I do have access to the studio on that day. What is the style of fashion shoots you are looking to achieve?',
        timestamp: '10:45 AM',
      }
    ]
  }
];

export function AppProvider({ children }) {
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('ll-user-email') || '');
  const [currentRole, setCurrentRole] = useState(() => localStorage.getItem('ll-current-role') || 'photographer');
  const [currentUser, setCurrentUser] = useState(null);

  // Photos list state
  const [photos, setPhotos] = useState(() => {
    const saved = localStorage.getItem('ll-photos');
    return saved ? JSON.parse(saved) : initialPhotos;
  });

  // Bookings list state
  const [bookings, setBookings] = useState(() => {
    const saved = localStorage.getItem('ll-bookings');
    return saved ? JSON.parse(saved) : DEFAULT_BOOKINGS;
  });

  // Chat threads list state
  const [threads, setThreads] = useState(() => {
    const saved = localStorage.getItem('ll-threads');
    return saved ? JSON.parse(saved) : DEFAULT_THREADS;
  });

  // Challenges active list state
  const [challenges, setChallenges] = useState(() => {
    const saved = localStorage.getItem('ll-challenges');
    return saved ? JSON.parse(saved) : initialChallenges;
  });

  // User submissions to challenges
  const [submissions, setSubmissions] = useState(() => {
    const saved = localStorage.getItem('ll-submissions');
    return saved ? JSON.parse(saved) : [];
  });

  // User list state (supporting bans and verification updates)
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('ll-users');
    return saved ? JSON.parse(saved) : photographers;
  });

  // Flagged reported photos list
  const [reports, setReports] = useState(() => {
    const saved = localStorage.getItem('ll-reports');
    return saved ? JSON.parse(saved) : [
      { id: 'rep_1', photoId: 'port-0', photographerId: '2', photographerName: 'Marcus Osei', photoUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80', reason: 'Unlicensed commercial reuse', reporter: 'GettyImages Inc.', status: 'pending' },
      { id: 'rep_2', photoId: 'port-1', photographerId: '3', photographerName: 'Sofia Reyes', photoUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&q=80', reason: 'Spam / Duplicate Upload', reporter: 'user_881', status: 'pending' }
    ];
  });

  // Battle dispute cases
  const [disputes, setDisputes] = useState(() => {
    const saved = localStorage.getItem('ll-disputes');
    return saved ? JSON.parse(saved) : [
      { id: 'dsp_1', title: 'Neon Nights Tokyo vs Golden Sun Kyoto', votesA: 1420, votesB: 1412, reason: 'Sudden spike of 200 votes in last 60 seconds (Bot suspicion)', reporter: 'Aria Nakamura', status: 'pending' }
    ];
  });

  // Active battles list state (supporting dynamic Elo updates)
  const [battles, setBattles] = useState(() => {
    const saved = localStorage.getItem('ll-battles');
    return saved ? JSON.parse(saved) : initialBattles;
  });

  // Fetch a user profile based on ID
  const fetchUserProfile = async (uid) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (data) {
        setCurrentUser(data);
        setCurrentRole(data.role);
        localStorage.setItem('ll-current-role', data.role);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  // Listen to Authentication State Changes
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserEmail(session.user.email);
        fetchUserProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUserEmail(session.user.email);
        fetchUserProfile(session.user.id);
      } else {
        setUserEmail('');
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ── SUPABASE SYNC ON MOUNT ──
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const syncFromSupabase = async () => {
      // 1. Fetch profiles (users list)
      const { data: profilesData } = await supabase.from('profiles').select('*');
      if (profilesData && profilesData.length > 0) {
        setUsers(profilesData);
      }

      // 2. Fetch bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });
      if (bookingsData) {
        const mappedBookings = bookingsData.map(b => {
          const client = profilesData?.find(p => p.id === b.client_id) || { name: 'Sarah Jenkins' };
          const photographer = profilesData?.find(p => p.id === b.photographer_id) || { name: 'Aria Nakamura', avatar: photographers[0].avatar };
          return {
            id: b.id,
            clientId: b.client_id,
            clientName: client.name,
            photographerId: b.photographer_id,
            photographerName: photographer.name,
            photographerAvatar: photographer.avatar,
            date: b.date,
            budget: b.budget,
            location: b.location,
            message: b.message,
            status: b.status,
            createdAt: b.created_at
          };
        });
        setBookings(mappedBookings);
      }

      // 3. Fetch challenges
      const { data: challengesData } = await supabase.from('challenges').select('*');
      if (challengesData && challengesData.length > 0) {
        setChallenges(challengesData);
      }

      // 4. Fetch challenge entries (submissions)
      const { data: submissionsData } = await supabase.from('challenge_entries').select('*');
      if (submissionsData) {
        setSubmissions(submissionsData);
      }

      // 5. Fetch photos
      const { data: photosData } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });
      if (photosData && photosData.length > 0) {
        const mappedPhotos = photosData.map(p => {
          const owner = profilesData?.find(usr => usr.id === p.owner_id) || { name: 'Aria Nakamura', avatar: photographers[0].avatar };
          return {
            id: p.id,
            url: p.url,
            ownerId: p.owner_id,
            ownerName: owner.name,
            ownerAvatar: owner.avatar,
            caption: p.caption,
            category: p.category,
            likes: p.votes || 0,
            aspectRatio: p.aspect_ratio || '3/4',
            timestamp: 'Just now'
          };
        });
        setPhotos(mappedPhotos);
      }

      // 6. Fetch messages and compile into threads client-side
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });
      if (messagesData) {
        const compiled = compileSupabaseThreads(messagesData, profilesData);
        setThreads(compiled);
      }
    };

    syncFromSupabase();

    // Real-time chat messaging subscription channel
    const msgChannel = supabase
      .channel('messages_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMsg = payload.new;
        appendRealtimeMessage(newMsg);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [currentUser]);

  // Helper: group flat Supabase messages list into structured UI threads
  const compileSupabaseThreads = (messagesList, profiles) => {
    const threadMap = {};
    const myId = currentUser?.id || '1';
    
    messagesList.forEach(msg => {
      if (msg.sender_id === 'system' || msg.recipient_id === 'system') return;
      const partnerId = msg.sender_id === myId ? msg.recipient_id : msg.sender_id;
      const partnerProfile = profiles?.find(p => p.id === partnerId) || photographers.find(p => p.id === partnerId) || { name: 'Sarah Jenkins', avatar: photographers[0].avatar };
      const myProfile = profiles?.find(p => p.id === myId) || { name: 'Aria Nakamura', avatar: photographers[0].avatar };

      if (!threadMap[partnerId]) {
        threadMap[partnerId] = {
          id: `th_${partnerId}`,
          photographerId: myRole() === 'photographer' ? myId : partnerId,
          photographerName: myRole() === 'photographer' ? myProfile.name : partnerProfile.name,
          photographerAvatar: myRole() === 'photographer' ? myProfile.avatar : partnerProfile.avatar,
          clientId: myRole() === 'client' ? myId : partnerId,
          clientName: myRole() === 'client' ? myProfile.name : partnerProfile.name,
          messages: []
        };
      }
      
      threadMap[partnerId].messages.push({
        id: msg.id,
        senderId: msg.sender_id,
        senderName: msg.sender_id === myId ? myProfile.name : partnerProfile.name,
        body: msg.body,
        timestamp: msg.timestamp
      });
    });
    return Object.values(threadMap);
  };

  const myRole = () => currentUser?.role || currentRole;

  // Helper: push live incoming message from real-time channel to state array
  const appendRealtimeMessage = (m) => {
    const partnerId = m.sender_id === '1' ? m.recipient_id : m.sender_id;
    setThreads(prev => {
      const exists = prev.find(t => t.clientId === partnerId || t.photographerId === partnerId);
      if (exists) {
        return prev.map(t => {
          if (t.id === exists.id) {
            // Avoid duplicates
            if (t.messages.some(msg => msg.id === m.id)) return t;
            return {
              ...t,
              messages: [...t.messages, {
                id: m.id,
                senderId: m.sender_id,
                senderName: m.sender_id === '1' ? 'Aria Nakamura' : 'Sarah Jenkins',
                body: m.body,
                timestamp: m.timestamp
              }]
            };
          }
          return t;
        });
      }
      return prev;
    });
  };

  // ── LOCAL STORAGE FALLBACK SYNCS ──
  useEffect(() => {
    localStorage.setItem('ll-current-role', currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem('ll-user-email', userEmail);
  }, [userEmail]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem('ll-bookings', JSON.stringify(bookings));
    }
  }, [bookings]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem('ll-threads', JSON.stringify(threads));
    }
  }, [threads]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem('ll-challenges', JSON.stringify(challenges));
    }
  }, [challenges]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem('ll-submissions', JSON.stringify(submissions));
    }
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem('ll-users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('ll-reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem('ll-disputes', JSON.stringify(disputes));
  }, [disputes]);

  useEffect(() => {
    localStorage.setItem('ll-battles', JSON.stringify(battles));
  }, [battles]);

  const switchRole = (role) => {
    setCurrentRole(role);
  };

  // ── CORE DATA TRANSACTION HANDLERS ──

  // Booking requests
  const addBookingRequest = async (photographerId, details) => {
    const photographer = users.find(p => p.id === photographerId) || photographers[0];
    const clientUid = currentUser?.id || 'client_1';
    const clientName = currentUser?.name || 'Sarah Jenkins';

    const newBooking = {
      id: `bk_${Date.now()}`,
      clientId: clientUid,
      clientName: clientName,
      photographerId,
      photographerName: photographer.name,
      photographerAvatar: photographer.avatar,
      date: details.date,
      budget: details.budget,
      location: details.location,
      message: details.message,
      status: 'requested',
      createdAt: new Date().toISOString(),
    };

    setBookings(prev => [newBooking, ...prev]);

    if (isSupabaseConfigured) {
      await supabase.from('bookings').insert({
        client_id: clientUid,
        photographer_id: photographerId,
        date: details.date,
        budget: details.budget,
        location: details.location,
        message: details.message,
        status: 'requested'
      });
    }

    // Auto seed default message thread
    const newThread = {
      id: `th_${Date.now()}`,
      photographerId,
      photographerName: photographer.name,
      photographerAvatar: photographer.avatar,
      clientId: clientUid,
      clientName: clientName,
      messages: [
        {
          id: `msg_${Date.now()}`,
          senderId: clientUid,
          senderName: clientName,
          body: `Hi ${photographer.name}! I requested a booking for ${details.date} (budget: ${details.budget}). Details: ${details.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]
    };

    setThreads(prev => {
      const exists = prev.find(t => t.photographerId === photographerId && t.clientId === clientUid);
      if (exists) {
        return prev.map(t => {
          if (t.id === exists.id) {
            return { ...t, messages: [...t.messages, newThread.messages[0]] };
          }
          return t;
        });
      }
      return [newThread, ...prev];
    });

    if (isSupabaseConfigured) {
      await supabase.from('messages').insert({
        sender_id: clientUid,
        recipient_id: photographerId,
        body: `Hi ${photographer.name}! I requested a booking for ${details.date}. Details: ${details.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  };

  const acceptBooking = async (bookingId) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'accepted' } : b));
    
    if (isSupabaseConfigured) {
      await supabase.from('bookings').update({ status: 'accepted' }).eq('id', bookingId);
    }

    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      addSystemMessage(booking.photographerId, booking.clientId, `${booking.photographerName} accepted the booking request! Chat is now active.`);
    }
  };

  const declineBooking = async (bookingId) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'declined' } : b));
    
    if (isSupabaseConfigured) {
      await supabase.from('bookings').update({ status: 'declined' }).eq('id', bookingId);
    }

    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      addSystemMessage(booking.photographerId, booking.clientId, 'Booking request was declined by the photographer.');
    }
  };

  const completeBooking = async (bookingId) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'completed' } : b));
    
    if (isSupabaseConfigured) {
      await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId);
    }
  };

  const addSystemMessage = async (photographerId, clientId, body) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setThreads(prev => prev.map(t => {
      if (t.photographerId === photographerId && t.clientId === clientId) {
        return {
          ...t,
          messages: [
            ...t.messages,
            { id: `msg_sys_${Date.now()}`, senderId: 'system', senderName: 'System', body, timestamp }
          ]
        };
      }
      return t;
    }));

    if (isSupabaseConfigured) {
      await supabase.from('messages').insert({
        sender_id: 'system',
        recipient_id: clientId,
        body,
        timestamp
      });
    }
  };

  // Chats
  const sendMessage = async (threadId, body) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const senderId = currentUser?.id || (currentRole === 'photographer' ? '1' : 'client_1');
    const senderName = currentUser?.name || (currentRole === 'photographer' ? 'Aria Nakamura' : 'Sarah Jenkins');

    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        return {
          ...t,
          messages: [
            ...t.messages,
            { id: `msg_${Date.now()}`, senderId, senderName, body, timestamp }
          ]
        };
      }
      return t;
    }));

    if (isSupabaseConfigured) {
      const thread = threads.find(t => t.id === threadId);
      if (thread) {
        const recipientId = senderId === thread.photographerId ? thread.clientId : thread.photographerId;
        await supabase.from('messages').insert({
          sender_id: senderId,
          recipient_id: recipientId,
          body,
          timestamp
        });
      }
    }
  };

  // Challenges
  const submitChallengeEntry = async (challengeId, photoUrl) => {
    const newSubmission = {
      challengeId,
      photoUrl,
      submittedAt: new Date().toISOString()
    };
    
    setSubmissions(prev => [...prev, newSubmission]);
    setChallenges(prev => prev.map(ch => {
      if (ch.id === challengeId) {
        return { ...ch, entries: ch.entries + 1 };
      }
      return ch;
    }));

    if (isSupabaseConfigured) {
      await supabase.from('challenge_entries').insert({
        challenge_id: challengeId,
        photo_url: photoUrl,
        photographer_id: currentUser?.id || '1'
      });
    }
  };

  // Admin actions
  const approvePhotoReport = async (reportId) => {
    setReports(prev => prev.map(rep => rep.id === reportId ? { ...rep, status: 'approved' } : rep));
    if (isSupabaseConfigured) {
      await supabase.from('reports').update({ status: 'approved' }).eq('id', reportId);
    }
  };

  const removeReportedPhoto = async (reportId) => {
    setReports(prev => prev.map(rep => rep.id === reportId ? { ...rep, status: 'removed' } : rep));
    if (isSupabaseConfigured) {
      await supabase.from('reports').update({ status: 'removed' }).eq('id', reportId);
    }
  };

  const verifyPhotographer = async (userId) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, verified: true } : u));
    if (isSupabaseConfigured) {
      await supabase.from('profiles').update({ verified: true }).eq('id', userId);
    }
  };

  const banPhotographer = async (userId) => {
    const userObj = users.find(u => u.id === userId);
    if (!userObj) return;
    const nextBanned = !userObj.banned;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: nextBanned } : u));
    if (isSupabaseConfigured) {
      await supabase.from('profiles').update({ banned: nextBanned }).eq('id', userId);
    }
  };

  const castBattleVote = async (battleId, side) => {
    // 1. Find the battle
    const battle = battles.find(b => b.id === battleId);
    if (!battle) return null;

    // 2. Fetch current ratings (default to 1200)
    const ratingA = battle.photoA.rating || 1200;
    const ratingB = battle.photoB.rating || 1200;

    // 3. Compute new Elo scores
    const outcomeA = side === 'a' ? 1 : 0;
    const eloResults = calculateElo(ratingA, ratingB, outcomeA);

    // 4. Update local battles state array
    setBattles(prev => prev.map(b => {
      if (b.id === battleId) {
        return {
          ...b,
          photoA: {
            ...b.photoA,
            rating: eloResults.newRatingA,
            votes: side === 'a' ? b.photoA.votes + 1 : b.photoA.votes
          },
          photoB: {
            ...b.photoB,
            rating: eloResults.newRatingB,
            votes: side === 'b' ? b.photoB.votes + 1 : b.photoB.votes
          },
          totalVotes: b.totalVotes + 1
        };
      }
      return b;
    }));

    // 5. Update creator points dynamically on the leaderboard
    const changeA = eloResults.rawChangeA;
    const changeB = eloResults.rawChangeB;

    setUsers(prevUsers => prevUsers.map(u => {
      if (u.id === battle.photoA.photographerId) {
        return { ...u, points: Math.max(0, (u.points || 0) + changeA) };
      }
      if (u.id === battle.photoB.photographerId) {
        return { ...u, points: Math.max(0, (u.points || 0) + changeB) };
      }
      return u;
    }));

    // 6. Supabase DB Updates (if configured)
    if (isSupabaseConfigured) {
      try {
        await supabase.from('photos').update({ votes: eloResults.newRatingA }).eq('id', battle.photoA.id);
        await supabase.from('photos').update({ votes: eloResults.newRatingB }).eq('id', battle.photoB.id);

        const { data: pA } = await supabase.from('profiles').select('points').eq('id', battle.photoA.photographerId).single();
        const { data: pB } = await supabase.from('profiles').select('points').eq('id', battle.photoB.photographerId).single();

        if (pA) {
          await supabase.from('profiles').update({ points: Math.max(0, (pA.points || 0) + changeA) }).eq('id', battle.photoA.photographerId);
        }
        if (pB) {
          await supabase.from('profiles').update({ points: Math.max(0, (pB.points || 0) + changeB) }).eq('id', battle.photoB.photographerId);
        }
      } catch (err) {
        console.warn('Supabase DB Elo update error:', err.message);
      }
    }

    return {
      changeA: eloResults.changeA,
      changeB: eloResults.changeB,
      newRatingA: eloResults.newRatingA,
      newRatingB: eloResults.newRatingB
    };
  };

  const resolveDispute = async (disputeId, resolution) => {
    setDisputes(prev => prev.map(dsp => dsp.id === disputeId ? { ...dsp, status: 'resolved', resolution } : dsp));
    if (isSupabaseConfigured) {
      await supabase.from('disputes').update({ status: 'resolved', resolution }).eq('id', disputeId);
    }
  };

  const updateProfile = async (userId, data) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
    if (isSupabaseConfigured) {
      await supabase.from('profiles').update(data).eq('id', userId);
    }
  };

  const fetchPhotosPaginated = async (start, end) => {
    if (!isSupabaseConfigured) {
      // Mock local storage fallback range slicing
      return photos.slice(start, end + 1);
    }
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*, profiles:owner_id(*)')
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) {
        console.error('Error fetching paginated photos:', error);
        return [];
      }
      if (data) {
        return data.map(p => {
          const owner = p.profiles || { name: 'Aria Nakamura', avatar: photographers[0].avatar };
          return {
            id: p.id,
            url: p.url,
            ownerId: p.owner_id,
            ownerName: owner.name,
            ownerAvatar: owner.avatar,
            caption: p.caption,
            category: p.category,
            likes: p.votes || 0,
            aspectRatio: p.aspect_ratio || '3/4',
            timestamp: 'Just now'
          };
        });
      }
    } catch (err) {
      console.error('Exception fetching paginated photos:', err);
    }
    return [];
  };

  return (
    <AppContext.Provider value={{
      currentRole,
      switchRole,
      userEmail,
      setUserEmail,
      currentUser,
      photos,
      setPhotos,
      bookings,
      threads,
      challenges,
      submissions,
      users,
      reports,
      disputes,
      battles,
      setBattles,
      addBookingRequest,
      acceptBooking,
      declineBooking,
      completeBooking,
      sendMessage,
      submitChallengeEntry,
      approvePhotoReport,
      removeReportedPhoto,
      verifyPhotographer,
      banPhotographer,
      resolveDispute,
      updateProfile,
      castBattleVote,
      fetchPhotosPaginated
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
