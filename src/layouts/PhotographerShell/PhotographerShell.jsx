import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './PhotographerShell.css';

const NAV_ITEMS = [
  {
    to: '/feed', label: 'Home', id: 'nav-home',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )
  },
  {
    to: '/discover', label: 'Discover', id: 'nav-discover',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    )
  },
  {
    to: '/compete/vote', label: 'Compete', id: 'nav-compete', featured: true,
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
        <path d="M12 2a6 6 0 0 0-6 6v3.5c0 3.3 2.7 6 6 6s6-2.7 6-6V8a6 6 0 0 0-6-6z" />
      </svg>
    )
  },
  {
    to: '/leaderboard', label: 'Rankings', id: 'nav-leaderboard',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    )
  },
  {
    to: '/profile/me', label: 'Profile', id: 'nav-profile',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    )
  },
];


export default function PhotographerShell() {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const profileId = currentUser?.id || '1';

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar__logo" onClick={() => navigate('/feed')}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="var(--accent-primary)"/>
            <path d="M8 22l6-8 4 5 3-3 5 6H8z" fill="white" opacity="0.9"/>
            <circle cx="22" cy="10" r="3" fill="white"/>
          </svg>
          <span className="sidebar__brand">LensLeague</span>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map(item => {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                id={`sidebar-${item.id}`}
                className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''} ${item.featured ? 'sidebar__link--featured' : ''}`}
              >
                {({ isActive }) => (
                  <>
                    <span className="sidebar__icon">{item.icon(isActive)}</span>
                    <span className="sidebar__label">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <NavLink to="/upload" id="sidebar-upload" className="sidebar__upload-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Upload
        </NavLink>

        <div className="sidebar__footer">
          <NavLink to="/settings" id="sidebar-settings" className="sidebar__settings-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Settings
          </NavLink>
        </div>
      </aside>

      {/* Main content */}
      <main className="page-content">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="bottom-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(item => {
          return (
            <NavLink
              key={item.to}
              to={item.to}
              id={item.id}
              className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''} ${item.featured ? 'bottom-nav__item--featured' : ''}`}
            >
              {({ isActive }) => (
                <>
                  <span className="bottom-nav__icon">{item.icon(isActive)}</span>
                  <span className="bottom-nav__label">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Mobile FAB for upload */}
      <NavLink to="/upload" id="fab-upload" className="fab" aria-label="Upload photo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </NavLink>
    </div>
  );
}
