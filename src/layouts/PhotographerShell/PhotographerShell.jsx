import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Logo from '@/components/Logo';
import {
  Home,
  Compass,
  Trophy,
  Bookmark,
  CircleUserRound,
  Plus,
  MoreHorizontal,
  Settings,
  BarChart3,
  Inbox,
  LogOut,
  LogIn,
  Swords,
  PlusSquare,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Rail nav from mockup 2a. Settings / Analytics / Inbox intentionally live in the
// account menu behind the "..." on the user chip rather than the rail, so the rail
// stays the five destinations the design calls for.
// Battles are a core LensLeague loop, not a banner. /compete/vote previously had
// no entry anywhere in the navigation - the route existed and worked, but nothing
// linked to it, so the product's central loop was unreachable by clicking.
//
// `mobile` controls the bottom tab bar. A phone tab bar holds five items before
// the labels start colliding, so it carries the loop a photographer repeats -
// look, find, compete, post, review your own work - and Leagues and Saved stay
// on the desktop rail where there is room for them.
const NAV_ITEMS = [
  { to: '/feed', label: 'Feed', id: 'nav-feed', icon: Home, mobile: true },
  { to: '/discover', label: 'Explore', id: 'nav-explore', icon: Compass, mobile: true },
  { to: '/compete/vote', label: 'Battles', id: 'nav-battles', icon: Swords, mobile: true },
  { to: '/upload', label: 'Upload', id: 'nav-upload', icon: PlusSquare, mobile: true },
  { to: '/leagues', label: 'Leagues', id: 'nav-leagues', icon: Trophy },
  { to: '/saved', label: 'Saved', id: 'nav-saved', icon: Bookmark },
  { to: '/profile/me', label: 'My portfolio', id: 'nav-portfolio', icon: CircleUserRound, mobile: true },
];

const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((i) => i.mobile);

const ACCOUNT_ITEMS = [
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/* Placeholder avatar matching the mockup's hatched swatch, used until a real
   avatar_url exists so empty states still read as deliberate. */
function Avatar({ src, name, size = 24, className }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return src ? (
    <img
      src={src}
      alt=""
      style={{ width: size, height: size }}
      className={cn('flex-none rounded-full object-cover', className)}
    />
  ) : (
    <span
      style={{
        width: size,
        height: size,
        backgroundImage:
          'repeating-linear-gradient(135deg,#232427 0 6px,#1b1c1f 6px 12px)',
        fontSize: Math.max(9, size * 0.4),
      }}
      className={cn(
        'flex flex-none items-center justify-center rounded-full font-semibold text-white/50',
        className
      )}
    >
      {initial}
    </span>
  );
}

function AccountMenu({ open, onClose, onNavigate, onLogout }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="menu"
      className="absolute bottom-full left-0 z-50 mb-2 w-full min-w-[184px] overflow-hidden rounded-[10px] border border-white/10 bg-card py-1 shadow-xl shadow-black/50"
    >
      {ACCOUNT_ITEMS.map((item) => (
        <button
          key={item.to}
          role="menuitem"
          onClick={() => onNavigate(item.to)}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] text-white/75 transition-colors hover:bg-white/[.06] hover:text-foreground"
        >
          <item.icon className="h-[15px] w-[15px]" strokeWidth={1.6} />
          {item.label}
        </button>
      ))}
      <div className="my-1 h-px bg-white/[.08]" />
      <button
        role="menuitem"
        onClick={onLogout}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] text-white/75 transition-colors hover:bg-white/[.06] hover:text-foreground"
      >
        <LogOut className="h-[15px] w-[15px]" strokeWidth={1.6} />
        Log out
      </button>
    </div>
  );
}

