import { supabase } from '@/lib/supabase';
import {
  DEFAULT_TABLE_SETTINGS,
  type AccountStatus,
  type GameLogRow,
  type PaymentMethod,
  type PlayerRow,
  type PokerTableRow,
  type QRCodeRow,
  type TableSettings,
  type TransactionRow,
  type TransactionType,
} from '@/lib/models';

function must<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

const AVATAR_LINK_SECONDS = 60 * 60 * 24 * 365;
const PROOF_LINK_SECONDS = 60 * 60;

async function currentAuthId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Please sign in again.');
  return data.user.id;
}

export async function fetchPlayerByAuthId(authId: string): Promise<PlayerRow | null> {
  return must(
    await supabase.from('players').select('*').eq('auth_id', authId).maybeSingle()
  ) as unknown as PlayerRow | null;
}

export async function fetchPlayer(playerId: string): Promise<PlayerRow | null> {
  return must(
    await supabase.from('players').select('*').eq('id', playerId).maybeSingle()
  ) as unknown as PlayerRow | null;
}

export async function fetchAllPlayers(): Promise<PlayerRow[]> {
  return must(
    await supabase.from('players').select('*').order('created_at', { ascending: false }).limit(500)
  ) as unknown as PlayerRow[];
}

export async function fetchPlayerTransactions(playerId: string): Promise<TransactionRow[]> {
  return must(
    await supabase
      .from('transactions')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(20)
  ) as unknown as TransactionRow[];
}

export async function fetchAllTransactions(): Promise<TransactionRow[]> {
  return must(
    await supabase
      .from('transactions')
      .select('*, players!transactions_player_id_fkey(display_name, balance)')
      .order('created_at', { ascending: false })
      .limit(200)
  ) as unknown as TransactionRow[];
}

export async function submitTransactionRequest(input: {
  playerId: string;
  type: TransactionType;
  amount: number;
  method: PaymentMethod;
  accountDetails: string;
  proofUrl?: string | null;
  qrCodeId?: string | null;
}): Promise<void> {
  must(
    await supabase.from('transactions').insert({
      player_id: input.playerId,
      type: input.type,
      amount: input.amount,
      method: input.method,
      account_details: input.accountDetails,
      proof_url: input.proofUrl ?? null,
      qr_code_id: input.qrCodeId ?? null,
    })
  );
}

export async function fetchGameLogs(): Promise<GameLogRow[]> {
  return must(
    await supabase.from('game_logs').select('*').order('id', { ascending: false }).limit(200)
  ) as unknown as GameLogRow[];
}

export async function fetchTableSettings(): Promise<TableSettings> {
  const rows = must(await supabase.from('settings').select('key, value')) as {
    key: string;
    value: unknown;
  }[];
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const aggression = map.get('bot_aggression');
  return {
    rakePercent: Number(map.get('rake_percent') ?? DEFAULT_TABLE_SETTINGS.rakePercent),
    botAggression:
      aggression === 'passive' || aggression === 'aggressive' || aggression === 'balanced'
        ? aggression
        : DEFAULT_TABLE_SETTINGS.botAggression,
    minBuyIn: Number(map.get('min_buy_in') ?? DEFAULT_TABLE_SETTINGS.minBuyIn),
    maxBuyIn: Number(map.get('max_buy_in') ?? DEFAULT_TABLE_SETTINGS.maxBuyIn),
    welcomeBonus: Number(map.get('welcome_bonus') ?? DEFAULT_TABLE_SETTINGS.welcomeBonus),
    referralReward: Number(map.get('referral_reward') ?? DEFAULT_TABLE_SETTINGS.referralReward),
    referralMinRecharge: Number(map.get('referral_min_recharge') ?? DEFAULT_TABLE_SETTINGS.referralMinRecharge),
    playerWinRate: Number(map.get('player_win_rate') ?? DEFAULT_TABLE_SETTINGS.playerWinRate),
  };
}

export async function fetchPokerTables(): Promise<PokerTableRow[]> {
  return must(
    await supabase
      .from('poker_tables')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
  ) as unknown as PokerTableRow[];
}

export async function fetchPokerTable(tableId: string): Promise<PokerTableRow | null> {
  return must(
    await supabase.from('poker_tables').select('*').eq('id', tableId).eq('is_active', true).maybeSingle()
  ) as unknown as PokerTableRow | null;
}

export async function fetchQRCodes(): Promise<QRCodeRow[]> {
  return must(
    await supabase
      .from('qr_codes')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
  ) as unknown as QRCodeRow[];
}

