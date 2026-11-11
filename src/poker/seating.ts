import arianaPhoto from '@/assets/bots/ariana.jpg';
import mateoPhoto from '@/assets/bots/mateo.jpg';
import kenjiPhoto from '@/assets/bots/kenji.jpg';
import sofiaPhoto from '@/assets/bots/sofia.jpg';
import dantePhoto from '@/assets/bots/dante.jpg';
import yunaPhoto from '@/assets/bots/yuna.jpg';
import leoPhoto from '@/assets/bots/leo.jpg';
import priyaPhoto from '@/assets/bots/priya.jpg';
import viktorPhoto from '@/assets/bots/viktor.jpg';
import meiPhoto from '@/assets/bots/mei.jpg';
import diegoPhoto from '@/assets/bots/diego.jpg';
import zaraPhoto from '@/assets/bots/zara.jpg';
import { SEAT_COUNT } from '@/poker/engine';
import { uniqueBotName, type BotGender } from '@/poker/bot-names';
import type { Seat, TableState } from '@/poker/types';

export interface RemotePlayer {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarEmoji: string;
}

export const BOT_ROSTER = [
  { key: 'ariana', name: 'Ariana', gender: 'f' as BotGender, tone: 0, emoji: '🦊', avatarUrl: arianaPhoto },
  { key: 'mateo', name: 'Mateo', gender: 'm' as BotGender, tone: 1, emoji: '🐺', avatarUrl: mateoPhoto },
  { key: 'kenji', name: 'Kenji', gender: 'm' as BotGender, tone: 2, emoji: '🐉', avatarUrl: kenjiPhoto },
  { key: 'sofia', name: 'Sofia', gender: 'f' as BotGender, tone: 3, emoji: '🦁', avatarUrl: sofiaPhoto },
  { key: 'dante', name: 'Dante', gender: 'm' as BotGender, tone: 4, emoji: '🦈', avatarUrl: dantePhoto },
  { key: 'yuna', name: 'Yuna', gender: 'f' as BotGender, tone: 5, emoji: '🦅', avatarUrl: yunaPhoto },
  { key: 'leo', name: 'Leo', gender: 'm' as BotGender, tone: 6, emoji: '🐅', avatarUrl: leoPhoto },
  { key: 'priya', name: 'Priya', gender: 'f' as BotGender, tone: 7, emoji: '🦝', avatarUrl: priyaPhoto },
  { key: 'viktor', name: 'Viktor', gender: 'm' as BotGender, tone: 0, emoji: '🐻', avatarUrl: viktorPhoto },
  { key: 'mei', name: 'Mei', gender: 'f' as BotGender, tone: 1, emoji: '🦄', avatarUrl: meiPhoto },
  { key: 'diego', name: 'Diego', gender: 'm' as BotGender, tone: 2, emoji: '🐊', avatarUrl: diegoPhoto },
  { key: 'zara', name: 'Zara', gender: 'f' as BotGender, tone: 3, emoji: '🦜', avatarUrl: zaraPhoto },
];

function randomBotStack(minBuyIn: number): number {
  const min = Math.max(minBuyIn, minBuyIn);
  const max = Math.round(minBuyIn * 3);
  const span = Math.max(1, (max - min) / 10);
  return min + Math.floor(Math.random() * span) * 10;
}

export function createHumanSeat(
  id: string,
  name: string,
  stack: number,
  tone: number,
  avatarUrl: string | null,
  avatarEmoji: string
): Seat {
  return {
    id,
    name,
    isBot: false,
    isMe: true,
    tone,
    stack,
    bet: 0,
    invested: 0,
    hole: [],
    folded: false,
    allIn: false,
    acted: false,
    sittingOut: false,
    avatarUrl,
    avatarEmoji,
  };
}

type RosterBot = (typeof BOT_ROSTER)[number];

