// ═══════════════════════════════════════════════════════════════
// usePartnerData — PartnerScreen 的数据/业务逻辑 hook
// ═══════════════════════════════════════════════════════════════
//
// 与 web 端 src/screens/partner/usePartnerData.ts 保持完全一致:
//   - partnerShare 硬编码
//   - 翻译函数 (translateName / translateDividendNote / getRoleKey)
//   - usePartnerData hook 集中管理 partners/dividends/totalDiv
//
// 调用方:PartnerScreen 通过此 hook 拿数据,不再 inline 处理。

import { useState, useEffect, useMemo } from 'react';
import { t, getLang, I18nKey } from '../../i18n';
import { api } from '../../api/client';
import { formatDate } from '../../utils/format';

// 合伙人持股映射硬编码(与 web 一致)
export const partnerShare: Record<string, number> = { '张安武': 0.34, '江宽': 0.33, '蓝柳富': 0.33 };
const nameMap: Record<string, string> = { '张安武': 'nameZhang', '江宽': 'nameJiang', '蓝柳富': 'nameLan' };

export function translateName(name: string, pinyin?: string, tw?: string): string {
  const key = nameMap[name];
  if (key) return t(key as I18nKey);
  const lang = getLang();
  if (lang === 'en' && pinyin) return pinyin;
  if (lang === 'zh-TW' && tw) return tw;
  return name;
}

export function translateDividendNote(note: string | null, date?: string): string {
  if (!note) return '';
  const m = note.match(/^(?:第(\d+)次分红|第(\d+)次)$/);
  if (m) {
    const n = m[1] || m[2];
    if (date) return t('dividendRoundFmt').replace('{n}', n).replace('{date}', formatDate(date));
    return t('dividendRoundOnly').replace('{n}', n);
  }
  const m2 = note.match(/^第(\d+)次分红 \((.+)\)$/);
  if (m2) return t('dividendRoundFmt').replace('{n}', m2[1]).replace('{date}', formatDate(m2[2]));
  return note;
}

export function getRoleKey(name: string, linkedRole?: string): I18nKey {
  if (linkedRole) {
    const map: Record<string, I18nKey> = { '董事长': 'chairman', 'CEO': 'ceo', '店长': 'manager', '员工': 'staff', '普通用户': 'janitor', '打杂': 'janitor' };
    return map[linkedRole] || 'janitor';
  }
  const nameMap: Record<string, I18nKey> = { '张安武': 'chairman', '江宽': 'ceo', '蓝柳富': 'janitor' };
  return nameMap[name] || 'janitor';
}

export function usePartnerData(setToast: (msg: string) => void, refreshKey = 0) {
  const [partners, setPartners] = useState<any[]>([]);
  const [dividends, setDividends] = useState<any[]>([]);
  const [totalDiv, setTotalDiv] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const p = await api.getPartners();
      setPartners(p || []);
      const d = await api.getDividends();
      setDividends(d || []);
      setTotalDiv((d || []).reduce((s: number, x: any) => s + x.amount, 0));
    } catch { setToast(t('toastLoadFailed')); }
    setLoadingData(false);
  };

  useEffect(() => { loadData(); }, [refreshKey]);

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    dividends.forEach((d: any) => {
      const n = d.note || '---';
      if (!g[n]) g[n] = [];
      g[n].push(d);
    });
    return g;
  }, [dividends]);

  const groupKeys = useMemo(() => Object.keys(grouped), [grouped]);

  const getPartnerHistory = (name: string) => {
    const history: { note: string; amount: number }[] = [];
    Object.entries(grouped).forEach(([note, items]) => {
      items.forEach((d: any) => {
        if (d.partner === name && d.amount > 0)
          history.push({ note: translateDividendNote(note, d.date), amount: d.amount });
      });
    });
    return history;
  };

  return {
    partners, dividends, totalDiv, loadingData, loadData,
    grouped, groupKeys, getPartnerHistory,
  };
}