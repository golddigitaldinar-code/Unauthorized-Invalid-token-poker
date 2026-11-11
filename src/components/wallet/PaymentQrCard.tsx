import { Download, QrCode, Smartphone } from 'lucide-react';
import { DEFAULT_QR_IMAGE } from '@/lib/qr';
import type { QRCodeRow } from '@/lib/models';

interface PaymentQrCardProps {
  qr: QRCodeRow;
}

export function PaymentQrCard({ qr }: PaymentQrCardProps) {
  const src = qr.image_data ?? DEFAULT_QR_IMAGE;
  return (
    <div className="rounded-2xl border border-gold/30 bg-room/70 p-3 sm:p-4">
      <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
        <QrCode className="h-4 w-4" /> {qr.label}
      </div>
      <div className="mt-3 flex flex-col items-center gap-3">
        <div className="relative rounded-2xl bg-foreground p-2 shadow-[var(--shadow-gold)]">
          <img src={src} alt={`${qr.label} QR code`} className="aspect-square w-[min(15rem,62vw,34dvh)] rounded-xl object-contain sm:w-64" />
          <span aria-hidden className="pointer-events-none absolute inset-x-3 top-3 h-0.5 animate-scan-line rounded-full bg-gold/80 shadow-[0_0_12px_var(--gold)]" />
        </div>
        <div className="text-center">
          <p className="break-words text-sm font-semibold text-white">{qr.account_name}</p>
          <p className="break-all text-xs text-slate-400">{qr.account_number}</p>
        </div>
        <p className="flex items-center gap-1.5 text-center text-xs text-slate-300">
          <Smartphone className="h-3.5 w-3.5 text-gold" /> Open GCash, Maya or your bank app and scan this code.
        </p>
        <a
          href={src}
          download="master-poker-payment-qr"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 px-3 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold/10"
        >
          <Download className="h-3.5 w-3.5" /> Save QR to phone
        </a>
      </div>
    </div>
  );
}
