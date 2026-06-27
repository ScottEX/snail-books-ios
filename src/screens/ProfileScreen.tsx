import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, TextInput, Switch, Modal,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient as SVGGradient, Stop, Rect } from 'react-native-svg';
import { t, getLang, setLang, langs } from '../i18n';
import { api, resolveAssetUrl } from '../api/client';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import Toast from '../components/Toast';
import BackArrow from '../components/icons/BackArrow';
import CameraIcon from '../components/icons/CameraIcon';
import ThemePickerModal from '../components/ThemePickerModal';
import { getCurrentUser, getCurrentUserId } from '../utils/storage';
import { pickImages } from '../utils/imagePicker';
import { modalCardAnimation, modalClose } from '../sharedStyles';

interface Props {
  onBack: () => void;
  onLogout: () => void;
  onLangChange?: () => void;
  onManageUsers?: () => void;
  onAvatarChange?: () => void;
  refreshKey?: number;
}

/* ════════════════ ICONS ════════════════ */

function ChevronRight({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10 6l6 6-6 6" />
    </Svg>
  );
}

function UserIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 12a4 4 0 100-8 4 4 0 000 8z" />
      <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </Svg>
  );
}

function MailIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <Path d="M22 6l-10 7L2 6" />
    </Svg>
  );
}

function LockIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={11} width={18} height={11} rx={2} />
      <Path d="M7 11V7a5 5 0 0110 0v4" />
    </Svg>
  );
}

function LangIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <Path d="M3 12h18" />
      <Path d="M12 3a13.5 13.5 0 014 9 13.5 13.5 0 01-4 9 13.5 13.5 0 01-4-9 13.5 13.5 0 014-9z" />
    </Svg>
  );
}

function ThemeIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 17a5 5 0 100-10 5 5 0 000 10z" />
      <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </Svg>
  );
}

function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Svg>
  );
}

function ClockIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <Path d="M12 7v5l3 2" />
    </Svg>
  );
}

function UsersIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 7a3 3 0 100-6 3 3 0 000 6z" />
      <Path d="M2 20c0-3 3.1-5.5 7-5.5s7 2.5 7 5.5" />
      <Path d="M17 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
      <Path d="M17 19c0-2 1.8-4 4-4s4 2 4 4" />
    </Svg>
  );
}

function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <Path d="M10 11v6M14 11v6" />
    </Svg>
  );
}

function LogoutIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <Path d="M16 17l5-5-5-5" />
      <Path d="M21 12H9" />
    </Svg>
  );
}

/* ════════════════ MAIN ════════════════ */

