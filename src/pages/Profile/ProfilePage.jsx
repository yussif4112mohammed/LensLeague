import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { photographers, PHOTO_URLS } from '../../data/photographers';
import { useApp } from '../../context/AppContext';
import RankBadge from '../../components/RankBadge/RankBadge';
import StatPill from '../../components/StatPill/StatPill';
import { PrimaryButton, SecondaryButton } from '../../components/Buttons/Buttons';
import PhotoCard from '../../components/PhotoCard/PhotoCard';
import CommentSheet from '../../components/CommentSheet/CommentSheet';
import './ProfilePage.css';

const PROFILE_TABS = ['Portfolio', 'Timeline', 'Achievements', 'Reviews'];

const ACHIEVEMENTS = [
  { id: 'a1', icon: '🏆', name: 'First Win', desc: 'Won your first battle', unlocked: true },
  { id: 'a2', icon: '🔥', name: '10-Day Streak', desc: 'Uploaded 10 days in a row', unlocked: true },
  { id: 'a3', icon: '⭐', name: 'Top 10 Global', desc: 'Reached top 10 on the global leaderboard', unlocked: true },
  { id: 'a4', icon: '💎', name: 'Diamond Rank', desc: 'Reach 40,000 points', unlocked: true },
  { id: 'a5', icon: '📸', name: '100 Uploads', desc: 'Upload 100 photos', unlocked: false },
  { id: 'a6', icon: '👑', name: 'Challenge Champion', desc: 'Win 5 challenges', unlocked: false },
];

const REVIEWS = [
  { id: 'r1', reviewer: 'Jordan Blake', reviewerAvatar: PHOTO_URLS[12], rating: 5, body: 'Absolutely stunning work. Aria captured our brand campaign with a level of artistry I hadn\'t seen before. Will book again.', type: 'Commercial Campaign', date: '2 weeks ago', verified: true },
  { id: 'r2', reviewer: 'Maria Santos', reviewerAvatar: PHOTO_URLS[13], rating: 5, body: 'Our family portraits turned out beyond expectations. Professional, warm, and incredibly talented.', type: 'Portrait Session', date: '1 month ago', verified: true },
  { id: 'r3', reviewer: 'Tech Ventures Ltd.', reviewerAvatar: PHOTO_URLS[14], rating: 4, body: 'Great product photography for our launch. Fast turnaround, excellent communication.', type: 'Product Photography', date: '2 months ago', verified: true },
];

