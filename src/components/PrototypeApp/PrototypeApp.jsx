import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Home, Compass, Swords, Trophy, User, Search, Bell, Heart, MessageCircle,
  Bookmark, Upload as UploadIcon, Settings as SettingsIcon, ChevronRight, Crown, TrendingUp, TrendingDown,
  Minus, MapPin, Star, Camera, Flame, Award, ArrowLeft, ArrowRight, X, Check,
  Image as ImageIcon, Tag, Lock, Bell as BellIcon, CreditCard, Shield, HelpCircle,
  LogOut, ChevronDown, Loader2, Sparkles, Trash2, MessageSquare, Calendar as CalendarIcon,
  Send, Paperclip, UserCheck, UserPlus, Clock, Video, MapPin as PinIcon
} from "lucide-react";

import { useApp } from "../../context/AppContext";

/* ------------------------------------------------------------------
   LensLeague — Web Prototype with Live Supabase Backend
   Design tokens pulled directly from blueprint Section 4.
------------------------------------------------------------------- */

const img = (seed, w = 800, h = 1000) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

const PHOTOGRAPHERS = [
  { id: 1, name: "Kwame Asante", handle: "@kwame.wild", category: "Landscape", location: "Volta Region, GH", rank: 1, points: 11875, rating: 5.0, avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop", cover: "https://images.unsplash.com/photo-1511497584788-87676104235f?w=1200&h=500&fit=crop" },
  { id: 2, name: "Naledi Osei", handle: "@naledi.frames", category: "Nature", location: "Eastern Region, GH", rank: 2, points: 9902, rating: 4.9, avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop", cover: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&h=500&fit=crop" },
  { id: 3, name: "Kojo Mensah", handle: "@kojo.streets", category: "Landscape", location: "Hohoe, GH", rank: 3, points: 8420, rating: 4.8, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop", cover: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1200&h=500&fit=crop" },
  { id: 4, name: "Abena Serwaa", handle: "@abena.canopy", category: "Wildlife", location: "Kakum, GH", rank: 4, points: 8010, rating: 4.8, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop", cover: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1200&h=500&fit=crop" },
  { id: 5, name: "Adaeze Nwosu", handle: "@adaeze.light", category: "Wedding", location: "Lagos, NG", rank: 5, points: 7340, rating: 4.75, avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop", cover: img("adaeze-c", 1200, 500) },
  { id: 6, name: "Tariq Farouk", handle: "@tariq.editorial", category: "Editorial", location: "Cairo, EG", rank: 6, points: 6110, rating: 4.7, avatar: img("tariq-a", 200, 200), cover: img("tariq-c", 1200, 500) },
];

const FEED = [
  { id: "f1", photographer: PHOTOGRAPHERS[0], image: "https://images.unsplash.com/photo-1511497584788-87676104235f?w=900&h=1125&fit=crop", caption: "Mist rising over Mount Afadja at dawn. The highest peak in Ghana surrounded by lush tropical forest and morning dew. 🇬🇭⛰️ #GhanaNature #MountAfadjato", category: "Landscape", likes: 1420, comments: 84 },
  { id: "f2", photographer: PHOTOGRAPHERS[1], image: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&h=1125&fit=crop", caption: "Ancient canopy towering over Aburi Botanical Gardens. Over a century of roots, branches, and unfiltered sunlight filtering through the trees. 🌳✨ #Ghana #Trees #Aburi", category: "Nature", likes: 980, comments: 52 },
  { id: "f3", photographer: PHOTOGRAPHERS[2], image: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=900&h=1200&fit=crop", caption: "The thunder of Wli Waterfalls cascading down 80 meters into the pristine river below. Pure nature in Agumatsa Wildlife Sanctuary. 🌊🌿 #WliFalls #GhanaNature", category: "Landscape", likes: 1890, comments: 112 },
  { id: "f4", photographer: PHOTOGRAPHERS[3], image: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=900&h=675&fit=crop", caption: "Walking above the clouds on the Kakum canopy walkway. The breathtaking biodiversity of the Ghanaian rainforest untouched and thriving. 🦜🌴 #Kakum #Rainforest #Ghana", category: "Wildlife", likes: 2110, comments: 156 },
  { id: "f5", photographer: PHOTOGRAPHERS[4], image: img("feed3", 900, 1200), caption: "First look, before the noise starts.", category: "Wedding", likes: 2110, comments: 156 },
];

const BATTLES = [
  { id: "b1", a: { photo: img("battle1a", 700, 900), photographer: PHOTOGRAPHERS[3] }, b: { photo: img("battle1b", 700, 900), photographer: PHOTOGRAPHERS[4] }, votesA: 341, votesB: 298 },
  { id: "b2", a: { photo: img("battle2a", 700, 900), photographer: PHOTOGRAPHERS[5] }, b: { photo: img("battle2b", 700, 900), photographer: PHOTOGRAPHERS[0] }, votesA: 512, votesB: 487 },
  { id: "b3", a: { photo: img("battle3a", 700, 900), photographer: PHOTOGRAPHERS[1] }, b: { photo: img("battle3b", 700, 900), photographer: PHOTOGRAPHERS[2] }, votesA: 203, votesB: 260 },
];

const LEADERBOARD = [...PHOTOGRAPHERS].sort((a, b) => a.rank - b.rank).map((p, i) => ({
  ...p, trend: i % 3 === 0 ? "up" : i % 3 === 1 ? "down" : "flat", delta: (i % 5) + 1,
}));

const rankColor = (rank) =>
  rank === 1 ? "#FFC24B" : rank === 2 ? "#C8CCD4" : rank === 3 ? "#D98C5F" : "#A1A1AA";

/* ---------------------------- Small UI atoms ---------------------------- */

function StatPill({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1C1C22] border border-[#26262E] px-3 py-1.5 text-[13px] text-[#A1A1AA]">
      <Icon size={13} />
      {label}
    </span>
  );
}

function RankBadge({ rank, size = 32 }) {
  const color = rankColor(rank);
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold shrink-0"
      style={{
        width: size, height: size, fontSize: size * 0.4,
        color: rank <= 3 ? "#08080A" : "#F5F5F7",
        background: rank <= 3 ? color : "#26262B",
        border: rank <= 3 ? "none" : `1px solid #3A3A40`,
      }}
    >
      {rank === 1 ? <Crown size={size * 0.5} /> : rank}
    </div>
  );
}

function TrendArrow({ trend, delta }) {
  if (trend === "up") return <span className="flex items-center gap-0.5 text-[#34D399] text-xs font-semibold"><TrendingUp size={13} />{delta}</span>;
  if (trend === "down") return <span className="flex items-center gap-0.5 text-[#F87171] text-xs font-semibold"><TrendingDown size={13} />{delta}</span>;
  return <span className="flex items-center gap-0.5 text-[#6E6E76] text-xs font-semibold"><Minus size={13} /></span>;
}

function CategoryChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium border transition-colors"
      style={active
        ? { background: "#FFB020", borderColor: "#FFB020", color: "#08080A" }
        : { background: "transparent", borderColor: "#26262E", color: "#A1A1AA" }}
    >
      {label}
    </button>
  );
}

function PrimaryButton({ children, onClick, full, className = "", disabled = false }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`rounded-xl font-semibold px-5 py-3 text-[14px] transition-transform active:scale-[0.97] ${full ? "w-full" : ""} ${className}`}
      style={{
        background: disabled ? "#26262E" : "#FFB020",
        color: disabled ? "#6E6E76" : "#08080A",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border border-[#3A3A40] text-[#F5F5F7] font-medium px-5 py-3 text-[14px] transition-colors hover:bg-[#1C1C22] ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------- Sidebar -------------------------------- */

function Sidebar({ screen, setScreen, unreadMessages = 3 }) {
  const { currentUser } = useApp();
  const items = [
    { key: "home", label: "Home", icon: Home },
    { key: "discover", label: "Discover", icon: Compass },
    { key: "compete", label: "Compete", icon: Swords },
    { key: "messages", label: "Messages", icon: MessageSquare, badge: unreadMessages },
    { key: "leaderboard", label: "Leaderboard", icon: Trophy },
    { key: "profile", label: "Profile", icon: User },
  ];
  return (
    <div className="w-[240px] shrink-0 h-full border-r border-[#1C1C22] flex flex-col py-6 px-4">
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FFB020] to-[#00E5FF] flex items-center justify-center">
          <Camera size={16} color="#08080A" strokeWidth={2.5} />
        </div>
        <span className="text-[#F5F5F7] font-bold text-[17px] tracking-tight">LensLeague</span>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map(({ key, label, icon: Icon, badge }) => {
          const active = screen === key;
          return (
            <button
              key={key}
              onClick={() => setScreen(key)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors relative"
              style={{
                background: active ? "#1C1C22" : "transparent",
                color: active ? "#F5F5F7" : "#A1A1AA",
              }}
            >
              <Icon size={19} strokeWidth={active ? 2.4 : 2} color={active ? "#FFB020" : "#A1A1AA"} />
              {label}
              {!!badge && (
                <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-[#FFB020] text-[#08080A] text-[10px] font-bold flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <button
        onClick={() => setScreen("upload")}
        className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#FFB020] text-[#08080A] font-semibold py-2.5 text-[14px] hover:brightness-110 transition"
      >
        <UploadIcon size={16} /> Upload
      </button>

      <div className="mt-auto">
        <button
          onClick={() => setScreen("settings")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium text-[#A1A1AA] hover:text-[#F5F5F7] transition-colors"
        >
          <SettingsIcon size={18} /> Settings
        </button>
        <div className="flex items-center gap-3 px-3 py-3 mt-1 cursor-pointer" onClick={() => setScreen("profile")}>
          {(() => {
            const ava = currentUser?.avatar || currentUser?.avatar_url || currentUser?.user_metadata?.avatar_url;
            const isDice = ava && typeof ava === 'string' && ava.includes('dicebear');
            const showAva = (!ava || isDice) ? null : ava;
            return showAva ? (
              <img src={showAva} className="w-9 h-9 rounded-full object-cover border border-[#26262E]" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#1C1C22] border border-[#26262E] flex items-center justify-center text-[#FFB020] font-bold text-[13px]">
                {(currentUser?.name || currentUser?.display_name || "M")[0].toUpperCase()}
              </div>
            );
          })()}
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-[#F5F5F7] truncate">{currentUser?.name || currentUser?.display_name || "Mohammed Yussif"}</div>
            <div className="text-[11px] text-[#6E6E76] truncate">@{currentUser?.username || "moyu"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopBar({ title, onOpenAuth }) {
  const { currentUser, logoutUser } = useApp();

  return (
    <div className="flex items-center justify-between px-8 py-5 border-b border-[#1C1C22] shrink-0 bg-[#08080A]">
      <h1 className="text-[22px] font-bold text-[#F5F5F7] tracking-tight">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-[#121216] border border-[#26262E] rounded-full px-4 py-2 w-[280px]">
          <Search size={15} color="#6E6E76" />
          <input placeholder="Search photographers, tags..." className="bg-transparent outline-none text-[13px] text-[#F5F5F7] placeholder-[#6E6E76] w-full" />
        </div>

        {currentUser ? (
          <div className="flex items-center gap-3">
            <button className="relative w-9 h-9 rounded-full bg-[#121216] border border-[#26262E] flex items-center justify-center hover:border-[#3A3A40]">
              <Bell size={16} color="#A1A1AA" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FFB020]" />
            </button>
            <button
              onClick={logoutUser}
              className="text-[12px] font-semibold text-[#F87171] bg-[#F87171]/10 px-3 py-1.5 rounded-full hover:bg-[#F87171]/20 transition-all"
            >
              Log out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenAuth?.('login')}
              className="px-4 py-1.5 rounded-full text-[13px] font-semibold text-[#A1A1AA] hover:text-white"
            >
              Log in
            </button>
            <button
              onClick={() => onOpenAuth?.('signup')}
              className="px-4 py-1.5 rounded-full text-[13px] font-semibold text-[#08080A] bg-[#FFB020] hover:brightness-110 shadow-[0_2px_10px_rgba(255,176,32,0.3)]"
            >
              Sign up
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Auth Modal -------------------------------- */

function AuthModal({ mode, initialRole = 'photographer', onClose, onSuccess }) {
  const { signUpUser, loginUser, checkUsernameAvailable } = useApp();
  const [authMode, setAuthMode] = useState(mode); // 'login' | 'signup'
  const [role, setRole] = useState(initialRole); // 'photographer' | 'client'
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('idle'); // 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('Accra, Ghana');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Debounced username availability checker
  useEffect(() => {
    if (authMode !== 'signup') return;
    const cleanUsername = username.toLowerCase().trim();
    if (!cleanUsername) {
      setUsernameStatus('idle');
      return;
    }
    const validRegex = /^[a-z0-9_.]{3,30}$/;
    if (!validRegex.test(cleanUsername)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      const available = await checkUsernameAvailable(cleanUsername);
      setUsernameStatus(available ? 'available' : 'taken');
    }, 400);
    return () => clearTimeout(timer);
  }, [username, authMode, checkUsernameAvailable]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (authMode === 'signup') {
      const cleanUsername = username.toLowerCase().trim();
      if (!name || !username || !email || !password) {
        setErrorMsg('Please fill out all required fields.');
        return;
      }
      if (usernameStatus === 'invalid') {
        setErrorMsg('Username must be 3-30 characters using lowercase letters, numbers, underscores, or dots.');
        return;
      }
      if (usernameStatus === 'taken') {
        setErrorMsg('Username is already taken. Please choose another.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }

      setLoading(true);
      const res = await signUpUser({ name, email, password, username: cleanUsername, role, location });
      setLoading(false);
      if (res.success) {
        onSuccess?.();
        onClose();
      } else {
        setErrorMsg(res.error || 'Sign up failed.');
      }
    } else {
      if (!email || !password) {
        setErrorMsg('Please enter email and password.');
        return;
      }
      setLoading(true);
      const res = await loginUser({ email, password });
      setLoading(false);
      if (res.success) {
        onSuccess?.();
        onClose();
      } else {
        setErrorMsg(res.error || 'Invalid email or password.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md bg-[#121216] border border-[#26262E] rounded-2xl p-6 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white">
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FFB020] to-[#00E5FF] flex items-center justify-center">
            <Camera size={16} color="#08080A" strokeWidth={2.5} />
          </div>
          <span className="text-[#F5F5F7] font-bold text-[18px]">LensLeague</span>
        </div>

        <h2 className="text-[20px] font-bold text-[#F5F5F7] mb-1">
          {authMode === 'signup' ? `Create your ${role} account` : 'Welcome back'}
        </h2>
        <p className="text-[13px] text-[#A1A1AA] mb-6">
          {authMode === 'signup' ? 'Join the home for photographers and clients.' : 'Log in to your LensLeague profile.'}
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#F87171]/10 border border-[#F87171]/30 text-[#F87171] text-[13px]">
            {errorMsg}
          </div>
        )}

        {authMode === 'signup' && (
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => setRole('photographer')}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-all ${role === 'photographer' ? 'bg-[#FFB020] border-[#FFB020] text-[#08080A]' : 'bg-[#1C1C22] border-[#26262E] text-[#A1A1AA]'}`}
            >
              📷 Photographer
            </button>
            <button
              type="button"
              onClick={() => setRole('client')}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-all ${role === 'client' ? 'bg-[#FFB020] border-[#FFB020] text-[#08080A]' : 'bg-[#1C1C22] border-[#26262E] text-[#A1A1AA]'}`}
            >
              💼 Client
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {authMode === 'signup' && (
            <>
              <div>
                <label className="text-[12px] text-[#A1A1AA] mb-1 block">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kofi Mensah"
                  className="w-full bg-[#1C1C22] border border-[#26262E] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none focus:border-[#FFB020]"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[12px] text-[#A1A1AA] mb-1 block">Username</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="e.g. kofi_snaps"
                    className="w-full bg-[#1C1C22] border border-[#26262E] rounded-xl pl-4 pr-10 py-2.5 text-[14px] text-white outline-none focus:border-[#FFB020]"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                  />
                  <div className="absolute right-3">
                    {usernameStatus === 'checking' && <Loader2 size={16} className="animate-spin text-[#A1A1AA]" />}
                    {usernameStatus === 'available' && <Check size={16} className="text-[#34D399]" />}
                    {usernameStatus === 'taken' && <X size={16} className="text-[#F87171]" />}
                  </div>
                </div>
                {usernameStatus === 'invalid' && (
                  <p className="text-[11px] text-[#F87171] mt-1">3-30 chars, lowercase, numbers, underscores, or dots</p>
                )}
                {usernameStatus === 'taken' && (
                  <p className="text-[11px] text-[#F87171] mt-1">Username is already taken</p>
                )}
                {usernameStatus === 'available' && (
                  <p className="text-[11px] text-[#34D399] mt-1">Username is available!</p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="text-[12px] text-[#A1A1AA] mb-1 block">Email address</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="w-full bg-[#1C1C22] border border-[#26262E] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none focus:border-[#FFB020]"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[12px] text-[#A1A1AA] mb-1 block">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              className="w-full bg-[#1C1C22] border border-[#26262E] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none focus:border-[#FFB020]"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {authMode === 'signup' && (
            <div>
              <label className="text-[12px] text-[#A1A1AA] mb-1 block">Location</label>
              <input
                type="text"
                placeholder="e.g. Accra, Ghana"
                className="w-full bg-[#1C1C22] border border-[#26262E] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none focus:border-[#FFB020]"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>
          )}

          <PrimaryButton full disabled={loading} className="mt-2">
            {loading ? 'Authenticating...' : authMode === 'signup' ? `Sign Up as ${role === 'client' ? 'Client' : 'Photographer'}` : 'Log In'}
          </PrimaryButton>
        </form>

        <div className="mt-6 text-center text-[13px] text-[#A1A1AA]">
          {authMode === 'signup' ? (
            <>Already have an account? <button onClick={() => setAuthMode('login')} className="text-[#FFB020] font-semibold hover:underline">Log in</button></>
          ) : (
            <>Don't have an account? <button onClick={() => setAuthMode('signup')} className="text-[#FFB020] font-semibold hover:underline">Sign up</button></>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Landing -------------------------------- */

function Landing({ enter }) {
  const [authConfig, setAuthConfig] = useState(null); // { mode: 'login'|'signup', role: 'photographer'|'client' }

  return (
    <div className="w-full h-full overflow-y-auto bg-[#08080A] text-white font-sans selection:bg-[#FFB020] selection:text-black">

      {/* Top Header Nav — Alpine Style */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 bg-[#08080A]/60 backdrop-blur-2xl border-b border-white/10 transition-all">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => setAuthConfig({ mode: 'signup', role: 'photographer' })}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFB020] to-[#00E5FF] flex items-center justify-center shadow-[0_0_15px_rgba(255,176,32,0.3)] group-hover:scale-105 transition-transform">
              <Camera size={18} color="#08080A" strokeWidth={2.5} />
            </div>
            <span className="text-[#F5F5F7] font-black text-[20px] tracking-tight">LensLeague</span>
          </div>

          <div className="hidden lg:flex items-center gap-8 text-[14px] font-medium text-[#D4D4D8]">
            <button onClick={() => setAuthConfig({ mode: 'signup', role: 'photographer' })} className="hover:text-white transition-colors flex items-center">
              <span>Photographers</span>
              <span className="text-[11px] text-[#FFB020] font-mono ml-1 font-bold">⁽¹·⁴ᵏ⁾</span>
            </button>
            <button onClick={() => setAuthConfig({ mode: 'signup', role: 'photographer' })} className="hover:text-white transition-colors flex items-center">
              <span>Challenges</span>
              <span className="text-[11px] text-[#FFB020] font-mono ml-1 font-bold">⁽²⁴⁾</span>
            </button>
            <button onClick={() => setAuthConfig({ mode: 'signup', role: 'client' })} className="hover:text-white transition-colors flex items-center">
              <span>Leaderboard</span>
              <span className="text-[11px] text-[#FFB020] font-mono ml-1 font-bold">⁽¹⁰⁰⁾</span>
            </button>
            <button onClick={() => setAuthConfig({ mode: 'signup', role: 'client' })} className="hover:text-white transition-colors text-[#00E5FF] font-semibold">
              Hire a Pro
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setAuthConfig({ mode: 'login', role: 'photographer' })}
            className="px-5 py-2 text-[14px] font-medium text-[#D4D4D8] hover:text-white transition-colors"
          >
            Open
          </button>
          <button
            onClick={() => setAuthConfig({ mode: 'signup', role: 'photographer' })}
            className="px-6 py-2.5 rounded-full text-[14px] font-bold text-[#08080A] bg-white hover:bg-[#F5F5F7] shadow-[0_4px_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all"
          >
            Sign up
          </button>
        </div>
      </nav>

      {/* Hero Section — Alpine Style Full-Bleed Photo with Glassmorphism Card */}
      <div className="relative min-h-[780px] w-full pt-24 overflow-hidden flex items-center justify-center">
        {/* Full-bleed photography background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&q=85" 
            alt="Alpine Hero" 
            className="w-full h-full object-cover object-center scale-105 animate-[pulse_15s_ease-in-out_infinite]"
          />
          {/* Subtle directional gradient overlay so typography pops */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#08080A] via-[#08080A]/75 to-[#08080A]/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08080A] via-transparent to-[#08080A]/60" />
        </div>

        {/* Hero Content — Split Columns */}
        <div className="relative z-10 max-w-7xl w-full mx-auto px-8 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Typography Column */}
          <div className="lg:col-span-7 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFB020]/10 border border-[#FFB020]/30 text-[#FFB020] text-[11px] font-mono font-bold tracking-widest uppercase mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFB020] animate-ping" />
              01. Premier League for Photography
            </div>

            <h1 className="text-white font-black text-[54px] md:text-[66px] leading-[1.04] tracking-tight mb-6">
              Access Bright<br />
              <span className="bg-gradient-to-r from-[#FFB020] via-[#FFC24D] to-[#00E5FF] bg-clip-text text-transparent">
                Photography Journey.
              </span>
            </h1>

            <p className="text-[#D4D4D8] text-[16px] md:text-[18px] leading-relaxed max-w-xl mb-10 font-normal">
              <span className="text-[#FFB020] font-mono font-bold mr-2">02.</span>
              Journey where raw visual talent meets head-to-head competition. LensLeague is your gateway to the world's most breathtaking photography, where every turn is a new discovery and every shot has a scoreboard.
            </p>

            <div className="flex flex-wrap items-center gap-5">
              <button
                onClick={() => setAuthConfig({ mode: 'signup', role: 'photographer' })}
                className="inline-flex items-center gap-3 bg-[#121216] border border-white/20 hover:border-[#FFB020] text-white px-8 py-4 rounded-full font-bold text-[15px] shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:bg-[#1C1C22] transition-all group"
              >
                <span>Get to know</span>
                <span className="text-[#FFB020] font-mono text-[18px] group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform">↗</span>
              </button>
              
              <div className="text-[13px] text-[#A1A1AA] flex items-center gap-2 pl-2">
                <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                <span>⚡ 24,810 votes live right now</span>
              </div>
            </div>

            {/* Sub-nav indicator pill below CTA */}
            <div className="mt-16 inline-flex items-center gap-6 text-[13px] text-[#A1A1AA] border-b border-white/10 pb-2">
              <span className="text-white font-mono font-bold">02</span>
              <span className="text-[#F5F5F7] font-medium">LensLeague Adventure</span>
              <span className="text-[#FFB020] font-mono text-[11px]">◉ Live Leaderboard</span>
            </div>
          </div>

          {/* Right Column: Signature Glass Card Widget (Alpine Reference) */}
          <div className="lg:col-span-5 flex justify-end">
            <div className="w-full max-w-[440px] rounded-[32px] bg-[#121216]/70 backdrop-blur-2xl border border-white/15 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.8)] transition-all hover:border-[#FFB020]/50 relative group">
              
              {/* Card top bar */}
              <div className="flex items-center justify-between text-[13px] font-medium text-[#A1A1AA] pb-4 mb-5 border-b border-white/10">
                <div className="flex items-center gap-5">
                  <span className="w-6 h-0.5 bg-white/40" />
                  <span className="text-white font-bold">Sign in</span>
                  <span className="hover:text-white cursor-pointer transition-colors" onClick={() => setAuthConfig({ mode: 'signup', role: 'photographer' })}>Open Account</span>
                  <span className="hover:text-white cursor-pointer transition-colors" onClick={() => setAuthConfig({ mode: 'signup', role: 'client' })}>Explore</span>
                </div>
              </div>

              {/* Card Title Header */}
              <div className="text-left mb-6">
                <div className="text-[12px] font-mono font-semibold text-[#FFB020] mb-1">02 · Tell us about yourself</div>
                <h3 className="text-white text-[26px] font-extrabold tracking-tight mb-1">Curated ranking list</h3>
                <p className="text-[#A1A1AA] text-[13px]">World's most breathtaking photography creators</p>
              </div>

              {/* Inner White/Light Glass Pill Card */}
              <div className="rounded-[24px] bg-[#1C1C22]/90 border border-white/10 p-5 shadow-2xl transition-transform group-hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&q=80" className="w-16 h-16 rounded-full object-cover border-2 border-[#FFB020] shadow-md" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FFB020] flex items-center justify-center text-[#08080A] text-[12px] font-extrabold shadow-lg">
                        🛡️
                      </div>
                    </div>
                    <div className="text-left">
                      <h4 className="text-[19px] font-bold text-white leading-tight">435, Alps</h4>
                      <p className="text-[12px] text-[#A1A1AA] mt-0.5">Mountain · Photography</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[12px] text-[#A1A1AA] flex items-center justify-end gap-1 font-medium">
                      <span className="text-[#FFB020]">📍</span> Alps, Europe
                    </div>
                    <div className="text-[34px] font-black text-white tracking-tighter leading-none mt-1">4.8</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-[13px] font-bold text-white">★ 29k Rates</div>
                    <div className="text-[11px] text-[#6E6E76]">Out of 142 categories</div>
                  </div>
                  
                  <button
                    onClick={() => setAuthConfig({ mode: 'signup', role: 'client' })}
                    className="px-5 py-2 rounded-xl bg-[#08080A] hover:bg-black border border-[#26262E] text-white text-[13px] font-bold inline-flex items-center gap-2 shadow-lg transition-colors"
                  >
                    <span>🗺️ Map</span>
                  </button>
                </div>
              </div>

              {/* Decorative floating chat/icon button at bottom right */}
              <div className="absolute -right-4 -bottom-4 w-12 h-12 rounded-full bg-[#08080A] border border-white/20 flex items-center justify-center text-white shadow-2xl cursor-pointer hover:scale-110 transition-transform">
                💬
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Feature Value Props (Clean & Modern) ── */}
      <div className="max-w-6xl mx-auto px-8 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-[32px] font-extrabold text-white tracking-tight mb-4">Why Top Photographers Choose LensLeague</h2>
          <p className="text-[#A1A1AA] text-[16px]">Everything you need to compete, rank up globally, and get booked by high-paying clients.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: UploadIcon, title: "01. Upload & Showcase", body: "Post your highest resolution work to a clean, full-bleed portfolio built specifically for photography, not compressed squares." },
            { icon: Swords, title: "02. Head-to-Head Battles", body: "Enter live 1v1 battles judged by the global photography community. Every vote moves your real-time ranking and Elo score." },
            { icon: Trophy, title: "03. Get Discovered & Hired", body: "Clients search directly by leaderboard rank, verified rating, and category. Top-ranked work gets found and booked first." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-[24px] border border-white/10 bg-[#121216]/60 p-8 hover:border-[#FFB020]/50 transition-all group cursor-pointer hover:-translate-y-1.5 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-[#1C1C22] border border-white/10 flex items-center justify-center mb-6 group-hover:bg-[#FFB020]/15 group-hover:border-[#FFB020]/40 transition-all">
                <Icon size={26} color="#FFB020" />
              </div>
              <h3 className="text-white font-bold text-[20px] mb-3">{title}</h3>
              <p className="text-[#A1A1AA] text-[14px] leading-relaxed font-light">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top Ranked Teaser ── */}
      <div className="max-w-6xl mx-auto px-8 pb-28">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-[12px] font-mono font-bold text-[#FFB020] uppercase tracking-wider mb-1">Live Standings</div>
            <h2 className="text-white font-extrabold text-[28px] tracking-tight">This week's top ranked</h2>
          </div>
          <button onClick={() => setAuthConfig({ mode: 'signup', role: 'client' })} className="text-[#00E5FF] hover:underline text-[14px] font-semibold flex items-center gap-1">
            <span>View Full Leaderboard</span>
            <span>→</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {LEADERBOARD.slice(0, 3).map((p) => (
            <div key={p.id} onClick={() => setAuthConfig({ mode: 'signup', role: 'photographer' })} className="rounded-[20px] border border-white/10 bg-[#121216]/80 p-6 flex items-center gap-5 hover:border-[#FFB020]/40 cursor-pointer transition-all hover:scale-[1.02] shadow-lg">
              <RankBadge rank={p.rank} size={44} />
              <img src={p.avatar} className="w-14 h-14 rounded-full object-cover border-2 border-white/20" />
              <div className="min-w-0 flex-1">
                <div className="text-white font-bold text-[16px] truncate">{p.name}</div>
                <div className="text-[#FFB020] text-[13px] font-mono font-semibold mt-0.5">{p.pts} pts</div>
                <div className="text-[#6E6E76] text-[12px] truncate mt-0.5">{p.category} · {p.location}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Render Auth Modal */}
      {authConfig && (
        <AuthModal
          mode={authConfig.mode}
          initialRole={authConfig.role || 'photographer'}
          onClose={() => setAuthConfig(null)}
          onSuccess={() => {
            setAuthConfig(null);
            enter();
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------- Home Feed -------------------------------- */

function PhotoCard({ post }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const photographer = post.photographer || {
    name: post.ownerName || post.owner_name || "Photographer",
    avatar: post.ownerAvatar || post.owner_avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
    location: post.location || "Ghana"
  };
  const imageUrl = post.image || post.url || post.image_url;
  const captionText = post.caption || "";
  const likesCount = post.likes || post.like_count || 0;
  const commentsCount = post.comments || post.comment_count || 0;
  const categoryName = post.category || "Photography";

  return (
    <div className="rounded-2xl overflow-hidden border border-[#1C1C22] bg-[#121216] mb-6">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={photographer.avatar} className="w-9 h-9 rounded-full object-cover" />
          <div>
            <div className="text-[13px] font-semibold text-[#F5F5F7]">{photographer.name}</div>
            <div className="text-[11px] text-[#6E6E76]">{photographer.location}</div>
          </div>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#A1A1AA] bg-[#1C1C22] px-2.5 py-1 rounded-full">{categoryName}</span>
      </div>
      <div className="relative">
        <img src={imageUrl} className="w-full max-h-[560px] object-cover" onDoubleClick={() => setLiked(true)} />
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button onClick={() => setLiked(!liked)} className="flex items-center gap-1.5">
            <Heart size={19} color={liked ? "#FFB020" : "#A1A1AA"} fill={liked ? "#FFB020" : "none"} />
            <span className="text-[13px] text-[#A1A1AA]">{likesCount + (liked ? 1 : 0)}</span>
          </button>
          <button className="flex items-center gap-1.5">
            <MessageCircle size={19} color="#A1A1AA" />
            <span className="text-[13px] text-[#A1A1AA]">{commentsCount}</span>
          </button>
        </div>
        <button onClick={() => setSaved(!saved)}>
          <Bookmark size={19} color={saved ? "#00E5FF" : "#A1A1AA"} fill={saved ? "#00E5FF" : "none"} />
        </button>
      </div>
      <p className="px-4 pb-4 text-[13px] text-[#D4D4D8] leading-relaxed">{captionText}</p>
    </div>
  );
}

function BattleSpotlight({ battle, onClick }) {
  return (
    <button onClick={onClick} className="w-full rounded-2xl border border-[#26262E] bg-gradient-to-r from-[#1C1C22] to-[#121216] p-4 mb-6 flex items-center gap-4 text-left hover:border-[#3A3A40] transition-colors">
      <div className="flex -space-x-3">
        <img src={battle.a.photo} className="w-14 h-14 rounded-xl object-cover border-2 border-[#121216]" />
        <img src={battle.b.photo} className="w-14 h-14 rounded-xl object-cover border-2 border-[#121216]" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5 text-[#FFB020] text-[12px] font-semibold uppercase tracking-wide mb-0.5">
          <Flame size={13} /> Battle Spotlight
        </div>
        <div className="text-[14px] text-[#F5F5F7] font-medium">{battle.a.photographer.name} vs {battle.b.photographer.name}</div>
      </div>
      <ChevronRight size={18} color="#6E6E76" />
    </button>
  );
}

function HomeFeed({ goToCompete }) {
  const [tab, setTab] = useState("forYou");
  const { photos } = useApp();

  const allPosts = useMemo(() => {
    const dynamicPosts = (photos || []).map(p => ({
      ...p,
      image: p.url || p.image || p.image_url,
      photographer: p.photographer || {
        name: p.ownerName || p.owner_name || "Photographer",
        avatar: p.ownerAvatar || p.owner_avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
        location: p.location || "Ghana"
      }
    }));
    return [...dynamicPosts, ...FEED];
  }, [photos]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 overflow-y-auto px-8 py-6 max-w-[640px] mx-auto w-full">
        <div className="flex gap-2 mb-6">
          {["forYou", "following"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors"
              style={{ background: tab === t ? "#FFB020" : "#1C1C22", color: tab === t ? "#08080A" : "#A1A1AA" }}
            >
              {t === "forYou" ? "For You" : "Following"}
            </button>
          ))}
        </div>
        {allPosts.map((post, idx) => (
          <React.Fragment key={post.id || idx}>
            <PhotoCard post={post} />
            {idx === 0 && BATTLES[0] && (
              <BattleSpotlight battle={BATTLES[0]} onClick={goToCompete} />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="w-[300px] shrink-0 border-l border-[#1C1C22] p-6 hidden xl:block overflow-y-auto">
        <h3 className="text-[13px] font-semibold text-[#F5F5F7] mb-4">Trending Photographers</h3>
        <div className="flex flex-col gap-3 mb-8">
          {PHOTOGRAPHERS.slice(0, 4).map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <img src={p.avatar} className="w-9 h-9 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[#F5F5F7] font-medium truncate">{p.name}</div>
                <div className="text-[11px] text-[#6E6E76]">{p.category}</div>
              </div>
              <RankBadge rank={p.rank} size={24} />
            </div>
          ))}
        </div>
        <h3 className="text-[13px] font-semibold text-[#F5F5F7] mb-4">Active Challenges</h3>
        <div className="rounded-xl border border-[#1C1C22] bg-[#121216] p-4">
          <div className="text-[13px] font-semibold text-[#F5F5F7] mb-1">Golden Hour Portraits</div>
          <div className="text-[11px] text-[#6E6E76] mb-3">Ends in 2d 14h · 412 entries</div>
          <div className="h-1.5 rounded-full bg-[#26262B] overflow-hidden">
            <div className="h-full bg-[#FFB020]" style={{ width: "64%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Discover -------------------------------- */

function Discover() {
  const [cat, setCat] = useState("All");
  const cats = ["All", "Portrait", "Street", "Wedding", "Editorial", "Nature", "Product"];
  const tiles = Array.from({ length: 14 }).map((_, i) => ({
    id: i,
    img: img(`disc${i}`, 500, 400 + (i % 4) * 130),
    photographer: PHOTOGRAPHERS[i % PHOTOGRAPHERS.length],
  }));
  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
        {cats.map((c) => <CategoryChip key={c} label={c} active={cat === c} onClick={() => setCat(c)} />)}
      </div>
      <div className="columns-4 gap-4 [column-fill:_balance]">
        {tiles.map((t) => (
          <div key={t.id} className="mb-4 break-inside-avoid rounded-xl overflow-hidden border border-[#1C1C22] relative group cursor-pointer">
            <img src={t.img} className="w-full object-cover block" />
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent flex items-center gap-2">
              <img src={t.photographer.avatar} className="w-6 h-6 rounded-full object-cover" />
              <span className="text-[11px] text-white font-medium">{t.photographer.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- Compete -------------------------------- */

function Compete() {
  const [idx, setIdx] = useState(0);
  const [voted, setVoted] = useState(null);
  const [count, setCount] = useState(14);
  const battle = BATTLES[idx % BATTLES.length];

  const vote = (side) => {
    if (voted) return;
    setVoted(side);
    setCount((c) => c + 1);
    setTimeout(() => {
      setVoted(null);
      setIdx((i) => i + 1);
    }, 900);
  };

  const totalVotes = battle.votesA + battle.votesB + (voted === "a" ? 1 : 0) + (voted === "b" ? 1 : 0);
  const pctA = Math.round(((battle.votesA + (voted === "a" ? 1 : 0)) / totalVotes) * 100);
  const pctB = 100 - pctA;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full border-2 border-[#FFB020] flex items-center justify-center text-[12px] font-bold text-[#F5F5F7]">
          {count}
        </div>
        <div>
          <div className="text-[13px] font-semibold text-[#F5F5F7]">Votes today</div>
          <div className="text-[11px] text-[#6E6E76]">Keep going — every vote sharpens the rankings</div>
        </div>
      </div>

      <div className="relative flex items-stretch gap-0 rounded-2xl overflow-hidden border border-[#26262E] max-w-[720px] w-full" style={{ height: 460 }}>
        {["a", "b"].map((side) => {
          const data = battle[side];
          const isVoted = voted === side;
          const isLoser = voted && voted !== side;
          return (
            <button
              key={side}
              onClick={() => vote(side)}
              className="relative flex-1 overflow-hidden transition-all duration-300"
              style={{
                filter: isLoser ? "brightness(0.4) grayscale(0.3)" : "none",
                boxShadow: isVoted ? `0 0 40px ${side === "a" ? "#FFB020" : "#00E5FF"}55 inset` : "none",
              }}
            >
              <img src={data.photo} className="w-full h-full object-cover transition-transform duration-300" style={{ transform: isVoted ? "scale(1.03)" : "scale(1)" }} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4">
                <div className="flex items-center gap-2 mb-2">
                  <img src={data.photographer.avatar} className="w-7 h-7 rounded-full object-cover" />
                  <span className="text-[12px] text-white font-medium">{data.photographer.name}</span>
                </div>
                {voted && (
                  <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${side === "a" ? pctA : pctB}%`, background: side === "a" ? "#FFB020" : "#00E5FF" }}
                    />
                  </div>
                )}
                {voted && <div className="text-[11px] text-white/80 mt-1">{side === "a" ? pctA : pctB}%</div>}
              </div>
              {isVoted && (
                <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#34D399] flex items-center justify-center">
                  <Check size={14} color="#08080A" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#08080A] border border-[#3A3A40] flex items-center justify-center z-10">
          <span className="text-[12px] font-bold text-[#F5F5F7]">VS</span>
        </div>
      </div>

      <button
        onClick={() => setIdx((i) => i + 1)}
        className="mt-6 text-[13px] text-[#6E6E76] hover:text-[#A1A1AA] transition-colors"
      >
        Skip this one →
      </button>
    </div>
  );
}

/* -------------------------------- Leaderboard -------------------------------- */

function Leaderboard() {
  const [scope, setScope] = useState("Global");
  const me = { rank: 142, name: "You", trend: "up", delta: 12 };
  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 max-w-3xl mx-auto w-full">
      <div className="flex gap-2 mb-6">
        {["Global", "Country", "Category"].map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className="px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors"
            style={{ background: scope === s ? "#FFB020" : "#1C1C22", color: scope === s ? "#08080A" : "#A1A1AA" }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[#26262E] bg-[#1C1C22] p-4 flex items-center gap-4 mb-6">
        <RankBadge rank={me.rank} size={38} />
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-[#F5F5F7]">You're #{me.rank} globally</div>
          <div className="text-[12px] text-[#6E6E76]">Keep voting and entering challenges to climb</div>
        </div>
        <TrendArrow trend={me.trend} delta={me.delta} />
      </div>

      <div className="flex flex-col gap-2">
        {LEADERBOARD.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-4 rounded-xl px-4 py-3 border"
            style={{
              background: p.rank <= 3 ? "#121216" : "transparent",
              borderColor: p.rank <= 3 ? "#26262E" : "#1C1C22",
              boxShadow: p.rank === 1 ? "0 0 24px #FFC24B22" : "none",
            }}
          >
            <RankBadge rank={p.rank} size={p.rank <= 3 ? 34 : 28} />
            <img src={p.avatar} className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-[#F5F5F7] truncate">{p.name}</div>
              <div className="text-[12px] text-[#6E6E76] truncate flex items-center gap-1"><MapPin size={11} />{p.location} · {p.category}</div>
            </div>
            <StatPill icon={Trophy} label={`${p.points.toLocaleString()} pts`} />
            <TrendArrow trend={p.trend} delta={p.delta} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- Profile -------------------------------- */

function Profile({ goToMessages, goToBook, goToSettings, goToUpload }) {
  const { currentUser, photos } = useApp();
  const [tab, setTab] = useState("portfolio");
  const [connectState, setConnectState] = useState("none"); // none, pending, connected
  const defaultPhoto = PHOTOGRAPHERS[2];

  const isMe = Boolean(currentUser);
  const userAvatar = currentUser?.avatar || currentUser?.avatar_url || currentUser?.user_metadata?.avatar_url;
  const isDicebear = userAvatar && typeof userAvatar === 'string' && userAvatar.includes('dicebear');
  const cleanAvatar = (!userAvatar || isDicebear) ? null : userAvatar;
  const cleanCover = currentUser?.cover || currentUser?.cover_url || null;

  const p = isMe ? {
    name: currentUser.name || currentUser.display_name || currentUser.user_metadata?.full_name || "Mohammed Yussif",
    handle: `@${currentUser.username || currentUser.user_metadata?.username || "moyu"}`,
    location: currentUser.location || currentUser.user_metadata?.location || "Accra, Ghana",
    rank: currentUser.rank || "-",
    points: Number(currentUser.points || 100),
    rating: currentUser.rating || 0.0,
    avatar: cleanAvatar,
    cover: cleanCover,
    bio: currentUser.bio || "No bio added yet. Click Edit Profile to add your bio and specialties.",
    followers: currentUser.followers || "0",
    wins: currentUser.wins || "0",
    role: currentUser.role || "photographer"
  } : defaultPhoto;

  const userUploadedPhotos = isMe ? (photos || []).filter(ph => ph.user?.id === currentUser.id || ph.author?.name === currentUser.name || ph.userId === currentUser.id || ph.ownerName === currentUser.name) : [];
  const defaultPortfolio = Array.from({ length: 9 }).map((_, i) => img(`port${i}`, 400, 500));
  const portfolio = isMe ? userUploadedPhotos.map(ph => ph.url || ph.imageUrl || ph.image) : defaultPortfolio;

  const cycleConnect = () => {
    if (connectState === "none") setConnectState("pending");
    else if (connectState === "pending") setConnectState("connected");
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="relative h-[240px]">
        {p.cover ? (
          <img src={p.cover} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1A1A24] via-[#08080A] to-[#121216]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080A] to-transparent" />
      </div>
      <div className="px-8 -mt-14 relative">
        <div className="flex items-end justify-between">
          <div className="flex items-end gap-4">
            {p.avatar ? (
              <img src={p.avatar} className="w-28 h-28 rounded-2xl object-cover border-4 border-[#08080A] shadow-xl" />
            ) : (
              <div className="w-28 h-28 rounded-2xl border-4 border-[#08080A] bg-[#1C1C22] flex items-center justify-center text-[#FFB020] shadow-xl">
                <Camera size={36} />
              </div>
            )}
            <div className="pb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-[22px] font-bold text-[#F5F5F7]">{p.name}</h2>
                <RankBadge rank={p.rank} size={26} />
              </div>
              <div className="text-[13px] text-[#A1A1AA] flex items-center gap-1"><MapPin size={12} />{p.location}</div>
              {connectState === "connected" && !isMe && (
                <div className="text-[12px] text-[#00E5FF] mt-1">42 mutual connections</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            {isMe ? (
              <>
                <button
                  onClick={goToSettings}
                  className="rounded-xl border border-[#26262E] bg-[#1C1C22] px-4 py-3 text-[14px] font-semibold text-[#F5F5F7] hover:bg-[#26262E] transition-colors flex items-center gap-2"
                >
                  <Edit3 size={15} /> Edit Profile
                </button>
                <button
                  className="rounded-xl border border-[#26262E] px-4 py-3 text-[14px] text-[#F5F5F7] hover:bg-[#1C1C22] transition-colors flex items-center gap-2"
                >
                  <Share2 size={15} /> Share
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={cycleConnect}
                  className="rounded-xl border font-semibold px-4 py-3 text-[14px] flex items-center gap-2 transition-colors"
                  style={{
                    borderColor: connectState === "connected" ? "#34D399" : "#3A3A40",
                    color: connectState === "connected" ? "#34D399" : connectState === "pending" ? "#A1A1AA" : "#F5F5F7",
                    background: "transparent",
                  }}
                >
                  {connectState === "none" && <><UserPlus size={15} /> Connect</>}
                  {connectState === "pending" && <><Clock size={15} /> Pending</>}
                  {connectState === "connected" && <><UserCheck size={15} /> Connected</>}
                </button>
                <SecondaryButton onClick={goToMessages} className="flex items-center gap-2">
                  <MessageSquare size={15} /> Message
                </SecondaryButton>
                <PrimaryButton onClick={goToBook} className="flex items-center gap-2">
                  <CalendarIcon size={15} /> Book a Session
                </PrimaryButton>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <StatPill icon={User} label={`${p.followers} followers`} />
          <StatPill icon={Trophy} label={`${p.points.toLocaleString()} pts`} />
          <StatPill icon={Star} label={`${p.rating} rating`} />
          <StatPill icon={Award} label={`${p.wins} wins`} />
        </div>

        <p className="text-[13px] text-[#D4D4D8] max-w-xl mt-4 leading-relaxed">
          {p.bio}
        </p>

        <div className="flex gap-6 mt-8 border-b border-[#1C1C22]">
          {["portfolio", "timeline", "achievements", "reviews"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="pb-3 text-[13px] font-medium capitalize border-b-2 transition-colors"
              style={{ borderColor: tab === t ? "#FFB020" : "transparent", color: tab === t ? "#F5F5F7" : "#6E6E76" }}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="py-6 pb-12">
          {tab === "portfolio" && (
            portfolio.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {portfolio.map((src, i) => (
                  <img key={i} src={src} className="w-full aspect-[4/5] object-cover rounded-xl border border-[#1C1C22]" />
                ))}
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center border border-dashed border-[#26262E] rounded-2xl bg-[#121216]/50 text-center my-4">
                <div className="w-16 h-16 rounded-full bg-[#1C1C22] flex items-center justify-center mb-4 text-[#FFB020]">
                  <Camera size={28} />
                </div>
                <h3 className="text-[16px] font-bold text-[#F5F5F7] mb-1">No Photos Uploaded Yet</h3>
                <p className="text-[13px] text-[#A1A1AA] max-w-sm mb-6">Your portfolio is currently empty. Upload your best photography to showcase your work to prospective clients.</p>
                {goToUpload && (
                  <PrimaryButton onClick={goToUpload} className="flex items-center gap-2">
                    <Upload size={16} /> Upload First Photo
                  </PrimaryButton>
                )}
              </div>
            )
          )}
          {tab === "timeline" && (
            <div className="flex flex-col gap-6 max-w-lg">
              {(isMe ? [
                { date: "Today", text: "Joined LensLeague as a Photographer." }
              ] : [
                { date: "Mar 2026", text: "Hit #1 in Wedding category globally." },
                { date: "Nov 2025", text: "Upgraded primary kit — first full-frame mirrorless body." },
                { date: "Jun 2025", text: "First challenge win — 'Golden Hour Portraits'." },
                { date: "Jan 2025", text: "Joined LensLeague, first upload." },
              ]).map((e, i, arr) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#FFB020] mt-1.5" />
                    {i < arr.length - 1 && <div className="w-px flex-1 bg-[#26262E] mt-1" />}
                  </div>
                  <div className="pb-2">
                    <div className="text-[11px] text-[#6E6E76] font-medium uppercase tracking-wide">{e.date}</div>
                    <div className="text-[13px] text-[#F5F5F7] mt-0.5">{e.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "achievements" && (
            <div className="grid grid-cols-6 gap-4">
              {["Crown", "Flame", "Trophy", "Star", "Award", "Camera"].map((name, i) => {
                const unlocked = !isMe && i < 4;
                return (
                  <div key={name} className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: unlocked ? "#1C1C22" : "#121216", border: `1px solid ${unlocked ? "#00E5FF55" : "#1C1C22"}` }}>
                      {name === "Crown" && <Crown size={22} color={unlocked ? "#FFC24B" : "#3A3A40"} />}
                      {name === "Flame" && <Flame size={22} color={unlocked ? "#FFB020" : "#3A3A40"} />}
                      {name === "Trophy" && <Trophy size={22} color={unlocked ? "#FFC24B" : "#3A3A40"} />}
                      {name === "Star" && <Star size={22} color={unlocked ? "#00E5FF" : "#3A3A40"} />}
                      {name === "Award" && <Award size={22} color={unlocked ? "#34D399" : "#3A3A40"} />}
                      {name === "Camera" && <Camera size={22} color={unlocked ? "#60A5FA" : "#3A3A40"} />}
                    </div>
                    <span className="text-[10px] text-[#6E6E76] text-center">{unlocked ? "Unlocked" : "Locked"}</span>
                  </div>
                );
              })}
            </div>
          )}
          {tab === "reviews" && (
            <div className="flex flex-col gap-4 max-w-lg">
              {isMe ? (
                <div className="py-12 flex flex-col items-center justify-center border border-dashed border-[#26262E] rounded-2xl bg-[#121216]/50 text-center my-4">
                  <div className="w-12 h-12 rounded-full bg-[#1C1C22] flex items-center justify-center mb-3 text-[#FFB020]">
                    <Star size={20} />
                  </div>
                  <h3 className="text-[15px] font-bold text-[#F5F5F7] mb-1">No Client Reviews Yet</h3>
                  <p className="text-[13px] text-[#A1A1AA] max-w-sm">Complete client bookings or win photography challenges to earn your first verified reviews.</p>
                </div>
              ) : (
                [
                  { name: "Chidera A.", rating: 5, text: "Incredible attention to detail during our wedding shoot. Delivered early too." },
                  { name: "Marcus O.", rating: 5, text: "Professional, punctual, and the editorial set exceeded what we briefed." },
                ].map((r, i) => (
                  <div key={i} className="rounded-xl border border-[#1C1C22] p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-semibold text-[#F5F5F7]">{r.name}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={12} color="#FFC24B" fill="#FFC24B" />)}
                      </div>
                    </div>
                    <p className="text-[13px] text-[#A1A1AA]">{r.text}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Upload -------------------------------- */

function UploadFlow({ onDone }) {
  const [step, setStep] = useState(1); // 1 source, 2 edit, 3 metadata, 4 review
  const [chosenSeed] = useState(() => `upload${Math.floor(Math.random() * 9999)}`);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [destination, setDestination] = useState("feed");
  const [category, setCategory] = useState("Portrait");
  const [caption, setCaption] = useState("");
  const [altText, setAltText] = useState("");
  const [gear, setGear] = useState("");
  const [moderation, setModeration] = useState("idle"); // idle, scanning, clear
  const [published, setPublished] = useState(false);

  const rollPhotos = Array.from({ length: 9 }).map((_, i) => img(`roll${i}`, 300, 300));
  const editedSrc = previewUrl || img(chosenSeed, 700, 875);
  const categories = ["Portrait", "Street", "Wedding", "Editorial", "Nature", "Product"];

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStep(2);
  };

  const goReview = () => {
    setStep(4);
    setModeration("scanning");
    setTimeout(() => setModeration("clear"), 1400);
  };

  const { uploadPhoto, currentUser } = useApp();

  const publish = async () => {
    await uploadPhoto({
      file: selectedFile,
      url: editedSrc,
      caption,
      category,
      destination,
      alt_text: altText
    });
    setPublished(true);
    setTimeout(onDone, 1400);
  };

  if (published) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-16 h-16 rounded-full bg-[#34D39922] flex items-center justify-center">
          <Check size={28} color="#34D399" strokeWidth={3} />
        </div>
        <div className="text-[#F5F5F7] font-semibold text-[16px]">Published</div>
        <div className="text-[#6E6E76] text-[13px]">
          {destination === "feed" && "Live on your feed."}
          {destination === "portfolio" && "Added to your portfolio."}
          {destination === "challenge" && "Entered into Golden Hour Portraits."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <div className="max-w-xl mx-auto w-full">
        {/* progress dots */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex-1 h-1 rounded-full" style={{ background: s <= step ? "#FFB020" : "#1C1C22" }} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-[18px] font-semibold text-[#F5F5F7] mb-1">Choose a photo</h2>
            <p className="text-[13px] text-[#6E6E76] mb-5">Upload from your device or pick from sample roll.</p>

            <label className="mb-6 flex flex-col items-center justify-center border-2 border-dashed border-[#26262E] hover:border-[#FFB020] rounded-2xl p-6 cursor-pointer bg-[#121216] transition-colors group">
              <Camera size={32} className="text-[#6E6E76] group-hover:text-[#FFB020] mb-2 transition-colors" />
              <span className="text-[14px] font-semibold text-[#F5F5F7] group-hover:text-[#FFB020] transition-colors">Upload image file</span>
              <span className="text-[12px] text-[#6E6E76] mt-1">Supports JPG, PNG, WEBP up to 25MB</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            </label>

            <div className="text-[12px] font-semibold text-[#6E6E76] uppercase tracking-wide mb-3">Or choose sample photo</div>

            <div className="grid grid-cols-3 gap-2 mb-6">
              {rollPhotos.map((src, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setPreviewUrl(src);
                    setSelectedFile(null);
                    setStep(2);
                  }}
                  className="aspect-square rounded-lg overflow-hidden border-2 transition-colors hover:border-[#FFB020]"
                  style={{ borderColor: previewUrl === src ? "#FFB020" : "transparent" }}
                >
                  <img src={src} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-[18px] font-semibold text-[#F5F5F7] mb-1">Edit</h2>
            <p className="text-[13px] text-[#6E6E76] mb-5">Light adjustments — crop and tone.</p>
            <div className="rounded-xl overflow-hidden border border-[#1C1C22] mb-5">
              <img src={editedSrc} className="w-full max-h-[420px] object-cover" />
            </div>
            <div className="flex flex-col gap-4 mb-6">
              {["Brightness", "Contrast"].map((label) => (
                <div key={label}>
                  <div className="flex justify-between text-[12px] text-[#A1A1AA] mb-1.5">
                    <span>{label}</span><span>0</span>
                  </div>
                  <input type="range" min="-50" max="50" defaultValue="0" className="w-full accent-[#FFB020]" />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <SecondaryButton onClick={() => setStep(1)} className="flex-1">Back</SecondaryButton>
              <PrimaryButton onClick={() => setStep(3)} className="flex-1">Continue</PrimaryButton>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-[18px] font-semibold text-[#F5F5F7] mb-1">Destination & details</h2>
            <p className="text-[13px] text-[#6E6E76] mb-5">Where should this live?</p>

            <div className="flex flex-col gap-2 mb-5">
              {[
                { key: "feed", label: "Add to Feed", desc: "Casual post, appears in your followers' feed." },
                { key: "portfolio", label: "Add to Portfolio", desc: "Curated — shown as your professional work." },
                { key: "challenge", label: "Enter a Challenge", desc: "Submit to Golden Hour Portraits (ends in 2d 14h)." },
              ].map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDestination(d.key)}
                  className="flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors"
                  style={{ borderColor: destination === d.key ? "#FFB020" : "#1C1C22", background: destination === d.key ? "#1C1C22" : "transparent" }}
                >
                  <div className="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center" style={{ borderColor: destination === d.key ? "#FFB020" : "#3A3A40" }}>
                    {destination === d.key && <div className="w-2 h-2 rounded-full bg-[#FFB020]" />}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#F5F5F7]">{d.label}</div>
                    <div className="text-[12px] text-[#6E6E76]">{d.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <label className="text-[12px] text-[#A1A1AA] mb-1.5 block">Category</label>
            <div className="flex gap-2 flex-wrap mb-5">
              {categories.map((c) => <CategoryChip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />)}
            </div>

            <label className="text-[12px] text-[#A1A1AA] mb-1.5 block">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Say something about this shot..."
              className="w-full rounded-xl bg-[#121216] border border-[#26262E] text-[13px] text-[#F5F5F7] placeholder-[#6E6E76] p-3 mb-1 outline-none resize-none"
              rows={3}
            />
            <div className="text-[11px] text-[#6E6E76] text-right mb-4">{caption.length}/280</div>

            <label className="text-[12px] text-[#A1A1AA] mb-1.5 block">Alt text <span className="text-[#6E6E76]">(accessibility)</span></label>
            <input
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image for screen readers"
              className="w-full rounded-xl bg-[#121216] border border-[#26262E] text-[13px] text-[#F5F5F7] placeholder-[#6E6E76] p-3 mb-4 outline-none"
            />
            {!altText && <div className="text-[11px] text-[#FBBF24] -mt-3 mb-4">Adding alt text helps more people experience your work.</div>}

            <label className="text-[12px] text-[#A1A1AA] mb-1.5 block">Gear used <span className="text-[#6E6E76]">(optional)</span></label>
            <input
              value={gear}
              onChange={(e) => setGear(e.target.value)}
              placeholder="e.g. Sony A7IV, 85mm f/1.4"
              className="w-full rounded-xl bg-[#121216] border border-[#26262E] text-[13px] text-[#F5F5F7] placeholder-[#6E6E76] p-3 mb-6 outline-none"
            />

            <div className="flex gap-3">
              <SecondaryButton onClick={() => setStep(2)} className="flex-1">Back</SecondaryButton>
              <PrimaryButton onClick={goReview} className="flex-1">Review</PrimaryButton>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-[18px] font-semibold text-[#F5F5F7] mb-1">Review & publish</h2>
            <p className="text-[13px] text-[#6E6E76] mb-5">This is exactly how it will appear.</p>

            <div className="rounded-2xl overflow-hidden border border-[#1C1C22] bg-[#121216] mb-5">
              <div className="flex items-center gap-3 px-4 py-3">
                <img src={currentUser?.avatar || PHOTOGRAPHERS[0].avatar} className="w-8 h-8 rounded-full object-cover" />
                <div className="text-[13px] font-semibold text-[#F5F5F7]">{currentUser?.name || PHOTOGRAPHERS[0].name}</div>
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-[#A1A1AA] bg-[#1C1C22] px-2 py-1 rounded-full">{category}</span>
              </div>
              <img src={editedSrc} className="w-full max-h-[380px] object-cover" />
              {caption && <p className="px-4 py-3 text-[13px] text-[#D4D4D8]">{caption}</p>}
            </div>

            <div className="flex items-center gap-2 mb-6 rounded-xl border border-[#1C1C22] px-4 py-3">
              {moderation === "scanning" && <><Loader2 size={15} className="animate-spin" color="#A1A1AA" /><span className="text-[13px] text-[#A1A1AA]">Running content check...</span></>}
              {moderation === "clear" && <><Check size={15} color="#34D399" /><span className="text-[13px] text-[#34D399]">Passed content check — ready to publish</span></>}
            </div>

            <div className="flex gap-3">
              <SecondaryButton onClick={() => setStep(3)} className="flex-1">Back</SecondaryButton>
              <PrimaryButton onClick={publish} className="flex-1" disabled={moderation !== "clear"}>
                {moderation === "clear" ? "Publish" : "Checking..."}
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Settings -------------------------------- */

function SettingsToggle({ defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn(!on)}
      className="w-10 h-6 rounded-full relative transition-colors shrink-0"
      style={{ background: on ? "#FFB020" : "#26262E" }}
    >
      <div className="w-4.5 h-4.5 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: on ? "22px" : "3px", width: 18, height: 18 }} />
    </button>
  );
}

function SettingsRow({ icon: Icon, label, value, toggle, destructive, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#121216] transition-colors text-left">
      <Icon size={17} color={destructive ? "#F87171" : "#A1A1AA"} />
      <span className="text-[13px] flex-1" style={{ color: destructive ? "#F87171" : "#F5F5F7" }}>{label}</span>
      {toggle !== undefined ? (
        <SettingsToggle defaultOn={toggle} />
      ) : (
        <div className="flex items-center gap-2">
          {value && <span className="text-[12px] text-[#6E6E76]">{value}</span>}
          <ChevronRight size={15} color="#3A3A40" />
        </div>
      )}
    </button>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6E6E76] px-4 mb-2">{title}</div>
      <div className="rounded-2xl border border-[#1C1C22] divide-y divide-[#1C1C22] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function SettingsScreen() {
  const { currentUser } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const userEmail = currentUser?.email || currentUser?.user_metadata?.email || "mohammed@example.com";
  const userLoc = currentUser?.location || currentUser?.user_metadata?.location || "Accra, GH";
  const catCount = currentUser?.categories?.length || 3;

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <div className="max-w-lg mx-auto w-full">
        <SettingsGroup title="Account">
          <SettingsRow icon={User} label="Email" value={userEmail} />
          <SettingsRow icon={Lock} label="Password" value="Change" />
          <SettingsRow icon={Sparkles} label="Linked accounts" value="Google" />
        </SettingsGroup>

        <SettingsGroup title="Profile">
          <SettingsRow icon={Camera} label="Public info" value="Edit" />
          <SettingsRow icon={Tag} label="Categories" value={`${catCount} selected`} />
          <SettingsRow icon={MapPin} label="Location" value={userLoc} />
        </SettingsGroup>

        <SettingsGroup title="Notifications">
          <SettingsRow icon={BellIcon} label="Likes & comments" toggle={true} />
          <SettingsRow icon={Trophy} label="Competition results" toggle={true} />
          <SettingsRow icon={CreditCard} label="Booking requests" toggle={true} />
          <SettingsRow icon={Sparkles} label="Marketing" toggle={false} />
        </SettingsGroup>

        <SettingsGroup title="Privacy">
          <SettingsRow icon={Shield} label="Who can message me" value="Everyone" />
          <SettingsRow icon={Shield} label="Who can book me" value="Everyone" />
        </SettingsGroup>

        <SettingsGroup title="Security">
          <SettingsRow icon={Lock} label="Two-factor authentication" value="Off" />
          <SettingsRow icon={Shield} label="Active sessions" value="2 devices" />
          <SettingsRow icon={ImageIcon} label="Download my data" />
        </SettingsGroup>

        <SettingsGroup title="Support">
          <SettingsRow icon={HelpCircle} label="Help center" />
          <SettingsRow icon={Flame} label="Report a problem" />
        </SettingsGroup>

        <SettingsGroup title="">
          {!confirmDelete ? (
            <SettingsRow icon={Trash2} label="Delete account" destructive onClick={() => setConfirmDelete(true)} />
          ) : (
            <div className="p-4">
              <div className="text-[13px] text-[#F5F5F7] font-medium mb-1">This can't be undone.</div>
              <div className="text-[12px] text-[#6E6E76] mb-3">All your photos, competition history, and rank will be permanently removed.</div>
              <div className="flex gap-2">
                <SecondaryButton onClick={() => setConfirmDelete(false)} className="flex-1 py-2 text-[12px]">Cancel</SecondaryButton>
                <button className="flex-1 rounded-xl bg-[#F87171] text-[#08080A] font-semibold text-[12px] py-2">Confirm delete</button>
              </div>
            </div>
          )}
          <SettingsRow icon={LogOut} label="Log out" />
        </SettingsGroup>
      </div>
    </div>
  );
}

/* -------------------------------- Messages -------------------------------- */

const CONVERSATIONS = [
  { id: "c1", person: PHOTOGRAPHERS[2], connected: true, lastMsg: "Sounds great — see you at 9am for the golden hour shots.", time: "2m", unread: 2,
    messages: [
      { from: "them", text: "Hi! Loved your feedback on the wedding set." },
      { from: "me", text: "Of course — the light in the third frame was incredible." },
      { from: "them", text: "Thank you! Are you free to collaborate on a styled shoot next month?" },
      { from: "me", text: "Possibly, send me some dates that work." },
      { from: "them", text: "Sounds great — see you at 9am for the golden hour shots." },
    ] },
  { id: "c2", person: PHOTOGRAPHERS[3], connected: true, lastMsg: "Just sent over the contract, take a look when you can.", time: "1h", unread: 0,
    messages: [
      { from: "them", text: "Hey, following up on the editorial booking." },
      { from: "me", text: "Yes! Let's lock the date." },
      { from: "them", text: "Just sent over the contract, take a look when you can." },
    ] },
  { id: "c3", person: PHOTOGRAPHERS[4], connected: true, lastMsg: "You: Appreciate that, means a lot 🙏", time: "5h", unread: 0,
    messages: [
      { from: "them", text: "Your nature series just hit #1 in category, congrats!" },
      { from: "me", text: "Appreciate that, means a lot 🙏" },
    ] },
];

const MESSAGE_REQUESTS = [
  { id: "r1", person: PHOTOGRAPHERS[5], lastMsg: "Hi, I'm a client looking for a product shoot next week — are you available?" },
  { id: "r2", person: PHOTOGRAPHERS[1], lastMsg: "Would love to connect and maybe trade critique on street work sometime." },
];

function Messages() {
  const [tab, setTab] = useState("focused");
  const [activeId, setActiveId] = useState(CONVERSATIONS[0].id);
  const [draft, setDraft] = useState("");
  const [localMsgs, setLocalMsgs] = useState({});

  const active = CONVERSATIONS.find((c) => c.id === activeId);
  const thread = [...active.messages, ...(localMsgs[activeId] || [])];

  const send = () => {
    if (!draft.trim()) return;
    setLocalMsgs((m) => ({ ...m, [activeId]: [...(m[activeId] || []), { from: "me", text: draft }] }));
    setDraft("");
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-[320px] shrink-0 border-r border-[#1C1C22] flex flex-col">
        <div className="flex gap-1 p-3">
          {["focused", "other"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 rounded-lg py-2 text-[12px] font-semibold capitalize transition-colors relative"
              style={{ background: tab === t ? "#1C1C22" : "transparent", color: tab === t ? "#F5F5F7" : "#6E6E76" }}
            >
              {t === "focused" ? "Focused" : "Requests"}
              {t === "other" && MESSAGE_REQUESTS.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[#FFB020] text-[#08080A] text-[9px] font-bold align-middle">
                  {MESSAGE_REQUESTS.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "focused" && CONVERSATIONS.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
              style={{ background: activeId === c.id ? "#121216" : "transparent" }}
            >
              <img src={c.person.avatar} className="w-11 h-11 rounded-full object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#F5F5F7] truncate">{c.person.name}</span>
                  <span className="text-[11px] text-[#6E6E76] shrink-0 ml-2">{c.time}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[12px] text-[#6E6E76] truncate">{c.lastMsg}</span>
                  {c.unread > 0 && <span className="w-2 h-2 rounded-full bg-[#FFB020] shrink-0 ml-2" />}
                </div>
              </div>
            </button>
          ))}

          {tab === "other" && (
            <div>
              <div className="px-4 py-2 text-[11px] text-[#6E6E76]">Message requests aren't in your main inbox until you accept.</div>
              {MESSAGE_REQUESTS.map((r) => (
                <div key={r.id} className="flex items-start gap-3 px-4 py-3">
                  <img src={r.person.avatar} className="w-11 h-11 rounded-full object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[13px] font-semibold text-[#F5F5F7]">{r.person.name}</span>
                    <div className="text-[12px] text-[#6E6E76] mt-0.5 mb-2">{r.lastMsg}</div>
                    <div className="flex gap-2">
                      <button className="text-[11px] font-semibold text-[#08080A] bg-[#FFB020] rounded-full px-3 py-1">Accept</button>
                      <button className="text-[11px] font-semibold text-[#A1A1AA] bg-[#1C1C22] rounded-full px-3 py-1">Ignore</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1C1C22]">
          <img src={active.person.avatar} className="w-9 h-9 rounded-full object-cover" />
          <div>
            <div className="text-[13px] font-semibold text-[#F5F5F7]">{active.person.name}</div>
            <div className="text-[11px] text-[#34D399] flex items-center gap-1"><UserCheck size={11} /> Connected</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3">
          {thread.map((m, i) => (
            <div key={i} className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-[13px] ${m.from === "me" ? "self-end" : "self-start"}`}
              style={{ background: m.from === "me" ? "#FFB020" : "#1C1C22", color: m.from === "me" ? "#08080A" : "#F5F5F7" }}>
              {m.text}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-[#1C1C22]">
          <button><Paperclip size={17} color="#6E6E76" /></button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Write a message..."
            className="flex-1 bg-[#121216] border border-[#26262E] rounded-full px-4 py-2.5 text-[13px] text-[#F5F5F7] placeholder-[#6E6E76] outline-none"
          />
          <button onClick={send} className="w-9 h-9 rounded-full bg-[#FFB020] flex items-center justify-center shrink-0">
            <Send size={15} color="#08080A" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Book Appointment ----------------------------- */

function BookAppointment({ onDone }) {
  const daysInMonth = 30;
  const unavailable = [2, 3, 9, 10, 16, 17, 23, 24, 30];
  const [selectedDay, setSelectedDay] = useState(14);
  const [sessionType, setSessionType] = useState("Portrait Session");
  const [selectedTime, setSelectedTime] = useState("10:00 AM");
  const [format, setFormat] = useState("inperson");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  const slots = ["9:00 AM", "10:00 AM", "11:30 AM", "1:00 PM", "2:30 PM", "4:00 PM"];
  const p = PHOTOGRAPHERS[2];

  if (sent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-16 h-16 rounded-full bg-[#34D39922] flex items-center justify-center">
          <Check size={28} color="#34D399" strokeWidth={3} />
        </div>
        <div className="text-[#F5F5F7] font-semibold text-[16px]">Request sent to {p.name}</div>
        <div className="text-[#6E6E76] text-[13px] text-center max-w-xs">
          March {selectedDay}, {selectedTime} · {sessionType}. You'll be notified once they accept — nothing is confirmed yet.
        </div>
        <button onClick={onDone} className="mt-2 text-[13px] text-[#FFB020]">Back to profile</button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <div className="max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <img src={p.avatar} className="w-10 h-10 rounded-full object-cover" />
          <div>
            <div className="text-[15px] font-semibold text-[#F5F5F7]">Book a session with {p.name}</div>
            <div className="text-[12px] text-[#6E6E76]">Usually responds within a few hours</div>
          </div>
        </div>

        <label className="text-[12px] text-[#A1A1AA] mb-1.5 block">Session type</label>
        <div className="flex gap-2 flex-wrap mb-6">
          {["Portrait Session", "Wedding Consult", "Product Shoot", "Custom"].map((s) => (
            <CategoryChip key={s} label={s} active={sessionType === s} onClick={() => setSessionType(s)} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold text-[#F5F5F7]">March 2027</span>
              <div className="flex gap-1">
                <button className="w-7 h-7 rounded-full border border-[#26262E] flex items-center justify-center"><ArrowLeft size={13} color="#6E6E76" /></button>
                <button className="w-7 h-7 rounded-full border border-[#26262E] flex items-center justify-center"><ArrowRight size={13} color="#6E6E76" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="text-[10px] text-[#6E6E76] font-medium pb-1">{d}</div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isUnavailable = unavailable.includes(day);
                const isSelected = selectedDay === day;
                return (
                  <button
                    key={day}
                    disabled={isUnavailable}
                    onClick={() => setSelectedDay(day)}
                    className="aspect-square rounded-lg text-[12px] font-medium flex items-center justify-center transition-colors"
                    style={{
                      background: isSelected ? "#FFB020" : "transparent",
                      color: isUnavailable ? "#3A3A40" : isSelected ? "#08080A" : "#F5F5F7",
                      cursor: isUnavailable ? "not-allowed" : "pointer",
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[11px] text-[#6E6E76]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#FFB020]" />Selected</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#26262B] border border-[#3A3A40]" />Unavailable</span>
            </div>
          </div>

          <div>
            <div className="text-[13px] font-semibold text-[#F5F5F7] mb-3">Available times — March {selectedDay}</div>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {slots.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedTime(s)}
                  className="rounded-lg border py-2.5 text-[12px] font-medium transition-colors"
                  style={{
                    borderColor: selectedTime === s ? "#FFB020" : "#26262E",
                    background: selectedTime === s ? "#FFB02022" : "transparent",
                    color: selectedTime === s ? "#FFB020" : "#A1A1AA",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="text-[13px] font-semibold text-[#F5F5F7] mb-3">Format</div>
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setFormat("inperson")}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-[12px] font-medium"
                style={{ borderColor: format === "inperson" ? "#FFB020" : "#26262E", color: format === "inperson" ? "#FFB020" : "#A1A1AA" }}
              >
                <PinIcon size={13} /> In person
              </button>
              <button
                onClick={() => setFormat("video")}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-[12px] font-medium"
                style={{ borderColor: format === "video" ? "#FFB020" : "#26262E", color: format === "video" ? "#FFB020" : "#A1A1AA" }}
              >
                <Video size={13} /> Video consult
              </button>
            </div>
          </div>
        </div>

        <label className="text-[12px] text-[#A1A1AA] mb-1.5 block">Note to {p.name} <span className="text-[#6E6E76]">(optional)</span></label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Tell them a bit about what you're looking for..."
          className="w-full rounded-xl bg-[#121216] border border-[#26262E] text-[13px] text-[#F5F5F7] placeholder-[#6E6E76] p-3 mb-6 outline-none resize-none"
          rows={3}
        />

        <div className="rounded-xl border border-[#1C1C22] p-4 mb-6 flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-[#F5F5F7]">March {selectedDay} · {selectedTime}</div>
            <div className="text-[12px] text-[#6E6E76]">{sessionType} · {format === "inperson" ? "In person" : "Video consult"}</div>
          </div>
          <CalendarIcon size={18} color="#6E6E76" />
        </div>

        <PrimaryButton full onClick={() => setSent(true)}>Send Booking Request</PrimaryButton>
        <div className="text-[11px] text-[#6E6E76] text-center mt-3">This sends a request — {p.name} confirms before anything is booked.</div>
      </div>
    </div>
  );
}

/* -------------------------------- Onboarding Flow -------------------------------- */

function OnboardingFlow({ onComplete }) {
  const { currentUser, uploadAvatar, setProfileCategories, completeOnboarding, followUser } = useApp();
  const [step, setStep] = useState(1); // 1: Avatar, 2: Categories, 3: Follow suggestions
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar_url || currentUser?.avatar || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const categories = [
    { id: 1, name: 'Portrait' },
    { id: 2, name: 'Street' },
    { id: 3, name: 'Wildlife' },
    { id: 4, name: 'Fashion' },
    { id: 5, name: 'Sports' },
    { id: 6, name: 'Landscape' },
    { id: 7, name: 'Wedding' },
    { id: 8, name: 'Documentary' },
    { id: 9, name: 'Product' },
    { id: 10, name: 'Editorial' },
  ];
  const [selectedCatIds, setSelectedCatIds] = useState([1, 2, 7]);
  const [followedIds, setFollowedIds] = useState([]);
  const [finishing, setFinishing] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleStep1Next = async () => {
    if (avatarFile) {
      setUploadingAvatar(true);
      await uploadAvatar(avatarFile);
      setUploadingAvatar(false);
    }
    setStep(2);
  };

  const handleStep2Next = async () => {
    if (selectedCatIds.length > 0) {
      await setProfileCategories(selectedCatIds);
    }
    setStep(3);
  };

  const handleFinish = async () => {
    setFinishing(true);
    await completeOnboarding();
    setFinishing(false);
    onComplete?.();
  };

  const toggleCategory = (id) => {
    setSelectedCatIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleFollow = (id) => {
    if (followedIds.includes(id)) {
      setFollowedIds(prev => prev.filter(i => i !== id));
    } else {
      setFollowedIds(prev => [...prev, id]);
      followUser(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08080A] text-[#F5F5F7] animate-fade-in">
      <div className="w-full max-w-lg bg-[#121216] border border-[#26262E] rounded-3xl p-8 shadow-2xl relative">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 h-1.5 rounded-full transition-colors" style={{ background: s <= step ? "#FFB020" : "#1C1C22" }} />
          ))}
        </div>

        {step === 1 && (
          <div className="flex flex-col items-center text-center">
            <h2 className="text-[22px] font-bold mb-2">Welcome, {currentUser?.display_name || currentUser?.name || 'Photographer'}!</h2>
            <p className="text-[13px] text-[#A1A1AA] mb-6 max-w-sm">Let's set up your profile. Add a profile picture to introduce yourself to LensLeague.</p>

            <div className="relative mb-6 group cursor-pointer">
              <img
                src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser?.username || 'user')}`}
                className="w-28 h-28 rounded-full object-cover border-4 border-[#FFB020] shadow-lg"
              />
              <label className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[11px] font-semibold">
                <Camera size={20} className="mb-1" />
                Change
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>

            <label className="mb-6 cursor-pointer text-[13px] font-semibold text-[#FFB020] hover:underline">
              Choose photo from device
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>

            <div className="flex gap-3 w-full mt-4">
              <SecondaryButton onClick={() => setStep(2)} className="flex-1">Skip for now</SecondaryButton>
              <PrimaryButton onClick={handleStep1Next} disabled={uploadingAvatar} className="flex-1">
                {uploadingAvatar ? 'Saving...' : 'Next'}
              </PrimaryButton>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center text-center">
            <h2 className="text-[22px] font-bold mb-2">What do you capture?</h2>
            <p className="text-[13px] text-[#A1A1AA] mb-6">Select your primary photography styles to personalize your feed and discover challenges.</p>

            <div className="flex flex-wrap gap-2 justify-center mb-8 max-w-md">
              {categories.map((c) => {
                const isSelected = selectedCatIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCategory(c.id)}
                    className="px-4 py-2 rounded-xl text-[13px] font-semibold border transition-all"
                    style={{
                      background: isSelected ? "#FFB020" : "#1C1C22",
                      borderColor: isSelected ? "#FFB020" : "#26262E",
                      color: isSelected ? "#08080A" : "#F5F5F7"
                    }}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 w-full">
              <SecondaryButton onClick={() => setStep(1)} className="flex-1">Back</SecondaryButton>
              <PrimaryButton onClick={handleStep2Next} className="flex-1">Continue</PrimaryButton>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center text-center">
            <h2 className="text-[22px] font-bold mb-2">Discover Creators</h2>
            <p className="text-[13px] text-[#A1A1AA] mb-6">Follow featured photographers to curate your initial timeline.</p>

            <div className="flex flex-col gap-3 w-full mb-6 max-h-[240px] overflow-y-auto pr-1">
              {PHOTOGRAPHERS.slice(0, 4).map((p) => {
                const isFollowing = followedIds.includes(p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-[#1C1C22] border border-[#26262E]">
                    <div className="flex items-center gap-3 text-left">
                      <img src={p.avatar} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <div className="text-[14px] font-semibold text-white">{p.name}</div>
                        <div className="text-[11px] text-[#A1A1AA]">{p.location}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFollow(p.id)}
                      className="px-4 py-1.5 rounded-xl text-[12px] font-bold border transition-all"
                      style={{
                        background: isFollowing ? "transparent" : "#FFB020",
                        borderColor: isFollowing ? "#3A3A40" : "#FFB020",
                        color: isFollowing ? "#34D399" : "#08080A"
                      }}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  </div>
                );
              })}
            </div>

            <PrimaryButton full onClick={handleFinish} disabled={finishing}>
              {finishing ? "Setting up..." : "Enter LensLeague"}
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- App ---------------------------------- */

export default function PrototypeApp({ initialScreen = "landing" }) {
  const { currentUser } = useApp();
  const [screen, setScreen] = useState(initialScreen);
  const [appAuthModal, setAppAuthModal] = useState(null); // 'login' | 'signup' | null

  const titles = {
    home: "Home", discover: "Discover", compete: "Compete",
    leaderboard: "Leaderboard", profile: "Profile", upload: "Upload", settings: "Settings",
    messages: "Messages", book: "Book a Session",
  };

  // If user signed up but onboarding is incomplete, gate with Onboarding Flow
  if (currentUser && currentUser.onboarding_completed === false) {
    return (
      <div  className="w-full h-full bg-[#08080A]">
        <OnboardingFlow onComplete={() => setScreen("home")} />
      </div>
    );
  }

  if (screen === "landing") {
    return (
      <div  className="w-full h-full">
        <Landing enter={() => setScreen("home")} />
      </div>
    );
  }

  return (
    <div  className="w-full h-full bg-[#08080A] flex overflow-hidden">
      <Sidebar screen={screen} setScreen={setScreen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={titles[screen] || "LensLeague"} onOpenAuth={(mode) => setAppAuthModal(mode)} />
        <div className="flex-1 flex overflow-hidden">
          {screen === "home" && <HomeFeed goToCompete={() => setScreen("compete")} />}
          {screen === "discover" && <Discover />}
          {screen === "compete" && <Compete />}
          {screen === "leaderboard" && <Leaderboard />}
          {screen === "profile" && <Profile goToMessages={() => setScreen("messages")} goToBook={() => setScreen("book")} goToSettings={() => setScreen("settings")} goToUpload={() => setScreen("upload")} />}
          {screen === "upload" && <UploadFlow onDone={() => setScreen("home")} />}
          {screen === "settings" && <SettingsScreen />}
          {screen === "messages" && <Messages />}
          {screen === "book" && <BookAppointment onDone={() => setScreen("profile")} />}
        </div>
      </div>

      {appAuthModal && (
        <AuthModal
          mode={appAuthModal}
          onClose={() => setAppAuthModal(null)}
          onSuccess={() => setAppAuthModal(null)}
        />
      )}
    </div>
  );
}
