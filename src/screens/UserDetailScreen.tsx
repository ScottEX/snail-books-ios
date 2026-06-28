import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { api, resolveAssetUrl } from '../api/client';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import AdminHeader from '../components/AdminHeader';
import { getCurrentUserId } from '../utils/storage';

interface UserData {
  id: number;
  username: string;
  email: string;
  phone: string;
  role: string;
  remark: string;
  is_disabled: boolean;
  reviewed: boolean;
  created_at: string;
  last_login: string;
  avatar: string;
  signature: string;
  delete_scheduled: string;
  delete_by: string;
  linked_partner_id: number | null;
  linked_partner_name: string;
}

interface Props {
  user: { id: number; username: string; email: string; avatar: string; is_disabled: boolean };
  onBack: () => void;
  onChanged: () => void;
}

const ROLES = ['董事长', 'CEO', '店长', '员工', '打杂'];
const ROLE_EN = ['Chairman', 'CEO', 'Manager', 'Staff', 'User'];
const ROLE_TW = ['董事長', 'CEO', '店長', '員工', '打雜'];

const ROLE_COLORS: Record<string, string> = {
  '董事长': '#C84047',
  'CEO': '#E8953A',
  '店长': '#3A7CA5',
  '员工': '#5B8C5A',
  '打杂': '#8C8583',
};

function getRoleLabel(role: string, lang: string): string {
  if (!role) return t('normalUser');
  if (lang === 'en') { const idx = ROLES.indexOf(role); return idx >= 0 ? ROLE_EN[idx] : role; }
  if (lang === 'zh-TW') { const idx = ROLES.indexOf(role); return idx >= 0 ? ROLE_TW[idx] : role; }
  return role;
}

function getRoleColor(role: string): string {
  return ROLE_COLORS[role] || '#8C8583';
}

// ── SVG icons ──
function PencilSvg({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5Z" />
      <Path d="M15 5l4 4" />
    </Svg>
  );
}

function UndoIconSvg({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M1 4v6h6" />
      <Path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </Svg>
  );
}

function TrashIconSvg({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 6h18" />
      <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <Path d="M10 11v6" />
      <Path d="M14 11v6" />
      <Path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </Svg>
  );
}

