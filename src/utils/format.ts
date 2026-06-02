import { getLang } from '../i18n';

/** Format amount with ¥ prefix, 万/萬/K for large numbers, 2 decimal places. */
export function fmtAmt(n: number): string {
  if (Math.abs(n) >= 10000) {
    const lang = getLang();
    if (lang.startsWith('en')) return '\u00A5' + (n / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'K';
    if (lang.startsWith('zh-TW') || lang.startsWith('zh-Hant')) return '\u00A5' + (n / 10000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u842C';
    return '\u00A5' + (n / 10000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u4E07';
  }
  return '\u00A5' + n.toLocaleString(undefined, { minimumFractionDigits: 2 });
}
