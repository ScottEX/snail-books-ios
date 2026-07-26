import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import HomeBackground from '../components/HomeBackground';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import AppTextInput from '../components/AppTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { API_BASE, resolveAssetUrl } from '../api/client';
import { useServerDate } from '../hooks/useServerDate';
import { useTheme, withAlpha, ThemeColors, FONTS } from '../theme';
import { SHEET_RADIUS } from '../sharedStyles';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';
import HistoryHeader from '../components/HistoryHeader';
import AnimatedDropdown from '../components/AnimatedDropdown';

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
  onSelectUser: (user: { id: number; username: string; email: string; avatar: string; is_disabled: boolean; reviewed: boolean }) => void;
  /** Set to a user ID to mark that user as reviewed locally, without re-fetching */
  reviewedUserId?: number | null;
}

// ── SVG icons ──
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

function DropArrowIcon({ color, open }: { color: string; open: boolean }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 1024 1024" style={{ marginLeft: 2, transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
      <Path d="M836.899 399.237l-218.01 335.037c-47.506 73.007-166.272 73.007-213.778 0l-218.01-335.037C139.595 326.23 198.977 234.97 293.99 234.97h436.02c95.013 0 154.395 91.26 106.889 164.267z" fill={color} />
    </Svg>
  );
}

