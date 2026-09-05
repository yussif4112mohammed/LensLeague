import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '../../lib/supabaseClient';
import Logo from '@/components/Logo';
import { ArrowUpRight, ArrowRight } from 'lucide-react';

const HOW_STEPS = [
  { icon: '📷', step: '01', title: 'Upload Your Work', desc: 'Publish once to your gallery and feed; eligible work joins a live competition automatically.' },
  { icon: '⚔️', step: '02', title: 'Compete & Get Voted', desc: 'Battle other photographers head-to-head. Community votes decide.' },
  { icon: '💼', step: '03', title: 'Get Hired', desc: 'Clients search by rank, style, and location. Your score is your credential.' },
];

/* What a round is, and the four tiers a category room awards (migration v12,
   docs/PRODUCT.md).

   Both blocks below replaced invented people. The hero card presented a
   photographer who does not exist as the week's highest rated, over a stock
   photograph of a real stranger, claimed she was available for hire, and gave
   her a global rank and an Elo rating - two things this product does not have.
   The section further down listed three more invented photographers with
   invented point totals. Named people belong on this page only once they are
   real, and the honest version of that is the Weekly Cover. */
const ROUND_STEPS = [
  { title: 'You upload once',     desc: 'It lands in your gallery and the feed, and joins a round automatically.' },
  { title: 'Matched, not ranked', desc: 'Paired against comparable work in the same category.' },
  { title: 'The room votes',      desc: 'Twenty-four hours. Neither photographer can vote on their own round.' },
  { title: 'Recognition',         desc: 'Points are awarded by the server, and everyone who entered is named.' },
];

