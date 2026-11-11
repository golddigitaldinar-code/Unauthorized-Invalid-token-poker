import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Copy, Gift, ImagePlus, Loader as Loader2, Save, Share2, Trash2, CircleUser as UserCircle, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchMyReferralCount, fetchMyReferralEarnings, updateProfile, uploadAvatar } from '@/lib/api';
import { useTableSettings } from '@/hooks/useTableSettings';
import { SoundControls } from '@/components/poker/SoundControls';
import { errorMessage, formatPeso } from '@/lib/format';
import { AVATAR_EMOJIS } from '@/lib/models';
import type { PlayerRow } from '@/lib/models';

interface SettingsPageProps {
  player: PlayerRow;
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function SettingsPage({ player }: SettingsPageProps) {
  const { refreshPlayer } = useAuth();
  const [name, setName] = useState(player.display_name);
  const [emoji, setEmoji] = useState(player.avatar_emoji);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [referrals, setReferrals] = useState<number | null>(null);
  const [earnings, setEarnings] = useState<number | null>(null);
  const { settings } = useTableSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchMyReferralCount().then(setReferrals).catch(() => setReferrals(null));
    void fetchMyReferralEarnings().then(setEarnings).catch(() => setEarnings(null));
  }, []);

  const trimmedName = name.trim();
  const nameChanged = trimmedName !== player.display_name;
  const emojiChanged = emoji !== player.avatar_emoji;
  const canSave = trimmedName.length >= 2 && trimmedName.length <= 24 && (nameChanged || emojiChanged);
  const referralLink = typeof window === 'undefined' ? '' : `${window.location.origin}/auth?ref=${player.referral_code}`;

  async function handleUpload(file: File) {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setError('Please choose a PNG, JPEG or WebP photo.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('Photo must be under 5 MB.');
      return;
    }
    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      const url = await uploadAvatar(file);
      await updateProfile({ playerId: player.id, avatarUrl: url });
      await refreshPlayer();
      setNotice('Profile photo updated.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto() {
    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      await updateProfile({ playerId: player.id, avatarUrl: null });
      await refreshPlayer();
      setNotice('Profile photo removed.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      if (nameChanged) await updateProfile({ playerId: player.id, displayName: trimmedName });
      if (emojiChanged) await updateProfile({ playerId: player.id, avatarEmoji: emoji });
      await refreshPlayer();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function copy(text: string, what: 'code' | 'link') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError('Could not copy. Select the text and copy it manually.');
    }
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: 'Master Poker', text: `Join me on Master Poker with my code ${player.referral_code}`, url: referralLink }).catch(() => {});
    } else {
      void copy(referralLink, 'link');
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-white">
          <UserCircle className="h-6 w-6 text-gold" /> Profile Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">Your photo, name, game sounds and referral code.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {notice}
        </p>
      )}

      {/* Profile photo */}
      <section className="glass-panel rounded-2xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-300">Profile photo</h2>
        <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Change profile photo"
            className="group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold/50 bg-slate-950 shadow-[var(--shadow-gold)]"
          >
            {player.avatar_url ? (
              <img src={player.avatar_url} alt="Your profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-5xl">{player.avatar_emoji}</span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-room/60 opacity-0 transition group-hover:opacity-100">
              {uploading ? <Loader2 className="h-7 w-7 animate-spin text-gold" /> : <Camera className="h-7 w-7 text-gold" />}
            </span>
          </button>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-semibold text-white">{player.display_name}</p>
            <p className="text-xs text-slate-500">PNG, JPEG or WebP, up to 5 MB. Players see it at the table.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="btn-gold inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {player.avatar_url ? 'Change photo' : 'Upload photo'}
              </button>
              {player.avatar_url && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void handleRemovePhoto()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void handleUpload(file);
            }}
          />
        </div>
      </section>

      {/* Game sounds */}
      <section className="glass-panel rounded-2xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-300">Game sounds</h2>
        <p className="mt-1 text-xs text-slate-400">Set card, chip and table sounds separately. Saved to your account on every device.</p>
        <div className="mt-4 max-w-md">
          <SoundControls />
        </div>
      </section>

      {/* Referral */}
      <section className="border-spin rounded-2xl p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gold-300">
          <Gift className="h-4 w-4" /> Your referral code
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Share it with friends. When a friend who joined with your code makes their first recharge of {formatPeso(settings.referralMinRecharge)} or more,
          you get {formatPeso(settings.referralReward)} in your wallet.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-xl border border-gold/40 bg-room/70 px-5 py-3 font-mono text-2xl font-bold tracking-[0.35em] text-gold">
            {player.referral_code}
          </span>
          <button
            type="button"
            onClick={() => void copy(player.referral_code, 'code')}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-gold/50 hover:text-gold"
          >
            {copied === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied === 'code' ? 'Copied' : 'Copy code'}
          </button>
          <button
            type="button"
            onClick={() => void share()}
            className="btn-gold inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold"
          >
            {copied === 'link' ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />} {copied === 'link' ? 'Link copied' : 'Share invite link'}
          </button>
        </div>
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-300">
          <Users className="h-4 w-4 text-gold" /> Friends joined with your code:{' '}
          <span className="font-bold text-white">{referrals ?? '—'}</span>
        </p>
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
          <Gift className="h-4 w-4 text-gold" /> Referral rewards earned:{' '}
          <span className="font-bold text-gold">{earnings === null ? '—' : formatPeso(earnings)}</span>
        </p>
      </section>

      {/* Display name */}
      <section className="glass-panel rounded-2xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-300">Player name</h2>
        <input
          type="text"
          maxLength={24}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-gold-400/60"
        />
        <p className="mt-1 text-xs text-slate-500">2 to 24 characters. Other players see this at the table.</p>
      </section>

      {/* Avatar emoji */}
      <section className="glass-panel rounded-2xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-300">Avatar emoji</h2>
        <p className="mt-1 text-xs text-slate-500">Shown when you have no profile photo.</p>
        <div className="mt-4 grid grid-cols-8 gap-2">
          {AVATAR_EMOJIS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setEmoji(option)}
              className={`flex h-12 items-center justify-center rounded-xl border text-2xl transition ${
                emoji === option ? 'border-gold-400 bg-gold-400/10' : 'border-white/10 hover:border-white/25'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={!canSave || saving}
          onClick={handleSave}
          className="btn-gold inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-300">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
