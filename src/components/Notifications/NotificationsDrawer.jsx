import { useState } from 'react';
import './NotificationsDrawer.css';

export default function NotificationsDrawer({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      type: 'follow',
      title: 'New Follower',
      body: 'Alex Rivers started following your portfolio.',
      time: '10m ago',
      read: false,
      avatar: 'https://ui-avatars.com/api/?name=Alex+Rivers&background=random'
    },
    {
      id: 'n2',
      type: 'like',
      title: 'Post Liked',
      body: 'Marcus Osei liked your recent video shoot.',
      time: '1h ago',
      read: false,
      avatar: 'https://ui-avatars.com/api/?name=Marcus+Osei&background=random'
    },
    {
      id: 'n3',
      type: 'comment',
      title: 'New Comment',
      body: '"The contrast in this shot is breathtaking!"',
      time: '3h ago',
      read: true,
      avatar: 'https://ui-avatars.com/api/?name=Sofia+Reyes&background=random'
    }
  ]);

  if (!isOpen) return null;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <>
      <div className="notif-backdrop" onClick={onClose} />
      <div className="notif-drawer">
        <div className="notif-drawer__header">
          <div>
            <h2 className="heading-2">Notifications</h2>
            <span className="body-sm text-tertiary">Stay updated on your activity</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="notif-drawer__mark-btn" onClick={markAllRead}>Mark all read</button>
            <button className="notif-drawer__close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="notif-drawer__list">
          {notifications.map(n => (
            <div key={n.id} className={`notif-item ${!n.read ? 'notif-item--unread' : ''}`}>
              <img src={n.avatar} alt="" className="notif-item__avatar" />
              <div className="notif-item__content">
                <div className="notif-item__title">
                  <span className="body-md font-bold text-primary">{n.title}</span>
                  <span className="body-sm text-tertiary">{n.time}</span>
                </div>
                <p className="body-sm text-secondary">{n.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
