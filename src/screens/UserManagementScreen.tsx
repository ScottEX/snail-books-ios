import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { API_BASE, resolveAssetUrl } from '../api/client';
import { useServerDate } from '../hooks/useServerDate';
import { useTheme, withAlpha, ThemeColors, FONTS } from '../theme';
import { historyHeader } from '../sharedStyles';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';

interface UserItem {
  id: number;
  username: string;
  email: string;
  is_disabled: boolean;
  reviewed: boolean;
  created_at: string;
  avatar: string;
  delete_scheduled: string;
}

interface Props {
  onBack: () => void;
  onSelectUser: (user: { id: number; username: string; email: string; avatar: string; is_disabled: boolean }) => void;
}

// ── SVG icons ──
function BackArrowSvg({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={11} cy={11} r={8} />
      <Path d="M21 21l-4.35-4.35" />
    </Svg>
  );
}

function ChevronRightSvg({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10 6l6 6-6 6" />
    </Svg>
  );
}

function CaretDownSvg({ color }: { color: string }) {
  return (
    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-9" />
    </Svg>
  );
}

function UserEmptyIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 22c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </Svg>
  );
}

// ── Helpers ──
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const FALLBACK_YEAR = new Date().getFullYear();

function lastDayOfMonth(y: number, m: number): string {
  const d = new Date(y, m, 0);
  return `${y}-${String(m).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function UserManagementScreen({ onBack, onSelectUser }: Props) {
  const { colors: c } = useTheme();
  const sd = useServerDate();
  const s = useMemo(() => getStyles(c), [c]);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'normal' | 'disabled' | 'grace'
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Dropdown states
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const [showDateDrop, setShowDateDrop] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dropYear, setDropYear] = useState(FALLBACK_YEAR);
  const [dropMonth, setDropMonth] = useState(new Date().getMonth() + 1);

  // Layout refs for dropdown positioning
  const [statusLayout, setStatusLayout] = useState({ top: 0, left: 0, width: 0 });
  const [dateLayout, setDateLayout] = useState({ top: 0, left: 0, width: 0 });
  const statusChipRef = useRef<View>(null);
  const dateChipRef = useRef<View>(null);

  useEffect(() => {
    if (sd.ready && sd.year !== FALLBACK_YEAR) setDropYear(sd.year);
  }, [sd.ready, sd.year]);

  // ── Fetch users with server-side filters ──
  const fetchUsers = useCallback(async (sts: string, df: string, dt: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sts) params.set('status', sts);
      if (df) params.set('date_from', df);
      if (dt) params.set('date_to', dt);
      params.set('page', '1');
      params.set('per_page', '100');
      const url = `${API_BASE}/api/admin/users?${params.toString()}`;
      const resp = await fetch(url, {
        credentials: 'include',
        headers: { 'X-Lang': getLang() },
      });
      if (resp.ok) {
        const data = await resp.json();
        setUsers(data.data || []);
        setTotal(data.total || 0);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers('', '', ''); }, []);

  // ── Client-side search filter ──
  const filteredUsers = useMemo(() => {
    if (!searchText) return users;
    const q = searchText.toLowerCase();
    return users.filter(u =>
      u.username.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }, [users, searchText]);

  // ── Dropdown helpers ──
  const openStatusDrop = useCallback(() => {
    statusChipRef.current?.measureInWindow((x, y, width, height) => {
      setStatusLayout({ top: y + height + 4, left: x, width });
    });
    setShowStatusDrop(true);
    setShowDateDrop(false);
  }, []);

  const openDateDrop = useCallback(() => {
    dateChipRef.current?.measureInWindow((x, y, width, height) => {
      setDateLayout({ top: y + height + 4, left: x, width: 320 });
    });
    if (dateFrom && dateFrom.length >= 7) {
      setDropYear(parseInt(dateFrom.slice(0, 4)));
      setDropMonth(parseInt(dateFrom.slice(5, 7)));
    } else {
      setDropYear(sd.year || FALLBACK_YEAR);
      setDropMonth(new Date().getMonth() + 1);
    }
    setShowDateDrop(true);
    setShowStatusDrop(false);
  }, [dateFrom, sd.year]);

  const closeDrops = useCallback(() => {
    setShowStatusDrop(false);
    setShowDateDrop(false);
  }, []);

  const applyStatus = useCallback((val: string) => {
    setStatusFilter(val);
    closeDrops();
    fetchUsers(val, dateFrom, dateTo);
  }, [dateFrom, dateTo, fetchUsers]);

  const applyPick = useCallback(() => {
    const from = `${dropYear}-${String(dropMonth).padStart(2, '0')}-01`;
    const to = lastDayOfMonth(dropYear, dropMonth);
    setDateFrom(from);
    setDateTo(to);
    closeDrops();
    fetchUsers(statusFilter, from, to);
  }, [dropYear, dropMonth, statusFilter, fetchUsers]);

  const applyQuick = useCallback((days: number) => {
    setDateFrom(sd.offset(-days));
    setDateTo(sd.today);
    closeDrops();
    fetchUsers(statusFilter, sd.offset(-days), sd.today);
  }, [sd.today, sd.offset, statusFilter, fetchUsers]);

  const clearDate = useCallback(() => {
    setDateFrom('');
    setDateTo('');
    closeDrops();
    fetchUsers(statusFilter, '', '');
  }, [statusFilter, fetchUsers]);

  // ── Labels ──
  const statusLabel =
    statusFilter === 'normal' ? t('normalStatus') :
    statusFilter === 'disabled' ? t('disabledStatus') :
    statusFilter === 'grace' ? t('graceStatus') :
    t('all');
  const dateLabel = (dateFrom || dateTo)
    ? (dateFrom && dateTo && dateFrom.slice(0, 7) === dateTo.slice(0, 7)
        ? `${dropYear}年${dropMonth}${t('monthUnit')}`
        : `${dateFrom || '…'} - ${dateTo || '…'}`)
    : t('registrationTime');

  return (
    <View style={s.container}>
      {/* Header — absolute glass (matches web historyHeader) */}
      <View style={[s.header, { pointerEvents: 'box-none' as any }] as any}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <View style={s.backBtn}>
            <BackArrowSvg color="#000" />
          </View>
        </TouchableOpacity>
        <Text style={s.title}>{t('userManagement')}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Body */}
      <View style={s.body}>
        {/* Search bar */}
        <View style={s.searchBox}>
          <SearchIcon color={c.textSub} />
          <TextInput
            style={s.searchInput}
            placeholder={t('searchUser')}
            placeholderTextColor={c.textSub}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 14, color: c.textSub, paddingHorizontal: 4 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter row — two dropdown chips */}
        <View style={s.filterRow}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={s.filterChip}
              ref={statusChipRef}
              onPress={() => showStatusDrop ? closeDrops() : openStatusDrop()}
              activeOpacity={0.7}
            >
              <Text
                style={[s.filterChipText, statusFilter !== '' && { color: c.primary, fontWeight: '600' }]}
                numberOfLines={1}
              >
                {statusLabel}
              </Text>
              <CaretDownSvg color={statusFilter !== '' ? c.primary : c.textSub} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={s.filterChip}
              ref={dateChipRef}
              onPress={() => showDateDrop ? closeDrops() : openDateDrop()}
              activeOpacity={0.7}
            >
              <Text
                style={[s.filterChipText, (dateFrom || dateTo) ? { color: c.primary, fontWeight: '600' } : undefined]}
                numberOfLines={1}
              >
                {dateLabel}
              </Text>
              <CaretDownSvg color={(dateFrom || dateTo) ? c.primary : c.textSub} />
            </TouchableOpacity>
          </View>
        </View>

        {/* User list */}
        <ScrollView style={s.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
          {loading ? (
            <Text style={{ textAlign: 'center', color: c.textSub, marginTop: 40, fontSize: 13 }}>
              {t('loading')}
            </Text>
          ) : users.length === 0 ? (
            <EmptyState
              icon={<UserEmptyIcon color={c.textSub} />}
              title={t('noUsers') || '暂无用户'}
            />
          ) : (
            filteredUsers.map((u) => {
              const isGrace = !!u.delete_scheduled;
              const isDisabled = u.is_disabled;
              return (
                <TouchableOpacity
                  key={u.id}
                  style={s.userRow}
                  onPress={() => onSelectUser({
                    id: u.id,
                    username: u.username,
                    email: u.email || '',
                    avatar: u.avatar || '',
                    is_disabled: u.is_disabled,
                  })}
                  activeOpacity={0.6}
                >
                  <View style={s.avatarWrap}>
                    {u.avatar ? (
                      <Image source={{ uri: resolveAssetUrl(u.avatar) || '' }} style={s.avatar} />
                    ) : (
                      <Image source={require('../../assets/img/logo.jpg')} style={s.avatar} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.userName}>{u.username}</Text>
                      {!u.reviewed && (
                        <View style={s.newBadge}>
                          <Text style={s.newBadgeText}>{t('newUserBadge')}</Text>
                        </View>
                      )}
                    </View>
                    {u.email ? <Text style={s.userEmail}>{u.email}</Text> : null}
                  </View>
                  <View style={[
                    s.statusBadge,
                    {
                      backgroundColor: isGrace
                        ? withAlpha(c.warning, 0.12)
                        : isDisabled
                        ? withAlpha(c.danger, 0.08)
                        : withAlpha(c.success, 0.08),
                    },
                  ]}>
                    <View style={[s.statusDot, { backgroundColor: isGrace ? c.warning : isDisabled ? c.danger : c.success }]} />
                    <Text style={[s.statusText, { color: isGrace ? c.warning : isDisabled ? c.danger : c.success }]}>
                      {isGrace ? t('graceStatus') : isDisabled ? t('disabledStatus') : t('normalStatus')}
                    </Text>
                  </View>
                  <ChevronRightSvg color={c.textSub} />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>{t('totalUsers').replace('{n}', String(total))}</Text>
        </View>
      </View>

      {/* ── Status dropdown modal ── */}
      <Modal visible={showStatusDrop} transparent animationType="none" onRequestClose={closeDrops}>
        <TouchableOpacity style={s.dropBackdrop} activeOpacity={1} onPress={closeDrops}>
          <View style={[s.dropPanel, { top: statusLayout.top, left: statusLayout.left, width: statusLayout.width }]}>
            <TouchableOpacity style={s.dropItem} onPress={() => applyStatus('')}>
              <Text style={[s.dropItemText, statusFilter === '' && { color: c.primary, fontWeight: '600' }]}>
                {t('all')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.dropItem} onPress={() => applyStatus('normal')}>
              <View style={[s.statusDotSm, { backgroundColor: c.success }]} />
              <Text style={[s.dropItemText, statusFilter === 'normal' && { color: c.primary, fontWeight: '600' }]}>
                {t('normalStatus')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.dropItem} onPress={() => applyStatus('disabled')}>
              <View style={[s.statusDotSm, { backgroundColor: c.danger }]} />
              <Text style={[s.dropItemText, statusFilter === 'disabled' && { color: c.primary, fontWeight: '600' }]}>
                {t('disabledStatus')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.dropItem} onPress={() => applyStatus('grace')}>
              <View style={[s.statusDotSm, { backgroundColor: c.warning }]} />
              <Text style={[s.dropItemText, statusFilter === 'grace' && { color: c.primary, fontWeight: '600' }]}>
                {t('graceStatus')}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Date dropdown modal (year/month picker + quick presets) ── */}
      <Modal visible={showDateDrop} transparent animationType="none" onRequestClose={closeDrops}>
        <TouchableOpacity style={s.dropBackdrop} activeOpacity={1} onPress={closeDrops}>
          <View style={[s.datePanel, { top: dateLayout.top, left: Math.max(16, dateLayout.left - 20), width: 320 }]}>
            {/* Year selector */}
            <View style={s.pickerRow}>
              {(sd.ready
                ? [sd.year - 2, sd.year - 1, sd.year, sd.year + 1]
                : [FALLBACK_YEAR - 2, FALLBACK_YEAR - 1, FALLBACK_YEAR, FALLBACK_YEAR + 1]
              ).map(y => (
                <TouchableOpacity
                  key={y}
                  style={[s.pickerBtn, dropYear === y && s.pickerBtnOn]}
                  onPress={() => setDropYear(y)}
                >
                  <Text style={[s.pickerBtnText, dropYear === y && s.pickerBtnTextOn]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Month grid */}
            <View style={s.monthGrid}>
              {MONTHS.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[s.monthBtn, dropMonth === m && s.monthBtnOn]}
                  onPress={() => setDropMonth(m)}
                >
                  <Text style={[s.monthBtnText, dropMonth === m && s.monthBtnTextOn]}>
                    {m}{t('monthUnit')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Quick presets */}
            <View style={s.quickRow}>
              <TouchableOpacity style={s.quickBtn} onPress={() => applyQuick(7)}>
                <Text style={s.quickBtnText}>{t('last7Days')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.quickBtn} onPress={() => applyQuick(30)}>
                <Text style={s.quickBtnText}>{t('last30Days')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.quickBtn} onPress={() => applyQuick(90)}>
                <Text style={s.quickBtnText}>{t('last3Months')}</Text>
              </TouchableOpacity>
            </View>
            {/* Actions */}
            <View style={s.dateActions}>
              <TouchableOpacity style={s.dateActionBtn} onPress={clearDate}>
                <Text style={s.dateActionText}>{t('reset') || '重置'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dateActionBtn, s.dateActionApply]} onPress={applyPick}>
                <Text style={[s.dateActionText, { color: '#fff' }]}>{t('apply') || '确定'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
    </View>
  );
}

const getStyles = (c: ThemeColors) => {
  const hdr = historyHeader(c);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    ...hdr as any,
    title: { ...hdr.title, color: c.textMain },
    body: {
      flex: 1,
      marginTop: 100,
      backgroundColor: c.bg,
    },
    // Search bar
    searchBox: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: 16, marginTop: 16, marginBottom: 10,
      backgroundColor: c.surface,
      borderRadius: 10, paddingHorizontal: 12, height: 40,
      borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.08),
    },
    searchInput: {
      flex: 1, marginLeft: 8, fontSize: 14, color: c.textMain, paddingVertical: 0,
    },
    // Filter row
    filterRow: {
      flexDirection: 'row', gap: 10,
      paddingHorizontal: 16, marginBottom: 6,
    },
    filterChip: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: c.surface,
      borderRadius: 10, height: 40, paddingHorizontal: 12,
      borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.08),
    },
    filterChipText: { fontSize: 13, color: c.textSub, flex: 1 },
    // Dropdown backdrop
    dropBackdrop: { flex: 1 },
    // Dropdown panel
    dropPanel: {
      position: 'absolute',
      backgroundColor: c.surface,
      borderRadius: 10,
      borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.08),
      overflow: 'hidden' as any,
      zIndex: 9999,
    },
    dropItem: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 12, paddingHorizontal: 14,
      borderBottomWidth: 0.5, borderBottomColor: withAlpha(c.textMain, 0.06),
    },
    dropItemText: { fontSize: 14, color: c.textMain },
    statusDotSm: { width: 6, height: 6, borderRadius: 3 },
    // ── Date picker ──
    datePanel: {
      position: 'absolute',
      backgroundColor: c.surface,
      borderRadius: 10,
      borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.08),
      overflow: 'hidden' as any,
      zIndex: 9999,
    },
    pickerRow: {
      flexDirection: 'row', gap: 6,
      paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6,
    },
    pickerBtn: {
      flex: 1, alignItems: 'center', paddingVertical: 7,
      borderRadius: 8, backgroundColor: withAlpha(c.textMain, 0.04),
    },
    pickerBtnOn: { backgroundColor: c.primary },
    pickerBtnText: { fontSize: 13, color: c.textMain },
    pickerBtnTextOn: { color: '#fff', fontWeight: '600' as any },
    monthGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 6,
      paddingHorizontal: 14, paddingBottom: 8,
    },
    monthBtn: {
      width: '22%' as any, alignItems: 'center',
      paddingVertical: 7, borderRadius: 8,
      backgroundColor: withAlpha(c.textMain, 0.04),
    },
    monthBtnOn: { backgroundColor: c.primary },
    monthBtnText: { fontSize: 13, color: c.textMain },
    monthBtnTextOn: { color: '#fff', fontWeight: '600' as any },
    quickRow: {
      flexDirection: 'row', gap: 6,
      paddingHorizontal: 14, paddingBottom: 10,
      borderTopWidth: 0.5, borderTopColor: withAlpha(c.textMain, 0.06),
      paddingTop: 10,
    },
    quickBtn: {
      flex: 1, alignItems: 'center', paddingVertical: 7,
      borderRadius: 8, backgroundColor: withAlpha(c.textMain, 0.04),
    },
    quickBtnText: { fontSize: 12, color: c.textSub },
    dateActions: {
      flexDirection: 'row', justifyContent: 'flex-end', gap: 8,
      paddingHorizontal: 14, paddingBottom: 10,
    },
    dateActionBtn: {
      paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8,
      backgroundColor: withAlpha(c.textMain, 0.06),
    },
    dateActionApply: { backgroundColor: c.primary },
    dateActionText: { fontSize: 13, color: c.textMain },
    // List
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 4 },
    userRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.surface, borderRadius: 12,
      paddingVertical: 12, paddingHorizontal: 12,
      marginBottom: 6,
      borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.06),
    },
    avatarWrap: { marginRight: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.bg },
    userName: { fontSize: 15, fontWeight: '600', color: c.textMain },
    userEmail: { fontSize: 12, color: c.textSub, marginTop: 2 },
    newBadge: {
      backgroundColor: withAlpha(c.warning, 0.15),
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    },
    newBadgeText: { fontSize: 10, fontWeight: '700', color: c.warning },
    statusBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
      marginRight: 8,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 12, fontWeight: '500' },
    // Footer
    footer: {
      paddingVertical: 12, paddingHorizontal: 16,
      borderTopWidth: 0.5, borderTopColor: withAlpha(c.textMain, 0.06),
      backgroundColor: c.surface,
      alignItems: 'center',
    },
    footerText: { fontSize: 13, color: c.textSub },
  });
};
