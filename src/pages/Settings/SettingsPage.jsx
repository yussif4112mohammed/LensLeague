import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import './SettingsPage.css';

function ToggleSwitch({ on, onToggle }) {
  return (
    <button
      className={`toggle-switch ${on ? 'toggle-switch--on' : ''}`}
      onClick={onToggle}
      aria-checked={on}
      role="switch"
      type="button"
    >
      <span className="toggle-switch__thumb" />
    </button>
  );
}

function SettingsRow({ icon, label, value, toggle, destructive, onClick, id }) {
  return (
    <button
      className={`settings-row ${destructive ? 'settings-row--danger' : ''}`}
      onClick={onClick}
      id={id}
      type="button"
    >
      <div className="flex items-center gap-3">
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
        <span className="body-md" style={{ color: destructive ? 'inherit' : 'var(--text-primary)' }}>{label}</span>
      </div>
      <div className="settings-row__right">
        {toggle !== undefined ? (
          <ToggleSwitch on={toggle.value} onToggle={toggle.onToggle} />
        ) : value ? (
          <span className="body-sm" style={{ color: 'var(--text-tertiary)' }}>{value}</span>
        ) : !destructive ? (
          <span style={{ color: 'var(--text-tertiary)', fontSize: 18 }}>›</span>
        ) : null}
      </div>
    </button>
  );
}

function SettingsSection({ title, children }) {
  return (
    <div className="settings-section">
      {title && <div className="settings-section__title">{title}</div>}
      <div className="settings-section__items">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { logout, profile } = useAuth();
  const { currentRole } = useApp();

  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [availableForBookings, setAvailableForBookings] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <button className="settings-back" onClick={() => navigate(-1)} aria-label="Go back" id="settings-back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="heading-2" style={{ margin: 0 }}>Settings</h1>
      </div>

      {/* Profile Summary */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-4) var(--screen-px)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--accent-gradient)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0
        }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="avatar" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
            : '📸'}
        </div>
        <div>
          <div className="heading-2" style={{ margin: 0 }}>{profile?.name || 'Your Name'}</div>
          <div className="body-sm" style={{ color: 'var(--text-tertiary)' }}>
            @{profile?.username || 'username'} · {currentRole === 'photographer' ? '📷 Photographer' : '🎯 Client'}
          </div>
        </div>
        <button
          className="ml-auto"
          style={{
            padding: '8px 16px', borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)',
            color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer'
          }}
          onClick={() => navigate('/profile/me')}
          id="settings-edit-profile-btn"
        >
          Edit Profile
        </button>
      </div>

      {/* Settings body */}
      <div className="settings-body">

        {/* Account */}
        <SettingsSection title="Account">
          <SettingsRow id="settings-email" icon="✉️" label="Email" value={profile?.email || 'Not set'} onClick={() => {}} />
          <SettingsRow id="settings-username" icon="🔖" label="Username" value={`@${profile?.username || 'not set'}`} onClick={() => {}} />
          <SettingsRow id="settings-plan" icon="⭐" label="Plan" value="Free" onClick={() => {}} />
        </SettingsSection>

        {/* Privacy */}
        <SettingsSection title="Privacy">
          <SettingsRow
            id="settings-public-profile"
            icon="🌐"
            label="Public Profile"
            toggle={{ value: publicProfile, onToggle: () => setPublicProfile(v => !v) }}
          />
          {currentRole === 'photographer' && (
            <SettingsRow
              id="settings-available-bookings"
              icon="📅"
              label="Available for Bookings"
              toggle={{ value: availableForBookings, onToggle: () => setAvailableForBookings(v => !v) }}
            />
          )}
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="Notifications">
          <SettingsRow
            id="settings-push-notifs"
            icon="🔔"
            label="Push Notifications"
            toggle={{ value: pushNotifs, onToggle: () => setPushNotifs(v => !v) }}
          />
          <SettingsRow
            id="settings-email-notifs"
            icon="📧"
            label="Email Notifications"
            toggle={{ value: emailNotifs, onToggle: () => setEmailNotifs(v => !v) }}
          />
        </SettingsSection>

        {/* Support */}
        <SettingsSection title="Support">
          <SettingsRow id="settings-help" icon="❓" label="Help Center" onClick={() => {}} />
          <SettingsRow id="settings-privacy-policy" icon="🔒" label="Privacy Policy" onClick={() => {}} />
          <SettingsRow id="settings-terms" icon="📄" label="Terms of Service" onClick={() => {}} />
        </SettingsSection>

        {/* Danger zone */}
        <SettingsSection title="Account Actions">
          <SettingsRow
            id="settings-logout"
            icon="🚪"
            label="Log Out"
            destructive
            onClick={handleLogout}
          />
          <SettingsRow
            id="settings-delete-account"
            icon="🗑️"
            label="Delete Account"
            destructive
            onClick={() => {}}
          />
        </SettingsSection>

        {/* App version */}
        <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12, padding: 'var(--space-3) 0' }}>
          LensLeague v0.1.0 · Built with 📸 and ☕
        </div>
      </div>
    </div>
  );
}
