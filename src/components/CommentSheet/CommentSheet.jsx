import { useState, useRef, useEffect } from 'react';
import { photographers } from '../../data/photographers';
import './CommentSheet.css';

const MOCK_COMMENTS = [
  { id: 'c1', userId: '1', userName: 'aria.lens', userAvatar: photographers[0].avatar, body: 'Absolutely stunning composition! The light here is unreal 🔥', time: '2h', likes: 47 },
  { id: 'c2', userId: '2', userName: 'marco_frames', userAvatar: photographers[1].avatar, body: 'The way the shadows fall is just perfect. What lens did you use?', time: '4h', likes: 23 },
  { id: 'c3', userId: '3', userName: 'yuki.photo', userAvatar: photographers[2].avatar, body: 'This is the golden hour shot I\'ve been waiting to see from you ✨', time: '5h', likes: 15 },
  { id: 'c4', userId: '4', userName: 'kai_visuals', userAvatar: photographers[3].avatar, body: 'Color grading on this is 🤌', time: '7h', likes: 31 },
  { id: 'c5', userId: '5', userName: 'priya.captures', userAvatar: photographers[4].avatar, body: 'This should be in a gallery honestly', time: '8h', likes: 8 },
];

export default function CommentSheet({ photo, onClose }) {
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState('');
  const [likedComments, setLikedComments] = useState(new Set());
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    // Auto-focus input and prevent body scroll
    setTimeout(() => inputRef.current?.focus(), 300);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const toggleCommentLike = (id) => {
    setLikedComments(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const comment = {
      id: `c${Date.now()}`,
      userId: 'me',
      userName: 'you',
      userAvatar: photographers[0].avatar,
      body: newComment.trim(),
      time: 'just now',
      likes: 0,
    };
    setComments(prev => [...prev, comment]);
    setNewComment('');
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  if (!photo) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="comment-sheet-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div className="comment-sheet" role="dialog" aria-modal="true" aria-label="Comments">
        {/* Handle */}
        <div className="comment-sheet__handle" />

        {/* Header */}
        <div className="comment-sheet__header">
          <span className="comment-sheet__title">Comments</span>
          <button className="comment-sheet__close" onClick={onClose} aria-label="Close comments" id="comment-sheet-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Comment list */}
        <div className="comment-sheet__list" ref={listRef}>
          {comments.map(c => (
            <div key={c.id} className="comment-row" id={`comment-${c.id}`}>
              <img src={c.userAvatar} alt={c.userName} className="comment-row__avatar" />
              <div className="comment-row__content">
                <div className="comment-row__bubble">
                  <span className="comment-row__username">{c.userName}</span>
                  <span className="comment-row__body">{c.body}</span>
                </div>
                <div className="comment-row__meta">
                  <span className="comment-row__time">{c.time}</span>
                  <button
                    className={`comment-row__like ${likedComments.has(c.id) ? 'comment-row__like--active' : ''}`}
                    onClick={() => toggleCommentLike(c.id)}
                    aria-label="Like comment"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill={likedComments.has(c.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    {(c.likes + (likedComments.has(c.id) ? 1 : 0)) > 0 && (
                      <span>{c.likes + (likedComments.has(c.id) ? 1 : 0)}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input row */}
        <form className="comment-sheet__input-row" onSubmit={handleSend}>
          <img src={photographers[0].avatar} alt="You" className="comment-sheet__input-avatar" />
          <input
            ref={inputRef}
            id="comment-input"
            className="comment-sheet__input"
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            autoComplete="off"
          />
          <button
            type="submit"
            className={`comment-sheet__send ${newComment.trim() ? 'comment-sheet__send--active' : ''}`}
            disabled={!newComment.trim()}
            aria-label="Post comment"
            id="send-comment-btn"
          >
            Post
          </button>
        </form>
      </div>
    </>
  );
}
