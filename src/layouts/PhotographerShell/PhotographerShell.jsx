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
  { to: '/profile/me', label: 'Profile', id: 'nav-profile', icon: User },
];

function NavIcon({ item, isActive }) {
  const Icon = item.icon;
  return (
    <div className={cn(
      "relative flex items-center justify-center w-12 h-12 rounded-2xl transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-[0.96]",
      isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"
    )}>
      {isActive && (
        <div className="absolute inset-0 bg-primary/20 blur-md rounded-full" />
      )}
      <Icon 
        strokeWidth={isActive ? 2.5 : 2} 
        className={cn("w-6 h-6 relative z-10 transition-colors", isActive && item.featured ? "text-primary" : "")} 
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
        <aside className="hidden md:flex flex-col items-center w-[88px] border-r border-white/5 bg-black/50 backdrop-blur-2xl h-full py-8 z-50">
          <div 
            className="flex items-center justify-center w-12 h-12 mb-10 cursor-pointer hover:scale-110 active:scale-[0.96] transition-transform duration-200 ease-out"
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

          <Tooltip placement="right">
            <TooltipTrigger asChild>
              <button 
                className="w-12 h-12 mt-6 rounded-full bg-gradient-to-tr from-primary to-blue-400 text-white flex items-center justify-center hover:scale-110 active:scale-[0.96] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-[transform,shadow] duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black"
                onClick={() => navigate('/upload')}
              >
                <Plus className="w-6 h-6" strokeWidth={3} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={16} className="bg-primary border-none text-white font-bold">
              Upload
            </TooltipContent>
          </Tooltip>

          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col gap-6">
            <Tooltip placement="right">
              <TooltipTrigger asChild>
                <NavLink to="/settings" className="group">
                  {({ isActive }) => <NavIcon item={{ icon: Settings }} isActive={isActive} />}
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={16} className="bg-zinc-900 border-white/10 text-white font-semibold">
                Settings
              </TooltipContent>
            </Tooltip>

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
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-3xl border-t border-white/5 pb-safe supports-[padding-bottom:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]">
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
                      {isActive && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary/20 blur-md rounded-full" />}
                      <Icon strokeWidth={isActive ? 2.5 : 2} className={cn("w-5 h-5 relative z-10", isActive && item.featured ? "text-primary" : "")} />
                      <span className="text-[9px] font-bold tracking-wider">{item.label}</span>
                    </div>
                  );
                }}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Mobile FAB for upload */}
        <button 
          className="md:hidden fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-blue-400 text-white flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-[0.96] transition-transform duration-200 ease-out z-50 focus:outline-none"
          onClick={() => navigate('/upload')}
          aria-label="Upload photo"
        >
          <Plus className="w-6 h-6" strokeWidth={3} />
        </button>
      </div>
    </TooltipProvider>
  );
}
