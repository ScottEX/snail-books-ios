import { getLang } from '../i18n';

/** Format amount with ¥ prefix, 万/萬/K for large numbers, 2 decimal places. */
export function fmtAmt(n: number): string {
  if (Math.abs(n) >= 10000) {
    const lang = getLang();
    if (lang.startsWith('en')) return '¥' + (n / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'K';
    if (lang.startsWith('zh-TW') || lang.startsWith('zh-Hant')) return '¥' + (n / 10000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '萬';
    return '¥' + (n / 10000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '万';
  }
  return '¥' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format amount with ¥ prefix, full digits + thousands separator, no 万/萬/K unit. */
export function fmtAmtFull(n: number): string {
  return '¥' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format number with thousand separators, always 2 decimal places.
 *  Port of web/src/utils/numbers.ts toDec2Comma. NO ¥ prefix — the
 *  caller adds it (matches web's usage in ExpenseScreen where the
 *  ¥ sign sits outside the formatted value). */
export function toDec2Comma(n: number | string | null | undefined): string {
  const v = parseFloat(String(n ?? 0)) || 0;
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format ISO date string (yyyy-mm-dd) or datetime to locale-aware display.
 *  en→"Jun 5, 2026", zh→"2026年06月05日". Time portion is ignored. */
export function formatDate(dateStr: string): string {
  if (!dateStr) return dateStr;
  const dateOnly = dateStr.split(' ')[0];
  const parts = dateOnly.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const lang = getLang();
  if (lang.startsWith('en')) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[+m - 1]} ${+d}, ${y}`;
  }
  return `${y}年${m}月${d}日`;
}