const RECOGNITION_TIERS = [
  { label: 'Winner',            desc: 'Took the room outright.' },
  { label: 'Runner-up',         desc: 'Separated by a handful of votes.' },
  { label: 'Honorable mention', desc: 'The work the room kept coming back to.' },
  { label: 'Participated',      desc: 'Entered, judged, and named on the board.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
        if (count !== null) setUserCount(count);
      } catch (err) {
        console.warn('Failed to fetch user count');
      }
    };
    fetchUserCount();
  }, []);

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
              Photographers <span className="text-xs bg-secondary px-1.5 py-0.5 rounded-full text-foreground" title="Registered users">{userCount > 0 ? userCount.toLocaleString() : 'Join early'}</span>
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
              <span className="w-1.5 h-1.5 rounded-full bg-card animate-pulse" />
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
                  <div className="text-xs font-mono text-muted-foreground mb-5 uppercase tracking-wider">
                    How a round works
                  </div>
                  <ol className="space-y-4">
                    {ROUND_STEPS.map((r, i) => (
                      <li key={r.title} className="flex gap-4">
                        <span className="font-mono text-xs text-muted-foreground/70 tabular-nums pt-1 w-4 shrink-0">
                          {i + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{r.title}</span>
                          <span className="block text-sm text-muted-foreground">{r.desc}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="p-6 bg-secondary/30 flex justify-between items-center gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-muted-foreground">Photographers so far</div>
                    <div className="text-2xl font-black tabular-nums">
                      {userCount > 0 ? userCount.toLocaleString() : 'Be the first'}
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" className="rounded-full shrink-0" onClick={() => navigate('/signup')}>
                    Join them
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

      {/* Recognition */}
      <section className="py-24 px-6 bg-background relative z-10 border-t border-border/30">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Recognition, not ranking</h2>
              <p className="text-muted-foreground mt-2 max-w-xl">
                Every category room ends the same way. Four tiers, everyone who entered is named,
                and no losses are published anywhere.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/signup')}>Enter a room</Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {RECOGNITION_TIERS.map((t, i) => (
              <Card
                key={t.label}
                className="bg-secondary/10 border-border/40 hover:bg-secondary/30 transition-colors animate-entrance"
                style={{ animationDelay: `${0.08 * i}s` }}
              >
                <CardContent className="p-5 sm:p-6 flex items-baseline gap-4">
                  <div className="font-mono text-xs text-muted-foreground/70 tabular-nums w-4 shrink-0">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base sm:text-lg font-bold">{t.label}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-sm text-muted-foreground mt-8 max-w-xl">
            Photographs are matched against comparable work, not thrown into one open ladder.
            A tie stays a tie, and a round nobody saw is scored for nobody.
          </p>
        </div>
      </section>

      {/* New Dribbble-style Footer */}
      <footer className="bg-background py-16 px-4 sm:px-6 relative z-10 border-t border-border">
        <div className="max-w-6xl mx-auto">
          
          {/* CTA Card */}
          <div className="bg-card rounded-[2.5rem] border border-border/50 p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12 mb-20 overflow-hidden relative shadow-2xl">
            {/* Background concentric circles for effect */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 opacity-20 pointer-events-none hidden md:block">
               <div className="w-[600px] h-[600px] border border-foreground rounded-full flex items-center justify-center">
                  <div className="w-[400px] h-[400px] border border-foreground rounded-full flex items-center justify-center">
                    <div className="w-[200px] h-[200px] border border-foreground rounded-full"></div>
                  </div>
               </div>
            </div>

            <div className="md:w-1/2 relative z-10">
              <div className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4">Start your journey</div>
              <h2 className="text-3xl md:text-5xl font-black text-foreground mb-6 leading-tight">
                Join the LensLeague Arena
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-md">
                Battle head-to-head in photography challenges, climb the global rankings, and get discovered by elite clients.
              </p>
              <Button onClick={() => navigate('/signup')} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-base font-bold group">
                Get Started 
                <ArrowUpRight className="w-5 h-5 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Button>
            </div>

            <div className="md:w-1/2 h-[300px] relative hidden md:block">
               {/* Abstract Avatars on concentric circles */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-border/30 rounded-full flex items-center justify-center">
                 <div className="w-[250px] h-[250px] border border-border/30 rounded-full flex items-center justify-center">
                    <div className="w-[100px] h-[100px] border border-border/30 rounded-full flex items-center justify-center bg-background shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                       <Logo className="w-8 h-8" />
                    </div>
                 </div>
               </div>
               
               {/* Avatars */}
               <Avatar className="absolute top-[20%] left-[20%] w-12 h-12 border-2 border-border shadow-xl"><AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&q=80" /></Avatar>
               <Avatar className="absolute bottom-[20%] right-[30%] w-10 h-10 border-2 border-border shadow-xl"><AvatarImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=80" /></Avatar>
               <Avatar className="absolute top-[40%] right-[10%] w-14 h-14 border-2 border-border shadow-xl"><AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&q=80" /></Avatar>
               <Avatar className="absolute bottom-[30%] left-[15%] w-10 h-10 border-2 border-border shadow-xl"><AvatarImage src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&q=80" /></Avatar>
            </div>
          </div>

          {/* Links Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16 px-4">
            <div className="md:col-span-4">
              <div className="flex items-center gap-2 mb-6">
                 <Logo withText={true} className="w-8 h-8" />
              </div>
              <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                The premier global arena for visual creatives. Compete, rank up, and build your legacy.
              </p>
            </div>

            <div className="md:col-span-2">
               <h4 className="text-foreground font-bold mb-6 text-sm">Platform</h4>
               <ul className="space-y-4 text-sm font-medium text-muted-foreground">
                 <li><a href="#" className="hover:text-foreground transition-colors flex items-center gap-1 group">Photographers <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></a></li>
                 <li><a href="#" className="hover:text-foreground transition-colors flex items-center gap-1 group">Clients <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></a></li>
                 <li><a href="#" className="hover:text-foreground transition-colors flex items-center gap-1 group">Leaderboard <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></a></li>
               </ul>
            </div>

            <div className="md:col-span-2">
               <h4 className="text-foreground font-bold mb-6 text-sm">Socials</h4>
               <ul className="space-y-4 text-sm font-medium text-muted-foreground">
                 <li><a href="#" className="hover:text-foreground transition-colors flex items-center justify-between group">Instagram <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" /></a></li>
                 <li><a href="#" className="hover:text-foreground transition-colors flex items-center justify-between group">Twitter/X <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" /></a></li>
                 <li><a href="#" className="hover:text-foreground transition-colors flex items-center justify-between group">YouTube <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" /></a></li>
               </ul>
            </div>

            <div className="md:col-span-4">
               <h4 className="text-foreground font-bold mb-6 text-sm">Get started</h4>
               <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
                 Build your visual identity, enter battles automatically, and get discovered by clients.
               </p>
               <button
                 onClick={() => navigate('/signup')}
                 className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
               >
                 Create your account
                 <ArrowRight className="w-4 h-4" />
               </button>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border/50 px-4 text-xs font-medium text-muted-foreground gap-4">
             <div className="flex flex-col gap-1">
               <span>© {new Date().getFullYear()} LensLeague. All rights reserved. Engineered for visual creators worldwide.</span>
               <span className="text-muted-foreground font-semibold tracking-wide">A Noble Stature Studios company</span>
             </div>
             <div className="flex items-center gap-6">
                <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" /> All systems operational</span>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
