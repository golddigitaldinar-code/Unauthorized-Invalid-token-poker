import { describe, expect, it } from 'vitest';
import { tableSoundEvents } from '@/poker/sound-events';
import type { Seat, TableState } from '@/poker/types';

function seat(id: string, extra: Partial<Seat> = {}): Seat {
  return {
    id, name: id, isBot: id !== 'me', isMe: id === 'me', tone: 0, stack: 1000, bet: 0, invested: 0,
    hole: [{}, {}] as unknown as Seat['hole'],
    folded: false, allIn: false, acted: false, sittingOut: false, avatarUrl: null, avatarEmoji: '🙂', ...extra,
  };
}

function table(seats: (Seat | null)[], hand: Partial<NonNullable<TableState['hand']>> = {}): TableState {
  return {
    seats, dealer: 0, handCount: 1, config: { smallBlind: 5, bigBlind: 10, minBuyIn: 100, maxBuyIn: 1000 },
    hand: { number: 1, street: 'preflop', board: [], deck: [], pot: 0, currentBet: 10, minRaise: 10, toAct: 1, winners: [], rake: 0, rakePercent: 0, showdown: false, ...hand },
  };
}

const sounds = (events: { sound: string }[]) => events.map((e) => e.sound);

describe('table sounds', () => {
  it('shuffles and deals two cards per player on a new hand', () => {
    const events = tableSoundEvents(table([seat('me'), seat('bot')], { number: 1 }), table([seat('me'), seat('bot')], { number: 2 }));
    expect(sounds(events)[0]).toBe('shuffle');
    expect(sounds(events).filter((s) => s === 'deal')).toHaveLength(4);
  });

  it('plays a fold, a raise and a check for the matching moves', () => {
    const prev = table([seat('me'), seat('a', { bet: 10, invested: 10 }), seat('b')]);
    const next = table([seat('me', { folded: true }), seat('a', { bet: 30, invested: 30, acted: true }), seat('b', { acted: true })]);
    expect(sounds(tableSoundEvents(prev, next)).sort()).toEqual(['check', 'fold', 'raise']);
  });

  it('plays the winning sound only when I win the pot', () => {
    const prev = table([seat('me'), seat('bot')], { street: 'river' });
    const won = table([seat('me'), seat('bot')], { street: 'complete', winners: [{ seat: 0, amount: 100, label: 'Pair' }] });
    const lost = table([seat('me'), seat('bot')], { street: 'complete', winners: [{ seat: 1, amount: 100, label: 'Pair' }] });
    expect(sounds(tableSoundEvents(prev, won))).toContain('win');
    expect(sounds(tableSoundEvents(prev, lost))).not.toContain('win');
  });
});
