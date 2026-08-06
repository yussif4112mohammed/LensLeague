import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Mail, User, Star, Globe, Calendar, Bell, 
  HelpCircle, Shield, FileText, LogOut, Trash2, ChevronRight, Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Tailwind CSS Switch Component Mock (in case shadcn Switch isn't installed)
function CustomSwitch({ checked, onCheckedChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-white" : "bg-zinc-800"
      )}
    >
      <span
        data-state={checked ? "checked" : "unchecked"}
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-black shadow-lg ring-0 transition-transform",
          checked ? "translate-x-5 bg-black" : "translate-x-0 bg-zinc-400"
        )}
      />
    </button>
  );
}

function SettingsRow({ icon: Icon, label, value, toggle, destructive, onClick, id }) {
  return (
    <button
      className={cn(
        "w-full flex items-center justify-between p-4 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/50 transition-all first:rounded-t-2xl last:rounded-b-2xl border-b-0 last:border-b group text-left",
        destructive && "hover:bg-red-950/30 border-red-900/20"
      )}
      onClick={onClick}
      id={id}
      type="button"
    >
      <div className="flex items-center gap-4">
        {Icon && (
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
            destructive ? "bg-red-500/10 text-red-500 group-hover:bg-red-500/20" : "bg-black text-zinc-400 group-hover:text-white group-hover:bg-zinc-800"
          )}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <span className={cn(
          "font-semibold text-sm",
          destructive ? "text-red-500" : "text-zinc-200 group-hover:text-white"
        )}>
          {label}
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        {toggle !== undefined ? (
          <div onClick={e => e.stopPropagation()}>
            <CustomSwitch checked={toggle.value} onCheckedChange={toggle.onToggle} />
          </div>
        ) : value ? (
          <span className="text-sm font-medium text-zinc-500">{value}</span>
        ) : !destructive ? (
          <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        ) : null}
      </div>
    </button>
  );
}

function SettingsSection({ title, children }) {
  return (
    <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
      {title && <div className="px-4 mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">{title}</div>}
      <div className="flex flex-col rounded-2xl shadow-sm">
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { logoutUser, currentUser: profile, currentRole } = useApp();

  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [availableForBookings, setAvailableForBookings] = useState(true);

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-black text-zinc-50 pb-20 md:pb-0">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-zinc-900">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors text-zinc-300 hover:text-white"
            onClick={() => navigate(-1)} 
            aria-label="Go back" 
            id="settings-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        
        {/* Profile Summary Card */}
        <div className="p-6 bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-5">
            <Avatar className="w-20 h-20 ring-4 ring-black shadow-xl">
              <AvatarImage src={profile?.avatar_url} alt={profile?.name || 'avatar'} className="object-cover" />
              <AvatarFallback className="bg-zinc-800 text-2xl font-bold">{profile?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white mb-1">{profile?.name || 'Your Name'}</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-zinc-400 font-medium">
                <span>@{profile?.username || 'username'}</span>
                <span className="hidden sm:inline text-zinc-700">•</span>
                <span className="text-zinc-300">{currentRole === 'photographer' ? '📷 Photographer' : '🎯 Client'}</span>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full sm:w-auto h-12 px-6 rounded-xl border-zinc-700 hover:bg-white hover:text-black font-bold transition-colors"
            onClick={() => navigate('/profile/me')}
            id="settings-edit-profile-btn"
          >
            Edit Profile
          </Button>
        </div>

        {/* Settings body */}
        <div className="space-y-8 max-w-2xl mx-auto" style={{ animationDelay: '100ms' }}>
          
          {/* Account */}
          <SettingsSection title="Account">
            <SettingsRow id="settings-email" icon={Mail} label="Email" value={profile?.email || 'Not set'} onClick={() => {}} />
            <SettingsRow id="settings-username" icon={User} label="Username" value={`@${profile?.username || 'not set'}`} onClick={() => {}} />
            <SettingsRow id="settings-plan" icon={Star} label="Plan" value="Pro" onClick={() => {}} />
          </SettingsSection>

          {/* Privacy */}
          <SettingsSection title="Privacy">
            <SettingsRow
              id="settings-public-profile"
              icon={Globe}
              label="Public Profile"
              toggle={{ value: publicProfile, onToggle: () => setPublicProfile(v => !v) }}
            />
            {currentRole === 'photographer' && (
              <SettingsRow
                id="settings-available-bookings"
                icon={Calendar}
                label="Available for Bookings"
                toggle={{ value: availableForBookings, onToggle: () => setAvailableForBookings(v => !v) }}
              />
            )}
          </SettingsSection>

          {/* Notifications */}
          <SettingsSection title="Notifications">
            <SettingsRow
              id="settings-push-notifs"
              icon={Bell}
              label="Push Notifications"
              toggle={{ value: pushNotifs, onToggle: () => setPushNotifs(v => !v) }}
            />
            <SettingsRow
              id="settings-email-notifs"
              icon={Mail}
              label="Email Notifications"
              toggle={{ value: emailNotifs, onToggle: () => setEmailNotifs(v => !v) }}
            />
          </SettingsSection>

          {/* Support */}
          <SettingsSection title="Support">
            <SettingsRow id="settings-help" icon={HelpCircle} label="Help Center" onClick={() => {}} />
            <SettingsRow id="settings-privacy-policy" icon={Shield} label="Privacy Policy" onClick={() => {}} />
            <SettingsRow id="settings-terms" icon={FileText} label="Terms of Service" onClick={() => {}} />
          </SettingsSection>

          {/* Danger zone */}
          <SettingsSection title="Account Actions">
            <SettingsRow
              id="settings-logout"
              icon={LogOut}
              label="Log Out"
              destructive
              onClick={handleLogout}
            />
            <SettingsRow
              id="settings-delete-account"
              icon={Trash2}
              label="Delete Account"
              destructive
              onClick={() => {}}
            />
          </SettingsSection>

          {/* App version */}
          <div className="text-center pt-8 pb-12">
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-800">
              <Camera className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="text-xs font-bold tracking-widest text-zinc-600 uppercase mb-2">LensLeague v2.0.0</div>
            <div className="text-[11px] text-zinc-700 font-medium">Designed for Creators • Built with React</div>
          </div>
        </div>
      </main>
    </div>
  );
}
