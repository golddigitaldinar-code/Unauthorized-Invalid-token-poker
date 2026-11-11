// A fanned hand of five cards that gently floats (landing page decoration).
const CARDS = [
  { rank: 'A', suit: '♠', red: false },
  { rank: 'K', suit: '♥', red: true },
  { rank: 'Q', suit: '♦', red: true },
  { rank: 'J', suit: '♣', red: false },
  { rank: '10', suit: '♠', red: false },
];

export function CardFan({ className = 'relative' }: { className?: string }) {
  return (
    <div aria-hidden className={`group pointer-events-auto h-36 w-56 ${className}`}>
      {CARDS.map((card, index) => {
        const angle = (index - 2) * 11;
        return (
          <div
            key={card.rank + card.suit}
            className="absolute bottom-0 left-1/2 h-32 w-[5.5rem] origin-bottom transition-transform duration-500"
            style={{ marginLeft: '-2.75rem', transform: `rotate(${angle}deg)` }}
          >
            <div className="h-full w-full" style={{ animation: `float 6s ease-in-out ${index * 0.3}s infinite` }}>
            <div className="flex h-full w-full flex-col justify-between rounded-xl border border-gold/40 bg-foreground p-2 shadow-[0_14px_30px_-10px_oklch(0_0_0/80%)]">
              <span className={`font-display text-lg font-black leading-none ${card.red ? 'text-burgundy' : 'text-background'}`}>
                {card.rank}
                <span className="block text-base">{card.suit}</span>
              </span>
              <span className={`self-end font-display text-3xl leading-none ${card.red ? 'text-burgundy' : 'text-background'}`}>
                {card.suit}
              </span>
            </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
