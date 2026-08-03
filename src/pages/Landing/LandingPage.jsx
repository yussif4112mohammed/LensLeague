import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const HOW_STEPS = [
  { icon: '📷', step: '01', title: 'Upload Your Work', desc: 'Share photos to your portfolio, feed, or enter live competitions.' },
  { icon: '⚔️', step: '02', title: 'Compete & Get Voted', desc: 'Battle other photographers head-to-head. Community votes decide.' },
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
    <div className="w-full min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-background/60 backdrop-blur-xl border-b border-border/40 animate-entrance">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
              <span className="text-xl">📸</span>
            </div>
            <span className="font-black text-xl tracking-tight">LensLeague</span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <button onClick={() => navigate('/signup?role=photographer')} className="hover:text-foreground transition-colors bg-transparent border-0 cursor-pointer flex items-center gap-1.5">
              Photographers <span className="text-xs bg-secondary px-1.5 py-0.5 rounded-full text-foreground">1.4k</span>
            </button>
            <button onClick={() => navigate('/signup?role=client')} className="hover:text-foreground transition-colors bg-transparent border-0 cursor-pointer">
              Leaderboard
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => navigate('/login')}>
            Sign In
          </Button>
          <Button onClick={() => navigate('/signup')} className="rounded-full px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-[0_0_15px_rgba(212,175,55,0.4)]">
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 lg:pt-48 lg:pb-32 overflow-hidden flex items-center justify-center min-h-[85vh]">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=2000&q=85" 
            alt="Hero Photography Background" 
            className="w-full h-full object-cover opacity-50 scale-105 animate-[pulse_15s_ease-in-out_infinite]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/60 to-background" />
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col items-start animate-entrance" style={{ animationDelay: '0.1s' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-foreground text-xs font-mono font-medium tracking-wide uppercase mb-8 border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              The Premier League for Photography
            </div>

            <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tighter mb-6">
              Elevate Your <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-yellow-200">Visual Legacy.</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-md leading-relaxed mb-10">
              Where raw visual talent meets head-to-head competition. Join the global arena for elite photographers and high-end clients.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Button size="lg" className="rounded-full px-8 bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-base font-bold shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] hover:-translate-y-0.5" onClick={() => navigate('/signup?role=photographer')}>
                Start Competing
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8 h-14 border-border text-foreground hover:bg-secondary text-base font-medium" onClick={() => navigate('/signup?role=client')}>
                Hire a Pro
              </Button>
            </div>
          </div>

          <div className="relative w-full max-w-md mx-auto lg:ml-auto animate-entrance" style={{ animationDelay: '0.3s' }}>
            <Card className="bg-background/40 backdrop-blur-2xl border-white/10 shadow-2xl overflow-hidden rounded-[2rem]">
              <CardContent className="p-0">
                <div className="p-6 border-b border-border/40">
                  <div className="text-xs font-mono text-muted-foreground mb-4 uppercase tracking-wider">Top Rated This Week</div>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-white/20">
                      <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&q=80" />
                      <AvatarFallback>AN</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold">Aria Nakamura</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Available for Hire
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-secondary/30 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Global Rank</div>
                    <div className="text-2xl font-black">#1</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Elo Rating</div>
                    <div className="text-2xl font-black">2,450</div>
                  </div>
                  <Button variant="secondary" size="sm" className="rounded-full" onClick={() => navigate('/signup')}>
                    View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-background relative z-10 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 animate-entrance">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Precision Engineered for Creatives</h2>
            <p className="text-lg text-muted-foreground">Everything you need to compete, rank up globally, and get booked by high-paying clients.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_STEPS.map((step, i) => (
              <Card key={step.step} className="bg-secondary/20 border-border/50 hover:border-border transition-colors animate-entrance" style={{ animationDelay: `${0.1 * i}s` }}>
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl mb-6">
                    {step.icon}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground mb-2">STEP {step.step}</div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboard Teaser */}
      <section className="py-24 px-6 bg-background relative z-10 border-t border-border/30">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Live Standings</h2>
              <p className="text-muted-foreground mt-2">The current heavyweights in the arena.</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/signup')}>View Full Leaderboard</Button>
          </div>

          <div className="grid gap-4">
            {TOP_PHOTOGRAPHERS.map((p, i) => (
              <Card key={p.name} className="bg-secondary/10 border-border/40 hover:bg-secondary/30 transition-colors cursor-pointer animate-entrance" style={{ animationDelay: `${0.1 * i}s` }} onClick={() => navigate('/signup')}>
                <CardContent className="p-4 sm:p-6 flex items-center gap-4 sm:gap-6">
                  <div className="text-2xl font-black w-8 text-center text-muted-foreground">#{p.rank}</div>
                  <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border border-border">
                    <AvatarImage src={p.avatar} />
                    <AvatarFallback>{p.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base sm:text-lg font-bold truncate">{p.name}</h4>
                    <p className="text-sm text-muted-foreground truncate">{p.location}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-sm sm:text-base">{p.pts}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Points</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Fat Footer */}
      <footer className="py-20 px-6 border-t border-border/40 bg-zinc-950 text-sm text-zinc-400">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 font-black text-white text-xl mb-6">
              <span className="text-2xl">📸</span> LensLeague
            </div>
            <p className="text-zinc-400 leading-relaxed max-w-sm mb-6">
              The premier global arena for visual creatives. Battle head-to-head in photography challenges, climb the global Elo rankings, and get discovered by elite clients seeking unparalleled visual legacy.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-white hover:text-black transition-colors">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-white hover:text-black transition-colors">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 tracking-wide">Platform</h4>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-white transition-colors">Photographers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Clients</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Global Leaderboard</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Live Challenges</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing & Plans</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 tracking-wide">Company</h4>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Press & Media</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between pt-8 border-t border-zinc-900 gap-4">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" /> All systems operational</span>
          </div>
          <div>© {new Date().getFullYear()} LensLeague. Engineered for brilliance in Tokyo.</div>
        </div>
      </footer>
    </div>
  );
}
