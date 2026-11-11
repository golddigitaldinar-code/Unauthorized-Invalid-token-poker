import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Eye } from "lucide-react";
import { ChipColumnSvg, ChipStack } from "@/components/poker/ChipStack";
import type { ChipColor } from "@/poker/chips";
import { PlayingCard } from "@/components/poker/PlayingCard";
import { SeatView } from "@/components/poker/SeatView";
import { formatChips } from "@/lib/format";
import { potTotal } from "@/poker/engine";
import type { DealerPersona } from "@/poker/dealers";
import type { HandState, Seat, TableState } from "@/poker/types";

// 8 seats around a racetrack table; the dealer sits behind the top rail. Seat 0 is you.
// Seats sit on the rail so the felt (board, pot, dealer) stays clear.
const SEAT_LAYOUT = [
  { x: 38, y: 95 }, // 0 — you
  { x: 62, y: 95 }, // 1
  { x: 86, y: 87 }, // 2
  { x: 97, y: 50 }, // 3
  { x: 80, y: 8 }, // 4
  { x: 20, y: 8 }, // 5
  { x: 3, y: 50 }, // 6
  { x: 14, y: 87 }, // 7
];
// Phones: a tall racetrack with every seat inside the rail, clear of the board in the middle.
const PORTRAIT_SEAT_LAYOUT = [
  { x: 34, y: 87.5 }, // 0 — you
  { x: 66, y: 87.5 }, // 1
  { x: 87, y: 67 }, // 2
  { x: 87, y: 41.5 }, // 3
  { x: 76, y: 15 }, // 4
  { x: 24, y: 15 }, // 5
  { x: 13, y: 41.5 }, // 6
  { x: 13, y: 67 }, // 7
];
// Phone bet spots: side seats bet just below their seat so chips never land on the shared cards.
const PORTRAIT_BETS = [
  { x: 39, y: 73 },
  { x: 61, y: 73 },
  { x: 81, y: 79 },
  { x: 87, y: 54 },
  { x: 66, y: 28 },
  { x: 34, y: 28 },
  { x: 13, y: 54 },
  { x: 19, y: 79 },
];
// Wide screens: the table stretches between these width:height ratios instead of shrinking with screen height.
const MIN_RATIO = 2;
const MAX_RATIO = 2.6;
const MAX_WIDTH = 1400;
const MIN_HEIGHT = 340;
/** Reserved for the top bar, action bar and spacing below the table. */
const RESERVED_HEIGHT = 250;

interface TableSize {
  width: number;
  height: number;
  /** Shrinks seats and board cards together on smaller tables so nothing overlaps. */
  scale: number;
}

function computeTableSize(available: number, viewportHeight: number): TableSize {
  // Phones keep the portrait table; only the seat/card scale is computed.
  if (available < 640)
    return { width: 0, height: 0, scale: Math.min(1, Math.max(0.8, available / 400)) };
  let width = Math.min(available, MAX_WIDTH);
  const maxHeight = Math.max(MIN_HEIGHT, viewportHeight - RESERVED_HEIGHT);
  const height = Math.min(width / MIN_RATIO, maxHeight);
  if (width / height > MAX_RATIO) width = height * MAX_RATIO;
  const scale = Math.min(1.08, Math.max(0.72, height / 440));
  return { width: Math.round(width), height: Math.round(height), scale: Number(scale.toFixed(3)) };
}

function useTableSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<TableSize | null>(null);
  useEffect(() => {
    const element = ref.current?.parentElement;
    if (!element) return;
    const update = () => {
      const style = window.getComputedStyle(element);
      const available =
        element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      setSize(computeTableSize(available, window.innerHeight));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  return { ref, size };
}

function Scaled({ children }: { children: ReactNode }) {
  return <div style={{ scale: "var(--seat-scale, 1)" }}>{children}</div>;
}
const BET_RATIO = 0.5;
const SPOT_RATIO = 0.36;
// Gold markers on the rail (top/bottom straights and both ends), as on a real casino table.
const RAIL_INLAYS = [
  { x: 30, y: 3.1, vertical: true },
  { x: 70, y: 3.1, vertical: true },
  { x: 30, y: 96.9, vertical: true },
  { x: 70, y: 96.9, vertical: true },
  { x: 1.6, y: 50, vertical: false },
  { x: 98.4, y: 50, vertical: false },
];

function statusFor(seat: Seat, hand: HandState | null): string | null {
  if (seat.sittingOut) return null;
  if (!hand || hand.street === "complete") return null;
  if (seat.folded) return "Folded";
  if (seat.allIn) return "All-in";
  return null;
}

interface PokerTableProps {
  table: TableState;
  meIndex: number;
  dealer: DealerPersona;
  streetLabel: string;
}

const CHIP_RACK: ChipColor[] = ["red", "blue", "green", "gold", "black"];

export function PokerTable({ table, meIndex, dealer, streetLabel }: PokerTableProps) {
  const hand = table.hand;
  const pot = potTotal(table);
  const finished = hand?.street === "complete";
  const revealCards = !!hand?.showdown && finished;
  const isDealing = hand?.street === "preflop" && hand.board.length === 0 && !!hand.toAct;
  const winnerSeats = new Set(hand?.winners.map((award) => award.seat) ?? []);
  const seatCount = table.seats.filter(Boolean).length;
  const { ref, size } = useTableSize();
  const wide = !!size && size.width > 0;
  const layout = wide ? SEAT_LAYOUT : PORTRAIT_SEAT_LAYOUT;
  const sizeStyle: CSSProperties | undefined = size
    ? ({
        ...(wide ? { width: size.width, height: size.height } : {}),
        "--seat-scale": size.scale,
      } as CSSProperties)
    : undefined;

  return (
    <div
      ref={ref}
      style={sizeStyle}
      className={`relative mx-auto ${wide ? "" : "aspect-[3/4] w-full max-w-md"}`}
    >
      {/* Floor shadow */}
      <div className="pointer-events-none absolute inset-x-[4%] -bottom-[4%] h-[18%] rounded-full bg-black/70 blur-2xl" />

      {/* Polished mahogany rail */}
      <div className="table-rail absolute inset-0 rounded-full" />
      {/* Gold inlays set into the rail */}
      {RAIL_INLAYS.map((inlay) => (
        <span
          key={`${inlay.x}-${inlay.y}`}
          aria-hidden
          className={`pointer-events-none absolute z-[1] hidden -translate-x-1/2 -translate-y-1/2 rounded-full bg-[image:var(--gradient-gold)] shadow-[0_0_6px_color-mix(in_oklab,var(--gold)_60%,transparent)] ${wide ? "block" : ""} ${
            inlay.vertical ? "h-[4.2%] w-[3px]" : "h-[3px] w-[2.1%]"
          }`}
          style={{ left: `${inlay.x}%`, top: `${inlay.y}%` }}
        />
      ))}
      {/* Thin gold edge between rail and felt */}
      <div className="absolute inset-[6.2%] rounded-full bg-[image:var(--gradient-gold)] opacity-70" />
      {/* Felt */}
      <div className="felt-texture absolute inset-[6.6%] rounded-full shadow-[inset_0_0_90px_rgba(0,0,0,0.6),inset_0_3px_0_rgba(255,255,255,0.06)]" />
      {/* Overhead light */}
      <div className="pointer-events-none absolute inset-[6.6%] animate-spotlight rounded-full bg-[radial-gradient(ellipse_at_50%_45%,rgba(255,240,200,0.16),transparent_60%)]" />
      {/* Racetrack betting line */}
      <div
        className={`pointer-events-none absolute rounded-full border-2 border-foreground/25 ${wide ? "inset-x-[17%] inset-y-[20%]" : "inset-x-[24%] inset-y-[25%]"}`}
      />

      {/* Card spots printed in front of every seat */}
      {SEAT_LAYOUT.map((position, index) => {
        const x = position.x + (50 - position.x) * SPOT_RATIO;
        const y = position.y + (50 - position.y) * SPOT_RATIO;
        return (
          <div
            key={`spot-${index}`}
            aria-hidden
            className={`pointer-events-none absolute z-[2] -translate-x-1/2 -translate-y-1/2 gap-1 ${wide ? "flex" : "hidden"}`}
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <span className="h-[34px] w-[24px] rounded-[4px] border-2 border-foreground/20" />
            <span className="h-[34px] w-[24px] rounded-[4px] border-2 border-foreground/20" />
          </div>
        );
      })}

      {/* Dealer behind the top rail */}
      <div
        className={`pointer-events-none absolute left-1/2 z-[15] -translate-x-1/2 ${wide ? "top-[-11%] h-[38%]" : "top-[-3%] w-[22%]"}`}
      >
        <img
          src={dealer.avatarUrl}
          alt={`Dealer ${dealer.name}`}
          width={569}
          height={640}
          className={`${wide ? "h-full w-auto" : "h-auto w-full"} drop-shadow-[0_14px_18px_rgba(0,0,0,0.6)] transition-transform duration-500 ${isDealing ? "animate-dealer-deal" : ""}`}
        />
        <span
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-gold/60 bg-wood-deep/95 px-2 py-0.5 font-display font-bold uppercase tracking-[0.25em] text-gold shadow-lg ${wide ? "text-[10px]" : "text-[8px]"}`}
        >
          {wide ? `Dealer · ${dealer.name}` : dealer.name}
        </span>
      </div>

      {/* Felt printing */}
      <div
        className={`pointer-events-none absolute left-[17%] top-1/2 z-[3] -translate-x-1/2 -translate-y-1/2 ${wide ? "block" : "hidden"}`}
      >
        <span className="block text-center font-display text-[clamp(10px,1.2vw,17px)] font-extrabold uppercase leading-tight tracking-[0.25em] text-gold/45">
          Master
          <br />
          Poker
        </span>
      </div>

      {/* Board cards + pot */}
      <div
        className="absolute left-1/2 top-[48%] z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
        style={{ scale: "var(--seat-scale, 1)" }}
      >
        <span className="rounded-full bg-black/45 px-3 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-50/80 sm:text-[10px]">
          {hand && !finished ? streetLabel : hand ? "Showdown" : `${seatCount} seated`}
        </span>
        <div className="flex items-center gap-1 p-1.5 sm:gap-1.5">
          <div
            className={`mr-3 flex-col items-center gap-1 ${wide ? "flex" : "hidden"}`}
            aria-hidden
          >
            <div className="flex items-end gap-[2px] rounded-md border border-gold/30 bg-wood-deep/70 p-1 shadow-inner">
              {CHIP_RACK.map((color, index) => (
                <ChipColumnSvg key={color} color={color} count={4} offset={index} />
              ))}
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-foreground/70 bg-foreground text-[6px] font-black uppercase tracking-tight text-background shadow-lg">
              Dealer
            </span>
          </div>
          {Array.from({ length: 5 }).map((_, index) => {
            const card = hand?.board[index];
            return card ? (
              <PlayingCard
                key={`${hand?.number}-${index}-${card.rank}${card.suit}`}
                card={card}
                size="sm"
                delayMs={index * 140}
              />
            ) : (
              <div
                key={`slot-${index}`}
                className="h-[44px] w-[32px] rounded-md border-2 border-foreground/25 sm:h-[60px] sm:w-[42px]"
              />
            );
          })}
          <div className={`ml-3 items-end gap-2 ${wide ? "flex" : "hidden"}`} aria-hidden>
            <div className="relative h-[60px] w-[42px]">
              {[3, 2, 1, 0].map((layer) => (
                <div
                  key={layer}
                  className="absolute"
                  style={{ left: layer * 1.2, top: -layer * 1.2 }}
                >
                  <PlayingCard faceDown size="sm" />
                </div>
              ))}
            </div>
            <div className="relative h-[60px] w-[42px] opacity-80">
              {[0, 1, 2].map((layer) => (
                <div
                  key={layer}
                  className="absolute inset-0"
                  style={{ transform: `rotate(${layer * 9 - 9}deg)` }}
                >
                  <PlayingCard faceDown size="sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          {pot > 0 && <ChipStack amount={pot} />}
          <span
            key={pot}
            className="animate-pot-bump rounded-full border border-gold-400/40 bg-black/70 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-gold-300 shadow-[0_0_24px_rgba(232,192,106,0.25)] sm:text-xs"
          >
            Pot {formatChips(pot)}
          </span>
          {finished && hand && hand.rake > 0 && (
            <span className="text-[9px] uppercase tracking-wider text-emerald-50/60 sm:text-[10px]">
              Rake {formatChips(hand.rake)}
            </span>
          )}
        </div>
      </div>

      {/* Bets in front of each seat */}
      {table.seats.slice(0, layout.length).map((seat, index) => {
        if (!seat || !hand || finished || seat.bet <= 0) return null;
        const position = layout[index]!;
        const portraitBet = PORTRAIT_BETS[index];
        const x = wide || !portraitBet ? position.x + (50 - position.x) * BET_RATIO : portraitBet.x;
        const y = wide || !portraitBet ? position.y + (50 - position.y) * BET_RATIO : portraitBet.y;
        return (
          <div
            key={`bet-${hand.number}-${hand.street}-${index}-${seat.bet}`}
            className="absolute z-15 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <Scaled>
              <ChipStack amount={seat.bet} />
            </Scaled>
          </div>
        );
      })}

      {/* Seats */}
      {table.seats.slice(0, layout.length).map((seat, index) => {
        const position = layout[index]!;
        if (!seat) {
          return (
            <div
              key={`empty-${index}`}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
            >
              <Scaled>
                <div className="flex w-16 flex-col items-center gap-1 opacity-40 sm:w-20">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-foreground/25 bg-black/30 sm:h-10 sm:w-10">
                    <Eye className="h-3 w-3 text-foreground/40 sm:h-4 sm:w-4" />
                  </div>
                  <span className="text-[8px] text-foreground/40 sm:text-[9px]">Open</span>
                </div>
              </Scaled>
            </div>
          );
        }
        return (
          <div
            key={`${seat.id}-${index}`}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 animate-seat-in"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              animationDelay: `${index * 60}ms`,
            }}
          >
            <Scaled>
              <SeatView
                seat={seat}
                isDealer={table.dealer === index}
                isTurn={hand?.toAct === index}
                isWinner={winnerSeats.has(index)}
                revealCards={revealCards && !seat.folded}
                statusLabel={statusFor(seat, hand)}
                isYou={index === meIndex}
              />
            </Scaled>
          </div>
        );
      })}
    </div>
  );
}
