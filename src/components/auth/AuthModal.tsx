import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User as UserIcon, AlertCircle, CheckCircle2, Cloud, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../brand/Logo';

interface AuthModalProps {
  onOpenPackageCode?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onOpenPackageCode }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset, authError, setAuthError } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setResetSuccess(false);

    if (!email.trim()) {
      setAuthError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        if (!password) {
          setAuthError('Please enter your password.');
          setLoading(false);
          return;
        }
        await signInWithEmail(email.trim(), password);
      } else if (mode === 'signup') {
        if (password.length < 6) {
          setAuthError('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email.trim(), password, displayName.trim());
      } else if (mode === 'forgot') {
        await sendPasswordReset(email.trim());
        setResetSuccess(true);
      }
    } catch {
      // Error message is set in context
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      // Handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md my-auto rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6 md:p-8 shadow-2xl text-zinc-100">
        <div className="flex flex-col items-center text-center mb-6">
          <Logo size="lg" showText={true} />
          <p className="text-xs text-zinc-400 mt-2">
            Secure, high-capacity cloud storage with up to 988 GB target quota.
          </p>
        </div>

        {/* Tab switch for signin / signup */}
        {mode !== 'forgot' && (
          <div className="flex items-center p-1 bg-zinc-950/60 rounded-xl mb-6 border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setAuthError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                mode === 'signin'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setAuthError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                mode === 'signup'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Google Quick Sign-In */}
        {mode !== 'forgot' && (
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/80 text-sm font-medium text-white transition active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center my-5">
              <div className="flex-1 border-t border-zinc-800" />
              <span className="px-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Or with email
              </span>
              <div className="flex-1 border-t border-zinc-800" />
            </div>
          </div>
        )}

        {/* Error notification */}
        {authError && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{authError}</span>
          </div>
        )}

        {/* Forgot password success */}
        {resetSuccess && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs mb-4">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>Password reset email dispatched. Please check your inbox.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-zinc-400">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setAuthError(null);
                    }}
                    className="text-xs text-sky-400 hover:text-sky-300 transition"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-sm font-semibold text-white shadow-lg shadow-sky-950/30 transition active:scale-[0.99] disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : mode === 'signin' ? (
              'Sign In to INFCLOUD'
            ) : mode === 'signup' ? (
              'Create 988 GB Account'
            ) : (
              'Send Reset Instructions'
            )}
          </button>
        </form>

        {mode === 'forgot' && (
          <div className="text-center mt-5">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setAuthError(null);
                setResetSuccess(false);
              }}
              className="text-xs text-zinc-400 hover:text-white transition"
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        {onOpenPackageCode && (
          <div className="mt-4 pt-4 border-t border-zinc-800 text-center">
            <button
              type="button"
              onClick={onOpenPackageCode}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 text-xs font-semibold transition active:scale-95"
            >
              <KeyRound className="w-4 h-4 text-sky-400" />
              <span>Have an 8-Character Access Code? Open Package</span>
            </button>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-zinc-400" />
            <span>988 GB Storage Platform</span>
          </span>
          <span>Zero-Knowledge Packages</span>
        </div>
      </div>
    </div>
  );
};
