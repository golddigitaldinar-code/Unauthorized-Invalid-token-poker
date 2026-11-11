/**
 * Server-authoritative cash tables. The full game (deck, bots, chip counts) lives in the
 * table_game_states table, which only this server can read or write (service role).
 * Every handler first verifies the signed-in player, then only touches that player's rows.
 * The browser only sends "tick" and the player's own actions, and receives a redacted view.
 */
import { createServerFn } from '@tanstack/react-start';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { Database, Json } from '@/integrations/supabase/types';
import { applyAction, SEAT_COUNT } from '@/poker/engine';
import { createHumanSeat, reconcileSeats, type RemotePlayer } from '@/poker/seating';
import {
  autoStep,
  delayFor,
  effectiveRake,
  isBotLevel,
  tableBotLevel,
  isValidAction,
  myIndex,
  redactFor,
  settleForExit,
  type GameRules,
} from '@/poker/session';
import type { Action, BotLevel, TableState } from '@/poker/types';

type Db = SupabaseClient<Database>;

export interface TableGameView {
  sessionId: string;
  version: number;
  botLevel: BotLevel;
  table: TableState;
  msUntilNext: number;
}

export interface TableGameResult {
  closed: boolean;
  view: TableGameView | null;
  balance?: number | undefined;
}

interface GameRow {
  session_id: string;
  player_id: string;
  table_id: string | null;
  bot_level: string;
  state: Json;
  version: number;
  next_at: string;
}

const CLOCK_TOLERANCE_MS = 300;

/** Service-role client, loaded inside handlers only (never shipped to the browser). */
async function adminDb(): Promise<Db> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  return supabaseAdmin as unknown as Db;
}

async function loadPlayer(db: Db, authId: string) {
  const { data, error } = await db
    .from('players')
    .select('id, display_name, avatar_url, avatar_emoji, status')
    .eq('auth_id', authId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Player profile not found');
  return data;
}

async function loadRules(db: Db, row: { table_id: string | null; bot_level?: string }): Promise<GameRules> {
  const { data, error } = await db.from('settings').select('key, value').in('key', ['rake_percent', 'bot_aggression', 'player_win_rate']);
  if (error) throw new Error(error.message);
  const map = new Map((data ?? []).map((entry) => [entry.key, entry.value]));
  const houseRake = Number(map.get('rake_percent') ?? 5);
  const aggression = map.get('bot_aggression');
  const winRate = Number(map.get('player_win_rate') ?? 50);
  let tableRake: number | null = null;
  if (row.table_id) {
    const { data: tbl } = await db.from('poker_tables').select('rake_percent').eq('id', row.table_id).maybeSingle();
    tableRake = tbl?.rake_percent ?? null;
  }
  return {
    rakePercent: effectiveRake(tableRake, Number.isFinite(houseRake) ? houseRake : 5),
    botAggression: aggression === 'passive' || aggression === 'aggressive' ? aggression : 'balanced',
    botLevel: isBotLevel(row.bot_level) ? row.bot_level : 'normal',
    winRate: Number.isFinite(winRate) ? Math.min(Math.max(winRate, 0), 100) : 50,
  };
}

const GAME_COLUMNS = 'session_id, player_id, table_id, bot_level, state, version, next_at';

/** Load a game only if it belongs to this player. */
async function loadGame(db: Db, playerId: string, sessionId: string): Promise<GameRow | null> {
  const { data, error } = await db
    .from('table_game_states')
    .select(GAME_COLUMNS)
    .eq('session_id', sessionId)
    .eq('player_id', playerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as GameRow | null) ?? null;
}

function tableOf(row: GameRow): TableState {
  return row.state as unknown as TableState;
}

function toView(row: GameRow): TableGameView {
  return {
    sessionId: row.session_id,
    version: row.version,
    botLevel: isBotLevel(row.bot_level) ? row.bot_level : 'normal',
    table: redactFor(tableOf(row)),
    msUntilNext: Math.max(0, new Date(row.next_at).getTime() - Date.now()),
  };
}

/** Save with an optimistic version check; on conflict return the latest stored row. */
async function saveGame(db: Db, row: GameRow, table: TableState): Promise<GameRow> {
  const nextAt = new Date(Date.now() + delayFor(table)).toISOString();
  const { data, error } = await db
    .from('table_game_states')
    .update({
      state: table as unknown as Json,
      version: row.version + 1,
      next_at: nextAt,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', row.session_id)
    .eq('player_id', row.player_id)
    .eq('version', row.version)
    .select(GAME_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as GameRow;
  const latest = await loadGame(db, row.player_id, row.session_id);
  if (!latest) throw new Error('Table session not found');
  return latest;
}

async function cashOut(db: Db, sessionId: string, amount: number): Promise<number> {
  const { data, error } = await db.rpc('server_cash_out', { p_session: sessionId, p_amount: amount });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

async function closeGame(db: Db, row: GameRow): Promise<number> {
  const rules = await loadRules(db, row);
  const stack = Math.max(0, Math.floor(settleForExit(tableOf(row), rules)));
  return cashOut(db, row.session_id, stack);
}

/** Close any open session the player left behind (closed tab, lost connection). */
async function settleOpenSessions(db: Db, playerId: string): Promise<void> {
  const { data: sessions, error } = await db
    .from('table_sessions')
    .select('id, buy_in')
    .eq('player_id', playerId)
    .eq('status', 'open');
  if (error) throw new Error(error.message);
  for (const session of sessions ?? []) {
    const row = await loadGame(db, playerId, session.id);
    if (row) {
      await closeGame(db, row);
    } else {
      // No server game was ever created for this seat: return the buy-in.
      await cashOut(db, session.id, Number(session.buy_in));
    }
  }
}

function sanitizeRemotes(value: unknown): RemotePlayer[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const { id, name } = entry as { id?: unknown; name?: unknown };
    if (typeof id !== 'string' || typeof name !== 'string' || id.length > 64) return [];
    return [{ id, name: name.slice(0, 40), avatarUrl: null, avatarEmoji: '🙂' }];
  });
}

function requireUuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/i.test(value)) throw new Error(`Invalid ${label}`);
  return value;
}

export const getTableGame = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tableId: string }) => ({ tableId: requireUuid(input?.tableId, 'table') }))
  .handler(async ({ data, context }): Promise<TableGameResult> => {
    const db = await adminDb();
    const player = await loadPlayer(db, context.userId);
    const { data: row, error } = await db
      .from('table_game_states')
      .select(GAME_COLUMNS)
      .eq('player_id', player.id)
      .eq('table_id', data.tableId)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? { closed: false, view: toView(row as GameRow) } : { closed: true, view: null };
  });

