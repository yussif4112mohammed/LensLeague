import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SettingsPage.css';

const SECTIONS = [
  {
    title: 'Account',
    items: [
      { id: 'email', label: 'Email', value: 'aria@lensleague.com', type: 'row' },
      { id: 'analytics-link', label: 'View My Analytics 📈', value: 'Tap to view', type: 'row' },
      { id: 'password', label: 'Password', value: '••••••••••••', type: 'row' },
      { id: 'oauth', label: 'Linked Accounts', value: 'Google', type: 'row' },
    ]
  },
  {
    title: 'Notifications',
    items: [
      { id: 'notif-likes', label: 'Likes & Comments', type: 'toggle', default: true },
      { id: 'notif-battles', label: 'Competition Results', type: 'toggle', default: true },
      { id: 'notif-bookings', label: 'Booking Requests', type: 'toggle', default: true },
      { id: 'notif-leaderboard', label: 'Rank Changes', type: 'toggle', default: false },
      { id: 'notif-marketing', label: 'News & Updates', type: 'toggle', default: false },
    ]
  },
  {
    title: 'Privacy',
    items: [
      { id: 'privacy-profile', label: 'Profile Visibility', value: 'Public', type: 'row' },
      { id: 'privacy-message', label: 'Who Can Message Me', value: 'Clients Only', type: 'row' },
    ]
  },
  {
    title: 'Security',
    items: [
      { id: '2fa', label: 'Two-Factor Authentication', value: 'Off', type: 'row' },
      { id: 'sessions', label: 'Active Sessions', value: '2 devices', type: 'row' },
      { id: 'download', label: 'Download My Data', value: '', type: 'row' },
    ]
  },
  {
    title: 'Support',
    items: [
      { id: 'help', label: 'Help Center', type: 'row', value: '' },
      { id: 'report', label: 'Report a Problem', type: 'row', value: '' },
    ]
  },
  {
    title: 'Legal',
    items: [
      { id: 'tos', label: 'Terms of Service', type: 'row', value: '' },
      { id: 'privacy-policy', label: 'Privacy Policy', type: 'row', value: '' },
    ]
  },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [toggles, setToggles] = useState({
    'notif-likes': true, 'notif-battles': true, 'notif-bookings': true,
    'notif-leaderboard': false, 'notif-marketing': false,
  });

  const handleToggle = (id) => {
    setToggles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back" onClick={() => navigate(-1)} id="settings-back-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="heading-1">Settings</h1>
      </div>

      <div className="settings-body">
        {SECTIONS.map(section => (
          <div key={section.title} className="settings-section">
            <div className="settings-section__title label">{section.title}</div>
            <div className="settings-section__items">
              {section.items.map(item => (
                <div 
                  key={item.id} 
                  className={`settings-row ${item.type !== 'toggle' ? 'settings-row--clickable' : ''}`} 
                  id={`settings-${item.id}`}
                  style={item.type !== 'toggle' ? { cursor: 'pointer' } : {}}
                  onClick={() => {
                    if (item.type !== 'toggle') {
                      if (item.id === 'analytics-link') {
                        navigate('/analytics');
                      }
                    }
                  }}
                >
                  <span className="settings-row__label body-md">{item.label}</span>
                  {item.type === 'toggle' ? (
                    <button
                      className={`toggle-switch ${toggles[item.id] ? 'toggle-switch--on' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(item.id);
                      }}
                      aria-checked={toggles[item.id]}
                      role="switch"
                    >
                      <div className="toggle-switch__thumb" />
                    </button>
                  ) : (
                    <div className="settings-row__right">
                      {item.value && <span className="body-sm text-secondary">{item.value}</span>}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Danger zone */}
        <div className="settings-section">
          <div className="settings-section__title label" style={{ color: 'var(--error)' }}>Danger Zone</div>
          <div className="settings-section__items">
            <button className="settings-row settings-row--danger" id="logout-btn" onClick={() => navigate('/')}>
              <span className="settings-row__label body-md">Log Out</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
            <button className="settings-row settings-row--delete" id="delete-account-btn">
              <span className="settings-row__label body-md">Delete Account</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            <button className="settings-row" id="admin-console-btn" onClick={() => navigate('/admin')}>
              <span className="settings-row__label body-md" style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>🛡️ Admin Console (Mock)</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent-primary)' }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