function UserEmptyIcon({ color }: { color: string }) {
  return (
    <Svg width={180} height={140} viewBox="0 0 1024 1024">
      <Path d="M567.808 496.128c38.4 0 69.632-31.232 69.632-69.632s-31.232-69.632-69.632-69.632-69.632 31.232-69.632 69.632 31.232 69.632 69.632 69.632z m-185.856 0c38.4 0 69.632-31.232 69.632-69.632s-31.232-69.632-69.632-69.632S312.32 388.096 312.32 426.496s31.232 69.632 69.632 69.632z m0 46.592c-54.272 0-162.304 27.136-162.304 81.408v57.856h325.12v-57.856c-0.512-54.272-108.544-81.408-162.816-81.408z m185.856 0c-6.656 0-14.336 0.512-22.528 1.024 27.136 19.456 45.568 45.568 45.568 79.872v57.856h139.264v-57.856c0-53.76-108.544-80.896-162.304-80.896z" fill="#AAD4FF" />
      <Path d="M660.48 553.984c38.4 0 69.632-31.232 69.632-69.632S698.88 414.72 660.48 414.72s-69.632 31.232-69.632 69.632 31.232 69.632 69.632 69.632z m-185.856 0c38.4 0 69.632-31.232 69.632-69.632S513.024 414.72 474.624 414.72s-69.632 31.232-69.632 69.632 31.232 69.632 69.632 69.632z m0 46.592c-54.272 0-162.304 27.136-162.304 81.408v57.856h325.12v-57.856c0-54.272-108.544-81.408-162.816-81.408z m185.856 0c-6.656 0-14.336 0.512-22.528 1.024 27.136 19.456 45.568 45.568 45.568 79.872v57.856h139.264v-57.856c0-53.76-108.032-80.896-162.304-80.896z" fill="#2B95FF" />
      <Path d="M864.256 379.904H834.56v-29.696c0-6.656-5.12-11.776-11.776-11.776-6.656 0-11.776 5.12-11.776 11.776v29.696h-29.696c-6.656 0-11.776 5.12-11.776 11.776s5.12 11.776 11.776 11.776h29.696v29.696c0 6.656 5.12 11.776 11.776 11.776 6.656 0 11.776-5.12 11.776-11.776v-29.696h29.696c6.656 0 11.776-5.12 11.776-11.776s-5.632-11.776-11.776-11.776zM323.584 310.272c-14.848 14.848-33.792 10.24-47.616 6.656-13.824-3.584-20.48-4.096-25.6 0.512-5.12 5.12-4.096 11.264-0.512 25.6 3.584 13.824 8.192 32.768-6.656 47.616-14.848 14.848-33.28 10.24-47.104 6.656-13.824-3.584-20.48-4.608-25.6 0.512-4.608 4.608-11.776 4.608-16.384 0s-4.608-11.776 0-16.384c14.848-14.848 33.28-10.24 47.104-6.656 13.824 3.584 20.48 4.608 25.6-0.512s4.096-11.264 0.512-25.6c-3.584-13.824-8.192-32.768 6.656-47.104 14.848-14.848 33.792-10.24 47.616-6.656 13.824 3.584 20.48 4.608 25.6-0.512s4.096-11.776 0.512-25.6c-3.584-13.824-8.192-32.768 6.656-47.616 4.608-4.608 11.776-4.608 16.384 0 4.608 4.608 4.608 11.776 0 16.384-5.12 5.12-4.096 11.264-0.512 25.6 3.584 13.824 8.192 32.768-6.656 47.104z" fill="#A8D4FF" />
      <Path d="M908.8 613.376m-32.768 0a32.768 32.768 0 1 0 65.536 0 32.768 32.768 0 1 0-65.536 0Z" fill="#D9EDFF" />
      <Path d="M240.128 756.736l-49.664-49.664c-3.584-3.584-9.216-3.584-12.8 0l-49.664 49.664c-3.584 3.584-3.584 9.216 0 12.8l49.664 49.664c3.584 3.584 9.216 3.584 12.8 0l49.664-49.664c3.584-3.584 3.584-9.216 0-12.8z m-56.832 43.008l-36.864-36.864 36.864-36.864L220.16 762.88l-36.864 36.864z" fill="#A8D4FF" />
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

export default function UserManagementScreen({ onBack, onSelectUser, reviewedUserId }: Props) {
  const { colors: c, theme } = useTheme();
  const sd = useServerDate();
  const s = useMemo(() => getStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const safeTop = insets.top;

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
  type PendingDate = { type: 'any' } | { type: 'quick'; days: number } | { type: 'custom'; year: number; month: number };
  const [pendingDate, setPendingDate] = useState<PendingDate>({ type: 'any' });
  // Layout refs for dropdown positioning
  const [statusLayout, setStatusLayout] = useState({ top: 0, left: 0, width: 0 });
  const [dateLayout, setDateLayout] = useState({ top: 0, left: 0, width: 0 });
  const statusChipRef = useRef<View>(null);
  const dateChipRef = useRef<View>(null);
  const [monthPicked, setMonthPicked] = useState(false);

  useEffect(() => {
    if (sd.ready && sd.year !== FALLBACK_YEAR) setDropYear(sd.year);
  }, [sd.ready, sd.year]);

  // ── Fetch users with server-side filters ──
  const fetchUsers = useCallback(async (sts: string, df: string, dt: string, silent = false) => {
    if (!silent) setLoading(true);
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
    if (!silent) setLoading(false);
  }, []);
  
  useEffect(() => { fetchUsers('', '', ''); }, []);

  // ── Refetch silently when screen regains focus (e.g. returning from UserDetail) ──
  useFocusEffect(useCallback(() => {
    fetchUsers(statusFilter, dateFrom, dateTo, true);
  }, [statusFilter, dateFrom, dateTo, fetchUsers]));

  // ── Mark a specific user as reviewed locally (no full refresh) ──
  useEffect(() => {
    if (!reviewedUserId) return;
    setUsers((prev) => prev.map((u) =>
      u.id === reviewedUserId ? { ...u, reviewed: true } : u
    ));
  }, [reviewedUserId]);

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
      const DD_W = 320;
      const pad = 16;
      const screenW = Dimensions.get('window').width;
      let left = x - 20;
      if (left + DD_W > screenW - pad) left = screenW - pad - DD_W;
      if (left < pad) left = pad;
      setDateLayout({ top: y + height + 4, left, width: DD_W });
    });
    if (dateFrom && dateFrom.length >= 7) {
      setDropYear(parseInt(dateFrom.slice(0, 4)));
      setDropMonth(parseInt(dateFrom.slice(5, 7)));
    } else {
      setDropYear(sd.year || FALLBACK_YEAR);
      setDropMonth(new Date().getMonth() + 1);
    }
    setShowDateDrop(true);
    // Init pending date from current filter
    if (dateFrom && dateTo) {
      // Check if matches a quick preset (only when dateTo is today)
      if (dateTo === sd.today) {
        const d = new Date(dateTo).getTime() - new Date(dateFrom).getTime();
        const days = Math.round(d / 86400000);
        if (days >= 6 && days <= 7) { setPendingDate({ type: 'quick', days: 7 }); }
        else if (days >= 29 && days <= 30) { setPendingDate({ type: 'quick', days: 30 }); }
        else if (days >= 89 && days <= 90) { setPendingDate({ type: 'quick', days: 90 }); }
        else { setPendingDate({ type: 'custom', year: dropYear, month: dropMonth }); }
      } else {
        setPendingDate({ type: 'custom', year: dropYear, month: dropMonth });
      }
    } else {
      setPendingDate({ type: 'any' });
    }
    setShowStatusDrop(false);
  }, [dateFrom, sd.year, sd.today]);

  const applyStatus = useCallback((val: string) => {
    setStatusFilter(val);
    setShowStatusDrop(false);
    fetchUsers(val, dateFrom, dateTo);
  }, [dateFrom, dateTo, fetchUsers]);

  const applyPick = useCallback(() => {
    if (pendingDate.type === 'any') {
      setDateFrom('');
      setDateTo('');
      setShowDateDrop(false);
      fetchUsers(statusFilter, '', '');
    } else if (pendingDate.type === 'quick') {
      setDateFrom(sd.offset(-pendingDate.days));
      setDateTo(sd.today);
      setShowDateDrop(false);
      fetchUsers(statusFilter, sd.offset(-pendingDate.days), sd.today);
    } else {
      const from = `${pendingDate.year}-${String(pendingDate.month).padStart(2, '0')}-01`;
      const to = lastDayOfMonth(pendingDate.year, pendingDate.month);
      setDateFrom(from);
      setDateTo(to);
      setShowDateDrop(false);
      fetchUsers(statusFilter, from, to);
    }
  }, [pendingDate, statusFilter, sd, fetchUsers]);

  const applyQuick = useCallback((days: number) => {
    setDateFrom(sd.offset(-days));
    setDateTo(sd.today);
    setShowDateDrop(false);
    fetchUsers(statusFilter, sd.offset(-days), sd.today);
  }, [sd.today, sd.offset, statusFilter, fetchUsers]);

  const clearDate = useCallback(() => {
    setDateFrom('');
    setDateTo('');
    setShowDateDrop(false);
    fetchUsers(statusFilter, '', '');
  }, [statusFilter, fetchUsers]);

  // ── Which quick preset is active? (in-dropdown: pendingDate; outside: actual filter)
  const quickActive = useMemo(() => {
    if (showDateDrop) {
      if (pendingDate.type === 'any') return 0;
      if (pendingDate.type === 'quick') return pendingDate.days;
      return -1;
    }
    if (!dateFrom && !dateTo) return 0;
    if (sd.ready && dateFrom === sd.offset(-7) && dateTo === sd.today) return 7;
    if (sd.ready && dateFrom === sd.offset(-30) && dateTo === sd.today) return 30;
    if (sd.ready && dateFrom === sd.offset(-90) && dateTo === sd.today) return 90;
    return -1;
  }, [showDateDrop, pendingDate, dateFrom, dateTo, sd.today, sd.ready]);

  // ── Labels ──
  const statusLabel =
    statusFilter === 'normal' ? t('normalStatus') :
    statusFilter === 'disabled' ? t('disabledStatus') :
    statusFilter === 'grace' ? t('graceStatus') :
    t('all');
  const dateLabel = (dateFrom || dateTo)
    ? `${dateFrom || '…'} - ${dateTo || '…'}`
    : t('registrationTime');

  const noUsersHint = theme.id === 'burgundy-warm' ? t('noUsersHintBurgundy') :
    theme.id === 'obsidian-gold' ? t('noUsersHintObsidian') :
    t('noUsersHintSpaceBlue');

  return (
    <View style={s.container}>
      <HomeBackground />
      <HistoryHeader safeTop={safeTop} onBack={onBack} title={t('userManagement')} />

      {/* Body */}
      <View style={[s.body, { marginTop: safeTop + 44 }]}>
        {/* Search bar */}
        <View style={s.searchBox}>
          <SearchIcon color={c.textSub} />
          <AppTextInput
            style={s.searchInput}
            placeholder={t('searchUser')}
            placeholderTextColor={c.textSub}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: FONTS.sub.size, color: c.textSub, paddingHorizontal: 4 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter row — two dropdown chips */}
        <View style={s.filterRow}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={s.filterChip}
              ref={statusChipRef}
              onPress={() => showStatusDrop ? setShowStatusDrop(false) : openStatusDrop()}
              activeOpacity={0.7}
            >
              <Text
                style={[s.filterChipText, statusFilter !== '' && { color: c.primary, fontWeight: '600' }]}
                numberOfLines={1}
              >
                {statusLabel}
              </Text>
              <DropArrowIcon color={statusFilter !== '' ? c.primary : c.textSub} open={showStatusDrop} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={s.filterChip}
              ref={dateChipRef}
              onPress={() => showDateDrop ? setShowDateDrop(false) : openDateDrop()}
              activeOpacity={0.7}
            >
              <Text
                style={[s.filterChipText, (dateFrom || dateTo) ? { color: c.primary, fontWeight: '600' } : undefined]}
                numberOfLines={1}
              >
                {dateLabel}
              </Text>
              <DropArrowIcon color={(dateFrom || dateTo) ? c.primary : c.textSub} open={showDateDrop} />
            </TouchableOpacity>
          </View>
        </View>

        {/* User list */}
        <ScrollView style={s.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
          {loading ? (
            <Text style={{ textAlign: 'center', color: c.textSub, marginTop: 40, fontSize: FONTS.small.size }}>
              {t('loading')}
            </Text>
          ) : users.length === 0 ? (
            <EmptyState
              icon={<UserEmptyIcon color={c.textSub} />}
              title={noUsersHint}
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
                    reviewed: u.reviewed,
                  })}
                  activeOpacity={0.6}
                >
                  <View style={s.avatarWrap}>
                    {u.avatar ? (
                      <Image source={{ uri: resolveAssetUrl(u.avatar) || '' }} style={s.avatar} contentFit="cover" transition={200} placeholder={{ uri: resolveAssetUrl('/img/logo.jpg') || '' }} cachePolicy="none" />
                    ) : (
                      <Image source={require('../../assets/img/logo.jpg')} style={s.avatar} contentFit="cover" />
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

      {/* ── Status dropdown ── */}
      <AnimatedDropdown
        visible={showStatusDrop}
        onClose={() => setShowStatusDrop(false)}
        style={{ top: statusLayout.top, left: statusLayout.left, width: statusLayout.width || 140 }}
      >
        <View style={{
          backgroundColor: c.surface,
          borderRadius: SHEET_RADIUS,
          borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.08),
          overflow: 'hidden' as const,
        }}>
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
      </AnimatedDropdown>

      {/* ── Date dropdown (year/month picker + quick presets) ── */}
      <AnimatedDropdown
        visible={showDateDrop}
        onClose={() => setShowDateDrop(false)}
        style={{ top: dateLayout.top, left: dateLayout.left, width: 320 }}
      >
        <View style={{
          backgroundColor: c.surface,
          borderRadius: SHEET_RADIUS,
          borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.08),
          overflow: 'hidden' as const,
        }}>
            {/* Year selector */}
            <View style={s.pickerRow}>
              {(sd.ready
                ? [sd.year - 3, sd.year - 2, sd.year - 1, sd.year]
                : [FALLBACK_YEAR - 3, FALLBACK_YEAR - 2, FALLBACK_YEAR - 1, FALLBACK_YEAR]
              ).map(y => (
                <TouchableOpacity
                  key={y}
                  style={[s.pickerBtn, pendingDate.type === 'custom' && pendingDate.year === y && s.pickerBtnOn]}
                  onPress={() => { const m = new Date().getMonth() + 1; setDropYear(y); setDropMonth(m); setPendingDate({ type: 'custom', year: y, month: m }); }}
                >
                  <Text style={[s.pickerBtnText, pendingDate.type === 'custom' && pendingDate.year === y && s.pickerBtnTextOn]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Month grid */}
            <View style={s.monthGrid}>
              {MONTHS.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[s.monthBtn, pendingDate.type === 'custom' && pendingDate.month === m && s.monthBtnOn]}
                  onPress={() => { const y = sd.year || new Date().getFullYear(); setDropYear(y); setDropMonth(m); setPendingDate({ type: 'custom', year: y, month: m }); }}
                >
                  <Text style={[s.monthBtnText, pendingDate.type === 'custom' && pendingDate.month === m && s.monthBtnTextOn]}> 
                    {m}{t('monthUnit')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Quick presets */}
            <View style={s.quickRow}>
              <TouchableOpacity
                style={[s.quickBtn, quickActive === 0 && s.quickBtnOn]}
                onPress={() => setPendingDate({ type: 'any' })}
              >
                <Text style={[s.quickBtnText, quickActive === 0 && s.quickBtnTextOn]}>
                  {t('anyDate')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.quickBtn, quickActive === 7 && s.quickBtnOn]} onPress={() => setPendingDate({ type: 'quick', days: 7 })}>
                <Text style={[s.quickBtnText, quickActive === 7 && s.quickBtnTextOn]}>{t('last7Days')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.quickBtn, quickActive === 30 && s.quickBtnOn]} onPress={() => setPendingDate({ type: 'quick', days: 30 })}>
                <Text style={[s.quickBtnText, quickActive === 30 && s.quickBtnTextOn]}>{t('last30Days')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.quickBtn, quickActive === 90 && s.quickBtnOn]} onPress={() => setPendingDate({ type: 'quick', days: 90 })}>
                <Text style={[s.quickBtnText, quickActive === 90 && s.quickBtnTextOn]}>{t('last3Months')}</Text>
              </TouchableOpacity>
            </View>
            {/* Actions */}
            <View style={s.dateActions}>
              <TouchableOpacity style={s.dateActionBtn} onPress={() => setPendingDate({ type: 'any' })}>
                <Text style={s.dateActionText}>{t('reset') || '重置'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dateActionBtn, s.dateActionApply]} onPress={applyPick}>
                <Text style={[s.dateActionText, { color: '#fff' }]}>{t('apply') || '确定'}</Text>
              </TouchableOpacity>
            </View>
        </View>
      </AnimatedDropdown>

      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
    </View>
  );
}

