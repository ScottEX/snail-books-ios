import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, Switch, Modal, ActivityIndicator, useWindowDimensions, Animated,
} from 'react-native';
import AppTextInput from '../components/AppTextInput';
import Svg, { Path, Defs, LinearGradient as SVGGradient, Stop, Rect } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { t, getLang, langs, useLang } from '../i18n';
import { api, resolveAssetUrl } from '../api/client';
import * as FileSystem from 'expo-file-system';
import { useTheme, withAlpha, ThemeColors, DEFAULT_THEME_ID } from '../theme';
import { FONTS } from '../theme';
import Toast from '../components/Toast';
import BackArrow from '../components/icons/BackArrow';
import CameraIcon from '../components/icons/CameraIcon';
import ThemePickerModal from '../components/ThemePickerModal';
import BgCropModal from '../components/BgCropModal';
import CropModal from '../components/CropModal';
import CloseButton from '../components/CloseButton';
import ButtonPair from '../components/ButtonPair';
import SubmitButton from '../components/SubmitButton';
import ModalOverlay from '../components/ModalOverlay';
import { getCurrentUser, getCurrentUserId } from '../utils/storage';
import { pickImages } from '../utils/imagePicker';
import { modalClose, MODAL_CARD_RADIUS } from '../sharedStyles';
import { useSwipeBack } from '../hooks/useSwipeBack';
import { isBiometricAvailable, hasStoredCredential, clearCredential, saveCredential, promptBiometric, getCredential } from '../utils/biometric';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import ReAnimated, { useAnimatedStyle } from 'react-native-reanimated';

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

function FaceIDIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 8V6a2 2 0 012-2h2" />
      <Path d="M16 4h2a2 2 0 012 2v2" />
      <Path d="M4 16v2a2 2 0 002 2h2" />
      <Path d="M16 20h2a2 2 0 002-2v-2" />
      <Path d="M9 10h.01" />
      <Path d="M15 10h.01" />
      <Path d="M9 15c.83.67 2 1 3 1s2.17-.33 3-1" />
    </Svg>
  );
}

/* ════════════ MAIN ════════════ */

