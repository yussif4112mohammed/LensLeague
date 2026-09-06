import { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import './NotificationsDrawer.css';

/**
 * The notification drawer.
 *
 * This component used to render three hardcoded objects - "Alex Rivers started
 * following your portfolio", "Marcus Osei liked your recent video shoot" - naming
 * people who do not exist, while nine genuine unread notifications sat in the
 * database being read by nothing. Everything below now comes from
 * get_my_notifications (migration v20).
 */

/** Relative time, in the smallest unit that still reads naturally. */
function timeAgo(iso) {
  if (!iso) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * What a notification says.
 *
 * A battle result is deliberately not phrased as a win or a loss. The product
 * does not publish losses, and while a private notification is not a public
 * display, there is no reason to tell somebody they lost when the useful part is
 * that the round is over and worth looking at. The result itself is on the page
 * they land on.
 */
function describe(n) {
  const who = n.actor_name || 'Someone';
  switch (n.type) {
    case 'follow':             return { title: 'New follower',    body: `${who} started following you.` };
    case 'like':               return { title: 'Liked',           body: `${who} liked your photograph.` };
    case 'comment':            return { title: 'New comment',     body: `${who} commented on your photograph.` };
    case 'reply':              return { title: 'New reply',       body: `${who} replied to you.` };
    case 'mention':            return { title: 'Mentioned',       body: `${who} mentioned you.` };
    case 'message':            return { title: 'New message',     body: `${who} sent you a message.` };
    case 'battle_result':      return { title: 'Round finished',  body: 'One of your photographs has been judged.' };
    case 'competition_result': return { title: 'Room closed',     body: 'Recognition has been awarded in a room you entered.' };
    case 'booking_request':    return { title: 'Booking request', body: `${who} wants to book you.` };
    case 'booking_update':     return { title: 'Booking updated', body: `${who} updated a booking.` };
    default:                   return { title: 'Update',          body: 'Something happened on your account.' };
  }
}

/** Initials, for the notifications with no actor or no avatar. */
function initials(name) {
  if (!name) return '·';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function NotificationsDrawer({ isOpen, onClose }) {
  const { notifications, unreadNotificationCount, markNotificationsRead } = useApp();

  // Close on Escape. A drawer that traps you is worse than no drawer.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasUnread = unreadNotificationCount > 0;

  return (
    <>
      <div className="notif-backdrop" onClick={onClose} />
      <div className="notif-drawer" role="dialog" aria-modal="true" aria-label="Notifications">
        <div className="notif-drawer__header">
          <div>
            <h2 className="heading-2">Notifications</h2>
            <span className="body-sm text-tertiary">
              {hasUnread ? `${unreadNotificationCount} unread` : 'Nothing new'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {hasUnread && (
              <button className="notif-drawer__mark-btn" onClick={() => markNotificationsRead()}>
                Mark all read
              </button>
            )}
            <button className="notif-drawer__close-btn" onClick={onClose} aria-label="Close notifications">✕</button>
          </div>
        </div>

        <div className="notif-drawer__list">
          {notifications.length === 0 ? (
            <div className="notif-empty">
              <p className="body-md text-secondary">No notifications yet.</p>
              <p className="body-sm text-tertiary">
                When somebody follows you, comments on your work, or one of your rounds
                is judged, it will appear here.
              </p>
            </div>
          ) : (
            notifications.map(n => {
              const { title, body } = describe(n);
              return (
                <div
                  key={n.id}
                  className={`notif-item ${!n.is_read ? 'notif-item--unread' : ''}`}
                  onClick={() => { if (!n.is_read) markNotificationsRead([n.id]); }}
                >
                  {n.actor_avatar ? (
                    <img src={n.actor_avatar} alt="" className="notif-item__avatar" />
                  ) : (
                    <div className="notif-item__avatar notif-item__avatar--fallback" aria-hidden="true">
                      {initials(n.actor_name)}
                    </div>
                  )}
                  <div className="notif-item__content">
                    <div className="notif-item__title">
                      <span className="body-md font-bold text-primary">{title}</span>
                      <span className="body-sm text-tertiary">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="body-sm text-secondary">{body}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
