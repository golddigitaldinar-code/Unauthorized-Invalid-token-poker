// Random, realistic screen names for AI players. Pure (rng is injectable) so it can be tested.
// AI seats still show the robot icon at the table; only the name is randomised.

export type BotGender = 'f' | 'm';

const FEMALE = [
  'Mae', 'Joy', 'Kristine', 'Aira', 'Bea', 'Jhen', 'Trixie', 'Camille', 'Liza', 'Shaira', 'Nikki', 'Angel',
  'Rhea', 'Faye', 'Lovely', 'Janelle', 'Pia', 'Kaye', 'Mika', 'Hazel', 'Ivy', 'Rina', 'Cheska', 'Denise',
  'Yuki', 'Sakura', 'Ana', 'Lucia', 'Nadia', 'Leah', 'Tess', 'Grace', 'Monique', 'Aiko', 'Carla', 'Dina',
];
const MALE = [
  'Jhun', 'Rommel', 'Mark', 'Paolo', 'Carlo', 'Kevin', 'Ryan', 'Bong', 'Jomar', 'Arnel', 'Migs', 'Jepoy',
  'Rico', 'Dennis', 'Noel', 'Jayson', 'Ervin', 'Ramil', 'Bryan', 'Gelo', 'Marvin', 'Jun', 'Toto', 'Raffy',
  'Hiro', 'Takeshi', 'Luis', 'Marco', 'Andrei', 'Ivan', 'Rafael', 'Nico', 'Enzo', 'Kenzo', 'Dong', 'Alvin',
];
const SURNAME_INITIALS = 'ABCDGLMRSTVY';
const POKER_WORDS = ['Ace', 'River', 'AllIn', 'Bluff', 'Royal', 'Flush', 'Kings', 'Pocket', 'Nuts', 'Chip', 'Turn', 'Lucky'];
const TAGS = ['ph', 'mnl', 'ceb', 'dvo', 'qc', 'pro', 'x'];

type Rng = () => number;

function pick<T>(list: readonly T[], rng: Rng): T {
  return list[Math.floor(rng() * list.length) % list.length]!;
}

function digits(rng: Rng): string {
  const styles = [() => String(Math.floor(rng() * 90) + 10), () => String(Math.floor(rng() * 30) + 85).slice(-2), () => '0' + Math.floor(rng() * 9 + 1)];
  return pick(styles, rng)();
}

/** One screen name, e.g. "Jhen_23", "Paolo D.", "RiverMigs", "kaye.ceb", "ACE_RICO". */
export function randomBotName(gender: BotGender, rng: Rng = Math.random): string {
  const first = pick(gender === 'f' ? FEMALE : MALE, rng);
  const styles: (() => string)[] = [
    () => first,
    () => `${first} ${pick([...SURNAME_INITIALS], rng)}.`,
    () => `${first}${digits(rng)}`,
    () => `${first}_${digits(rng)}`,
    () => `${first.toLowerCase()}.${pick(TAGS, rng)}`,
    () => `${pick(POKER_WORDS, rng)}${first}`,
    () => `${pick(POKER_WORDS, rng).toUpperCase()}_${first.toUpperCase()}`,
    () => `${first}${pick(POKER_WORDS, rng)}`,
  ];
  return pick(styles, rng)();
}

/** A name not already used at the table (case-insensitive). */
export function uniqueBotName(gender: BotGender, taken: Iterable<string>, rng: Rng = Math.random): string {
  const used = new Set([...taken].map((name) => name.toLowerCase()));
  for (let attempt = 0; attempt < 40; attempt++) {
    const name = randomBotName(gender, rng);
    if (!used.has(name.toLowerCase())) return name;
  }
  let n = 2;
  const base = randomBotName(gender, rng);
  while (used.has(`${base}${n}`.toLowerCase())) n++;
  return `${base}${n}`;
}
