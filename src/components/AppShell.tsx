import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Settings, ShieldCheck, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchIsAdmin } from '@/lib/api';
import { FloatingSuits } from '@/components/common/FloatingSuits';

const NAV_BASE = 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition sm:px-3';
const NAV_IDLE = `${NAV_BASE} text-slate-400 hover:text-white`;
const NAV_ACTIVE = `${NAV_BASE} bg-gold/15 text-gold`;

export function AppShell({ children }: { children: ReactNode }) {
  const { player, signOut, refreshPlayer } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const onTable = useRouterState({ select: (state) => state.location.pathname.startsWith('/table/') });
  const playerId = player?.id;
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!playerId) return;
    let active = true;
    void fetchIsAdmin()
      .then((value) => active && setIsAdmin(value))
      .catch(() => active && setIsAdmin(false));
    return () => {
      active = false;
    };
  }, [playerId]);

  // Keep the header balance live (approvals, buy-ins and cash-outs change it).
  useEffect(() => {
    if (!playerId) return;
    const channel = supabase
      .channel(`header-balance-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: `id=eq.${playerId}` }, () => {
        void refreshPlayer();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // refreshPlayer is recreated each render; the subscription only depends on the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    void navigate({ to: '/auth', replace: true });
  }

  const avatarDisplay = player?.avatar_url ? (
    <img src={player.avatar_url} alt={player.display_name} className="h-full w-full rounded-full object-cover" />
  ) : (
    <span>{player?.avatar_emoji ?? '🙂'}</span>
  );

  return (
    <div className="bg-ambient min-h-screen text-foreground">
      {!onTable && <FloatingSuits intensity={0.08} />}
      <header className="header-sweep sticky top-0 z-20 border-b border-gold/20 bg-wood-deep/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/lobby" className="group flex items-center gap-2.5 font-display text-lg font-extrabold">
            <img
              src="/favicon.png"
              alt=""
              className="h-10 w-10 rounded-xl border border-gold/50 object-cover shadow-[var(--shadow-gold)] transition duration-300 group-hover:scale-105"
            />
            <span className="hidden text-gold-shimmer sm:inline">Master Poker</span>
            <span className="relative ml-1 hidden h-2 w-2 sm:flex" title="Live">
              <span className="absolute inline-flex h-full w-full animate-live-ping rounded-full bg-live" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
            </span>
          </Link>
          {player && !onTable && (
            <span
              key={player.balance}
              className="hidden animate-balance-flash rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-sm font-bold tabular-nums text-gold md:inline-flex"
            >
              ₱{Number(player.balance).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
          <nav className="flex items-center gap-1.5 text-sm sm:gap-2">
            <Link to="/lobby" activeProps={{ className: NAV_ACTIVE }} inactiveProps={{ className: NAV_IDLE }}>
              Play
            </Link>
            <Link to="/tournament" activeProps={{ className: NAV_ACTIVE }} inactiveProps={{ className: NAV_IDLE }}>
              <Trophy className="h-4 w-4" /> <span className="hidden sm:inline">Tournament</span>
            </Link>
            <Link to="/settings" activeProps={{ className: NAV_ACTIVE }} inactiveProps={{ className: NAV_IDLE }}>
              <Settings className="h-4 w-4" /> <span className="hidden sm:inline">Settings</span>
            </Link>
            {isAdmin && (
              <Link to="/admin" activeProps={{ className: NAV_ACTIVE }} inactiveProps={{ className: NAV_IDLE }}>
                <ShieldCheck className="h-4 w-4" /> <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            <div className="ml-1 flex items-center gap-2 sm:ml-2">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-800 text-sm">
                {avatarDisplay}
              </div>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                aria-label="Sign out"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-slate-300 transition hover:border-white/25 hover:text-white sm:px-3"
              >
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main
        className={`mx-auto animate-fade-in px-3 sm:px-6 ${onTable ? 'max-w-none py-3' : 'max-w-7xl py-6'}`}
      >
        {children}
      </main>
    </div>
  );
}
