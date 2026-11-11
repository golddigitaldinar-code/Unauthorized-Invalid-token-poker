import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { SettingsPage } from '@/views/SettingsPage';

export const Route = createFileRoute('/_authenticated/settings')({
  head: () => ({
    meta: [
      { title: 'Profile Settings · Master Poker' },
      { name: 'description', content: 'Change your display name, profile photo and avatar emoji.' },
      { property: 'og:title', content: 'Profile Settings · Master Poker' },
      { property: 'og:description', content: 'Change your display name, profile photo and avatar emoji.' },
    ],
  }),
  component: SettingsRoute,
});

function SettingsRoute() {
  const { player } = useAuth();
  if (!player) return null;
  return <SettingsPage key={player.id} player={player} />;
}
