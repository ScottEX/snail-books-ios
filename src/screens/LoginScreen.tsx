import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ImageBackground, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { t, getLang, langs, useLang } from '../i18n';
import { api } from '../api/client';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { BlurView } from 'expo-blur';
import SubmitButton from '../components/SubmitButton';
import { getWebAuthnBound, setWebAuthnBound, clearWebAuthn } from '../utils/storage';
import {
  isBiometricAvailable, promptBiometric, saveCredential, getCredential,
  hasStoredCredential, clearCredential,
} from '../utils/biometric';

const BG_IMAGE = require('../../assets/img/bg.jpg');
const LOGO_IMAGE = require('../../assets/img/logo.jpg');

type Step = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

function FaceIDIcon({ color = 'rgba(255,255,255,0.85)' }: { color?: string }) {
  return (
    <Svg width={56} height={56} viewBox="0 0 1024 1024" fill="none">
      <Path d="M997.052632 839.787789v-108.94821a24.629895 24.629895 0 0 0-49.25979 0v108.94821a108.112842 108.112842 0 0 1-108.005053 108.005053h-108.94821a24.629895 24.629895 0 0 0 0 49.25979h108.94821A157.453474 157.453474 0 0 0 997.052632 839.787789m-679.262316 132.634948a24.629895 24.629895 0 0 0-24.629895-24.629895H184.212211a108.112842 108.112842 0 0 1-108.005053-108.005053v-108.94821a24.629895 24.629895 0 0 0-49.25979 0v108.94821A157.453474 157.453474 0 0 0 184.212211 997.052632h108.94821c13.608421 0 24.629895-11.048421 24.629895-24.629895M76.207158 293.160421V184.212211a108.112842 108.112842 0 0 1 108.005053-108.005053h108.94821a24.629895 24.629895 0 0 0 0-49.25979H184.212211A157.453474 157.453474 0 0 0 26.947368 184.212211v108.94821a24.629895 24.629895 0 0 0 49.25979 0m920.845474 0V184.212211A157.453474 157.453474 0 0 0 839.787789 26.947368h-108.94821a24.629895 24.629895 0 0 0 0 49.25979h108.94821a108.112842 108.112842 0 0 1 108.005053 108.005053v108.94821a24.629895 24.629895 0 0 0 49.25979 0M681.984 743.962947a25.6 25.6 0 0 0-34.708211-37.591579A198.790737 198.790737 0 0 1 512 759.269053a198.790737 198.790737 0 0 1-135.275789-52.897685 25.6 25.6 0 0 0-34.708211 37.591579A249.802105 249.802105 0 0 0 512 810.415158a249.802105 249.802105 0 0 0 169.984-66.452211m-118.837895-169.445052v-181.894737a25.6 25.6 0 1 0-51.146105 0v181.894737c0 7.841684-6.386526 14.228211-14.201263 14.22821h-20.857263a25.6 25.6 0 1 0 0 51.146106h20.857263a65.455158 65.455158 0 0 0 65.347368-65.374316m176.23579-110.349474v-72.946526a24.144842 24.144842 0 0 0-48.316632 0v72.946526a24.144842 24.144842 0 0 0 48.316632 0m-424.906106 24.144842a24.144842 24.144842 0 0 1-24.171789-24.144842v-72.946526a24.144842 24.144842 0 0 1 48.316632 0v72.946526a24.144842 24.144842 0 0 1-24.144843 24.144842" fill={color} />
    </Svg>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_RE = /[!@#$%^&*(),.?":{}|<>]/;

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [step, setStep] = useState<Step>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  // Per-user avatar/background. Mirrors the web LoginScreen so typing
  // a known username instantly swaps the logo and the full-screen bg.
  // bgUrl/avatarUrl are data URIs (RN has no Blob/Object URL).
  const [bgUrl, setBgUrl] = useState<string>(() => {
    try { return localStorage.getItem('bg-image') || ''; } catch { return ''; }
  });
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    try { return localStorage.getItem('avatar-uri') || ''; } catch { return ''; }
  });
  // Ready states control when custom bg/avatar fade in — mirrors web's
  // bgReady/avatarReady pattern so the transition is smooth (opacity
  // animation) rather than a jarring source swap.
  const [bgReady, setBgReady] = useState(() => {
    try { return !!localStorage.getItem('bg-image'); } catch { return false; }
  });
  const [avatarReady, setAvatarReady] = useState(() => {
    try { return !!localStorage.getItem('avatar-uri'); } catch { return false; }
  });
  const bgOpacity = useRef(new Animated.Value(bgUrl ? 1 : 0)).current;
  const avatarOpacity = useRef(new Animated.Value(
    (() => { try { return !!localStorage.getItem('avatar-uri'); } catch { return false; } })() ? 1 : 0
  )).current;
  // Use the LangProvider hook so the lang state and t() output stay
  // in sync within a single React render — using the legacy setLang
  // here updates globalThis.curLang synchronously but doesn't trigger
  // a React re-render, causing a brief "EN text but old active tab"
  // flicker between the two state updates.
  const { lang, setLang } = useLang();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [shake, setShake] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(() => {
    try { return localStorage.getItem('remember_me') === '1'; } catch { return false; }
  });
  const [devCode, setDevCode] = useState('');
  // WebAuthn/Face ID state. hasFaceID: this device has a stored
  // credential. pwdHasFaceID: the currently typed username has any
  // WebAuthn credential bound server-side (drives the "Face ID 登录"
  // link in the password form).
  const [hasFaceID, setHasFaceID] = useState(() => getWebAuthnBound().bound);
  const [pwdHasFaceID, setPwdHasFaceID] = useState(false);
  const [faceMode, setFaceMode] = useState(false);
  const [faceAvailable, setFaceAvailable] = useState(false);
  const [faceEnrolling, setFaceEnrolling] = useState(false);
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const codeRef = useRef<any>(null);
  const { colors } = useTheme();

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('saved_login');
      if (saved) setUsername(saved);
      if (localStorage.getItem('user')) onLogin();
    }
  }, []);

  // Persist remember_me across launches. Web does the same in
  // LoginScreen via localStorage; the API call already sends
  // `remember` so this just keeps the checkbox state sticky on the
  // device.
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    if (remember) localStorage.setItem('remember_me', '1');
    else localStorage.removeItem('remember_me');
  }, [remember]);

  // Animate custom background / avatar opacity when ready states change.
  // Mirrors web's CSS transition: opacity 0.5s ease, filter blur.
  useEffect(() => {
    Animated.timing(bgOpacity, { toValue: bgReady && bgUrl ? 1 : 0, duration: 500, useNativeDriver: true }).start();
  }, [bgReady, bgUrl]);
  useEffect(() => {
    Animated.timing(avatarOpacity, { toValue: avatarReady && avatarUrl ? 1 : 0, duration: 500, useNativeDriver: true }).start();
  }, [avatarReady, avatarUrl]);

  // WebAuthn bootstrap on mount. Mirrors web LoginScreen L117-165:
  // read the cached bound state synchronously, then refresh from
  // server in case the user has unbound since last visit. We don't
  // re-prompt biometric on mount — only the explicit Face ID button
  // or the post-login sync in handleLogin touches stored credentials.
  useEffect(() => {
    const cached = getWebAuthnBound();
    setHasFaceID(cached.bound);
    (async () => {
      try {
        const r = await api.webauthnStatus();
        if (r && typeof r.has_credential === 'boolean') {
          if (!r.has_credential && cached.bound) clearWebAuthn();
          setHasFaceID(!!r.has_credential);
        }
      } catch {}
    })();
    // Detect biometric hardware once on mount. Drives whether the
    // "Face ID 登录" link / button shows up at all on this device.
    (async () => {
      const a = await isBiometricAvailable();
      setFaceAvailable(a.available);
      // If we already have a stored credential AND the typed username
      // (from saved_login) matches, drop into face mode automatically
      // — mirrors web's "if (webauthn_bound && pwdHasFaceID)" behaviour.
      if (a.available && cached.bound) {
        const stored = await hasStoredCredential();
        if (stored) {
          try {
            const savedUser = localStorage.getItem('saved_login') || '';
            if (savedUser) setUsername(savedUser);
            setFaceMode(true);
          } catch {}
        }
      }
    })();
  }, []);

  // Breathing animation for the Face ID button. 1.0 → 1.06 → 1.0 on
  // a 2-second loop, matching web's `animation: breathe 2s infinite`.
  useEffect(() => {
    if (!faceMode) {
      breatheAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1.06, duration: 2000, useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [faceMode]);

  // Fetch avatar + background on username blur (not while typing).
  // Keeps the current avatar/bg visible until the user finishes typing,
  // then fetches and swaps or clears in one go.
  const userReqId = useRef(0);
  const handleUsernameBlur = () => {
    const id = username.trim();
    if (!id) return;
    const reqId = ++userReqId.current;
    (async () => {
      const [avatar, bg] = await Promise.all([
        api.getUserAvatarByLoginUri(id).catch(() => null),
        api.getUserBackgroundUri(id).catch(() => null),
      ]);
      if (reqId !== userReqId.current) return;
      if (avatar) {
        setAvatarUrl(avatar); setAvatarReady(true);
        try { localStorage.setItem('avatar-uri', avatar); } catch {}
      } else {
        setAvatarUrl(''); setAvatarReady(true);
      }
      if (bg) {
        setBgUrl(bg); setBgReady(true);
        try { localStorage.setItem('bg-image', bg); } catch {}
      } else {
        setBgUrl(''); setBgReady(true);
      }
    })();
  };

  // Debounced check whether the typed username has any WebAuthn
  // credential bound server-side. Mirrors web LoginScreen L237-255 —
  // the response drives the "Face ID 登录" link that appears next to
  // "Forgot password?" once the username matches a known Face-ID user.
  // 500ms debounce + race-safe reqId (mirrors avatar/bg above).
  const pwdReqId = useRef(0);
  useEffect(() => {
    const id = username.trim();
    if (!id) { setPwdHasFaceID(false); return; }
    const reqId = ++pwdReqId.current;
    const timer = setTimeout(async () => {
      try {
        const r = await api.webauthnCheck(id);
        if (reqId !== pwdReqId.current) return;
        setPwdHasFaceID(!!(r && (r.pwdHasFaceID || r.has_credential)));
      } catch {
        if (reqId === pwdReqId.current) setPwdHasFaceID(false);
      }
    }, 500);
    return () => { clearTimeout(timer); };
  }, [username]);

  const reset = () => { setMsg(''); setMsgOk(false); setDevCode(''); setCode(''); };
  const goLogin = () => {
    setMsg('');
    setStep('login');
  };

  const goRegister = () => {
    setMsg('');
    setStep('register');
  };

  const validatePassword = (pw: string): string => {
    if (pw.length < 8) return t('errPwRequirements') || 'Password: 8+ chars, letters, digits, and a special character';
    if (!/[A-Za-z]/.test(pw)) return t('errPwRequirements') || 'Password: 8+ chars, letters, digits, and a special character';
    if (!/[0-9]/.test(pw)) return t('errPwRequirements') || 'Password: 8+ chars, letters, digits, and a special character';
    if (!SPECIAL_RE.test(pw)) return t('errPwRequirements') || 'Password: 8+ chars, letters, digits, and a special character';
    return '';
  };

  const validateEmail = (em: string): string => {
    if (!EMAIL_RE.test(em)) return t('errEmailInvalid') || 'Invalid email';
    return '';
  };

  const triggerShake = () => {
    setShake(true);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => setShake(false));
  };

  const handleFaceIDLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // 1. Biometric availability + prompt
      const avail = await isBiometricAvailable();
      if (!avail.available) {
        setMsg(t('errFaceIDUnavailable') || 'Face ID 不可用，请使用密码登录');
        triggerShake();
        setLoading(false);
        return;
      }
      const bio = await promptBiometric(t('faceIDPrompt') || '使用 Face ID 登录柳味探秘');
      if (!bio.success) {
        // User cancelled or failed — silently drop back to password mode
        setFaceMode(false);
        setLoading(false);
        return;
      }
      // 2. Retrieve stored credential
      const cred = await getCredential();
      if (!cred) {
        setMsg(t('errFaceIDNoCredential') || '未找到 Face ID 凭证，请使用密码登录');
        setFaceMode(false);
        setLoading(false);
        return;
      }
      // 3. POST to /login so the server sets a fresh session cookie.
      // The stored password was Keychain-protected by biometric so we
      // can safely hand it back to the auth endpoint.
      const r = await api.login(cred.username, cred.password, true);
      if (r.status !== 'ok') {
        setMsg(r.message || t('errWrongCredentials'));
        triggerShake();
        setFaceMode(false);
        setLoading(false);
        return;
      }
      // 4. Same post-login bookkeeping as the password path
      if (r.token && typeof localStorage !== 'undefined') localStorage.setItem('token', r.token);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('user', r.username || cred.username);
        localStorage.setItem('user_id', String(r.user_id || ''));
        localStorage.setItem('saved_login', cred.username);
        localStorage.removeItem('active_tab');
        localStorage.removeItem('expense_active_tab');
      }
      try { await api.saveLang(getLang()); } catch {}
      // Refresh WebAuthn state to match server
      try {
        const s = await api.webauthnStatus();
        if (s && typeof s.has_credential === 'boolean') {
          if (!s.has_credential) clearWebAuthn();
          setHasFaceID(!!s.has_credential);
        }
      } catch {}
      setLoading(false);
      onLogin();
    } catch (e: any) {
      setLoading(false);
      setMsg(e?.message || t('errNetworkError') || 'Face ID 登录失败');
      setFaceMode(false);
    }
  };

  // Called after a successful password login to offer to enable
  // biometric unlock. We gate on the user's biometric being
  // available and on them not already having a stored credential
  // (so we don't re-prompt every login). The actual write is
  // triggered by enableFaceID() which requires a biometric prompt.
  const offerEnableFaceID = async () => {
    if (faceEnrolling) return;
    if (!faceAvailable) return;
    if (await hasStoredCredential()) return;
    // Soft prompt: ask the user via the existing msgBox. If they
    // accept, we run enableFaceID() which gates the keychain write
    // behind a biometric prompt. If they ignore / type more, the
    // offer expires silently on next state change.
    setMsg(t('offerEnableFaceID') || '是否启用 Face ID 以便下次快速登录？点击下方"启用"按钮确认');
    setMsgOk(true);
  };

  const enableFaceID = async () => {
    if (faceEnrolling || !faceAvailable) return;
    setFaceEnrolling(true);
    try {
      const bio = await promptBiometric(t('faceIDEnrollPrompt') || '启用 Face ID 登录');
      if (!bio.success) { setFaceEnrolling(false); return; }
      const r = await saveCredential(username, password);
      if (r.ok) {
        // Also mark the local WebAuthn bound flag so the Face ID
        // link shows up immediately on next launch.
        setWebAuthnBound(username, 'keychain');
        setHasFaceID(true);
        setMsg(t('faceIDEnabled') || 'Face ID 已启用');
        setMsgOk(true);
      } else {
        setMsg(t('errFaceIDEnableFailed') || 'Face ID 启用失败');
        setMsgOk(false);
        triggerShake();
      }
    } catch {
      setMsg(t('errFaceIDEnableFailed') || 'Face ID 启用失败');
      setMsgOk(false);
    } finally {
      setFaceEnrolling(false);
    }
  };

  const handleLogin = async () => {
    if (loading) return;
    if (!username || !password) { setMsg(t('errEmptyFields')); triggerShake(); return; }
    setLoading(true);
    try {
      const r = await api.login(username, password, remember);
      setLoading(false);
      if (r.status === 'ok') {
        if (r.token && typeof localStorage !== 'undefined') localStorage.setItem('token', r.token);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('user', r.username || username);
          localStorage.setItem('user_id', String(r.user_id || ''));
          localStorage.setItem('saved_login', username);
          localStorage.removeItem('active_tab');
          localStorage.removeItem('expense_active_tab');
        }
        try { await api.saveLang(getLang()); } catch {}
        // Post-login WebAuthn re-sync (mirrors web L312-325). Confirms
        // the freshly-logged-in user has any Face ID credential bound
        // server-side so the App.tsx post-login screen can offer to
        // enable biometric unlock on this device. Commit 4 wires the
        // actual Keychain write; for now we just refresh local state.
        try {
          const s = await api.webauthnStatus();
          if (s && typeof s.has_credential === 'boolean') {
            if (!s.has_credential) clearWebAuthn();
            setHasFaceID(!!s.has_credential);
          }
        } catch {}
        // Offer biometric enrollment on first successful password
        // login. Auto-confirms into Keychain if the user taps the
        // confirmation; the actual write happens via enableFaceID()
        // triggered from a soft prompt below. We don't gate onLogin()
        // on this — biometric is optional.
        if (faceAvailable && !(await hasStoredCredential())) {
          offerEnableFaceID();
        }
        onLogin();
      } else if (r.need_verify) {
        setEmail(r.email); setStep('verify'); setMsg('');
        setTimeout(() => codeRef.current?.focus(), 100);
      } else {
        setMsg(r.message || t('errWrongCredentials'));
        triggerShake();
      }
    } catch (e: any) {
      setLoading(false);
      setMsg(e?.message || t('errNetworkError') || '网络错误，请检查网络后重试');
    }
  };

  const handleRegister = async () => {
    if (loading) return;
    if (!regUsername || !regPassword || !email) { setMsgOk(false); setMsg(t('errEmptyFields')); triggerShake(); return; }
    if (regPassword !== password2) { setMsgOk(false); setMsg(t('errPwMismatch') || 'Passwords mismatch'); triggerShake(); return; }
    const pwErr = validatePassword(regPassword);
    if (pwErr) { setMsgOk(false); setMsg(pwErr); triggerShake(); return; }
    const emailErr = validateEmail(email);
    if (emailErr) { setMsgOk(false); setMsg(emailErr); triggerShake(); return; }
    setLoading(true);
    try {
      const r = await api.register(regUsername, regPassword, email);
      setLoading(false);
      if (r.status === 'ok') { setMsgOk(true); setMsg(r.message); setDevCode(r.dev_code || ''); setStep('verify'); setTimeout(() => codeRef.current?.focus(), 100); }
      else { setMsgOk(false); setMsg(r.message); triggerShake(); }
    } catch (e: any) {
      setLoading(false);
      setMsgOk(false);
      setMsg(e?.message || t('errNetworkError') || '网络错误，请检查网络后重试');
    }
  };

  const handleVerify = async () => {
    if (loading) return;
    if (!code) return;
    setLoading(true);
    try {
      const r = await api.verify(email, code);
      setLoading(false);
      if (r.status === 'ok') { setEmail(''); setRegUsername(''); setRegPassword(''); setPassword2(''); setCode(''); setMsg(''); setStep('login'); }
      else { setMsgOk(false); setMsg(r.message); triggerShake(); }
    } catch (e: any) {
      setLoading(false);
      setMsgOk(false);
      setMsg(e?.message || t('errNetworkError') || '网络错误，请检查网络后重试');
    }
  };

  const handleForgot = async () => {
    if (loading) return;
    if (!email) { setMsgOk(false); setMsg(t('errEmptyFields')); return; }
    const emailErr = validateEmail(email);
    if (emailErr) { setMsgOk(false); setMsg(emailErr); return; }
    setLoading(true);
    try {
      const r = await api.forgotPassword(email);
      setLoading(false);
      if (r.status === 'ok') { setMsgOk(true); setMsg(r.message); setDevCode(r.dev_code || ''); setPassword(''); setStep('reset'); setTimeout(() => codeRef.current?.focus(), 100); }
      else { setMsgOk(false); setMsg(r.message); }
    } catch (e: any) {
      setLoading(false);
      setMsgOk(false);
      setMsg(e?.message || t('errNetworkError') || '网络错误，请检查网络后重试');
    }
  };

  const handleReset = async () => {
    if (loading) return;
    if (!code || !password) { setMsgOk(false); setMsg(t('errEmptyFields')); triggerShake(); return; }
    const pwErr = validatePassword(password);
    if (pwErr) { setMsgOk(false); setMsg(pwErr); triggerShake(); return; }
    setLoading(true);
    try {
      const r = await api.resetPassword(email, code, password);
      setLoading(false);
      if (r.status === 'ok') { setMsg(''); setEmail(''); setStep('login'); }
      else { setMsgOk(false); setMsg(r.message); triggerShake(); }
    } catch (e: any) {
      setLoading(false);
      setMsgOk(false);
      setMsg(e?.message || t('errNetworkError') || '网络错误，请检查网络后重试');
    }
  };

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => { return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }; }, []);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    const r = await api.resendCode(email);
    if (r.dev_code) setDevCode(r.dev_code);
    setResendCooldown(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(c => { if (c <= 1) { clearInterval(cooldownRef.current!); cooldownRef.current = null; return 0; } return c - 1; });
    }, 1000);
  };

  const switchLang = (l: string) => { setLang(l); };

  const styles = useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Default background — always visible */}
      <ImageBackground source={BG_IMAGE} style={styles.bgLayer} resizeMode="cover">
        <View style={styles.bgOverlay} />
      </ImageBackground>
      {/* Custom background — always rendered, opacity hides it when not ready.
          Source falls back to default BG_IMAGE so the layer doesn't unmount. */}
      <Animated.Image
        source={bgUrl ? { uri: bgUrl } : BG_IMAGE}
        style={[styles.bgLayer, { opacity: bgOpacity }]}
        resizeMode="cover"
      />
      <View style={styles.bgOverlay} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentScroll, { paddingTop: 32 + insets.top, paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logoWrap}>
              <Image source={LOGO_IMAGE} style={{ width: 80, height: 80, borderRadius: 40 }} resizeMode="cover" />
              <Animated.Image
                source={avatarUrl ? { uri: avatarUrl } : LOGO_IMAGE}
                style={[styles.logoOver, { opacity: avatarOpacity }]}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.subtitle}>{t('subtitle')}</Text>
            <View style={styles.langRow}>
              {langs.map(([l, label]) => (
                <TouchableOpacity key={l} onPress={() => switchLang(l)}>
                  <Text style={[styles.langBtn, lang === l && styles.langActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Glass Card — iOS 26 Liquid Glass style.
              Layered: outer Animated.View clips the rounded shape,
              BlurView provides real background blur (UIVisualEffectView
              on iOS), a top specular highlight gives the "edge of glass
              catching light" look, and the original content sits inside
              with the same padding as before. The transform on
              shakeAnim is always-on (identity when not shaking) so the
              style array stays stable across shake on/off transitions. */}
          <Animated.View style={[styles.glassCard, { transform: [{ translateX: shakeAnim }] }]}>
            <BlurView
              intensity={85}
              tint="systemUltraThinMaterialLight"
              style={[StyleSheet.absoluteFillObject, { borderRadius: 24 }]}
              pointerEvents="none"
            />
            {msg ? (
              <View style={[styles.msgBox, msgOk ? styles.msgOk : styles.msgErr]}>
                <Text style={[styles.msgText, msgOk ? styles.msgOkText : styles.msgErrText]}>{msg}</Text>
              </View>
            ) : null}

            {(step === 'login' || step === 'register') ? (
              <View style={styles.tabRow}>
                <TouchableOpacity onPress={goLogin} style={[styles.tabBtn, step === 'login' && styles.tabActive]}>
                  <Text style={[styles.tabText, step === 'login' && styles.tabActiveText]}>{t('login')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={goRegister} style={[styles.tabBtn, step === 'register' && styles.tabActive]}>
                  <Text style={[styles.tabText, step === 'register' && styles.tabActiveText]}>{t('register')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {step === 'login' && (
              <View style={styles.formSection}>
                {faceMode ? (
                  /* Face ID mode: show only the biometric button + a
                     "use password" link. Reached automatically on mount
                     when a stored credential exists for saved_login, or
                     by tapping the Face ID link in password mode. */
                  <View style={styles.faceModeWrap}>
                    <Animated.View style={{ transform: [{ scale: breatheAnim }] }}>
                      <TouchableOpacity
                        style={styles.faceBtn}
                        onPress={handleFaceIDLogin}
                        disabled={loading}
                      >
                        <FaceIDIcon color="rgba(255,255,255,0.85)" />
                      </TouchableOpacity>
                    </Animated.View>
                    <Text style={styles.faceTitle}>{t('faceIDLogin') || 'Face ID 登录'}</Text>
                    <Text style={styles.faceHint}>{username}</Text>
                    <TouchableOpacity onPress={() => { setFaceMode(false); setMsg(''); }}>
                      <Text style={styles.forgotText}>{t('usePasswordLogin') || '使用密码登录'}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>{t('username')}</Text>
                      <View style={styles.pwWrap}>
                        <TextInput style={[styles.textInput, { paddingRight: username ? 44 : 16 }]} value={username} onChangeText={setUsername}
                          placeholder={t('loginPlaceholder') || '用户名 / 邮箱'} placeholderTextColor="rgba(255,255,255,0.55)"
                          onSubmitEditing={handleLogin} autoCapitalize="none" onBlur={handleUsernameBlur} />
                        {username ? (
                          <TouchableOpacity style={styles.clearBtn} onPress={() => setUsername('')}>
                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <Line x1="18" y1="6" x2="6" y2="18" />
                              <Line x1="6" y1="6" x2="18" y2="18" />
                            </Svg>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>{t('password')}</Text>
                      <View style={styles.pwWrap}>
                        <TextInput style={styles.pwInput} value={password} onChangeText={setPassword}
                          placeholder={t('password')} placeholderTextColor="rgba(255,255,255,0.55)"
                          secureTextEntry={!showPw} onSubmitEditing={handleLogin} />
                        <TouchableOpacity style={styles.pwEye} onPress={() => setShowPw(!showPw)}>
                          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                            {showPw ? (
                              <>
                                <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                <Path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                                <Line x1="1" y1="1" x2="23" y2="23" />
                              </>
                            ) : (
                              <>
                                <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <Circle cx="12" cy="12" r="3" />
                              </>
                            )}
                          </Svg>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <SubmitButton onPress={handleLogin} loading={loading} label={t('loginBtn')} style={[styles.btnDark, (!username || !password || !!validatePassword(password)) && styles.btnDisabled]} textStyle={styles.btnDarkText} />
                    <View style={styles.rowBetween}>
                      <TouchableOpacity onPress={() => setRemember(!remember)} style={styles.row}>
                        <View style={[styles.checkbox, remember && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                          {remember && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.rememberText}>{t('rememberMe') || '记住我'}</Text>
                      </TouchableOpacity>
                      {faceAvailable && pwdHasFaceID ? (
                        <TouchableOpacity onPress={async () => {
                          setFaceMode(true);
                          setMsg('');
                          setTimeout(() => handleFaceIDLogin(), 250);
                        }}>
                          <Text style={{ fontSize: FONTS.micro.size, color: colors.primary }}>{t('faceIDLogin') || '面容登录'}</Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity onPress={() => { setStep('forgot'); setEmail(''); setPassword(''); reset(); }}>
                        <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}

            {step === 'register' && (
              <View style={styles.formSection}>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>{t('username')}</Text>
                  <View style={styles.pwWrap}>
                    <TextInput style={[styles.textInput, { paddingRight: regUsername ? 44 : 16 }]} value={regUsername} onChangeText={setRegUsername}
                      placeholder={t('username')} placeholderTextColor="rgba(255,255,255,0.55)" autoCapitalize="none" />
                    {regUsername ? (
                      <TouchableOpacity style={styles.clearBtn} onPress={() => setRegUsername('')}>
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <Line x1="18" y1="6" x2="6" y2="18" />
                          <Line x1="6" y1="6" x2="18" y2="18" />
                        </Svg>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>{t('email') || 'Email'}</Text>
                  <TextInput style={styles.textInput} value={email} onChangeText={setEmail}
                    placeholder={t('email') || 'Email'} placeholderTextColor="rgba(255,255,255,0.55)" keyboardType="email-address" autoCapitalize="none" />
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>
                    {t('password')}{' '}
                    <Text style={styles.hintText}>{t('pwHint') || '8+ chars, letter + number + special'}</Text>
                  </Text>
                  <View style={styles.pwWrap}>
                    <TextInput style={styles.pwInput} value={regPassword} onChangeText={setRegPassword}
                      placeholder={t('password')} placeholderTextColor="rgba(255,255,255,0.55)" secureTextEntry={!showPw} />
                    <TouchableOpacity style={styles.pwEye} onPress={() => setShowPw(!showPw)}>
                      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        {showPw ? (
                          <>
                            <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <Path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                            <Line x1="1" y1="1" x2="23" y2="23" />
                          </>
                        ) : (
                          <>
                            <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <Circle cx="12" cy="12" r="3" />
                          </>
                        )}
                      </Svg>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>{t('confirmPassword')}</Text>
                  <View style={styles.pwWrap}>
                    <TextInput style={styles.pwInput} value={password2} onChangeText={setPassword2}
                      placeholder={t('confirmPassword')} placeholderTextColor="rgba(255,255,255,0.55)"
                      secureTextEntry={!showPw2} onSubmitEditing={handleRegister} />
                    <TouchableOpacity style={styles.pwEye} onPress={() => setShowPw2(!showPw2)}>
                      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        {showPw2 ? (
                          <>
                            <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <Path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                            <Line x1="1" y1="1" x2="23" y2="23" />
                          </>
                        ) : (
                          <>
                            <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <Circle cx="12" cy="12" r="3" />
                          </>
                        )}
                      </Svg>
                    </TouchableOpacity>
                  </View>
                </View>
                <SubmitButton onPress={handleRegister} loading={loading} label={t('registerBtn')} style={styles.btnDark} textStyle={styles.btnDarkText} />
              </View>
            )}

            {step === 'verify' && (
              <View style={styles.formSection}>
                <Text style={styles.verifyTitle}>{t('verifyNewTitle') || '只差最后一步啦！✨'}</Text>
                <Text style={styles.verifyBody}>
                  {t('verifyNewBodyPre') || '欢迎加入柳味探秘科技！一封装有激活密码的邮件已经飞往您的邮箱：'}
                  <Text style={styles.verifyEmail}>{email}</Text>
                  {t('verifyNewBodyPost') || '。请前往查收并点击链接完成验证。'}
                </Text>
                {devCode !== '' && (
                  <View style={styles.devCodeCard}>
                    <Text style={styles.devCodeLabel}>{t('devCodeLabel') || '🔧 Dev Mode — Verification Code'}</Text>
                    <Text style={styles.devCodeValue}>{devCode}</Text>
                  </View>
                )}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>{t('verifyCode')}</Text>
                  <TextInput ref={codeRef} style={[styles.textInput, styles.codeInput]} maxLength={6} value={code} onChangeText={setCode}
                    placeholder={t('verifyCode')} placeholderTextColor="rgba(255,255,255,0.55)"
                    keyboardType="number-pad" onSubmitEditing={handleVerify} autoFocus />
                </View>
                <SubmitButton
                  onPress={handleVerify}
                  loading={loading}
                  disabled={!code}
                  label={t('verifyBtn')}
                  style={[styles.btnDark, !code && styles.btnDisabled]}
                  textStyle={styles.btnDarkText}
                />
                <Text style={styles.verifyHint}>
                  {t('verifyNewNoEmail') || '一直没收到？别着急，您可以 '}
                  <Text style={{ color: colors.surface, fontWeight: FONTS.micro.weight }} onPress={resendCooldown > 0 ? undefined : handleResend}>
                    {resendCooldown > 0 ? `${resendCooldown}s 后${t('verifyNewResend') || '重新发送'}` : t('verifyNewResend') || '重新发送'}
                  </Text>
                  {t('verifyNewOrSpam') || ' 或检查一下垃圾箱。'}
                </Text>
                <Text style={styles.verifyHint}>
                  {t('verifyNewWrongEmail') || '填错邮箱了？'}
                  <Text style={{ color: colors.surface, fontWeight: FONTS.micro.weight }} onPress={() => { setStep('register'); reset(); }}>
                    {t('verifyNewEditEmail') || '修改邮箱地址'}
                  </Text>
                </Text>
              </View>
            )}

            {step === 'forgot' && (
              <View style={styles.formSection}>
                <Text style={styles.infoText}>{t('forgotStep1') || 'Enter email'}</Text>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>{t('email') || 'Email'}</Text>
                  <TextInput style={styles.textInput} value={email} onChangeText={setEmail}
                    placeholder="Email" placeholderTextColor="rgba(255,255,255,0.55)"
                    keyboardType="email-address" onSubmitEditing={handleForgot} autoCapitalize="none" />
                </View>
                <SubmitButton onPress={handleForgot} loading={loading} label={t('forgotSendBtn') || 'Send Code'} style={styles.btnDark} textStyle={styles.btnDarkText} />
                <TouchableOpacity onPress={() => { reset(); goLogin(); }}>
                  <Text style={styles.forgotText}>{t('backToLogin')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'reset' && (
              <View style={styles.formSection}>
                <Text style={styles.infoText}>
                  {t('resetHint') || 'Code sent to'} <Text style={styles.infoStrong}>{email}</Text>
                </Text>
                {devCode !== '' && (
                  <View style={styles.devCodeCard}>
                    <Text style={styles.devCodeLabel}>{t('devCodeLabel') || '🔧 Dev Mode — Verification Code'}</Text>
                    <Text style={styles.devCodeValue}>{devCode}</Text>
                  </View>
                )}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>{t('verifyCode')}</Text>
                  <TextInput ref={codeRef} style={[styles.textInput, styles.codeInput]} maxLength={6} value={code} onChangeText={setCode}
                    placeholder={t('verifyCode')} placeholderTextColor="rgba(255,255,255,0.55)" keyboardType="number-pad" autoFocus />
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>{t('newPassword')}</Text>
                  <View style={styles.pwWrap}>
                    <TextInput style={styles.pwInput} value={password} onChangeText={setPassword}
                      placeholder={t('newPassword')} placeholderTextColor="rgba(255,255,255,0.55)" secureTextEntry={!showPwNew} />
                    <TouchableOpacity style={styles.pwEye} onPress={() => setShowPwNew(!showPwNew)}>
                      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        {showPwNew ? (
                          <>
                            <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <Path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                            <Line x1="1" y1="1" x2="23" y2="23" />
                          </>
                        ) : (
                          <>
                            <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <Circle cx="12" cy="12" r="3" />
                          </>
                        )}
                      </Svg>
                    </TouchableOpacity>
                  </View>
                </View>
                <SubmitButton onPress={handleReset} loading={loading} disabled={!code || code.length < 6 || !password || !!validatePassword(password)} label={t('resetBtn')} style={[styles.btnDark, (!code || code.length < 6 || !password || !!validatePassword(password)) && styles.btnDisabled]} textStyle={styles.btnDarkText} />
                <TouchableOpacity onPress={() => { reset(); goLogin(); }}>
                  <Text style={styles.forgotText}>{t('backToLogin')}</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.copyright}>{t('copyright') || '© 2026 柳味探秘 · 经营查询 · 版权所有'}</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// iOS glass colors — match web/src/screens/LoginScreen.tsx so the
// login form looks identical on both platforms. iOS now uses
// expo-blur's UIVisualEffectView for the actual blur (replacing the
// fake flat alpha tint), with a specular highlight + soft border
// to approximate the iOS 26 "Liquid Glass" look. Text on the glass
// uses light rgba whites (matching web).
const GLASS_BG = 'rgba(255,255,255,0.15)';
const GLASS_BG_STRONG = 'rgba(255,255,255,0.25)';
const GLASS_BORDER = 'rgba(255,255,255,0.18)';
const GLASS_BORDER_STRONG = 'rgba(255,255,255,0.35)';
const AVATAR_RING = 'rgba(255,255,255,0.25)';

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  bgLayer: { position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.30)', zIndex: 1 },
  flex: { flex: 1, position: 'relative' as any, zIndex: 10 },
  content: { flex: 1, width: '100%', maxWidth: 420, alignSelf: 'center', paddingHorizontal: 20 } as any,
  contentScroll: { paddingTop: 32, paddingBottom: 40 },
  brand: { alignItems: 'center', marginBottom: 32 },
  logoWrap: {
    width: 80, height: 80, borderRadius: 40, overflow: 'hidden', marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 2, borderColor: AVATAR_RING,
  },
  logoOver: { position: 'absolute' as any, top: 0, left: 0, width: 80, height: 80, borderRadius: 40 },
  subtitle: { fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.7)', marginTop: 6, letterSpacing: 1 },
  langRow: { flexDirection: 'row', gap: 4, marginTop: 12 },
  langBtn: { fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.4)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  langActive: { color: colors.surface, backgroundColor: 'rgba(255,255,255,0.15)' },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 16, padding: 28, gap: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  msgBox: { paddingVertical: 4, marginBottom: 8 },
  msgOk: {},
  msgErr: {},
  msgText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, textAlign: 'left' },
  msgOkText: { color: colors.success },
  msgErrText: { color: colors.danger },
  tabRow: {
    flexDirection: 'row', backgroundColor: GLASS_BG, borderRadius: 12, padding: 4, marginBottom: 16,
    borderWidth: 1, borderColor: GLASS_BORDER,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: GLASS_BG_STRONG },
  tabText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: 'rgba(255,255,255,0.65)' },
  tabActiveText: { color: colors.surface },
  formSection: { gap: 12, marginTop: 4 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: 'rgba(255,255,255,0.6)' },
  hintText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: 'rgba(255,255,255,0.4)' },
  pwWrap: { position: 'relative' },
  pwInput: {
    backgroundColor: GLASS_BG, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    paddingRight: 44, fontSize: FONTS.body.size, color: colors.surface,
    borderWidth: 1, borderColor: GLASS_BORDER,
  },
  pwEye: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center',
  },
  clearBtn: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center',
  },
  faceModeWrap: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  faceBtn: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  faceTitle: { fontSize: FONTS.sub.size, fontWeight: FONTS.subBold.weight, color: colors.surface },
  faceHint: { fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  textInput: {
    backgroundColor: GLASS_BG, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: FONTS.body.size, color: colors.surface,
    borderWidth: 1, borderColor: GLASS_BORDER,
  },
  codeInput: { textAlign: 'center', letterSpacing: 6 },
  btnDark: {
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12,
    borderWidth: 1, borderColor: GLASS_BORDER,
  },
  btnDarkText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.surface, letterSpacing: 1 },
  btnRed: {
    backgroundColor: withAlpha(colors.primary, 0.85), borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8,
    borderWidth: 1, borderColor: GLASS_BORDER,
  },
  btnRedText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.surface, letterSpacing: 1 },
  btnDisabled: { opacity: 0.4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkbox: {
    width: 16, height: 16, borderRadius: 4, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  checkmark: { fontSize: FONTS.micro.size, color: colors.surface, fontWeight: '700' },
  rememberText: { fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.6)' },
  forgotText: { fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8 },
  disabledText: { opacity: 0.3 },
  infoText: { fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20 },
  infoStrong: { fontWeight: FONTS.subBold.weight, color: colors.surface },
  verifyTitle: { fontSize: FONTS.sub.size, fontWeight: FONTS.subBold.weight, color: colors.surface, textAlign: 'center', marginBottom: 12 },
  verifyBody: { fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20 },
  verifyEmail: { fontWeight: FONTS.subBold.weight, color: colors.surface },
  verifyHint: { fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 18 },
  verifyLink: { color: colors.primary, fontWeight: FONTS.micro.weight },
  devCodeCard: {
    backgroundColor: withAlpha(colors.warning, 0.15), borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: withAlpha(colors.warning, 0.3),
  },
  devCodeLabel: { fontSize: FONTS.micro.size, color: colors.warning, fontWeight: FONTS.micro.weight, marginBottom: 8 },
  devCodeValue: { fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, color: colors.surface, letterSpacing: 8 },
  copyright: { fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 20 },
});
