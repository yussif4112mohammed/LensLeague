import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from "@/components/ui/button";
import Logo from '@/components/Logo';
import { 
  Home, 
  Compass, 
  Swords, 
  Trophy, 
  User, 
  Settings, 
  LogOut, 
  Plus,
  LogIn
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/feed', label: 'Home', id: 'nav-home', icon: Home },
  { to: '/discover', label: 'Discover', id: 'nav-discover', icon: Compass },
  { to: '/compete/vote', label: 'Compete', id: 'nav-compete', featured: true, icon: Swords },
  { to: '/leaderboard', label: 'Rankings', id: 'nav-leaderboard', icon: Trophy },
  { to: '/settings', label: 'Settings', id: 'nav-settings', icon: Settings },
  { to: '/profile/me', label: 'Profile', id: 'nav-profile', icon: User },
];

function NavIcon({ item, isActive }) {
  const Icon = item.icon;
  return (
    <div className={cn(
      "relative flex items-center justify-center w-12 h-12 rounded-lg transition-colors duration-200 ease-out",
      isActive ? "bg-zinc-900 text-white border border-white/10" : "text-zinc-500 hover:text-white hover:bg-zinc-900/50"
    )}>
      <Icon 
        strokeWidth={isActive ? 2 : 1.5} 
        className="w-5 h-5 relative z-10" 
      />
    </div>
  );
}

export default function PhotographerShell() {
  const navigate = useNavigate();
  const { currentUser } = useApp();

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-screen w-full bg-black overflow-hidden text-zinc-50 selection:bg-primary/30">
        
        {/* Desktop Slim Sidebar */}
        <aside className="hidden md:flex flex-col items-center w-[88px] border-r border-white/10 bg-black h-full py-8 z-50">
          <div 
            className="flex items-center justify-center w-12 h-12 mb-10 cursor-pointer transition-transform duration-200 ease-out"
            onClick={() => navigate('/feed')}
          >
            <Logo withText={false} className="w-8 h-8" />
          </div>

          <nav className="flex-1 flex flex-col items-center gap-6">
            {NAV_ITEMS.map(item => (
              <Tooltip key={item.to} placement="right">
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.to}
                    id={`sidebar-${item.id}`}
                    className="group"
                  >
                    {({ isActive }) => <NavIcon item={item} isActive={isActive} />}
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={16} className="bg-zinc-900 border-white/10 text-white font-semibold">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </nav>

          <div className="mt-8 pt-8 border-t border-white/10 flex flex-col gap-6">

            {currentUser ? (
              <Tooltip placement="right">
                <TooltipTrigger asChild>
                  <button onClick={() => navigate('/')} className="group outline-none">
                    <NavIcon item={{ icon: LogOut }} isActive={false} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={16} className="bg-zinc-900 border-white/10 text-white font-semibold">
                  Log Out
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip placement="right">
                <TooltipTrigger asChild>
                  <NavLink to="/login" className="group">
                    {({ isActive }) => <NavIcon item={{ icon: LogIn }} isActive={isActive} />}
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={16} className="bg-zinc-900 border-white/10 text-white font-semibold">
                  Log In
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-h-0 relative z-0 bg-black">
          <div className="flex-1 overflow-y-auto w-full pb-24 md:pb-0 scroll-smooth">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-white/10 pb-safe supports-[padding-bottom:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around items-center h-16 px-2">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                id={item.id}
                className={({ isActive }) => cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300",
                  isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {({ isActive }) => {
                  const Icon = item.icon;
                  return (
                    <div className="relative flex flex-col items-center gap-1">
                      <Icon strokeWidth={isActive ? 2 : 1.5} className="w-5 h-5 relative z-10" />
                      <span className="text-[9px] font-bold tracking-wider">{item.label}</span>
                    </div>
                  );
                }}
              </NavLink>
            ))}
          </div>
        </nav>

      </div>
    </TooltipProvider>
  );
}