function createBotSeat(bot: RosterBot, name: string, minBuyIn: number): Seat {
  return {
    id: `bot-${bot.key}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    isBot: true,
    isMe: false,
    tone: bot.tone,
    stack: randomBotStack(minBuyIn),
    bet: 0,
    invested: 0,
    hole: [],
    folded: false,
    allIn: false,
    acted: false,
    sittingOut: false,
    avatarUrl: bot.avatarUrl,
    avatarEmoji: bot.emoji,
    photoKey: bot.key,
  };
}

function createRemoteSeat(player: RemotePlayer, tone: number): Seat {
  return {
    id: player.id,
    name: player.name,
    isBot: false,
    isMe: false,
    tone,
    stack: 0,
    bet: 0,
    invested: 0,
    hole: [],
    folded: true,
    allIn: false,
    acted: false,
    sittingOut: true,
    avatarUrl: player.avatarUrl,
    avatarEmoji: player.avatarEmoji,
  };
}

function firstEmptySeat(seats: (Seat | null)[]): number {
  return seats.findIndex((seat) => seat === null);
}

function lastBotSeat(seats: (Seat | null)[]): number {
  for (let index = seats.length - 1; index >= 0; index--) {
    if (seats[index]?.isBot) return index;
  }
  return -1;
}

function seatPhotoKey(seat: Seat): string | undefined {
  return seat.photoKey ?? BOT_ROSTER.find((bot) => bot.name === seat.name)?.key;
}

/** A photo nobody at the table is using, plus a fresh random name nobody at the table has. */
function pickBot(seats: (Seat | null)[]): { bot: RosterBot; name: string } {
  const usedPhotos = new Set(seats.flatMap((seat) => (seat?.isBot ? [seatPhotoKey(seat)] : [])));
  const available = BOT_ROSTER.filter((bot) => !usedPhotos.has(bot.key));
  const pool = available.length > 0 ? available : BOT_ROSTER;
  const bot = pool[Math.floor(Math.random() * pool.length)]!;
  const takenNames = seats.flatMap((seat) => (seat ? [seat.name] : []));
  return { bot, name: uniqueBotName(bot.gender, takenNames) };
}

/** Shrinks tables saved with more than SEAT_COUNT seats, keeping real players and dropping AI players first. */
function fitToSeatCount(seats: (Seat | null)[]): (Seat | null)[] {
  if (seats.length <= SEAT_COUNT) return seats;
  const fitted = seats.slice(0, SEAT_COUNT);
  for (const extra of seats.slice(SEAT_COUNT)) {
    if (!extra || extra.isBot) continue;
    let slot = fitted.findIndex((seat) => seat === null);
    if (slot === -1) slot = lastBotSeat(fitted);
    if (slot !== -1) fitted[slot] = extra;
  }
  return fitted;
}

export function reconcileSeats(table: TableState, remotes: RemotePlayer[]): TableState {
  const seats: (Seat | null)[] = fitToSeatCount(table.seats).map((seat) => (seat ? { ...seat, hole: [] } : null));
  const remoteIds = new Set(remotes.map((player) => player.id));
  const minBuyIn = table.config.minBuyIn;

  seats.forEach((seat, index) => {
    if (seat && !seat.isBot && !seat.isMe && !remoteIds.has(seat.id)) seats[index] = null;
  });

  const seatedRemoteIds = new Set(
    seats.flatMap((seat) => (seat && !seat.isBot && !seat.isMe ? [seat.id] : []))
  );

  for (const player of remotes) {
    if (seatedRemoteIds.has(player.id)) continue;
    let slot = firstEmptySeat(seats);
    if (slot === -1) {
      const bot = lastBotSeat(seats);
      if (bot === -1) break;
      seats[bot] = null;
      slot = bot;
    }
    seats[slot] = createRemoteSeat(player, slot);
  }

  const humanCount = seats.filter((seat) => seat && !seat.isBot).length;
  const targetBots = Math.max(0, SEAT_COUNT - humanCount);

  let botCount = seats.filter((seat) => seat?.isBot).length;
  while (botCount > targetBots) {
    const bot = lastBotSeat(seats);
    if (bot === -1) break;
    seats[bot] = null;
    botCount--;
  }
  while (botCount < targetBots) {
    const slot = firstEmptySeat(seats);
    if (slot === -1) break;
    const { bot, name } = pickBot(seats);
    seats[slot] = createBotSeat(bot, name, minBuyIn);
    botCount++;
  }

  const rosterPhotos = new Map(BOT_ROSTER.map((bot) => [bot.key, bot.avatarUrl]));
  for (const seat of seats) {
    if (seat?.isBot && seat.stack < table.config.bigBlind * 5) seat.stack = randomBotStack(minBuyIn);
    // Saved tables keep photo links from an older build; re-point them at this build's photo.
    if (seat?.isBot) {
      // AI players saved before random names keep their photo but get a fresh name once.
      const legacy = !seat.photoKey ? BOT_ROSTER.find((bot) => bot.name === seat.name) : undefined;
      if (legacy) {
        seat.photoKey = legacy.key;
        seat.name = uniqueBotName(legacy.gender, seats.flatMap((other) => (other && other !== seat ? [other.name] : [])));
      }
      const key = seatPhotoKey(seat);
      if (key) seat.avatarUrl = rosterPhotos.get(key) ?? seat.avatarUrl;
    }
  }

  const dealer = table.dealer < seats.length ? table.dealer : 0;
  return { ...table, seats, dealer };
}