export default function ProfileScreen({ onBack, onLogout, onLangChange, onManageUsers, onAvatarChange, refreshKey }: Props) {
  const { colors, theme, setTheme, allThemes } = useTheme();
  const [toast, setToast] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [email, setEmail] = useState('');
  const [signature, setSignature] = useState('');
  const [signatureEditing, setSignatureEditing] = useState(false);
  const [signatureDraft, setSignatureDraft] = useState('');
  const [daysSince, setDaysSince] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreviewedCount, setUnreviewedCount] = useState(0);

  // Auth prefs
  const [enforceSingleSession, setEnforceSingleSession] = useState(0);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState(1);
  const authPrefsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals
  const [showPwModal, setShowPwModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAdminBlockModal, setShowAdminBlockModal] = useState(false);

  // Password form
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Email form (two steps)
  const [emailStep, setEmailStep] = useState<'input' | 'verify'>('input');
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Delete account
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState('');
  // Sticky header on scroll (matches web)
  const [scrollY, setScrollY] = useState(0);
  const headerOpacity = scrollY > 220 ? Math.min(1, (scrollY - 220) / 40) : 0;

  const username = useMemo(() => {
    try { return getCurrentUser(); } catch { return ''; }
  }, []);

  const st = useMemo(() => getStyles(colors), [colors]);
  const mo = useMemo(() => getMo(colors), [colors]);

  // ── Loaders ──
  const loadAvatar = async () => {
    try {
      const uid = getCurrentUserId();
      if (!uid) return;
      const b64 = await api.getUserAvatar(uid);
      if (b64) setAvatarUrl(b64);
    } catch {}
  };

  const loadCover = async () => {
    try {
      const data: any = await api.getProfileCover();
      if (data?.url) {
        const resolved = resolveAssetUrl(data.url) || data.url;
        setCoverUrl(resolved + '?v=' + Date.now());
      }
    } catch {}
  };

  const loadUserInfo = async () => {
    try {
      const data: any = await api.admin.getMe();
      if (data?.email) setEmail(data.email);
      if (data?.signature) setSignature(data.signature);
      if (data?.created_at) {
        const days = Math.floor((Date.now() - new Date(data.created_at).getTime()) / 86400000);
        setDaysSince(Math.max(1, days));
      }
      if (typeof data?.enforce_single_session === 'number') {
        setEnforceSingleSession(data.enforce_single_session);
      }
      if (typeof data?.session_timeout_hours === 'number' && [1, 2, 6, 24].includes(data.session_timeout_hours)) {
        setSessionTimeoutHours(data.session_timeout_hours);
      }
    } catch {}
  };

  const checkAdmin = async (): Promise<boolean> => {
    try {
      const data: any = await api.admin.check();
      const ok = data?.is_admin === true;
      setIsAdmin(ok);
      return ok;
    } catch { setIsAdmin(false); return false; }
  };

  const fetchUnreviewedCount = async () => {
    try {
      const data: any = await api.admin.getUnreviewedCount();
      setUnreviewedCount(data?.count ?? 0);
    } catch {}
  };

  useEffect(() => {
    loadAvatar();
    loadCover();
    loadUserInfo();
    checkAdmin().then(ok => { if (ok) fetchUnreviewedCount(); });
  }, []);

  useEffect(() => {
    if (isAdmin) fetchUnreviewedCount();
  }, [refreshKey]);

  // ── Auth prefs (debounced save) ──
  const persistAuthPrefs = (next: { enforce_single_session?: number; session_timeout_hours?: number }) => {
    if (authPrefsTimer.current) clearTimeout(authPrefsTimer.current);
    authPrefsTimer.current = setTimeout(async () => {
      try { await api.updateAuthPrefs(next); } catch {}
    }, 400);
  };

  const toggleEnforceSingleSession = (v: boolean) => {
    const nv = v ? 1 : 0;
    setEnforceSingleSession(nv);
    persistAuthPrefs({ enforce_single_session: nv });
  };

  const pickTimeout = (h: number) => {
    setSessionTimeoutHours(h);
    persistAuthPrefs({ session_timeout_hours: h });
  };

  // ── Avatar / Cover handlers (skip crop — upload directly via pickImages) ──
  const handleAvatarPress = async () => {
    if (uploadingAvatar) return;
    try {
      const imgs = await pickImages({ multiple: false }).catch(() => []);
      if (imgs.length === 0) return;
      const file = imgs[0];
      setUploadingAvatar(true);
      const form = new FormData();
      form.append('file', { uri: file.uri, type: file.type || 'image/jpeg', name: file.name || 'avatar.jpg' } as any);
      const r: any = await api.uploadAvatar(form);
      if (r?.ok !== false) {
        await loadAvatar();
        setToast('头像已更新');
        onAvatarChange?.();
      }
    } catch (err: any) {
      setToast(err?.message || t('uploadFailedShort'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverPress = async () => {
    if (uploadingCover) return;
    try {
      const imgs = await pickImages({ multiple: false }).catch(() => []);
      if (imgs.length === 0) return;
      const file = imgs[0];
      setUploadingCover(true);
      const r: any = await api.uploadProfileCover({
        uri: file.uri, type: file.type || 'image/jpeg', name: file.name || 'cover.jpg',
      });
      if (r?.url) {
        const resolved = resolveAssetUrl(r.url) || r.url;
        setCoverUrl(resolved + '?v=' + Date.now());
        setToast('封面已更新');
      }
    } catch (err: any) {
      setToast(err?.message || t('uploadFailedShort'));
    } finally {
      setUploadingCover(false);
    }
  };

  // ── Signature ──
  const startEditingSignature = () => {
    setSignatureDraft(signature);
    setSignatureEditing(true);
  };

  const saveSignature = async () => {
    const draft = signatureDraft.trim();
    setSignatureEditing(false);
    if (draft === signature) return;
    setSignature(draft);
    try {
      await api.saveSignature(draft);
      setToast('签名已保存');
    } catch (err: any) {
      setToast(err?.message || t('toastSubmitFailed'));
    }
  };

  // ── Change password ──
  const handleChangePw = async () => {
    if (pwLoading) return;
    setPwMsg('');
    if (!oldPw || !newPw || !confirmPw) { setPwMsg('请填写完整'); return; }
    if (newPw.length < 6) { setPwMsg('新密码至少 6 位'); return; }
    if (newPw !== confirmPw) { setPwMsg('两次输入不一致'); return; }
    setPwLoading(true);
    try {
      const r: any = await api.changePassword(oldPw, newPw);
      if (r?.status === 'ok' || r?.message) {
        setToast(r?.message || '密码已修改');
        setShowPwModal(false);
        setOldPw(''); setNewPw(''); setConfirmPw('');
      } else {
        setPwMsg(r?.message || t('toastSubmitFailed'));
      }
    } catch (err: any) {
      setPwMsg(err?.message || t('toastSubmitFailed'));
    } finally {
      setPwLoading(false);
    }
  };

  // ── Change email ──
  const handleSendCode = async () => {
    if (emailLoading) return;
    setEmailMsg('');
    if (!newEmail || !/^[^@]+@[^@]+\.[^@]+$/.test(newEmail)) { setEmailMsg('邮箱格式不正确'); return; }
    setEmailLoading(true);
    try {
      const r: any = await api.sendEmailCode(newEmail);
      if (r?.status === 'ok') {
        setEmailStep('verify');
        setToast(r?.message || t('codeSent'));
      } else {
        setEmailMsg(r?.message || t('toastSubmitFailed'));
      }
    } catch (err: any) {
      setEmailMsg(err?.message || t('toastSubmitFailed'));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (emailLoading) return;
    setEmailMsg('');
    if (!emailCode) { setEmailMsg('请输入验证码'); return; }
    setEmailLoading(true);
    try {
      const r: any = await api.verifyEmailCode(newEmail, emailCode);
      if (r?.status === 'ok') {
        setEmail(newEmail);
        setToast(r?.message || '邮箱已更新');
        setShowEmailModal(false);
        setEmailStep('input');
        setNewEmail(''); setEmailCode('');
      } else {
        setEmailMsg(r?.message || t('toastSubmitFailed'));
      }
    } catch (err: any) {
      setEmailMsg(err?.message || t('toastSubmitFailed'));
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Delete account ──
  const handleDeleteAccount = async () => {
    if (deleteLoading) return;
    setDeleteLoading(true);
    try {
      const rawUid = getCurrentUserId();
      if (!rawUid) { setToast('无法获取用户信息'); setDeleteLoading(false); setShowDeleteModal(false); return; }
      const data: any = await api.deleteAccount(Number(rawUid));
      setShowDeleteModal(false);
      setDeleteConfirmUsername('');
      setToast(data?.message || '账户已进入冷静期');
    } catch (err: any) {
      setToast(err?.message || '操作失败，请稍后重试');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Theme helpers ──
  const getThemeName = (id: string) => {
    const lang = getLang();
    const th = allThemes.find(x => x.id === id);
    if (!th) return '';
    if (lang.startsWith('en')) return (th as any).nameEn || th.nameZh;
    if (lang === 'zh-Hant' || lang === 'zh-TW') return (th as any).nameTw || th.nameZh;
    return th.nameZh;
  };

  return (
    <View style={st.root}>
      {/* Sticky header — appears when cover scrolls out of view */}
      {headerOpacity > 0 && (
        <View style={[st.stickyHeader, { opacity: headerOpacity }]} pointerEvents={headerOpacity > 0.5 ? 'auto' : 'none'}>
          <TouchableOpacity onPress={onBack} style={st.stickyBackBtn} activeOpacity={0.7}>
            <BackArrow color={colors.textMain} />
          </TouchableOpacity>
          <Text style={st.stickyTitle}>{t('editProfile')}</Text>
        </View>
      )}
      <ScrollView style={st.scroll} showsVerticalScrollIndicator={false}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}>
        {/* ── Cover ── */}
        <TouchableOpacity style={st.coverWrap} onPress={handleCoverPress} activeOpacity={0.9} disabled={uploadingCover}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={st.coverImg} />
          ) : (
            <View style={st.coverGradient}>
              <Svg width="100%" height="100%" viewBox="0 0 360 260" preserveAspectRatio="none">
                <Defs>
                  <SVGGradient id="coverGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={colors.primary} stopOpacity={1} />
                    <Stop offset="0.5" stopColor={(colors as any).accent || colors.primary} stopOpacity={0.7} />
                    <Stop offset="1" stopColor={colors.primary} stopOpacity={0.35} />
                  </SVGGradient>
                </Defs>
                <Rect width="360" height="260" fill="url(#coverGrad)" />
              </Svg>
            </View>
          )}

          {/* Top shadow gradient for nav readability */}
          <View style={st.coverScrim}>
            <Svg width="100%" height="100%" viewBox="0 0 360 100" preserveAspectRatio="none">
              <Defs>
                <SVGGradient id="scrimGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#000" stopOpacity={0.45} />
                  <Stop offset="1" stopColor="#000" stopOpacity={0} />
                </SVGGradient>
              </Defs>
              <Rect width="360" height="100" fill="url(#scrimGrad)" />
            </Svg>
          </View>

          {/* Floating nav */}
          <View style={st.coverNav}>
            <TouchableOpacity onPress={onBack} style={st.coverBackBtn} activeOpacity={0.7}>
              <BackArrow color="#fff" />
            </TouchableOpacity>
            <Text style={st.coverTitle}>{t('editProfile')}</Text>
          </View>
          <View style={st.coverOverlay}>
            <CameraIcon color="#fff" size={14} strokeWidth={2} />
            <Text style={st.coverOverlayText}>{uploadingCover ? '...' : t('editCover') || '更换封面'}</Text>
          </View>

          {/* Avatar — overlaps cover bottom */}
          <TouchableOpacity onPress={handleAvatarPress} style={st.avatarFloat} activeOpacity={0.8} disabled={uploadingAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={st.avatar} />
            ) : (
              <Image source={{ uri: resolveAssetUrl('/img/logo.jpg') || '/img/logo.jpg' }} style={st.avatar} />
            )}
            <View style={st.camBadge}>
              <CameraIcon color="#fff" size={11} strokeWidth={2} />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* ── Profile head ── */}
        <View style={st.profileHead}>
          <Text style={st.profileName}>{username}</Text>
          <Text style={st.profileEmail}>{email || '—'}</Text>

          {/* Signature */}
          {signatureEditing ? (
            <View style={st.signatureEditRow}>
              <TextInput
                style={st.signatureInput}
                value={signatureDraft}
                onChangeText={setSignatureDraft}
                placeholder={t('signaturePlaceholder')}
                placeholderTextColor={colors.textSub}
                maxLength={200}
                autoFocus
                onBlur={saveSignature}
                onSubmitEditing={saveSignature}
              />
            </View>
          ) : (
            <TouchableOpacity onPress={startEditingSignature}>
              <Text style={st.signatureText}>
                {signature || t('signaturePlaceholder')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Section: Account ── */}
        <Section title={t('accountInfo')} colors={colors} styles={st}>
          <CardRow colors={colors} styles={st} icon={<UserIcon color="#6499ff" />} label={t('displayName')} value={username} />
          <Divider colors={colors} />
          <CardRow colors={colors} styles={st} icon={<MailIcon color="#64c896" />} label={t('profileEmail')} value={email || '—'} />
        </Section>

        {/* ── Section: Security ── */}
        <Section title={t('securitySettings')} colors={colors} styles={st}>
          <TouchableOpacity onPress={() => { setShowPwModal(true); setOldPw(''); setNewPw(''); setConfirmPw(''); setPwMsg(''); }} activeOpacity={0.7}>
            <CardRow colors={colors} styles={st} icon={<LockIcon color={colors.primary} />} label={t('changePassword')} right={<ChevronRight color={colors.textSub} />} />
          </TouchableOpacity>
          <Divider colors={colors} />
          <TouchableOpacity onPress={() => { setShowEmailModal(true); setEmailStep('input'); setNewEmail(''); setEmailCode(''); setEmailMsg(''); }} activeOpacity={0.7}>
            <CardRow colors={colors} styles={st} icon={<MailIcon color="#64c896" />} label={t('changeEmail')} right={<ChevronRight color={colors.textSub} />} />
          </TouchableOpacity>
        </Section>

        {/* ── Section: Preferences ── */}
        <Section title={t('preferences')} colors={colors} styles={st}>
          {/* Language */}
          <View style={st.iconRow}>
            <View style={[st.iconWrap, { backgroundColor: 'rgba(180,130,220,0.12)' }]}>
              <LangIcon color="#c096d8" />
            </View>
            <Text style={st.iconLabel}>{t('language')}</Text>
            <View style={{ flexDirection: 'row' }}>
              {(['zh-CN', 'zh-TW', 'en'] as const).map(l => (
                <TouchableOpacity key={l} onPress={() => { setLang(l); onLangChange?.(); }}>
                  <Text style={[st.langBtn, getLang() === l && st.langBtnActive]}>
                    {l === 'zh-CN' ? '简' : l === 'zh-TW' ? '繁' : 'EN'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Divider colors={colors} />
          {/* Theme */}
          <TouchableOpacity onPress={() => setShowThemeModal(true)} activeOpacity={0.7}>
            <View style={st.iconRow}>
              <View style={[st.iconWrap, { backgroundColor: 'rgba(255,180,80,0.12)' }]}>
                <ThemeIcon color="#ffb450" />
              </View>
              <Text style={st.iconLabel}>{t('themeLabel')}</Text>
              <Text style={st.badge}>{getThemeName(theme.id)}</Text>
              <ChevronRight color={colors.textSub} />
            </View>
          </TouchableOpacity>
        </Section>

        {/* ── Section: Sign-in Security ── */}
        <Section title={t('authSettingsTitle')} colors={colors} styles={st}>
          {/* SSO toggle */}
          <View style={st.authRow}>
            <View style={st.authHeaderRow}>
              <View style={[st.iconWrap, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
                <ShieldIcon color={colors.primary} />
              </View>
              <Text style={st.authLabel}>{t('ssoLabel')}</Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Switch
                  value={enforceSingleSession === 1}
                  onValueChange={toggleEnforceSingleSession}
                  trackColor={{ false: withAlpha(colors.textMain, 0.18), true: colors.primary }}
                  thumbColor="#fff"
                  style={{ transform: [{ scale: 0.75 }] }}
                />
              </View>
            </View>
            <Text style={st.authDesc}>{t('ssoDesc')}</Text>
          </View>
          <Divider colors={colors} />
          {/* Session timeout */}
          <View style={st.authRow}>
            <View style={st.authHeaderRow}>
              <View style={[st.iconWrap, { backgroundColor: 'rgba(255,180,80,0.12)' }]}>
                <ClockIcon color="#ffb450" />
              </View>
              <Text style={st.authLabel}>{t('sessionTimeoutLabel')}</Text>
            </View>
            <View style={st.capsuleRow}>
              {[1, 2, 6, 24].map(h => {
                const active = sessionTimeoutHours === h;
                return (
                  <TouchableOpacity
                    key={h}
                    activeOpacity={0.7}
                    style={[st.capsule, active && st.capsuleActive]}
                    onPress={() => pickTimeout(h)}
                  >
                    <Text style={[st.capsuleText, active && st.capsuleTextActive]}>{h}h</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={st.authDesc}>{t('sessionTimeoutDesc')}</Text>
          </View>
          {/* User management (admin only) */}
          {isAdmin ? (
            <>
              <Divider colors={colors} />
              <TouchableOpacity onPress={() => onManageUsers?.()} activeOpacity={0.7}>
                <View style={st.iconRow}>
                  <View style={[st.iconWrap, { backgroundColor: 'rgba(91,155,213,0.12)' }]}>
                    <UsersIcon color="#5B9BD5" />
                  </View>
                  <Text style={st.iconLabel}>{t('userManagement')}</Text>
                  {unreviewedCount > 0 ? (
                    <View style={st.unreviewedBadge}>
                      <Text style={st.unreviewedBadgeText}>
                        {unreviewedCount > 99 ? '99+' : String(unreviewedCount)}
                      </Text>
                    </View>
                  ) : null}
                  <ChevronRight color={colors.textSub} />
                </View>
              </TouchableOpacity>
            </>
          ) : null}
        </Section>

        {/* ── Section: Danger ── */}
        <Section title={t('dangerZone')} colors={colors} styles={st}>
          <TouchableOpacity onPress={() => {
            if (isAdmin) setShowAdminBlockModal(true);
            else { setDeleteConfirmUsername(''); setShowDeleteModal(true); }
          }} activeOpacity={0.7}>
            <View style={st.iconRow}>
              <View style={[st.iconWrap, { backgroundColor: 'rgba(192,57,43,0.1)' }]}>
                <TrashIcon color="#e06464" />
              </View>
              <Text style={[st.iconLabel, { color: '#e06464' }]}>{t('deleteAccount')}</Text>
              <ChevronRight color="#e06464" />
            </View>
          </TouchableOpacity>
          <Divider colors={colors} />
          <TouchableOpacity onPress={() => setShowLogoutModal(true)} activeOpacity={0.7}>
            <View style={st.iconRow}>
              <View style={[st.iconWrap, { backgroundColor: 'rgba(192,57,43,0.1)' }]}>
                <LogoutIcon color="#e06464" />
              </View>
              <Text style={[st.iconLabel, { color: '#e06464' }]}>{t('logout')}</Text>
              <ChevronRight color="#e06464" />
            </View>
          </TouchableOpacity>
        </Section>

        {/* ── Bottom stamp ── */}
        {daysSince > 0 ? (
          <View style={st.stamp}>
            <Text style={st.stampPre}>
              {theme.id === 'obsidian-gold' ? t('stampPrefixObsidian') : theme.id === 'deep-teal' ? t('stampPrefixTeal') : t('stampPrefixBurgundy')}
              <Text style={[st.stampNum, { color: colors.primary }]}> {daysSince} </Text>
              {theme.id === 'obsidian-gold' ? t('stampSuffixObsidian') : theme.id === 'deep-teal' ? t('stampSuffixTeal') : t('stampSuffixBurgundy')}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />

      {/* ══════ Logout modal ══════ */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={mo.backdrop}>
          <View style={mo.card}>
            <View style={mo.header}>
              <Text style={mo.title}>{t('logout')}</Text>
              <TouchableOpacity onPress={() => setShowLogoutModal(false)}>
                <Text style={mo.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={mo.body}>
              <Text style={{ color: colors.textMain, fontSize: 15, lineHeight: 22, textAlign: 'center' }}>
                {t('logoutConfirm')}
              </Text>
              <View style={mo.btnRow}>
                <TouchableOpacity style={mo.cancelBtn} onPress={() => setShowLogoutModal(false)}>
                  <Text style={mo.cancelText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={mo.confirmBtn} onPress={() => { setShowLogoutModal(false); onLogout(); }}>
                  <Text style={mo.confirmText}>{t('confirm')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════ Admin block modal ══════ */}
      <Modal visible={showAdminBlockModal} transparent animationType="fade" onRequestClose={() => setShowAdminBlockModal(false)}>
        <View style={mo.backdrop}>
          <View style={mo.card}>
            <View style={mo.header}>
              <Text style={mo.title}>{t('deleteAccount')}</Text>
              <TouchableOpacity onPress={() => setShowAdminBlockModal(false)}>
                <Text style={mo.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={mo.body}>
              <Text style={{ color: colors.textMain, fontSize: 15, lineHeight: 22, marginBottom: 16 }}>
                {t('adminCannotDelete')}
              </Text>
              <TouchableOpacity style={mo.confirmBtn} onPress={() => setShowAdminBlockModal(false)}>
                <Text style={mo.confirmText}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════ Delete account modal ══════ */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={mo.backdrop}>
          <View style={mo.card}>
            <View style={mo.header}>
              <Text style={mo.title}>{t('deleteAccountConfirmTitle')}</Text>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                <Text style={mo.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={mo.body}>
              <Text style={{ color: colors.textMain, fontSize: 14, lineHeight: 22, marginBottom: 8 }}>
                {t('deleteAccountGraceNote')}
              </Text>
              <TextInput
                style={mo.input}
                placeholder={t('enterUsernameToConfirm')}
                placeholderTextColor={colors.textSub}
                value={deleteConfirmUsername}
                onChangeText={setDeleteConfirmUsername}
              />
              <View style={mo.btnRow}>
                <TouchableOpacity style={mo.cancelBtn} onPress={() => { setShowDeleteModal(false); setDeleteConfirmUsername(''); }}>
                  <Text style={mo.cancelText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[mo.confirmBtn, (deleteLoading || deleteConfirmUsername !== username) && { opacity: 0.4 }]}
                  onPress={handleDeleteAccount}
                  disabled={deleteLoading || deleteConfirmUsername !== username}
                >
                  <Text style={mo.confirmText}>{deleteLoading ? '...' : t('deleteAccountBtn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════ Change password modal ══════ */}
      <Modal visible={showPwModal} transparent animationType="fade" onRequestClose={() => setShowPwModal(false)}>
        <View style={mo.backdrop}>
          <View style={mo.card}>
            <View style={mo.header}>
              <Text style={mo.title}>{t('changePassword')}</Text>
              <TouchableOpacity onPress={() => setShowPwModal(false)}>
                <Text style={mo.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={mo.body}>
              <TextInput style={mo.input} placeholder={t('oldPassword')} placeholderTextColor={colors.textSub} secureTextEntry value={oldPw} onChangeText={setOldPw} autoFocus />
              <TextInput style={mo.input} placeholder={t('newPassword')} placeholderTextColor={colors.textSub} secureTextEntry value={newPw} onChangeText={setNewPw} />
              <Text style={mo.pwHint}>{t('pwHint')}</Text>
              <TextInput style={mo.input} placeholder={t('confirmNewPassword')} placeholderTextColor={colors.textSub} secureTextEntry value={confirmPw} onChangeText={setConfirmPw} />
              {pwMsg ? <Text style={mo.err}>{pwMsg}</Text> : null}
              <View style={mo.btnRow}>
                <TouchableOpacity style={mo.cancelBtn} onPress={() => setShowPwModal(false)}>
                  <Text style={mo.cancelText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[mo.confirmBtn, (pwLoading || !oldPw || !newPw || !confirmPw) && { opacity: 0.4 }]}
                  onPress={handleChangePw}
                  disabled={pwLoading || !oldPw || !newPw || !confirmPw}
                >
                  <Text style={mo.confirmText}>{pwLoading ? '...' : t('confirm')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════ Change email modal ══════ */}
      <Modal visible={showEmailModal} transparent animationType="fade" onRequestClose={() => setShowEmailModal(false)}>
        <View style={mo.backdrop}>
          <View style={mo.card}>
            <View style={mo.header}>
              <Text style={mo.title}>{t('changeEmail')}</Text>
              <TouchableOpacity onPress={() => setShowEmailModal(false)}>
                <Text style={mo.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={mo.body}>
              {emailStep === 'input' ? (
                <>
                  <TextInput
                    style={mo.input}
                    placeholder={t('newEmail')}
                    placeholderTextColor={colors.textSub}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    autoFocus
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {emailMsg ? <Text style={mo.err}>{emailMsg}</Text> : null}
                  <View style={mo.btnRow}>
                    <TouchableOpacity style={mo.cancelBtn} onPress={() => setShowEmailModal(false)}>
                      <Text style={mo.cancelText}>{t('cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[mo.confirmBtn, (emailLoading || !newEmail) && { opacity: 0.4 }]}
                      onPress={handleSendCode}
                      disabled={emailLoading || !newEmail}
                    >
                      <Text style={mo.confirmText}>{emailLoading ? '...' : t('sendCode')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: FONTS.sub.size, color: colors.textSub, textAlign: 'center' }}>
                    {t('codeSent')}：{newEmail}
                  </Text>
                  <TextInput
                    style={[mo.input, { textAlign: 'center', letterSpacing: 8, fontSize: 24, fontWeight: '700' }]}
                    placeholder={t('enterCode')}
                    placeholderTextColor={colors.textSub}
                    value={emailCode}
                    onChangeText={setEmailCode}
                    autoFocus
                    maxLength={6}
                    keyboardType="number-pad"
                  />
                  {emailMsg ? <Text style={mo.err}>{emailMsg}</Text> : null}
                  <View style={mo.btnRow}>
                    <TouchableOpacity style={mo.cancelBtn} onPress={() => setEmailStep('input')}>
                      <Text style={mo.cancelText}>{t('back')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[mo.confirmBtn, (emailLoading || !emailCode) && { opacity: 0.4 }]}
                      onPress={handleVerifyEmail}
                      disabled={emailLoading || !emailCode}
                    >
                      <Text style={mo.confirmText}>{emailLoading ? '...' : t('confirm')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════ Theme picker — shared component ══════ */}
      <ThemePickerModal
        visible={showThemeModal}
        onClose={() => setShowThemeModal(false)}
      />
    </View>
  );
}

/* ════════════════ HELPER COMPONENTS ════════════════ */

function Section({ title, children, colors, styles }: any) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitleText}>{title}</Text>
        <View style={styles.sectionTitleLine} />
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function CardRow({ icon, label, value, right, colors, styles }: any) {
  return (
    <View style={styles.iconRow}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.iconLabel}>{label}</Text>
      {value ? <Text style={styles.iconValue}>{value}</Text> : null}
      {right || null}
    </View>
  );
}

function Divider({ colors }: any) {
  return <View style={{ height: 0.5, backgroundColor: withAlpha(colors.textMain, 0.08) }} />;
}

/* ════════════════ STYLES ════════════════ */

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  // Sticky header (matches web: appears when cover scrolls out of view)
  stickyHeader: {
    position: 'absolute' as any, top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: colors.surface,
  },
  stickyBackBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  stickyTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textMain, marginLeft: 10 },
  // Cover
  coverWrap: { height: 220, position: 'relative', overflow: 'visible' as any },
  coverImg: { width: '100%', height: '100%' } as any,
  coverGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  coverScrim: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 100,
  },
  coverNav: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12,
  },
  coverBackBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  coverTitle: {
    fontSize: 15, fontWeight: '600', color: '#fff',
  },
  coverOverlay: {
    position: 'absolute', bottom: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6,
  },
  coverOverlayText: { fontSize: 12, fontWeight: '500', color: '#fff' },
  // Avatar
  avatarFloat: {
    position: 'absolute' as any, right: 20, bottom: -40, zIndex: 10,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: colors.surface,
  },
  camBadge: {
    position: 'absolute', bottom: 0, right: -2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.surface,
  },
  // Profile head
  profileHead: { paddingHorizontal: 20, paddingTop: 44, paddingBottom: 12 },
  profileName: { fontSize: 26, fontWeight: '700', color: colors.textMain, letterSpacing: -0.2 },
  profileEmail: { fontSize: 12, color: colors.textSub, marginTop: 4 },
  signatureText: { fontSize: 12, color: colors.textSub, marginTop: 6, fontStyle: 'italic' },
  signatureEditRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8,
  },
  signatureInput: {
    flex: 1, fontSize: 13, color: colors.textMain,
    paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: withAlpha(colors.textMain, 0.2),
  },
  // Cards & sections
  card: {
    marginTop: 4, backgroundColor: colors.surface,
    borderRadius: 12, paddingVertical: 2,
  },
  section: { paddingHorizontal: 20, marginTop: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  sectionTitleText: { fontSize: 10, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: colors.textSub },
  sectionTitleLine: { flex: 1, height: 1, backgroundColor: withAlpha(colors.textMain, 0.08) },
  // Icon rows
  iconRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 0, gap: 10,
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: withAlpha(colors.textMain, 0.04),
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  iconLabel: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.textMain, flex: 1 },
  iconValue: { fontSize: FONTS.body.size, fontWeight: '500', color: colors.textMain },
  badge: {
    fontSize: 13, fontWeight: '500',
    color: colors.textSub,
    backgroundColor: withAlpha(colors.textMain, 0.05),
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  langBtn: { fontSize: 13, fontWeight: FONTS.micro.weight, color: colors.textSub, paddingHorizontal: 8 },
  langBtnActive: { color: colors.primary, fontWeight: FONTS.microBold.weight },
  // Auth rows
  authRow: {
    flexDirection: 'column', paddingVertical: 14, paddingHorizontal: 0, gap: 10,
  },
  authHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  authLabel: {
    fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.textMain, flex: 1,
  },
  authDesc: {
    fontSize: 12, color: colors.textSub, lineHeight: 16, marginLeft: 42,
  },
  capsuleRow: {
    flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 2, flexWrap: 'wrap', marginLeft: 42,
  },
  capsule: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14,
    borderWidth: 1, borderColor: withAlpha(colors.textMain, 0.15),
    backgroundColor: 'transparent',
  },
  capsuleActive: {
    borderColor: colors.primary,
    backgroundColor: withAlpha(colors.primary, 0.08),
  },
  capsuleText: { fontSize: 13, color: colors.textSub, fontWeight: '500' },
  capsuleTextActive: { color: colors.primary, fontWeight: '600' },
  unreviewedBadge: {
    backgroundColor: colors.danger, borderRadius: 10,
    minWidth: 20, height: 20, paddingHorizontal: 6,
    justifyContent: 'center', alignItems: 'center', marginLeft: 4,
  },
  unreviewedBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  // Theme picker rows
  themeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 10,
  },
  themeRowActive: {
    backgroundColor: withAlpha(colors.primary, 0.08),
  },
  themeSwatches: { flexDirection: 'row', width: 36, alignItems: 'center' },
  swatchDot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 1, borderColor: withAlpha(colors.textMain, 0.1),
  },
  themeRowText: { fontSize: FONTS.sub.size, color: colors.textMain, flex: 1 },
  themeRowTextActive: { color: colors.primary, fontWeight: '600' },
  // Stamp
  stamp: {
    alignItems: 'center' as any,
    paddingVertical: 32, paddingBottom: 48,
    paddingHorizontal: 24,
  },
  stampPre: { fontSize: 13, color: colors.textSub, letterSpacing: 0.5, lineHeight: 48, textAlign: 'center' },
  stampNum: { fontSize: 42, fontWeight: '700' },
});

const getMo = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: withAlpha(colors.textMain, 0.4),
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    width: 340, maxWidth: '90%', overflow: 'hidden' as any,
    ...modalCardAnimation,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: colors.surface },
  close: { ...modalClose },
  body: { padding: 20, gap: 12 },
  input: {
    paddingHorizontal: 10, paddingVertical: 9, borderRadius: 8,
    fontSize: FONTS.sub.size, color: colors.textMain,
    backgroundColor: withAlpha(colors.textMain, 0.03),
  },
  pwHint: { fontSize: FONTS.micro.size, color: colors.textSub, lineHeight: 18 },
  err: { fontSize: FONTS.micro.size, color: colors.danger },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, backgroundColor: colors.bg, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  cancelText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.textSub },
  confirmBtn: {
    flex: 1, backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  confirmText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.surface },
});