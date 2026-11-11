import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { Loader as Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAuth } from '@/hooks/useAuth';
import { useSoundPreferencesSync } from '@/hooks/useSoundPreferencesSync';

export const Route = createFileRoute('/_authenticated')({
  // The session lives in browser storage, so the gate runs in the browser only.
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: '/auth', search: { redirect: location.href } });
    }
    return { userId: data.user.id };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, player, loading, refreshPlayer, signOut } = useAuth();
  useSoundPreferencesSync(user?.id);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="h-6 w-6 animate-spin text-gold-300" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="max-w-sm rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl">
          <h1 className="text-lg font-semibold text-white">Setting up your player profile</h1>
          <p className="mt-2 text-sm text-slate-400">This usually takes a second. Try again if it doesn't load.</p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => void refreshPlayer()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 px-4 py-2 text-sm font-bold text-slate-900"
            >
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppShell>
        <Outlet />
      </AppShell>
    </ErrorBoundary>
  );
}
