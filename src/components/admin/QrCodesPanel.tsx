import { useEffect, useState } from 'react';
import { ImagePlus, Loader as Loader2, RotateCcw, Save } from 'lucide-react';
import { adminSetQrImage, adminUpdateQrDetails, fetchQRCodes } from '@/lib/api';
import { errorMessage } from '@/lib/format';
import { DEFAULT_QR_IMAGE, fileToQrDataUrl } from '@/lib/qr';
import type { QRCodeRow } from '@/lib/models';

interface Draft {
  label: string;
  accountName: string;
  accountNumber: string;
}

const INPUT =
  'mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-gold-400/60';

/** Admin: change the payment QR players scan when they recharge. */
export function QrCodesPanel() {
  const [codes, setCodes] = useState<QRCodeRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      const rows = await fetchQRCodes();
      setCodes(rows);
      setDrafts(
        Object.fromEntries(rows.map((qr) => [qr.id, { label: qr.label, accountName: qr.account_name, accountNumber: qr.account_number }]))
      );
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function run(qr: QRCodeRow, action: () => Promise<void>, message: string) {
    setBusyId(qr.id);
    setError(null);
    setNotice(null);
    try {
      await action();
      await load();
      setNotice(message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleFile(qr: QRCodeRow, file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (PNG, JPEG or WebP).');
      return;
    }
    try {
      const dataUrl = await fileToQrDataUrl(file);
      await run(qr, () => adminSetQrImage(qr.id, dataUrl), 'New QR code saved. Players see it on their next recharge.');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-slate-400">Loading QR codes...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-white">Payment QR code</h2>
        <p className="mt-1 text-sm text-slate-400">
          This is the QR players scan to recharge. Upload a new image any time to change where payments go.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}
      {notice && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{notice}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {codes.map((qr) => {
          const busy = busyId === qr.id;
          const hasCustomImage = !!qr.image_data;
          const draft = drafts[qr.id];
          if (!draft) return null;
          const dirty =
            draft.label !== qr.label || draft.accountName !== qr.account_name || draft.accountNumber !== qr.account_number;
          return (
            <section key={qr.id} className="glass-panel flex flex-col gap-5 rounded-2xl p-5 sm:flex-row">
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-2xl bg-foreground p-2">
                  <img src={qr.image_data ?? DEFAULT_QR_IMAGE} alt={`${qr.label} QR code`} className="h-44 w-44 rounded-xl object-contain" />
                </div>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                  {hasCustomImage ? 'Uploaded' : 'Original'}
                </span>
                <div className="grid w-full grid-cols-2 gap-2">
                  <label
                    className={`btn-gold inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${busy ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    Change QR
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={busy}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) void handleFile(qr, file);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy || !hasCustomImage}
                    onClick={() => void run(qr, () => adminSetQrImage(qr.id, null), 'Back to the original QR code.')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-white/30 disabled:opacity-40"
                  >
                    <RotateCcw className="h-4 w-4" /> Original
                  </button>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                <label className="block text-xs text-slate-400">
                  Title shown above the QR
                  <input
                    className={INPUT}
                    maxLength={40}
                    value={draft.label}
                    onChange={(event) => setDrafts((d) => ({ ...d, [qr.id]: { ...draft, label: event.target.value } }))}
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  Account name
                  <input
                    className={INPUT}
                    maxLength={60}
                    value={draft.accountName}
                    onChange={(event) => setDrafts((d) => ({ ...d, [qr.id]: { ...draft, accountName: event.target.value } }))}
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  Account number or note
                  <input
                    className={INPUT}
                    maxLength={60}
                    value={draft.accountNumber}
                    onChange={(event) => setDrafts((d) => ({ ...d, [qr.id]: { ...draft, accountNumber: event.target.value } }))}
                  />
                </label>
                <button
                  type="button"
                  disabled={busy || !dirty}
                  onClick={() =>
                    void run(
                      qr,
                      () => adminUpdateQrDetails(qr.id, draft.label, draft.accountName, draft.accountNumber),
                      'QR details saved.'
                    )
                  }
                  className="btn-gold mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40"
                >
                  <Save className="h-4 w-4" /> Save details
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
