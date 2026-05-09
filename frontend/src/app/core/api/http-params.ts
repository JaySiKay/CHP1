import { HttpParams } from '@angular/common/http';

export function toHttpParams(
  source: Record<string, string | number | boolean | null | undefined>,
): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(source)) {
    if (value === null || value === undefined) continue;
    params = params.set(key, String(value));
  }
  return params;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function rangeFromPeriod(period: 'week' | 'month'): {
  start_date: string;
  end_date: string;
} {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (period === 'month' ? 30 : 7));
  return { start_date: isoDate(start), end_date: isoDate(end) };
}
