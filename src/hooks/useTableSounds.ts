import { useEffect, useRef, useSyncExternalStore } from 'react';
import { getSoundPrefs, isSoundEnabled, playSound, primeAudio, setSoundEnabled, setSoundPrefs, subscribeSound } from '@/lib/sounds';
import { DEFAULT_SOUND_PREFS, type SoundPrefs } from '@/lib/sound-prefs';
import { tableSoundEvents } from '@/poker/sound-events';
import type { TableState } from '@/poker/types';

/** Plays shuffle, deal, chip, check, fold and win sounds as the cash table changes. */
export function useTableSounds(table: TableState, active: boolean): void {
  const prevRef = useRef<TableState | null>(null);

  useEffect(() => {
    const unlock = () => primeAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (!active) {
      prevRef.current = null;
      return;
    }
    const prev = prevRef.current;
    prevRef.current = table;
    // Don't replay a whole hand's worth of sounds when first opening a table mid-hand.
    if (!prev) return;
    for (const event of tableSoundEvents(prev, table)) playSound(event.sound, event.delay);
  }, [table, active]);
}

/** Shared on/off switch for game sounds, remembered on this device. */
export function useSoundSetting(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribeSound, isSoundEnabled, () => true);
  return [on, setSoundEnabled];
}

/** Mute switch plus card, chip and table volumes, shared everywhere and saved to the player's account. */
export function useSoundPrefs(): [SoundPrefs, (change: Partial<SoundPrefs>) => void] {
  const prefs = useSyncExternalStore(subscribeSound, getSoundPrefs, () => DEFAULT_SOUND_PREFS);
  return [prefs, setSoundPrefs];
}
