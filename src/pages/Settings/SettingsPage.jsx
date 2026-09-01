import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Mail, User, Star, Globe, Calendar, Bell, 
  HelpCircle, Shield, FileText, LogOut, Trash2, ChevronRight, Camera,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '../../lib/supabaseClient';

// Tailwind CSS Switch Component Mock
function CustomSwitch({ checked, onCheckedChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-white" : "bg-zinc-800"
      )}
    >
      <span
        data-state={checked ? "checked" : "unchecked"}
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-zinc-950 shadow-lg ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

function SettingsRow({ icon: Icon, label, value, toggle, destructive, onClick, id }) {
  return (
    <button
      className={cn(
        "w-full flex items-center justify-between p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-all first:rounded-t-2xl last:rounded-b-2xl border-b-0 last:border-b group text-left",
        destructive && "hover:bg-red-950/30 border-red-900/50"
      )}
      onClick={onClick}
      id={id}
      type="button"
    >
      <div className="flex items-center gap-4">
        {Icon && (
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
            destructive ? "bg-red-950/50 text-red-500 group-hover:bg-red-900/50" : "bg-zinc-800 text-zinc-400 group-hover:text-white group-hover:bg-zinc-700"
          )}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <span className={cn(
          "font-semibold text-sm",
          destructive ? "text-red-500" : "text-zinc-100 group-hover:text-white"
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
  const { logoutUser, currentUser: profile, currentRole, updateProfileSettings } = useApp();

  const isAvailable = (status) => !status || status === 'Available' || status === 'Available for booking';

  const [pushNotifs, setPushNotifs] = useState(profile?.push_notifs ?? true);
  const [emailNotifs, setEmailNotifs] = useState(profile?.email_notifs ?? true);
  const [publicProfile, setPublicProfile] = useState(profile?.is_public ?? true);
  const [availableForBookings, setAvailableForBookings] = useState(isAvailable(profile?.availability_status));
  const [authEmail, setAuthEmail] = useState('');
  const [saveToast, setSaveToast] = useState(null); // null | 'saved' | 'error'

  const [activeModal, setActiveModal] = useState(null); // 'email' | 'username' | 'plan' | 'deactivate'
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch auth email on mount
  useEffect(() => {
    const getEmail = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) setAuthEmail(user.email);
      } catch (e) { /* ignore */ }
    };
    getEmail();
  }, []);

  // Sync state if profile loads slightly after mount
  useEffect(() => {
    if (profile) {
      setPushNotifs(profile.push_notifs ?? true);
      setEmailNotifs(profile.email_notifs ?? true);
      setPublicProfile(profile.is_public ?? true);
      setAvailableForBookings(isAvailable(profile.availability_status));
    }
  }, [profile]);

  const showToast = (type) => {
    setSaveToast(type);
    setTimeout(() => setSaveToast(null), 2000);
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  const handleToggle = async (key, currentValue, setter) => {
    const newValue = !currentValue;
    setter(newValue); // Optimistic UI update
    
    let updateObj = {};
    if (key === 'availability') {
      updateObj = { availability_status: newValue ? 'Available' : 'Unavailable' };
    } else {
      updateObj = { [key]: newValue };
    }
    
    const success = await updateProfileSettings(updateObj);
    if (!success) {
      // Revert on failure
      setter(currentValue);
      showToast('error');
    } else {
      showToast('saved');
    }
  };

  const openModal = (type) => {
    setActiveModal(type);
    setErrorMsg('');
    if (type === 'username') setInputValue(profile?.username || '');
    if (type === 'email') setInputValue(authEmail || profile?.email || '');
  };

  const handleSaveModal = async () => {
    if (!inputValue.trim() && activeModal !== 'deactivate' && activeModal !== 'plan') return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (activeModal === 'username') {
        const success = await updateProfileSettings({ username: inputValue.trim() });
        if (!success) throw new Error('Username may be taken or invalid.');
      } else if (activeModal === 'email') {
        // Update auth email via Supabase
        const { error } = await supabase.auth.updateUser({ email: inputValue.trim() });
        if (error) throw error;
        // Optionally update a mirrored email field in profiles if you have one
      } else if (activeModal === 'deactivate') {
        const success = await updateProfileSettings({ is_deactivated: true });
        if (!success) throw new Error('Failed to deactivate account.');
        await logoutUser();
        navigate('/');
        return; // exit early
      }

      setActiveModal(null);
      showToast('saved');
      if (activeModal === 'email') setAuthEmail(inputValue.trim());
    } catch (err) {
      setErrorMsg(err.message);
      showToast('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20 md:pb-0 relative">
      
      {/* Save Toast */}
      {saveToast && (
        <div className={cn(
          "fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg text-sm font-bold tracking-wide animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300",
          saveToast === 'saved' ? 'bg-zinc-950 text-white' : 'bg-red-600 text-white'
        )}>
          {saveToast === 'saved' ? '✓ Saved' : '✕ Failed to save'}
        </div>
      )}
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
            onClick={() => navigate(-1)} 
            aria-label="Go back" 
            id="settings-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight text-white">Settings</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        
        {/* Profile Summary Card */}
        <div className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-5">
            <Avatar className="w-20 h-20 ring-4 ring-zinc-950 shadow-md">
              <AvatarImage src={profile?.avatar_url || profile?.avatar} alt={profile?.name || 'avatar'} className="object-cover" />
              <AvatarFallback className="bg-zinc-800 text-zinc-300 text-2xl font-bold">{profile?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white mb-1">{profile?.name || 'Your Name'}</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-zinc-400 font-medium">
                <span>@{profile?.username || 'username'}</span>
                <span className="hidden sm:inline text-zinc-700">•</span>
                <span className="text-zinc-500">{currentRole === 'photographer' ? '📷 Photographer' : '🎯 Client'}</span>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full sm:w-auto h-12 px-6 rounded-xl border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-white font-bold transition-colors"
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
            <SettingsRow id="settings-email" icon={Mail} label="Email" value={authEmail || profile?.email || 'Update'} onClick={() => openModal('email')} />
            <SettingsRow id="settings-username" icon={User} label="Username" value={`@${profile?.username || 'not set'}`} onClick={() => openModal('username')} />
            <SettingsRow id="settings-plan" icon={Star} label="Plan" value="Free" onClick={() => openModal('plan')} />
          </SettingsSection>

          {/* Privacy */}
          <SettingsSection title="Privacy">
            <SettingsRow
              id="settings-public-profile"
              icon={Globe}
              label="Public Profile"
              toggle={{ value: publicProfile, onToggle: () => handleToggle('is_public', publicProfile, setPublicProfile) }}
            />
            {currentRole === 'photographer' && (
              <SettingsRow
                id="settings-available-bookings"
                icon={Calendar}
                label="Available for Bookings"
                toggle={{ value: availableForBookings, onToggle: () => handleToggle('availability', availableForBookings, setAvailableForBookings) }}
              />
            )}
          </SettingsSection>

          {/* Notifications */}
          <SettingsSection title="Notifications">
            <SettingsRow
              id="settings-push-notifs"
              icon={Bell}
              label="Push Notifications"
              toggle={{ value: pushNotifs, onToggle: () => handleToggle('push_notifs', pushNotifs, setPushNotifs) }}
            />
            <SettingsRow
              id="settings-email-notifs"
              icon={Mail}
              label="Email Notifications"
              toggle={{ value: emailNotifs, onToggle: () => handleToggle('email_notifs', emailNotifs, setEmailNotifs) }}
            />
          </SettingsSection>

          {/* Support */}
          <SettingsSection title="Support">
            <SettingsRow id="settings-help" icon={HelpCircle} label="Help Center" onClick={() => alert('Help Center coming soon!')} />
            <SettingsRow id="settings-privacy-policy" icon={Shield} label="Privacy Policy" onClick={() => openModal('privacy')} />
            <SettingsRow id="settings-terms" icon={FileText} label="Terms of Service" onClick={() => openModal('terms')} />
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
              id="settings-deactivate-account"
              icon={Trash2}
              label="Deactivate Account"
              destructive
              onClick={() => openModal('deactivate')}
            />
          </SettingsSection>

          {/* App version */}
          <div className="text-center pt-8 pb-12">
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-800 shadow-sm">
              <Camera className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2">LensLeague v2.0.0</div>
            <div className="text-[11px] text-zinc-400 font-medium">Designed for Creators • Noble Stature Studios</div>
            <div className="text-[11px] text-zinc-500 font-medium mt-1">A Noble Stature Studios company</div>
          </div>
        </div>
      </main>

      {/* Dynamic Modal */}
      <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {activeModal === 'email' && 'Update Email'}
              {activeModal === 'username' && 'Change Username'}
              {activeModal === 'plan' && 'Upgrade Plan'}
              {activeModal === 'deactivate' && 'Deactivate Account'}
              {activeModal === 'privacy' && 'Privacy Policy'}
              {activeModal === 'terms' && 'Terms of Service'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {activeModal === 'email' && 'Enter your new email address below. You may need to verify it.'}
              {activeModal === 'username' && 'Choose a unique username for your profile.'}
              {activeModal === 'plan' && 'Pro subscriptions are coming soon! Stay tuned.'}
              {activeModal === 'deactivate' && 'Are you sure you want to deactivate your account? Your profile will be hidden from the platform until you log back in.'}
              {activeModal === 'privacy' && 'Your privacy is critically important to us. LensLeague is committed to respecting your privacy regarding any information we may collect while operating our website.'}
              {activeModal === 'terms' && 'By accessing the website at LensLeague, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.'}
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="text-sm font-medium text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              {errorMsg}
            </div>
          )}

          {(activeModal === 'email' || activeModal === 'username') && (
            <div className="py-4">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={activeModal === 'email' ? 'new@email.com' : 'new_username'}
                className="bg-zinc-900 border-zinc-800 text-white shadow-sm"
              />
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" className="border-zinc-800 bg-transparent hover:bg-zinc-900 hover:text-white text-zinc-300" onClick={() => setActiveModal(null)}>
              {activeModal === 'privacy' || activeModal === 'terms' ? 'Close' : 'Cancel'}
            </Button>
            {activeModal !== 'plan' && activeModal !== 'privacy' && activeModal !== 'terms' && (
              <Button 
                variant={activeModal === 'deactivate' ? 'destructive' : 'default'}
                onClick={handleSaveModal} 
                disabled={isLoading}
                className={activeModal === 'deactivate' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-white text-zinc-950 hover:bg-zinc-200 font-bold'}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (activeModal === 'deactivate' ? 'Deactivate' : 'Save')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
