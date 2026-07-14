import { NavLink, Outlet } from 'react-router-dom';
import './ClientShell.css';

const CLIENT_NAV = [
  {
    to: '/client/home', label: 'Home', id: 'client-nav-home',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )
  },
  {
    to: '/client/search', label: 'Search', id: 'client-nav-search',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    )
  },
  {
    to: '/client/saved', label: 'Saved', id: 'client-nav-saved',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    )
  },
  {
    to: '/client/bookings', label: 'Bookings', id: 'client-nav-bookings',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    )
  },
  {
    to: '/client/profile', label: 'Profile', id: 'client-nav-profile',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    )
  },
];


export default function ClientShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#FF4D6D"/>
            <path d="M8 22l6-8 4 5 3-3 5 6H8z" fill="white" opacity="0.9"/>
            <circle cx="22" cy="10" r="3" fill="white"/>
          </svg>
          <span className="sidebar__brand">LensLeague</span>
        </div>
        <nav className="sidebar__nav">
          {CLIENT_NAV.map(item => (
            <NavLink
              key={item.to} to={item.to} id={`client-sidebar-${item.id}`}
              className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  <span className="sidebar__icon">{item.icon(isActive)}</span>
                  <span className="sidebar__label">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="page-content"><Outlet /></main>

      <nav className="bottom-nav" aria-label="Client navigation">
        {CLIENT_NAV.map(item => (
          <NavLink
            key={item.to} to={item.to} id={item.id}
            className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <span className="bottom-nav__icon">{item.icon(isActive)}</span>
                <span className="bottom-nav__label">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
