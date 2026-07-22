import React, { useState, useEffect, useRef } from "react";
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
  { id: 1, name: "Naledi Osei", handle: "@naledi.frames", category: "Portrait", location: "Accra, GH", rank: 3, points: 8420, rating: 4.9, avatar: img("naledi-a", 200, 200), cover: img("naledi-c", 1200, 500) },
  { id: 2, name: "Kojo Mensah", handle: "@kojo.streets", category: "Street", location: "Kumasi, GH", rank: 12, points: 6110, rating: 4.7, avatar: img("kojo-a", 200, 200), cover: img("kojo-c", 1200, 500) },
  { id: 3, name: "Adaeze Nwosu", handle: "@adaeze.light", category: "Wedding", location: "Lagos, NG", rank: 1, points: 11875, rating: 5.0, avatar: img("adaeze-a", 200, 200), cover: img("adaeze-c", 1200, 500) },
  { id: 4, name: "Tariq Farouk", handle: "@tariq.editorial", category: "Editorial", location: "Cairo, EG", rank: 2, points: 9902, rating: 4.8, avatar: img("tariq-a", 200, 200), cover: img("tariq-c", 1200, 500) },
  { id: 5, name: "Zola Dube", handle: "@zola.nature", category: "Nature", location: "Cape Town, ZA", rank: 7, points: 7340, rating: 4.85, avatar: img("zola-a", 200, 200), cover: img("zola-c", 1200, 500) },
  { id: 6, name: "Ife Balogun", handle: "@ife.product", category: "Product", location: "Abuja, NG", rank: 5, points: 8010, rating: 4.75, avatar: img("ife-a", 200, 200), cover: img("ife-c", 1200, 500) },
];

