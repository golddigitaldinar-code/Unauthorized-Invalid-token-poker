import type { SoundName } from '@/lib/sounds';
import type { TableState } from '@/poker/types';

export interface SoundEvent {
  sound: SoundName;
  /** Seconds after the update arrives. */
  delay: number;
}

/**
 * Works out which table sounds to play between two snapshots of the table.
 * Pure so it can be tested; the server may send several moves in one update.
 */
export function tableSoundEvents(prev: TableState | null, next: TableState): SoundEvent[] {
  const hand = next.hand;
  if (!hand) return [];
  const events: SoundEvent[] = [];
  const before = prev?.hand ?? null;

  // A new hand: shuffle, deal two cards to everyone in turn, then the blinds go in.
  if (!before || before.number !== hand.number) {
    events.push({ sound: 'shuffle', delay: 0 });
    const players = next.seats.filter((seat) => seat && seat.hole.length > 0).length;
    const deals = Math.min(players * 2, 16);
    for (let i = 0; i < deals; i++) events.push({ sound: 'deal', delay: 0.75 + i * 0.11 });
    const blindsPosted = next.seats.some((seat) => seat && seat.invested > 0);
    if (blindsPosted) events.push({ sound: 'chip', delay: 0.85 + deals * 0.11 });
    return events;
  }

  const streetChanged = before.street !== hand.street;
  let anyMove = false;

  next.seats.forEach((seat, index) => {
    const old = prev?.seats[index];
    if (!seat || !old || old.id !== seat.id) return;
    if (!old.folded && seat.folded) {
      events.push({ sound: 'fold', delay: 0 });
      anyMove = true;
      return;
    }
    if (seat.invested > old.invested) {
      anyMove = true;
      if (seat.allIn && !old.allIn) events.push({ sound: 'allin', delay: 0 });
      else if (!streetChanged && seat.bet > before.currentBet) events.push({ sound: 'raise', delay: 0 });
      else events.push({ sound: 'call', delay: 0 });
      return;
    }
    if (!streetChanged && seat.acted && !old.acted && !seat.folded && !seat.allIn) {
      events.push({ sound: 'check', delay: 0 });
      anyMove = true;
    }
  });

  // The street closed on a check we can't attribute (acted flags reset with the new street).
  if (streetChanged && !anyMove && hand.street !== 'complete') events.push({ sound: 'check', delay: 0 });

  let at = anyMove || streetChanged ? 0.3 : 0;
  if (streetChanged && prev?.seats.some((seat) => seat && seat.bet > 0)) {
    events.push({ sound: 'collect', delay: at });
    at += 0.45;
  }
  for (let i = before.board.length; i < hand.board.length; i++) {
    events.push({ sound: 'deal', delay: at });
    at += 0.16;
  }

  if (hand.street === 'complete' && before.street !== 'complete') {
    const meIndex = next.seats.findIndex((seat) => seat?.isMe);
    const iWon = meIndex !== -1 && hand.winners.some((award) => award.seat === meIndex);
    const meInHand = meIndex !== -1 && next.seats[meIndex] && !next.seats[meIndex]!.folded && (next.seats[meIndex]!.hole.length ?? 0) > 0;
    events.push({ sound: iWon ? 'win' : 'collect', delay: at + 0.4 });
    if (!iWon && meInHand) events.push({ sound: 'lose', delay: at + 0.9 });
    return events;
  }

  const meIndex = next.seats.findIndex((seat) => seat?.isMe);
  if (meIndex !== -1 && hand.toAct === meIndex && (before.toAct !== meIndex || streetChanged)) {
    events.push({ sound: 'turn', delay: at + 0.15 });
  }
  return events;
}
