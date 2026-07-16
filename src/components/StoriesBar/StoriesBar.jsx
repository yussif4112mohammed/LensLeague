import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { photographers } from '../../data/photographers';
import './StoriesBar.css';

const STORY_USERS = [
  { id: 'your-story', name: 'Your Story', avatar: photographers[0].avatar, isOwn: true, hasStory: false },
  ...photographers.slice(0, 8).map(p => ({ id: p.id, name: p.name.split(' ')[0], avatar: p.avatar, isOwn: false, hasStory: true })),
];

export default function StoriesBar() {
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  return (
    <div className="stories-bar" ref={scrollRef} aria-label="Stories">
      {STORY_USERS.map((user, i) => (
        <button
          key={user.id}
          className={`story-item ${user.isOwn ? 'story-item--own' : ''} ${user.hasStory ? 'story-item--unseen' : ''}`}
          onClick={() => user.isOwn ? navigate('/upload') : navigate(`/profile/${user.id}`)}
          id={`story-${user.id}`}
          aria-label={user.isOwn ? 'Add to your story' : `${user.name}'s story`}
        >
          <div className="story-item__ring">
            <img src={user.avatar} alt={user.name} className="story-item__avatar" />
            {user.isOwn && (
              <span className="story-item__plus">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </span>
            )}
          </div>
          <span className="story-item__name">{user.isOwn ? 'Your Story' : user.name}</span>
        </button>
      ))}
    </div>
  );
}