const getStyles = (c: ThemeColors) => {
  return StyleSheet.create({
    container: { flex: 1 },
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
      borderRadius: SHEET_RADIUS, paddingHorizontal: 12, height: 40,
      borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.08),
    },
    searchInput: {
      flex: 1, marginLeft: 8, fontSize: FONTS.sub.size, color: c.textMain, paddingVertical: 0,
    },
    // Filter row
    filterRow: {
      flexDirection: 'row', gap: 10,
      paddingHorizontal: 16, marginBottom: 6,
    },
    filterChip: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: c.surface,
      borderRadius: SHEET_RADIUS, height: 40, paddingHorizontal: 12,
      borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.08),
    },
    filterChipText: { fontSize: FONTS.small.size, color: c.textSub, flex: 1 },
    // Dropdown items
    dropItem: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 12, paddingHorizontal: 14,
      borderBottomWidth: 0.5, borderBottomColor: withAlpha(c.textMain, 0.06),
    },
    dropItemText: { fontSize: FONTS.sub.size, color: c.textMain },
    statusDotSm: { width: 6, height: 6, borderRadius: 3 },
    // ── Date picker ──
    pickerRow: {
      flexDirection: 'row', gap: 6,
      paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6,
    },
    pickerBtn: {
      flex: 1, alignItems: 'center', paddingVertical: 7,
      borderRadius: 8, backgroundColor: withAlpha(c.textMain, 0.04),
    },
    pickerBtnOn: { backgroundColor: c.primary },
    pickerBtnText: { fontSize: FONTS.small.size, color: c.textMain },
    pickerBtnTextOn: { color: '#fff', fontWeight: '600' as any },
    monthGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between',
      paddingHorizontal: 14, paddingBottom: 8,
    },
    monthBtn: {
      width: '22%' as any, alignItems: 'center',
      paddingVertical: 8, borderRadius: 8,
      backgroundColor: withAlpha(c.textMain, 0.04),
    },
    monthBtnOn: { backgroundColor: c.primary },
    monthBtnText: { fontSize: FONTS.small.size, color: c.textMain },
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
    quickBtnOn: {
      backgroundColor: c.primary,
    },
    quickBtnText: { fontSize: FONTS.micro.size, color: c.textSub },
    quickBtnTextOn: { color: '#fff', fontWeight: '600' as any },
    dateActions: {
      flexDirection: 'row', justifyContent: 'flex-end', gap: 8,
      paddingHorizontal: 14, paddingBottom: 10,
    },
    dateActionBtn: {
      paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8,
      backgroundColor: withAlpha(c.textMain, 0.06),
    },
    dateActionApply: { backgroundColor: c.primary },
    dateActionText: { fontSize: FONTS.small.size, color: c.textMain },
    // List
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 4 },
    userRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.surface, borderRadius: SHEET_RADIUS,
      paddingVertical: 12, paddingHorizontal: 12,
      marginBottom: 6,
      borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.06),
    },
    avatarWrap: { marginRight: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.bg },
    userName: { fontSize: FONTS.sub.size, fontWeight: '600', color: c.textMain },
    userEmail: { fontSize: FONTS.micro.size, color: c.textSub, marginTop: 2 },
    newBadge: {
      backgroundColor: withAlpha(c.warning, 0.15),
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    },
    newBadgeText: { fontSize: FONTS.tiny.size, fontWeight: '700', color: c.warning },
    statusBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
      marginRight: 8,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: FONTS.micro.size, fontWeight: '500' },
    // Footer
    footer: {
      paddingVertical: 12, paddingHorizontal: 16,
      borderTopWidth: 0.5, borderTopColor: withAlpha(c.textMain, 0.06),
      backgroundColor: c.surface,
      alignItems: 'center',
    },
    footerText: { fontSize: FONTS.small.size, color: c.textSub },
  });
};
