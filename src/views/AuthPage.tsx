import { useState, type FormEvent } from 'react';
import { Gift, KeyRound, Loader as Loader2, LogIn, MailCheck, UserPlus } from 'lucide-react';
import logoAsset from '@/assets/master-poker-hero.jpg.asset.json';
import { useAuth } from '@/hooks/useAuth';
import { referralCodeExists } from '@/lib/api';
import { errorMessage } from '@/lib/format';

const NAME_MIN = 2;
const NAME_MAX = 24;
const REFERRAL_MAX = 8;

type Mode = 'login' | 'signup' | 'forgot';

function cleanReferral(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, REFERRAL_MAX);
}

const INPUT =
  'mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-gold-400/70 focus:ring-2 focus:ring-gold/20';

export function AuthPage({ initialMode = 'login', initialReferral = '' }: { initialMode?: Mode; initialReferral?: string }) {
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [referral, setReferral] = useState(cleanReferral(initialReferral));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';
  const trimmedName = displayName.trim();
  const nameValid = !isSignup || (trimmedName.length >= NAME_MIN && trimmedName.length <= NAME_MAX);
  const valid = email.trim().length > 0 && (isForgot || password.length >= 6) && nameValid;

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (isForgot) {
        await sendPasswordReset(email.trim());
        setNotice('Check your email for a link to set a new password.');
      } else if (isSignup) {
        if (referral && !(await referralCodeExists(referral))) {
          throw new Error('That referral code was not found. Check it or leave it blank.');
        }
        const needsConfirmation = await signUp(email.trim(), password, trimmedName, referral || undefined);
        window.__lovableEvents?.track?.('project.sign_up_completed', { confirmation_required: needsConfirmation, referred: Boolean(referral) });
        if (needsConfirmation) {
          // Fallback if confirmation is ever turned back on: sign straight in.
          await signIn(email.trim(), password);
        }
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const title = isForgot ? 'Reset your password' : isSignup ? 'Create your account' : 'Welcome back';
  const subtitle = isForgot
    ? 'Enter your email and we will send you a link to choose a new password.'
    : isSignup
      ? 'Takes 10 seconds. No email confirmation needed.'
      : 'Sign in to get back to the tables.';

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center py-10">
      <div key={mode} className="glass-panel animate-modal-in overflow-hidden rounded-3xl">
        <div className="relative h-36 overflow-hidden">
          <img src={logoAsset.url} alt="Master Poker" className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-room/30 to-card" />
        </div>
        <div className="p-7 pt-2">
          <h1 className="font-display text-3xl font-bold text-white">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>

          {isSignup && (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-sm font-semibold text-gold">
              <Gift className="h-4 w-4 shrink-0" /> Get ₱20 free in your wallet when you join.
            </p>
          )}

          {!isForgot && (
            <div className="mt-5 flex rounded-xl border border-white/10 bg-slate-950/80 p-1">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition ${
                  !isSignup ? 'btn-gold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="h-4 w-4" /> Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition ${
                  isSignup ? 'btn-gold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="h-4 w-4" /> Create Account
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {isSignup && (
              <label className="block">
                <span className="text-xs font-medium text-slate-400">Player name</span>
                <input
                  type="text"
                  maxLength={NAME_MAX}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="e.g. Juan D."
                  className={INPUT}
                />
              </label>
            )}

            <label className="block">
              <span className="text-xs font-medium text-slate-400">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className={INPUT}
              />
            </label>

            {!isForgot && (
              <label className="block">
                <span className="flex items-center justify-between text-xs font-medium text-slate-400">
                  Password
                  {!isSignup && (
                    <button type="button" onClick={() => switchMode('forgot')} className="text-gold-300 hover:text-gold-400">
                      Forgot password?
                    </button>
                  )}
                </span>
                <input
                  type="password"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  className={INPUT}
                />
              </label>
            )}

            {isSignup && (
              <label className="block">
                <span className="text-xs font-medium text-slate-400">Referral code (optional)</span>
                <input
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  maxLength={REFERRAL_MAX}
                  value={referral}
                  onChange={(event) => setReferral(cleanReferral(event.target.value))}
                  placeholder="e.g. AB12CD34"
                  className={`${INPUT} font-mono uppercase tracking-[0.3em]`}
                />
              </label>
            )}

            {notice && (
              <p role="status" className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0" /> {notice}
              </p>
            )}

            {error && (
              <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {error}
              </p>
            )}

            <button type="submit" disabled={!valid || busy} className="btn-gold w-full rounded-xl py-3 text-sm font-bold disabled:opacity-40">
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Please wait...
                </span>
              ) : isForgot ? (
                <span className="inline-flex items-center gap-2">
                  <KeyRound className="h-4 w-4" /> Send reset link
                </span>
              ) : isSignup ? (
                'Create account & play'
              ) : (
                'Sign in'
              )}
            </button>

            {isForgot && (
              <button type="button" onClick={() => switchMode('login')} className="w-full text-center text-sm text-slate-400 hover:text-white">
                Back to sign in
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
