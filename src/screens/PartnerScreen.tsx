import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { t, getLang, langs, useLang } from '../i18n';
import { api } from '../api/client';
import { useServerDate } from '../hooks/useServerDate';
import Toast from '../components/Toast';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { modalCardAnimation, modalClose } from '../sharedStyles';

// NOTE: 合伙人持股/初始投资/姓名映射硬编码。若后端合伙人变更（增减/改名），
// 默认值（33%、42900）可能不准确。理想方案是从后端返回并缓存这些映射。
const partnerShare: Record<string, number> = { '张安武': 0.34, '江宽': 0.33, '蓝柳富': 0.33 };
const initCapital: Record<string, number> = { '张安武': 44200, '江宽': 42900, '蓝柳富': 42900 };
const nameMap: Record<string, string> = { '张安武': 'nameZhang', '江宽': 'nameJiang', '蓝柳富': 'nameLan' };

function translateName(name: string): string {
  const key = nameMap[name];
  return key ? t(key) : name;
}

function translateDividendNote(note: string): string {
  const m = note.match(/^第(\d+)次分红 \((.+)\)$/);
  if (m) return t('dividendRoundFmt').replace('{n}', m[1]).replace('{date}', m[2]);
  return note;
}

/* ========== SVG ICONS (exact 8600 paths) ========== */

function IconBuilding({ color = '#7D2329' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Path strokeLinecap="round" strokeLinejoin="round"
        d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </Svg>
  );
}

function IconCoins({ color = '#D59A53' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Path strokeLinecap="round" strokeLinejoin="round"
        d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </Svg>
  );
}

function IconPeople({ color = '#8C8583' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Path strokeLinecap="round" strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </Svg>
  );
}

/* ========== MAIN SCREEN ========== */

