import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import './InboxPage.css';

export default function InboxPage() {
  const { currentRole, currentUser, bookings, threads, acceptBooking, declineBooking, sendMessage, completeBooking } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'bookings'
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [messageText, setMessageText] = useState('');

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
  const selectedThread = roleThreads.find(t => t.id === selectedThreadId);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMessage(selectedThreadId, messageText);
    setMessageText('');
  };

  const tabs = [
    { label: 'Chats', value: 'chats' },
    { label: isPhotographer ? 'Booking Requests' : 'Bookings Tracker', value: 'bookings' }
  ];

  return (
    <div className="inbox-page">
      <div className="inbox-header">
        <h1 className="display-lg">Inbox</h1>
        <SegmentedControl options={tabs} value={activeTab} onChange={setActiveTab} id="inbox-tabs" />
      </div>

      <div className="inbox-container">
        {/* Left Side: Chats / Bookings list */}
        <div className={`inbox-sidebar ${selectedThreadId ? 'inbox-sidebar--hidden' : ''}`}>
          {activeTab === 'chats' ? (
            <div className="threads-list">
              {roleThreads.length === 0 ? (
                <div className="inbox-empty">
                  <span>💬</span>
                  <p className="body-md text-secondary">No conversations yet.</p>
                </div>
              ) : (
                roleThreads.map(t => {
                  const lastMsg = t.messages[t.messages.length - 1];
                  const partnerName = isPhotographer ? t.clientName : t.photographerName;
                  return (
                    <div 
                      key={t.id} 
                      className={`thread-row ${selectedThreadId === t.id ? 'thread-row--active' : ''}`}
                      onClick={() => setSelectedThreadId(t.id)}
                      id={`thread-${t.id}`}
                    >
                      <img 
                        src={t.photographerAvatar || t.clientAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName)}&background=random`} 
                        alt={partnerName} 
                        className="thread-row__avatar" 
                      />
                      <div className="thread-row__info">
                        <div className="thread-row__header">
                          <span className="body-md font-bold text-primary">{partnerName}</span>
                          <span className="body-sm text-tertiary">{lastMsg?.timestamp || ''}</span>
                        </div>
                        <p className="thread-row__snippet text-secondary body-sm">
                          {lastMsg ? lastMsg.body : 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="bookings-inbox-list">
              {roleBookings.length === 0 ? (
                <div className="inbox-empty">
                  <span>📅</span>
                  <p className="body-md text-secondary">No bookings found.</p>
                </div>
              ) : (
                roleBookings.map(b => (
                  <div key={b.id} className="booking-inbox-card" id={`booking-card-${b.id}`}>
                    <div className="booking-inbox-card__header">
                      <div className="booking-inbox-card__client-info">
                        <span className="body-md font-bold text-primary">
                          {isPhotographer ? b.clientName : `To: ${b.photographerName}`}
                        </span>
                        <span className="body-sm text-tertiary">{b.location}</span>
                      </div>
                      <span className={`booking-badge booking-badge--${b.status}`}>
                        {b.status}
                      </span>
                    </div>

                    <div className="booking-inbox-card__meta body-sm text-secondary">
                      <div>🗓️ {b.date}</div>
                      <div>💰 Budget: {b.budget}</div>
                    </div>

                    <p className="booking-inbox-card__desc body-sm text-tertiary">
                      "{b.message}"
                    </p>

                    {isPhotographer && b.status === 'requested' && (
                      <div className="booking-inbox-card__actions">
                        <button 
                          className="booking-btn booking-btn--decline"
                          onClick={() => declineBooking(b.id)}
                          id={`decline-${b.id}`}
                        >
                          Decline
                        </button>
                        <button 
                          className="booking-btn booking-btn--accept"
                          onClick={() => acceptBooking(b.id)}
                          id={`accept-${b.id}`}
                        >
                          Accept
                        </button>
                      </div>
                    )}

                    {isPhotographer && b.status === 'accepted' && (
                      <button 
                        className="booking-btn booking-btn--complete"
                        onClick={() => completeBooking(b.id)}
                        id={`complete-${b.id}`}
                      >
                        Mark Completed Shoot
                      </button>
                    )}

                    {!isPhotographer && b.status === 'accepted' && (
                      <button 
                        className="booking-btn booking-btn--chat"
                        onClick={() => {
                          const thread = roleThreads.find(t => t.photographerId === b.photographerId);
                          if (thread) {
                            setSelectedThreadId(thread.id);
                            setActiveTab('chats');
                          }
                        }}
                        id={`chat-booking-${b.id}`}
                      >
                        Message Photographer
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Side: Chat message container */}
        <div className={`chat-container ${!selectedThreadId ? 'chat-container--hidden' : ''}`}>
          {selectedThread ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <button className="chat-header__back" onClick={() => setSelectedThreadId(null)}>←</button>
                <img 
                  src={isPhotographer ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&q=80' : selectedThread.photographerAvatar} 
                  alt={isPhotographer ? selectedThread.clientName : selectedThread.photographerName} 
                  className="chat-header__avatar" 
                />
                <div>
                  <div className="body-md font-bold text-primary">
                    {isPhotographer ? selectedThread.clientName : selectedThread.photographerName}
                  </div>
                  <div className="body-sm text-secondary">
                    {isPhotographer ? 'Client' : 'Photographer'}
                  </div>
                </div>
              </div>

              {/* Message log */}
              <div className="chat-log">
                {selectedThread.messages.map(msg => {
                  const isMe = msg.senderId === (isPhotographer ? '1' : 'client_1');
                  const isSys = msg.senderId === 'system';

                  if (isSys) {
                    return (
                      <div key={msg.id} className="chat-msg chat-msg--system">
                        <div className="chat-msg__sys-body body-sm">{msg.body}</div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`chat-msg ${isMe ? 'chat-msg--me' : 'chat-msg--other'}`}>
                      <div className="chat-msg__bubble">
                        <div className="chat-msg__text body-md">{msg.body}</div>
                        <div className="chat-msg__time">{msg.timestamp}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat input */}
              <form className="chat-input-row" onSubmit={handleSendMessage}>
                <input 
                  type="text" 
                  className="chat-input"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  id="chat-message-input"
                />
                <button type="submit" className="chat-send-btn" id="send-chat-btn">Send</button>
              </form>
            </>
          ) : (
            <div className="chat-placeholder">
              <span>💬</span>
              <p className="body-md text-secondary">Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