export default function ProfileScreen({ onBack, onLogout, onLangChange, onManageUsers, onAvatarChange, refreshKey }: Props) {
  const { colors, theme, setTheme, allThemes } = useTheme();
  const { setLang } = useLang();
  const [toast, setToast] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    try {
      const uid = getCurrentUserId();
      const key = uid ? `bg-opacity-${uid}` : 'bg-opacity';
      const s = localStorage.getItem(key);
      return s !== null ? parseFloat(s) : 0.5;
    } catch { return 0.5; }
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [email, setEmail] = useState('');
  const [signature, setSignature] = useState('');
  const [signatureEditing, setSignatureEditing] = useState(false);
  const [signatureDraft, setSignatureDraft] = useState('');
  const [daysSince, setDaysSince] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [unreviewedCount, setUnreviewedCount] = useState(0);

  // Auth prefs
  const [enforceSingleSession, setEnforceSingleSession] = useState(1);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState(1);
  const authPrefsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Face ID
  const [faceAvailable, setFaceAvailable] = useState(false);
  const [hasFaceID, setHasFaceID] = useState(false);
  const [faceIDLoading, setFaceIDLoading] = useState(false);
  const [showFaceIDSetup, setShowFaceIDSetup] = useState(false);
  const [faceIDPassword, setFaceIDPassword] = useState('');
  const [faceIDError, setFaceIDError] = useState('');

  // Modals
  const [showPwModal, setShowPwModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showCoverCrop, setShowCoverCrop] = useState(false);
  const [coverCropSrc, setCoverCropSrc] = useState('');
  const [showAvatarCrop, setShowAvatarCrop] = useState(false);
  const [avatarCropSrc, setAvatarCropSrc] = useState('');
  const [avatarCropResult, setAvatarCropResult] = useState('');
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [coverCropResult, setCoverCropResult] = useState('');
  const [showCoverPreview, setShowCoverPreview] = useState(false);
  const [showBgCrop, setShowBgCrop] = useState(false);
  const [bgCropSrc, setBgCropSrc] = useState('');
  const [bgCropResult, setBgCropResult] = useState('');
  const [showBgPreview, setShowBgPreview] = useState(false);
  // ── Recrop intent refs (set before closing preview, checked in onClosed) ──
  const avatarRecropRef = useRef(false);
  const coverRecropRef = useRef(false);
  const bgRecropRef = useRef(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showAdminBlockModal, setShowAdminBlockModal] = useState(false);
  const [showPartnerBlockModal, setShowPartnerBlockModal] = useState(false);

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
  // ═══════════════════════════════════════════════════════════════
  // Native-driver scroll animation — transforms on UI thread, zero JS cost
  // ═══════════════════════════════════════════════════════════════
  const FREEZE_POINT = 92;
  const scrollYAnim = useRef(new Animated.Value(0)).current;
  // Cover slides up 0→-FREEZE_POINT, clamped
  const coverTranslateY = scrollYAnim.interpolate({
    inputRange: [0, FREEZE_POINT],
    outputRange: [0, -FREEZE_POINT],
    extrapolate: 'clamp',
  });
  // Pull-down stretch: sqrt-damped translateY (approximated piecewise)
  const pullDownTY = scrollYAnim.interpolate({
    inputRange: [-400, -200, -100, -50, -20, 0],
    outputRange: [89.4, 63.2, 44.7, 31.6, 20, 0],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });
  // Pull-down stretch: sqrt-damped scaleY
  const pullDownScale = scrollYAnim.interpolate({
    inputRange: [-400, -200, -100, -50, -20, 0],
    outputRange: [1.813, 1.575, 1.406, 1.287, 1.182, 1],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });
  // ═══════════════════════════════════════════════════════════════
  // Blur intensity — still needs JS state (expo-blur doesn't support Animated)
  // Updated via Animated.event listener, throttled via RAF
  // ═══════════════════════════════════════════════════════════════
  const [blurIntensity, setBlurInt] = useState(0);
  const blurRaf = useRef<number | null>(null);
  const blurPending = useRef(0);
  // Memoize Animated.event handler — scrollYAnim ref is stable
  const scrollAnimatedHandler = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollYAnim } } }])
  ).current;
  const computeBlur = (y: number) =>
    y > 0 ? Math.min(y / 2, 10) : 0;

  // ── Cover image fade-in ──
    const coverFade = useRef(new Animated.Value(0)).current;
    const coverLoaded = useRef(false);
    useEffect(() => {
      coverLoaded.current = false;
      coverFade.setValue(0);
    }, [coverUrl]);

    // Modal keyboard push
  const { height: screenH, width: screenW } = useWindowDimensions();
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const modalCap = -screenH * 0.1;
  const modalCapEmail = -screenH * 0.05;
  const modalPushStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(keyboardHeight.value, modalCap) }],
  }));
  const modalPushStyleEmail = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(keyboardHeight.value, modalCapEmail) }],
  }));

  const username = useMemo(() => {
    try { return getCurrentUser(); } catch { return ''; }
  }, []);

  const st = useMemo(() => getStyles(colors), [colors]);
  const mo = useMemo(() => getMo(colors), [colors]);
  const swipeBack = useSwipeBack(onBack);

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
        const sep = resolved.includes('?') ? '&' : '?';
        setCoverUrl(resolved + sep + 'v=' + Date.now());
      }
    } catch {}
    // Load bgOpacity from server (shared with HomeScreen)
    try {
      const bg: any = await api.getBackground();
      if (bg?.opacity !== null && bg?.opacity !== undefined) {
        setBgOpacity(bg.opacity);
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
      if (data.partner_name) {
        setIsPartner(true);
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

  // Face ID
  const loadFaceIDStatus = async () => {
    try {
      const { available } = await isBiometricAvailable();
      setFaceAvailable(available);
      if (available) {
        const stored = await hasStoredCredential();
        setHasFaceID(stored);
      }
    } catch {}
  };

  const toggleFaceID = async (v: boolean) => {
    if (faceIDLoading) return;
    if (v) {
      // Show password input to enable Face ID
      setFaceIDPassword('');
      setFaceIDError('');
      setShowFaceIDSetup(true);
    } else {
      setFaceIDLoading(true);
      try {
        await clearCredential();
        setHasFaceID(false);
        setToast(t('faceIDDisabled') || '面容登录已关闭');
      } catch {
        setToast(t('toastSubmitFailed'));
      }
      setFaceIDLoading(false);
    }
  };

  const enrollFaceID = async () => {
    if (!faceIDPassword) {
      setToast(t('errEmptyFields'));
      return;
    }
    setFaceIDLoading(true);
    try {
      const username = getCurrentUser() || '';
      const { success, error } = await promptBiometric(t('faceIDEnrollPrompt') || '启用面容登录');
      if (!success) {
        if (error !== 'cancelled') setToast(t('toastSubmitFailed'));
        setFaceIDLoading(false);
        return;
      }
      const { ok, error: saveErr } = await saveCredential(username, faceIDPassword);
      if (ok) {
        // Verify immediately
        const verify = await getCredential();
        if (!verify) {
          setToast('Keychain 写入失败，请重试');
          setFaceIDLoading(false);
          return;
        }
        setHasFaceID(true);
        setShowFaceIDSetup(false);
        setFaceIDPassword('');
      } else {
        setToast(saveErr || t('toastSubmitFailed'));
      }
    } catch {
      setToast(t('toastSubmitFailed'));
    }
    setFaceIDLoading(false);
  };

  useEffect(() => {
    loadAvatar();
    loadCover();
    loadUserInfo();
    loadFaceIDStatus();
    checkAdmin().then(ok => { if (ok) fetchUnreviewedCount(); });
  }, []);

  useEffect(() => {
    if (isAdmin) fetchUnreviewedCount();
  }, [refreshKey]);

  // ── Watch for cross-screen theme reset ──
  useEffect(() => {
    let lastTs = 0;
    const timer = setInterval(() => {
      try {
        const ts = localStorage.getItem('__theme_reset_ts');
        if (ts) {
          const t = parseInt(ts, 10);
          if (t !== lastTs && (Date.now() - t < 30000)) {
            lastTs = t;
            setBgOpacity(0);
            try {
              const uid = getCurrentUserId();
              localStorage.setItem(uid ? `bg-opacity-${uid}` : 'bg-opacity', '0');
            } catch {}
          }
        }
      } catch {}
    }, 2000);
    return () => clearInterval(timer);
  }, []);

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

  // ── Avatar / Cover handlers ──
  const handleAvatarPress = async () => {
    if (uploadingAvatar) return;
    try {
      const imgs = await pickImages({ multiple: false }).catch(() => []);
      if (imgs.length === 0) return;
      setAvatarCropSrc(imgs[0].uri);
      setShowAvatarCrop(true);
    } catch {}
  };

  const handleAvatarCropConfirm = (dataUri: string) => {
    setAvatarCropResult(dataUri);
    setShowAvatarCrop(false);
    setShowAvatarPreview(true);
  };

  const handleAvatarUpload = async () => {
    if (!avatarCropResult) return;
    setUploadingAvatar(true);
    try {
      const tempFile = FileSystem.cacheDirectory + 'avatar-crop.jpg';
      await FileSystem.writeAsStringAsync(tempFile, avatarCropResult.split(',')[1], {
        encoding: FileSystem.EncodingType.Base64,
      });
      const form = new FormData();
      form.append('file', { uri: tempFile, type: 'image/jpeg', name: 'avatar.jpg' } as any);
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
      setShowAvatarPreview(false);
    }
  };

  const handleCoverPress = async () => {
    if (uploadingCover) return;
    try {
      const imgs = await pickImages({ multiple: false }).catch(() => []);
      if (imgs.length === 0) return;
      setCoverCropSrc(imgs[0].uri);
      setShowCoverCrop(true);
    } catch {}
  };

  // ── bgOpacity (shared via localStorage + API, same as HomeScreen) ──
  const handleBgOpacityChange = (v: number) => {
    setBgOpacity(v);
    try {
      const uid = getCurrentUserId();
      localStorage.setItem(uid ? `bg-opacity-${uid}` : 'bg-opacity', String(v));
    } catch {}
    api.saveBackgroundSettings({ opacity: v }).catch(() => {});
  };

  const handleCoverCropConfirm = (dataUri: string) => {
    setCoverCropResult(dataUri);
    setShowCoverCrop(false);
    setShowCoverPreview(true);
  };

  const handleCoverUpload = async () => {
    if (!coverCropResult) return;
    setUploadingCover(true);
    try {
      const tempFile = FileSystem.cacheDirectory + 'cover-crop.jpg';
      await FileSystem.writeAsStringAsync(tempFile, coverCropResult.split(',')[1], {
        encoding: FileSystem.EncodingType.Base64,
      });
      const r: any = await api.uploadProfileCover({ uri: tempFile, type: 'image/jpeg', name: 'cover.jpg' });
      if (r?.url) {
        const resolved = resolveAssetUrl(r.url) || r.url;
        const sep = resolved.includes('?') ? '&' : '?';
        setCoverUrl(resolved + sep + 'v=' + Date.now());
        setToast('封面已更新');
      }
    } catch (err: any) {
      setToast(err?.message || t('uploadFailedShort'));
    } finally {
      setUploadingCover(false);
      setShowCoverPreview(false);
    }
  };

  // ── Background image: crop → preview → upload (mirrors cover pattern) ──
  const handleBgCropStart = async (file: any) => {
    setShowThemeModal(false);
    setBgCropSrc(file?.uri || file);
    setShowBgCrop(true);
  };

  const handleBgCropConfirm = (dataUri: string) => {
    setBgCropResult(dataUri);
    setShowBgCrop(false);
    setShowBgPreview(true);
  };

  const handleBgUpload = async () => {
    if (!bgCropResult) return;
    setUploadingCover(true);
    try {
      const tempFile = FileSystem.cacheDirectory + 'bg-crop.jpg';
      await FileSystem.writeAsStringAsync(tempFile, bgCropResult.split(',')[1], {
        encoding: FileSystem.EncodingType.Base64,
      });
      const r: any = await api.uploadBackground({ uri: tempFile, type: 'image/jpeg', name: 'bg.jpg' });
      if (r?.url) {
        const resolved = resolveAssetUrl(r.url) || r.url;
        try {
          const cachePath = FileSystem.cacheDirectory + 'bg-profile-' + Date.now() + '.jpg';
          const dl = await FileSystem.downloadAsync(resolved, cachePath);
          if (dl.status === 200) {
            localStorage.setItem('bg-image', dl.uri);
          } else {
            localStorage.setItem('bg-image', resolved);
          }
        } catch {
          try { localStorage.setItem('bg-image', resolved); } catch {}
        }
        try { localStorage.setItem('__bg_changed_ts', String(Date.now())); } catch {}
        if (typeof window !== 'undefined' && typeof (window as any).dispatchEvent === 'function') {
          (window as any).dispatchEvent(new CustomEvent('bg-changed', { detail: { url: resolved } }));
        }
        setToast(t('bgUpdated') || '背景已更新');
      } else {
        setToast(t('toastSubmitFailed'));
      }
    } catch {
      setToast(t('toastSubmitFailed'));
    } finally {
      setUploadingCover(false);
      setShowBgPreview(false);
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
      setToast(t('signatureSaved'));
    } catch (err: any) {
      setToast(err?.message || t('toastSubmitFailed'));
    }
  };

  // ── Validation helpers ──
  const [SPECIAL_RE] = useState(() => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/);
  const isPwValid = (pw: string) => pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw) && SPECIAL_RE.test(pw);
  const isEmailValid = (em: string) => /^[^@]+@[^@]+\.[^@]+$/.test(em);

  // ── Change password ──
  const handleChangePw = async () => {
    if (pwLoading) return;
    setPwMsg('');
    if (!oldPw || !newPw || !confirmPw) { setPwMsg(t('errEmptyFields')); return; }
    if (newPw.length < 6) { setPwMsg(t('errPwTooShort')); return; }
    if (newPw !== confirmPw) { setPwMsg(t('errPwMismatch')); return; }
    setPwLoading(true);
    try {
      const r: any = await api.changePassword(oldPw, newPw);
      if (r?.status === 'ok' || r?.message) {
        setToast(r?.message || t('passwordChanged'));
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
    if (!newEmail || !/^[^@]+@[^@]+\.[^@]+$/.test(newEmail)) { setEmailMsg(t('errEmailInvalid')); return; }
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
    if (!emailCode) { setEmailMsg(t('errEnterCode')); return; }
    setEmailLoading(true);
    try {
      const r: any = await api.verifyEmailCode(newEmail, emailCode);
      if (r?.status === 'ok') {
        setEmail(newEmail);
        setToast(r?.message || t('emailUpdated'));
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
      if (!rawUid) { setToast(t('errUserInfoUnavailable')); setDeleteLoading(false); setShowDeleteModal(false); return; }
      const data: any = await api.deleteAccount(Number(rawUid));
      setShowDeleteModal(false);
      setDeleteConfirmUsername('');
      setToast(data?.message || t('accountCooldown'));
    } catch (err: any) {
      setToast(err?.message || t('toastSubmitFailed'));
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
    <View style={st.root} {...swipeBack}>
      {/* Nav bar — always visible, fixed at top */}
      <View
        style={[
          st.navBar,
          { backgroundColor: 'transparent' },
        ]}
        pointerEvents="auto">
        <TouchableOpacity onPress={onBack} style={st.navBackBtn} activeOpacity={0.7}>
          <BackArrow color="#fff" />
        </TouchableOpacity>
        <Text style={[st.navTitle, { color: '#fff' }]}>{t('editProfile')}</Text>
      </View>
      {/* ── Cover — absolutely positioned, slides up 92px then freezes ── */}
      <Animated.View
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
          transform: [{ translateY: coverTranslateY }],
        }}
      >
        <TouchableOpacity
        style={st.coverWrap}
        onPress={handleCoverPress} activeOpacity={0.9} disabled={uploadingCover}>
        {/* Gradient — always rendered as base; cover image fades in on top */}
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

        {/* Cover image — fades in on top of gradient, 300ms crossfade */}
        {coverUrl ? (
          <Animated.Image
            key={coverUrl}
            source={{ uri: coverUrl }}
            onLoad={() => {
              if (coverLoaded.current) return;
              coverLoaded.current = true;
              Animated.timing(coverFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
            }}
            blurRadius={blurIntensity}
            style={[
              st.coverImg,
              {
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                opacity: coverFade,
                // Pull-down stretch: native driver, no JS cost
                transform: [{ translateY: pullDownTY }, { scaleY: pullDownScale }],
              },
            ]}
          />
        ) : null}

        {/* Pull-down blur overlay */}
        {blurIntensity > 0 && (
          <Animated.View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            transform: [{ translateY: pullDownTY }, { scaleY: pullDownScale }],
          }}>
            <BlurView
              intensity={blurIntensity}
              tint="dark"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          </Animated.View>
        )}

        {/* "更换封面" button */}
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
        </TouchableOpacity>
      </TouchableOpacity>
      </Animated.View>
      <ScrollView style={st.scroll} showsVerticalScrollIndicator={false}
        bounces={true} alwaysBounceVertical={true}
        onScroll={(e: any) => {
          scrollAnimatedHandler(e);
          blurPending.current = e.nativeEvent.contentOffset.y;
          if (blurRaf.current === null) {
            blurRaf.current = requestAnimationFrame(() => {
              blurRaf.current = null;
              setBlurInt(computeBlur(blurPending.current));
            });
          }
        }}
        onScrollEndDrag={(e: any) => setBlurInt(computeBlur(e.nativeEvent.contentOffset.y))}
        onMomentumScrollEnd={(e: any) => setBlurInt(computeBlur(e.nativeEvent.contentOffset.y))}
        scrollEventThrottle={16}>
        {/* Spacer — keeps content below the absolutely-positioned cover */}
        <View style={{ height: 260 }} />

        {/* ── Profile head ── */}
        <View style={st.profileHead}>
          <Text style={st.profileName}>{username}</Text>

          {/* Signature */}
          {signatureEditing ? (
            <View style={st.signatureEditRow}>
              <AppTextInput
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
              {(['zh-CN', 'zh-TW', 'en'] as const).map(l => {
                const active = getLang() === l;
                return (
                <TouchableOpacity key={l} onPress={() => setLang(l)}>
                  <View style={[st.langCapsule, active && st.langCapsuleActive]}>
                    <Text style={[st.langBtn, active && st.langBtnActive]}>
                      {l === 'zh-CN' ? '简' : l === 'zh-TW' ? '繁' : 'EN'}
                    </Text>
                  </View>
                </TouchableOpacity>
                );
              })}
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
              <View style={st.badge}><Text style={st.badgeText}>{getThemeName(theme.id)}</Text></View>
              <ChevronRight color={colors.textSub} />
            </View>
          </TouchableOpacity>
        </Section>

        {/* ── Section: Sign-in Security ── */}
        <Section title={t('authSettingsTitle')} colors={colors} styles={st}>
          {/* Face ID row */}
          {faceAvailable && (
            <View style={st.authRow}>
              <View style={st.authHeaderRow}>
                <View style={[st.iconWrap, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
                  <FaceIDIcon color={colors.primary} />
                </View>
                <Text style={st.authLabel}>{t('faceIDLabel') || '面容登录'}</Text>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Switch
                    value={hasFaceID}
                    onValueChange={toggleFaceID}
                    trackColor={{ false: withAlpha(colors.textMain, 0.18), true: colors.primary }}
                    thumbColor="#fff"
                    disabled={faceIDLoading}
                    style={{ transform: [{ scale: 0.75 }] }}
                  />
                </View>
              </View>
              <Text style={st.authDesc}>{t('faceIDDesc') || '使用面容快速登录'}</Text>
            </View>
          )}
          {faceAvailable && <Divider colors={colors} />}
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
            if (isAdmin) { setShowAdminBlockModal(true); }
            else if (isPartner) { setShowPartnerBlockModal(true); }
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
      <ModalOverlay visible={showLogoutModal} onClose={() => setShowLogoutModal(false)}>
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
                <TouchableOpacity
                  style={mo.confirmBtn}
                  disabled={loggingOut}
                  onPress={async () => {
                    setLoggingOut(true);
                    await api.logout();
                    onLogout();
                  }}
                >
                  {loggingOut ? (
                    <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
                  ) : (
                    <Text style={mo.confirmText}>{t('confirmLogout')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
      </ModalOverlay>

      {/* ══════ Admin block modal ══════ */}
      <ModalOverlay visible={showAdminBlockModal} onClose={() => setShowAdminBlockModal(false)}>
          <View style={mo.card}>
            <View style={mo.header}>
              <Text style={mo.title}>{t('deleteAccount')}</Text>
              <TouchableOpacity onPress={() => setShowAdminBlockModal(false)}>
                <Text style={mo.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={mo.body}>
            <View style={mo.warnBox}>
                <Text style={mo.warnMsg}>{t('adminCannotDelete')}</Text>
              </View>
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                onPress={() => setShowAdminBlockModal(false)}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
      </ModalOverlay>

      {/* ══════ Partner block modal ══════ */}
      <ModalOverlay visible={showPartnerBlockModal} onClose={() => setShowPartnerBlockModal(false)}>
          <View style={mo.card}>
            <View style={mo.header}>
              <Text style={mo.title}>{t('deleteAccount')}</Text>
              <TouchableOpacity onPress={() => setShowPartnerBlockModal(false)}>
                <Text style={mo.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={mo.body}>
              <View style={mo.warnBox}>
                <Text style={mo.warnMsg}>{t('err_partner_cannot_delete')}</Text>
              </View>
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                onPress={() => setShowPartnerBlockModal(false)}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
      </ModalOverlay>

      {/* ══════ Delete account modal ══════ */}
      <ModalOverlay visible={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
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
              <AppTextInput
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
      </ModalOverlay>

      {/* ══════ Change password modal ══════ */}
      <ModalOverlay visible={showPwModal} onClose={() => setShowPwModal(false)} animation="springScale">
        <ReAnimated.View style={modalPushStyle}>
          <View style={mo.card}>
            <View style={mo.header}>
              <Text style={mo.title}>{t('changePassword')}</Text>
              <CloseButton onPress={() => setShowPwModal(false)} />
            </View>
            <View style={mo.body}>
              <AppTextInput style={mo.input} placeholder={t('oldPassword')} placeholderTextColor={colors.textSub} secureTextEntry value={oldPw} onChangeText={setOldPw} />
              <AppTextInput style={mo.input} placeholder={t('newPassword')} placeholderTextColor={colors.textSub} secureTextEntry value={newPw} onChangeText={setNewPw} />
              <Text style={mo.pwHint}>{t('pwHint')}</Text>
              <AppTextInput style={mo.input} placeholder={t('confirmNewPassword')} placeholderTextColor={colors.textSub} secureTextEntry value={confirmPw} onChangeText={setConfirmPw} />
              {pwMsg ? <Text style={mo.err}>{pwMsg}</Text> : null}
              <ButtonPair
                leftLabel={t('cancel')}
                leftOnPress={() => setShowPwModal(false)}
                rightLabel={t('confirm')}
                rightOnPress={handleChangePw}
                rightDisabled={!oldPw || !newPw || !confirmPw || !isPwValid(newPw)}
                rightLoading={pwLoading}
              />
            </View>
          </View>
        </ReAnimated.View>
      </ModalOverlay>

      {/* ══════ Change email modal ══════ */}
      <ModalOverlay visible={showEmailModal} onClose={() => setShowEmailModal(false)} animation="springScale">
        <ReAnimated.View style={modalPushStyleEmail}>
          <View style={mo.card}>
            <View style={mo.header}>
              <Text style={mo.title}>{t('changeEmail')}</Text>
              <CloseButton onPress={() => setShowEmailModal(false)} />
            </View>
            <View style={mo.body}>
              {emailStep === 'input' ? (
                <>
                  <AppTextInput
                    style={mo.input}
                    placeholder={t('newEmail')}
                    placeholderTextColor={colors.textSub}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {emailMsg ? <Text style={mo.err}>{emailMsg}</Text> : null}
                  <ButtonPair
                    leftLabel={t('cancel')}
                    leftOnPress={() => setShowEmailModal(false)}
                    rightLabel={t('sendCode')}
                    rightOnPress={handleSendCode}
                    rightDisabled={!newEmail || !isEmailValid(newEmail)}
                    rightLoading={emailLoading}
                  />
                </>
              ) : (
                <>
                  <Text style={{ fontSize: FONTS.sub.size, color: colors.textSub, textAlign: 'center' }}>
                    {t('codeSent')}：{newEmail}
                  </Text>
                  <AppTextInput
                    style={[mo.input, { textAlign: 'center', letterSpacing: 8, fontSize: 24, fontWeight: '700' }]}
                    placeholder={t('enterCode')}
                    placeholderTextColor={colors.textSub}
                    value={emailCode}
                    onChangeText={setEmailCode}
                    maxLength={6}
                    keyboardType="number-pad"
                  />
                  {emailMsg ? <Text style={mo.err}>{emailMsg}</Text> : null}
                  <ButtonPair
                    leftLabel={t('back')}
                    leftOnPress={() => setEmailStep('input')}
                    rightLabel={t('confirm')}
                    rightOnPress={handleVerifyEmail}
                    rightDisabled={!emailCode}
                    rightLoading={emailLoading}
                  />
                </>
              )}
            </View>
          </View>
        </ReAnimated.View>
      </ModalOverlay>

      {/* ══════ Theme picker — shared component ══════ */}
      <ThemePickerModal
        visible={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        showCoverTools
        coverOpacity={bgOpacity}
        onCoverOpacityChange={handleBgOpacityChange}
        onCoverImagePicked={handleBgCropStart}
        onResetCover={() => setShowThemeModal(false)}
        coverUploading={uploadingCover}
      />
      {/* Cover crop modal */}
      <BgCropModal
        visible={showCoverCrop}
        src={coverCropSrc}
        mode="cover"
        onCancel={() => { setShowCoverCrop(false); setCoverCropSrc(''); }}
        onConfirm={handleCoverCropConfirm}
      />
      {/* BG crop modal */}
      <BgCropModal
        visible={showBgCrop}
        src={bgCropSrc}
        mode="bg"
        onCancel={() => { setShowBgCrop(false); setBgCropSrc(''); setShowThemeModal(true); }}
        onConfirm={handleBgCropConfirm}
      />
      {/* Avatar crop modal */}
      <CropModal
        visible={showAvatarCrop}
        src={avatarCropSrc}
        onCancel={() => { setShowAvatarCrop(false); setAvatarCropSrc(''); }}
        onConfirm={handleAvatarCropConfirm}
      />
      {/* Avatar preview modal — springScale, matches ThemePickerModal */}
      <ModalOverlay visible={showAvatarPreview && avatarCropResult !== ''} onClose={() => { avatarRecropRef.current = false; setShowAvatarPreview(false); }} onClosed={() => { if (avatarRecropRef.current) { avatarRecropRef.current = false; setShowAvatarCrop(true); setAvatarCropResult(''); } else { setAvatarCropSrc(''); setAvatarCropResult(''); } }} animation="springScale" backdropColor="rgba(8,8,12,0.92)">
        <View style={{ backgroundColor: 'rgba(28,28,32,0.95)', borderRadius: MODAL_CARD_RADIUS, padding: 24, width: Math.min(screenW * 0.85, 320), alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' as any }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(27,122,74,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20, color: '#1B7A4A' }}>✓</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t('avatarUpdated')}</Text>
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-end' }}>
              {[80, 48, 32].map(size => (
                <View key={size} style={{ alignItems: 'center', gap: 6 }}>
                  <Image source={{ uri: avatarCropResult }} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
                  <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>{size}px</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{t('avatarSizeHint')}</Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' }}
                onPress={() => { avatarRecropRef.current = true; setShowAvatarPreview(false); }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>{t('recrop')}</Text>
              </TouchableOpacity>
              <SubmitButton
                onPress={handleAvatarUpload}
                loading={uploadingAvatar}
                label={t('confirmUse')}
                style={{ flex: 2, padding: 12, borderRadius: 10, backgroundColor: '#5B5BD6', alignItems: 'center' }}
                textStyle={{ fontSize: 13, fontWeight: '600', color: '#fff' }}
              />
            </View>
          </View>
      </ModalOverlay>
      {/* Cover preview modal — springScale, matches ThemePickerModal */}
      <ModalOverlay visible={showCoverPreview && coverCropResult !== ''} onClose={() => { coverRecropRef.current = false; setShowCoverPreview(false); }} onClosed={() => { if (coverRecropRef.current) { coverRecropRef.current = false; setShowCoverCrop(true); setCoverCropResult(''); } else { setCoverCropSrc(''); setCoverCropResult(''); } }} animation="springScale" backdropColor="rgba(8,8,12,0.92)">
        <View style={{ backgroundColor: 'rgba(28,28,32,0.95)', borderRadius: MODAL_CARD_RADIUS, padding: 24, width: Math.min(screenW * 0.85, 360), alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' as any }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(27,122,74,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20, color: '#1B7A4A' }}>✓</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t('coverUpdated')}</Text>
            <Image source={{ uri: coverCropResult }} style={{ width: Math.min(screenW * 0.7, 300), height: Math.round(Math.min(screenW * 0.7, 300) * (260 / screenW)), borderRadius: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' }} resizeMode="cover" />
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{t('coverHint')}</Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' }}
                onPress={() => { coverRecropRef.current = true; setShowCoverPreview(false); }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>{t('recrop')}</Text>
              </TouchableOpacity>
              <SubmitButton
                onPress={handleCoverUpload}
                loading={uploadingCover}
                label={t('confirmUse')}
                style={{ flex: 2, padding: 12, borderRadius: 10, backgroundColor: '#5B5BD6', alignItems: 'center' }}
                textStyle={{ fontSize: 13, fontWeight: '600', color: '#fff' }}
              />
            </View>
          </View>
      </ModalOverlay>
      {/* BG preview modal — springScale, matches ThemePickerModal */}
      <ModalOverlay visible={showBgPreview && bgCropResult !== ''} onClose={() => { bgRecropRef.current = false; setShowBgPreview(false); }} onClosed={() => { if (bgRecropRef.current) { bgRecropRef.current = false; setShowBgCrop(true); setBgCropResult(''); } else { setBgCropSrc(''); setBgCropResult(''); } }} animation="springScale" backdropColor="rgba(8,8,12,0.92)">
        <View style={{ backgroundColor: 'rgba(28,28,32,0.95)', borderRadius: MODAL_CARD_RADIUS, padding: 24, width: 360, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' as any }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(27,122,74,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20, color: '#1B7A4A' }}>✓</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{t('bgUpdated') || '背景已更新'}</Text>
            <Image source={{ uri: bgCropResult }} style={{ width: 130, height: 280, borderRadius: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' }} resizeMode="cover" />
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{t('bgResultHint') || '点击确认后将从照片中直接选取'}</Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' }}
                onPress={() => { bgRecropRef.current = true; setShowBgPreview(false); }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>{t('recrop') || '再编辑'}</Text>
              </TouchableOpacity>
              <SubmitButton
                onPress={handleBgUpload}
                loading={uploadingCover}
                label={t('confirmUse') || '确认使用'}
                style={{ flex: 2, padding: 12, borderRadius: 10, backgroundColor: '#5B5BD6', alignItems: 'center' }}
                textStyle={{ fontSize: 13, fontWeight: '600', color: '#fff' }}
              />
            </View>
          </View>
      </ModalOverlay>
      {/* Face ID setup modal */}
      <ModalOverlay visible={showFaceIDSetup} onClose={() => { setShowFaceIDSetup(false); setFaceIDPassword(''); setFaceIDError(''); }}>
          <View style={mo.card}>
            <View style={mo.header}>
              <Text style={mo.title}>{t('faceIDLabel') || '面容登录'}</Text>
              <TouchableOpacity onPress={() => { setShowFaceIDSetup(false); setFaceIDPassword(''); setFaceIDError(''); }}>
                <Text style={mo.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={mo.body}>
              <Text style={{ color: colors.textMain, fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 8 }}>
                请输入密码以启用面容登录
              </Text>
              <AppTextInput
                style={mo.input}
                placeholder={t('password')}
                placeholderTextColor={colors.textSub}
                secureTextEntry
                value={faceIDPassword}
                onChangeText={(t) => { setFaceIDPassword(t); setFaceIDError(''); }}
                autoFocus
              />
              {faceIDError ? <Text style={mo.err}>{faceIDError}</Text> : null}
              <View style={mo.btnRow}>
                <TouchableOpacity style={mo.cancelBtn} onPress={() => { setShowFaceIDSetup(false); setFaceIDPassword(''); setFaceIDError(''); }}>
                  <Text style={mo.cancelText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[mo.confirmBtn, (faceIDLoading || !faceIDPassword) && { opacity: 0.4 }]}
                  onPress={enrollFaceID}
                  disabled={faceIDLoading || !faceIDPassword}
                >
                  <Text style={mo.confirmText}>{faceIDLoading ? '...' : t('confirm')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
      </ModalOverlay>
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
  // Nav bar — always visible at top, transitions from transparent dark to solid surface
  navBar: {
    position: 'absolute' as any, top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 54, paddingHorizontal: 16, paddingBottom: 12,
  },
  navBackBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  navTitle: { flex: 1, fontSize: FONTS.sub.size, fontWeight: '600', marginLeft: 12 },
  // Cover
  coverWrap: { height: 260, position: 'relative', overflow: 'visible' as any },
  coverImg: { width: '100%', height: '100%' } as any,
  coverGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
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
  },
  // Profile head
  profileHead: { paddingHorizontal: 20, paddingTop: 44, paddingBottom: 12 },
  profileName: { fontSize: FONTS.h1.size, fontWeight: FONTS.h1.weight, color: colors.textMain, letterSpacing: -0.2 },
  profileEmail: { fontSize: 12, color: colors.textSub, marginTop: 4 },
  signatureText: { fontSize: FONTS.micro.size, color: colors.textSub, marginTop: 6, transform: [{ skewX: '-8deg' }] },
  signatureEditRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8,
  },
  signatureInput: {
    flex: 1, fontSize: 13, color: colors.textMain,
    paddingVertical: 4, borderWidth: 0,
  } as any,
  // Cards & sections
  card: {
    marginTop: 4, backgroundColor: colors.surface,
    borderRadius: 12, paddingVertical: 2,
  },
  section: { paddingHorizontal: 20, marginTop: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  sectionTitleText: { fontSize: 12, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: colors.textSub },
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
    backgroundColor: withAlpha(colors.textMain, 0.05),
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  badgeText: { fontSize: 13, fontWeight: '500', color: colors.textSub },
  langBtn: { fontSize: 13, fontWeight: FONTS.micro.weight, color: colors.textSub },
  langBtnActive: { color: colors.primary, fontWeight: FONTS.microBold.weight },
  langCapsule: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  langCapsuleActive: { backgroundColor: withAlpha(colors.textMain, 0.08) },
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
  stampNum: { fontSize: 42, fontWeight: '700', fontStyle: 'italic' as any },
});

const getMo = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: withAlpha(colors.textMain, 0.4),
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    width: 340, maxWidth: '90%', overflow: 'hidden' as any,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: colors.surface },
  close: { ...modalClose },
  body: { padding: 20, gap: 12 } as any,
  input: {
    paddingHorizontal: 10, paddingVertical: 9, borderRadius: 8,
    fontSize: FONTS.sub.size, color: colors.textMain,
    backgroundColor: withAlpha(colors.textMain, 0.03),
  },
  pwHint: { fontSize: FONTS.micro.size, color: colors.textSub, lineHeight: 18 },
  err: { fontSize: FONTS.micro.size, color: colors.danger },
  warnBox: {
    backgroundColor: withAlpha(colors.primary, 0.1), borderRadius: 12, padding: 12,
    marginBottom: 16,
  },
  warnMsg: {
    fontSize: FONTS.micro.size, color: colors.textSub, textAlign: 'center', lineHeight: 22,
  },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 0 },
  cancelBtn: {
    flex: 1, borderRadius: 10, borderWidth: 1,
    borderColor: (colors as any).secondary || '#e0e0e0',
    paddingVertical: 12, alignItems: 'center',
  },
  cancelText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.textSub },
  confirmBtn: {
    flex: 1, backgroundColor: colors.primary, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  confirmText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.surface },
});