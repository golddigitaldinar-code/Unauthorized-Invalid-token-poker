import { describe, expect, it } from 'vitest';
import { applyAction, emptyTable } from '@/poker/engine';
import { createHumanSeat, reconcileSeats } from '@/poker/seating';
import { autoStep, isValidAction, myStack, redactFor, settleForExit, type GameRules } from '@/poker/session';
import type { TableState } from '@/poker/types';

const rules: GameRules = { rakePercent: 5, botAggression: 'balanced', winRate: 50 };
const config = { smallBlind: 10, bigBlind: 20, minBuyIn: 500, maxBuyIn: 20000 };

function seatedTable(buyIn = 1000): TableState {
  const base = emptyTable(config);
  base.seats[0] = createHumanSeat('me', 'Me', buyIn, 0, null, '🙂');
  return reconcileSeats(base, []);
}

function dealt(): TableState {
  const step = autoStep(seatedTable(), [], rules);
  if (step.kind !== 'table') throw new Error('expected a hand');
  return step.table;
}

describe('server-side table session', () => {
  it('deals a hand from the stored table', () => {
    const table = dealt();
    expect(table.hand?.street).toBe('preflop');
    expect(table.hand?.board).toHaveLength(0);
  });

  it('cashes out exactly the stack when leaving between hands', () => {
    expect(settleForExit(seatedTable(1500), rules)).toBe(1500);
  });

  it('forfeits chips already bet when leaving mid-hand', () => {
    let table = dealt();
    const me = table.seats.findIndex((seat) => seat?.isMe);
    // Play bots until it's my turn, then call.
    for (let i = 0; i < 20 && table.hand?.toAct !== me && table.hand?.street !== 'complete'; i++) {
      const step = autoStep(table, [], rules);
      if (step.kind !== 'table') break;
      table = step.table;
    }
    if (table.hand?.toAct === me) table = applyAction(table, me, { type: 'call' });
    const invested = table.seats[me]!.invested;
    if (table.hand && table.hand.street !== 'complete') {
      expect(settleForExit(table, rules)).toBe(1000 - invested);
    }
  });

  it('busts the player out when their stack is empty between hands', () => {
    const table = seatedTable();
    table.seats[0] = { ...table.seats[0]!, stack: 0 };
    expect(autoStep(table, [], rules).kind).toBe('bust');
  });

  it('never sends the deck or opponents’ cards to the browser', () => {
    const table = dealt();
    const view = redactFor(table);
    expect(view.hand?.deck).toEqual([]);
    const real = table.seats.flatMap((seat) => (seat && !seat.isMe ? seat.hole : []));
    const shown = view.seats.flatMap((seat) => (seat && !seat.isMe ? seat.hole : []));
    expect(shown.length).toBe(real.length);
    expect(shown.every((card) => card.rank === 2 && card.suit === 'S')).toBe(true);
    // The player still sees their own cards and stack.
    expect(view.seats[0]!.hole).toEqual(table.seats[0]!.hole);
    expect(myStack(view)).toBe(myStack(table));
  });

  it('rejects malformed actions from the browser', () => {
    expect(isValidAction({ type: 'raise', to: -5 })).toBe(false);
    expect(isValidAction({ type: 'raise', to: Number.NaN })).toBe(false);
    expect(isValidAction({ type: 'win' })).toBe(false);
    expect(isValidAction({ type: 'call' })).toBe(true);
  });
});
