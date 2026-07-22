import { createContext, useContext, useState, useEffect } from 'react';
import { calculateElo } from '../lib/elo';
import { supabase } from '../lib/supabaseClient';

const AppContext = createContext(null);

const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

const DEFAULT_BOOKINGS = [];
const DEFAULT_THREADS = [];

export function AppProvider({ children }) {
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('ll-user-email') || '');
  const [currentRole, setCurrentRole] = useState(() => localStorage.getItem('ll-current-role') || 'photographer');
  const [currentUser, setCurrentUser] = useState(null);

  // Photos list state
  const [photos, setPhotos] = useState(() => {
    const saved = localStorage.getItem('ll-photos');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // Bookings list state
  const [bookings, setBookings] = useState(() => {
    const saved = localStorage.getItem('ll-bookings');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // Chat threads list state
  const [threads, setThreads] = useState(() => {
    const saved = localStorage.getItem('ll-threads');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // Challenges active list state
  const [challenges, setChallenges] = useState(() => {
    const saved = localStorage.getItem('ll-challenges');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // User submissions to challenges
  const [submissions, setSubmissions] = useState(() => {
    const saved = localStorage.getItem('ll-submissions');
    return saved ? JSON.parse(saved) : [];
  });

  // User list state (supporting bans and verification updates)
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('ll-users');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // Flagged reported photos list
  const [reports, setReports] = useState(() => {
    const saved = localStorage.getItem('ll-reports');
    return saved ? JSON.parse(saved) : [];
  });

  // Battle dispute cases
  const [disputes, setDisputes] = useState(() => {
    const saved = localStorage.getItem('ll-disputes');
    return saved ? JSON.parse(saved) : [];
  });

  // Active battles list state (supporting dynamic Elo updates)
  const [battles, setBattles] = useState(() => {
    const saved = localStorage.getItem('ll-battles');
    return saved ? JSON.parse(saved) : [];
  });

  // Follows and comments states
  const [follows, setFollows] = useState([]);
  const [comments, setComments] = useState([]);

  const signUpUser = async ({ name, email, password, role = 'photographer', location = 'Tokyo, Japan' }) => {
    try {
      let createdProfile = {
        id: `usr_${Date.now()}`,
        name,
        username: email.split('@')[0].toLowerCase(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        bio: role === 'photographer' ? 'LensLeague Photographer.' : 'Client on LensLeague.',
        location,
        role,
        verified: false,
        banned: false,
        points: 100,
        global_rank: 42
      };

      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, role, location }
          }
        });

        if (error) throw error;

        if (data.user) {
          createdProfile.id = data.user.id;
          const { error: profileError } = await supabase.from('profiles').insert(createdProfile);
          if (profileError) console.warn('Supabase profile creation note:', profileError.message);
        }
      }

      setUserEmail(email);
      setCurrentUser(createdProfile);
      setCurrentRole(role);
      localStorage.setItem('ll-user-email', email);
      localStorage.setItem('ll-current-role', role);

      await recordAuditLog('USER_SIGNUP', createdProfile.id, { role, email });
      return { success: true, user: createdProfile };
    } catch (err) {
      console.error('SignUp Error:', err);
      return { success: false, error: 'Sign up failed. Please check your credentials.' };
    }
  };

  const loginUser = async ({ email, password }) => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          return { success: false, error: 'Invalid email or password.' };
        }

        if (data.user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
          if (profile) {
            setUserEmail(email);
            setCurrentUser(profile);
            setCurrentRole(profile.role);
            localStorage.setItem('ll-user-email', email);
            localStorage.setItem('ll-current-role', profile.role);
            await recordAuditLog('USER_LOGIN', profile.id, { email });
            return { success: true, user: profile };
          }
        }
      }

      // Local fallback mock login if Supabase not connected or test mode
      const mockProfile = {
        id: `usr_${Date.now()}`,
        name: email.split('@')[0],
        username: email.split('@')[0].toLowerCase(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
        bio: 'LensLeague Member',
        location: 'Tokyo, JP',
        role: 'photographer',
        points: 250,
        global_rank: 14
      };

      setUserEmail(email);
      setCurrentUser(mockProfile);
      localStorage.setItem('ll-user-email', email);
      return { success: true, user: mockProfile };
    } catch (err) {
      return { success: false, error: 'Invalid email or password.' };
    }
  };

  // Fetch a user profile based on ID
  const fetchUserProfile = async (uid) => {
    try {
      if (!isSupabaseConfigured) return;
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (existingProfile) {
        setCurrentUser(existingProfile);
        setCurrentRole(existingProfile.role);
        localStorage.setItem('ll-current-role', existingProfile.role);
      }
    } catch (err) {
      console.warn('Error fetching user profile:', err);
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
      // 1. Fetch profiles (users list) - Limit to 100 for now to prevent memory bloat
      const { data: profilesData } = await supabase.from('profiles').select('*').limit(100);
      const fetchedUsers = profilesData || [];
      setUsers(fetchedUsers);

      // 2. Fetch photos - Limit to 100 for feed performance
      const { data: photosData } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (photosData) {
        const mappedPhotos = photosData.map(p => {
          const owner = fetchedUsers.find(usr => usr.id === p.owner_id) || { name: 'Anonymous', avatar: '' };
          return {
            id: p.id,
            url: p.url,
            ownerId: p.owner_id,
            ownerName: owner.name || 'Anonymous',
            ownerAvatar: owner.avatar || '',
            caption: p.caption,
            category: p.category,
            likes: p.votes || 0,
            aspectRatio: p.aspect_ratio || '3/4',
            timestamp: 'Just now'
          };
        });
        setPhotos(mappedPhotos);
        
        // Dynamically generate fair battles based on matching aspect ratios
        const generateFairBattles = (photoList) => {
          const grouped = {};
          photoList.forEach(p => {
            const ratio = p.aspectRatio || '3/4';
            if (!grouped[ratio]) grouped[ratio] = [];
            grouped[ratio].push(p);
          });
          
          let dynamicBattles = [];
          Object.keys(grouped).forEach(ratio => {
            const list = grouped[ratio];
            // Shuffle list for randomness
            for (let i = list.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [list[i], list[j]] = [list[j], list[i]];
            }
            
            // Pair them up
            for (let i = 0; i < list.length - 1; i += 2) {
              const pA = list[i];
              const pB = list[i+1];
              dynamicBattles.push({
                id: `bat_${Date.now()}_${pA.id}_${pB.id}`,
                category: pA.category === pB.category ? pA.category : 'Mixed ' + ratio,
                endsIn: '24h',
                photoA: { ...pA, score: 1200 },
                photoB: { ...pB, score: 1200 },
              });
            }
          });
          
          // Shuffle final battles array
          for (let i = dynamicBattles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dynamicBattles[i], dynamicBattles[j]] = [dynamicBattles[j], dynamicBattles[i]];
          }
          return dynamicBattles;
        };
        
        setBattles(generateFairBattles(mappedPhotos));
      } else {
        setPhotos([]);
        setBattles([]);
      }

      // 3. Fetch challenges & submissions
      const { data: challengesData } = await supabase.from('challenges').select('*');
      setChallenges(challengesData || []);

      const { data: submissionsData } = await supabase.from('challenge_entries').select('*').limit(200);
      setSubmissions(submissionsData || []);

      // 4. PRIVATE DATA (Only fetch if logged in)
      if (currentUser) {
        // Bookings - only where user is client or photographer
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('*')
          .or(`client_id.eq.${currentUser.id},photographer_id.eq.${currentUser.id}`)
          .order('created_at', { ascending: false });
        
        if (bookingsData && bookingsData.length > 0) {
          const mappedBookings = bookingsData.map(b => {
            const client = profilesData?.find(p => p.id === b.client_id) || { name: 'Unknown Client' };
            const photographer = profilesData?.find(p => p.id === b.photographer_id) || { name: 'Unknown Photographer' };
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
        } else {
          setBookings([]);
        }

        // Messages
        const { data: messagesData } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
          .order('created_at', { ascending: true })
          .limit(1000);
        if (messagesData && messagesData.length > 0) {
          const compiled = compileSupabaseThreads(messagesData, profilesData);
          setThreads(compiled);
        } else {
          setThreads([]);
        }

        // Follows
        const { data: followsData } = await supabase
          .from('follows')
          .select('*')
          .or(`follower_id.eq.${currentUser.id},following_id.eq.${currentUser.id}`);
        if (followsData) setFollows(followsData);
      } else {
        // If logged out, clear private data from memory
        setBookings([]);
        setThreads([]);
        setFollows([]);
      }

      // 5. Comments - Limit to recent 500 across app
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, profiles:user_id(*)')
        .order('created_at', { ascending: false })
        .limit(500);
      if (commentsData) {
        const mappedComments = commentsData.map(c => {
          const user = c.profiles || { name: 'Aria Nakamura', avatar: photographers[0].avatar };
          return {
            id: c.id,
            photo_id: c.photo_id,
            user_id: c.user_id,
            body: c.body,
            created_at: c.created_at,
            userName: user.name,
            userAvatar: user.avatar
          };
        });
        setComments(mappedComments);
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
    const myId = currentUser?.id || '1';
    const partnerId = m.sender_id === myId ? m.recipient_id : m.sender_id;
    setThreads(prev => {
      const exists = prev.find(t => t.clientId === partnerId || t.photographerId === partnerId);
      if (exists) {
        return prev.map(t => {
          if (t.id === exists.id) {
            // Avoid duplicates
            if (t.messages.some(msg => msg.id === m.id)) return t;
            const senderProfile = users.find(u => u.id === m.sender_id) || { name: m.sender_id === myId ? 'Me' : 'Partner' };
            return {
              ...t,
              messages: [...t.messages, {
                id: m.id,
                senderId: m.sender_id,
                senderName: senderProfile.name,
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

    if (isSupabaseConfigured && String(photographerId).includes('-')) {
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
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, ...data }));
    }
    if (isSupabaseConfigured) {
      await supabase.from('profiles').update(data).eq('id', userId);
    }
  };

  const fetchPhotosPaginated = async (start, end, filterType = 'for-you') => {
    let basePhotos = photos;
    if (filterType === 'following' && currentUser) {
      const followedIds = follows.filter(f => f.follower_id === currentUser.id).map(f => f.following_id);
      basePhotos = photos.filter(p => followedIds.includes(p.ownerId));
    }

    if (!isSupabaseConfigured) {
      // Mock local storage fallback range slicing
      return basePhotos.slice(start, end + 1);
    }
    try {
      let query = supabase.from('photos').select('*, profiles:owner_id(*)');

      if (filterType === 'following' && currentUser) {
        const followedIds = follows.filter(f => f.follower_id === currentUser.id).map(f => f.following_id);
        if (followedIds.length === 0) {
          return []; // return empty if not following anyone
        }
        query = query.in('owner_id', followedIds);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) {
        console.warn('Error fetching paginated photos, falling back to local mock data:', error);
        return basePhotos.slice(start, end + 1);
      }
      if (data && data.length > 0) {
        return data.map(p => {
          const owner = p.profiles || { name: 'Photographer', avatar: '' };
          return {
            id: p.id,
            url: p.url,
            isVideo: p.url?.toLowerCase()?.includes('.mp4') || p.url?.toLowerCase()?.includes('.webm') || p.url?.includes('/video/'),
            ownerId: p.owner_id,
            ownerName: owner.name || 'Photographer',
            ownerAvatar: owner.avatar || '',
            caption: p.caption,
            category: p.category,
            gear: p.gear,
            location: p.location,
            likes: p.votes || 0,
            aspectRatio: p.aspect_ratio || (p.url?.toLowerCase()?.includes('.mp4') ? '9/16' : '3/4'),
            timestamp: 'Just now'
          };
        });
      } else {
        // Fallback to local mock photos if database is empty
        return basePhotos.slice(start, end + 1);
      }
    } catch (err) {
      console.warn('Exception fetching paginated photos, falling back to local mock data:', err);
      return basePhotos.slice(start, end + 1);
    }
  };

  const uploadPhoto = async ({ url, caption, category, destination = 'feed', alt_text = '' }) => {
    const userId = currentUser?.id || 'anon_user';
    const userName = currentUser?.name || 'Anonymous Photographer';
    const userAvatar = currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop';

    const newPhoto = {
      id: `p_${Date.now()}`,
      url,
      owner_id: userId,
      ownerId: userId,
      ownerName: userName,
      ownerAvatar: userAvatar,
      caption: caption || 'New photography post',
      category: category || 'Nature',
      destination,
      alt_text,
      likes: 0,
      comments: 0,
      created_at: new Date().toISOString(),
      timestamp: 'Just now'
    };

    setPhotos(prev => [newPhoto, ...prev]);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('photos').insert({
          url,
          owner_id: userId,
          caption,
          category,
          destination,
          alt_text
        });
      } catch (err) {
        console.warn('Supabase photo upload note:', err.message);
      }
    }

    await recordAuditLog('PHOTO_UPLOAD', newPhoto.id, { category, destination });
    return newPhoto;
  };

  const followUser = async (followingId) => {
    const followerId = currentUser?.id;
    if (!followerId) return;

    const newFollow = { follower_id: followerId, following_id: followingId };
    setFollows(prev => [...prev, newFollow]);

    if (isSupabaseConfigured && String(followingId).includes('-')) {
      try {
        await supabase.from('follows').insert(newFollow);
      } catch (err) {
        console.warn('Supabase follow error:', err.message);
      }
    }
  };

  const unfollowUser = async (followingId) => {
    const followerId = currentUser?.id;
    if (!followerId) return;

    setFollows(prev => prev.filter(f => !(f.follower_id === followerId && f.following_id === followingId)));

    if (isSupabaseConfigured && String(followingId).includes('-')) {
      try {
        await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId);
      } catch (err) {
        console.warn('Supabase unfollow error:', err.message);
      }
    }
  };

  const addPhotoComment = async (photoId, body) => {
    const userId = currentUser?.id;
    if (!userId) return;

    const newComment = {
      id: `c_${Date.now()}`,
      photo_id: photoId,
      user_id: userId,
      body: body,
      created_at: new Date().toISOString(),
      userName: currentUser.name || 'Anonymous',
      userAvatar: currentUser.avatar || photographers[0].avatar
    };

    setComments(prev => [...prev, newComment]);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('comments').insert({
          photo_id: photoId,
          user_id: userId,
          body: body
        });
      } catch (err) {
        console.warn('Supabase comment insert error:', err.message);
      }
    }
  };

  const logoutUser = async () => {
    setUserEmail('');
    setCurrentUser(null);
    localStorage.removeItem('ll-user-email');
    localStorage.removeItem('ll-current-role');
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  };

  // Audit Logging (OWASP Top 10 Transparency)
  const recordAuditLog = async (action, target, metadata = {}) => {
    const actorId = currentUser?.id;
    if (!actorId) return;

    if (isSupabaseConfigured) {
      try {
        await supabase.from('audit_logs').insert({
          actor_id: actorId,
          action,
          target,
          metadata
        });
      } catch (err) {
        console.warn('Audit log insert warning:', err.message);
      }
    }
  };

  // LinkedIn-style Mutual Connections State
  const [connections, setConnections] = useState([]);

  const requestConnection = async (targetUserId) => {
    const userId = currentUser?.id;
    if (!userId || userId === targetUserId) return;

    const newConn = {
      id: `conn_${Date.now()}`,
      user_a_id: userId,
      user_b_id: targetUserId,
      status: 'pending',
      requested_by: userId,
      created_at: new Date().toISOString()
    };

    setConnections(prev => [...prev, newConn]);
    await recordAuditLog('CONNECTION_REQUEST', targetUserId, { status: 'pending' });

    if (isSupabaseConfigured) {
      try {
        await supabase.from('connections').insert({
          user_a_id: userId,
          user_b_id: targetUserId,
          status: 'pending',
          requested_by: userId
        });
      } catch (err) {
        console.warn('Supabase connection request error:', err.message);
      }
    }
  };

  const acceptConnection = async (connectionId) => {
    setConnections(prev => prev.map(c => c.id === connectionId ? { ...c, status: 'accepted' } : c));
    await recordAuditLog('CONNECTION_ACCEPT', connectionId, { status: 'accepted' });

    if (isSupabaseConfigured) {
      try {
        await supabase.from('connections').update({ status: 'accepted' }).eq('id', connectionId);
      } catch (err) {
        console.warn('Supabase connection accept error:', err.message);
      }
    }
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
      fetchPhotosPaginated,
      uploadPhoto,
      signUpUser,
      loginUser,
      logoutUser,
      follows,
      comments,
      connections,
      requestConnection,
      acceptConnection,
      recordAuditLog,
      followUser,
      unfollowUser,
      addPhotoComment
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
