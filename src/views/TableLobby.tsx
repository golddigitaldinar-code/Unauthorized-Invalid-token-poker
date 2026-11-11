import { useEffect, useState } from 'react';
import { Loader as Loader2, Trophy, Users } from 'lucide-react';
import { fetchPokerTables } from '@/lib/api';
import { errorMessage, formatPeso } from '@/lib/format';
import type { PokerTableRow } from '@/lib/models';
import type { TableConfig } from '@/poker/types';

interface TableLobbyProps {
  balance: number;
  onSelect: (selection: { table: PokerTableRow; config: TableConfig }) => void;
  onTournament: () => void;
}

export function TableLobby({ balance, onSelect, onTournament }: TableLobbyProps) {
  const [tables, setTables] = useState<PokerTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchPokerTables()
      .then((rows) => {
        setTables(rows);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading tables...
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-white">Choose a Table</h1>
        <p className="mt-1 text-sm text-slate-400">
          Pick a table that fits your budget. Your wallet balance is{' '}
          <span className="font-semibold text-gold-300">{formatPeso(balance)}</span>.
        </p>
      </div>

      {/* Tournament entry card */}
      <button
        type="button"
        onClick={onTournament}
        className="border-spin card-lift group flex w-full animate-rise-in items-center gap-4 rounded-2xl p-5 text-left shadow-lg"
      >
        <div className="flex h-12 w-12 shrink-0 animate-float items-center justify-center rounded-xl bg-gold/15 text-gold transition group-hover:scale-110">
          <Trophy className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-white">Sit &amp; Go Tournament</h2>
          <p className="text-sm text-slate-400">
            8 players. Rising blinds. Last one standing wins. Free entry with play chips.
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-gold-300 transition group-hover:translate-x-1">
          Join &rarr;
        </span>
      </button>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tables.map((table, index) => {
          const canAfford = balance >= table.min_buy_in;
          return (
            <button
              key={table.id}
              type="button"
              style={{ animationDelay: `${index * 0.05 + 0.1}s`, ['--shine-delay' as string]: `${(index % 6) * 0.9}s` }}
              disabled={!canAfford}
              onClick={() =>
                onSelect({
                  table,
                  config: {
                    smallBlind: Number(table.small_blind),
                    bigBlind: Number(table.big_blind),
                    minBuyIn: Number(table.min_buy_in),
                    maxBuyIn: Number(table.max_buy_in),
                  },
                })
              }
              className={`group relative animate-rise-in overflow-hidden rounded-2xl p-5 text-left ${
                canAfford ? 'glass-panel card-lift shine-sweep' : 'glass-panel opacity-50'
              }`}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-8 font-display text-8xl font-extrabold text-foreground/[0.04] transition duration-500 group-hover:-rotate-12 group-hover:text-gold/10"
              >
                {['♠', '♥', '♦', '♣'][index % 4]}
              </span>
              <div className="flex items-center justify-between">
                <span className="font-display text-xl font-extrabold text-white">{table.name}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-live/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-live">
                  <span className="flex h-2.5 items-end gap-[2px]">
                    {[0, 1, 2].map((bar) => (
                      <span
                        key={bar}
                        className="animate-equalizer h-full w-[2px] rounded-full bg-live"
                        style={{ animationDelay: `${bar * 0.18 + index * 0.05}s` }}
                      />
                    ))}
                  </span>{' '}
                  Live
                  <Users className="ml-0.5 h-3 w-3" />
                </span>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Min bet</span>
                  <span className="font-semibold tabular-nums text-gold-300">{formatPeso(Number(table.min_bet))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Blinds</span>
                  <span className="font-medium tabular-nums text-slate-200">
                    {formatPeso(Number(table.small_blind))} / {formatPeso(Number(table.big_blind))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Buy-in</span>
                  <span className="font-medium tabular-nums text-slate-200">
                    {formatPeso(Number(table.min_buy_in))} &ndash; {formatPeso(Number(table.max_buy_in))}
                  </span>
                </div>
              </div>
              {!canAfford && (
                <p className="mt-3 text-xs text-amber-300">Your balance is too low for this table.</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