export default function UserDetailScreen({ user, onBack, onChanged }: Props) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const safeTop = insets.top;
  const isSelf = String(user.id) === (getCurrentUserId() || '');
  const lang = getLang();
  const s = useMemo(() => getStyles(c), [c]);

  const [detail, setDetail] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDisabled, setIsDisabled] = useState(user.is_disabled);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [role, setRole] = useState('');
  const [remark, setRemark] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [realName, setRealName] = useState('');
  const [realNamePinyin, setRealNamePinyin] = useState('');
  const [realNameTW, setRealNameTW] = useState('');
  const [linkedPartnerId, setLinkedPartnerId] = useState<number | null>(null);
  const [linkedPartnerName, setLinkedPartnerName] = useState('');
  const [showPartnerPicker, setShowPartnerPicker] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [partnerList, setPartnerList] = useState<any[]>([]);
  const [toast, setToast] = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const resp: any = await api.admin.getUser(user.id);
      const d = resp?.data || resp;
      setDetail(d);
      setIsDisabled(!!d?.is_disabled);
      setRole(d?.role || '');
      setRemark(d?.remark || '');
      setPhone(d?.phone || '');
      setEmail(d?.email || '');
      setRealName(d?.real_name || '');
      setRealNamePinyin(d?.real_name_pinyin || '');
      setRealNameTW(d?.real_name_tw || '');
      setLinkedPartnerId(d?.linked_partner_id ?? null);
      setLinkedPartnerName(d?.linked_partner_name || '');
      // Auto-mark as reviewed when admin views unreviewed user
      if (!d?.reviewed) {
        try {
          await api.admin.markReviewed(user.id);
          setDetail((prev) => prev ? { ...prev, reviewed: true } : prev);
          onChanged();
        } catch {}
      }
    } catch {
      showToast(t('toastLoadFailed'));
    }
    setLoading(false);
  }, [user.id, showToast, onChanged]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const saveField = useCallback(async (field: string, value: any) => {
    setSaving(true);
    try {
      await api.admin.updateUser(user.id, { [field]: value });
      if (field === 'real_name') {
        // Re-fetch detail to get updated pinyin/TW
        const detailResp: any = await api.admin.getUser(user.id);
        const d = detailResp?.data || detailResp;
        setRealNamePinyin(d?.real_name_pinyin || '');
        setRealNameTW(d?.real_name_tw || '');
      }
      if (field === 'is_disabled') onChanged();
    } catch (e: any) {
      showToast(e?.message || t('toastSubmitFailed'));
    }
    setSaving(false);
  }, [user.id, onChanged, showToast]);

  const handleToggleDisabled = useCallback((val: boolean) => {
    setIsDisabled(val);
    saveField('is_disabled', val);
  }, [saveField]);

  const handleMarkReviewed = useCallback(async () => {
    setSaving(true);
    try {
      await api.admin.markReviewed(user.id);
      showToast(getLang() === 'en' ? 'Marked as reviewed' : '已标记为已审核');
      fetchDetail();
      onChanged();
    } catch (e: any) {
      showToast(e?.message || t('toastSubmitFailed'));
    }
    setSaving(false);
  }, [user.id, fetchDetail, onChanged, showToast]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.admin.deleteUser(user.id);
      setShowDeleteConfirm(false);
      onChanged();
      onBack();
    } catch (e: any) {
      showToast(e?.message || t('toastSubmitFailed'));
    }
    setDeleting(false);
  };

  const handleRestore = async () => {
    setSaving(true);
    try {
      await api.admin.restoreUser(user.id);
      showToast(getLang() === 'en' ? 'Restored' : '已恢复');
      fetchDetail();
      onChanged();
    } catch (e: any) {
      showToast(e?.message || t('toastSubmitFailed'));
    }
    setSaving(false);
  };

  const fetchPartnerList = useCallback(async () => {
    try {
      const data: any = await api.getPartners();
      setPartnerList(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  const handleLinkPartner = useCallback(async (partnerId: number, partnerName: string) => {
    setShowPartnerPicker(false);
    setSaving(true);
    try {
      await api.admin.updateUser(user.id, { linked_partner_id: partnerId });
      setLinkedPartnerId(partnerId);
      setLinkedPartnerName(partnerName);
    } catch {}
    setSaving(false);
  }, [user.id]);

  const handleUnlinkPartner = useCallback(async () => {
    setSaving(true);
    try {
      await api.admin.updateUser(user.id, { linked_partner_id: null });
      setLinkedPartnerId(null);
      setLinkedPartnerName('');
    } catch {}
    setSaving(false);
  }, [user.id]);

  const handleRoleSelect = useCallback((r: string) => {
    setRole(r);
    setShowRolePicker(false);
    saveField('role', r);
  }, [saveField]);

  const fmtDate = (d?: string) => {
    if (!d) return '—';
    try { return d.slice(0, 16).replace('T', ' '); } catch { return '—'; }
  };

  const isGrace = !!detail?.delete_scheduled;
  const graceDateStr = detail?.delete_scheduled ? detail.delete_scheduled.slice(0, 16).replace('T', ' ') : '';
  const graceInitiator = detail?.delete_by === 'admin'
    ? (lang === 'en' ? 'Admin' : lang === 'zh-TW' ? '管理員' : '管理员')
    : (lang === 'en' ? 'User' : lang === 'zh-TW' ? '用戶' : '用户');
  const graceHint = lang === 'en'
    ? `Will be permanently deleted on ${graceDateStr} · Initiated by ${graceInitiator}`
    : lang === 'zh-TW'
      ? `將於 ${graceDateStr} 永久刪除 · ${graceInitiator}發起`
      : `将于 ${graceDateStr} 永久删除 · ${graceInitiator}发起`;

  return (
    <View style={s.container}>
      <AdminHeader safeTop={safeTop} onBack={onBack} title={t('userDetail')} />

      {/* Body */}
      <View style={[s.body, { marginTop: safeTop + 42 }]}>

      {loading ? (
        <View style={{ flex: 1 }}>
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator color={c.primary} />
          </View>
        </View>
      ) : !detail ? (
        <View style={{ flex: 1 }}>
          <Text style={{ textAlign: 'center', color: c.textSub, marginTop: 60, fontSize: 13 }}>User not found</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80, paddingTop: 12 }}>
          {/* Avatar + username row */}
          <View style={s.avatarSection}>
            <Image
              source={{ uri: resolveAssetUrl(detail.avatar) || 'https://placehold.co/120x120/EAE5E0/8C8583?text=U' }}
              style={s.avatar}
            />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={s.avatarName}>{detail.username}</Text>
                {/* Delete / Restore button (hidden for self) */}
                {!isSelf && !isGrace && (
                  <TouchableOpacity onPress={() => setShowDeleteConfirm(true)} activeOpacity={0.7} disabled={deleting}>
                    <View style={[s.actionBtn, { backgroundColor: withAlpha(c.danger, 0.08) }]}>
                      <TrashIconSvg color={c.danger} />
                    </View>
                  </TouchableOpacity>
                )}
                {!isSelf && isGrace && (
                  <TouchableOpacity onPress={handleRestore} activeOpacity={0.7} disabled={saving}>
                    <View style={[s.actionBtn, { backgroundColor: withAlpha(c.success, 0.08) }]}>
                      <UndoIconSvg color={c.success} />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
              {/* Status badge */}
              {isGrace ? (
                <View style={[s.statusBadge, { alignSelf: 'flex-start', backgroundColor: withAlpha(c.warning, 0.08) }]}>
                  <View style={[s.statusDot, { backgroundColor: c.warning }]} />
                  <Text style={[s.statusText, { color: c.warning }]}>{t('graceStatus')}</Text>
                </View>
              ) : (
                <View style={[s.statusBadge, { alignSelf: 'flex-start', backgroundColor: isDisabled ? withAlpha(c.danger, 0.08) : withAlpha(c.success, 0.08) }]}>
                  <View style={[s.statusDot, { backgroundColor: isDisabled ? c.danger : c.success }]} />
                  <Text style={[s.statusText, { color: isDisabled ? c.danger : c.success }]}>
                    {isDisabled ? t('disabledStatus') : t('normalStatus')}
                  </Text>
                </View>
              )}
              {/* Unreviewed badge + Mark reviewed action */}
              {!detail.reviewed && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <View style={s.newBadge}>
                    <Text style={s.newBadgeText}>{t('newUserBadge')}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleMarkReviewed}
                    disabled={saving}
                    style={[s.markReadBtn, saving && { opacity: 0.5 }]}
                    activeOpacity={0.7}
                  >
                    <Text style={s.markReadText}>
                      {getLang() === 'en' ? 'Mark reviewed' : '标记已审核'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {isGrace && (
                <Text style={{ fontSize: 11, color: c.textSub, lineHeight: 16, marginTop: 4 }}>{graceHint}</Text>
              )}
            </View>
          </View>

          {/* Basic Info */}
          <View style={s.section}>
            <View style={s.sectionTitleRow}>
              <Text style={s.sectionTitleText}>{t('basicInfo')}</Text>
              <View style={s.sectionTitleLine} />
            </View>
            <View style={s.card}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{t('userId')}</Text>
                <Text style={s.infoValue}>{detail.id}</Text>
              </View>
              <View style={s.divider} />
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{t('username')}</Text>
                <Text style={s.infoValue}>{detail.username}</Text>
              </View>
              <View style={s.divider} />
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{t('realName')}</Text>
                {lang === 'zh-CN' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                    <TextInput
                      style={s.editInput}
                      value={realName}
                      onChangeText={setRealName}
                      onBlur={() => saveField('real_name', realName)}
                      placeholder="—"
                      placeholderTextColor={c.textSub}
                    />
                    <PencilSvg color={c.textSub} />
                  </View>
                ) : (
                  <Text style={s.infoValue}>
                    {lang === 'en'
                      ? (realNamePinyin || realName || '—')
                      : lang === 'zh-TW'
                      ? (realNameTW || realName || '—')
                      : (realName || '—')}
                  </Text>
                )}
              </View>
              <View style={s.divider} />
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{t('phone')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                  <TextInput
                    style={s.editInput}
                    value={phone}
                    onChangeText={setPhone}
                    onBlur={() => saveField('phone', phone)}
                    placeholder="—"
                    placeholderTextColor={c.textSub}
                    keyboardType="phone-pad"
                  />
                  <PencilSvg color={c.textSub} />
                </View>
              </View>
              <View style={s.divider} />
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{t('profileEmail')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                  <TextInput
                    style={s.editInput}
                    value={email}
                    onChangeText={setEmail}
                    onBlur={() => saveField('email', email)}
                    placeholder="—"
                    placeholderTextColor={c.textSub}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <PencilSvg color={c.textSub} />
                </View>
              </View>
              <View style={s.divider} />
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{t('registrationTime')}</Text>
                <Text style={s.infoValue}>{fmtDate(detail.created_at)}</Text>
              </View>
              <View style={s.divider} />
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{t('lastLogin')}</Text>
                <Text style={s.infoValue}>{fmtDate(detail.last_login)}</Text>
              </View>
            </View>
          </View>

          {/* Login Status — hidden for self */}
          {!isSelf && (
            <View style={s.section}>
              <View style={s.sectionTitleRow}>
                <Text style={s.sectionTitleText}>{t('loginStatus')}</Text>
                <View style={s.sectionTitleLine} />
              </View>
              <View style={s.card}>
                <View style={s.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.toggleLabel}>{t('allowLogin')}</Text>
                    <Text style={s.toggleHint}>{t('loginDisabledHint')}</Text>
                  </View>
                  <Switch
                    value={!isDisabled}
                    onValueChange={(v) => { if (saving) return; handleToggleDisabled(!v); }}
                    trackColor={{ false: withAlpha(c.textMain, 0.18), true: c.primary }}
                    thumbColor="#fff"
                    disabled={isGrace}
                    style={{ transform: [{ scale: 0.75 }] }}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Linked Partner */}
          <View style={s.section}>
            <View style={s.sectionTitleRow}>
              <Text style={s.sectionTitleText}>{t('linkedPartner')}</Text>
              <View style={s.sectionTitleLine} />
            </View>
            <View style={s.card}>
              <View style={s.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>
                    {linkedPartnerId ? linkedPartnerName : t('unlinked')}
                  </Text>
                </View>
                {linkedPartnerId ? (
                  <TouchableOpacity onPress={() => setShowUnlinkConfirm(true)} disabled={saving} activeOpacity={0.7}>
                    <Text style={{ color: c.danger, fontSize: 13, fontWeight: '500' }}>{t('unlinkPartner')}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => { fetchPartnerList(); setShowPartnerPicker(true); }} disabled={saving} activeOpacity={0.7}>
                    <Text style={{ color: c.primary, fontSize: 13, fontWeight: '500' }}>{t('linkPartner')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Other Info */}
          <View style={s.section}>
            <View style={s.sectionTitleRow}>
              <Text style={s.sectionTitleText}>{t('otherInfo')}</Text>
              <View style={s.sectionTitleLine} />
            </View>
            <View style={s.card}>
              {/* Role */}
              <TouchableOpacity
                onPress={() => setShowRolePicker(!showRolePicker)}
                activeOpacity={0.7}
                style={s.infoRow}
              >
                <Text style={s.infoLabel}>{t('role')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[s.roleBadge, { backgroundColor: withAlpha(getRoleColor(role || '打杂'), 0.1) }]}>
                    <Text style={[s.infoValue, { color: getRoleColor(role || '打杂') }]}>{getRoleLabel(role, lang)}</Text>
                  </View>
                  <PencilSvg color={c.textSub} />
                </View>
              </TouchableOpacity>
              {showRolePicker && (
                <View style={s.roleList}>
                  {ROLES.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[s.roleItem, { backgroundColor: withAlpha(getRoleColor(r), role === r ? 0.15 : 0.05) }]}
                      onPress={() => handleRoleSelect(r)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.roleItemText, { color: getRoleColor(r), fontWeight: role === r ? '700' : '500' }]}>
                        {getRoleLabel(r, lang)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={s.divider} />
              {/* Remarks */}
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{t('remarks')}</Text>
                <TextInput
                  style={s.editInput}
                  value={remark}
                  onChangeText={setRemark}
                  onBlur={() => saveField('remark', remark)}
                  placeholder="—"
                  placeholderTextColor={c.textSub}
                  multiline
                />
              </View>
            </View>
          </View>

          {/* TODO: show user's recent transactions / activity here if backend provides */}
        </ScrollView>
      )}
      </View>

      <ConfirmModal
        visible={showDeleteConfirm}
        title={t('deleteUser')}
        message={t('deleteUserGraceNote')}
        confirmLabel={deleting ? (t('loading') || '...') : (t('delete') || '删除')}
        cancelLabel={t('cancel')}
        confirmColor={c.danger}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Partner picker */}
      <Modal visible={showPartnerPicker} transparent animationType="fade" onRequestClose={() => setShowPartnerPicker(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setShowPartnerPicker(false)}>
          <View style={{ backgroundColor: c.surface, borderRadius: 14, width: '80%', maxHeight: '60%', padding: 4 }} onStartShouldSetResponder={() => true}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: c.textMain, padding: 16, paddingBottom: 12 }}>{t('linkPartner')}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {partnerList.map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  style={{ paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 0.5, borderTopColor: withAlpha(c.textMain, 0.08) }}
                  onPress={() => handleLinkPartner(p.id, p.name)}
                  activeOpacity={0.6}
                >
                  <Text style={{ fontSize: 14, color: c.textMain }}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <ConfirmModal
        visible={showUnlinkConfirm}
        title={t('unlinkPartner')}
        message={t('unlinkPartner') + '？“' + linkedPartnerName + '”'}
        confirmLabel={saving ? (t('loading') || '...') : t('unlinkPartner')}
        cancelLabel={t('cancel')}
        confirmColor={c.danger}
        loading={saving}
        onConfirm={handleUnlinkPartner}
        onCancel={() => setShowUnlinkConfirm(false)}
      />

      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
    </View>
  );
}

const getStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, backgroundColor: c.bg },
  avatarSection: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 16,
    paddingHorizontal: 20, paddingBottom: 20,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.bg, flexShrink: 0 },
  avatarName: { fontSize: 18, fontWeight: '700', color: c.textMain, flex: 1 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '500' },
  newBadge: {
    backgroundColor: withAlpha(c.warning, 0.15),
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  newBadgeText: { fontSize: 10, fontWeight: '700', color: c.warning },
  markReadBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
    backgroundColor: withAlpha(c.primary, 0.1),
  },
  markReadText: { fontSize: 12, fontWeight: '600', color: c.primary },
  roleBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  section: { paddingHorizontal: 20, marginTop: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  sectionTitleText: {
    fontSize: 10, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: c.textSub,
  },
  sectionTitleLine: { flex: 1, height: 1, backgroundColor: withAlpha(c.textMain, 0.08) },
  card: {
    backgroundColor: c.surface, borderRadius: 12,
    borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.06),
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, gap: 12,
  },
  infoLabel: { fontSize: 14, color: c.textSub, flexShrink: 0 },
  infoValue: { fontSize: 14, fontWeight: '500', color: c.textMain, textAlign: 'right' },
  editInput: {
    flex: 1, fontSize: 14, fontWeight: '500', color: c.textMain,
    textAlign: 'right', padding: 0, minWidth: 100,
  },
  divider: { height: 0.5, backgroundColor: withAlpha(c.textMain, 0.08), marginLeft: 16 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, gap: 12,
  },
  toggleLabel: { fontSize: 14, fontWeight: '500', color: c.textMain, marginBottom: 2 },
  toggleHint: { fontSize: 12, color: c.textSub, lineHeight: 16 },
  roleList: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  roleItem: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  roleItemText: { fontSize: 13 },
});
