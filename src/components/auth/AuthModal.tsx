import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  Cloud,
  KeyRound,
  ExternalLink,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../brand/Logo';
import { isNetlifyEnvironment } from '../../lib/storage';

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
  const [showConsoleGuide, setShowConsoleGuide] = useState(false);

  const isNetlify = isNetlifyEnvironment();
  const isOperationNotAllowed =
    Boolean(authError) &&
    (authError!.toLowerCase().includes('operation-not-allowed') ||
      authError!.toLowerCase().includes('disabled in this firebase project'));

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
      <div className="w-full max-w-md my-auto rounded-3xl bg-zinc-900/95 border border-zinc-800 p-6 md:p-8 shadow-2xl text-zinc-100">
        {/* Brand & Tagline */}
        <div className="flex flex-col items-center text-center mb-6">
          <Logo size="lg" showText={true} />
          <p className="text-xs text-zinc-400 mt-2">
            Secure, high-capacity cloud storage with up to 988 GB target quota.
          </p>
          {isNetlify && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-medium text-emerald-400">
              <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Netlify Edge Network Active</span>
            </div>
          )}
        </div>

        {/* PRIMARY ACTION: High-Speed Google Sign-In */}
        {mode !== 'forgot' && (
          <div className="mb-6 space-y-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-sm transition shadow-lg shadow-sky-500/10 active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            <p className="text-[11px] text-zinc-400 text-center">
              ⚡ Instant 1-click login · No passwords to remember
            </p>
          </div>
        )}

        {/* OPERATION-NOT-ALLOWED SMART GUIDANCE BANNER */}
        {isOperationNotAllowed && (
          <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/15 to-amber-500/5 border border-amber-500/30 text-amber-200 text-xs mb-5 space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Email/Password Not Enabled in Firebase Project</span>
            </div>

            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Firebase project <strong className="text-white font-mono">jovial-woods-k78pp</strong> has not enabled Email/Password sign-in yet. Use <strong>Google Sign-In</strong> above for instant access!
            </p>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95"
            >
              <span>Continue with Google Instead (Instant)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConsoleGuide(!showConsoleGuide)}
              className="flex items-center justify-between w-full pt-1 text-[11px] text-amber-300/90 hover:text-amber-200"
            >
              <span>Want to use Email/Password? Enable it in Firebase Console</span>
              {showConsoleGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showConsoleGuide && (
              <div className="p-2.5 rounded-xl bg-black/50 border border-zinc-800 text-[11px] text-zinc-300 space-y-1.5 animate-in fade-in">
                <p className="font-semibold text-white">How to enable in 3 clicks:</p>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                  <li>
                    Open{' '}
                    <a
                      href="https://console.firebase.google.com/project/jovial-woods-k78pp/authentication/providers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:underline inline-flex items-center gap-1 font-mono"
                    >
                      Firebase Authentication Providers <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  </li>
                  <li>Click on <strong>Email/Password</strong> under Sign-in providers</li>
                  <li>Toggle the <strong>Enable</strong> switch and click <strong>Save</strong></li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Standard error notification (non-operation-not-allowed) */}
        {authError && !isOperationNotAllowed && (
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

        {/* Divider */}
        {mode !== 'forgot' && (
          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-zinc-800" />
            <span className="px-3 text-[11px] text-zinc-500 font-medium uppercase tracking-wider">
              Or with email
            </span>
            <div className="flex-1 border-t border-zinc-800" />
          </div>
        )}

        {/* Tab switch for signin / signup */}
        {mode !== 'forgot' && (
          <div className="flex items-center p-1 bg-zinc-950/60 rounded-xl mb-4 border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setAuthError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                mode === 'signin'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sign In with Email
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setAuthError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                mode === 'signup'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Create Email Account
            </button>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
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
                  className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition"
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
                className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition"
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
                    className="text-[11px] text-sky-400 hover:text-sky-300 transition"
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
                  className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition"
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
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/80 text-xs font-semibold text-white shadow-md transition active:scale-[0.99] disabled:opacity-50 mt-1"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : mode === 'signin' ? (
              'Sign In with Email'
            ) : mode === 'signup' ? (
              'Create Email Account'
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

        {/* 8-Character Package Access Code Bypass */}
        {onOpenPackageCode && (
          <div className="mt-4 pt-4 border-t border-zinc-800 text-center">
            <button
              type="button"
              onClick={onOpenPackageCode}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-750 text-xs font-semibold transition active:scale-95"
            >
              <KeyRound className="w-4 h-4 text-sky-400" />
              <span>Have an 8-Character Access Code? Open Package</span>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
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
