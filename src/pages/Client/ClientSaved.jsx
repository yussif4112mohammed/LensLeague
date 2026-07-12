import { photos } from '../../data/photos';
import { useNavigate } from 'react-router-dom';
import './ClientBookings.css';

const SAVED = photos.slice(0, 6);

export default function ClientSaved() {
  const navigate = useNavigate();
  return (
    <div className="client-saved">
      <h1 className="display-lg">Saved</h1>
      <p className="body-md text-secondary">{SAVED.length} saved photographers & photos</p>
      <div style={{ columns: 2, columnGap: 'var(--space-3)' }}>
        {SAVED.map(p => (
          <div key={p.id} style={{ breakInside: 'avoid', marginBottom: 'var(--space-3)', borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => navigate(`/profile/${p.ownerId}`)} id={`saved-${p.id}`}>
            <img src={p.url} alt={p.caption} style={{ width: '100%', aspectRatio: p.aspectRatio || '3/4', objectFit: 'cover', display: 'block' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