const TIMELINE_EVENTS = [
  { date: 'Jul 2026', icon: '🥇', title: 'Reached #1 Global Rank', desc: '48,200 points — highest ever recorded on LensLeague.' },
  { date: 'May 2026', icon: '🏆', title: 'Won "Golden Hour Portraits" Challenge', desc: 'Beat 847 entries with a single frame from Kyoto at 6:04 AM.' },
  { date: 'Mar 2026', icon: '📷', title: 'New gear: Leica M11', desc: 'Upgraded from Sony A7IV. You can see the shift in the portfolio.' },
  { date: 'Jan 2026', icon: '✨', title: '10,000 Followers', desc: 'A year of daily uploads and 64 competition wins brought this milestone.' },
  { date: 'Sep 2025', icon: '🌍', title: 'Featured by National Geographic', desc: 'The Shinjuku shot was used in NG\'s "Faces of the City" spread.' },
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
      <div className="post-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="post-modal" role="dialog" aria-modal="true">
        {/* Close */}
        <button className="post-modal__close" onClick={onClose} id="post-modal-close" aria-label="Close">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Image panel */}
        <div className="post-modal__image-panel">
          <img src={photo.url} alt={photo.caption} className="post-modal__image" />
        </div>

        {/* Info panel */}
        <div className="post-modal__info-panel">
          {/* Author header */}
          <div className="post-modal__author">
            <img src={photo.ownerAvatar} alt={photo.ownerName} className="post-modal__avatar" />
            <div>
              <div className="post-modal__author-name">{photo.ownerName}</div>
              {photo.location && <div className="post-modal__author-loc">{photo.location}</div>}
            </div>
            <button
              className="post-modal__profile-btn"
              onClick={() => { onClose(); onNavigateProfile?.(); }}
              id="modal-view-profile-btn"
            >
              View Profile
            </button>
          </div>

          {/* Caption + details */}
          <div className="post-modal__body">
            {photo.caption && (
              <p className="post-modal__caption">
                <span className="post-modal__caption-name">{photo.ownerName}</span>
                {photo.caption}
              </p>
            )}
            {photo.gear && <p className="post-modal__gear">📷 {photo.gear}</p>}
            {photo.category && <p className="post-modal__tag">#{photo.category?.toLowerCase()}</p>}
          </div>

          {/* Actions */}
          <div className="post-modal__actions">
            <div className="post-modal__actions-left">
              <button
                className={`post-modal__action-btn ${liked ? 'post-modal__action-btn--liked' : ''}`}
                onClick={() => { setLiked(p => !p); setLikeCount(c => liked ? c - 1 : c + 1); }}
                aria-label={liked ? 'Unlike' : 'Like'}
                id="modal-like-btn"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
              <button
                className="post-modal__action-btn"
                onClick={() => setShowComments(true)}
                aria-label="Comment"
                id="modal-comment-btn"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
            </div>
            <button
              className={`post-modal__action-btn ${saved ? 'post-modal__action-btn--saved' : ''}`}
              onClick={() => setSaved(p => !p)}
              aria-label={saved ? 'Unsave' : 'Save'}
              id="modal-save-btn"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>

          {likeCount > 0 && (
            <div className="post-modal__like-count">{fmt(likeCount)} {likeCount === 1 ? 'like' : 'likes'}</div>
          )}

          <button className="post-modal__comments-link" onClick={() => setShowComments(true)} id="modal-view-comments">
            View all {fmt(photo.comments || 24)} comments
          </button>
        </div>
      </div>

      {showComments && <CommentSheet photo={photo} onClose={() => setShowComments(false)} />}
    </>
  );
}

