import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSoundPrefs, setSoundPrefs, subscribeSound } from '@/lib/sounds';
import { normalizeSoundPrefs, sameSoundPrefs, type SoundPrefs } from '@/lib/sound-prefs';

const SAVE_DELAY_MS = 700;

function toRow(userId: string, prefs: SoundPrefs) {
  return {
    user_id: userId,
    muted: prefs.muted,
    card_volume: prefs.card,
    chip_volume: prefs.chip,
    table_volume: prefs.table,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Keeps the signed-in player's sound settings in their account, so the same
 * volumes follow them to any phone or computer they sign in on.
 */
export function useSoundPreferencesSync(userId: string | null | undefined): void {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let ready = false;
    let lastSaved: SoundPrefs | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const save = async (prefs: SoundPrefs) => {
      const { error } = await supabase.from('sound_preferences').upsert(toRow(userId, prefs));
      if (!error) lastSaved = prefs;
      else console.warn('Could not save sound settings', error.message);
    };

    void (async () => {
      const { data, error } = await supabase
        .from('sound_preferences')
        .select('muted, card_volume, chip_volume, table_volume')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn('Could not load sound settings', error.message);
      } else if (data) {
        const saved = normalizeSoundPrefs(data);
        lastSaved = saved;
        setSoundPrefs(saved);
      } else {
        // First time on this account: keep what they already picked on this device.
        await save(getSoundPrefs());
      }
      ready = true;
    })();

    const unsubscribe = subscribeSound(() => {
      if (!ready) return;
      const current = getSoundPrefs();
      if (lastSaved && sameSoundPrefs(current, lastSaved)) return;
      clearTimeout(timer);
      timer = setTimeout(() => void save(getSoundPrefs()), SAVE_DELAY_MS);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      // Don't lose a change made right before leaving.
      if (timer) {
        clearTimeout(timer);
        const current = getSoundPrefs();
        if (!lastSaved || !sameSoundPrefs(current, lastSaved)) void save(current);
      }
    };
  }, [userId]);
}
