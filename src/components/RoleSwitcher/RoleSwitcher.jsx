import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './RoleSwitcher.css';

export default function RoleSwitcher() {
  const { currentRole, switchRole } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const handleToggle = () => {
    if (currentRole === 'photographer') {
      switchRole('client');
      if (!location.pathname.startsWith('/client')) {
        navigate('/client/home');
      }
    } else {
      switchRole('photographer');
      if (location.pathname.startsWith('/client')) {
        navigate('/feed');
      }
    }
  };

  return (
    <button
      className="role-switcher-fab"
      onClick={handleToggle}
      id="role-switcher-btn"
      title={`Switch to ${currentRole === 'photographer' ? 'Client' : 'Photographer'} view`}
    >
      <span className="role-switcher-icon">🎭</span>
      <span className="role-switcher-text">
        View as: <strong>{currentRole === 'photographer' ? 'Photographer' : 'Client'}</strong>
      </span>
    </button>
  );
}