export const sitDownAtTable = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tableId: string; buyIn: number }) => {
    const buyIn = Number(input?.buyIn);
    if (!Number.isFinite(buyIn) || buyIn <= 0) throw new Error('Invalid buy-in');
    return { tableId: requireUuid(input?.tableId, 'table'), buyIn: Math.floor(buyIn) };
  })
  .handler(async ({ data, context }): Promise<TableGameResult> => {
    const db = await adminDb();
    const player = await loadPlayer(db, context.userId);
    await settleOpenSessions(db, player.id);

    const { data: tableRow, error: tableError } = await db
      .from('poker_tables')
      .select('id, small_blind, big_blind, min_buy_in, max_buy_in, bot_level')
      .eq('id', data.tableId)
      .eq('is_active', true)
      .maybeSingle();
    if (tableError) throw new Error(tableError.message);
    if (!tableRow) throw new Error('Table not found or not active');
    // The bot skill is fixed per table by the admin; players cannot choose it.
    const botLevel = tableBotLevel(tableRow.bot_level);

    const { data: sessionId, error: buyError } = await db.rpc('server_buy_in', {
      p_auth: context.userId,
      p_amount: data.buyIn,
      p_table_id: data.tableId,
    });
    if (buyError) throw new Error(buyError.message);

    const base: TableState = {
      seats: [
        createHumanSeat(player.id, player.display_name, data.buyIn, 0, player.avatar_url, player.avatar_emoji),
        ...Array<null>(SEAT_COUNT - 1).fill(null),
      ],
      dealer: 0,
      hand: null,
      handCount: 0,
      config: {
        smallBlind: Number(tableRow.small_blind),
        bigBlind: Number(tableRow.big_blind),
        minBuyIn: Number(tableRow.min_buy_in),
        maxBuyIn: Number(tableRow.max_buy_in),
      },
    };
    const table = reconcileSeats(base, []);
    const { data: created, error: insertError } = await db
      .from('table_game_states')
      .insert({
        session_id: sessionId as string,
        player_id: player.id,
        table_id: data.tableId,
        bot_level: botLevel,
        state: table as unknown as Json,
        next_at: new Date(Date.now() + delayFor(table)).toISOString(),
      })
      .select(GAME_COLUMNS)
      .maybeSingle();
    if (insertError || !created) {
      await cashOut(db, sessionId as string, data.buyIn);
      throw new Error(insertError?.message ?? 'Could not open the table');
    }
    return { closed: false, view: toView(created as GameRow) };
  });

export const tickTableGame = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string; remotes?: { id: string; name: string }[] }) => ({
    sessionId: requireUuid(input?.sessionId, 'session'),
    remotes: sanitizeRemotes(input?.remotes),
  }))
  .handler(async ({ data, context }): Promise<TableGameResult> => {
    const db = await adminDb();
    const player = await loadPlayer(db, context.userId);
    const row = await loadGame(db, player.id, data.sessionId);
    if (!row) return { closed: true, view: null };
    if (Date.now() < new Date(row.next_at).getTime() - CLOCK_TOLERANCE_MS) return { closed: false, view: toView(row) };

    const rules = await loadRules(db, row);
    const step = autoStep(tableOf(row), data.remotes, rules);
    if (step.kind === 'bust') {
      const balance = await closeGame(db, row);
      return { closed: true, view: null, balance };
    }
    const saved = await saveGame(db, row, step.table);
    return { closed: false, view: toView(saved) };
  });

export const actAtTable = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string; action: Action }) => {
    if (!isValidAction(input?.action)) throw new Error('Invalid action');
    return { sessionId: requireUuid(input?.sessionId, 'session'), action: input.action };
  })
  .handler(async ({ data, context }): Promise<TableGameResult> => {
    const db = await adminDb();
    const player = await loadPlayer(db, context.userId);
    const row = await loadGame(db, player.id, data.sessionId);
    if (!row) return { closed: true, view: null };
    const table = tableOf(row);
    const me = myIndex(table);
    if (me === -1 || table.hand?.toAct !== me) return { closed: false, view: toView(row) };
    const next = applyAction(table, me, data.action);
    if (next === table) return { closed: false, view: toView(row) };
    const saved = await saveGame(db, row, next);
    return { closed: false, view: toView(saved) };
  });

export const leaveTable = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => ({ sessionId: requireUuid(input?.sessionId, 'session') }))
  .handler(async ({ data, context }): Promise<TableGameResult> => {
    const db = await adminDb();
    const player = await loadPlayer(db, context.userId);
    const row = await loadGame(db, player.id, data.sessionId);
    if (!row) return { closed: true, view: null };
    const balance = await closeGame(db, row);
    return { closed: true, view: null, balance };
  });
