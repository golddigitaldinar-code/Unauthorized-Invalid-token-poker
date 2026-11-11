import { useCallback, useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { errorMessage } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import {
  actAtTable,
  getTableGame,
  leaveTable,
  sitDownAtTable,
  tickTableGame,
  type TableGameResult,
} from '@/lib/table-game.functions';
import { emptyTable, legalActions } from '@/poker/engine';
import type { RemotePlayer } from '@/poker/seating';
import type { Action, BotLevel, HandResult, TableConfig, TableState } from '@/poker/types';

export { TURN_SECONDS } from '@/poker/session';

const PRESENCE_CHANNEL = 'poker-table-main';
const TICK_BUFFER_MS = 150;
const RETRY_MS = 3000;

interface Player {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarEmoji: string;
}

/**
 * Cash-table state is owned by the server: chips, cards, bots and cash-outs are all computed there.
 * This hook only displays the server's view, sends the player's actions, and asks the server to
 * advance the game when the next automatic step is due.
 */
export function usePokerTable(me: Player, tableConfig: TableConfig, tableId: string) {
  const getGameFn = useServerFn(getTableGame);
  const sitFn = useServerFn(sitDownAtTable);
  const tickFn = useServerFn(tickTableGame);
  const actFn = useServerFn(actAtTable);
  const leaveFn = useServerFn(leaveTable);

  const [table, setTable] = useState<TableState>(emptyTable(tableConfig));
  const [seated, setSeated] = useState(false);
  const [version, setVersion] = useState(-1);
  const [dueAt, setDueAt] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);
  const [remotes, setRemotes] = useState<RemotePlayer[]>([]);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cashOutBlocked, setCashOutBlocked] = useState(false);
  const [history, setHistory] = useState<HandResult[]>([]);
  const [botLevel, setBotLevel] = useState<BotLevel | null>(null);

  const sessionRef = useRef<string | null>(null);
  const versionRef = useRef(-1);
  const inFlightRef = useRef(false);
  const remotesRef = useRef<RemotePlayer[]>([]);
  const configRef = useRef(tableConfig);
  configRef.current = tableConfig;

  useEffect(() => {
    remotesRef.current = remotes;
  }, [remotes]);

  const applyResult = useCallback(
    (result: TableGameResult) => {
      if (result.closed || !result.view) {
        sessionRef.current = null;
        versionRef.current = -1;
        setSeated(false);
        setLeaving(false);
        setRemotes([]);
        setVersion(-1);
        setBotLevel(null);
        setTable(emptyTable(configRef.current));
        return;
      }
      const view = result.view;
      if (sessionRef.current === view.sessionId && view.version < versionRef.current) return;
      sessionRef.current = view.sessionId;
      versionRef.current = view.version;
      setTable(view.table);
      setDueAt(Date.now() + view.msUntilNext);
      setVersion(view.version);
      setBotLevel(view.botLevel);
      setSeated(true);
    },
    []
  );

  // Resume a seat that is still open on the server (page reload).
  useEffect(() => {
    let active = true;
    void getGameFn({ data: { tableId } })
      .then((result) => {
        if (active && !result.closed) applyResult(result);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [getGameFn, tableId, applyResult]);

  // Leaving the page cashes out the server-held stack.
  useEffect(
    () => () => {
      const sessionId = sessionRef.current;
      if (sessionId) void leaveFn({ data: { sessionId } }).catch(() => undefined);
    },
    [leaveFn]
  );

  useEffect(() => {
    if (!seated) return;
    const channel = supabase.channel(PRESENCE_CHANNEL, { config: { presence: { key: me.id } } });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ id: string; name: string }>();
        const people = new Map<string, RemotePlayer>();
        for (const entries of Object.values(state)) {
          for (const entry of entries) {
            if (entry.id !== me.id) people.set(entry.id, { id: entry.id, name: entry.name, avatarUrl: null, avatarEmoji: '🙂' });
          }
        }
        setRemotes([...people.values()]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ id: me.id, name: me.name });
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [seated, me.id, me.name]);

  // Ask the server to advance when the next automatic step (deal, bot move, timeout) is due.
  useEffect(() => {
    if (!seated || leaving || cashOutBlocked) return;
    const sessionId = sessionRef.current;
    if (!sessionId) return;
    const timer = window.setTimeout(() => {
      if (inFlightRef.current) {
        window.setTimeout(() => setRetryNonce((n) => n + 1), 500);
        return;
      }
      inFlightRef.current = true;
      void tickFn({
        data: { sessionId, remotes: remotesRef.current.map((player) => ({ id: player.id, name: player.name })) },
      })
        .then((result) => {
          const before = versionRef.current;
          applyResult(result);
          // Same version means the server was not ready yet; wait and ask again.
          if (!result.closed && result.view?.version === before) setRetryNonce((n) => n + 1);
        })
        .catch(() => window.setTimeout(() => setRetryNonce((n) => n + 1), RETRY_MS))
        .finally(() => {
          inFlightRef.current = false;
        });
    }, Math.max(0, dueAt - Date.now()) + TICK_BUFFER_MS);
    return () => window.clearTimeout(timer);
  }, [seated, leaving, cashOutBlocked, version, dueAt, retryNonce, tickFn, applyResult]);

  useEffect(() => {
    const hand = table.hand;
    if (!hand || hand.street !== 'complete') return;
    setHistory((previous) => {
      if (previous[0]?.handNumber === hand.number) return previous;
      const entry: HandResult = {
        handNumber: hand.number,
        board: hand.board,
        rake: hand.rake,
        pot: hand.winners.reduce((sum, award) => sum + award.amount, 0) + hand.rake,
        showdown: hand.showdown,
        winners: hand.winners.flatMap((award) => {
          const seat = table.seats[award.seat];
          if (!seat) return [];
          return [{
            seat: award.seat,
            name: seat.name,
            avatarUrl: seat.avatarUrl,
            avatarEmoji: seat.avatarEmoji,
            amount: award.amount,
            label: award.label,
          }];
        }),
      };
      return [entry, ...previous].slice(0, 25);
    });
  }, [table]);

  const sitDown = useCallback(
    async (buyIn: number) => {
      setBusy(true);
      setError(null);
      try {
        const result = await sitFn({ data: { tableId, buyIn } });
        setLeaving(false);
        setCashOutBlocked(false);
        applyResult(result);
        if (!result.closed) {
          window.__lovableEvents?.track?.('project.table_joined', {
            big_blind: configRef.current.bigBlind,
            buy_in: buyIn,
          });
        }
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [sitFn, tableId, applyResult]
  );

  const act = useCallback(
    (action: Action) => {
      const sessionId = sessionRef.current;
      if (!sessionId || inFlightRef.current) return;
      inFlightRef.current = true;
      void actFn({ data: { sessionId, action } })
        .then(applyResult)
        .catch((err) => setError(errorMessage(err)))
        .finally(() => {
          inFlightRef.current = false;
        });
    },
    [actFn, applyResult]
  );

  const standUp = useCallback(async (): Promise<boolean> => {
    const sessionId = sessionRef.current;
    if (!sessionId) return true;
    setLeaving(true);
    setError(null);
    try {
      const result = await leaveFn({ data: { sessionId } });
      applyResult(result);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      setCashOutBlocked(true);
      setLeaving(false);
      return false;
    }
  }, [leaveFn, applyResult]);

  const retryCashOut = useCallback(() => {
    setCashOutBlocked(false);
    void standUp();
  }, [standUp]);

  const meIndex = table.seats.findIndex((seat) => seat?.isMe);
  const legal = meIndex === -1 ? null : legalActions(table, meIndex);

  return {
    table,
    seated,
    busy,
    error,
    leaving,
    cashOutBlocked,
    meIndex,
    legal,
    sitDown,
    standUp,
    act,
    retryCashOut,
    history,
    botLevel,
  };
}
