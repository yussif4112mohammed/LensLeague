import { createContext, useContext, useState, useEffect } from 'react';
import { photographers } from '../data/photographers';
import { challenges as initialChallenges } from '../data/challenges';

const AppContext = createContext(null);

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
  // Roles switcher: 'photographer' (Aria Nakamura, ID: 1) or 'client' (Sarah Jenkins, ID: client_1)
  const [currentRole, setCurrentRole] = useState(() => localStorage.getItem('ll-current-role') || 'photographer');

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

  useEffect(() => {
    localStorage.setItem('ll-current-role', currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem('ll-bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('ll-threads', JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    localStorage.setItem('ll-challenges', JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    localStorage.setItem('ll-submissions', JSON.stringify(submissions));
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

  // Switch role helper
  const switchRole = (role) => {
    setCurrentRole(role);
  };

  // Submit a new booking request (Client side)
  const addBookingRequest = (photographerId, details) => {
    const photographer = photographers.find(p => p.id === photographerId) || photographers[0];
    const newBooking = {
      id: `bk_${Date.now()}`,
      clientId: 'client_1',
      clientName: 'Sarah Jenkins',
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

    // Automatically seed a message thread for this booking
    const newThread = {
      id: `th_${Date.now()}`,
      photographerId,
      photographerName: photographer.name,
      photographerAvatar: photographer.avatar,
      clientId: 'client_1',
      clientName: 'Sarah Jenkins',
      messages: [
        {
          id: `msg_${Date.now()}`,
          senderId: 'client_1',
          senderName: 'Sarah Jenkins',
          body: `Hi ${photographer.name}! I requested a booking for ${details.date} (budget: ${details.budget}). Here are details: ${details.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]
    };

    setThreads(prev => {
      // Check if thread already exists
      const exists = prev.find(t => t.photographerId === photographerId && t.clientId === 'client_1');
      if (exists) {
        // Just append the message to the existing thread
        return prev.map(t => {
          if (t.id === exists.id) {
            return {
              ...t,
              messages: [...t.messages, newThread.messages[0]]
            };
          }
          return t;
        });
      }
      return [newThread, ...prev];
    });
  };

  // Accept a booking request (Photographer side)
  const acceptBooking = (bookingId) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'accepted' } : b));
    
    // Add system notification message to the chat
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      addSystemMessage(booking.photographerId, booking.clientId, 'Aria Nakamura accepted the booking request! Chat is now active.');
    }
  };

  // Decline a booking request (Photographer side)
  const declineBooking = (bookingId) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'declined' } : b));
    
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      addSystemMessage(booking.photographerId, booking.clientId, 'Booking request was declined by the photographer.');
    }
  };

  // Complete a shoot (Photographer side)
  const completeBooking = (bookingId) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'completed' } : b));
  };

  // Helper to add system-level message in a chat thread
  const addSystemMessage = (photographerId, clientId, body) => {
    setThreads(prev => prev.map(t => {
      if (t.photographerId === photographerId && t.clientId === clientId) {
        return {
          ...t,
          messages: [
            ...t.messages,
            {
              id: `msg_sys_${Date.now()}`,
              senderId: 'system',
              senderName: 'System',
              body,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          ]
        };
      }
      return t;
    }));
  };

  // Send a custom chat message
  const sendMessage = (threadId, body) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const senderId = currentRole === 'photographer' ? '1' : 'client_1';
    const senderName = currentRole === 'photographer' ? 'Aria Nakamura' : 'Sarah Jenkins';

    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        return {
          ...t,
          messages: [
            ...t.messages,
            {
              id: `msg_${Date.now()}`,
              senderId,
              senderName,
              body,
              timestamp,
            }
          ]
        };
      }
      return t;
    }));
  };

  // Submit entry to a challenge
  const submitChallengeEntry = (challengeId, photoUrl) => {
    const newSubmission = {
      challengeId,
      photoUrl,
      submittedAt: new Date().toISOString()
    };
    setSubmissions(prev => [...prev, newSubmission]);
    setChallenges(prev => prev.map(ch => {
      if (ch.id === challengeId) {
        return {
          ...ch,
          entries: ch.entries + 1
        };
      }
      return ch;
    }));
  };

  // Approve reported photo (dismiss report)
  const approvePhotoReport = (reportId) => {
    setReports(prev => prev.map(rep => rep.id === reportId ? { ...rep, status: 'approved' } : rep));
  };

  // Remove reported photo (delete photo)
  const removeReportedPhoto = (reportId) => {
    setReports(prev => prev.map(rep => rep.id === reportId ? { ...rep, status: 'removed' } : rep));
  };

  // Verify photographer
  const verifyPhotographer = (userId) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, verified: true } : u));
  };

  // Ban/Unban photographer
  const banPhotographer = (userId) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, banned: !u.banned };
      }
      return u;
    }));
  };

  // Resolve disputes
  const resolveDispute = (disputeId, resolution) => {
    setDisputes(prev => prev.map(dsp => dsp.id === disputeId ? { ...dsp, status: 'resolved', resolution } : dsp));
  };

  return (
    <AppContext.Provider value={{
      currentRole,
      switchRole,
      bookings,
      threads,
      challenges,
      submissions,
      users,
      reports,
      disputes,
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
      resolveDispute
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
