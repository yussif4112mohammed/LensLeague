import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Heart, MessageCircle, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import SmartImage from '../SmartImage/SmartImage';
import { IMAGE_SIZES } from '../../utils/imageOptimizer';

/* One-up editorial feed post — mockup 1d.
   Credit above the frame, the frame full-bleed, actions below. One photograph at
   a time: no card chrome competing with the work. */
export default function FeedPost({ photo, onOpen, onComments, priority = false }) {
  const navigate = useNavigate();
  const {
    currentUser,
    follows,
    comments,
    savedItemIds,
    followUser,
    unfollowUser,
    toggleLikePost,
    toggleSavedItem,
  } = useApp();

  const [liked, setLiked] = useState(false);

  const isOwn = currentUser?.id === photo.ownerId;
  const isFollowing = (follows || []).some(
    (f) =>
      (f.follower_id || f.followerId) === currentUser?.id &&
      (f.following_id || f.followingId) === photo.ownerId
  );
  const isSaved = (savedItemIds || []).includes(photo.id);
  const commentCount = (comments || []).filter(
    (c) => (c.photo_id || c.item_id) === photo.id
  ).length;

  const meta = [photo.category, photo.location]
    .filter(Boolean)
    .join(' · ')
    .toLowerCase();

  return (
    <article className="flex flex-col gap-[9px]">

      {/* Credit */}
      <div className="flex items-center gap-[9px] px-5 md:px-0">
        <button onClick={() => navigate(`/profile/${photo.ownerId}`)} className="flex-none">
          {photo.ownerAvatar ? (
            <SmartImage
              src={photo.ownerAvatar}
              alt=""
              width={IMAGE_SIZES.avatarSmall}
              wrapperClassName="h-[30px] w-[30px] rounded-full"
            />
          ) : (
            <span
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[11px] font-semibold text-white/50"
              style={{ backgroundImage: 'repeating-linear-gradient(135deg,#232427 0 6px,#1b1c1f 6px 12px)' }}
            >
              {(photo.ownerName || '?').trim().charAt(0).toUpperCase()}
            </span>
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <button
            onClick={() => navigate(`/profile/${photo.ownerId}`)}
            className="truncate text-left text-[12.5px] font-semibold leading-none hover:underline"
          >
            {photo.ownerName || 'Photographer'}
          </button>
          {meta && (
            <span className="truncate font-mono text-[10px] leading-none text-foreground/[.42]">{meta}</span>
          )}
        </div>

        {!isOwn && currentUser && (
          <button
            onClick={() => (isFollowing ? unfollowUser?.(photo.ownerId) : followUser?.(photo.ownerId))}
            className={cn(
              'flex-none text-[11px] transition-opacity hover:opacity-80',
              isFollowing ? 'text-white/40' : 'text-brand'
            )}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

      {/* Frame — full-bleed on mobile, rounded once there is a margin */}
      <button
        onClick={onOpen}
        aria-label={photo.caption || 'Open photo'}
        className="group block w-full overflow-hidden bg-muted outline-none ring-brand focus-visible:ring-2 md:rounded-xl"
      >
        {photo.isVideo ? (
          <video src={photo.url} controls playsInline className="w-full" />
        ) : (
          <SmartImage
            src={photo.url}
            alt={photo.caption || ''}
            width={IMAGE_SIZES.feedPost}
            /* Reserve the box before the bytes land, so posts below do not get
               shoved down as each photograph decodes. */
            aspectRatio={photo.aspectRatio?.replace('/', ' / ') || '3 / 4'}
            priority={priority}
            className="transition-transform duration-700 group-hover:scale-[1.01]"
          />
        )}
      </button>

      {/* Caption + actions */}
      <div className="flex flex-col gap-[7px] px-5 md:px-0">
        {photo.caption && (
          <p className="text-[13.5px] leading-[1.35] text-white/90 text-pretty">{photo.caption}</p>
        )}

        <div className="flex items-center gap-4 text-[11.5px] text-foreground/[.55]">
          <button
            onClick={() => { setLiked(v => !v); toggleLikePost?.(photo.id); }}
            aria-pressed={liked}
            className={cn('flex items-center gap-[5px] transition-colors', liked ? 'text-brand' : 'hover:text-white/80')}
          >
            <Heart className="h-[13px] w-[13px]" strokeWidth={1.7} fill={liked ? 'currentColor' : 'none'} />
            {(photo.likes || 0) + (liked ? 1 : 0)}
          </button>

          <button
            onClick={onComments || onOpen}
            className="flex items-center gap-[5px] transition-colors hover:text-white/80"
          >
            <MessageCircle className="h-[13px] w-[13px]" strokeWidth={1.7} />
            {commentCount}
          </button>

          <button
            onClick={() => toggleSavedItem?.(photo.id)}
            aria-pressed={isSaved}
            className={cn('flex items-center gap-[5px] transition-colors', isSaved ? 'text-brand' : 'hover:text-white/80')}
          >
            <Bookmark className="h-[13px] w-[13px]" strokeWidth={1.7} fill={isSaved ? 'currentColor' : 'none'} />
            {isSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </article>
  );
}