const FEED = [
  { id: "f1", photographer: PHOTOGRAPHERS[0], image: img("feed1", 900, 1125), caption: "Golden hour, Osu — waiting for the light to break through the palms.", category: "Portrait", likes: 842, comments: 41 },
  { id: "f2", photographer: PHOTOGRAPHERS[1], image: img("feed2", 900, 675), caption: "Market rhythm. Kejetia never stops moving.", category: "Street", likes: 1290, comments: 88 },
  { id: "f3", photographer: PHOTOGRAPHERS[2], image: img("feed3", 900, 1200), caption: "First look, before the noise starts.", category: "Wedding", likes: 2110, comments: 156 },
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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1C1C20] border border-[#2A2A2E] px-3 py-1.5 text-[13px] text-[#A1A1AA]">
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
        color: rank <= 3 ? "#0A0A0C" : "#F5F5F7",
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
        ? { background: "#FF4D6D", borderColor: "#FF4D6D", color: "#0A0A0C" }
        : { background: "transparent", borderColor: "#2A2A2E", color: "#A1A1AA" }}
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
        background: disabled ? "#2A2A2E" : "#FF4D6D",
        color: disabled ? "#6E6E76" : "#0A0A0C",
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
      className={`rounded-xl border border-[#3A3A40] text-[#F5F5F7] font-medium px-5 py-3 text-[14px] transition-colors hover:bg-[#1C1C20] ${className}`}
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
    <div className="w-[240px] shrink-0 h-full border-r border-[#1C1C20] flex flex-col py-6 px-4">
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF4D6D] to-[#6E5BFF] flex items-center justify-center">
          <Camera size={16} color="#0A0A0C" strokeWidth={2.5} />
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
                background: active ? "#1C1C20" : "transparent",
                color: active ? "#F5F5F7" : "#A1A1AA",
              }}
            >
              <Icon size={19} strokeWidth={active ? 2.4 : 2} color={active ? "#FF4D6D" : "#A1A1AA"} />
              {label}
              {!!badge && (
                <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF4D6D] text-[#0A0A0C] text-[10px] font-bold flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <button
        onClick={() => setScreen("upload")}
        className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#FF4D6D] text-[#0A0A0C] font-semibold py-2.5 text-[14px] hover:brightness-110 transition"
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
          <img src={currentUser?.avatar || PHOTOGRAPHERS[0].avatar} className="w-9 h-9 rounded-full object-cover border border-[#2A2A2E]" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-[#F5F5F7] truncate">{currentUser?.name || PHOTOGRAPHERS[0].name}</div>
            <div className="text-[11px] text-[#6E6E76] truncate">@{currentUser?.username || "me"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopBar({ title, onOpenAuth }) {
  const { currentUser, logoutUser } = useApp();

  return (
    <div className="flex items-center justify-between px-8 py-5 border-b border-[#1C1C20] shrink-0 bg-[#0A0A0C]">
      <h1 className="text-[22px] font-bold text-[#F5F5F7] tracking-tight">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-[#131316] border border-[#2A2A2E] rounded-full px-4 py-2 w-[280px]">
          <Search size={15} color="#6E6E76" />
          <input placeholder="Search photographers, tags..." className="bg-transparent outline-none text-[13px] text-[#F5F5F7] placeholder-[#6E6E76] w-full" />
        </div>

        {currentUser ? (
          <div className="flex items-center gap-3">
            <button className="relative w-9 h-9 rounded-full bg-[#131316] border border-[#2A2A2E] flex items-center justify-center hover:border-[#3A3A40]">
              <Bell size={16} color="#A1A1AA" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF4D6D]" />
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
              className="px-4 py-1.5 rounded-full text-[13px] font-semibold text-[#0A0A0C] bg-[#FF4D6D] hover:brightness-110 shadow-[0_2px_10px_rgba(255,77,109,0.3)]"
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
  const { signUpUser, loginUser } = useApp();
  const [authMode, setAuthMode] = useState(mode); // 'login' | 'signup'
  const [role, setRole] = useState(initialRole); // 'photographer' | 'client'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('Accra, Ghana');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (authMode === 'signup') {
      if (!name || !email || !password) {
        setErrorMsg('Please fill out all required fields.');
        setLoading(false);
        return;
      }
      const res = await signUpUser({ name, email, password, role, location });
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
        setLoading(false);
        return;
      }
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
      <div className="w-full max-w-md bg-[#131316] border border-[#2A2A2E] rounded-2xl p-6 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white">
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF4D6D] to-[#6E5BFF] flex items-center justify-center">
            <Camera size={16} color="#0A0A0C" strokeWidth={2.5} />
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
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-all ${role === 'photographer' ? 'bg-[#FF4D6D] border-[#FF4D6D] text-[#0A0A0C]' : 'bg-[#1C1C20] border-[#2A2A2E] text-[#A1A1AA]'}`}
            >
              📷 Photographer
            </button>
            <button
              type="button"
              onClick={() => setRole('client')}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-all ${role === 'client' ? 'bg-[#FF4D6D] border-[#FF4D6D] text-[#0A0A0C]' : 'bg-[#1C1C20] border-[#2A2A2E] text-[#A1A1AA]'}`}
            >
              💼 Client
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {authMode === 'signup' && (
            <div>
              <label className="text-[12px] text-[#A1A1AA] mb-1 block">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Kofi Mensah"
                className="w-full bg-[#1C1C20] border border-[#2A2A2E] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none focus:border-[#FF4D6D]"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="text-[12px] text-[#A1A1AA] mb-1 block">Email address</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="w-full bg-[#1C1C20] border border-[#2A2A2E] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none focus:border-[#FF4D6D]"
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
              className="w-full bg-[#1C1C20] border border-[#2A2A2E] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none focus:border-[#FF4D6D]"
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
                className="w-full bg-[#1C1C20] border border-[#2A2A2E] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none focus:border-[#FF4D6D]"
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
            <>Already have an account? <button onClick={() => setAuthMode('login')} className="text-[#FF4D6D] font-semibold hover:underline">Log in</button></>
          ) : (
            <>Don't have an account? <button onClick={() => setAuthMode('signup')} className="text-[#FF4D6D] font-semibold hover:underline">Sign up</button></>
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
    <div className="w-full h-full overflow-y-auto bg-[#0A0A0C]">

      {/* Top Header Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-8 py-4 bg-[#0A0A0C]/80 backdrop-blur-xl border-b border-[#1C1C20]">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setAuthConfig({ mode: 'signup', role: 'photographer' })}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF4D6D] to-[#6E5BFF] flex items-center justify-center">
            <Camera size={18} color="#0A0A0C" strokeWidth={2.5} />
          </div>
          <span className="text-[#F5F5F7] font-bold text-[19px] tracking-tight">LensLeague</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAuthConfig({ mode: 'login', role: 'photographer' })}
            className="px-5 py-2 rounded-full text-[14px] font-semibold text-[#A1A1AA] hover:text-white transition-colors"
          >
            Log in
          </button>
          <button
            onClick={() => setAuthConfig({ mode: 'signup', role: 'photographer' })}
            className="px-5 py-2 rounded-full text-[14px] font-semibold text-[#0A0A0C] bg-[#FF4D6D] shadow-[0_4px_16px_rgba(255,77,109,0.4)] hover:brightness-110 transition-all"
          >
            Sign up
          </button>
        </div>
      </nav>

      {/* Animated Hero */}
      <div className="relative min-h-[680px] pt-20 overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 grid grid-cols-4 gap-1 opacity-50 transition-opacity duration-1000 hover:opacity-75">
          {["h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8"].map((s, i) => (
            <img key={s} src={img(s, 400, 500)} className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500" style={{ gridRow: i % 2 === 0 ? "span 1" : "span 2" }} />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C]/85 to-[#0A0A0C]/30" />

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto py-16">
          
          {/* Live vote ticker pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF4D6D]/10 border border-[#FF4D6D]/30 text-[#FF4D6D] text-[12px] font-bold tracking-wide uppercase mb-6 animate-pulse">
            <Flame size={14} /> ⚡ 24,810 votes live right now
          </div>

          <h1 className="text-[#F5F5F7] font-bold text-[56px] leading-[1.05] tracking-tight mb-4">
            Where your portfolio<br />
            <span className="bg-gradient-to-r from-[#FF4D6D] via-[#FF758F] to-[#6E5BFF] bg-clip-text text-transparent">
              has a scoreboard.
            </span>
          </h1>

          <p className="text-[#A1A1AA] text-[18px] max-w-lg leading-relaxed mb-8">
            Upload your best shots, compete head-to-head, rank up globally, and get booked directly by clients.
          </p>

          <div className="flex items-center gap-4">
            <PrimaryButton onClick={() => setAuthConfig({ mode: 'signup', role: 'photographer' })} className="px-8 py-3.5 text-[15px] shadow-[0_6px_24px_rgba(255,77,109,0.4)]">
              I'm a Photographer
            </PrimaryButton>
            <SecondaryButton onClick={() => setAuthConfig({ mode: 'signup', role: 'client' })} className="px-8 py-3.5 text-[15px]">
              Find a Photographer
            </SecondaryButton>
          </div>
        </div>
      </div>

      {/* Feature Value Props */}
      <div className="max-w-5xl mx-auto px-8 py-20 grid grid-cols-3 gap-8">
        {[
          { icon: UploadIcon, title: "Upload", body: "Post your best work to a feed and curated portfolio built for photography, not squares." },
          { icon: Swords, title: "Compete", body: "Enter head-to-head battles judged by the community. Every vote moves your rank." },
          { icon: Trophy, title: "Get Hired", body: "Clients search by rank, category, and rating — ranked work gets found first." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-[#1C1C20] bg-[#131316] p-6 hover:border-[#FF4D6D]/40 transition-all group cursor-pointer hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-[#1C1C20] border border-[#2A2A2E] flex items-center justify-center mb-5 group-hover:bg-[#FF4D6D]/10 transition-colors">
              <Icon size={22} color="#FF4D6D" />
            </div>
            <h3 className="text-[#F5F5F7] font-semibold text-[17px] mb-2">{title}</h3>
            <p className="text-[#A1A1AA] text-[14px] leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      {/* Top Ranked Teaser */}
      <div className="max-w-5xl mx-auto px-8 pb-24">
        <h2 className="text-[#F5F5F7] font-bold text-[22px] mb-6">This week's top ranked</h2>
        <div className="grid grid-cols-3 gap-5">
          {LEADERBOARD.slice(0, 3).map((p) => (
            <div key={p.id} className="rounded-2xl border border-[#1C1C20] bg-[#131316] p-5 flex items-center gap-4 hover:border-[#2A2A2E] transition-all">
              <RankBadge rank={p.rank} size={38} />
              <img src={p.avatar} className="w-12 h-12 rounded-full object-cover border border-[#2A2A2E]" />
              <div className="min-w-0">
                <div className="text-[#F5F5F7] font-semibold text-[15px] truncate">{p.name}</div>
                <div className="text-[#6E6E76] text-[12px] truncate">{p.category} · {p.location}</div>
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
  return (
    <div className="rounded-2xl overflow-hidden border border-[#1C1C20] bg-[#131316] mb-6">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={post.photographer.avatar} className="w-9 h-9 rounded-full object-cover" />
          <div>
            <div className="text-[13px] font-semibold text-[#F5F5F7]">{post.photographer.name}</div>
            <div className="text-[11px] text-[#6E6E76]">{post.photographer.location}</div>
          </div>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#A1A1AA] bg-[#1C1C20] px-2.5 py-1 rounded-full">{post.category}</span>
      </div>
      <div className="relative">
        <img src={post.image} className="w-full max-h-[560px] object-cover" onDoubleClick={() => setLiked(true)} />
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button onClick={() => setLiked(!liked)} className="flex items-center gap-1.5">
            <Heart size={19} color={liked ? "#FF4D6D" : "#A1A1AA"} fill={liked ? "#FF4D6D" : "none"} />
            <span className="text-[13px] text-[#A1A1AA]">{post.likes + (liked ? 1 : 0)}</span>
          </button>
          <button className="flex items-center gap-1.5">
            <MessageCircle size={19} color="#A1A1AA" />
            <span className="text-[13px] text-[#A1A1AA]">{post.comments}</span>
          </button>
        </div>
        <button onClick={() => setSaved(!saved)}>
          <Bookmark size={19} color={saved ? "#6E5BFF" : "#A1A1AA"} fill={saved ? "#6E5BFF" : "none"} />
        </button>
      </div>
      <p className="px-4 pb-4 text-[13px] text-[#D4D4D8] leading-relaxed">{post.caption}</p>
    </div>
  );
}

function BattleSpotlight({ battle, onClick }) {
  return (
    <button onClick={onClick} className="w-full rounded-2xl border border-[#2A2A2E] bg-gradient-to-r from-[#1C1C20] to-[#131316] p-4 mb-6 flex items-center gap-4 text-left hover:border-[#3A3A40] transition-colors">
      <div className="flex -space-x-3">
        <img src={battle.a.photo} className="w-14 h-14 rounded-xl object-cover border-2 border-[#131316]" />
        <img src={battle.b.photo} className="w-14 h-14 rounded-xl object-cover border-2 border-[#131316]" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5 text-[#FF4D6D] text-[12px] font-semibold uppercase tracking-wide mb-0.5">
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
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 overflow-y-auto px-8 py-6 max-w-[640px] mx-auto w-full">
        <div className="flex gap-2 mb-6">
          {["forYou", "following"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors"
              style={{ background: tab === t ? "#FF4D6D" : "#1C1C20", color: tab === t ? "#0A0A0C" : "#A1A1AA" }}
            >
              {t === "forYou" ? "For You" : "Following"}
            </button>
          ))}
        </div>
        <PhotoCard post={FEED[0]} />
        <BattleSpotlight battle={BATTLES[0]} onClick={goToCompete} />
        <PhotoCard post={FEED[1]} />
        <PhotoCard post={FEED[2]} />
      </div>
      <div className="w-[300px] shrink-0 border-l border-[#1C1C20] p-6 hidden xl:block overflow-y-auto">
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
        <div className="rounded-xl border border-[#1C1C20] bg-[#131316] p-4">
          <div className="text-[13px] font-semibold text-[#F5F5F7] mb-1">Golden Hour Portraits</div>
          <div className="text-[11px] text-[#6E6E76] mb-3">Ends in 2d 14h · 412 entries</div>
          <div className="h-1.5 rounded-full bg-[#26262B] overflow-hidden">
            <div className="h-full bg-[#FF4D6D]" style={{ width: "64%" }} />
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
          <div key={t.id} className="mb-4 break-inside-avoid rounded-xl overflow-hidden border border-[#1C1C20] relative group cursor-pointer">
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
        <div className="w-10 h-10 rounded-full border-2 border-[#FF4D6D] flex items-center justify-center text-[12px] font-bold text-[#F5F5F7]">
          {count}
        </div>
        <div>
          <div className="text-[13px] font-semibold text-[#F5F5F7]">Votes today</div>
          <div className="text-[11px] text-[#6E6E76]">Keep going — every vote sharpens the rankings</div>
        </div>
      </div>

      <div className="relative flex items-stretch gap-0 rounded-2xl overflow-hidden border border-[#2A2A2E] max-w-[720px] w-full" style={{ height: 460 }}>
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
                boxShadow: isVoted ? `0 0 40px ${side === "a" ? "#FF4D6D" : "#6E5BFF"}55 inset` : "none",
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
                      style={{ width: `${side === "a" ? pctA : pctB}%`, background: side === "a" ? "#FF4D6D" : "#6E5BFF" }}
                    />
                  </div>
                )}
                {voted && <div className="text-[11px] text-white/80 mt-1">{side === "a" ? pctA : pctB}%</div>}
              </div>
              {isVoted && (
                <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#34D399] flex items-center justify-center">
                  <Check size={14} color="#0A0A0C" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#0A0A0C] border border-[#3A3A40] flex items-center justify-center z-10">
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
            style={{ background: scope === s ? "#FF4D6D" : "#1C1C20", color: scope === s ? "#0A0A0C" : "#A1A1AA" }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[#2A2A2E] bg-[#1C1C20] p-4 flex items-center gap-4 mb-6">
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
              background: p.rank <= 3 ? "#131316" : "transparent",
              borderColor: p.rank <= 3 ? "#2A2A2E" : "#1C1C20",
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

function Profile({ goToMessages, goToBook }) {
  const [tab, setTab] = useState("portfolio");
  const [connectState, setConnectState] = useState("none"); // none, pending, connected
  const p = PHOTOGRAPHERS[2];
  const portfolio = Array.from({ length: 9 }).map((_, i) => img(`port${i}`, 400, 500));

  const cycleConnect = () => {
    if (connectState === "none") setConnectState("pending");
    else if (connectState === "pending") setConnectState("connected");
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="relative h-[240px]">
        <img src={p.cover} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] to-transparent" />
      </div>
      <div className="px-8 -mt-14 relative">
        <div className="flex items-end justify-between">
          <div className="flex items-end gap-4">
            <img src={p.avatar} className="w-28 h-28 rounded-2xl object-cover border-4 border-[#0A0A0C]" />
            <div className="pb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-[22px] font-bold text-[#F5F5F7]">{p.name}</h2>
                <RankBadge rank={p.rank} size={26} />
              </div>
              <div className="text-[13px] text-[#A1A1AA] flex items-center gap-1"><MapPin size={12} />{p.location}</div>
              {connectState === "connected" && (
                <div className="text-[12px] text-[#6E5BFF] mt-1">42 mutual connections</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
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
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <StatPill icon={User} label="12.4k followers" />
          <StatPill icon={Trophy} label={`${p.points.toLocaleString()} pts`} />
          <StatPill icon={Star} label={`${p.rating} rating`} />
          <StatPill icon={Award} label="18 wins" />
        </div>

        <p className="text-[13px] text-[#D4D4D8] max-w-xl mt-4 leading-relaxed">
          Wedding & editorial photographer based in Lagos. Ten years documenting real moments, not staged ones. Available for travel across West Africa.
        </p>

        <div className="flex gap-6 mt-8 border-b border-[#1C1C20]">
          {["portfolio", "timeline", "achievements", "reviews"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="pb-3 text-[13px] font-medium capitalize border-b-2 transition-colors"
              style={{ borderColor: tab === t ? "#FF4D6D" : "transparent", color: tab === t ? "#F5F5F7" : "#6E6E76" }}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="py-6 pb-12">
          {tab === "portfolio" && (
            <div className="grid grid-cols-3 gap-3">
              {portfolio.map((src, i) => (
                <img key={i} src={src} className="w-full aspect-[4/5] object-cover rounded-xl border border-[#1C1C20]" />
              ))}
            </div>
          )}
          {tab === "timeline" && (
            <div className="flex flex-col gap-6 max-w-lg">
              {[
                { date: "Mar 2026", text: "Hit #1 in Wedding category globally." },
                { date: "Nov 2025", text: "Upgraded primary kit — first full-frame mirrorless body." },
                { date: "Jun 2025", text: "First challenge win — 'Golden Hour Portraits'." },
                { date: "Jan 2025", text: "Joined LensLeague, first upload." },
              ].map((e, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#FF4D6D] mt-1.5" />
                    {i < 3 && <div className="w-px flex-1 bg-[#2A2A2E] mt-1" />}
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
              {["Crown", "Flame", "Trophy", "Star", "Award", "Camera"].map((name, i) => (
                <div key={name} className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: i < 4 ? "#1C1C20" : "#131316", border: `1px solid ${i < 4 ? "#6E5BFF55" : "#1C1C20"}` }}>
                    {name === "Crown" && <Crown size={22} color={i < 4 ? "#FFC24B" : "#3A3A40"} />}
                    {name === "Flame" && <Flame size={22} color={i < 4 ? "#FF4D6D" : "#3A3A40"} />}
                    {name === "Trophy" && <Trophy size={22} color={i < 4 ? "#FFC24B" : "#3A3A40"} />}
                    {name === "Star" && <Star size={22} color={i < 4 ? "#6E5BFF" : "#3A3A40"} />}
                    {name === "Award" && <Award size={22} color={i < 4 ? "#34D399" : "#3A3A40"} />}
                    {name === "Camera" && <Camera size={22} color={i < 4 ? "#60A5FA" : "#3A3A40"} />}
                  </div>
                  <span className="text-[10px] text-[#6E6E76] text-center">{i < 4 ? "Unlocked" : "Locked"}</span>
                </div>
              ))}
            </div>
          )}
          {tab === "reviews" && (
            <div className="flex flex-col gap-4 max-w-lg">
              {[
                { name: "Chidera A.", rating: 5, text: "Incredible attention to detail during our wedding shoot. Delivered early too." },
                { name: "Marcus O.", rating: 5, text: "Professional, punctual, and the editorial set exceeded what we briefed." },
              ].map((r, i) => (
                <div key={i} className="rounded-xl border border-[#1C1C20] p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-semibold text-[#F5F5F7]">{r.name}</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={12} color="#FFC24B" fill="#FFC24B" />)}
                    </div>
                  </div>
                  <p className="text-[13px] text-[#A1A1AA]">{r.text}</p>
                </div>
              ))}
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
  const [destination, setDestination] = useState("feed");
  const [category, setCategory] = useState("Portrait");
  const [caption, setCaption] = useState("");
  const [altText, setAltText] = useState("");
  const [gear, setGear] = useState("");
  const [moderation, setModeration] = useState("idle"); // idle, scanning, clear
  const [published, setPublished] = useState(false);

  const rollPhotos = Array.from({ length: 9 }).map((_, i) => img(`roll${i}`, 300, 300));
  const editedSrc = img(chosenSeed, 700, 875);
  const categories = ["Portrait", "Street", "Wedding", "Editorial", "Nature", "Product"];

  const goReview = () => {
    setStep(4);
    setModeration("scanning");
    setTimeout(() => setModeration("clear"), 1400);
  };

  const { uploadPhoto } = useApp();

  const publish = async () => {
    await uploadPhoto({
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
            <div key={s} className="flex-1 h-1 rounded-full" style={{ background: s <= step ? "#FF4D6D" : "#1C1C20" }} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-[18px] font-semibold text-[#F5F5F7] mb-1">Choose a photo</h2>
            <p className="text-[13px] text-[#6E6E76] mb-5">Pick from your library to get started.</p>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {rollPhotos.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setStep(2)}
                  className="aspect-square rounded-lg overflow-hidden border-2 transition-colors"
                  style={{ borderColor: i === 0 ? "#FF4D6D" : "transparent" }}
                >
                  <img src={src} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <PrimaryButton full onClick={() => setStep(2)}>Continue</PrimaryButton>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-[18px] font-semibold text-[#F5F5F7] mb-1">Edit</h2>
            <p className="text-[13px] text-[#6E6E76] mb-5">Light adjustments — crop and tone.</p>
            <div className="rounded-xl overflow-hidden border border-[#1C1C20] mb-5">
              <img src={editedSrc} className="w-full max-h-[420px] object-cover" />
            </div>
            <div className="flex flex-col gap-4 mb-6">
              {["Brightness", "Contrast"].map((label) => (
                <div key={label}>
                  <div className="flex justify-between text-[12px] text-[#A1A1AA] mb-1.5">
                    <span>{label}</span><span>0</span>
                  </div>
                  <input type="range" min="-50" max="50" defaultValue="0" className="w-full accent-[#FF4D6D]" />
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
                  style={{ borderColor: destination === d.key ? "#FF4D6D" : "#1C1C20", background: destination === d.key ? "#1C1C20" : "transparent" }}
                >
                  <div className="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center" style={{ borderColor: destination === d.key ? "#FF4D6D" : "#3A3A40" }}>
                    {destination === d.key && <div className="w-2 h-2 rounded-full bg-[#FF4D6D]" />}
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
              className="w-full rounded-xl bg-[#131316] border border-[#2A2A2E] text-[13px] text-[#F5F5F7] placeholder-[#6E6E76] p-3 mb-1 outline-none resize-none"
              rows={3}
            />
            <div className="text-[11px] text-[#6E6E76] text-right mb-4">{caption.length}/280</div>

            <label className="text-[12px] text-[#A1A1AA] mb-1.5 block">Alt text <span className="text-[#6E6E76]">(accessibility)</span></label>
            <input
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image for screen readers"
              className="w-full rounded-xl bg-[#131316] border border-[#2A2A2E] text-[13px] text-[#F5F5F7] placeholder-[#6E6E76] p-3 mb-4 outline-none"
            />
            {!altText && <div className="text-[11px] text-[#FBBF24] -mt-3 mb-4">Adding alt text helps more people experience your work.</div>}

            <label className="text-[12px] text-[#A1A1AA] mb-1.5 block">Gear used <span className="text-[#6E6E76]">(optional)</span></label>
            <input
              value={gear}
              onChange={(e) => setGear(e.target.value)}
              placeholder="e.g. Sony A7IV, 85mm f/1.4"
              className="w-full rounded-xl bg-[#131316] border border-[#2A2A2E] text-[13px] text-[#F5F5F7] placeholder-[#6E6E76] p-3 mb-6 outline-none"
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

            <div className="rounded-2xl overflow-hidden border border-[#1C1C20] bg-[#131316] mb-5">
              <div className="flex items-center gap-3 px-4 py-3">
                <img src={PHOTOGRAPHERS[0].avatar} className="w-8 h-8 rounded-full object-cover" />
                <div className="text-[13px] font-semibold text-[#F5F5F7]">{PHOTOGRAPHERS[0].name}</div>
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-[#A1A1AA] bg-[#1C1C20] px-2 py-1 rounded-full">{category}</span>
              </div>
              <img src={editedSrc} className="w-full max-h-[380px] object-cover" />
              {caption && <p className="px-4 py-3 text-[13px] text-[#D4D4D8]">{caption}</p>}
            </div>

            <div className="flex items-center gap-2 mb-6 rounded-xl border border-[#1C1C20] px-4 py-3">
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
      style={{ background: on ? "#FF4D6D" : "#2A2A2E" }}
    >
      <div className="w-4.5 h-4.5 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: on ? "22px" : "3px", width: 18, height: 18 }} />
    </button>
  );
}

function SettingsRow({ icon: Icon, label, value, toggle, destructive, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#131316] transition-colors text-left">
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
      <div className="rounded-2xl border border-[#1C1C20] divide-y divide-[#1C1C20] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function SettingsScreen() {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <div className="max-w-lg mx-auto w-full">
        <SettingsGroup title="Account">
          <SettingsRow icon={User} label="Email" value="naledi@example.com" />
          <SettingsRow icon={Lock} label="Password" value="Change" />
          <SettingsRow icon={Sparkles} label="Linked accounts" value="Google" />
        </SettingsGroup>

        <SettingsGroup title="Profile">
          <SettingsRow icon={Camera} label="Public info" value="Edit" />
          <SettingsRow icon={Tag} label="Categories" value="3 selected" />
          <SettingsRow icon={MapPin} label="Location" value="Lagos, NG" />
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
                <button className="flex-1 rounded-xl bg-[#F87171] text-[#0A0A0C] font-semibold text-[12px] py-2">Confirm delete</button>
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
      <div className="w-[320px] shrink-0 border-r border-[#1C1C20] flex flex-col">
        <div className="flex gap-1 p-3">
          {["focused", "other"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 rounded-lg py-2 text-[12px] font-semibold capitalize transition-colors relative"
              style={{ background: tab === t ? "#1C1C20" : "transparent", color: tab === t ? "#F5F5F7" : "#6E6E76" }}
            >
              {t === "focused" ? "Focused" : "Requests"}
              {t === "other" && MESSAGE_REQUESTS.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[#FF4D6D] text-[#0A0A0C] text-[9px] font-bold align-middle">
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
              style={{ background: activeId === c.id ? "#131316" : "transparent" }}
            >
              <img src={c.person.avatar} className="w-11 h-11 rounded-full object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#F5F5F7] truncate">{c.person.name}</span>
                  <span className="text-[11px] text-[#6E6E76] shrink-0 ml-2">{c.time}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[12px] text-[#6E6E76] truncate">{c.lastMsg}</span>
                  {c.unread > 0 && <span className="w-2 h-2 rounded-full bg-[#FF4D6D] shrink-0 ml-2" />}
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
                      <button className="text-[11px] font-semibold text-[#0A0A0C] bg-[#FF4D6D] rounded-full px-3 py-1">Accept</button>
                      <button className="text-[11px] font-semibold text-[#A1A1AA] bg-[#1C1C20] rounded-full px-3 py-1">Ignore</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1C1C20]">
          <img src={active.person.avatar} className="w-9 h-9 rounded-full object-cover" />
          <div>
            <div className="text-[13px] font-semibold text-[#F5F5F7]">{active.person.name}</div>
            <div className="text-[11px] text-[#34D399] flex items-center gap-1"><UserCheck size={11} /> Connected</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3">
          {thread.map((m, i) => (
            <div key={i} className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-[13px] ${m.from === "me" ? "self-end" : "self-start"}`}
              style={{ background: m.from === "me" ? "#FF4D6D" : "#1C1C20", color: m.from === "me" ? "#0A0A0C" : "#F5F5F7" }}>
              {m.text}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-[#1C1C20]">
          <button><Paperclip size={17} color="#6E6E76" /></button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Write a message..."
            className="flex-1 bg-[#131316] border border-[#2A2A2E] rounded-full px-4 py-2.5 text-[13px] text-[#F5F5F7] placeholder-[#6E6E76] outline-none"
          />
          <button onClick={send} className="w-9 h-9 rounded-full bg-[#FF4D6D] flex items-center justify-center shrink-0">
            <Send size={15} color="#0A0A0C" />
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
        <button onClick={onDone} className="mt-2 text-[13px] text-[#FF4D6D]">Back to profile</button>
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
                <button className="w-7 h-7 rounded-full border border-[#2A2A2E] flex items-center justify-center"><ArrowLeft size={13} color="#6E6E76" /></button>
                <button className="w-7 h-7 rounded-full border border-[#2A2A2E] flex items-center justify-center"><ArrowRight size={13} color="#6E6E76" /></button>
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
                      background: isSelected ? "#FF4D6D" : "transparent",
                      color: isUnavailable ? "#3A3A40" : isSelected ? "#0A0A0C" : "#F5F5F7",
                      cursor: isUnavailable ? "not-allowed" : "pointer",
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[11px] text-[#6E6E76]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#FF4D6D]" />Selected</span>
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
                    borderColor: selectedTime === s ? "#FF4D6D" : "#2A2A2E",
                    background: selectedTime === s ? "#FF4D6D22" : "transparent",
                    color: selectedTime === s ? "#FF4D6D" : "#A1A1AA",
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
                style={{ borderColor: format === "inperson" ? "#FF4D6D" : "#2A2A2E", color: format === "inperson" ? "#FF4D6D" : "#A1A1AA" }}
              >
                <PinIcon size={13} /> In person
              </button>
              <button
                onClick={() => setFormat("video")}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-[12px] font-medium"
                style={{ borderColor: format === "video" ? "#FF4D6D" : "#2A2A2E", color: format === "video" ? "#FF4D6D" : "#A1A1AA" }}
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
          className="w-full rounded-xl bg-[#131316] border border-[#2A2A2E] text-[13px] text-[#F5F5F7] placeholder-[#6E6E76] p-3 mb-6 outline-none resize-none"
          rows={3}
        />

        <div className="rounded-xl border border-[#1C1C20] p-4 mb-6 flex items-center justify-between">
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

/* ---------------------------------- App ---------------------------------- */

export default function PrototypeApp({ initialScreen = "landing" }) {
  const [screen, setScreen] = useState(initialScreen);
  const [appAuthModal, setAppAuthModal] = useState(null); // 'login' | 'signup' | null

  const titles = {
    home: "Home", discover: "Discover", compete: "Compete",
    leaderboard: "Leaderboard", profile: "Profile", upload: "Upload", settings: "Settings",
    messages: "Messages", book: "Book a Session",
  };

  if (screen === "landing") {
    return (
      <div style={{ fontFamily: "Inter, ui-sans-serif, system-ui" }} className="w-full h-full">
        <Landing enter={() => setScreen("home")} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Inter, ui-sans-serif, system-ui" }} className="w-full h-full bg-[#0A0A0C] flex overflow-hidden">
      <Sidebar screen={screen} setScreen={setScreen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={titles[screen] || "LensLeague"} onOpenAuth={(mode) => setAppAuthModal(mode)} />
        <div className="flex-1 flex overflow-hidden">
          {screen === "home" && <HomeFeed goToCompete={() => setScreen("compete")} />}
          {screen === "discover" && <Discover />}
          {screen === "compete" && <Compete />}
          {screen === "leaderboard" && <Leaderboard />}
          {screen === "profile" && <Profile goToMessages={() => setScreen("messages")} goToBook={() => setScreen("book")} />}
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
