import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Logo from '@/components/Logo';
import { ArrowLeft, Loader2, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login'
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col pt-16 pb-24 sm:pt-24 sm:px-6 lg:px-8 relative overflow-y-auto">
      <div className="absolute inset-0 bg-black z-0 fixed" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Link to="/login" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium mb-8 ml-4 sm:ml-0">
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
        
        <div className="bg-black/60 backdrop-blur-xl border border-zinc-800/50 py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10">
          
          <Logo withText={true} className="w-10 h-10 mb-6" />

          {sent ? (
            <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Check your email</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                We've sent a password reset link to <strong className="text-white">{email}</strong>.<br />
                Click the link in the email to reset your password.
              </p>
              <Button onClick={() => window.open('https://mail.google.com', '_blank')} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold">
                Open Email App
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Reset your password</h2>
              <p className="text-sm text-zinc-400 mb-8">Enter your email and we'll send you a link to reset your password.</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-zinc-300 mb-1.5">Email address</label>
                  <Input
                    id="reset-email" type="email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required autoComplete="email"
                    disabled={loading}
                    className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-zinc-500 focus:ring-zinc-500 text-white placeholder:text-zinc-600 rounded-xl"
                  />
                </div>
                
                <Button type="submit" className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-black" />}
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>

              <p className="mt-8 text-center text-sm text-zinc-400">
                Remember your password?{' '}
                <Link to="/login" className="font-semibold text-white hover:underline transition-all">Log in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
