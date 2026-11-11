import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { WalletCard } from '@/components/wallet/WalletCard';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { TableLobby } from '@/views/TableLobby';

export const Route = createFileRoute('/_authenticated/lobby')({
  head: () => ({
    meta: [
      { title: 'Choose a Table · Master Poker' },
      { name: 'description', content: 'Pick a Texas Hold’em table that fits your budget, from ₱1 beginner games to ₱1000 whale stakes.' },
      { property: 'og:title', content: 'Choose a Table · Master Poker' },
      { property: 'og:description', content: 'Pick a Texas Hold’em table that fits your budget.' },
    ],
  }),
  component: LobbyRoute,
});

function LobbyWallet({ playerId }: { playerId: string }) {
  const wallet = useWallet(playerId);
  return <WalletCard playerId={playerId} wallet={wallet} />;
}

function LobbyRoute() {
  const { player } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <TableLobby
        balance={player?.balance ?? 0}
        onSelect={({ table }) => void navigate({ to: '/table/$tableId', params: { tableId: table.id } })}
        onTournament={() => void navigate({ to: '/tournament' })}
      />
      {player && (
        <aside className="order-first h-fit lg:sticky lg:top-24 lg:order-none">
          <LobbyWallet playerId={player.id} />
        </aside>
      )}
    </div>
  );
}
