import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Coins, LogOut, Maximize2, Minimize2, Users } from 'lucide-react';
import { ActionBar } from '@/components/poker/ActionBar';
import { HandResultPanel } from '@/components/poker/HandResultPanel';
import { PokerTable } from '@/components/poker/PokerTable';
import { RecentWinners } from '@/components/poker/RecentWinners';
import { SitDownPanel } from '@/components/poker/SitDownPanel';
import { SoundToggle } from '@/components/poker/SoundToggle';
import { WalletBar } from '@/components/wallet/WalletBar';
import { useTableSettings } from '@/hooks/useTableSettings';
import { usePokerTable } from '@/hooks/usePokerTable';
import { useTableSounds } from '@/hooks/useTableSounds';
import { useWallet } from '@/hooks/useWallet';
import { formatChips, formatPeso } from '@/lib/format';
import { dealerFor } from '@/poker/dealers';
import { SEAT_COUNT } from '@/poker/engine';
import { effectiveRake } from '@/poker/session';
import type { Street, TableConfig } from '@/poker/types';

interface TablePagePlayer {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarEmoji: string;
}

interface TablePageProps {
  player: TablePagePlayer;
  tableConfig: TableConfig;
  tableName: string;
  tableId: string;
  tableRake: number | null;
  onLeaveTable: () => void;
}

const STREET_LABELS: Record<Street, string> = {
  preflop: 'Pre-flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  complete: 'Showdown',
};

export function TablePage({ player, tableConfig, tableName, tableId, tableRake, onLeaveTable }: TablePageProps) {
  const wallet = useWallet(player.id);
  const { settings } = useTableSettings();
  const poker = usePokerTable(player, tableConfig, tableId);
  const { table, legal, meIndex, history } = poker;
  useTableSounds(table, poker.seated);
  const rootRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.().catch(() => undefined);
  }

  const turnKey = table.hand ? `${table.hand.number}-${table.hand.street}-${table.hand.toAct}-${table.hand.currentBet}` : 'idle';
  const turnSeat = table.hand?.toAct != null ? table.seats[table.hand.toAct] : null;
  const isMyTurn = meIndex !== -1 && table.hand?.toAct === meIndex;
  const waitingFor = turnSeat && !isMyTurn ? turnSeat.name : null;
  const balance = wallet.player?.balance ?? 0;
  const seatCount = table.seats.filter(Boolean).length;
  const dealer = dealerFor(tableId);
  const streetLabel = table.hand ? STREET_LABELS[table.hand.street] : STREET_LABELS.preflop;
  const myChips = table.seats.find((seat) => seat?.isMe)?.stack ?? 0;
  const rakePercent = effectiveRake(tableRake, settings.rakePercent);

  async function handleStandUp() {
    if (document.fullscreenElement) void document.exitFullscreen();
    const ok = await poker.standUp();
    if (ok) onLeaveTable();
  }

  return (
    <div
      ref={rootRef}
      className={`flex min-h-[calc(100dvh-4rem)] flex-col gap-3 ${fullscreen ? 'bg-ambient overflow-y-auto p-3 sm:p-5' : ''}`}
    >
      {/* Compact top bar */}
      <div className="glass-panel relative z-30 flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2 sm:gap-3">
        <button
          type="button"
          onClick={onLeaveTable}
          aria-label="Back to tables"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-gold/50 hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-auto">
          <h1 className="truncate font-display text-base font-extrabold leading-tight text-foreground sm:text-lg">{tableName}</h1>
          <p className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground sm:text-xs">
            <Users className="h-3 w-3 shrink-0" />
            {poker.seated ? `${Math.min(seatCount, SEAT_COUNT)}/${SEAT_COUNT} seated` : 'Open'} · {formatPeso(tableConfig.smallBlind)}/{formatPeso(tableConfig.bigBlind)} · Rake {rakePercent}%
          </p>
        </div>
        <WalletBar playerId={player.id} wallet={wallet} />
        {poker.seated && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-live/30 bg-live/10 px-2.5 py-1 text-xs font-bold tabular-nums text-live" title="Chips on the table">
            <Coins className="h-3.5 w-3.5" /> {formatChips(myChips)}
          </span>
        )}
        <SoundToggle />
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
          title={fullscreen ? 'Exit full screen' : 'Full screen'}
          className="hidden h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-gold/50 hover:text-gold sm:inline-flex"
        >
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        {poker.seated && (
          <button
            type="button"
            onClick={() => void handleStandUp()}
            disabled={poker.leaving}
            aria-label="Leave table"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs font-semibold text-foreground transition hover:border-destructive/60 hover:text-destructive disabled:opacity-50 sm:px-3"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{poker.leaving ? 'Leaving…' : 'Leave'}</span>
          </button>
        )}
      </div>

      {/* Table — fills the screen */}
      <div className="relative flex flex-1 items-center justify-center px-1 pb-3 pt-6 sm:px-12 sm:pb-8 sm:pt-20">
        {poker.seated ? (
          <PokerTable table={table} meIndex={meIndex} dealer={dealer} streetLabel={streetLabel} />
        ) : (
          <SitDownPanel
            balance={balance}
            minBuyIn={tableConfig.minBuyIn}
            maxBuyIn={tableConfig.maxBuyIn}
            busy={poker.busy}
            error={poker.error}
            rakePercent={rakePercent}
            onSit={(amount) => void poker.sitDown(amount)}
          />
        )}
      </div>

      {/* Action bar */}
      {poker.seated && (
        <div className="mx-auto w-full max-w-3xl">
          {poker.cashOutBlocked ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
              <span>{poker.error ?? 'Could not cash out. Please try again.'}</span>
              <button type="button" onClick={poker.retryCashOut} className="rounded-lg bg-destructive/20 px-3 py-1.5 font-semibold hover:bg-destructive/30">
                Try again
              </button>
            </div>
          ) : (
            <ActionBar table={table} legal={isMyTurn ? legal : null} turnKey={turnKey} onAct={poker.act} waitingFor={waitingFor} />
          )}
        </div>
      )}

      {/* Results */}
      <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
        <HandResultPanel result={history[0] ?? null} />
        <RecentWinners history={history} />
      </div>
    </div>
  );
}
