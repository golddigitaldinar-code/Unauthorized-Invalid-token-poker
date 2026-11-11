import dealerFemale from '@/assets/dealer-female.png';
import dealerMale from '@/assets/dealer-male.png';

export interface DealerPersona {
  name: string;
  /** Waist-up illustration of the dealer, drawn facing the players. */
  avatarUrl: string;
  tagline: string;
}

const DEALER_PERSONAS: DealerPersona[] = [
  {
    name: 'Rico',
    avatarUrl: dealerMale,
    tagline: 'Keeps the game fast and the pot honest.',
  },
  {
    name: 'Bianca',
    avatarUrl: dealerFemale,
    tagline: 'Eagle-eyed — no chip slide gets past her.',
  },
  {
    name: 'Marco',
    avatarUrl: dealerMale,
    tagline: 'Steady hands, calm voice, reads the table.',
  },
  {
    name: 'Lara',
    avatarUrl: dealerFemale,
    tagline: 'Sharp dresser, sharper eyes.',
  },
  {
    name: 'Tomas',
    avatarUrl: dealerMale,
    tagline: 'Tournament veteran who never misses a bet.',
  },
  {
    name: 'Nina',
    avatarUrl: dealerFemale,
    tagline: 'Cool under pressure, fair to every player.',
  },
];

export function dealerFor(tableId: string): DealerPersona {
  let hash = 0;
  for (const char of tableId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return DEALER_PERSONAS[hash % DEALER_PERSONAS.length]!;
}

export function dealerNameFor(tableId: string): string {
  return dealerFor(tableId).name;
}
