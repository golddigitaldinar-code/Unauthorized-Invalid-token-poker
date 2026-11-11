// Card suits drifting up behind the page. Fixed values (no randomness) so server and browser render the same.
const SUITS = [
  { glyph: '♠', left: 4, size: 28, duration: 26, delay: 0, sway: 40, tone: 'text-gold' },
  { glyph: '♥', left: 14, size: 18, duration: 21, delay: 7, sway: -30, tone: 'text-burgundy' },
  { glyph: '♦', left: 23, size: 22, duration: 29, delay: 3, sway: 25, tone: 'text-gold' },
  { glyph: '♣', left: 33, size: 34, duration: 34, delay: 12, sway: -45, tone: 'text-live' },
  { glyph: '♠', left: 44, size: 16, duration: 19, delay: 5, sway: 20, tone: 'text-gold' },
  { glyph: '♥', left: 53, size: 26, duration: 31, delay: 15, sway: -25, tone: 'text-burgundy' },
  { glyph: '♦', left: 62, size: 20, duration: 24, delay: 1, sway: 35, tone: 'text-gold' },
  { glyph: '♣', left: 71, size: 30, duration: 28, delay: 9, sway: -35, tone: 'text-live' },
  { glyph: '♠', left: 80, size: 22, duration: 23, delay: 18, sway: 30, tone: 'text-gold' },
  { glyph: '♥', left: 88, size: 32, duration: 33, delay: 4, sway: -40, tone: 'text-burgundy' },
  { glyph: '♦', left: 95, size: 18, duration: 20, delay: 11, sway: 18, tone: 'text-gold' },
];

export function FloatingSuits({ intensity = 0.1 }: { intensity?: number }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {SUITS.map((suit, index) => (
        <span
          key={index}
          className={`absolute -bottom-12 font-display ${suit.tone}`}
          style={{
            left: `${suit.left}%`,
            fontSize: suit.size,
            animation: `suit-drift ${suit.duration}s linear ${-suit.delay}s infinite`,
            ['--sway' as string]: `${suit.sway}px`,
            ['--suit-opacity' as string]: String(intensity),
          }}
        >
          {suit.glyph}
        </span>
      ))}
    </div>
  );
}
