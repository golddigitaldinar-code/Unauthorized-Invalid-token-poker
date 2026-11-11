import { describe, expect, it } from 'vitest';
import { effectiveRake, tableBotLevel } from '@/poker/session';

describe('per-table rules', () => {
  it('uses the bot skill the admin fixed for the table', () => {
    expect(tableBotLevel('hard')).toBe('hard');
  });

  it('falls back to normal bots when the table value is missing or invalid', () => {
    expect(tableBotLevel(undefined)).toBe('normal');
    expect(tableBotLevel('super-easy')).toBe('normal');
  });

  it("uses the table's own house cut over the house default", () => {
    expect(effectiveRake(2, 5)).toBe(2);
  });

  it('falls back to the house default cut when the table has none', () => {
    expect(effectiveRake(null, 5)).toBe(5);
  });

  it('never lets the house cut go above 20%', () => {
    expect(effectiveRake(35, 5)).toBe(20);
  });
});
