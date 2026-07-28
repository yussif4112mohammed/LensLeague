import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const PHOTO_MOSAIC = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=85',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=85',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=600&q=85',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=85',
  'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&q=85',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&q=85',
];

const STATS = [
  { value: '48K+', label: 'Photographers' },
  { value: '1,240', label: 'Competitions' },
  { value: '12.8K', label: 'Bookings Made' },
];

const HOW_STEPS = [
  { icon: '📷', step: '01', title: 'Upload Your Work', desc: 'Share photos to your portfolio, feed, or enter live competitions — all in one place.' },
  { icon: '⚔️', step: '02', title: 'Compete & Get Voted', desc: 'Battle other photographers head-to-head. Community votes decide who rises on the leaderboard.' },
  { icon: '💼', step: '03', title: 'Get Hired', desc: 'Clients search by rank, style, and location. Your score is your credential.' },
];

const TOP_PHOTOGRAPHERS = [
  { name: 'Aria Nakamura', rank: 1, location: 'Tokyo', pts: '48.2k', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&q=80' },
  { name: 'Marcus Osei', rank: 2, location: 'Lagos', pts: '42.1k', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=80' },
  { name: 'Sofia Reyes', rank: 3, location: 'Mexico City', pts: '38.7k', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&q=80' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen overflow-y-auto bg-[#08080A] text-white font-sans selection:bg-[#FFB020] selection:text-black">

      {/* Top Header Nav — Alpine Style */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 bg-[#08080A]/60 backdrop-blur-2xl border-b border-white/10 transition-all">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFB020] to-[#00E5FF] flex items-center justify-center shadow-[0_0_15px_rgba(255,176,32,0.3)] group-hover:scale-105 transition-transform">
              <span style={{ fontSize: 18 }}>📸</span>
            </div>
            <span className="text-[#F5F5F7] font-black text-[20px] tracking-tight">LensLeague</span>
          </div>

          <div className="hidden lg:flex items-center gap-8 text-[14px] font-medium text-[#D4D4D8]">
            <button onClick={() => navigate('/signup?role=photographer')} className="hover:text-white transition-colors flex items-center bg-transparent border-0 text-inherit cursor-pointer">
              <span>Photographers</span>
              <span className="text-[11px] text-[#FFB020] font-mono ml-1 font-bold">⁽¹·⁴ᵏ⁾</span>
            </button>
            <button onClick={() => navigate('/signup?role=photographer')} className="hover:text-white transition-colors flex items-center bg-transparent border-0 text-inherit cursor-pointer">
              <span>Challenges</span>
              <span className="text-[11px] text-[#FFB020] font-mono ml-1 font-bold">⁽²⁴⁾</span>
            </button>
            <button onClick={() => navigate('/signup?role=client')} className="hover:text-white transition-colors flex items-center bg-transparent border-0 text-inherit cursor-pointer">
              <span>Leaderboard</span>
              <span className="text-[11px] text-[#FFB020] font-mono ml-1 font-bold">⁽¹⁰⁰⁾</span>
            </button>
            <button onClick={() => navigate('/signup?role=client')} className="hover:text-white transition-colors text-[#00E5FF] font-semibold bg-transparent border-0 cursor-pointer">
              Hire a Pro
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2 text-[14px] font-medium text-[#D4D4D8] hover:text-white transition-colors bg-transparent border-0 cursor-pointer"
          >
            Open
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="px-6 py-2.5 rounded-full text-[14px] font-bold text-[#08080A] bg-white hover:bg-[#F5F5F7] shadow-[0_4px_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all border-0 cursor-pointer"
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
                onClick={() => navigate('/signup?role=photographer')}
                className="inline-flex items-center gap-3 bg-[#121216] border border-white/20 hover:border-[#FFB020] text-white px-8 py-4 rounded-full font-bold text-[15px] shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:bg-[#1C1C22] transition-all group cursor-pointer"
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
                  <span className="hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/signup?role=photographer')}>Open Account</span>
                  <span className="hover:text-white cursor-pointer transition-colors" onClick={() => navigate('/signup?role=client')}>Explore</span>
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
                    onClick={() => navigate('/signup?role=client')}
                    className="px-5 py-2 rounded-xl bg-[#08080A] hover:bg-black border border-[#26262E] text-white text-[13px] font-bold inline-flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
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
            { icon: '📸', title: "01. Upload & Showcase", body: "Post your highest resolution work to a clean, full-bleed portfolio built specifically for photography, not compressed squares." },
            { icon: '⚔️', title: "02. Head-to-Head Battles", body: "Enter live 1v1 battles judged by the global photography community. Every vote moves your real-time ranking and Elo score." },
            { icon: '🏆', title: "03. Get Discovered & Hired", body: "Clients search directly by leaderboard rank, verified rating, and category. Top-ranked work gets found and booked first." },
          ].map(({ icon, title, body }) => (
            <div key={title} className="rounded-[24px] border border-white/10 bg-[#121216]/60 p-8 hover:border-[#FFB020]/50 transition-all group cursor-pointer hover:-translate-y-1.5 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-[#1C1C22] border border-white/10 flex items-center justify-center mb-6 group-hover:bg-[#FFB020]/15 group-hover:border-[#FFB020]/40 transition-all text-[26px]">
                {icon}
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
          <button onClick={() => navigate('/signup')} className="text-[#00E5FF] hover:underline text-[14px] font-semibold flex items-center gap-1 bg-transparent border-0 cursor-pointer">
            <span>View Full Leaderboard</span>
            <span>→</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TOP_PHOTOGRAPHERS.map((p) => (
            <div key={p.name} onClick={() => navigate('/signup?role=photographer')} className="rounded-[20px] border border-white/10 bg-[#121216]/80 p-6 flex items-center gap-5 hover:border-[#FFB020]/40 cursor-pointer transition-all hover:scale-[1.02] shadow-lg">
              <div className="text-[24px]">{p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉'}</div>
              <img src={p.avatar} className="w-14 h-14 rounded-full object-cover border-2 border-white/20" />
              <div className="min-w-0 flex-1">
                <div className="text-white font-bold text-[16px] truncate">{p.name}</div>
                <div className="text-[#FFB020] text-[13px] font-mono font-semibold mt-0.5">{p.pts} pts</div>
                <div className="text-[#6E6E76] text-[12px] truncate mt-0.5">{p.location}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="max-w-6xl mx-auto px-8 py-12 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-[13px] text-[#6E6E76] gap-4">
        <div className="font-bold text-white text-[16px]">LensLeague</div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Support</a>
          <a href="#" className="hover:text-white transition-colors">Blog</a>
        </div>
        <p>© 2026 LensLeague. All rights reserved.</p>
      </footer>
    </div>
  );
}
