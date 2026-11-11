import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { TournamentPage } from '@/views/TournamentPage';

export const Route = createFileRoute('/_authenticated/tournament')({
  head: () => ({
    meta: [
      { title: 'Sit & Go Tournament · Master Poker' },
      { name: 'description', content: 'Eight players, rising blinds, last one standing wins. Free entry with play chips.' },
      { property: 'og:title', content: 'Sit & Go Tournament · Master Poker' },
      { property: 'og:description', content: 'Eight players, rising blinds, last one standing wins.' },
    ],
  }),
  component: TournamentRoute,
});

function TournamentRoute() {
  const { player } = useAuth();
  const navigate = useNavigate();
  if (!player) return null;
  return (
    <TournamentPage
      player={{
        id: player.id,
        name: player.display_name,
        avatarUrl: player.avatar_url,
        avatarEmoji: player.avatar_emoji,
      }}
      onLeave={() => void navigate({ to: '/lobby' })}
    />
  );
}
