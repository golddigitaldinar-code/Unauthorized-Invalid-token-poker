import { describe, expect, it } from 'vitest';
import { emptyTable } from '@/poker/engine';
import { createHumanSeat, reconcileSeats } from '@/poker/seating';

describe('8 players per table', () => {
  it('fills a new table to exactly 8 players', () => {
    const table = emptyTable();
    table.seats[0] = createHumanSeat('me', 'Me', 1000, 0, null, '🙂');
    const seated = reconcileSeats(table, []);
    expect(seated.seats).toHaveLength(8);
    expect(seated.seats.filter(Boolean)).toHaveLength(8);
  });

  it('shrinks an older 9-seat table to 8 and keeps the real player', () => {
    const table = emptyTable();
    table.seats = [...table.seats, null];
    table.seats[8] = createHumanSeat('me', 'Me', 1000, 0, null, '🙂');
    const seated = reconcileSeats(table, []);
    expect(seated.seats).toHaveLength(8);
    expect(seated.seats.some((seat) => seat?.id === 'me')).toBe(true);
  });

  it('gives every AI player its own photo', () => {
    const table = emptyTable();
    table.seats[0] = createHumanSeat('me', 'Me', 1000, 0, null, '🙂');
    const bots = reconcileSeats(table, []).seats.filter((seat) => seat?.isBot);
    const photos = new Set(bots.map((seat) => seat!.avatarUrl));
    expect(photos.size).toBe(bots.length);
    expect(bots.every((seat) => !!seat!.avatarUrl && !seat!.avatarUrl.startsWith('https://images.unsplash.com'))).toBe(true);
  });
});
