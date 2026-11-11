/**
 * Casino sound effects synthesised with the Web Audio API (no audio files to download).
 * Every sound is built from filtered noise bursts and short resonant pings so cards
 * snap, chips clack and the table knocks like a real felt table, with a light room echo.
 */
import {
  DEFAULT_SOUND_PREFS,
  SOUND_GROUPS,
  normalizeSoundPrefs,
  sameSoundPrefs,
  soundGroup,
  volumeToGain,
  type SoundGroup,
  type SoundPrefs,
} from '@/lib/sound-prefs';

export type SoundName =
  | 'shuffle'
  | 'deal'
  | 'chip'
  | 'fold'
  | 'check'
  | 'call'
  | 'raise'
  | 'allin'
  | 'collect'
  | 'win'
  | 'lose'
  | 'turn'
  | 'tick';

const STORAGE_KEY = 'master-poker-sound-prefs';
const LEGACY_KEY = 'master-poker-sound';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let room: ConvolverNode | null = null;
const buses: Partial<Record<SoundGroup, GainNode>> = {};
/** The volume group the sound being scheduled right now belongs to. */
let activeGroup: SoundGroup = 'table';
let prefs: SoundPrefs = DEFAULT_SOUND_PREFS;
let loaded = false;
const listeners = new Set<() => void>();
const lastPlay: Record<string, number> = {};

function loadPreference(): void {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) prefs = normalizeSoundPrefs(JSON.parse(saved));
    else if (window.localStorage.getItem(LEGACY_KEY) === 'off') prefs = { ...DEFAULT_SOUND_PREFS, muted: true };
  } catch {
    prefs = DEFAULT_SOUND_PREFS;
  }
}

