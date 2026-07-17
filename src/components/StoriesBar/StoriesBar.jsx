import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { photographers, PHOTO_URLS } from '../../data/photographers';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';
import './StoriesBar.css';

// Combine photographer avatars with real photo covers to show rich content previews
const STORY_CARDS = [
  { 
    id: 'your-story', 
    name: 'Your Story', 
    avatar: photographers[0].avatar, 
    cover: PHOTO_URLS[10], // Beautiful landscape preview
    isOwn: true, 
    hasStory: false 
  },
  ...photographers.slice(0, 8).map((p, index) => ({
    id: p.id,
    name: p.name.split(' ')[0],
    avatar: p.avatar,
    cover: PHOTO_URLS[index % PHOTO_URLS.length], // Assign realistic photos
    isOwn: false,
    hasStory: true
  })),
];

export default function StoriesBar() {
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  return (
    <div className="stories-filmstrip" ref={scrollRef} aria-label="Recent Shoots & Stories">
      <div className="filmstrip-track">
        {STORY_CARDS.map((story) => (
          <button
            key={story.id}
            className={`film-slide ${story.isOwn ? 'film-slide--own' : ''} ${story.hasStory ? 'film-slide--unread' : ''}`}
            onClick={() => story.isOwn ? navigate('/upload') : navigate(`/profile/${story.id}`)}
            id={`story-${story.id}`}
            aria-label={story.isOwn ? 'Create new story' : `View ${story.name}'s story`}
          >
            {/* Main Shoot Preview Image */}
            <div className="film-slide__frame">
              <img src={getOptimizedImageUrl(story.cover, 200, 75)} alt={`${story.name}'s preview`} className="film-slide__image" />
              <div className="film-slide__overlay" />
              
              {/* Creator avatar overlay */}
              <div className="film-slide__avatar-badge">
                <img src={getOptimizedImageUrl(story.avatar, 100, 75)} alt={story.name} className="film-slide__avatar" />
                {story.isOwn && (
                  <span className="film-slide__plus">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </span>
                )}
              </div>
              
              {/* Text label */}
              <span className="film-slide__name">{story.isOwn ? 'Add Shoot' : story.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
