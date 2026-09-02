import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ChevronLeft, ChevronRight, X, Heart, Bookmark, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Photo detail as a lightbox over the grid (mockup 2c).
 * The grid stays mounted behind it, so paging through a set never costs you
 * your place. Arrow keys move through the set; Escape closes.
 */
export default function Lightbox({ photos = [], index, onIndexChange, onClose }) {
  const navigate = useNavigate();
  const {
    currentUser,
    comments,
    follows,
    savedItemIds,
    addPhotoComment,
    toggleSavedItem,
    toggleLikePost,
    followUser,
    unfollowUser,
  } = useApp();

  const [draft, setDraft] = useState('');
  const [liked, setLiked] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const dialogRef = useRef(null);

  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onIndexChange(index - 1);
  }, [hasPrev, index, onIndexChange]);

  const goNext = useCallback(() => {
    if (hasNext) onIndexChange(index + 1);
  }, [hasNext, index, onIndexChange]);

  // Keyboard paging. Bound to the document so it works wherever focus landed.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, onClose]);

  // Hold the page still behind the overlay.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    setDraft('');
    setLiked(false);
    setSheetExpanded(false);
  }, [photo?.id]);

  if (!photo) return null;

  const photoComments = (comments || []).filter(
    (c) => (c.photo_id || c.item_id) === photo.id
  );
  const isSaved = (savedItemIds || []).includes(photo.id);
  const isFollowing = (follows || []).some(
    (f) =>
      (f.follower_id || f.followerId) === currentUser?.id &&
      (f.following_id || f.followingId) === photo.ownerId
  );

  const handleLike = () => {
    setLiked((v) => !v);
    toggleLikePost?.(photo.id);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${photo.ownerId}`;
    try {
      if (navigator.share) await navigator.share({ title: photo.caption || 'LensLeague', url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* the person dismissed the share sheet — nothing to recover from */
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    await addPhotoComment?.(photo.id, body);
  };

  const tags = [photo.category, ...(photo.tags || [])].filter(Boolean);

  const dateLabel = photo.created_at
    ? new Date(photo.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : null;

  const ActionRow = ({ compact }) => (
    <div className="flex gap-2">
      <button
        onClick={handleLike}
        aria-pressed={liked}
        className={cn(
          'flex h-[38px] flex-1 items-center justify-center gap-[7px] rounded-[9px] border text-[12.5px] font-semibold transition-colors',
          liked
            ? 'border-brand/[.35] bg-brand/[.14] text-brand-tint'
            : 'border-white/[.14] text-white/70 hover:text-foreground'
        )}
      >
        <Heart className="h-[15px] w-[15px]" fill={liked ? 'currentColor' : 'none'} strokeWidth={1.7} />
        {(photo.likes || 0) + (liked ? 1 : 0)}{compact ? ' likes' : ''}
      </button>
      <button
        onClick={() => toggleSavedItem?.(photo.id)}
        aria-pressed={isSaved}
        aria-label={isSaved ? 'Remove from saved' : 'Save'}
        className={cn(
          'flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border transition-colors',
          isSaved
            ? 'border-brand/[.35] bg-brand/[.14] text-brand-tint'
            : 'border-white/[.14] text-white/70 hover:text-foreground'
        )}
      >
        <Bookmark className="h-[15px] w-[15px]" fill={isSaved ? 'currentColor' : 'none'} strokeWidth={1.7} />
      </button>
      <button
        onClick={handleShare}
        aria-label="Share"
        className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border border-white/[.14] text-white/70 transition-colors hover:text-foreground"
      >
        <Share2 className="h-[15px] w-[15px]" strokeWidth={1.7} />
      </button>
    </div>
  );

  const TagRow = () =>
    tags.length === 0 ? null : (
      <div className="flex flex-wrap gap-1.5 font-mono text-[10.5px] text-foreground/[.62]">
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className={cn(
              'rounded-md px-[9px] py-1.5',
              i === 0 ? 'bg-brand/[.14] text-brand-tint' : 'bg-white/[.07]'
            )}
          >
            {i === 0 ? tag : `#${String(tag).replace(/^#/, '')}`}
          </span>
        ))}
      </div>
    );

  // Portalled to <body>. The app shell's <main> establishes a stacking context,
  // which would otherwise trap this overlay underneath the left rail.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || 'Photo detail'}
    >
      {/* ══ Mobile: immersive frame with an info sheet (mockup 1e) ══ */}
      <div className="flex h-full flex-col bg-background md:hidden">
        <div className="flex flex-none items-center justify-between px-5 pb-2.5 pt-4 text-white/60">
          <button onClick={onClose} aria-label="Back" className="text-[18px] leading-none">←</button>
          <span className="font-mono text-[10px] tracking-[.1em]">
            {String(photo.category || 'PHOTOGRAPH').toUpperCase()}
          </span>
          <button onClick={handleShare} aria-label="Share" className="text-[16px] leading-none">⋯</button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          {photo.isVideo ? (
            <video src={photo.url} controls autoPlay loop playsInline className="h-full w-full object-contain" />
          ) : (
            <img src={photo.url} alt={photo.caption || ''} className="h-full w-full object-contain" />
          )}
        </div>

        <div className="relative -mt-3.5 flex max-h-[62%] flex-none flex-col gap-[11px] overflow-y-auto rounded-t-[18px] border-t border-white/[.08] bg-card px-5 pb-6 pt-2.5">
          <span className="h-1 w-9 flex-none self-center rounded-sm bg-white/20" />

          <div className="flex flex-col gap-1">
            <h2 className="text-[15px] font-semibold leading-[1.2]">{photo.caption || 'Untitled'}</h2>
            <button
              onClick={() => navigate(`/profile/${photo.ownerId}`)}
              className="text-left text-[12px] leading-[1.4] text-foreground/[.55]"
            >
              {[photo.ownerName, photo.location, dateLabel].filter(Boolean).join(' · ')}
            </button>
          </div>

          <TagRow />
          <ActionRow compact />

          {photoComments.length > 0 && (
            <>
              <div className="mt-0.5 flex items-center gap-[9px] border-t border-white/[.07] pt-3">
                {photoComments[0].userAvatar ? (
                  <img src={photoComments[0].userAvatar} alt="" className="h-[26px] w-[26px] flex-none rounded-full object-cover" />
                ) : (
                  <span
                    className="h-[26px] w-[26px] flex-none rounded-full"
                    style={{ backgroundImage: 'repeating-linear-gradient(135deg,#232427 0 6px,#1b1c1f 6px 12px)' }}
                  />
                )}
                <p className="flex-1 text-[11.5px] leading-[1.35] text-white/60">
                  <b className="font-semibold text-foreground">{photoComments[0].userName || 'Someone'}</b>{' '}
                  {photoComments[0].body}
                </p>
              </div>
              <button
                onClick={() => setSheetExpanded(v => !v)}
                className="self-start text-[11px] text-foreground/[.42] hover:text-white/70"
              >
                {sheetExpanded ? 'Hide comments' : `View all ${photoComments.length} comments`}
              </button>
            </>
          )}

          {(sheetExpanded || photoComments.length === 0) && (
            <div className="flex flex-col gap-3">
              {photoComments.slice(1).map((c) => (
                <div key={c.id} className="flex gap-[9px]">
                  <span
                    className="h-[26px] w-[26px] flex-none rounded-full"
                    style={{ backgroundImage: 'repeating-linear-gradient(135deg,#232427 0 6px,#1b1c1f 6px 12px)' }}
                  />
                  <p className="text-[11.5px] leading-[1.35] text-white/60">
                    <b className="font-semibold text-foreground">{c.userName || 'Someone'}</b> {c.body}
                  </p>
                </div>
              ))}
              <form onSubmit={handleComment}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Add a comment…"
                  aria-label="Add a comment"
                  className="h-[38px] w-full rounded-[9px] border border-white/10 bg-card px-3 text-[12px] text-foreground outline-none placeholder:text-foreground/[.36] focus:border-brand/50"
                />
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ══ Desktop: lightbox over the grid (mockup 2c) ══ */}
      <div className="hidden h-full md:block">
        <button
          className="absolute inset-0 cursor-default bg-[rgba(6,6,7,.86)] backdrop-blur-[1px]"
          onClick={onClose}
          aria-label="Close"
          tabIndex={-1}
        />

        <div className="absolute inset-0 flex items-center justify-center px-[60px] py-[34px]">
          <div
            ref={dialogRef}
            tabIndex={-1}
            className="flex h-full max-h-[700px] w-full max-w-[1080px] overflow-hidden rounded-xl border border-white/10 bg-background outline-none"
          >
            <div className="flex min-h-0 flex-1 items-center justify-center bg-card">
              {photo.isVideo ? (
                <video src={photo.url} controls autoPlay loop className="h-full w-full object-contain" />
              ) : (
                <img src={photo.url} alt={photo.caption || ''} className="h-full w-full object-contain" />
              )}
            </div>

            <aside className="flex w-[330px] flex-none flex-col gap-4 overflow-y-auto border-l border-white/[.09] px-6 py-[22px]">
              <div className="flex items-center gap-[11px]">
                <button onClick={() => navigate(`/profile/${photo.ownerId}`)} className="flex-none">
                  {photo.ownerAvatar ? (
                    <img src={photo.ownerAvatar} alt="" className="h-[38px] w-[38px] rounded-full object-cover" />
                  ) : (
                    <span
                      className="block h-[38px] w-[38px] rounded-full"
                      style={{ backgroundImage: 'repeating-linear-gradient(135deg,#232427 0 6px,#1b1c1f 6px 12px)' }}
                    />
                  )}
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <button
                    onClick={() => navigate(`/profile/${photo.ownerId}`)}
                    className="truncate text-left text-[13px] font-semibold leading-none hover:underline"
                  >
                    {photo.ownerName || 'Photographer'}
                  </button>
                  <span className="truncate font-mono text-[10.5px] leading-none text-foreground/[.44]">
                    {(photo.location || 'lensleague').toLowerCase()}
                  </span>
                </div>
                {currentUser?.id !== photo.ownerId && (
                  <button
                    onClick={() => (isFollowing ? unfollowUser?.(photo.ownerId) : followUser?.(photo.ownerId))}
                    className={cn(
                      'flex-none text-[11.5px] transition-opacity hover:opacity-80',
                      isFollowing ? 'text-white/50' : 'text-brand'
                    )}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-[7px]">
                <h2 className="text-[18px] font-semibold leading-tight tracking-[-.01em] text-pretty">
                  {photo.caption || 'Untitled'}
                </h2>
                {photo.gear && (
                  <p className="text-[13px] leading-[1.5] text-foreground/[.62] text-pretty">{photo.gear}</p>
                )}
              </div>

              <TagRow />
              <ActionRow />

              <div className="flex min-h-0 flex-1 flex-col gap-3 border-t border-white/[.08] pt-3.5">
                <span className="font-mono text-[9px] font-semibold tracking-[.11em] text-foreground/[.42]">
                  {photoComments.length} {photoComments.length === 1 ? 'COMMENT' : 'COMMENTS'}
                </span>

                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                  {photoComments.length === 0 && (
                    <p className="text-[12px] leading-[1.45] text-white/40">
                      No comments yet. Say something useful about the frame.
                    </p>
                  )}
                  {photoComments.map((c) => (
                    <div key={c.id} className="flex gap-[9px]">
                      {c.userAvatar ? (
                        <img src={c.userAvatar} alt="" className="h-[26px] w-[26px] flex-none rounded-full object-cover" />
                      ) : (
                        <span
                          className="h-[26px] w-[26px] flex-none rounded-full"
                          style={{ backgroundImage: 'repeating-linear-gradient(135deg,#232427 0 6px,#1b1c1f 6px 12px)' }}
                        />
                      )}
                      <p className="text-[12px] leading-[1.45] text-foreground/[.68]">
                        <b className="font-semibold text-foreground">{c.userName || 'Someone'}</b> {c.body}
                      </p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleComment} className="mt-auto">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Add a comment…"
                    aria-label="Add a comment"
                    className="h-[38px] w-full rounded-[9px] border border-white/10 bg-card px-3 text-[12px] text-foreground outline-none placeholder:text-foreground/[.36] focus:border-brand/50"
                  />
                </form>
              </div>
            </aside>
          </div>
        </div>

        {hasPrev && (
          <button
            onClick={goPrev}
            aria-label="Previous photo"
            className="absolute left-5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/[.12] bg-[rgba(24,25,27,.9)] text-white/75 transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={goNext}
            aria-label="Next photo"
            className="absolute right-5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/[.12] bg-[rgba(24,25,27,.9)] text-white/75 transition-colors hover:text-foreground"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-[18px] flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white/[.12] bg-[rgba(24,25,27,.9)] text-white/75 transition-colors hover:text-foreground"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>,
    document.body
  );
}
