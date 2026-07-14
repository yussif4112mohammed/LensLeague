import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PrimaryButton } from '../../components/Buttons/Buttons';
import './ClientBookings.css';

const STATUS_STYLES = {
  accepted:  { color: 'var(--success)', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)', label: 'Accepted' },
  requested: { color: 'var(--warning)', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)', label: 'Pending' },
  completed: { color: 'var(--info)', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)', label: 'Completed' },
  declined:  { color: 'var(--error)', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', label: 'Declined' },
};

export default function ClientBookings() {
  const navigate = useNavigate();
  const { bookings, threads } = useApp();

  // Client Sarah Jenkins bookings
  const clientBookings = bookings.filter(b => b.clientId === 'client_1');

  return (
    <div className="client-bookings">
      <div className="client-bookings__header">
        <h1 className="display-lg">My Bookings</h1>
        <PrimaryButton small onClick={() => navigate('/client/search')} id="new-booking-btn">+ New Booking</PrimaryButton>
      </div>

      <div className="bookings-list">
        {clientBookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--text-tertiary)' }}>
            <span style={{ fontSize: '48px' }}>📅</span>
            <p className="body-md" style={{ marginTop: '12px' }}>You haven't requested any bookings yet.</p>
          </div>
        ) : (
          clientBookings.map(b => {
            const st = STATUS_STYLES[b.status] || STATUS_STYLES.requested;
            return (
              <div key={b.id} className="booking-card" id={`booking-${b.id}`}>
                <div className="booking-card__header">
                  <img src={b.photographerAvatar} alt={b.photographerName} className="booking-card__avatar" />
                  <div className="booking-card__info">
                    <div className="heading-2">{b.photographerName}</div>
                    <div className="body-sm text-secondary">Photography Shoot</div>
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
                {b.message && (
                  <p className="body-sm text-tertiary" style={{ fontStyle: 'italic', padding: '0 4px', borderLeft: '2px solid var(--border-strong)' }}>
                    "{b.message}"
                  </p>
                )}
                <div className="booking-card__actions">
                  <button className="booking-action-btn" onClick={() => navigate(`/profile/${b.photographerId}`)} id={`view-photographer-${b.id}`}>
                    View Portfolio
                  </button>
                  {b.status === 'accepted' && (
                    <button 
                      className="booking-action-btn booking-action-btn--primary" 
                      onClick={() => {
                        const thread = threads.find(t => t.photographerId === b.photographerId);
                        if (thread) {
                          navigate('/client/inbox');
                        }
                      }}
                      id={`message-booking-${b.id}`}
                    >
                      Message
                    </button>
                  )}
                  {b.status === 'completed' && <button className="booking-action-btn booking-action-btn--primary" id={`leave-review-${b.id}`}>Leave Review</button>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
