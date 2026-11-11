import { useEffect, useState } from 'react';
import { Bot, Gift, Save, Trophy, Users } from 'lucide-react';
import { TableRulesPanel } from '@/components/admin/TableRulesPanel';
import { useTableSettings } from '@/hooks/useTableSettings';
import { adminSetSetting } from '@/lib/api';
import { errorMessage, formatChips } from '@/lib/format';
import type { Aggression } from '@/poker/types';

const AGGRESSION_OPTIONS: { value: Aggression; label: string; hint: string }[] = [
  { value: 'passive', label: 'Passive', hint: 'Calls often, rarely bluffs or re-raises.' },
  { value: 'balanced', label: 'Balanced', hint: 'Mixed play with occasional bluffs.' },
  { value: 'aggressive', label: 'Aggressive', hint: 'Raises frequently and bluffs more.' },
];

export function TableSettingsPanel() {
  const { settings, error: loadError, refresh } = useTableSettings();
  const [rake, setRake] = useState(settings.rakePercent);
  const [minBuyIn, setMinBuyIn] = useState(String(settings.minBuyIn));
  const [maxBuyIn, setMaxBuyIn] = useState(String(settings.maxBuyIn));
  const [bonus, setBonus] = useState(String(settings.welcomeBonus));
  const [referralReward, setReferralReward] = useState(String(settings.referralReward));
  const [referralMin, setReferralMin] = useState(String(settings.referralMinRecharge));
  const [winRate, setWinRate] = useState(settings.playerWinRate);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    setRake(settings.rakePercent);
    setMinBuyIn(String(settings.minBuyIn));
    setMaxBuyIn(String(settings.maxBuyIn));
    setBonus(String(settings.welcomeBonus));
    setReferralReward(String(settings.referralReward));
    setReferralMin(String(settings.referralMinRecharge));
    setWinRate(settings.playerWinRate);
  }, [settings]);

  async function save(key: string, value: string | number) {
    setSaving(key);
    setSaveError(null);
    setSavedKey(null);
    try {
      await adminSetSetting(key, value);
      await refresh();
      setSavedKey(key);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  const minValue = Number(minBuyIn);
  const maxValue = Number(maxBuyIn);
  const rewardValue = Number(referralReward);
  const referralMinValue = Number(referralMin);
  const referralValid = rewardValue >= 0 && rewardValue <= 10000 && referralMinValue >= 1 && referralMinValue <= 1000000;
  const referralChanged = rewardValue !== settings.referralReward || referralMinValue !== settings.referralMinRecharge;
  const buyInValid = Number.isInteger(minValue) && Number.isInteger(maxValue) && minValue >= 100 && maxValue >= minValue;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {(loadError || saveError) && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 lg:col-span-2">
          {saveError ?? loadError}
        </p>
      )}

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">House cut (default)</h3>
        <p className="mt-2 text-sm text-slate-400">
          The house keeps this share of every pot as rake, unless a table has its own cut below. Players see the rate on the table, so it is transparent.
        </p>
        <div className="mt-5 flex items-end justify-between">
          <span className="text-4xl font-bold tabular-nums text-gold-300">{rake}%</span>
          <span className="text-xs text-slate-500">Player return {100 - rake}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={20}
          step={1}
          aria-label="House rake percent"
          value={rake}
          onChange={(event) => setRake(Number(event.target.value))}
          className="mt-4 w-full accent-gold-400"
        />
        <div className="mt-1 flex justify-between text-xs text-slate-600">
          <span>0%</span>
          <span>20%</span>
        </div>
        <button
          type="button"
          disabled={rake === settings.rakePercent || saving !== null}
          onClick={() => save('rake_percent', rake)}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 px-4 py-2 text-sm font-bold text-slate-900 transition disabled:opacity-40"
        >
          <Save className="h-4 w-4" /> {saving === 'rake_percent' ? 'Saving...' : 'Save rake'}
        </button>
        {savedKey === 'rake_percent' && <p className="mt-2 text-xs text-emerald-300">Saved. New hands use this rate.</p>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
          <Bot className="h-4 w-4" /> Bot aggression
        </h3>
        <p className="mt-2 text-sm text-slate-400">Controls how the bots at the table raise, call, and bluff.</p>
        <div role="radiogroup" aria-label="Bot aggression" className="mt-5 grid gap-2">
          {AGGRESSION_OPTIONS.map((option) => {
            const active = settings.botAggression === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={saving !== null}
                onClick={() => !active && save('bot_aggression', option.value)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  active ? 'border-gold-400/70 bg-gold-400/10' : 'border-white/10 hover:border-white/25'
                }`}
              >
                <span className="block text-sm font-semibold text-white">{option.label}</span>
                <span className="block text-xs text-slate-400">{option.hint}</span>
              </button>
            );
          })}
        </div>
        {saving === 'bot_aggression' && <p className="mt-2 text-xs text-slate-400">Saving...</p>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 lg:col-span-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
          <Trophy className="h-4 w-4" /> Player winning rate
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          Controls how often players win against the bots across all cash tables. 50% is neutral fair play — lower makes the
          bots tougher so players lose more, higher makes the bots looser so players win more. Applies to every new hand dealt
          after saving.
        </p>
        <div className="mt-5 flex items-end justify-between">
          <span className="text-4xl font-bold tabular-nums text-gold-300">{winRate}%</span>
          <span className="text-xs text-slate-500">
            {winRate < 35 ? 'Bots play tough' : winRate > 65 ? 'Players favored' : 'Neutral'}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          aria-label="Player winning rate"
          value={winRate}
          onChange={(event) => setWinRate(Number(event.target.value))}
          className="mt-4 w-full accent-gold-400"
        />
        <div className="mt-1 flex justify-between text-xs text-slate-600">
          <span>0% (house favored)</span>
          <span>50% neutral</span>
          <span>100% (player favored)</span>
        </div>
        <button
          type="button"
          disabled={winRate === settings.playerWinRate || saving !== null}
          onClick={() => save('player_win_rate', winRate)}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 px-4 py-2 text-sm font-bold text-slate-900 transition disabled:opacity-40"
        >
          <Save className="h-4 w-4" /> {saving === 'player_win_rate' ? 'Saving...' : 'Save winning rate'}
        </button>
        {savedKey === 'player_win_rate' && <p className="mt-2 text-xs text-emerald-300">Saved. New hands use this rate.</p>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 lg:col-span-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Table buy-in limits</h3>
        <p className="mt-2 text-sm text-slate-400">Minimum is 100 chips. Maximum must be at least the minimum.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-slate-400">Minimum buy-in</span>
            <input
              type="number"
              min={100}
              step={1}
              value={minBuyIn}
              onChange={(event) => setMinBuyIn(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-white tabular-nums outline-none focus:border-gold-400/60"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Maximum buy-in</span>
            <input
              type="number"
              min={100}
              step={1}
              value={maxBuyIn}
              onChange={(event) => setMaxBuyIn(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-white tabular-nums outline-none focus:border-gold-400/60"
            />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={!buyInValid || saving !== null || (minValue === settings.minBuyIn && maxValue === settings.maxBuyIn)}
            onClick={async () => {
              await save('min_buy_in', minValue);
              await save('max_buy_in', maxValue);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 px-4 py-2 text-sm font-bold text-slate-900 transition disabled:opacity-40"
          >
            <Save className="h-4 w-4" /> Save buy-in limits
          </button>
          {buyInValid ? (
            <span className="text-xs text-slate-500">Range {formatChips(minValue)} to {formatChips(maxValue)} chips</span>
          ) : (
            <span className="text-xs text-rose-300">Enter whole numbers, minimum 100, max at least min.</span>
          )}
        </div>
      </section>
      <section className="glass-panel rounded-2xl p-5 lg:col-span-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
          <Gift className="h-4 w-4" /> Welcome bonus
        </h3>
        <p className="mt-2 text-sm text-slate-400">Every new player gets this amount in their wallet the first time they sign in.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl border border-white/10 bg-slate-950 px-3">
            <span className="text-slate-400">₱</span>
            <input
              type="number"
              min={0}
              max={10000}
              aria-label="Welcome bonus amount"
              value={bonus}
              onChange={(event) => setBonus(event.target.value)}
              className="w-28 bg-transparent px-2 py-2 text-white tabular-nums outline-none"
            />
          </div>
          <button
            type="button"
            disabled={saving !== null || Number(bonus) === settings.welcomeBonus || !(Number(bonus) >= 0 && Number(bonus) <= 10000)}
            onClick={() => save('welcome_bonus', Number(bonus))}
            className="btn-gold inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            <Save className="h-4 w-4" /> {saving === 'welcome_bonus' ? 'Saving...' : 'Save bonus'}
          </button>
          {savedKey === 'welcome_bonus' && <span className="text-xs text-emerald-300">Saved. New players get this amount.</span>}
        </div>
      </section>
      <section className="glass-panel rounded-2xl p-5 lg:col-span-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
          <Users className="h-4 w-4" /> Referral reward
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          When a player who joined with a referral code gets their first recharge of at least the minimum approved, the friend who invited them receives this reward. It is paid once per invited player.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs text-slate-400">Reward to inviter</span>
            <div className="mt-1 flex items-center rounded-xl border border-white/10 bg-slate-950 px-3">
              <span className="text-slate-400">₱</span>
              <input
                type="number"
                min={0}
                max={10000}
                aria-label="Referral reward amount"
                value={referralReward}
                onChange={(event) => setReferralReward(event.target.value)}
                className="w-28 bg-transparent px-2 py-2 text-white tabular-nums outline-none"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Minimum first recharge</span>
            <div className="mt-1 flex items-center rounded-xl border border-white/10 bg-slate-950 px-3">
              <span className="text-slate-400">₱</span>
              <input
                type="number"
                min={1}
                aria-label="Minimum recharge for referral reward"
                value={referralMin}
                onChange={(event) => setReferralMin(event.target.value)}
                className="w-28 bg-transparent px-2 py-2 text-white tabular-nums outline-none"
              />
            </div>
          </label>
          <button
            type="button"
            disabled={saving !== null || !referralValid || !referralChanged}
            onClick={async () => {
              if (rewardValue !== settings.referralReward) await save('referral_reward', rewardValue);
              if (referralMinValue !== settings.referralMinRecharge) await save('referral_min_recharge', referralMinValue);
            }}
            className="btn-gold inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            <Save className="h-4 w-4" /> {saving?.startsWith('referral') ? 'Saving...' : 'Save referral reward'}
          </button>
          {savedKey?.startsWith('referral') && <span className="text-xs text-emerald-300">Saved.</span>}
        </div>
      </section>
      <TableRulesPanel houseRake={settings.rakePercent} />
    </div>
  );
}
