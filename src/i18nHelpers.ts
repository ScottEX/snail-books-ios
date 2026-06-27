// ═══════════════════════════════════════════════════════════════
// i18nHelpers — translate raw DB enum values to current-language labels
// ═══════════════════════════════════════════════════════════════
//
// Mirrors the web's src/i18nHelpers.ts. Forms store INTERNAL KEYS
// (e.g. expense cats: daily/rent/salary/goods/wages; payment methods:
// payCash/payWechat/payAlipay). This helper translates ANY string —
// new internal key OR legacy Chinese substring (with or without emoji
// prefix) — into the current-language label.

import { t, I18nKey } from './i18n';

const CAT_KEYS = new Set<string>([
  'daily', 'rent', 'salary', 'goods', 'wages',
  'dineIn', 'meituan', 'meituanTuan', 'jd',
]);

const PAY_KEYS = new Set<string>(['payCash', 'payWechat', 'payAlipay']);

const LEGACY_CAT_TO_KEY: Array<[string, string]> = [
  ['美团团购', 'meituanTuan'],
  ['美团外卖', 'meituan'],
  ['日常', 'daily'],
  ['房租', 'rent'],
  ['薪资', 'salary'],
  ['采购', 'goods'],
  ['堂食', 'dineIn'],
  ['京东', 'jd'],
];

const LEGACY_PAY_TO_KEY: Array<[string, string]> = [
  ['支付宝', 'payAlipay'],
  ['Alipay', 'payAlipay'],
  ['支付寶', 'payAlipay'],
  ['微信', 'payWechat'],
  ['现金', 'payCash'],
  ['現金', 'payCash'],
];

function normalizeCategory(raw: string): string {
  if (!raw) return raw;
  if (CAT_KEYS.has(raw)) return raw;
  if (LEGACY_CAT_TO_KEY.some(([legacy]) => raw === legacy)) {
    return LEGACY_CAT_TO_KEY.find(([legacy]) => raw === legacy)![1];
  }
  for (const [legacy, key] of LEGACY_CAT_TO_KEY) {
    if (raw.includes(legacy)) return key;
  }
  return raw;
}

function normalizePayment(raw: string): string {
  if (!raw) return raw;
  if (PAY_KEYS.has(raw)) return raw;
  if (LEGACY_PAY_TO_KEY.some(([legacy]) => raw === legacy)) {
    return LEGACY_PAY_TO_KEY.find(([legacy]) => raw === legacy)![1];
  }
  for (const [legacy, key] of LEGACY_PAY_TO_KEY) {
    if (raw.includes(legacy)) return key;
  }
  return raw;
}

export function trCategory(raw: string): string {
  if (!raw) return raw;
  const key = normalizeCategory(raw);
  if (CAT_KEYS.has(key)) return t(key as I18nKey);
  return raw;
}

export function trPayment(raw: string): string {
  if (!raw) return raw;
  const key = normalizePayment(raw);
  if (PAY_KEYS.has(key)) return t(key as I18nKey);
  return raw;
}

export function catKey(raw: string): string {
  return normalizeCategory(raw);
}

export function payKey(raw: string): string {
  return normalizePayment(raw);
}
