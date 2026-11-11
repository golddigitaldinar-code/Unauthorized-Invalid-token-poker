import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useRouter } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { fetchPlayerByAuthId } from '@/lib/api';
import { writeStoredPlayer, clearStoredPlayer, type StoredPlayer } from '@/lib/identity';
import type { PlayerRow } from '@/lib/models';

interface AuthState {
  session: Session | null;
  user: User | null;
  player: PlayerRow | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Returns true when the account still needs its email confirmed before signing in. */
  signUp: (email: string, password: string, displayName: string, referralCode?: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshPlayer: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPlayerForUser = useCallback(async (u: User) => {
    try {
      const p = await fetchPlayerByAuthId(u.id);
      setPlayer(p);
      if (p) {
        const stored: StoredPlayer = {
          id: p.id,
          name: p.display_name,
          avatarUrl: p.avatar_url,
          avatarEmoji: p.avatar_emoji,
        };
        writeStoredPlayer(stored);
      }
      return p;
    } catch (error) {
      console.error('Could not load player profile', error);
      setPlayer(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (!active) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      // Defer database calls out of the auth callback to avoid blocking the auth client.
      setTimeout(() => {
        if (!active) return;
        if (sess?.user) {
          void loadPlayerForUser(sess.user).finally(() => active && setLoading(false));
        } else {
          setPlayer(null);
          clearStoredPlayer();
          setLoading(false);
        }
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          void router.invalidate();
        }
      }, 0);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        void loadPlayerForUser(data.session.user).finally(() => active && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadPlayerForUser, router]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string, displayName: string, referralCode?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/lobby`,
        data: { display_name: displayName, ...(referralCode ? { referral_code: referralCode } : {}) },
      },
    });
    if (error) throw error;
    return !data.session;
  }

  async function sendPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  async function signOut() {
    clearStoredPlayer();
    setPlayer(null);
    await supabase.auth.signOut();
  }

  async function refreshPlayer() {
    if (user) {
      await loadPlayerForUser(user);
    }
  }

  return (
    <AuthContext.Provider
      value={{ session, user, player, loading, signIn, signUp, sendPasswordReset, signOut, refreshPlayer }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
