import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { fetchPokerTable } from '@/lib/api';
import { TablePage } from '@/views/TablePage';

export const Route = createFileRoute('/_authenticated/table/$tableId')({
  loader: async ({ params }) => {
    const table = await fetchPokerTable(params.tableId);
    if (!table) throw notFound();
    return { table };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.table.name ?? 'Table'} · Master Poker` },
      { name: 'description', content: 'Take a seat, buy in from your wallet and play Texas Hold’em against the table.' },
      { property: 'og:title', content: `${loaderData?.table.name ?? 'Table'} · Master Poker` },
      { property: 'og:description', content: 'Take a seat and play Texas Hold’em.' },
    ],
  }),
  notFoundComponent: () => (
    <div className="py-20 text-center">
      <h1 className="text-xl font-semibold text-white">Table not found</h1>
      <p className="mt-2 text-sm text-slate-400">This table is closed or no longer exists.</p>
      <Link to="/lobby" className="mt-4 inline-block text-sm font-semibold text-gold-300 hover:text-gold-400">
        Back to tables
      </Link>
    </div>
  ),
  component: TableRoute,
});

function TableRoute() {
  const { table } = Route.useLoaderData();
  const { player } = useAuth();
  const navigate = useNavigate();
  if (!player) return null;

  return (
    <TablePage
      key={table.id}
      player={{
        id: player.id,
        name: player.display_name,
        avatarUrl: player.avatar_url,
        avatarEmoji: player.avatar_emoji,
      }}
      tableConfig={{
        smallBlind: Number(table.small_blind),
        bigBlind: Number(table.big_blind),
        minBuyIn: Number(table.min_buy_in),
        maxBuyIn: Number(table.max_buy_in),
      }}
      tableName={table.name}
      tableId={table.id}
      tableRake={table.rake_percent === null ? null : Number(table.rake_percent)}
      onLeaveTable={() => void navigate({ to: '/lobby' })}
    />
  );
}
