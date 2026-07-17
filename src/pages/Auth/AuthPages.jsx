import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { PrimaryButton } from '../../components/Buttons/Buttons';
import { supabase } from '../../lib/supabaseClient';
import './AuthPages.css';

import { useApp } from '../../context/AppContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { setUserEmail } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        
        // Fetch role to navigate
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (email === 'admin@lensleague.com') {
          navigate('/admin');
        } else if (profile?.role === 'client' || email.includes('client')) {
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
    <div className="auth-page">
      <div className="auth-card animate-scale-in">
        <div className="auth-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="var(--accent-primary)"/>
            <path d="M8 22l6-8 4 5 3-3 5 6H8z" fill="white" opacity="0.9"/>
            <circle cx="22" cy="10" r="3" fill="white"/>
          </svg>
          <span className="display-lg">LensLeague</span>
        </div>
        <h1 className="heading-1">Welcome back</h1>
        <p className="body-md text-secondary">Log in to continue to your account.</p>

        <div className="auth-oauth">
          <button className="oauth-btn" id="oauth-google" onClick={() => navigate('/feed')}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
        </div>

        <div className="auth-divider"><span>or continue with email</span></div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label htmlFor="login-email" className="form-label">Email</label>
            <input
              id="login-email" type="email" className="form-input"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required autoComplete="email"
              disabled={loading}
            />
          </div>
          <div className="form-field">
            <div className="form-label-row">
              <label htmlFor="login-password" className="form-label">Password</label>
              <Link to="/forgot-password" className="form-forgot">Forgot password?</Link>
            </div>
            <input
              id="login-password" type="password" className="form-input"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••" required autoComplete="current-password"
              disabled={loading}
            />
          </div>
          <PrimaryButton type="submit" fullWidth id="login-submit-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </PrimaryButton>
        </form>

        <p className="auth-switch body-md text-secondary">
          Don't have an account? <Link to="/signup" className="auth-link">Sign up</Link>
        </p>
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

  const CATEGORIES = ['Portrait', 'Landscape', 'Wedding', 'Street', 'Product', 'Nature', 'Editorial', 'Architecture'];

  const toggleCategory = (c) => {
    setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : prev.length < 3 ? [...prev, c] : prev);
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Sign Up in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        setUserEmail(form.email);

        // 2. Seed profile record in custom profiles table
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          name: form.name,
          username: form.username,
          avatar: `https://images.unsplash.com/photo-${role === 'client' ? '1438761681033-6461ffad8d80' : '1507003211169-0a1dd7228f2d'}?w=100&h=100&fit=crop&q=80`,
          bio: role === 'photographer' ? 'LensLeague creator.' : 'Hiring on LensLeague.',
          location: form.location || 'Tokyo, Japan',
          role: role,
          verified: false,
          banned: false,
          points: 0,
          global_rank: 99
        });

        if (profileError) throw profileError;

        navigate(role === 'client' ? '/client/home' : '/feed');
      }
    } catch (err) {
      setError(err.message || 'Error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-scale-in">
        <div className="auth-logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="var(--accent-primary)"/>
            <path d="M8 22l6-8 4 5 3-3 5 6H8z" fill="white" opacity="0.9"/>
            <circle cx="22" cy="10" r="3" fill="white"/>
          </svg>
          <span className="display-lg">LensLeague</span>
        </div>

        {/* Step dots */}
        <div className="signup-steps">
          {[1, 2, role === 'photographer' ? 3 : null].filter(Boolean).map(s => (
            <div key={s} className={`signup-step-dot ${step >= s ? 'signup-step-dot--active' : ''}`} />
          ))}
        </div>

        {error && <div className="auth-error">{error}</div>}

        {step === 1 && (
          <>
            <h1 className="heading-1">Join LensLeague</h1>
            <p className="body-md text-secondary">Who are you joining as?</p>
            <div className="role-cards">
              <button className={`role-card ${role === 'photographer' ? 'role-card--selected' : ''}`} id="role-photographer"
                onClick={() => { setRole('photographer'); setStep(2); }}>
                <span className="role-card__icon">📷</span>
                <div className="heading-2">I'm a Photographer</div>
                <div className="body-sm text-secondary">Build your portfolio, compete, and get discovered by clients.</div>
              </button>
              <button className={`role-card ${role === 'client' ? 'role-card--selected' : ''}`} id="role-client"
                onClick={() => { setRole('client'); setStep(2); }}>
                <span className="role-card__icon">🔍</span>
                <div className="heading-2">I'm Looking to Hire</div>
                <div className="body-sm text-secondary">Find and book top-ranked photographers for your projects.</div>
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="heading-1">Create your account</h1>
            <form onSubmit={e => { e.preventDefault(); role === 'photographer' ? setStep(3) : handleFinish(); }} className="auth-form">
              <div className="form-field">
                <label htmlFor="signup-name" className="form-label">Full Name</label>
                <input id="signup-name" type="text" className="form-input" placeholder="e.g. Aria Nakamura" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={loading} />
              </div>
              <div className="form-field">
                <label htmlFor="signup-username" className="form-label">Username</label>
                <input id="signup-username" type="text" className="form-input" placeholder="e.g. aria.lens" required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} disabled={loading} />
              </div>
              <div className="form-field">
                <label htmlFor="signup-email" className="form-label">Email</label>
                <input id="signup-email" type="email" className="form-input" placeholder="you@example.com" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} disabled={loading} />
              </div>
              <div className="form-field">
                <label htmlFor="signup-password" className="form-label">Password</label>
                <input id="signup-password" type="password" className="form-input" placeholder="Min. 8 characters" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} disabled={loading} />
              </div>
              <PrimaryButton type="submit" fullWidth id="signup-submit-btn" disabled={loading}>
                {loading ? 'Creating...' : role === 'photographer' ? 'Continue →' : 'Create Account'}
              </PrimaryButton>
            </form>
          </>
        )}

        {step === 3 && role === 'photographer' && (
          <>
            <h1 className="heading-1">Your photography style</h1>
            <p className="body-md text-secondary">Pick up to 3 categories. This seeds your leaderboard placement.</p>
            <div className="category-chips">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  className={`category-chip ${categories.includes(c) ? 'category-chip--selected' : ''}`}
                  onClick={() => toggleCategory(c)}
                  id={`cat-${c.toLowerCase()}`}
                  disabled={loading}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="form-field">
              <label htmlFor="signup-location" className="form-label">Location (City, Country)</label>
              <input id="signup-location" type="text" className="form-input" placeholder="e.g. London, UK" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} disabled={loading} />
            </div>
            <PrimaryButton fullWidth id="signup-finish-btn" onClick={handleFinish} disabled={loading}>
              {loading ? 'Completing...' : 'Start Competing 🏆'}
            </PrimaryButton>
          </>
        )}

        <p className="auth-switch body-md text-secondary" style={{ marginTop: 12 }}>
          Already have an account? <Link to="/login" className="auth-link">Log in</Link>
        </p>
      </div>
    </div>
  );
}

