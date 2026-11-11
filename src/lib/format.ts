export function formatPeso(amount: number): string {
  return `\u20B1${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatChips(amount: number): string {
  return amount.toLocaleString('en-PH');
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

const METHOD_LABELS: Record<string, string> = {
  qrph: 'QR payment',
  gcash: 'GCash',
  maya: 'Maya',
  bank: 'Bank',
  bonus: 'Bonus',
};

export function methodLabel(method: string): string {
  return METHOD_LABELS[method] ?? method;
}

export function transactionTypeLabel(type: string): string {
  if (type === 'cash_in') return 'Cash in';
  if (type === 'bonus') return 'Welcome bonus';
  if (type === 'referral') return 'Referral reward';
  return 'Withdrawal';
}
