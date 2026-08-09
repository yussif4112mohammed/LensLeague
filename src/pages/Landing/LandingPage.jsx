import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Logo from '@/components/Logo';
import { ArrowUpRight, ArrowRight } from 'lucide-react';

const HOW_STEPS = [
  { icon: '📷', step: '01', title: 'Upload Your Work', desc: 'Share photos to your portfolio, feed, or enter live competitions.' },
  { icon: '⚔️', step: '02', title: 'Compete & Get Voted', desc: 'Battle other photographers head-to-head. Community votes decide.' },
  { icon: '💼', step: '03', title: 'Get Hired', desc: 'Clients search by rank, style, and location. Your score is your credential.' },
];

const TOP_PHOTOGRAPHERS = [
  { name: 'Aria Nakamura', rank: 1, location: 'New York', pts: '48.2k', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&q=80' },
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
            <Logo withText={true} className="w-8 h-8" />
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
          <Button onClick={() => navigate('/signup')} className="rounded-full px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)]">
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
              <Button size="lg" className="rounded-full px-8 bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-base font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:-translate-y-0.5" onClick={() => navigate('/signup?role=photographer')}>
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

      {/* New Dribbble-style Footer */}
      <footer className="bg-zinc-950 py-16 px-4 sm:px-6 relative z-10 border-t border-zinc-900">
        <div className="max-w-6xl mx-auto">
          
          {/* CTA Card */}
          <div className="bg-zinc-900 rounded-[2.5rem] border border-zinc-800/50 p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12 mb-20 overflow-hidden relative shadow-2xl">
            {/* Background concentric circles for effect */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 opacity-20 pointer-events-none hidden md:block">
               <div className="w-[600px] h-[600px] border border-white rounded-full flex items-center justify-center">
                  <div className="w-[400px] h-[400px] border border-white rounded-full flex items-center justify-center">
                    <div className="w-[200px] h-[200px] border border-white rounded-full"></div>
                  </div>
               </div>
            </div>

            <div className="md:w-1/2 relative z-10">
              <div className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4">Start your journey</div>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
                Join the LensLeague Arena
              </h2>
              <p className="text-zinc-400 text-lg mb-8 max-w-md">
                Battle head-to-head in photography challenges, climb the global rankings, and get discovered by elite clients.
              </p>
              <Button onClick={() => navigate('/signup')} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-base font-bold group">
                Get Started 
                <ArrowUpRight className="w-5 h-5 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Button>
            </div>

            <div className="md:w-1/2 h-[300px] relative hidden md:block">
               {/* Abstract Avatars on concentric circles */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-zinc-700/30 rounded-full flex items-center justify-center">
                 <div className="w-[250px] h-[250px] border border-zinc-700/30 rounded-full flex items-center justify-center">
                    <div className="w-[100px] h-[100px] border border-zinc-700/30 rounded-full flex items-center justify-center bg-zinc-950 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                       <Logo className="w-8 h-8" />
                    </div>
                 </div>
               </div>
               
               {/* Avatars */}
               <Avatar className="absolute top-[20%] left-[20%] w-12 h-12 border-2 border-zinc-900 shadow-xl"><AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&q=80" /></Avatar>
               <Avatar className="absolute bottom-[20%] right-[30%] w-10 h-10 border-2 border-zinc-900 shadow-xl"><AvatarImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=80" /></Avatar>
               <Avatar className="absolute top-[40%] right-[10%] w-14 h-14 border-2 border-zinc-900 shadow-xl"><AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&q=80" /></Avatar>
               <Avatar className="absolute bottom-[30%] left-[15%] w-10 h-10 border-2 border-zinc-900 shadow-xl"><AvatarImage src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&q=80" /></Avatar>
            </div>
          </div>

          {/* Links Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16 px-4">
            <div className="md:col-span-4">
              <div className="flex items-center gap-2 mb-6">
                 <Logo withText={true} className="w-8 h-8" />
              </div>
              <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
                The premier global arena for visual creatives. Compete, rank up, and build your legacy.
              </p>
            </div>

            <div className="md:col-span-2">
               <h4 className="text-white font-bold mb-6 text-sm">Platform</h4>
               <ul className="space-y-4 text-sm font-medium text-zinc-400">
                 <li><a href="#" className="hover:text-white transition-colors flex items-center gap-1 group">Photographers <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></a></li>
                 <li><a href="#" className="hover:text-white transition-colors flex items-center gap-1 group">Clients <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></a></li>
                 <li><a href="#" className="hover:text-white transition-colors flex items-center gap-1 group">Leaderboard <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></a></li>
               </ul>
            </div>

            <div className="md:col-span-2">
               <h4 className="text-white font-bold mb-6 text-sm">Socials</h4>
               <ul className="space-y-4 text-sm font-medium text-zinc-400">
                 <li><a href="#" className="hover:text-white transition-colors flex items-center justify-between group">Instagram <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white transition-colors" /></a></li>
                 <li><a href="#" className="hover:text-white transition-colors flex items-center justify-between group">Twitter/X <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white transition-colors" /></a></li>
                 <li><a href="#" className="hover:text-white transition-colors flex items-center justify-between group">YouTube <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white transition-colors" /></a></li>
               </ul>
            </div>

            <div className="md:col-span-4">
               <h4 className="text-white font-bold mb-6 text-sm">Newsletter</h4>
               <p className="text-zinc-500 text-sm mb-4 leading-relaxed">
                 Receive product updates, exclusive photography tips, and early access to challenges.
               </p>
               <div className="relative">
                 <input type="email" placeholder="Enter your email..." className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-3.5 pl-5 pr-14 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600" />
                 <button className="absolute right-1.5 top-1.5 bottom-1.5 w-10 rounded-full bg-white flex items-center justify-center hover:bg-zinc-200 transition-colors">
                   <ArrowRight className="w-4 h-4 text-black" />
                 </button>
               </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-zinc-900/50 px-4 text-xs font-medium text-zinc-500 gap-4">
             <div>© {new Date().getFullYear()} LensLeague. All rights reserved. Engineered for visual creators worldwide.</div>
             <div className="flex items-center gap-6">
                <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" /> All systems operational</span>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
