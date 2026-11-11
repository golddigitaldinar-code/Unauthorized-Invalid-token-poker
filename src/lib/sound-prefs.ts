import type { SoundName } from '@/lib/sounds';

/** The three volume groups a player can set separately. */
export type SoundGroup = 'card' | 'chip' | 'table';

export interface SoundPrefs {
  muted: boolean;
  card: number;
  chip: number;
  table: number;
}

export const SOUND_GROUPS: SoundGroup[] = ['card', 'chip', 'table'];

export const DEFAULT_SOUND_PREFS: SoundPrefs = { muted: false, card: 80, chip: 80, table: 80 };

/** Which volume slider controls each sound. Card handling, chip handling, everything else on the table. */
const GROUP_OF: Record<SoundName, SoundGroup> = {
  shuffle: 'card',
  deal: 'card',
  fold: 'card',
  chip: 'chip',
  call: 'chip',
  raise: 'chip',
  allin: 'chip',
  collect: 'chip',
  win: 'chip',
  check: 'table',
  turn: 'table',
  tick: 'table',
  lose: 'table',
};

export function soundGroup(sound: SoundName): SoundGroup {
  return GROUP_OF[sound];
}

function clampVolume(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.round(Math.min(100, Math.max(0, n)));
}

/** Cleans up saved settings from storage or the database; anything missing falls back to the defaults. */
export function normalizeSoundPrefs(raw: unknown): SoundPrefs {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    muted: value['muted'] === true,
    card: clampVolume(value['card'] ?? value['card_volume'], DEFAULT_SOUND_PREFS.card),
    chip: clampVolume(value['chip'] ?? value['chip_volume'], DEFAULT_SOUND_PREFS.chip),
    table: clampVolume(value['table'] ?? value['table_volume'], DEFAULT_SOUND_PREFS.table),
  };
}

/** Slider position (0–100) to loudness. 80 is the original loudness; 0 is silent. */
export function volumeToGain(volume: number): number {
  if (volume <= 0) return 0;
  return Math.pow(volume / 80, 1.6);
}

export function sameSoundPrefs(a: SoundPrefs, b: SoundPrefs): boolean {
  return a.muted === b.muted && a.card === b.card && a.chip === b.chip && a.table === b.table;
}
