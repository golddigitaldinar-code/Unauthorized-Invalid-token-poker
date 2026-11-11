import { useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { AuthPage } from '@/views/AuthPage';
import { FloatingSuits } from '@/components/common/FloatingSuits';

interface AuthSearch {
  redirect?: string | undefined;
  mode?: 'signup' | undefined;
  ref?: string | undefined;
}

function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  // Same-origin relative paths only.
  if (!value.startsWith('/') || value.startsWith('//')) return undefined;
  return value;
}

export const Route = createFileRoute('/auth')({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: safeRedirect(search['redirect']),
    mode: search['mode'] === 'signup' || typeof search['ref'] === 'string' ? 'signup' : undefined,
    ref: typeof search['ref'] === 'string' ? search['ref'].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || undefined : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Sign in · Master Poker' },
      { name: 'description', content: 'Sign in or create a Master Poker account. New players get a ₱20 welcome bonus.' },
      { property: 'og:title', content: 'Sign in · Master Poker' },
      { property: 'og:description', content: 'Sign in or create a Master Poker account. New players get a ₱20 welcome bonus.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: AuthRoute,
});

function AuthRoute() {
  const { user, loading } = useAuth();
  const { redirect, mode, ref } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      void navigate({ to: redirect ?? '/lobby', replace: true });
    }
  }, [loading, user, redirect, navigate]);

  return (
    <div className="bg-ambient min-h-screen px-4 text-foreground">
      <FloatingSuits intensity={0.12} />
      <AuthPage initialMode={mode === 'signup' ? 'signup' : 'login'} initialReferral={ref ?? ''} />
    </div>
  );
}
