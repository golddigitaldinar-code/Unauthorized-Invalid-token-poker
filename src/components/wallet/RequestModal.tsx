import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CircleCheck as CheckCircle2, ImagePlus, Loader as Loader2, X } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { PaymentQrCard } from '@/components/wallet/PaymentQrCard';
import { fetchQRCodes, submitTransactionRequest, uploadPaymentProof } from '@/lib/api';
import { errorMessage, formatPeso } from '@/lib/format';
import type { PaymentMethod, QRCodeRow, TransactionType } from '@/lib/models';

const WITHDRAW_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'bank', label: 'Bank' },
];

const CASH_IN_PRESETS = [100, 200, 500, 1000, 2000, 5000];
const MAX_DETAILS_LENGTH = 60;
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

interface RequestModalProps {
  mode: TransactionType;
  playerId: string;
  balance: number;
  onClose: () => void;
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-primary-foreground">{n}</span>
      {title}
    </p>
  );
}

export function RequestModal({ mode, playerId, balance, onClose }: RequestModalProps) {
  const isCashIn = mode === 'cash_in';
  const [method, setMethod] = useState<PaymentMethod>('gcash');
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [qr, setQr] = useState<QRCodeRow | null>(null);
  const [qrLoading, setQrLoading] = useState(isCashIn);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isCashIn) return;
    let active = true;
    void fetchQRCodes()
      .then((codes) => active && setQr(codes[0] ?? null))
      .catch(() => {})
      .finally(() => active && setQrLoading(false));
    return () => {
      active = false;
    };
  }, [isCashIn]);

  useEffect(() => () => {
    if (proofPreview) URL.revokeObjectURL(proofPreview);
  }, [proofPreview]);

  const amountValue = Number(amount);
  const amountError =
    amount === ''
      ? null
      : !(amountValue > 0)
        ? 'Enter an amount greater than zero.'
        : !isCashIn && amountValue > balance
          ? `You can withdraw up to ${formatPeso(balance)}.`
          : null;

  function handleFileSelect(file: File) {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setError('Please upload a PNG, JPEG or WebP screenshot.');
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      setError('Screenshot must be under 5 MB.');
      return;
    }
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (amountError || !(amountValue > 0)) {
      setError(amountError ?? 'Enter an amount greater than zero.');
      return;
    }
    if (isCashIn && !proofFile) {
      setError('Upload a screenshot of your payment so the admin can approve it.');
      return;
    }
    if (!isCashIn && details.trim().length < 4) {
      setError('Enter your account number and name.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const proofUrl = isCashIn && proofFile ? await uploadPaymentProof(proofFile) : null;
      await submitTransactionRequest({
        playerId,
        type: mode,
        amount: amountValue,
        method: isCashIn ? qr?.method ?? 'qrph' : method,
        accountDetails: isCashIn ? details.trim() || 'QR payment' : details.trim(),
        proofUrl,
        qrCodeId: isCashIn ? qr?.id ?? null : null,
      });
      window.__lovableEvents?.track?.('project.wallet_request_submitted', {
        request_type: mode,
        method: isCashIn ? 'qr' : method,
        amount: amountValue,
      });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isCashIn ? 'Recharge your wallet' : 'Withdraw from your wallet'} onClose={onClose}>
      {done ? (
        <div className="space-y-4 py-4 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-live" />
          <p className="font-display text-xl font-bold text-white">Request sent</p>
          <p className="text-sm text-slate-300">
            The admin will check it shortly. Your balance updates automatically once it is approved.
          </p>
          <button type="button" onClick={onClose} className="btn-gold w-full rounded-xl py-2.5 text-sm font-bold">
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {isCashIn ? (
            <>
              <div className="space-y-2">
                <Step n={1} title="Scan and pay" />
                {qrLoading ? (
                  <div className="flex items-center justify-center py-16 text-slate-400">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading QR code...
                  </div>
                ) : qr ? (
                  <PaymentQrCard qr={qr} />
                ) : (
                  <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
                    Payment QR is not available right now. Please contact the admin.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Step n={2} title="Amount you paid" />
                <div className="grid grid-cols-3 gap-2">
                  {CASH_IN_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      aria-pressed={amountValue === preset}
                      className={`rounded-lg border py-2 text-sm font-semibold tabular-nums transition ${
                        amountValue === preset ? 'border-gold bg-gold/15 text-gold' : 'border-white/10 text-slate-300 hover:border-gold/40'
                      }`}
                    >
                      ₱{preset.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input
                  id="request-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  aria-label="Amount in pesos"
                  placeholder="Or type another amount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-lg font-semibold tabular-nums text-white outline-none placeholder:text-base placeholder:font-normal sm:placeholder:text-sm placeholder:text-slate-600 focus:border-gold-400/60"
                />
                {amountError && <p className="text-xs text-amber-300">{amountError}</p>}
              </div>

              <div className="space-y-2">
                <Step n={3} title="Upload proof of payment" />
                {proofPreview ? (
                  <div className="relative inline-block">
                    <img src={proofPreview} alt="Payment proof" className="max-h-40 rounded-xl border border-white/10" />
                    <button
                      type="button"
                      aria-label="Remove screenshot"
                      onClick={() => {
                        setProofFile(null);
                        setProofPreview(null);
                      }}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gold/40 bg-slate-950 py-6 text-sm text-slate-300 transition hover:border-gold hover:text-gold"
                  >
                    <ImagePlus className="h-6 w-6" />
                    Tap to upload your payment screenshot
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) handleFileSelect(file);
                  }}
                />
                <input
                  type="text"
                  maxLength={MAX_DETAILS_LENGTH}
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder="Reference number (optional)"
                  aria-label="Reference number"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-base text-white outline-none placeholder:text-slate-600 sm:text-sm focus:border-gold-400/60"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-xl border border-gold/30 bg-room/70 px-4 py-3">
                <span className="text-xs uppercase tracking-wider text-slate-400">Available to withdraw</span>
                <span className="font-display text-lg font-bold tabular-nums text-gold">{formatPeso(balance)}</span>
              </div>
              <p className="text-sm text-slate-400">
                Tell us where to send your money. Your balance is deducted once the admin approves it.
              </p>
              <fieldset className="space-y-2">
                <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Send to</legend>
                <div className="grid grid-cols-3 gap-2">
                  {WITHDRAW_METHODS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMethod(option.value)}
                      aria-pressed={method === option.value}
                      className={`rounded-lg border py-2 text-sm font-medium transition ${
                        method === option.value ? 'border-gold bg-gold/10 text-gold' : 'border-white/10 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="space-y-2">
                <label htmlFor="request-amount" className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Amount (PHP)
                </label>
                <input
                  id="request-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-lg font-semibold tabular-nums text-white outline-none focus:border-gold-400/60"
                />
                {amountError && <p className="text-xs text-amber-300">{amountError}</p>}
              </div>
              <div className="space-y-2">
                <label htmlFor="request-details" className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Account number and name
                </label>
                <input
                  id="request-details"
                  type="text"
                  maxLength={MAX_DETAILS_LENGTH}
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder="e.g. 09XX XXX XXXX - Juan D."
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-base text-white outline-none placeholder:text-slate-600 sm:text-sm focus:border-gold-400/60"
                />
              </div>
            </>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !!amountError || (isCashIn && !qr)}
            className="btn-gold w-full rounded-xl py-3 text-sm font-bold disabled:opacity-40"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Sending...
              </span>
            ) : isCashIn ? (
              'Submit recharge'
            ) : (
              'Submit withdrawal'
            )}
          </button>
        </form>
      )}
    </Modal>
  );
}
