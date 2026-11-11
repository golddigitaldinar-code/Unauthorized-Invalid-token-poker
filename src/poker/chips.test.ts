import { describe, expect, it } from 'vitest';
import { chipColumns } from '@/poker/chips';

describe('chipColumns', () => {
  it('uses the largest chips first', () => {
    expect(chipColumns(1630).map((c) => [c.value, c.count])).toEqual([
      [1000, 1],
      [500, 1],
      [100, 1],
    ]);
  });

  it('builds stacks for small bets', () => {
    expect(chipColumns(60).map((c) => [c.value, c.count])).toEqual([
      [25, 2],
      [5, 2],
    ]);
  });

  it('shows half-peso blinds', () => {
    expect(chipColumns(0.5)).toEqual([{ value: 0.5, color: 'blue', count: 1 }]);
  });

  it('caps a stack at 6 chips', () => {
    expect(chipColumns(4)).toEqual([{ value: 1, color: 'white', count: 4 }]);
    expect(chipColumns(9000)[0]).toEqual({ value: 1000, color: 'gold', count: 6 });
  });
});
