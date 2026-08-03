import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import Logo from '@/components/Logo';

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
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] border-r border-border/40 bg-background/80 backdrop-blur-xl h-full p-6">
        <Link to="/client/home" className="flex items-center gap-3 mb-10 hover:opacity-80 transition-opacity">
          <Logo withText={true} className="w-8 h-8" />
        </Link>

        <nav className="flex-1 flex flex-col gap-2">
          {CLIENT_NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              id={`client-sidebar-${item.id}`}
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}
              `}
            >
              {({ isActive }) => (
                <>
                  <span>{item.icon(isActive)}</span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0 relative z-0">
        <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto pb-24 md:pb-0 scroll-smooth">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/40 pb-safe">
        <div className="flex justify-around items-center h-16">
          {CLIENT_NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              id={item.id}
              className={({ isActive }) => `
                flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors
                ${isActive ? 'text-foreground' : 'text-muted-foreground'}
              `}
            >
              {({ isActive }) => (
                <>
                  <span>{item.icon(isActive)}</span>
                  <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
