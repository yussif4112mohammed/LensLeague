import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  { id: 'r1', reviewer: 'Jordan Blake', reviewerAvatar: 'https://ui-avatars.com/api/?name=Jordan+Blake', rating: 5, body: 'Absolutely stunning work. Captured our brand campaign with a level of artistry I hadn\'t seen before. Will book again.', type: 'Commercial Campaign', date: '2 weeks ago', verified: true },
  { id: 'r2', reviewer: 'Maria Santos', reviewerAvatar: 'https://ui-avatars.com/api/?name=Maria+Santos', rating: 5, body: 'Our family portraits turned out beyond expectations. Professional, warm, and incredibly talented.', type: 'Portrait Session', date: '1 month ago', verified: true },
  { id: 'r3', reviewer: 'Tech Ventures Ltd.', reviewerAvatar: 'https://ui-avatars.com/api/?name=Tech+Ventures', rating: 4, body: 'Great product photography for our launch. Fast turnaround, excellent communication.', type: 'Product Photography', date: '2 months ago', verified: true },
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
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [customMilestones, setCustomMilestones] = useState([]);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', desc: '', date: '', icon: '📷' });
  
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
  
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Sync editForm when photographer loads
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
    if (!currentUser && id === 'me') {
      return (
        <div className="profile-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
          <div style={{ padding: 'var(--space-8)', background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', maxWidth: 400 }}>
            <h2 className="heading-2" style={{ marginBottom: 'var(--space-2)' }}>Please Log In</h2>
            <p className="body-md text-secondary" style={{ marginBottom: 'var(--space-6)' }}>You need to be logged in to view your profile.</p>
            <PrimaryButton onClick={() => navigate('/login')}>Go to Login</PrimaryButton>
          </div>
        </div>
      );
    }
    
    return (
      <div className="profile-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <h2 className="heading-2" style={{ marginBottom: 'var(--space-2)' }}>Profile Not Found</h2>
        <p className="body-md text-secondary" style={{ marginBottom: 'var(--space-6)' }}>This photographer doesn't exist or hasn't created a profile yet.</p>
        <SecondaryButton onClick={() => navigate('/feed')}>Return to Feed</SecondaryButton>
      </div>
    );
  }

  const userPhotos = photos.filter(p => p.ownerId === photographer.id);
  const portfolioPhotos = userPhotos;

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
      } else {
        console.warn('Avatar upload failed:', uploadError);
      }
    }
    
    const updateData = { ...editForm };
    if (newAvatarUrl) updateData.avatar = newAvatarUrl;
    
    updateProfile(photographer.id, updateData);
    setIsSavingEdit(false);
    setEditModalOpen(false);
  };
  
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
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
          <RankBadge rank={photographer.global_rank || photographer.globalRank || 99} size="sm" />
        </div>
        <p className="body-sm text-secondary">@{photographer.username} · {photographer.location}</p>
        <p className="body-md profile-bio">{photographer.bio}</p>

        <div className="profile-stats">
          <StatPill icon="👥" value={follows.filter(f => f.following_id === photographer.id).length} label="followers" />
          <StatPill icon="🏆" value={photographer.wins || 0} label="wins" />
          <StatPill icon="⭐" value={photographer.avgRating || '5.0'} label="rating" />
          <StatPill icon="💎" value={photographer.points ? (photographer.points >= 1000 ? (photographer.points/1000).toFixed(1)+'k' : photographer.points) : 0} label="pts" />
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
            {portfolioPhotos.length > 0 ? portfolioPhotos.map(p => (
              <PhotoCard
                key={p.id}
                photo={p}
                compact
                onPhotoClick={() => setSelectedPhoto(p)}
              />
            )) : (
              <div style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No photos uploaded yet.
              </div>
            )}
          </div>
        )}

        {activeTab === 'Timeline' && (
          <div className="timeline-section animate-fade-in" style={{ padding: '16px 0' }}>
            {isOwnProfile && (
              <div style={{ marginBottom: '24px', textAlign: 'right' }}>
                <SecondaryButton small onClick={() => setMilestoneModalOpen(true)} id="add-milestone-btn">
                  + Add Career Milestone
                </SecondaryButton>
              </div>
            )}
            <div className="timeline-stem-wrap" style={{ position: 'relative', paddingLeft: '32px', borderLeft: '2px solid var(--border-subtle)' }}>
              {[
                ...customMilestones,
                ...portfolioPhotos.map(p => ({
                  id: `ph_${p.id}`,
                  date: p.timestamp || 'Recently',
                  icon: p.isVideo ? '🎥' : '📸',
                  title: p.isVideo ? 'Uploaded Video Shoot' : 'Published New Photo Shoot',
                  desc: p.caption || 'Added new visual work to portfolio.',
                  photoUrl: p.url,
                  gear: p.gear
                })),
                {
                  id: 'joined',
                  date: 'Member',
                  icon: '✨',
                  title: 'Joined LensLeague',
                  desc: 'Created official creator profile and portfolio.'
                }
              ].map((item, idx) => (
                <div key={item.id || idx} className="timeline-node-item" style={{ position: 'relative', marginBottom: '32px' }}>
                  <div className="timeline-node-icon" style={{ position: 'absolute', left: '-45px', top: '0', width: '26px', height: '26px', borderRadius: '50%', background: 'var(--bg-elevated-2)', border: '2px solid var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                    {item.icon}
                  </div>
                  <div className="timeline-node-card" style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: 'var(--radius-md, 12px)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span className="heading-2" style={{ fontSize: '15px' }}>{item.title}</span>
                      <span className="body-sm text-tertiary">{item.date}</span>
                    </div>
                    <p className="body-md text-secondary" style={{ marginBottom: item.photoUrl ? '12px' : '0' }}>{item.desc}</p>
                    {item.photoUrl && (
                      <img src={item.photoUrl} alt="" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px' }} />
                    )}
                    {item.gear && (
                      <div className="body-sm text-tertiary" style={{ marginTop: '8px' }}>📷 {item.gear}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Achievements' && (
          <div className="achievements-section animate-fade-in" style={{ padding: '16px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
              {[
                { id: 'a1', icon: '📸', name: 'First Upload', desc: 'Uploaded your first shoot', unlocked: portfolioPhotos.length >= 1 },
                { id: 'a2', icon: '🏆', name: 'First Win', desc: 'Won your first battle vote', unlocked: (photographer.points || 0) > 0 },
                { id: 'a3', icon: '⭐', name: 'Top Creator', desc: 'Earned 1,000+ creator points', unlocked: (photographer.points || 0) >= 1000 },
                { id: 'a4', icon: '💎', name: 'Diamond Pro', desc: 'Earned 10,000+ points', unlocked: (photographer.points || 0) >= 10000 },
                { id: 'a5', icon: '🔥', name: 'Prolific Creator', desc: 'Uploaded 5+ photos or videos', unlocked: portfolioPhotos.length >= 5 },
                { id: 'a6', icon: '👑', name: 'League Leader', desc: 'Reached top 5 global rank', unlocked: (photographer.global_rank || 99) <= 5 }
              ].map(ach => (
                <div key={ach.id} style={{ opacity: ach.unlocked ? 1 : 0.45, background: 'var(--card-bg)', border: ach.unlocked ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)', padding: '16px', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ fontSize: '28px' }}>{ach.icon}</div>
                  <div>
                    <div className="heading-2" style={{ fontSize: '14px' }}>{ach.name} {ach.unlocked && '✓'}</div>
                    <div className="body-sm text-secondary">{ach.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Reviews' && (
          <div className="reviews-list animate-fade-in" style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {REVIEWS.map(rev => (
              <div key={rev.id} style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={rev.reviewerAvatar} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                    <div>
                      <div className="body-md font-bold text-primary">{rev.reviewer}</div>
                      <div className="body-sm text-tertiary">{rev.type} · {rev.date}</div>
                    </div>
                  </div>
                  <div style={{ color: 'var(--accent-gold, #FFC24B)', fontWeight: '700' }}>{'★'.repeat(rev.rating)}</div>
                </div>
                <p className="body-md text-secondary">"{rev.body}"</p>
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
                    <label className="label text-tertiary" style={{ display: 'block', marginBottom: '6px' }}>Available Time Slot</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {['🌅 9:00 AM (Golden Hour)', '☀️ 1:00 PM (Afternoon)', '🌆 5:30 PM (Sunset)'].map(slot => (
                        <button
                          key={slot}
                          type="button"
                          className={`category-chip ${bookingForm.timeSlot === slot ? 'category-chip--selected' : ''}`}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => setBookingForm(prev => ({ ...prev, timeSlot: slot }))}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
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
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <img src={avatarPreview} alt="Preview" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-subtle)' }} />
                <label className="btn btn--secondary" style={{ cursor: 'pointer', fontSize: '12px', padding: '6px 12px' }}>
                  Change Avatar
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                </label>
              </div>

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
              <button type="submit" className="btn btn--primary btn--full" style={{ marginTop: 'var(--space-2)' }} disabled={isSavingEdit}>
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {milestoneModalOpen && (
        <div className="photo-modal-backdrop" onClick={() => setMilestoneModalOpen(false)}>
          <div className="photo-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '24px' }}>
            <button className="photo-modal__close" onClick={() => setMilestoneModalOpen(false)}>✕</button>
            <h2 className="heading-1" style={{ marginBottom: '16px' }}>Add Career Milestone</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!milestoneForm.title) return;
              setCustomMilestones(prev => [{
                id: `ms_${Date.now()}`,
                title: milestoneForm.title,
                desc: milestoneForm.desc,
                date: milestoneForm.date || 'Present',
                icon: milestoneForm.icon || '🏆'
              }, ...prev]);
              setMilestoneModalOpen(false);
              setMilestoneForm({ title: '', desc: '', date: '', icon: '📷' });
            }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label text-tertiary" style={{ display: 'block', marginBottom: '6px' }}>Milestone Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ width: '100%', height: '44px' }} 
                  placeholder="e.g. Upgraded to Leica M11 Body" 
                  value={milestoneForm.title} 
                  onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))} 
                  required 
                />
              </div>
              <div>
                <label className="label text-tertiary" style={{ display: 'block', marginBottom: '6px' }}>Date / Period</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ width: '100%', height: '44px' }} 
                  placeholder="e.g. Jul 2026" 
                  value={milestoneForm.date} 
                  onChange={e => setMilestoneForm(f => ({ ...f, date: e.target.value }))} 
                />
              </div>
              <div>
                <label className="label text-tertiary" style={{ display: 'block', marginBottom: '6px' }}>Description</label>
                <textarea 
                  className="form-textarea" 
                  style={{ width: '100%', height: '80px', padding: '10px' }} 
                  placeholder="Add details about this career highlight..." 
                  value={milestoneForm.desc} 
                  onChange={e => setMilestoneForm(f => ({ ...f, desc: e.target.value }))} 
                />
              </div>
              <button type="submit" className="btn btn--primary btn--full" style={{ marginTop: '8px' }}>
                Add to Timeline
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
