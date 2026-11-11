/**
 * Server-authoritative cash-game steps. Pure functions over TableState so the
 * server (and tests) can drive a hand without any browser state.
 */
import { chooseBotAction } from '@/poker/bots';
import { applyAction, legalActions, startHand } from '@/poker/engine';
import { reconcileSeats, type RemotePlayer } from '@/poker/seating';
import type { Card } from '@/poker/cards';
import { BOT_LEVELS, type Action, type Aggression, type BotLevel, type TableState } from '@/poker/types';

export const TURN_SECONDS = 30;
export const NEXT_HAND_DELAY_MS = 2000;
export const RESULT_DISPLAY_MS = 9000;
export const BOT_MIN_THINK_MS = 2500;
export const BOT_MAX_THINK_MS = 5500;

export interface GameRules {
  rakePercent: number;
  botAggression: Aggression;
  botLevel?: BotLevel;
  /** Admin-set player winning rate, 0-100. 50 means neutral play; lower makes bots stronger. */
  winRate: number;
}

export function isBotLevel(value: unknown): value is BotLevel {
  return typeof value === 'string' && (BOT_LEVELS as string[]).includes(value);
}

/** The bot skill fixed for a table by the admin. Players never choose it. */
export function tableBotLevel(value: unknown): BotLevel {
  return isBotLevel(value) ? value : 'normal';
}

/** A table's own rake wins over the house default; both are clamped to 0-20%. */
export function effectiveRake(tableRake: number | null | undefined, houseRake: number): number {
  const value = tableRake === null || tableRake === undefined || !Number.isFinite(Number(tableRake)) ? houseRake : Number(tableRake);
  return Math.min(Math.max(value, 0), 20);
}

export function myIndex(table: TableState): number {
  return table.seats.findIndex((seat) => seat?.isMe);
}

export function myStack(table: TableState): number {
  return table.seats.find((seat) => seat?.isMe)?.stack ?? 0;
}

/** Milliseconds to wait before the next automatic step. */
export function delayFor(table: TableState): number {
  const hand = table.hand;
  if (!hand) return NEXT_HAND_DELAY_MS;
  if (hand.street === 'complete') return RESULT_DISPLAY_MS;
  if (hand.toAct === null) return NEXT_HAND_DELAY_MS;
  const actor = table.seats[hand.toAct];
  if (actor?.isBot) return BOT_MIN_THINK_MS + Math.random() * (BOT_MAX_THINK_MS - BOT_MIN_THINK_MS);
  return TURN_SECONDS * 1000;
}

export type AutoStepResult = { kind: 'table'; table: TableState } | { kind: 'bust' };

/** One automatic step: deal the next hand, clear a result, play a bot, or time out the player. */
export function autoStep(table: TableState, remotes: RemotePlayer[], rules: GameRules): AutoStepResult {
  const hand = table.hand;
  if (!hand) {
    if (myStack(table) <= 0) return { kind: 'bust' };
    return { kind: 'table', table: startHand(reconcileSeats(table, remotes), rules.rakePercent) };
  }
  if (hand.street === 'complete') return { kind: 'table', table: { ...table, hand: null } };
  if (hand.toAct === null) return { kind: 'table', table };

  const index = hand.toAct;
  const actor = table.seats[index];
  if (actor?.isBot) {
    return {
      kind: 'table',
      table: applyAction(table, index, chooseBotAction(table, index, rules.botAggression, rules.botLevel ?? 'normal', rules.winRate)),
    };
  }
  const legal = legalActions(table, index);
  const fallback: Action = legal?.canCheck ? { type: 'check' } : { type: 'fold' };
  return { kind: 'table', table: applyAction(table, index, fallback) };
}

/**
 * Settle the player's seat for leaving: fold a live hand (chips already in the pot stay there),
 * or, when the player is all-in, play the hand out instantly so they get what they win.
 * Returns the final chip count to cash out.
 */
export function settleForExit(table: TableState, rules: GameRules): number {
  let current = table;
  const me = myIndex(current);
  if (me === -1) return 0;
  const hand = current.hand;
  if (!hand || hand.street === 'complete') return myStack(current);

  const seat = current.seats[me]!;
  if (!seat.folded && !seat.allIn) {
    if (hand.toAct === me) {
      current = applyAction(current, me, { type: 'fold' });
    } else {
      current = {
        ...current,
        seats: current.seats.map((s, i) => (i === me && s ? { ...s, folded: true, acted: true } : s)),
      };
    }
    return myStack(current);
  }

  // All-in (or already folded): run the hand to the end with bots only.
  for (let guard = 0; guard < 200; guard++) {
    const h = current.hand;
    if (!h || h.street === 'complete' || h.toAct === null) break;
    const step = autoStep(current, [], rules);
    if (step.kind !== 'table' || step.table === current) break;
    current = step.table;
  }
  return myStack(current);
}

const HIDDEN_CARD: Card = { rank: 2, suit: 'S' };

/** What the player is allowed to see: no deck, no opponents' hole cards before showdown. */
export function redactFor(table: TableState): TableState {
  const hand = table.hand;
  const reveal = !!hand && hand.street === 'complete' && hand.showdown;
  return {
    ...table,
    seats: table.seats.map((seat) => {
      if (!seat || seat.isMe) return seat;
      if (reveal && !seat.folded) return seat;
      return { ...seat, hole: seat.hole.map(() => HIDDEN_CARD) };
    }),
    hand: hand ? { ...hand, deck: [] } : null,
  };
}

export function isValidAction(value: unknown): value is Action {
  if (!value || typeof value !== 'object') return false;
  const action = value as { type?: unknown; to?: unknown };
  if (action.type === 'fold' || action.type === 'check' || action.type === 'call') return true;
  return action.type === 'raise' && typeof action.to === 'number' && Number.isFinite(action.to) && action.to > 0;
}
