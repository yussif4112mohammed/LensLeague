import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Logo from '@/components/Logo';
import { Camera, Search, ArrowLeft, Loader2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoginPage() {
  const navigate = useNavigate();
  const { setUserEmail } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setError('');
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/feed'
        }
      });
      if (authError) throw authError;
    } catch (err) {
      setError(err.message || 'Failed to start Google Authentication session.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        setUserEmail(email);
        
        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!profile) {
          const meta = data.user.user_metadata || {};
          const userRole = meta.role || 'photographer';
          const { error: seedError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            name: meta.name || 'Anonymous User',
            username: meta.username || `user_${Date.now().toString(36)}`,
            avatar: null,
            bio: userRole === 'photographer' ? 'LensLeague creator.' : 'Hiring on LensLeague.',
            location: meta.location || 'Global',
            role: userRole,
            verified: false,
            banned: false,
            points: 0,
            global_rank: 99
          });

          if (!seedError) {
            const { data: newProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();
            profile = newProfile;
          }
        }

        const finalRole = profile?.role || data.user.user_metadata?.role || 'photographer';
        if (email === 'admin@lensleague.com') {
          navigate('/admin');
        } else if (finalRole === 'client' || email.includes('client')) {
          navigate('/client/home');
        } else {
          navigate('/feed');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to authenticate user credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col pt-16 pb-24 sm:pt-24 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat relative overflow-y-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-0 fixed" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium mb-8 ml-4 sm:ml-0">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        
        <div className="bg-black/50 backdrop-blur-xl border border-zinc-800/50 py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10">
          
          <Logo withText={true} className="w-10 h-10 mb-8" />

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white mb-2">Welcome back</h2>
          <p className="text-sm text-zinc-400 mb-8">Log in to continue to your account.</p>

          <Button 
            onClick={handleGoogleLogin} 
            variant="outline" 
            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border-none font-bold text-sm rounded-xl mb-6 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-black px-4 text-zinc-500 uppercase tracking-widest font-semibold">Or continue with email</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-zinc-300 mb-1.5">Email address</label>
              <Input
                id="login-email" type="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required autoComplete="email"
                disabled={loading}
                className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-zinc-500 focus:ring-zinc-500 text-white placeholder:text-zinc-600 rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-sm font-medium text-zinc-300">Password</label>
                <Link to="/forgot-password" className="text-xs font-medium text-zinc-400 hover:text-white transition-colors">Forgot password?</Link>
              </div>
              <Input
                id="login-password" type="password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••" required autoComplete="current-password"
                disabled={loading}
                className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-zinc-500 focus:ring-zinc-500 text-white placeholder:text-zinc-600 rounded-xl"
              />
            </div>
            
            <Button type="submit" className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl mt-2 shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.5)]" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Logging in...' : 'Log In'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-400">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-white hover:underline transition-all">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function SignUpPage() {
  const navigate = useNavigate();
  const { setUserEmail } = useApp();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(searchParams.get('role') ? 2 : 1);
  const [role, setRole] = useState(searchParams.get('role') || null);
  const [form, setForm] = useState({ email: '', password: '', name: '', username: '', location: '' });
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerifyNotice, setShowVerifyNotice] = useState(false);

  const CATEGORIES = ['Portrait', 'Landscape', 'Wedding', 'Street', 'Product', 'Nature', 'Editorial', 'Architecture'];

  const toggleCategory = (c) => {
    setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : prev.length < 3 ? [...prev, c] : prev);
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setError('');
    const cleanUsername = form.username.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_.]+$/.test(cleanUsername)) {
      setError('Username can only contain letters, numbers, underscores, and periods.');
      return;
    }

    setLoading(true);
    try {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (existingUser) {
        setError('This username is already taken. Please choose another one.');
        return;
      }

      if (role === 'photographer') {
        setStep(3);
      } else {
        await handleFinish();
      }
    } catch (err) {
      console.warn('Preemptive check error:', err.message);
      if (role === 'photographer') {
        setStep(3);
      } else {
        await handleFinish();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      const cleanUsername = form.username.trim().toLowerCase();
      if (!/^[a-zA-Z0-9_.]+$/.test(cleanUsername)) {
        throw new Error('Username can only contain letters, numbers, underscores, and periods.');
      }

      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (existingUser) {
        throw new Error('This username is already taken. Please choose another one.');
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name: form.name,
            username: cleanUsername,
            role: role,
            location: form.location || 'Global',
            categories: categories
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        setUserEmail(form.email);
        if (authData.session) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: authData.user.id,
            name: form.name,
            username: cleanUsername,
            avatar: `https://images.unsplash.com/photo-${role === 'client' ? '1438761681033-6461ffad8d80' : '1507003211169-0a1dd7228f2d'}?w=100&h=100&fit=crop&q=80`,
            bio: role === 'photographer' ? 'LensLeague creator.' : 'Hiring on LensLeague.',
            location: form.location || 'Global',
            role: role,
            verified: false,
            banned: false,
            points: 0,
            global_rank: 99
          });

          if (profileError) throw profileError;
          navigate(role === 'client' ? '/client/home' : '/feed');
        } else {
          setShowVerifyNotice(true);
        }
      }
    } catch (err) {
      setError(err.message || 'Error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col pt-16 pb-24 sm:pt-24 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1552168324-d612d77725e3?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat relative overflow-y-auto">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-0 fixed" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium mb-8 ml-4 sm:ml-0">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        
        <div className="bg-black/60 backdrop-blur-xl border border-zinc-800/50 py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10">
          
          <Logo withText={true} className="w-10 h-10 mb-6" />

          {showVerifyNotice ? (
            <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Check your email</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                We've sent a verification link to <strong className="text-white">{form.email}</strong>.<br />
                Please click the link to activate your account.
              </p>
              <Button onClick={() => navigate('/login')} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                Go to Log In
              </Button>
            </div>
          ) : (
            <>
              {/* Progress dots */}
              <div className="flex items-center gap-2 mb-8">
                {[1, 2, role === 'photographer' ? 3 : null].filter(Boolean).map(s => (
                  <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-colors", step >= s ? "bg-white" : "bg-zinc-800")} />
                ))}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6">
                  {error}
                </div>
              )}

              {step === 1 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Join LensLeague</h2>
                  <p className="text-sm text-zinc-400 mb-8">Choose how you want to use the platform.</p>
                  
                  <div className="space-y-4">
                    <button 
                      onClick={() => { setRole('photographer'); setStep(2); }}
                      className={cn(
                        "w-full flex items-start gap-4 p-5 rounded-2xl border text-left transition-all",
                        role === 'photographer' ? "bg-zinc-900 border-zinc-700" : "bg-black/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-white mb-1">I'm a Photographer</div>
                        <div className="text-sm text-zinc-400 leading-snug">Build your portfolio, compete in battles, and get discovered by top clients.</div>
                      </div>
                    </button>

                    <button 
                      onClick={() => { setRole('client'); setStep(2); }}
                      className={cn(
                        "w-full flex items-start gap-4 p-5 rounded-2xl border text-left transition-all",
                        role === 'client' ? "bg-zinc-900 border-zinc-700" : "bg-black/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                        <Search className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-white mb-1">I'm Looking to Hire</div>
                        <div className="text-sm text-zinc-400 leading-snug">Find and book top-ranked professional photographers for your next project.</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-2xl font-bold tracking-tight text-white mb-6">Create your account</h2>
                  <form onSubmit={handleStep2Submit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Full Name</label>
                      <Input
                        type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={loading}
                        placeholder="Aria Nakamura"
                        className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-white text-white placeholder:text-zinc-600 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Username</label>
                      <Input
                        type="text" required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} disabled={loading}
                        placeholder="aria.lens"
                        className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-white text-white placeholder:text-zinc-600 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Email</label>
                      <Input
                        type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} disabled={loading}
                        placeholder="you@example.com"
                        className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-white text-white placeholder:text-zinc-600 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Password</label>
                      <Input
                        type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} disabled={loading}
                        placeholder="Min. 8 characters"
                        className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-white text-white placeholder:text-zinc-600 rounded-xl"
                      />
                    </div>
                    <Button type="submit" className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl mt-4 shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.5)]" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {role === 'photographer' ? 'Continue' : 'Create Account'}
                    </Button>
                  </form>
                </div>
              )}

              {step === 3 && role === 'photographer' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Your style</h2>
                  <p className="text-sm text-zinc-400 mb-6">Pick up to 3 categories. This seeds your initial leaderboard placement.</p>
                  
                  <div className="flex flex-wrap gap-2 mb-8">
                    {CATEGORIES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCategory(c)}
                        disabled={loading}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-semibold transition-all border",
                          categories.includes(c) 
                            ? "bg-primary text-primary-foreground border-primary shadow-[0_0_10px_rgba(212,175,55,0.4)]" 
                            : "bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  <div className="mb-8">
                    <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Location</label>
                    <Input
                      type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} disabled={loading}
                      placeholder="e.g. New York, NY"
                      className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-white text-white placeholder:text-zinc-600 rounded-xl"
                    />
                  </div>

                  <Button onClick={handleFinish} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.5)]" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Start Competing
                  </Button>
                </div>
              )}

              <p className="mt-8 text-center text-sm text-zinc-400">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-white hover:underline transition-all">Log in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
