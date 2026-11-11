import { useId } from 'react';
import { formatChips } from '@/lib/format';
import { chipColumns, type ChipColor } from '@/poker/chips';

interface ChipStackProps {
  amount: number;
  label?: string;
}

/** Edge-spot colour on each clay colour: cream spots, except on white chips which get blue spots. */
const SPOT: Record<ChipColor, string> = {
  white: 'var(--chip-blue)',
  red: 'var(--chip-inlay)',
  green: 'var(--chip-inlay)',
  black: 'var(--chip-inlay)',
  purple: 'var(--chip-inlay)',
  gold: 'var(--chip-black)',
  blue: 'var(--chip-inlay)',
};

const RX = 12;
const RY = 5;
const EDGE = 3.2;
const SPOT_ANGLES = [-75, -45, -15, 15, 45, 75];

/** A single stack of real-looking clay chips: striped edges, inlaid face and a soft shadow. */
function ChipColumnSvg({ color, count, offset }: { color: ChipColor; count: number; offset: number }) {
  const id = useId().replace(/:/g, '');
  const width = RX * 2 + 2;
  const height = RY * 2 + EDGE * count + 3;
  const cx = width / 2;
  const clay = `var(--chip-${color})`;
  const spot = SPOT[color];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-[18px] drop-shadow-[0_1px_1px_oklch(0_0_0/0.6)] sm:w-[22px]" aria-hidden>
      <defs>
        <linearGradient id={`${id}-side`} x1="0" x2="1">
          <stop offset="0" stopColor="var(--chip-shade)" stopOpacity="0.45" />
          <stop offset="0.35" stopColor="var(--chip-shade)" stopOpacity="0" />
          <stop offset="0.7" stopColor="var(--chip-shade)" stopOpacity="0.1" />
          <stop offset="1" stopColor="var(--chip-shade)" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id={`${id}-face`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="var(--chip-inlay)" stopOpacity="0.35" />
          <stop offset="0.6" stopColor="var(--chip-inlay)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--chip-shade)" stopOpacity="0.25" />
        </radialGradient>
      </defs>
      {/* Shadow on the felt */}
      <ellipse cx={cx} cy={height - RY - 0.5} rx={RX + 0.5} ry={RY} fill="var(--chip-shade)" opacity="0.35" />
      {Array.from({ length: count }).map((_, i) => {
        const top = height - RY - 2 - EDGE * (i + 1);
        const turn = (i * 23 + offset * 11) % 30;
        return (
          <g key={i}>
            {/* Chip edge: a short cylinder with cream edge spots wrapping around it */}
            <ellipse cx={cx} cy={top + EDGE} rx={RX} ry={RY} fill={clay} />
            <rect x={cx - RX} y={top} width={RX * 2} height={EDGE} fill={clay} />
            {SPOT_ANGLES.map((angle) => {
              const a = ((angle + turn) * Math.PI) / 180;
              const w = 3.4 * Math.cos(a);
              if (w < 0.6) return null;
              const x = cx + RX * Math.sin(a) - w / 2;
              return <rect key={angle} x={x} y={top + 0.2} width={w} height={EDGE - 0.4} fill={spot} />;
            })}
            <rect x={cx - RX} y={top} width={RX * 2} height={EDGE} fill={`url(#${id}-side)`} />
            <ellipse cx={cx} cy={top + EDGE} rx={RX} ry={RY} fill="none" stroke="var(--chip-shade)" strokeOpacity="0.35" strokeWidth="0.4" />
            {/* Chip face */}
            <ellipse cx={cx} cy={top} rx={RX} ry={RY} fill={clay} />
            {i === count - 1 && (
              <>
                <ellipse
                  cx={cx}
                  cy={top}
                  rx={RX - 1.3}
                  ry={RY - 0.55}
                  fill="none"
                  stroke={spot}
                  strokeWidth="1.6"
                  strokeDasharray="3.2 3.6"
                  strokeDashoffset={turn / 4}
                />
                <ellipse cx={cx} cy={top} rx={RX - 4} ry={RY - 1.7} fill={clay} stroke={spot} strokeWidth="0.45" />
                <ellipse cx={cx} cy={top} rx={RX - 5.6} ry={RY - 2.35} fill="none" stroke={spot} strokeOpacity="0.7" strokeWidth="0.35" strokeDasharray="0.8 0.8" />
                <ellipse cx={cx} cy={top} rx={RX} ry={RY} fill={`url(#${id}-face)`} />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function ChipStack({ amount, label }: ChipStackProps) {
  const columns = chipColumns(amount);
  return (
    <div className="inline-flex items-center gap-1 animate-chip-in">
      <div className="flex items-end">
        {columns.map((column, index) => (
          <div key={column.value} className={index > 0 ? '-ml-1.5' : undefined} style={{ zIndex: columns.length - index }}>
            <ChipColumnSvg color={column.color} count={column.count} offset={index} />
          </div>
        ))}
      </div>
      <span className="rounded-full border border-gold/30 bg-room/85 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground shadow-sm sm:px-2 sm:text-xs">
        {label ? `${label} ` : ''}
        {formatChips(amount)}
      </span>
    </div>
  );
}

export { ChipColumnSvg };
