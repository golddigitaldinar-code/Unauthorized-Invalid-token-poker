import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SoundControls } from '@/components/poker/SoundControls';
import { useSoundPrefs } from '@/hooks/useTableSounds';

/** Speaker button that opens the mute switch and card / chip / table volume sliders. */
export function SoundToggle({ className = '' }: { className?: string }) {
  const [prefs] = useSoundPrefs();
  const loudest = Math.max(prefs.card, prefs.chip, prefs.table);
  const silent = prefs.muted || loudest === 0;
  const Icon = silent ? VolumeX : loudest < 50 ? Volume1 : Volume2;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Sound settings"
          title="Sound settings"
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-gold/50 hover:text-gold data-[state=open]:border-gold/60 data-[state=open]:text-gold ${className}`}
        >
          <Icon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border-gold/25 bg-card p-4">
        <p className="mb-3 font-display text-xs font-bold uppercase tracking-[0.2em] text-gold">Game sounds</p>
        <SoundControls />
        <p className="mt-3 text-[11px] text-muted-foreground">Saved to your account.</p>
      </PopoverContent>
    </Popover>
  );
}
