import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { KeyRound, Loader as Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { errorMessage } from '@/lib/format';

export const Route = createFileRoute('/reset-password')({
  head: () => ({
    meta: [
      { title: 'Set a new password · Master Poker' },
      { name: 'description', content: 'Choose a new password for your Master Poker account.' },
      { property: 'og:title', content: 'Set a new password · Master Poker' },
      { property: 'og:description', content: 'Choose a new password for your Master Poker account.' },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true);
        setChecked(true);
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      // Give the recovery link a moment to sign the visitor in.
      setTimeout(() => setChecked(true), 1500);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const valid = password.length >= 6 && password === confirm;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      void navigate({ to: '/lobby', replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 text-slate-100">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-300">
            <KeyRound className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-white">Set a new password</h1>

          {!ready && checked ? (
            <div className="mt-3 space-y-4 text-sm text-slate-400">
              <p>This reset link is invalid or has expired. Request a new one from the sign-in page.</p>
              <Link to="/auth" className="font-semibold text-gold-300 hover:text-gold-400">
                Back to sign in
              </Link>
            </div>
          ) : !ready ? (
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your reset link...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-slate-400">New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-gold-400/60"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-400">Confirm password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-gold-400/60"
                />
                {confirm && password !== confirm && (
                  <span className="mt-1 block text-xs text-amber-300">Passwords do not match.</span>
                )}
              </label>
              {error && (
                <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={!valid || busy}
                className="w-full rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 py-3 text-sm font-bold text-slate-900 transition hover:brightness-105 disabled:opacity-40"
              >
                {busy ? 'Saving...' : 'Save new password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