/** Admin status comes from the signed-in account's role, checked again by every admin action on the server. */
export async function fetchIsAdmin(): Promise<boolean> {
  const authId = await currentAuthId();
  const { data, error } = await supabase.rpc('has_role', { _user_id: authId, _role: 'admin' });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function resolveTransaction(
  transactionId: string,
  decision: 'approve' | 'reject',
  note: string | null
): Promise<void> {
  must(
    await supabase.rpc('resolve_transaction', {
      p_id: transactionId,
      p_decision: decision,
      ...(note ? { p_note: note } : {}),
    })
  );
}

export async function adminSetBalance(playerId: string, balance: number): Promise<void> {
  must(await supabase.rpc('admin_set_balance', { p_player: playerId, p_balance: balance }));
}

export async function adminSetPlayerStatus(playerId: string, status: AccountStatus): Promise<void> {
  must(await supabase.rpc('admin_set_player_status', { p_player: playerId, p_status: status }));
}

export async function adminSetQrImage(qrId: string, image: string | null): Promise<void> {
  must(
    await supabase.rpc('admin_set_qr_image', {
      p_id: qrId,
      p_image: image as string,
    })
  );
}

export async function adminSetSetting(key: string, value: string | number): Promise<void> {
  must(await supabase.rpc('admin_set_setting', { p_key: key, p_value: value }));
}

export async function updateProfile(input: {
  playerId: string;
  displayName?: string;
  avatarUrl?: string | null;
  avatarEmoji?: string;
}): Promise<void> {
  must(
    await supabase.rpc('update_profile', {
      p_player: input.playerId,
      ...(input.displayName ? { p_display_name: input.displayName } : {}),
      ...(input.avatarUrl !== undefined ? { p_avatar_url: input.avatarUrl ?? '' } : {}),
      ...(input.avatarEmoji ? { p_avatar_emoji: input.avatarEmoji } : {}),
    })
  );
}

/** Uploads into the signed-in account's own folder and returns a long-lived private link. */
export async function uploadAvatar(file: File): Promise<string> {
  const authId = await currentAuthId();
  const ext = file.name.split('.').pop() ?? 'png';
  const path = `${authId}/avatar-${Date.now()}.${ext}`;
  must(await supabase.storage.from('avatars').upload(path, file, { upsert: true }));
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, AVATAR_LINK_SECONDS);
  if (error || !data) throw new Error(error?.message ?? 'Could not save the photo.');
  return data.signedUrl;
}

/** Stores the proof privately; the returned storage path is saved on the request. */
export async function uploadPaymentProof(file: File): Promise<string> {
  const authId = await currentAuthId();
  const ext = file.name.split('.').pop() ?? 'png';
  const path = `${authId}/proof-${Date.now()}.${ext}`;
  must(await supabase.storage.from('payment-proofs').upload(path, file, { upsert: false }));
  return path;
}

export async function createSignedProofUrl(pathOrUrl: string): Promise<string | null> {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  const { data } = await supabase.storage.from('payment-proofs').createSignedUrl(pathOrUrl, PROOF_LINK_SECONDS);
  return data?.signedUrl ?? null;
}

// Buy-ins and cash-outs run on the server: see src/lib/table-game.functions.ts.

export async function fetchAllPokerTables(): Promise<PokerTableRow[]> {
  return must(
    await supabase.from('poker_tables').select('*').order('display_order', { ascending: true })
  ) as unknown as PokerTableRow[];
}

export async function adminUpdateTableRules(tableId: string, botLevel: string, rake: number | null): Promise<void> {
  // The generated type omits null for optional numeric args; the database function accepts it.
  must(
    await supabase.rpc('admin_update_table_rules', {
      p_table_id: tableId,
      p_bot_level: botLevel,
      p_rake: rake as number,
    })
  );
}

export async function adminUpdateQrDetails(qrId: string, label: string, accountName: string, accountNumber: string): Promise<void> {
  must(
    await supabase.rpc('admin_update_qr_details', {
      p_id: qrId,
      p_label: label,
      p_account_name: accountName,
      p_account_number: accountNumber,
    })
  );
}

export async function fetchMyReferralCount(): Promise<number> {
  return Number(must(await supabase.rpc('my_referral_count')) ?? 0);
}

export async function referralCodeExists(code: string): Promise<boolean> {
  return Boolean(must(await supabase.rpc('referral_code_exists', { p_code: code })));
}

export async function fetchMyReferralEarnings(): Promise<number> {
  return Number(must(await supabase.rpc('my_referral_earnings')) ?? 0);
}