import { supabase } from '../../lib/supabaseClient';
export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentRole, addBookingRequest, users, updateProfile, follows, followUser, unfollowUser, currentUser, photos } = useApp();
  
  const [activeTab, setActiveTab] = useState('Portfolio');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  const [fetchedUser, setFetchedUser] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Fallback to dynamic fetch if user is not in the list
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

  const [bookingForm, setBookingForm] = useState({
    date: '',
    budget: '',
    location: '',
    message: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    bio: '',
    location: ''
  });

  // Sync editForm when photographer loads
  useEffect(() => {
    if (photographer) {
      setEditForm({
        name: photographer.name || '',
        username: photographer.username || '',
        bio: photographer.bio || '',
        location: photographer.location || ''
      });
    }
  }, [photographer]);

  const [isMeLoading, setIsMeLoading] = useState(id === 'me');

  useEffect(() => {
    if (id === 'me') {
      if (currentUser) {
        setIsMeLoading(false);
      } else {
        // Fallback timeout in case user is actually logged out
        const timer = setTimeout(() => setIsMeLoading(false), 4000);
        return () => clearTimeout(timer);
      }
    } else {
      setIsMeLoading(false);
    }
  }, [id, currentUser]);

  if (!photographer) {
    if (loadingProfile || isMeLoading) {
      return (
        <div className="profile-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div className="body-md text-secondary">Loading profile...</div>
        </div>
      );
    }
    return (
      <div className="profile-page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h1 className="heading-2">Profile Not Found</h1>
        <p className="body-md text-secondary">This photographer doesn't exist or hasn't created a profile yet.</p>
        <button className="primary-btn" onClick={() => navigate('/feed')} style={{ marginTop: 16 }}>Return to Feed</button>
      </div>
    );
  }

  const userPhotos = photos.filter(p => p.ownerId === photographer.id);
  const portfolioPhotos = userPhotos.length > 0 ? userPhotos : PHOTO_URLS.slice(0, 9).map((url, i) => ({
    id: `port-${i}`,
    url,
    aspectRatio: i % 3 === 0 ? '3/4' : '4/3',
    ownerId: photographer.id,
    ownerName: photographer.name,
    ownerAvatar: photographer.avatar,
    category: photographer.specialty || 'Creative',
    location: photographer.location,
    caption: `Sensing geometry in nature. Composition study #${i + 1}.`,
    likes: 1240 + i * 85,
    comments: 18 + i * 3,
    gear: 'Leica M11 · 35mm f/1.4 Summilux'
  }));

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    addBookingRequest(photographer.id, bookingForm);
    setBookingSuccess(true);
    setTimeout(() => {
      setBookingModalOpen(false);
      setBookingSuccess(false);
      // Reset form
      setBookingForm({ date: '', budget: '', location: '', message: '' });
    }, 2000);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateProfile(photographer.id, editForm);
    setEditModalOpen(false);
  };

  const handleStartChat = () => {
    navigate(`/inbox?chat=${photographer.id}`);
  };

  const isFollowing = currentUser && follows.some(f => f.follower_id === currentUser.id && f.following_id === photographer.id);

  const handleFollowClick = () => {
    if (isFollowing) {
      unfollowUser(photographer.id);
    } else {
      followUser(photographer.id);
    }
  };

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-cover" style={{ backgroundImage: `url(${photographer.cover})` }}>
        <div className="profile-cover__overlay" />
        <div className="profile-cover__actions">
          <button className="profile-back" onClick={() => navigate(-1)} aria-label="Back" id="profile-back-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          {isOwnProfile && (
            <button className="profile-share" id="profile-share-btn" aria-label="Share profile">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="profile-info">
        <div className="profile-avatar-row">
          <img src={photographer.avatar} alt={photographer.name} className="profile-avatar" />
          <div className="profile-avatar-row__actions">
            {isOwnProfile ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <SecondaryButton small onClick={() => setEditModalOpen(true)} id="edit-profile-btn">Edit Profile</SecondaryButton>
              </div>
            ) : (
              <>
                <SecondaryButton small onClick={handleStartChat} id="message-photographer-btn">💬 Message</SecondaryButton>
                <SecondaryButton small onClick={handleFollowClick} id="follow-btn">
                  {isFollowing ? '✓ Following' : 'Follow'}
                </SecondaryButton>
                <PrimaryButton small onClick={() => setBookingModalOpen(true)} id="book-photographer-btn">Request Booking</PrimaryButton>
              </>
            )}
          </div>
        </div>

        <div className="profile-name-row">
          <h1 className="heading-1">{photographer.name}</h1>
          {photographer.verified && <span className="verified-badge" title="Verified">✓</span>}
          <RankBadge rank={photographer.globalRank} size="sm" />
          {isOwnProfile && (
            <div className="profile-streak-badge" title="Daily Streak">
              🔥 12 days
            </div>
          )}
        </div>
        <p className="body-sm text-secondary">@{photographer.username} · {photographer.location}</p>
        <p className="body-md profile-bio">{photographer.bio}</p>

        <div className="profile-stats">
          <StatPill icon="👥" value={(photographer.followers/1000).toFixed(1)+'k'} label="followers" />
          <StatPill icon="🏆" value={photographer.wins} label="wins" />
          <StatPill icon="⭐" value={photographer.avgRating} label="rating" />
          <StatPill icon="💎" value={(photographer.points/1000).toFixed(1)+'k'} label="pts" />
        </div>

        {isOwnProfile && (
          <button 
            className="profile-analytics-bar" 
            onClick={() => navigate('/analytics')}
            id="profile-analytics-bar-btn"
          >
            <span>What you did this month</span>
            <div className="profile-analytics-bar__link">
              <span>View Insights 📈</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        {PROFILE_TABS.map(tab => (
          <button
            key={tab}
            className={`profile-tab ${activeTab === tab ? 'profile-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
            id={`profile-tab-${tab.toLowerCase()}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="profile-tab-content animate-fade-in" key={activeTab}>
        {activeTab === 'Portfolio' && (
          <div className="portfolio-grid">
            {portfolioPhotos.map(p => (
              <PhotoCard
                key={p.id}
                photo={p}
                compact
                onPhotoClick={() => setSelectedPhoto(p)}
              />
            ))}
          </div>
        )}

        {activeTab === 'Timeline' && (
          <div className="timeline">
            {TIMELINE_EVENTS.map((ev, i) => (
              <div key={i} className="timeline-entry">
                <div className="timeline-entry__icon">{ev.icon}</div>
                <div className="timeline-entry__connector" />
                <div className="timeline-entry__content">
                  <div className="body-sm text-tertiary timeline-entry__date">{ev.date}</div>
                  <div className="heading-2">{ev.title}</div>
                  <div className="body-md text-secondary">{ev.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Achievements' && (
          <div className="achievements-section animate-fade-in">
            <div className="profile-insights-card">
              <div className="insights-card__header">
                <span className="insights-card__title">This Month's Progress 📈</span>
                <span className="insights-card__sub">What you did this month</span>
              </div>
              <div className="insights-card__grid">
                <div className="insights-stat">
                  <span className="insights-stat__val">+14.2%</span>
                  <span className="insights-stat__lbl">Profile Views</span>
                </div>
                <div className="insights-stat">
                  <span className="insights-stat__val">87</span>
                  <span className="insights-stat__lbl">Battles Won</span>
                </div>
                <div className="insights-stat">
                  <span className="insights-stat__val">68%</span>
                  <span className="insights-stat__lbl">Win Rate</span>
                </div>
                <div className="insights-stat">
                  <span className="insights-stat__val">+1,420</span>
                  <span className="insights-stat__lbl">Elo Gained</span>
                </div>
              </div>
            </div>

            <div className="achievements-grid">
              {ACHIEVEMENTS.map(a => (
                <div key={a.id} className={`achievement ${a.unlocked ? 'achievement--unlocked' : 'achievement--locked'}`} id={`achievement-${a.id}`}>
                  <div className="achievement__icon">{a.icon}</div>
                  <div className="achievement__name body-sm">{a.name}</div>
                  <div className="achievement__desc" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{a.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Reviews' && (
          <div className="reviews-list">
            {REVIEWS.map(r => (
              <div key={r.id} className="review-card" id={`review-${r.id}`}>
                <div className="review-card__header">
                  <div className="review-card__reviewer">
                    <img src={r.reviewerAvatar} alt={r.reviewer} className="review-card__avatar" />
                    <div>
                      <div className="body-md">{r.reviewer}</div>
                      <div className="body-sm text-tertiary">{r.type} · {r.date}</div>
                    </div>
                  </div>
                  <div className="review-card__stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                </div>
                <p className="body-md review-card__body">{r.body}</p>
                {r.verified && <span className="review-card__verified label">✓ Verified Booking</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking request modal */}
      {bookingModalOpen && (
        <div className="photo-modal-backdrop" onClick={() => setBookingModalOpen(false)}>
          <div className="photo-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <button className="photo-modal__close" onClick={() => setBookingModalOpen(false)}>✕</button>
            <div className="photo-modal__info">
              <h2 className="heading-1" style={{ marginBottom: 'var(--space-2)' }}>Book {photographer.name}</h2>
              <p className="body-sm text-secondary" style={{ marginBottom: 'var(--space-4)' }}>
                Submit details below to send an direct booking request and open a chat thread.
              </p>

              {bookingSuccess ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-6) 0', color: 'var(--success)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
                  <p className="heading-2">Booking Request Sent!</p>
                  <p className="body-sm text-secondary">Opening conversation...</p>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="label text-tertiary" style={{ display: 'block', marginBottom: '6px' }}>Shoot Date</label>
                    <input 
                      type="date" 
                      required 
                      className="form-input" 
                      style={{ width: '100%', height: '44px' }}
                      value={bookingForm.date}
                      onChange={e => setBookingForm(prev => ({ ...prev, date: e.target.value }))}
                      id="booking-date-input"
                    />
                  </div>

                  <div>
                    <label className="label text-tertiary" style={{ display: 'block', marginBottom: '6px' }}>Approx Budget</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. $800" 
                      className="form-input" 
                      style={{ width: '100%', height: '44px' }}
                      value={bookingForm.budget}
                      onChange={e => setBookingForm(prev => ({ ...prev, budget: e.target.value }))}
                      id="booking-budget-input"
                    />
                  </div>

                  <div>
                    <label className="label text-tertiary" style={{ display: 'block', marginBottom: '6px' }}>Location</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Shibuya Studio, Tokyo" 
                      className="form-input" 
                      style={{ width: '100%', height: '44px' }}
                      value={bookingForm.location}
                      onChange={e => setBookingForm(prev => ({ ...prev, location: e.target.value }))}
                      id="booking-location-input"
                    />
                  </div>

                  <div>
                    <label className="label text-tertiary" style={{ display: 'block', marginBottom: '6px' }}>Shoot Details & Requirements</label>
                    <textarea 
                      required 
                      placeholder="Describe what kind of photos you need..." 
                      className="form-textarea" 
                      style={{ width: '100%', height: '100px', padding: '12px' }}
                      value={bookingForm.message}
                      onChange={e => setBookingForm(prev => ({ ...prev, message: e.target.value }))}
                      id="booking-message-input"
                    />
                  </div>

                  <button type="submit" className="btn btn--primary btn--full" style={{ marginTop: 'var(--space-2)' }} id="submit-booking-request">
                    Submit Request
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedPhoto && (
        <PhotoDetailModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onNavigateProfile={() => navigate(`/profile/${selectedPhoto.ownerId}`)}
        />
      )}

      {editModalOpen && (
        <div className="photo-modal-backdrop" onClick={() => setEditModalOpen(false)}>
          <div className="photo-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: 'var(--space-6)' }}>
            <button className="photo-modal__close" onClick={() => setEditModalOpen(false)}>✕</button>
            <h2 className="heading-1" style={{ marginBottom: 'var(--space-4)' }}>Edit Profile</h2>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label text-tertiary" style={{ display: 'block', marginBottom: '6px' }}>Display Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ width: '100%', height: '44px' }}
                  value={editForm.name} 
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                  required 
                />
              </div>
              <div>
                <label className="label text-tertiary" style={{ display: 'block', marginBottom: '6px' }}>Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ width: '100%', height: '44px' }}
                  value={editForm.username} 
                  onChange={e => setEditForm({ ...editForm, username: e.target.value })} 
                  required 
                />
              </div>
              <div>
                <label className="label text-tertiary" style={{ display: 'block', marginBottom: '6px' }}>Location</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ width: '100%', height: '44px' }}
                  value={editForm.location} 
                  onChange={e => setEditForm({ ...editForm, location: e.target.value })} 
                  required 
                />
              </div>
              <div>
                <label className="label text-tertiary" style={{ display: 'block', marginBottom: '6px' }}>Bio</label>
                <textarea 
                  className="form-textarea" 
                  style={{ width: '100%', height: '100px', padding: '12px' }}
                  value={editForm.bio} 
                  onChange={e => setEditForm({ ...editForm, bio: e.target.value })} 
                  required 
                />
              </div>
              <button type="submit" className="btn btn--primary btn--full" style={{ marginTop: 'var(--space-2)' }}>
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
