/**
 * Format a price for display
 * @param price Price amount in currency units (dollars, euros, etc.)
 * @param currency Currency code
 * @returns Formatted price string
 */
export function formatPrice(price: number, currency: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  });

  return formatter.format(price / 100); // Convert from cents to dollars
}

/**
 * Format bytes to human readable format
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g. "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format a date for display
 * @param date Date to format
 * @returns Formatted date string in the format "Year/Month/Day"
 */
export function formatDate(date: Date, locale: Locale = getLocale()): string {
  return new Intl.DateTimeFormat(localeConfig[locale].hreflang, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Format a date and time for display
 * @param date Date and time to format
 * @returns Formatted date string in the format "Year/Month/Day HH:MM:SS"
 */
export function formatDateTime(
  date: Date,
  locale: Locale = getLocale()
): string {
  return new Intl.DateTimeFormat(localeConfig[locale].hreflang, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}
import { getLocale, localeConfig, type Locale } from '@/lib/locale';
