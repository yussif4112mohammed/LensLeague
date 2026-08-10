import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { cn } from '@/lib/utils';
export default function CommentSheet({ photo, onClose }) {
  const { comments: allComments, addPhotoComment, currentUser } = useApp();
  const [newComment, setNewComment] = useState('');
  const [likedComments, setLikedComments] = useState(new Set());
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter comments for this specific photo
  const photoComments = allComments.filter(c => c.photo_id === photo.id);
  const activeComments = photoComments;

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
    addPhotoComment(photo.id, newComment.trim());
    setNewComment('');
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  if (!photo) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] animate-in fade-in duration-300" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      {/* Sheet */}
      <div 
        className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-2xl h-[75vh] glass-card !border-b-0 rounded-t-3xl z-[401] flex flex-col overflow-hidden animate-in slide-in-from-bottom-[100%] duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]" 
        role="dialog" 
        aria-modal="true" 
        aria-label="Comments"
      >
        {/* Handle */}
        <div className="w-12 h-1.5 bg-zinc-700/50 rounded-full mx-auto mt-4 mb-2 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-center relative p-4 border-b border-white/5 shrink-0">
          <span className="text-lg font-bold text-white tracking-wide text-glow">Comments</span>
          <button 
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/5 text-zinc-400 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors" 
            onClick={onClose} 
            aria-label="Close comments" 
            id="comment-sheet-close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6" style={{ scrollbarWidth: 'none' }} ref={listRef}>
          {activeComments.map(c => (
            <div key={c.id} className="flex gap-4 items-start animate-in fade-in slide-in-from-bottom-2 duration-300" id={`comment-${c.id}`}>
              <img src={c.userAvatar} alt={c.userName} className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-white/10 shadow-lg" />
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="text-[15px] leading-relaxed text-zinc-200">
                  <span className="font-bold text-white mr-2">{c.userName}</span>
                  {c.body}
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium tracking-wide">
                  <span>{c.time || 'just now'}</span>
                  <button
                    className={cn(
                      "flex items-center gap-1.5 transition-colors duration-200 hover:text-white group",
                      likedComments.has(c.id) ? "text-emerald-400 hover:text-emerald-300" : ""
                    )}
                    onClick={() => toggleCommentLike(c.id)}
                    aria-label="Like comment"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={likedComments.has(c.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" className="transition-transform group-active:scale-90">
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
        <form className="flex items-center gap-3 p-4 bg-zinc-900/50 backdrop-blur-md border-t border-white/5 pb-[calc(1rem+env(safe-area-inset-bottom))] shrink-0" onSubmit={handleSend}>
          <img src={currentUser?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80'} alt="You" className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-white/10" />
          <input
            ref={inputRef}
            id="comment-input"
            className="flex-1 h-12 bg-zinc-950/80 border border-white/10 rounded-full px-5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-inner"
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            autoComplete="off"
          />
          <button
            type="submit"
            className={cn(
              "text-sm font-extrabold tracking-wide uppercase px-2 transition-colors",
              newComment.trim() ? "text-emerald-400 hover:text-emerald-300" : "text-zinc-600"
            )}
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