export default function PartnerScreen({ onBack }: { onBack: () => void }) {
  const [partners, setPartners] = useState<any[]>([]);
  const [dividends, setDividends] = useState<any[]>([]);
  const [totalDiv, setTotalDiv] = useState(0);
  const [showDividend, setShowDividend] = useState(false);
  const [showDelete, setShowDelete] = useState<any>(null);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [showOrg, setShowOrg] = useState(false);
  const [divAmount, setDivAmount] = useState('');
  const [divNote, setDivNote] = useState('');
  const [divPreview, setDivPreview] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  // Use useLang() so the lang state and t() output stay in sync within a
  // single React render — the legacy setLang + setLangState pair updates
  // globalThis.curLang synchronously but doesn't trigger a React re-render
  // on its own, causing a brief flash of mismatched state.
  const { lang, setLang } = useLang();

  const [toast, setToast] = useState('');

  const { colors } = useTheme();

  const s = useMemo(() => getS(colors), [colors]);
  const mo = useMemo(() => getMo(colors), [colors]);
  const moBody = useMemo(() => getMoBody(colors), [colors]);
  const ds = useMemo(() => getDs(colors), [colors]);
  const org = useMemo(() => getOrg(colors), [colors]);
  const tg = useMemo(() => getTg(colors), [colors]);

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

  useEffect(() => { loadData(); }, []);

  const grouped: Record<string, any[]> = {};
  dividends.forEach((d: any) => {
    const n = d.note || '---';
    if (!grouped[n]) grouped[n] = [];
    grouped[n].push(d);
  });
  const groupKeys = Object.keys(grouped);

  const calcPreview = (total: number) => {
    setDivPreview(partners.map((p: any) => ({
      name: p.name,
      share: (partnerShare[p.name] ?? 0.33) * 100,
      amount: parseFloat((total * (partnerShare[p.name] ?? 0.33)).toFixed(2)),
    })));
  };

  const handleDividend = async () => {
    if (!divAmount) return;
    const amt = parseFloat(divAmount);
    const items = partners.map((p: any) => ({
      partner: p.name,
      amount: parseFloat((amt * (partnerShare[p.name] ?? 0.33)).toFixed(2)),
      note: divNote || `第${groupKeys.length + 1}次分红`,
    }));
    try {
      await api.createDividend({ items });
      setShowDividend(false);
      setDivAmount(''); setDivNote(''); setDivPreview([]);
      loadData();
    } catch {
      setToast(t('toastSubmitFailed'));
    }
  };

  const handleDelete = async () => {
    if (showDelete === null) return;
    const toDelete = dividends.filter((d: any) => d.note === showDelete);
    let failed = 0;
    for (const d of toDelete) {
      try { await api.deleteDividend(d.id); }
      catch { failed++; }
    }
    setShowDelete(null);
    if (failed > 0) setToast(t('toastSubmitFailed'));
    loadData();
  };

  const switchLang = (l: string) => {
    setLang(l);
    loadData();
  };

  // Build dividend history for detail modal
  const getPartnerHistory = (name: string) => {
    const history: { note: string; amount: number }[] = [];
    Object.entries(grouped).forEach(([note, items]) => {
      items.forEach((d: any) => {
        if (d.partner === name && d.amount > 0)
          history.push({ note: translateDividendNote(note), amount: d.amount });
      });
    });
    return history;
  };

  return (
    <View style={s.root}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.container}>

          {/* ====== HEADER ====== */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <View style={s.titleRow}>
                <View style={s.redBar} />
                <View>
                  <Text style={s.mainTitle}>{t('partnerTitle')}</Text>
                  <Text style={s.engSub}>Lan's Luosifen · Partner Capital</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ====== 3 STAT CARDS (8600 exact) ====== */}
          <View style={s.statGrid}>
            <View style={s.statCard}>
              <View style={[s.statIconBg, { backgroundColor: withAlpha(colors.primary, 0.08) }]}>
                <IconBuilding color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.statLabel}>{t('totalCapital')}</Text>
                <Text style={s.statValue}>¥130,000</Text>
                <Text style={s.statGreen}>{t('paidInRate')} 100%</Text>
              </View>
            </View>

            <View style={s.statCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                <View style={[s.statIconBg, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
                  <IconCoins color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.statLabel}>{t('distributedPool')}</Text>
                  <Text style={[s.statValue, { color: colors.primary }]}>¥{totalDiv.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                  <Text style={s.statSub}>{t('cumulativeByShare')}</Text>
                </View>
              </View>
              <TouchableOpacity style={s.dividendBtn} onPress={() => setShowDividend(true)}>
                <Text style={s.dividendBtnText}>{t('issueDividend')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.statCard} onPress={() => setShowOrg(true)}>
              <View style={[s.statIconBg, { backgroundColor: colors.bg }]}>
                <IconPeople color={colors.textSub} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.statLabel}>{t('partnerSeats')}</Text>
                <Text style={[s.statValue, { color: colors.textMain }]}>3 {t('shareholders')}</Text>
                <Text style={s.statSub}>{t('lpStructure')}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ====== PARTNER CARDS ====== */}
          <View style={s.partnerGrid}>
            {partners.map((p: any) => {
              const initInv = initCapital[p.name] ?? 42900;
              const midInv = p.investment - initInv;
              const pct = p.investment > 0 ? Number((p.total_dividends / p.investment * 100).toFixed(0)) : 0;
              const rem = Math.max(0, p.investment - p.total_dividends);
              const isBack = p.total_dividends >= p.investment;
              return (
                <TouchableOpacity key={p.id} style={s.partnerCard} onPress={() => setShowDetail(p)}>
                  <View style={s.partnerHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.partnerName}>{translateName(p.name)}</Text>
                      <Text style={s.partnerPct}>{(p.share * 100).toFixed(0)}%</Text>
                    </View>
                    <View style={s.paidBadge}>
                      <Text style={s.paidBadgeText}>{t('investComplete')}</Text>
                    </View>
                  </View>
                  <View style={s.partnerDataRow}>
                    <View style={s.partnerDataCell}>
                      <Text style={s.dataLabel}>{t('subscribedTotal')}</Text>
                      <Text style={s.dataValue}>¥{p.investment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                    </View>
                    <View style={s.partnerDataCell}>
                      <Text style={s.dataLabel}>{t('initial')}</Text>
                      <Text style={s.dataValue}>¥{initInv.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                    </View>
                    <View style={s.partnerDataCell}>
                      <Text style={s.dataLabel}>{t('additional')}</Text>
                      <Text style={s.dataValue}>¥{midInv.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                    </View>
                  </View>
                  <View style={s.partnerFooter}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={s.footerLabel}>{t('totalDividendsPaid')}</Text>
                      <Text style={s.footerAmt}>¥{p.total_dividends.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                      <Text style={s.footerSub}>{t('paybackRate')} {pct}%</Text>
                      {isBack ? (
                        <Text style={{ fontSize: FONTS.micro.size, color: colors.success, fontWeight: FONTS.micro.weight }}>{t('fullyPaidBack')}</Text>
                      ) : (
                        <Text style={{ fontSize: FONTS.micro.size, color: colors.primary, fontWeight: FONTS.micro.weight }}>{t('pendingPayback')} ¥{rem.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ====== CAPITAL LEDGER ====== */}
          <View style={s.ledgerCard}>
            <View style={s.ledgerHeader}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={s.ledgerTitle}>{t('capitalLedger')}</Text>
                <Text style={s.ledgerSub}>{t('byRoundAndInvest')}</Text>
              </View>
              <View style={s.filterRow}>
                {(['all', 'invest', 'mid', 'dividend'] as const).map(f => (
                  <TouchableOpacity key={f} onPress={() => setFilter(f)}
                    style={[s.filterBtn, filter === f && s.filterBtnActive]}>
                    <Text style={[s.filterBtnText, filter === f && s.filterBtnActiveText]}>{t(f)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {(filter === 'all' || filter === 'invest') && (
              <TableGroup title={t('initialApr2024')} type="invest" total={130000}
                themeColors={colors} styles={tg}
                items={[
                  { name: translateName('张安武'), sub: '34%', amount: 44200 },
                  { name: translateName('江宽'), sub: '33%', amount: 42900 },
                  { name: translateName('蓝柳富'), sub: '33%', amount: 42900 },
                ]} />
            )}
            {(filter === 'all' || filter === 'mid') && (
              <TableGroup title={t('midJan2025')} type="mid" total={30162}
                themeColors={colors} styles={tg}
                items={[
                  { name: translateName('张安武'), sub: '34%', amount: 10255.08 },
                  { name: translateName('江宽'), sub: '33%', amount: 9953.46 },
                  { name: translateName('蓝柳富'), sub: '33%', amount: 9953.46 },
                ]} />
            )}
            {(filter === 'all' || filter === 'dividend') && groupKeys.map(note => {
              const items = grouped[note];
              const total = items.reduce((s: number, d: any) => s + d.amount, 0);
              return (
                <TableGroup key={note} title={translateDividendNote(note)} type="dividend" total={total}
                  themeColors={colors} styles={tg}
                  items={items.map((d: any) => ({ name: translateName(d.partner), sub: '', amount: d.amount }))}
                  onDelete={() => setShowDelete(note)} />
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* ====== DIVIDEND MODAL ====== */}
      {showDividend && (
        <ModalOverlay styles={mo} onClose={() => setShowDividend(false)}>
          <View style={mo.modalCard} onStartShouldSetResponder={() => true}>
            <View style={mo.header}>
              <View>
                <Text style={mo.title}>{t('issueProportional')}</Text>
                <Text style={mo.sub}>{t('autoByShare')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDividend(false)}>
                <Text style={mo.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={moBody.body}>
              <View>
                <Text style={moBody.label}>{t('totalToPool')}</Text>
                <TextInput style={moBody.input} placeholder={t('enterAmount')} value={divAmount}
                  onChangeText={(v) => { setDivAmount(v); calcPreview(parseFloat(v) || 0); }}
                  keyboardType="decimal-pad" placeholderTextColor={colors.textSub} />
              </View>
              <View>
                <Text style={moBody.label}>{t('roundNote')}</Text>
                <TextInput style={moBody.input} placeholder={t('roundNoteExample')} value={divNote}
                  onChangeText={setDivNote} placeholderTextColor={colors.textSub} />
              </View>
              <View style={moBody.preview}>
                <Text style={moBody.previewTitle}>{t('shareCalcResult')}</Text>
                {(divPreview.length > 0 ? divPreview : partners.map((p: any) => ({
                  name: p.name,
                  share: (partnerShare[p.name] ?? 0.33) * 100,
                  amount: 0,
                }))).map((item: any) => (
                  <View key={item.name} style={moBody.previewRow}>
                    <Text style={moBody.previewName}>{item.name} ({item.share.toFixed(0)}%)</Text>
                    <Text style={moBody.previewAmt}>¥ {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                  </View>
                ))}
              </View>
              <View style={moBody.btnRow}>
                <TouchableOpacity style={moBody.cancelBtn} onPress={() => setShowDividend(false)}>
                  <Text style={moBody.cancelBtnText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={moBody.confirmBtn} onPress={handleDividend}>
                  <Text style={moBody.confirmBtnText}>{t('confirmIssue')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ModalOverlay>
      )}

      {/* ====== DELETE MODAL ====== */}
      {showDelete !== null && (
        <ModalOverlay styles={mo} onClose={() => setShowDelete(null)}>
          <View style={[mo.modalCard, { maxWidth: 320 }]} onStartShouldSetResponder={() => true}>
            <View style={mo.header}>
              <View>
                <Text style={mo.title}>{t('confirmDeleteRecord')}</Text>
                <Text style={mo.sub}>{t('irreversible')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDelete(null)}>
                <Text style={mo.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20, gap: 16 }}>
              <View style={moBody.deleteBox}>
                <Text style={moBody.deleteText}>
                  {t('willDelete')}<Text style={{ fontWeight: '600', color: colors.textMain }}>{translateDividendNote(showDelete)}</Text>{t('allDividendRecords')}
                </Text>
              </View>
              <View style={moBody.btnRow}>
                <TouchableOpacity style={moBody.cancelBtn} onPress={() => setShowDelete(null)}>
                  <Text style={moBody.cancelBtnText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={moBody.deleteConfirmBtn} onPress={handleDelete}>
                  <Text style={moBody.confirmBtnText}>{t('confirmDeleteRecord')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ModalOverlay>
      )}

      {/* ====== PARTNER DETAIL MODAL (8600 exact) ====== */}
      {showDetail && (
        <ModalOverlay styles={mo} onClose={() => setShowDetail(null)}>
          <View style={[mo.modalCard, { maxWidth: 360 }]} onStartShouldSetResponder={() => true}>
            <View style={mo.header}>
              <View>
                <Text style={mo.title}>{translateName(showDetail.name)}</Text>
                <Text style={[mo.sub, { color: colors.textSub }]}>{t(getRoleKey(showDetail.name))} · {t('sharePercent')} {(showDetail.share * 100).toFixed(0)}%</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDetail(null)}>
                <Text style={mo.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={moBody.body}>
              <View style={ds.grid}>
                <View style={[ds.cell, { backgroundColor: colors.bg }]}>
                  <Text style={ds.cellLabel}>{t('totalInvest')}</Text>
                  <Text style={ds.cellNum}>¥{(showDetail.investment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                </View>
                <View style={[ds.cell, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
                  <Text style={[ds.cellLabel, { color: colors.primary }]}>{t('totalDividends')}</Text>
                  <Text style={[ds.cellNum, { color: colors.primary }]}>¥{(showDetail.total_dividends || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                </View>
                <View style={[ds.cell, { backgroundColor: colors.bg }]}>
                  <Text style={ds.cellLabel}>{t('initialInvest')}</Text>
                  <Text style={ds.cellNumSmall}>¥{(initCapital[showDetail.name] ?? 42900).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                </View>
                <View style={[ds.cell, { backgroundColor: colors.bg }]}>
                  <Text style={ds.cellLabel}>{t('additional')}</Text>
                  <Text style={ds.cellNumSmall}>¥{((showDetail.investment || 0) - (initCapital[showDetail.name] || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                </View>
              </View>
              {showDetail.investment > 0 && (
                <View style={ds.progressWrap}>
                  <View style={ds.progressLabel}>
                    <Text style={ds.progressLabelText}>{t('paybackProgress')}</Text>
                    <Text style={[ds.progressLabelText, { fontWeight: '600' }]}>
                      {t('paybackRate')} {Math.min(100, Math.round((showDetail.total_dividends || 0) / showDetail.investment * 100))}%
                    </Text>
                  </View>
                  <View style={ds.progressBar}>
                    <View style={[ds.progressFill, {
                      width: `${Math.min(100, ((showDetail.total_dividends || 0) / showDetail.investment * 100))}%` as any,
                      backgroundColor: (showDetail.total_dividends || 0) >= showDetail.investment ? colors.success : colors.primary,
                    }]} />
                  </View>
                  <View style={{ marginTop: 4 }}>
                    {(showDetail.total_dividends || 0) >= showDetail.investment ? (
                      <Text style={{ fontSize: FONTS.micro.size, color: colors.success, fontWeight: FONTS.micro.weight }}>{t('fullyPaidBackDetail')}</Text>
                    ) : (
                      <Text style={{ fontSize: FONTS.micro.size, color: colors.primary }}>
                        {t('pendingPayback')} ¥{(showDetail.investment - (showDetail.total_dividends || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                    )}
                  </View>
                </View>
              )}
              {/* Dividend History */}
              <View>
                <Text style={ds.historyTitle}>{t('dividendHistory')}</Text>
                {(() => {
                  const hist = getPartnerHistory(showDetail.name);
                  return hist.length > 0 ? (
                    hist.map((h, i) => (
                      <View key={i} style={ds.historyRow}>
                        <Text style={ds.historyNote}>{h.note}</Text>
                        <Text style={ds.historyAmt}>¥{h.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={ds.historyEmpty}>{t('noDividendRecords')}</Text>
                  );
                })()}
              </View>
            </View>
          </View>
        </ModalOverlay>
      )}

      {/* ====== ORG CHART MODAL (8600 exact) ====== */}
      {showOrg && (
        <ModalOverlay styles={mo} onClose={() => setShowOrg(false)}>
          <View style={[mo.modalCard, { maxWidth: 300 }]} onStartShouldSetResponder={() => true}>
            <View style={mo.header}>
              <View>
                <Text style={mo.title}>{t('partnerStructure')}</Text>
                <Text style={mo.sub}>{t('lpControl')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowOrg(false)}>
                <Text style={mo.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={org.body}>
              {[
                { name: t('nameZhang'), role: t('chairman'), pct: '34%', isChairman: true },
                { name: t('nameJiang'), role: t('ceo'), pct: '33%', isChairman: false },
                { name: t('nameLan'), role: t('janitor'), pct: '33%', isChairman: false },
              ].map(({ name, role, pct, isChairman }, i) => (
                <View key={name} style={{ alignItems: 'center', width: '100%' }}>
                  {i > 0 && <View style={org.line} />}
                  <View style={org.node}>
                    <Text style={[org.nodeName, isChairman && { color: colors.primary }]}>{name}</Text>
                    <Text style={org.nodeRole}>{role} · {pct}</Text>
                  </View>
                </View>
              ))}
              <Text style={org.joke}>{t('jokeClosedLoop')}</Text>
            </View>
          </View>
        </ModalOverlay>
      )}
      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
    </View>
  );
}

function getRoleKey(name: string): string {
  const map: Record<string, string> = { '张安武': 'chairman', '江宽': 'ceo', '蓝柳富': 'janitor' };
  return map[name] || 'janitor';
}

/* ========== MODAL OVERLAY ========== */

function ModalOverlay({ children, styles, onClose }: {
  children: React.ReactNode;
  styles: ReturnType<typeof getMo>;
  onClose: () => void;
}) {
  const anim = useRef(new Animated.Value(-300)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(anim, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);
  const close = () => {
    Animated.parallel([
      Animated.timing(anim, { toValue: -300, duration: 180, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };
  return (
    <Animated.View style={[styles.overlay, { opacity: fade }]}>
      <TouchableOpacity style={styles.backdrop} onPress={close} activeOpacity={1} />
      <Animated.View style={[styles.content, { transform: [{ translateY: anim }] }]}>{children}</Animated.View>
    </Animated.View>
  );
}

/* ========== TABLE GROUP ========== */

function TableGroup({ title, type, total, items, themeColors, styles, onDelete }: {
  title: string; type: string; total: number; items: { name: string; sub: string; amount: number }[];
  themeColors: ThemeColors;
  styles: ReturnType<typeof getTg>;
  onDelete?: () => void;
}) {
  const typeColors: Record<string, { dot: string; headerBg: string; badge: string; amt: string }> = {
    invest: { dot: themeColors.info, headerBg: withAlpha(themeColors.info, 0.1), badge: themeColors.info, amt: themeColors.textMain },
    mid: { dot: themeColors.info, headerBg: withAlpha(themeColors.info, 0.1), badge: themeColors.info, amt: themeColors.textMain },
    dividend: { dot: themeColors.primary, headerBg: withAlpha(themeColors.primary, 0.1), badge: themeColors.primary, amt: themeColors.primary },
  };
  const c = typeColors[type] || typeColors.invest;
  return (
    <View style={styles.card}>
      <View style={[styles.theadRow, { backgroundColor: c.headerBg }]}>
        <View style={styles.thLeft}>
          <View style={[styles.dot, { backgroundColor: c.dot }]} />
          <Text style={styles.thTitle}>{title}</Text>
        </View>
        <View style={styles.thRight}>
          <Text style={[styles.thAmt, { color: c.amt }]}>¥{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          {onDelete && (
            <TouchableOpacity onPress={onDelete}>
              <Text style={styles.delBtn}>{t('deleteRecord')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {items.map((item, i) => (
        <View key={i} style={styles.tbodyRow}>
          <Text style={styles.tdName}>{item.name}
            {item.sub ? <Text style={styles.tdSub}> · {item.sub}</Text> : null}
          </Text>
          <Text style={[styles.tdAmt, { color: c.amt }]}>¥{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
        </View>
      ))}
    </View>
  );
}

/* ========== STYLES (theme-aware get functions) ========== */

const getS = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  container: { maxWidth: 1024, alignSelf: 'center', width: '100%', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  header: { borderBottomWidth: 1, borderBottomColor: colors.bg, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 8 },
  backArrow: { fontSize: FONTS.h1.size, color: colors.textSub, lineHeight: 22, fontWeight: '300' },
  backText: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  redBar: { width: 8, height: 36, backgroundColor: colors.primary, borderRadius: 100 },
  mainTitle: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: colors.textMain, letterSpacing: -0.3 },
  engSub: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight, letterSpacing: 0.3, marginTop: 1 },
  langRow: { flexDirection: 'row', gap: 4, paddingTop: 4 },
  langBtn: { fontSize: FONTS.micro.size, color: colors.textSub, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, fontWeight: FONTS.micro.weight as any },
  langActive: { color: colors.primary, backgroundColor: withAlpha(colors.danger, 0.1), fontWeight: FONTS.microBold.weight as any },
  statGrid: { flexDirection: 'row', gap: 12, marginTop: 16, flexWrap: 'wrap' },
  statCard: {
    flex: 1, minWidth: 200, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.bg,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14,
    // @ts-ignore
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  statIconBg: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight, letterSpacing: 0.3 },
  statValue: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textMain, marginTop: 2 },
  statGreen: { fontSize: FONTS.micro.size, color: colors.success, fontWeight: FONTS.micro.weight, marginTop: 2 },
  statSub: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight, marginTop: 2 },
  dividendBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  dividendBtnText: { color: colors.surface, fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight },
  partnerGrid: { flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  partnerCard: {
    flex: 1, minWidth: 200, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.bg,
    padding: 16, gap: 10, // @ts-ignore
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  partnerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  partnerName: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub },
  partnerPct: { fontSize: FONTS.micro.size, color: colors.textSub },
  paidBadge: { backgroundColor: withAlpha(colors.success, 0.1), borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  paidBadgeText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.success },
  partnerDataRow: { flexDirection: 'row', gap: 4 },
  partnerDataCell: { flex: 1, alignItems: 'center' },
  dataLabel: { fontSize: FONTS.micro.size, color: colors.textSub },
  dataValue: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.textSub },
  partnerFooter: { borderTopWidth: 1, borderTopColor: colors.bg, paddingTop: 6 },
  footerLabel: { fontSize: FONTS.micro.size, color: colors.primary, fontWeight: FONTS.micro.weight },
  footerAmt: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.primary },
  footerSub: { fontSize: FONTS.micro.size, color: colors.textSub },
  ledgerCard: {
    backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.bg, marginTop: 16,
    // @ts-ignore
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  ledgerHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: colors.bg, gap: 12 },
  ledgerTitle: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.textSub, letterSpacing: 0.5 },
  ledgerSub: { fontSize: FONTS.micro.size, color: colors.textSub },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 100, backgroundColor: colors.bg },
  filterBtnActive: { backgroundColor: colors.textMain },
  filterBtnText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight as any, color: colors.textSub },
  filterBtnActiveText: { color: colors.surface, fontWeight: FONTS.microBold.weight as any },
});

const getMo = (colors: ThemeColors) => StyleSheet.create({
  overlay: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, justifyContent: 'center', alignItems: 'center', padding: 16 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: withAlpha(colors.textMain, 0.4) },
  content: { alignItems: 'center', justifyContent: 'center' },
  modalCard: {
    backgroundColor: colors.surface, borderRadius: 16, width: 360, maxWidth: '100%', overflow: 'hidden',
    // @ts-ignore
    ...modalCardAnimation,
    // @ts-ignore
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  header: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.surface },
  sub: { fontSize: FONTS.micro.size, color: withAlpha(colors.danger, 0.1), marginTop: 2 },
  close: { ...modalClose, },
});

const getMoBody = (colors: ThemeColors) => StyleSheet.create({
  body: { padding: 20, gap: 12 },
  label: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.textSub, marginBottom: 4 },
  input: { width: '100%', backgroundColor: colors.bg, borderWidth: 1, borderColor: 'transparent', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight as any, color: colors.textSub, fontFamily: undefined },
  preview: { backgroundColor: colors.bg, borderRadius: 12, padding: 12, gap: 8 },
  previewTitle: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.textSub, letterSpacing: 0.5 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewName: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight },
  previewAmt: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.textMain },
  btnRow: { flexDirection: 'row', gap: 12, paddingTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: colors.bg, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.textSub },
  confirmBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  confirmBtnText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.surface },
  deleteConfirmBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  deleteBox: { backgroundColor: withAlpha(colors.primary, 0.1), borderRadius: 12, padding: 12, alignItems: 'center' },
  deleteText: { fontSize: FONTS.micro.size, color: colors.textSub, textAlign: 'center' },
});

const getDs = (colors: ThemeColors) => StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { flex: 1, flexBasis: '45%' as any, borderRadius: 12, padding: 12 },
  cellLabel: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: colors.textSub },
  cellNum: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textMain, marginTop: 2 },
  cellNumSmall: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textMain, marginTop: 2 },
  progressWrap: { backgroundColor: colors.bg, borderRadius: 12, padding: 12 },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabelText: { fontSize: FONTS.micro.size, color: colors.textSub },
  progressBar: { height: 6, backgroundColor: colors.secondary, borderRadius: 100, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 100 },
  historyTitle: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.textSub, letterSpacing: 0.5, marginBottom: 8 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: withAlpha(colors.primary, 0.1), borderRadius: 8, marginBottom: 4 },
  historyNote: { fontSize: FONTS.micro.size, color: colors.textSub },
  historyAmt: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.primary },
  historyEmpty: { fontSize: FONTS.micro.size, color: colors.textSub, textAlign: 'center', paddingVertical: 12 },
});

const getOrg = (colors: ThemeColors) => StyleSheet.create({
  body: { padding: 20, alignItems: 'center' },
  node: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.secondary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, width: '100%', alignItems: 'center' },
  nodeName: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.textSub },
  nodeRole: { fontSize: FONTS.micro.size, color: colors.textSub, marginTop: 2, fontWeight: FONTS.micro.weight },
  line: { width: 2, height: 24, backgroundColor: colors.secondary },
  joke: { fontSize: FONTS.microBold.size, color: colors.textSub, textAlign: 'center', marginTop: 20, lineHeight: 16, fontWeight: FONTS.microBold.weight },
});

const getTg = (colors: ThemeColors) => StyleSheet.create({
  card: { borderTopWidth: 1, borderTopColor: colors.bg },
  theadRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bg },
  thLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16, flex: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  thTitle: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: colors.textSub },
  thMid: { width: 40, alignItems: 'center' },
  thBadge: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight },
  thRight: { flexDirection: 'row', alignItems: 'center', paddingRight: 16 },
  thAmt: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight },
  delBtn: { fontSize: FONTS.micro.size, fontWeight: FONTS.body.weight, color: colors.danger, marginLeft: 8 },
  tbodyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.bg },
  tdName: { fontSize: FONTS.micro.size, color: colors.textSub, flex: 1, paddingLeft: 16 },
  tdSub: { fontSize: FONTS.micro.size, color: colors.textSub },
  tdMid: { width: 40 },
  tdAmt: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, paddingRight: 16 },
});