export default function PhotographerShell() {
  const navigate = useNavigate();
  const { currentUser, users, follows, logoutUser } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  // Who the signed-in user follows, resolved against the loaded profiles.
  const followingIds = (follows || [])
    .filter((f) => (f.follower_id || f.followerId) === currentUser?.id)
    .map((f) => f.following_id || f.followingId);
  const following = (users || [])
    .filter((u) => followingIds.includes(u.id))
    .slice(0, 3);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logoutUser?.();
    navigate('/');
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">

        {/* ── Left rail. Labelled at xl (mockup 2a), icons-only on tablet (2d). ── */}
        <aside className="z-50 hidden h-full flex-none flex-col border-r border-white/[.08] bg-rail md:flex md:w-[76px] md:items-center md:px-0 md:py-[22px] xl:w-[216px] xl:items-stretch xl:px-4 xl:py-[22px]">

          <button
            onClick={() => navigate('/feed')}
            aria-label="LensLeague home"
            className="mb-3 flex items-center gap-[9px] rounded-lg px-0 pb-[22px] outline-none xl:px-2"
          >
            <Logo withText={false} className="h-[22px] w-[22px] flex-none" />
            <span className="hidden text-[14px] font-bold tracking-[.02em] xl:inline">
              LENSLEAGUE
            </span>
          </button>

          <nav className="flex flex-col gap-0.5 md:items-center md:gap-2 xl:items-stretch xl:gap-0.5">
            {NAV_ITEMS.map((item) => (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.to}
                    id={`rail-${item.id}`}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center rounded-lg text-[13px] transition-colors',
                        'md:h-9 md:w-9 md:justify-center xl:h-auto xl:w-auto xl:justify-start xl:gap-[11px] xl:px-2 xl:py-2.5',
                        isActive
                          ? 'bg-white/[.07] font-semibold text-foreground'
                          : 'text-white/60 hover:bg-white/[.04] hover:text-foreground'
                      )
                    }
                  >
                    <item.icon className="h-[15px] w-[15px] flex-none" strokeWidth={1.6} />
                    <span className="hidden xl:inline">{item.label}</span>
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={14} className="xl:hidden">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </nav>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate('/upload')}
                id="rail-upload"
                className="mt-[18px] flex items-center justify-center gap-[7px] rounded-lg bg-brand text-[12.5px] font-semibold text-brand-foreground transition-opacity hover:opacity-90 md:h-9 md:w-9 xl:h-[34px] xl:w-auto"
              >
                <Plus className="h-4 w-4 flex-none" strokeWidth={2} />
                <span className="hidden xl:inline">Upload</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={14} className="xl:hidden">
              Upload
            </TooltipContent>
          </Tooltip>

          {following.length > 0 && (
            <div className="mt-[26px] hidden flex-col gap-[9px] xl:flex">
              <span className="px-2 font-mono text-[9px] font-semibold tracking-[.11em] text-foreground/[.36]">
                FOLLOWING
              </span>
              {following.map((u) => (
                <NavLink
                  key={u.id}
                  to={`/profile/${u.id}`}
                  className="flex items-center gap-[9px] rounded-md px-2 py-1 text-[12px] text-white/70 transition-colors hover:text-foreground"
                >
                  <Avatar src={u.avatar_url || u.avatar} name={u.name} size={24} />
                  <span className="truncate">{u.name || u.username}</span>
                </NavLink>
              ))}
            </div>
          )}

          {/* User chip. The "..." opens everything the rail deliberately omits. */}
          <div className="relative mt-auto w-full">
            {currentUser ? (
              <>
                <AccountMenu
                  open={menuOpen}
                  onClose={() => setMenuOpen(false)}
                  onNavigate={(to) => {
                    setMenuOpen(false);
                    navigate(to);
                  }}
                  onLogout={handleLogout}
                />
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="flex w-full items-center gap-[9px] rounded-lg bg-card transition-colors hover:bg-card md:justify-center md:p-1.5 xl:justify-start xl:px-2 xl:py-[9px]"
                >
                  <Avatar
                    src={currentUser.avatar_url || currentUser.avatar}
                    name={currentUser.name}
                    size={26}
                  />
                  <span className="hidden min-w-0 flex-1 flex-col items-start gap-0.5 xl:flex">
                    <span className="w-full truncate text-left text-[11.5px] font-semibold leading-none">
                      {currentUser.name || 'LensLeague user'}
                    </span>
                    <span className="w-full truncate text-left font-mono text-[9.5px] leading-none text-foreground/[.42]">
                      @{currentUser.username || 'you'}
                    </span>
                  </span>
                  <MoreHorizontal className="hidden h-[15px] w-[15px] flex-none text-white/40 xl:block" />
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                className="flex w-full items-center gap-[9px] rounded-lg bg-card px-2 py-[9px] text-[12px] text-white/70 transition-colors hover:text-foreground md:justify-center xl:justify-start"
              >
                <LogIn className="h-[15px] w-[15px] flex-none" strokeWidth={1.6} />
                <span className="hidden xl:inline">Log in</span>
              </NavLink>
            )}
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="relative flex min-h-0 flex-1 flex-col">
          <div className="w-full flex-1 overflow-y-auto scroll-smooth pb-20 md:pb-0">
            <Outlet />
          </div>
        </main>

        {/* ── Mobile tab bar (turn 1 nav model) ── */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[.08] bg-rail/95 backdrop-blur-xl md:hidden supports-[padding-bottom:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]">
          <div className="flex h-16 items-center justify-around px-2">
            {MOBILE_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                id={item.id}
                className={({ isActive }) =>
                  cn(
                    'flex h-full flex-1 flex-col items-center justify-center gap-1 transition-colors',
                    isActive ? 'text-brand' : 'text-white/50 hover:text-white/80'
                  )
                }
              >
                <item.icon className="h-5 w-5" strokeWidth={1.7} />
                <span className="text-[9px] font-semibold tracking-wide">
                  {item.label === 'My portfolio' ? 'Portfolio' : item.label}
                </span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </TooltipProvider>
  );
}
