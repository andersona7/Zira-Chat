import { format, isToday, isYesterday, isSameYear } from 'date-fns';

/**
 * Formats timestamps for Message Info screen.
 * Logic:
 * - If today: "10:32 AM"
 * - If yesterday: "Yesterday • 10:32 AM"
 * - If same year: "28 Jun • 10:32 AM"
 * - Else: "28 Jun 2025 • 10:32 AM"
 */
export function formatMessageInfoTimestamp(dateVal: Date | string | number | undefined): string {
  if (!dateVal) return '';
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return '';

  const timeStr = format(date, 'h:mm a');

  if (isToday(date)) {
    return timeStr;
  } else if (isYesterday(date)) {
    return `Yesterday • ${timeStr}`;
  } else if (isSameYear(date, new Date())) {
    return `${format(date, 'd MMM')} • ${timeStr}`;
  } else {
    return `${format(date, 'd MMM yyyy')} • ${timeStr}`;
  }
}
