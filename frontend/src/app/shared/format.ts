export function formatCurrency(v: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(v);
}

export function formatNumber(v: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  }).format(v);
}

export function formatPercent(v: number, fractionDigits = 1): string {
  return `${v.toFixed(fractionDigits)}%`;
}

export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function toErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (err && typeof err === 'object' && 'error' in err) {
    const e = (err as { error?: { detail?: string; message?: string } }).error;
    if (e?.detail) return e.detail;
    if (e?.message) return e.message;
  }
  return fallback;
}
