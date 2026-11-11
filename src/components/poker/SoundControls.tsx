import { Coins, Layers, Volume2, VolumeX, Bell } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useSoundPrefs } from '@/hooks/useTableSounds';
import { playSound, primeAudio, type SoundName } from '@/lib/sounds';
import type { SoundGroup } from '@/lib/sound-prefs';

const GROUPS: { group: SoundGroup; label: string; hint: string; icon: typeof Coins; sample: SoundName }[] = [
  { group: 'card', label: 'Cards', hint: 'Shuffle, deal, fold', icon: Layers, sample: 'deal' },
  { group: 'chip', label: 'Chips', hint: 'Bets, raises, pots', icon: Coins, sample: 'raise' },
  { group: 'table', label: 'Table', hint: 'Check knocks, your-turn bell', icon: Bell, sample: 'check' },
];

/** Mute switch and one volume slider each for card, chip and table sounds. */
export function SoundControls() {
  const [prefs, setPrefs] = useSoundPrefs();

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          primeAudio();
          const muted = !prefs.muted;
          setPrefs({ muted });
          if (!muted) playSound('chip');
        }}
        aria-pressed={!prefs.muted}
        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold transition ${
          prefs.muted ? 'border-border text-muted-foreground' : 'border-gold/40 bg-gold/10 text-gold'
        }`}
      >
        <span className="inline-flex items-center gap-2">
          {prefs.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {prefs.muted ? 'Sounds off' : 'Sounds on'}
        </span>
        <span className="text-xs font-medium">{prefs.muted ? 'Tap to turn on' : 'Tap to mute'}</span>
      </button>

      {GROUPS.map(({ group, label, hint, icon: Icon, sample }) => (
        <div key={group} className={prefs.muted ? 'opacity-50' : undefined}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-gold" />
              <span>
                <span className="block text-sm font-semibold text-foreground">{label}</span>
                <span className="block text-[11px] text-muted-foreground">{hint}</span>
              </span>
            </span>
            <span className="w-10 text-right text-xs font-bold tabular-nums text-gold">{prefs[group]}%</span>
          </div>
          <Slider
            value={[prefs[group]]}
            min={0}
            max={100}
            step={5}
            disabled={prefs.muted}
            aria-label={`${label} volume`}
            onValueChange={([value]) => setPrefs({ [group]: value ?? 0 })}
            onValueCommit={() => {
              primeAudio();
              playSound(sample);
            }}
          />
        </div>
      ))}
    </div>
  );
}
