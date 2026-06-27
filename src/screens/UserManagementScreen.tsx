import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { api } from '../api/client';
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

export default function UserManagementScreen({ onBack, onSelectUser }: Props) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => getStyles(c), [c]);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'' | 'normal' | 'disabled' | 'unreviewed'>('');
  const [toast, setToast] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await api.getUsers();
      const list: UserItem[] = Array.isArray(data) ? data : (data?.data || data?.users || []);
      setUsers(list);
    } catch {
      setToast(t('toastLoadFailed'));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Client-side filter: search + status chip
  const filteredUsers = useMemo(() => {
    let list = users;
    if (statusFilter === 'normal') list = list.filter(u => !u.is_disabled && !u.delete_scheduled);
    else if (statusFilter === 'disabled') list = list.filter(u => !!u.is_disabled && !u.delete_scheduled);
    else if (statusFilter === 'unreviewed') list = list.filter(u => !u.reviewed);

    if (searchText) {
      const q = searchText.toLowerCase();
      list = list.filter(u =>
        u.username.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, searchText, statusFilter]);

  const total = users.length;

  return (
    <View style={s.container}>
      {/* Header — glass (matches historyHeader pattern) */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={s.backBtn}>
          <BackArrowSvg color={c.primary} />
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

        {/* Filter chips: All / Active / Disabled / Unreviewed */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {([
            { key: '', label: t('all') },
            { key: 'normal', label: t('normalStatus') },
            { key: 'disabled', label: t('disabledStatus') },
            { key: 'unreviewed', label: t('newUserBadge') },
          ] as { key: '' | 'normal' | 'disabled' | 'unreviewed'; label: string }[]).map(f => {
            const active = statusFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key || 'all'}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setStatusFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* User list */}
        <ScrollView style={s.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={c.primary} />
            </View>
          ) : users.length === 0 ? (
            <EmptyState icon={<UserEmptyIcon color={c.textSub} />} title={t('noUsers') || '暂无用户'} />
          ) : filteredUsers.length === 0 ? (
            <Text style={s.emptyText}>{getLang() === 'en' ? 'No matching users' : '无匹配用户'}</Text>
          ) : (
            filteredUsers.map((u) => {
              const isGrace = !!u.delete_scheduled;
              const isDisabled = u.is_disabled;
              const badgeColor = isGrace ? c.warning : isDisabled ? c.danger : c.success;
              const badgeBg = isGrace ? withAlpha(c.warning, 0.12) : isDisabled ? withAlpha(c.danger, 0.08) : withAlpha(c.success, 0.08);
              const badgeLabel = isGrace ? t('graceStatus') : isDisabled ? t('disabledStatus') : t('normalStatus');
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
                    <Image
                      source={{ uri: u.avatar || 'https://placehold.co/80x80/EAE5E0/8C8583?text=U' }}
                      style={s.avatar}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.nameLine}>
                      <Text style={s.userName} numberOfLines={1}>{u.username}</Text>
                      {!u.reviewed && (
                        <View style={s.newBadge}>
                          <Text style={s.newBadgeText}>{t('newUserBadge')}</Text>
                        </View>
                      )}
                    </View>
                    {u.email ? <Text style={s.userEmail} numberOfLines={1}>{u.email}</Text> : null}
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: badgeBg }]}>
                    <View style={[s.statusDot, { backgroundColor: badgeColor }]} />
                    <Text style={[s.statusText, { color: badgeColor }]}>{badgeLabel}</Text>
                  </View>
                  <ChevronRightSvg color={c.textSub} />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            {t('totalUsers').replace('{n}', String(total))}
            {statusFilter || searchText ? ` · ${filteredUsers.length}` : ''}
          </Text>
        </View>
      </View>

      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
    </View>
  );
}

const getStyles = (c: ThemeColors) => {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
      backgroundColor: withAlpha(c.bg, 0.92),
      borderBottomWidth: 1, borderBottomColor: withAlpha(c.textSub, 0.1),
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: withAlpha(c.bg, 0.5),
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.08),
    },
    title: {
      flex: 1, fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.textMain,
    },
    body: { flex: 1 },
    // Search bar
    searchBox: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: 16, marginTop: 12, marginBottom: 10,
      backgroundColor: c.surface,
      borderRadius: 10, paddingHorizontal: 12, height: 40,
      borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.08),
    },
    searchInput: {
      flex: 1, marginLeft: 8, fontSize: 14, color: c.textMain, paddingVertical: 0,
    },
    // Filter chips row
    filterRow: {
      flexDirection: 'row', gap: 8,
      paddingHorizontal: 16, marginBottom: 10,
    },
    chip: {
      paddingVertical: 7, paddingHorizontal: 14, borderRadius: 100,
      backgroundColor: c.surface,
      borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.1),
    },
    chipActive: {
      backgroundColor: c.textMain,
      borderColor: c.textMain,
    },
    chipText: {
      fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: c.textSub,
    },
    chipTextActive: {
      color: c.surface, fontWeight: FONTS.microBold.weight,
    },
    // List
    list: { flex: 1, paddingHorizontal: 16 },
    userRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.surface, borderRadius: 12,
      paddingVertical: 12, paddingHorizontal: 12,
      marginBottom: 6,
      borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.06),
    },
    avatarWrap: { marginRight: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.bg },
    nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
    emptyText: {
      textAlign: 'center', color: c.textSub, marginTop: 40, fontSize: 13,
    },
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
