import { format, formatDistanceToNowStrict, isToday, isYesterday } from 'date-fns';

export function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return `Today · ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday · ${format(d, 'h:mm a')}`;
  return format(d, 'EEE, MMM d · h:mm a');
}

export function formatShortDate(iso: string): string {
  return format(new Date(iso), 'MMM d');
}

export function formatRelative(iso: string): string {
  return `${formatDistanceToNowStrict(new Date(iso))} ago`;
}

export function formatMonthYear(d: Date): string {
  return format(d, 'MMMM yyyy');
}

export function formatDayFull(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE, MMMM d');
}

export function formatTime(iso: string): string {
  return format(new Date(iso), 'h:mm a');
}

/** Compact thousands formatting for big volume numbers, e.g. 12,450 → "12.5k". */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}