function applyBusVolumes(): void {
  for (const group of SOUND_GROUPS) {
    const bus = buses[group];
    if (bus && ctx) bus.gain.setTargetAtTime(volumeToGain(prefs[group]), ctx.currentTime, 0.02);
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    // Short, soft room reverb so sounds feel like they're in a card room, not inside headphones.
    room = ctx.createConvolver();
    const length = Math.floor(ctx.sampleRate * 0.35);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
    room.buffer = impulse;
    const wet = ctx.createGain();
    wet.gain.value = 0.12;
    room.connect(wet);
    wet.connect(master);
    // One volume knob per group (cards, chips, table), each feeding the speakers and the room echo.
    for (const group of SOUND_GROUPS) {
      const bus = ctx.createGain();
      bus.gain.value = volumeToGain(prefs[group]);
      bus.connect(master);
      bus.connect(room);
      buses[group] = bus;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function connectOut(node: AudioNode, ac: AudioContext): void {
  node.connect(buses[activeGroup] ?? master ?? ac.destination);
}

let noiseBuffer: AudioBuffer | null = null;
function whiteNoise(ac: AudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ac.sampleRate) {
    noiseBuffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Filtered noise burst — the building block for card snaps, slides and chip clicks. */
function burst(opts: {
  at: number;
  duration: number;
  gain: number;
  freq: number;
  q?: number;
  type?: BiquadFilterType;
  attack?: number;
  sweepTo?: number;
}): void {
  const ac = getCtx();
  if (!ac) return;
  const start = ac.currentTime + opts.at;
  const src = ac.createBufferSource();
  src.buffer = whiteNoise(ac);
  const filter = ac.createBiquadFilter();
  filter.type = opts.type ?? 'bandpass';
  filter.frequency.setValueAtTime(opts.freq, start);
  if (opts.sweepTo) filter.frequency.exponentialRampToValueAtTime(opts.sweepTo, start + opts.duration);
  filter.Q.value = opts.q ?? 1;
  const vol = ac.createGain();
  const attack = opts.attack ?? 0.002;
  vol.gain.setValueAtTime(0.0001, start);
  vol.gain.linearRampToValueAtTime(opts.gain, start + attack);
  vol.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);
  src.connect(filter);
  filter.connect(vol);
  connectOut(vol, ac);
  src.start(start, Math.random() * 0.5);
  src.stop(start + opts.duration + 0.05);
}

/** Short pitched ping — the ring of a clay chip or a bell partial. */
function ping(opts: { at: number; freq: number; duration: number; gain: number; type?: OscillatorType; dropTo?: number }): void {
  const ac = getCtx();
  if (!ac) return;
  const start = ac.currentTime + opts.at;
  const osc = ac.createOscillator();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, start);
  if (opts.dropTo) osc.frequency.exponentialRampToValueAtTime(opts.dropTo, start + opts.duration);
  const vol = ac.createGain();
  vol.gain.setValueAtTime(0.0001, start);
  vol.gain.linearRampToValueAtTime(opts.gain, start + 0.003);
  vol.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);
  osc.connect(vol);
  connectOut(vol, ac);
  osc.start(start);
  osc.stop(start + opts.duration + 0.05);
}

function cardSnap(at: number, loud = 1): void {
  // The card sliding off the deck, then landing flat on the felt.
  burst({ at, duration: 0.07, gain: 0.05 * loud, freq: 1800, q: 0.7, attack: 0.03, sweepTo: 3200 });
  burst({ at: at + 0.06, duration: 0.035, gain: 0.22 * loud, freq: rand(2600, 3400), q: 1.2 });
  burst({ at: at + 0.062, duration: 0.05, gain: 0.08 * loud, freq: 350, type: 'lowpass' });
}

function chipClick(at: number, loud = 1): void {
  burst({ at, duration: 0.018, gain: 0.3 * loud, freq: rand(3800, 6200), q: 5 });
  ping({ at, freq: rand(4200, 6800), duration: rand(0.03, 0.06), gain: 0.025 * loud });
}

function chips(at: number, count: number, spread: number, loud = 1): number {
  let t = at;
  for (let i = 0; i < count; i++) {
    chipClick(t, loud * rand(0.7, 1));
    t += rand(spread * 0.5, spread * 1.3);
  }
  // Chips settling onto the felt.
  burst({ at: t, duration: 0.06, gain: 0.06 * loud, freq: 500, type: 'lowpass' });
  return t;
}

function knock(at: number): void {
  ping({ at, freq: 150, dropTo: 80, duration: 0.11, gain: 0.45 });
  burst({ at, duration: 0.04, gain: 0.25, freq: 900, type: 'lowpass' });
}

function bell(at: number, freq: number, gain: number, duration = 0.9): void {
  ping({ at, freq, duration, gain });
  ping({ at, freq: freq * 2.01, duration: duration * 0.6, gain: gain * 0.35 });
  ping({ at, freq: freq * 3.02, duration: duration * 0.35, gain: gain * 0.15 });
}

function throttle(name: string, ms: number): boolean {
  const now = Date.now();
  if (lastPlay[name] && now - lastPlay[name] < ms) return false;
  lastPlay[name] = now;
  return true;
}

/** Plays a sound, optionally `delay` seconds from now. Silent when muted or before audio is unlocked. */
export function playSound(sound: SoundName, delay = 0): void {
  loadPreference();
  if (prefs.muted) return;
  activeGroup = soundGroup(sound);
  // The win fanfare is chips then a chime; it plays if either of those groups is audible.
  if (prefs[activeGroup] <= 0 && !(sound === 'win' && prefs.table > 0)) return;
  if (!getCtx()) return;
  const at = Math.max(0, delay);
  switch (sound) {
    case 'shuffle': {
      if (!throttle('shuffle', 800)) return;
      // Riffle: two halves of the deck flicking together, then squared up.
      let t = at;
      for (let i = 0; i < 26; i++) {
        burst({ at: t, duration: 0.012, gain: rand(0.06, 0.12), freq: rand(2500, 4500), q: 2 });
        t += rand(0.014, 0.026);
      }
      burst({ at: t + 0.04, duration: 0.18, gain: 0.08, freq: 1200, q: 0.6, attack: 0.05, sweepTo: 600 });
      burst({ at: t + 0.24, duration: 0.05, gain: 0.18, freq: 400, type: 'lowpass' });
      break;
    }
    case 'deal':
      cardSnap(at);
      break;
    case 'chip':
      chips(at, 2, 0.04, 0.8);
      break;
    case 'call':
      chips(at, 3, 0.045);
      break;
    case 'raise':
      chips(at, 5, 0.035, 1.05);
      break;
    case 'allin':
      // A whole stack shoved forward: slide then a cascade of chips.
      burst({ at, duration: 0.25, gain: 0.1, freq: 900, q: 0.5, attack: 0.08 });
      chips(at + 0.12, 10, 0.022, 1.1);
      break;
    case 'collect':
      // Dealer raking chips across the felt into the pot.
      burst({ at, duration: 0.3, gain: 0.07, freq: 1400, q: 0.5, attack: 0.1, sweepTo: 700 });
      chips(at + 0.08, 7, 0.03, 0.75);
      break;
    case 'check':
      knock(at);
      knock(at + 0.14);
      break;
    case 'fold':
      // Cards tossed face down and sliding across the felt.
      burst({ at, duration: 0.22, gain: 0.12, freq: 2200, q: 0.8, attack: 0.02, sweepTo: 900 });
      burst({ at: at + 0.02, duration: 0.03, gain: 0.12, freq: 3000, q: 1 });
      break;
    case 'win': {
      const end = chips(at, 12, 0.025, 0.9);
      activeGroup = 'table';
      bell(end + 0.05, 784, 0.07);
      bell(end + 0.17, 1175, 0.06);
      break;
    }
    case 'lose':
      ping({ at, freq: 330, dropTo: 300, duration: 0.35, gain: 0.04 });
      ping({ at: at + 0.18, freq: 247, dropTo: 220, duration: 0.5, gain: 0.04 });
      break;
    case 'turn':
      if (!throttle('turn', 600)) return;
      bell(at, 1046, 0.06, 0.7);
      break;
    case 'tick':
      burst({ at, duration: 0.015, gain: 0.08, freq: 2000, q: 3 });
      break;
  }
}

/** Current mute switch and the three volumes (0–100). */
export function getSoundPrefs(): SoundPrefs {
  loadPreference();
  return prefs;
}

/** Changes sound settings, applies them straight away and remembers them on this device. */
export function setSoundPrefs(change: Partial<SoundPrefs>): void {
  loadPreference();
  const next = normalizeSoundPrefs({ ...prefs, ...change });
  if (sameSoundPrefs(next, prefs)) return;
  prefs = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Private mode: keep the choice for this visit only.
  }
  applyBusVolumes();
  if (!prefs.muted) getCtx();
  for (const listener of listeners) listener();
}

export function setSoundEnabled(on: boolean): void {
  setSoundPrefs({ muted: !on });
}

export function isSoundEnabled(): boolean {
  return !getSoundPrefs().muted;
}

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Browsers only allow audio after a tap or click; call this from one. */
export function primeAudio(): void {
  loadPreference();
  if (!prefs.muted) getCtx();
}
