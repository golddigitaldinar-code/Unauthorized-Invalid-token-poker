import { describe, expect, it } from 'vitest';
import { normalizeSoundPrefs, soundGroup, volumeToGain } from '@/lib/sound-prefs';

describe('sound volume groups', () => {
  it('puts card handling under the card volume', () => {
    expect(soundGroup('shuffle')).toBe('card');
    expect(soundGroup('deal')).toBe('card');
    expect(soundGroup('fold')).toBe('card');
  });

  it('puts bets and pots under the chip volume', () => {
    expect(soundGroup('call')).toBe('chip');
    expect(soundGroup('raise')).toBe('chip');
    expect(soundGroup('allin')).toBe('chip');
    expect(soundGroup('collect')).toBe('chip');
  });

  it('puts knocks and the turn bell under the table volume', () => {
    expect(soundGroup('check')).toBe('table');
    expect(soundGroup('turn')).toBe('table');
  });

  it('a volume of 0 is silent', () => {
    expect(volumeToGain(0)).toBe(0);
  });
});

describe('saved sound settings', () => {
  it('reads a saved database row', () => {
    expect(normalizeSoundPrefs({ muted: true, card_volume: 10, chip_volume: 55, table_volume: 0 })).toEqual({
      muted: true,
      card: 10,
      chip: 55,
      table: 0,
    });
  });

  it('keeps volumes between 0 and 100', () => {
    expect(normalizeSoundPrefs({ card: 140, chip: -5, table: 'x' })).toEqual({ muted: false, card: 100, chip: 0, table: 80 });
  });
});
