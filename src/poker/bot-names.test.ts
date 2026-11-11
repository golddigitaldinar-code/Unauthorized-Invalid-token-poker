import { describe, expect, it } from 'vitest';
import { uniqueBotName } from '@/poker/bot-names';
import { emptyTable } from '@/poker/engine';
import { createHumanSeat, reconcileSeats } from '@/poker/seating';

describe('AI player names', () => {
  it('never repeats a name at the same table', () => {
    for (let round = 0; round < 50; round++) {
      const table = emptyTable();
      table.seats[0] = createHumanSeat('me', 'Me', 1000, 0, null, '🙂');
      const names = reconcileSeats(table, []).seats.filter((s) => s?.isBot).map((s) => s!.name.toLowerCase());
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('gives different tables different line-ups of names', () => {
    const lineups = new Set<string>();
    for (let round = 0; round < 10; round++) {
      const table = emptyTable();
      table.seats[0] = createHumanSeat('me', 'Me', 1000, 0, null, '🙂');
      lineups.add(reconcileSeats(table, []).seats.filter((s) => s?.isBot).map((s) => s!.name).join('|'));
    }
    expect(lineups.size).toBeGreaterThan(1);
  });

  it('avoids a name that is already taken', () => {
    let calls = 0;
    const rng = () => (calls++ < 2 ? 0 : 0.5); // first try returns the first female name, plain style
    expect(uniqueBotName('f', ['MAE'], rng).toLowerCase()).not.toBe('mae');
  });

  it('keeps AI players marked as AI', () => {
    const table = emptyTable();
    table.seats[0] = createHumanSeat('me', 'Me', 1000, 0, null, '🙂');
    const bots = reconcileSeats(table, []).seats.filter((s) => s && s.id !== 'me');
    expect(bots.every((s) => s!.isBot)).toBe(true);
  });
});

describe('older saved tables', () => {
  it('renames AI players saved with the old fixed names but keeps their photo', () => {
    const table = emptyTable();
    table.seats[0] = createHumanSeat('me', 'Me', 1000, 0, null, '🙂');
    const seated = reconcileSeats(table, []);
    const bot = seated.seats.find((s) => s?.isBot)!;
    const photo = bot.avatarUrl;
    const key = bot.photoKey!;
    const oldName = key.charAt(0).toUpperCase() + key.slice(1); // e.g. "Ariana"
    const { photoKey: _dropped, ...rest } = bot;
    const legacy = { ...rest, name: oldName };
    const again = reconcileSeats({ ...seated, seats: seated.seats.map((s) => (s === bot ? legacy : s)) }, []);
    const renamed = again.seats.find((s) => s?.id === bot.id)!;
    expect(renamed.photoKey).toBe(key);
    expect(renamed.avatarUrl).toBe(photo);
    expect(renamed.name).not.toBe(oldName);
  });
});
