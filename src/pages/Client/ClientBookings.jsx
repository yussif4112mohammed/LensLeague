import { photographers, PHOTO_URLS } from '../../data/photographers';
import RankBadge from '../../components/RankBadge/RankBadge';
import { PrimaryButton } from '../../components/Buttons/Buttons';
import { useNavigate } from 'react-router-dom';
import './ClientBookings.css';

const BOOKINGS = [
  { id: 'bk1', photographer: photographers[2], status: 'accepted', date: 'Aug 15, 2026', type: 'Wedding Photography', budget: '$2,500', location: 'Tuscany, Italy' },
  { id: 'bk2', photographer: photographers[4], status: 'pending', date: 'Sep 3, 2026', type: 'Commercial Campaign', budget: '$4,000', location: 'London, UK' },
  { id: 'bk3', photographer: photographers[0], status: 'completed', date: 'Jun 20, 2026', type: 'Portrait Session', budget: '$800', location: 'Tokyo, Japan' },
  { id: 'bk4', photographer: photographers[1], status: 'declined', date: 'May 10, 2026', type: 'Corporate Headshots', budget: '$600', location: 'Lagos, Nigeria' },
];

const STATUS_STYLES = {
  accepted: { color: 'var(--success)', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)', label: 'Accepted' },
  pending:  { color: 'var(--warning)', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)', label: 'Pending' },
  completed:{ color: 'var(--info)', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)', label: 'Completed' },
  declined: { color: 'var(--error)', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', label: 'Declined' },
};

export default function ClientBookings() {
  const navigate = useNavigate();
  return (
    <div className="client-bookings">
      <div className="client-bookings__header">
        <h1 className="display-lg">My Bookings</h1>
        <PrimaryButton small onClick={() => navigate('/client/search')} id="new-booking-btn">+ New Booking</PrimaryButton>
      </div>

      <div className="bookings-list">
        {BOOKINGS.map(b => {
          const st = STATUS_STYLES[b.status];
          return (
            <div key={b.id} className="booking-card" id={`booking-${b.id}`}>
              <div className="booking-card__header">
                <img src={b.photographer.avatar} alt={b.photographer.name} className="booking-card__avatar" />
                <div className="booking-card__info">
                  <div className="heading-2">{b.photographer.name}</div>
                  <div className="body-sm text-secondary">{b.type}</div>
                </div>
                <span className="booking-status" style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                  {st.label}
                </span>
              </div>
              <div className="booking-card__details">
                <div className="booking-detail"><span>📅</span><span className="body-sm">{b.date}</span></div>
                <div className="booking-detail"><span>📍</span><span className="body-sm">{b.location}</span></div>
                <div className="booking-detail"><span>💰</span><span className="body-sm">{b.budget}</span></div>
              </div>
              <div className="booking-card__actions">
                <button className="booking-action-btn" onClick={() => navigate(`/profile/${b.photographer.id}`)} id={`view-photographer-${b.id}`}>View Portfolio</button>
                {b.status === 'accepted' && <button className="booking-action-btn booking-action-btn--primary" id={`message-booking-${b.id}`}>Message</button>}
                {b.status === 'completed' && <button className="booking-action-btn booking-action-btn--primary" id={`leave-review-${b.id}`}>Leave Review</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
