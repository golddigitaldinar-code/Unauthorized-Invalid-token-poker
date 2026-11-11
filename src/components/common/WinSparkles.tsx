// A one-off burst of gold sparkles; re-mount (change key) to play again.
const BURST = Array.from({ length: 14 }, (_, index) => {
  const angle = (index / 14) * Math.PI * 2;
  const distance = 46 + (index % 3) * 18;
  return { dx: Math.cos(angle) * distance, dy: Math.sin(angle) * distance, delay: (index % 4) * 0.06, size: 4 + (index % 3) * 2 };
});

export function WinSparkles() {
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
      {BURST.map((spark, index) => (
        <span
          key={index}
          className={`absolute rounded-full ${index % 3 === 0 ? 'bg-live' : 'bg-gold'}`}
          style={{
            width: spark.size,
            height: spark.size,
            ['--dx' as string]: `${spark.dx}px`,
            ['--dy' as string]: `${spark.dy}px`,
            animation: `sparkle-pop 1.1s ease-out ${spark.delay}s both`,
          }}
        />
      ))}
    </span>
  );
}
