import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, ImageBackground, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import AppTextInput from '../components/AppTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { t, getLang, langs, useLang, I18nKey } from '../i18n';
import { api, resolveAssetUrl } from '../api/client';
import { getOrDownloadBackground } from '../utils/backgroundCache';
import * as FileSystem from 'expo-file-system';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { BlurView } from 'expo-blur';
import SubmitButton from '../components/SubmitButton';
import { getWebAuthnBound, setWebAuthnBound, clearWebAuthn } from '../utils/storage';
import {
  isBiometricAvailable, promptBiometric, saveCredential, getCredential,
  hasStoredCredential, clearCredential, BiometryType,
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


function FingerprintIcon({ color = 'rgba(255,255,255,0.85)' }: { color?: string }) {
  return (
    <Svg width={56} height={56} viewBox="0 0 1024 1024">
      <Path d="M896 0 770.2528 0l17.1008 17.408L896 17.408c61.1328 0 110.592 49.4592 110.592 110.592l0 107.7248 17.408 16.9984L1024 128C1024 57.344 966.656 0 896 0zM128 1006.592c-61.1328 0-110.592-49.4592-110.592-110.592L17.408 780.8 0 763.4944 0 896c0 70.656 57.344 128 128 128l129.7408 0-16.896-17.408L128 1006.592zM17.408 128C17.408 66.8672 66.8672 17.408 128 17.408l112.128 0 17.408-17.408L128 0C57.344 0 0 57.344 0 128l0 124.928 17.408-16.7936L17.408 128zM1006.592 896c0 61.1328-49.4592 110.592-110.592 110.592L785.408 1006.592l-16.6912 17.408L896 1024c70.656 0 128-57.344 128-128L1024 763.2896l-17.408 17.408L1006.592 896zM160.0512 403.5584c0-10.3424-8.3968-18.8416-18.8416-18.8416-7.0656 0-12.9024 3.8912-15.9744 9.6256l-1.536-0.7168c0 0-42.1888 154.112 5.8368 243.3024l2.048-0.6144c1.8432 7.5776 8.704 13.2096 16.7936 13.2096 9.6256 0 16.9984-7.7824 16.9984-17.408 0-2.3552-0.512-4.608-1.3312-6.656l0.2048-0.1024c0 0-41.0624-109.1584-5.9392-213.8112C159.4368 409.088 160.0512 406.4256 160.0512 403.5584zM836.096 573.44c6.0416 0 11.264-3.072 14.336-7.68l3.2768 1.6384c0 0 9.3184-212.1728-104.1408-301.1584 0 0-144.2816-148.0704-370.5856-63.6928l0 0.1024c-6.144 1.7408-10.24 7.3728-10.24 14.0288 0 8.0896 6.4512 14.6432 14.5408 14.6432 0.4096 0 0.8192-0.1024 1.2288-0.1024l0.1024 0.4096c0 0 205.824-68.8128 330.1376 46.2848 0 0 122.2656 97.5872 104.2432 272.1792l0.512 0.2048c-0.6144 1.7408-0.9216 3.584-0.9216 5.5296C818.3808 565.5552 826.368 573.44 836.096 573.44zM331.9808 746.8032c0.7168-1.7408 1.024-3.6864 1.024-5.7344 0-8.3968-6.7584-15.2576-15.1552-15.2576-6.4512 0-11.6736 3.9936-13.824 9.728l-0.7168-0.3072c-10.1376 33.1776-34.816 75.264-34.816 75.264l0.512 0.3072c-2.9696 3.1744-4.8128 7.4752-4.8128 12.288 0 9.6256 7.7824 17.5104 17.408 17.5104 8.3968 0 15.0528-5.9392 16.6912-13.824 15.36-24.7808 33.9968-79.872 33.9968-79.872L331.9808 746.8032zM343.9616 254.5664l-0.7168-0.7168c2.6624-2.8672 4.4032-6.7584 4.4032-11.0592 0-8.704-7.0656-15.7696-15.7696-15.7696-4.3008 0-8.192 1.7408-10.8544 4.5056l-0.2048-0.1024C140.9024 343.4496 175.9232 573.2352 175.9232 573.2352c18.0224 78.336 0 138.9568 0 138.9568l0.512 0.3072c-2.9696 3.1744-4.9152 7.4752-4.9152 12.288 0 9.6256 7.7824 17.408 17.408 17.408 8.6016 0 15.4624-6.3488 16.7936-14.6432 26.7264-62.3616-0.8192-189.1328-0.8192-189.1328C197.9392 329.9328 343.9616 254.5664 343.9616 254.5664zM153.088 329.216c-2.4576 2.8672-3.9936 6.5536-3.9936 10.6496 0 8.8064 7.0656 15.872 15.7696 15.872 3.8912 0 7.2704-1.4336 10.0352-3.7888l1.1264 1.1264C288.4608 162.816 453.632 150.016 495.9232 150.016c1.4336 0.3072 2.7648 0.512 4.3008 0.512 1.3312 0 2.56-0.1024 3.7888-0.4096 1.4336 0 2.2528 0.1024 2.1504 0.1024l-0.1024-0.8192c6.7584-2.4576 11.4688-8.9088 11.4688-16.5888 0-9.8304-7.8848-17.7152-17.6128-17.7152-1.7408 0-3.3792 0.3072-4.9152 0.8192C253.0304 130.2528 159.1296 316.7232 153.088 329.216zM569.7536 277.8112l0.3072-0.8192c1.7408 0.7168 3.7888 1.1264 5.7344 1.1264 8.2944 0 14.7456-6.7584 14.7456-15.0528 0-6.3488-3.8912-11.776-9.3184-14.0288l0.1024-0.2048c-173.2608-41.0624-278.016 86.8352-278.016 86.8352-81.8176 77.5168-63.6928 220.16-63.6928 220.16 28.5696 115.2-11.5712 202.752-11.5712 202.752l0.3072 0.4096c-2.9696 3.1744-4.7104 7.3728-4.7104 12.0832 0 9.6256 7.7824 17.408 17.408 17.408 3.2768 0 6.3488-1.024 8.9088-2.56l1.2288 1.536c56.7296-78.336 28.9792-208.4864 28.9792-208.4864-27.4432-84.0704 5.7344-162.2016 5.7344-162.2016C376.7296 236.1344 569.7536 277.8112 569.7536 277.8112zM830.0544 712.192c0 9.728 7.8848 17.92 17.6128 17.92 9.728 0 17.3056-8.192 17.3056-17.408l0.2048 0c0 0 4.4032-39.3216 0-92.9792l-1.2288 0.1024c-2.3552-7.0656-8.9088-12.288-16.6912-12.288-9.728 0-17.3056 7.8848-17.3056 17.7152 0 1.6384 0.3072 3.2768 0.7168 4.8128 0.7168 12.6976 2.56 48.8448 0.2048 76.3904C830.3616 708.1984 830.0544 710.144 830.0544 712.192zM581.5296 155.4432l-0.1024 0.7168C845.0048 201.3184 879.616 469.6064 882.3808 495.7184c-0.1024 0.7168-0.2048 1.4336-0.2048 2.1504 0 9.728 8.0896 17.7152 17.8176 17.7152 9.728 0 17.5104-7.8848 17.5104-17.6128L917.504 497.664l-0.2048 0c-20.0704-299.008-277.6064-365.6704-323.1744-375.0912-2.2528-1.024-4.8128-1.6384-7.4752-1.6384-9.728 0-17.3056 7.9872-17.3056 17.7152C569.344 146.5344 574.464 153.088 581.5296 155.4432zM713.4208 451.8912c-2.2528-7.168-8.9088-12.3904-16.7936-12.3904-9.728 0-17.3056 7.8848-17.3056 17.7152 0 1.9456 0.4096 3.8912 1.024 5.632l-0.6144 0.2048c0 0 45.568 121.6512 0.1024 370.2784-2.7648 2.7648-4.5056 6.7584-4.5056 11.0592 0 8.6016 6.9632 15.5648 15.5648 15.5648 4.1984 0 7.8848-1.7408 10.6496-4.4032l1.3312 1.3312c0 0 52.5312-140.6976 11.5712-405.504L713.4208 451.8912zM691.2 399.36c0-6.5536-3.584-12.1856-8.9088-15.36-87.7568-100.352-205.2096-77.312-205.2096-77.312-180.1216 35.6352-179.5072 202.752-179.5072 202.752 30.9248 83.5584 11.5712 156.3648 11.5712 156.3648l0 0c-0.2048 1.1264-0.3072 2.3552-0.3072 3.4816 0 9.6256 7.7824 17.5104 17.408 17.5104 8.9088 0 15.7696-6.656 16.7936-15.36l0.8192 0.1024c21.2992-57.4464-11.5712-167.936-11.5712-167.936 21.1968-147.2512 144.7936-162.2016 144.7936-162.2016 91.648-22.7328 161.1776 43.1104 180.1216 63.5904 2.3552 6.9632 8.9088 11.9808 16.5888 11.9808C683.6224 417.0752 691.2 409.1904 691.2 399.36zM467.456 379.0848c-8.192 0.512-14.4384 7.2704-14.4384 15.6672 0 8.704 7.0656 15.7696 15.7696 15.7696 0.8192 0 1.536-0.1024 2.3552-0.2048l0.2048 0.6144c0 0 127.6928-48.9472 162.2016 98.4064 0 0 20.3776 184.0128-28.672 352.4608-2.8672 2.7648-4.608 6.5536-4.608 10.9568 0 8.2944 6.656 14.9504 14.9504 14.9504 8.192 0 14.5408-6.656 14.5408-14.848 12.3904-47.3088 77.5168-315.392 3.8912-444.5184C633.5488 428.3392 568.1152 343.1424 467.456 379.0848zM789.7088 794.5216c0-0.4096-0.1024-0.9216-0.1024-1.3312l0.3072 0.1024c0 0 12.6976-192.4096-5.7344-330.1376 0 0-29.9008-145.92-139.0592-185.344l-0.2048 0.3072c-1.9456-1.024-4.096-1.6384-6.4512-1.6384-7.7824 0-13.824 6.3488-13.824 14.2336 0 3.6864 1.4336 6.9632 3.7888 9.5232l-0.6144 0.7168c0 0 119.7056 60.1088 127.3856 196.9152 0 0 13.6192 147.8656 0 289.5872l0.9216 0.1024c-0.8192 2.1504-1.3312 4.4032-1.3312 6.8608 0 9.728 7.8848 17.7152 17.6128 17.7152C782.1312 812.2368 789.7088 804.2496 789.7088 794.5216zM523.4688 787.456c0 0 37.4784-115.9168 5.7344-283.8528l-1.024 0.3072c-3.072-5.5296-8.8064-9.216-15.5648-9.216-9.8304 0-17.408 7.9872-17.408 17.92 0 0.7168 0.1024 1.536 0.2048 2.2528l-0.9216 0.3072c0 0 36.352 149.9136-5.7344 260.7104l1.3312 0.4096c-1.1264 2.3552-1.8432 5.0176-1.8432 7.8848 0 9.6256 7.7824 17.408 17.408 17.408 8.6016 0 15.4624-6.3488 16.7936-14.5408L523.4688 787.456zM465.5104 578.9696c-26.0096-124.416 46.3872-121.6512 46.3872-121.6512 82.6368-3.072 57.9584 185.344 57.9584 185.344l0.512 0.1024c-0.512 1.6384-0.9216 3.2768-0.9216 5.0176 0 8.192 6.5536 14.848 14.7456 14.848 7.8848 0 14.0288-6.2464 14.336-14.2336l0.2048 0c6.0416-69.5296-5.7344-144.7936-5.7344-144.7936-27.4432-93.2864-110.08-63.6928-110.08-63.6928C406.8352 461.1072 442.368 619.52 442.368 619.52c20.8896 125.44-52.1216 249.0368-52.1216 249.0368l0.512 0.3072c-2.9696 3.1744-4.8128 7.4752-4.8128 12.288 0 9.6256 7.7824 17.408 17.408 17.408 8.4992 0 15.2576-6.0416 16.6912-14.0288C500.5312 737.9968 465.5104 578.9696 465.5104 578.9696zM486.8096 825.0368c-3.4816 0-6.656 1.3312-9.0112 3.4816l-0.7168-0.512c0 0-21.504 38.0928-28.2624 50.8928-3.072 2.7648-5.0176 6.7584-5.0176 11.264 0 8.2944 6.656 14.9504 14.848 14.9504 5.632 0 10.24-3.1744 12.6976-7.68 1.2288-2.56 21.2992-18.432 28.8768-52.0192l-0.4096-0.3072c0.8192-1.7408 1.2288-3.6864 1.2288-5.8368C501.0432 831.488 494.6944 825.0368 486.8096 825.0368zM424.96 439.9104l-0.7168-0.512c0.9216-1.9456 1.4336-3.9936 1.4336-6.2464 0-7.7824-6.2464-14.1312-14.1312-14.1312-3.6864 0-6.9632 1.4336-9.4208 3.7888l-0.3072-0.3072c-54.272 43.52-28.9792 173.7728-28.9792 173.7728 27.4432 112.64-40.5504 237.4656-40.5504 237.4656l0 0c-2.6624 2.8672-4.4032 6.8608-4.4032 11.1616 0 8.9088 7.168 16.1792 16.0768 16.1792 4.4032 0 8.192-1.7408 11.0592-4.608l0.4096 0.4096c57.6512-93.696 57.9584-225.8944 57.9584-225.8944C374.1696 483.6352 424.96 439.9104 424.96 439.9104zM584.2944 697.2416c-8.192 0-14.4384 6.8608-14.4384 15.0528 0 0 0-0.7168 0 0.3072l0 0c0 0-6.5536 110.592-46.2848 167.7312l0.4096 0.1024c-3.072 3.1744-4.8128 7.3728-4.8128 12.1856 0 9.6256 7.7824 17.408 17.408 17.408 8.192 0 14.848-5.7344 16.5888-13.4144 4.4032-6.0416 32.0512-48.8448 45.2608-180.224 0.4096-1.4336 0.7168-2.8672 0.7168-4.4032C599.04 703.8976 592.384 697.2416 584.2944 697.2416z" fill={color} />
    </Svg>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_RE = /[!@#$%^&*(),.?":{}|<>]/;

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [step, setStep] = useState<Step>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [msgKey, setMsgKey] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  // displayMsg mirrors web: i18n keys resolve at render time so
  // the text updates when the user switches language.
  const displayMsg = msgKey ? t(msgKey as I18nKey) : msg;
  // Per-user avatar/background. Mirrors the web LoginScreen so typing
  // a known username instantly swaps the logo and the full-screen bg.
  // bgUrl/avatarUrl are data URIs (RN has no Blob/Object URL).
  const [bgUrl, setBgUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('saved_login') || '';
      const key = saved ? `bg-image-${saved}` : 'bg-image';
      return localStorage.getItem(key) || '';
    } catch { return ''; }
  });
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('saved_login') || '';
      const key = saved ? `avatar-uri-${saved}` : 'avatar-uri';
      return localStorage.getItem(key) || '';
    } catch { return ''; }
  });
  // bgUrl/avatarUrl: cached file paths from localStorage.
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
    try { return localStorage.getItem('remember_me') === 'true'; } catch { return false; }
  });
  const [devCode, setDevCode] = useState('');
  // WebAuthn/Face ID state. hasFaceID: this device has a stored
  // credential. pwdHasFaceID: the currently typed username has any
  // WebAuthn credential bound server-side (drives the "Face ID 登录"
  // link in the password form).
  const [hasFaceID, setHasFaceID] = useState(false);
  const [pwdHasFaceID, setPwdHasFaceID] = useState(false);
  /** Username of the credential stored in Keychain — used to prevent
   *  Face ID from logging into the wrong account when a different
   *  username is typed. */
  const [keychainUser, setKeychainUser] = useState('');
  const [faceMode, setFaceMode] = useState(() => {
    try {
      const saved = localStorage.getItem('saved_login') || '';
      const faceUser = localStorage.getItem('face_mode_user') || '';
      return !!(saved && faceUser === saved);
    } catch { return false; }
  });
  const [faceAvailable, setFaceAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<BiometryType | null>(null);
  const [faceEnrolling, setFaceEnrolling] = useState(false);
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const bgFadeAnim = useRef(new Animated.Value(0)).current;
  const codeRef = useRef<any>(null);
  const { colors } = useTheme();

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('saved_login');
      if (saved) {
        setUsername(saved);
        // Refresh avatar + background from the server on mount so the
        // login page reflects changes made elsewhere (e.g. web). Without
        // this the page only shows the cached (possibly stale) background
        // until the user manually blurs the username field. Covers both
        // Face ID and password entry paths since LoginScreen remounts on
        // every logout / cold start.
        fetchUserMedia(saved);
      }
      if (localStorage.getItem('user')) onLogin();
    }
  }, []);

  // Persist remember_me across launches. Web does the same in
  // LoginScreen via localStorage; the API call already sends
  // `remember` so this just keeps the checkbox state sticky on the
  // device.
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('remember_me', String(remember));
  }, [remember]);

  // Migrate old data-URI cache to local files (data URIs are MBs of base64,
  // taking seconds to decode; local files decode in milliseconds like require()).
  // Runs once on mount, before the Image renders.
  useEffect(() => {
    const migrate = async (baseKey: string, user: string, setUrl: (v: string) => void) => {
      try {
        // Try user-specific key first, then global key (migration from older version)
        const userKey = `${baseKey}-${user}`;
        const globalKey = baseKey;
        let val = localStorage.getItem(userKey);
        let targetKey = userKey;
        if (!val) {
          val = localStorage.getItem(globalKey);
          targetKey = globalKey;
        }
        if (val && val.startsWith('data:')) {
          const base64 = val.split(',')[1];
          if (base64) {
            const fileUri = FileSystem.cacheDirectory + userKey + '-migrated.jpg';
            await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
            localStorage.setItem(userKey, fileUri);
            if (targetKey === globalKey) localStorage.removeItem(globalKey);
            setUrl(fileUri);
          }
        }
      } catch {}
    };
    const saved = localStorage.getItem('saved_login') || '';
    migrate('bg-image', saved, setBgUrl);
    migrate('avatar-uri', saved, setAvatarUrl);
  }, []);

  // WebAuthn bootstrap on mount. Mirrors web LoginScreen L117-165.
  // Read server state first (may clear stale localStorage), THEN check
  // biometric. The two checks must be sequenced — parallel execution
  // can race and use a stale cached.bound value.
  useEffect(() => {
    (async () => {
      // 1. Check biometric hardware
      const a = await isBiometricAvailable();
      setFaceAvailable(a.available);
      setBiometryType(a.biometryType ?? null);
      if (!a.available) return;

      // saved_login is read once up front and reused throughout bootstrap
      // (server fallback check, Keychain resolution, face-mode decision).
      const savedUser = localStorage.getItem('saved_login') || '';

      // 2. Server is the authority — try webauthnStatus (needs token)
      //    then fall back to webauthnCheck (public, by username).
      let serverHasCredential = false;
      let serverReachable = false;
      try {
        const r = await api.webauthnStatus();
        serverReachable = true;
        if (r && typeof r.has_credential === 'boolean') {
          serverHasCredential = !!r.has_credential;
        }
      } catch {}
      if (!serverReachable) {
        if (savedUser) {
          try {
            const r = await api.webauthnCheck(savedUser);
            serverReachable = true;
            serverHasCredential = !!(r && (r.has_credential || r.pwdHasFaceID));
          } catch {}
        }
      }

      // 3. Resolve Keychain credential — this is what Face ID login uses
      let keychainCred: { username: string; password: string } | null = null;
      try { keychainCred = await getCredential(savedUser || undefined); } catch {}
      if (keychainCred) setKeychainUser(keychainCred.username);

      // 4. hasFaceID flag (for ProfileScreen switch). Server is authority.
      if (serverReachable) {
        setHasFaceID(serverHasCredential);
      }

      // 5. Face mode: auto-enter when Keychain matches saved_login.
      //    Persist result to localStorage so next mount starts correctly.
      if (!keychainCred) {
        localStorage.removeItem('face_mode_user');
        setFaceMode(false);
        return;
      }
      if (keychainCred.username === savedUser && savedUser) {
        localStorage.setItem('face_mode_user', savedUser);
        setUsername(savedUser);
        switchToFaceMode();
      } else {
        localStorage.removeItem('face_mode_user');
        setFaceMode(false);
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

  // Fade custom background in on url change (double-layer, no flash).
  // Skip animation on first mount (bg cached from localStorage) — only
  // animate when the user actively switches to a different user onBlur.
  const bgFirstRender = useRef(true);
  useEffect(() => {
    if (bgUrl) {
      if (bgFirstRender.current) {
        bgFadeAnim.setValue(1);
        bgFirstRender.current = false;
      } else {
        bgFadeAnim.setValue(0);
        Animated.timing(bgFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    } else {
      bgFadeAnim.setValue(0);
    }
  }, [bgUrl]);

  // Fetch avatar + background for the given username. Called on blur.
  const fetchUserMedia = useCallback(async (user: string) => {
    if (!user) { setAvatarUrl(''); setBgUrl(''); return; }

    // Timestamped filename so the file:// URI is always unique. A
    // content-hash name (old approach) could collide when a new image
    // shared the same leading bytes as the cached one (JPEG headers are
    // near-identical), producing the SAME URI — React would then skip the
    // re-render and RN's Image cache would keep showing the stale image.
    // Delete the previous cached file first to avoid piling up in cache.
    const saveDataUri = async (dataUri: string, prefix: string, oldUri: string): Promise<string> => {
      try {
        const base64 = dataUri.split(',')[1];
        if (!base64) return '';
        if (oldUri && oldUri.startsWith('file://')) {
          try { await FileSystem.deleteAsync(oldUri, { idempotent: true }); } catch {}
        }
        const fileUri = FileSystem.cacheDirectory + prefix + '-' + encodeURIComponent(user) + '-' + Date.now() + '.jpg';
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        return fileUri;
      } catch { return ''; }
    };

    try {
      const avatarDataUri = await api.getUserAvatarByLoginUri(user).catch(() => null);
      if (avatarDataUri) {
        const oldAvatar = (() => { try { return localStorage.getItem(`avatar-uri-${user}`) || ''; } catch { return ''; } })();
        const fileUri = await saveDataUri(avatarDataUri, 'avatar', oldAvatar);
        const url = fileUri || avatarDataUri;
        await Image.prefetch(url);
        setAvatarUrl(url);
        try { localStorage.setItem(`avatar-uri-${user}`, url); } catch {}
      } else {
        setAvatarUrl('');
      }
    } catch { setAvatarUrl(''); }

    try {
      const bgDataUri = await api.getUserBackgroundUri(user).catch(() => null);
      if (bgDataUri) {
        const oldBg = (() => { try { return localStorage.getItem(`bg-image-${user}`) || ''; } catch { return ''; } })();
        // Content-compare with the cached file: if the server returned the
        // exact same image, reuse the cached URI. setBgUrl with the SAME
        // string → React bails out → no re-render, no fade retrigger, no
        // default-bg flash on logout remount. Guard: must read the REAL
        // file — if it was evicted by iOS cache cleanup or is unreadable,
        // fall through to the normal write path (never skip blindly, or
        // the bg would stay default until the image next changes).
        const newBase64 = bgDataUri.split(',')[1] || '';
        if (oldBg.startsWith('file://') && newBase64) {
          try {
            const cachedBase64 = await FileSystem.readAsStringAsync(oldBg, { encoding: FileSystem.EncodingType.Base64 });
            if (cachedBase64 === newBase64) {
              setBgUrl(oldBg);
              return;
            }
          } catch {}
        }
        const fileUri = await saveDataUri(bgDataUri, 'bg', oldBg);
        const url = fileUri || bgDataUri;
        await Image.prefetch(url);
        setBgUrl(url);
        try { localStorage.setItem(`bg-image-${user}`, url); } catch {}
      } else {
        setBgUrl('');
      }
    } catch { setBgUrl(''); }
  }, []);

  // Debounced check whether the typed username has any WebAuthn
  // credential bound server-side. Mirrors web LoginScreen L237-255 —
  // the response drives the "Face ID 登录" link that appears next to
  // "Forgot password?" once the username matches a known Face-ID user.
  // 500ms debounce + race-safe reqId (mirrors avatar/bg above).
  const pwdReqId = useRef(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      const id = username.trim();
      if (!id) { setPwdHasFaceID(false); return; }
      // Keychain match: always show Face ID button — iOS stores credential
      // locally without server registration, so webauthnCheck would miss it.
      if (keychainUser && keychainUser === id) {
        setPwdHasFaceID(true);
        return;
      }
      // keychainUser missing or doesn't match — check typed user's own slot
      if (keychainUser !== id) {
        try {
          const cred = await getCredential(id);
          if (cred && cred.username === id) {
            setKeychainUser(cred.username);
            setPwdHasFaceID(true);
            return;
          }
        } catch {}
      }
      // Still no match — fall back to server check (web WebAuthn users).
      const reqId = ++pwdReqId.current;
      timer = setTimeout(async () => {
        try {
          const r = await api.webauthnCheck(id);
          if (reqId !== pwdReqId.current) return;
          setPwdHasFaceID(!!(r && (r.pwdHasFaceID || r.has_credential)));
        } catch {
          if (reqId === pwdReqId.current) setPwdHasFaceID(false);
        }
      }, 500);
    })();

    return () => { if (timer) clearTimeout(timer); };
  }, [username, keychainUser]);

  const reset = () => { setMsg(''); setMsgKey(''); setMsgOk(false); setDevCode(''); setCode(''); };
  const switchToFaceMode = () => { setFaceMode(true); setMsg(''); setMsgKey(''); };
  const goLogin = () => {
    setMsg(''); setMsgKey('');
    setStep('login');
    setPassword(''); setPassword2(''); setEmail('');
    // Restore Face ID mode if this device has any Keychain credential
    if (keychainUser) {
      setUsername(keychainUser);
      switchToFaceMode();
      return;
    }
    setFaceMode(false);
    try {
      const saved = localStorage.getItem('saved_login');
      if (saved) setUsername(saved);
    } catch {}
  };

  const goRegister = () => {
    setMsg(''); setMsgKey('');
    setStep('register');
    setUsername(''); setPassword(''); setPassword2(''); setEmail('');
  };

  const validatePassword = (pw: string): string => {
    let ok = true;
    if (pw.length < 8) ok = false;
    if (!/[A-Za-z]/.test(pw)) ok = false;
    if (!/[0-9]/.test(pw)) ok = false;
    if (!SPECIAL_RE.test(pw)) ok = false;
    if (!ok) return 'errPwRequirements';
    return '';
  };

  const validateEmail = (em: string): string => {
    if (!EMAIL_RE.test(em)) return 'errEmailInvalid';
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

  // Download the current user's background to local FileSystem BEFORE
  // navigating to HomeScreen, so useState initializer finds bg-local-path.
  // Same-user: localStorage + FileSystem check (near-instant).
  // Cross-user: network download (acceptable delay, better than flash).
  const preloadHomeBackground = async () => {
    try {
      const r = await api.getBackground();
      if (r?.url) {
        const resolved = resolveAssetUrl(r.url);
        if (resolved) {
          const localPath = await getOrDownloadBackground(resolved);
          if (localPath) await Image.prefetch(localPath);
          return;
        }
      }
      // Fallback: api.getBackground returned null/empty (token warming,
      // server cache, or reset-to-default). Use user-specific cached bg.
      try {
        const u = username || localStorage.getItem('saved_login') || '';
        const bgKey = u ? `bg-image-${u}` : 'bg-image';
        const bgImage = localStorage.getItem(bgKey);
        if (bgImage && bgImage.startsWith('file://')) {
          const info = await FileSystem.getInfoAsync(bgImage);
          if (info.exists) {
            try { localStorage.setItem('bg-local-path', bgImage); } catch {}
            await Image.prefetch(bgImage);
            return;
          }
        }
        // Last resort: bg-image not ready yet (e.g. FaceID login beat
        // the onBlur fetch). Fetch directly, bypass the cache.
        if (u) {
          const dataUri = await api.getUserBackgroundUri(u).catch(() => null);
          if (dataUri) {
            const base64 = dataUri.split(',')[1];
            if (base64) {
              // Delete old cached file before writing new one
              try {
                const oldPath = localStorage.getItem('bg-local-path');
                if (oldPath) await FileSystem.deleteAsync(oldPath, { idempotent: true });
              } catch {}
              const fileUri = FileSystem.cacheDirectory + `bg_${Date.now()}.jpg`;
              await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
              try { localStorage.setItem('bg-local-path', fileUri); } catch {}
              await Image.prefetch(fileUri);
              return;
            }
          }
        }
        // All layers exhausted — this user has no custom background.
        // Delete any stale cached file from a previous user.
        try {
          const oldPath = localStorage.getItem('bg-local-path');
          if (oldPath) await FileSystem.deleteAsync(oldPath, { idempotent: true });
        } catch {}
        try { localStorage.removeItem('bg-local-path'); } catch {}
        try { localStorage.removeItem('bg-remote-url'); } catch {}
      } catch {}
    } catch {}
  };

  const handleFaceIDLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // 1. Biometric availability + prompt
      const avail = await isBiometricAvailable();
      if (!avail.available) {
        setMsgKey('errFaceIDUnavailable'); setMsg('');
        triggerShake();
        setLoading(false);
        return;
      }
      const loginPrompt = biometryType === 'fingerprint'
        ? (t('fingerprintPrompt') || '使用 Touch ID 登录柳味探秘')
        : (t('faceIDPrompt') || '使用 Face ID 登录柳味探秘');
      const bio = await promptBiometric(loginPrompt);
      if (!bio.success) {
        // User cancelled or failed — silently drop back to password mode
        setFaceMode(false);
        setLoading(false);
        return;
      }
      // 2. Retrieve stored credential
      const cred = await getCredential(username);
      if (!cred) {
        setMsgKey('errFaceIDNoCredential'); setMsg('');
        setFaceMode(false);
        setLoading(false);
        return;
      }
      // 3. Guard: if the user typed a different username, don't log in
      // with the Keychain credential — it belongs to someone else.
      const typedUser = username.trim();
      if (typedUser && cred.username !== typedUser) {
        setMsgKey('errWrongCredentials'); setMsg('');
        setFaceMode(false);
        setLoading(false);
        return;
      }
      // 4. POST to /login so the server sets a fresh session cookie.
      // The stored password was Keychain-protected by biometric so we
      // can safely hand it back to the auth endpoint.
      const r = await api.login(cred.username, cred.password, true);
      if (r.status !== 'ok') {
        // Keychain credential is stale (e.g. FaceID was disabled
        // server-side). Clear it so it doesn't reappear on next mount.
        clearCredential(cred.username).catch(() => {});
        clearWebAuthn();
        setHasFaceID(false);
        setMsgOk(false);
        setMsgKey('errWrongCredentials'); setMsg('');
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
      setLoading(false);
      // Preload background so HomeScreen's first frame shows custom bg
      await preloadHomeBackground();
      onLogin();
    } catch (e: any) {
      setLoading(false);
      setFaceMode(false);
      setMsgOk(false);
      if (e instanceof TypeError) { setMsgKey('errNetworkError'); setMsg(''); }
      else if (e?.message) { setMsg(e.message); setMsgKey(''); }
      else { setMsgKey('errWrongCredentials'); setMsg(''); }
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
    if (await hasStoredCredential(username)) return;
    // Soft prompt: ask the user via the existing msgBox. If they
    // accept, we run enableFaceID() which gates the keychain write
    // behind a biometric prompt. If they ignore / type more, the
    // offer expires silently on next state change.
    setMsgKey('offerEnableFaceID'); setMsg('');
    setMsgOk(true);
  };

  const enableFaceID = async () => {
    if (faceEnrolling || !faceAvailable) return;
    setFaceEnrolling(true);
    try {
      const enrollPrompt = biometryType === 'fingerprint'
        ? (t('fingerprintEnrollPrompt') || '启用 Touch ID 登录')
        : (t('faceIDEnrollPrompt') || '启用 Face ID 登录');
      const bio = await promptBiometric(enrollPrompt);
      if (!bio.success) { setFaceEnrolling(false); return; }
      const r = await saveCredential(username, password);
      if (r.ok) {
        setWebAuthnBound(username, 'keychain');
        setHasFaceID(true);
        setMsgKey('faceIDEnabled'); setMsg('');
        setMsgOk(true);
      } else {
        setMsgKey('errFaceIDEnableFailed'); setMsg('');
        setMsgOk(false);
        triggerShake();
      }
    } catch {
      setMsgKey('errFaceIDEnableFailed'); setMsg('');
      setMsgOk(false);
    } finally {
      setFaceEnrolling(false);
    }
  };

  const handleLogin = async () => {
    if (loading) return;
    if (!username || !password) { setMsgKey('errEmptyFields'); setMsg(''); triggerShake(); return; }
    setLoading(true);
    try {
      const r = await api.login(username, password, remember);
      if (r.status === 'ok') {
        if (r.token && typeof localStorage !== 'undefined') localStorage.setItem('token', r.token);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('user', r.username || username);
          localStorage.setItem('user_id', String(r.user_id || ''));
          if (remember) {
            localStorage.setItem('saved_login', username);
          } else {
            localStorage.removeItem('saved_login');
          }
          localStorage.removeItem('active_tab');
          localStorage.removeItem('expense_active_tab');
        }
        try { await api.saveLang(getLang()); } catch {}
        // Preload background so HomeScreen's first frame shows custom bg
        await preloadHomeBackground();
        setLoading(false);
        onLogin();
      } else if (r.need_verify) {
        setLoading(false);
        setEmail(r.email); setStep('verify'); setMsg(''); setMsgKey('');
        setTimeout(() => codeRef.current?.focus(), 100);
      } else {
        setLoading(false);
        setMsgOk(false);
        setMsgKey('errWrongCredentials'); setMsg('');
        triggerShake();
      }
    } catch (e: any) {
      setLoading(false);
      setMsgOk(false);
      if (e instanceof TypeError) { setMsgKey('errNetworkError'); setMsg(''); }
      else if (e?.message) { setMsg(e.message); setMsgKey(''); }
      else { setMsgKey('errWrongCredentials'); setMsg(''); }
    }
  };

  const handleRegister = async () => {
    if (loading) return;
    if (!username || !password || !email) { setMsgKey('errEmptyFields'); setMsg(''); triggerShake(); return; }
    if (password !== password2) { setMsgKey('errPwMismatch'); setMsg(''); triggerShake(); return; }
    const pwErr = validatePassword(password);
    if (pwErr) { setMsgKey(pwErr); setMsg(''); triggerShake(); return; }
    const emailErr = validateEmail(email);
    if (emailErr) { setMsgKey(emailErr); setMsg(''); triggerShake(); return; }
    setLoading(true);
    try {
      const r = await api.register(username, password, email);
      setLoading(false);
      if (r.status === 'ok') { setMsg(''); setMsgKey(''); setMsgOk(false); setDevCode(r.dev_code || ''); setCode(''); setStep('verify'); setTimeout(() => codeRef.current?.focus(), 100); }
      else { setMsgOk(false); if (r.message) { setMsg(r.message); setMsgKey(''); } else { setMsgKey('errWrongCredentials'); setMsg(''); } triggerShake(); }
    } catch (e: any) {
      setLoading(false);
      setMsgOk(false);
      if (e?.message) { setMsg(e.message); setMsgKey(''); }
      else { setMsgKey('errNetworkError'); setMsg(''); }
    }
  };

  const handleVerify = async () => {
    if (loading) return;
    if (!code) return;
    setLoading(true);
    try {
      const r = await api.verify(email, code);
      setLoading(false);
      if (r.status === 'ok') { setEmail(''); setPassword2(''); setCode(''); setMsg(''); setMsgKey(''); setStep('login'); }
      else { setMsgOk(false); if (r.message) { setMsg(r.message); setMsgKey(''); } else { setMsgKey('errWrongCredentials'); setMsg(''); } triggerShake(); }
    } catch (e: any) {
      setLoading(false);
      setMsgOk(false);
      if (e?.message) { setMsg(e.message); setMsgKey(''); }
      else { setMsgKey('errNetworkError'); setMsg(''); }
    }
  };

  const handleForgot = async () => {
    if (loading) return;
    if (!email) { setMsgKey('errEmptyFields'); setMsg(''); return; }
    const emailErr = validateEmail(email);
    if (emailErr) { setMsgKey(emailErr); setMsg(''); return; }
    setLoading(true);
    try {
      const r = await api.forgotPassword(email);
      setLoading(false);
      if (r.status === 'ok') { setDevCode(r.dev_code || ''); setPassword(''); setStep('reset'); setTimeout(() => codeRef.current?.focus(), 100); }
      else { setMsgOk(false); if (r.message) { setMsg(r.message); setMsgKey(''); } else { setMsgKey('errWrongCredentials'); setMsg(''); } }
    } catch (e: any) {
      setLoading(false);
      setMsgOk(false);
      if (e?.message) { setMsg(e.message); setMsgKey(''); }
      else { setMsgKey('errNetworkError'); setMsg(''); }
    }
  };

  const handleReset = async () => {
    if (loading) return;
    if (!code || !password) { setMsgOk(false); setMsgKey('errEmptyFields'); setMsg(''); triggerShake(); return; }
    const pwErr = validatePassword(password);
    if (pwErr) { setMsgOk(false); setMsgKey(pwErr); setMsg(''); triggerShake(); return; }
    setLoading(true);
    try {
      const r = await api.resetPassword(email, code, password);
      setLoading(false);
      if (r.status === 'ok') { setMsg(''); setMsgKey(''); setStep('login'); }
      else { setMsgOk(false); if (r.message) { setMsg(r.message); setMsgKey(''); } else { setMsgKey('errWrongCredentials'); setMsg(''); } triggerShake(); }
    } catch (e: any) {
      setLoading(false);
      setMsgOk(false);
      if (e?.message) { setMsg(e.message); setMsgKey(''); }
      else { setMsgKey('errNetworkError'); setMsg(''); }
    }
  };

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => { return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }; }, []);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      const r = await api.resendCode(email);
      if (r.dev_code) setDevCode(r.dev_code);
      setResendCooldown(30);
    } catch (e: any) {
      if (e?.message) { setMsg(e.message); setMsgKey(''); } else { setMsgKey('errNetworkError'); setMsg(''); }
      return;
    }
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(c => { if (c <= 1) { clearInterval(cooldownRef.current!); cooldownRef.current = null; return 0; } return c - 1; });
    }, 1000);
  };

  const switchLang = (l: string) => { setLang(l); setMsg(''); setMsgKey(''); setMsgOk(false); };

  const styles = useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Background — double layer: default always rendered, custom fades on top.
          Avoids the blue-gray flash from container bg during user switch. */}
      <ImageBackground source={BG_IMAGE} style={styles.bgLayer} resizeMode="cover" />
      {bgUrl ? (
        <Animated.Image
          source={{ uri: bgUrl }}
          style={[styles.bgLayer, { opacity: bgFadeAnim }]}
          resizeMode="cover"
        />
      ) : null}
      <View style={styles.bgOverlay} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentScroll, { paddingTop: 12 + insets.top, paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logoWrap}>
              <Image source={LOGO_IMAGE} style={styles.logoImg} resizeMode="cover" />
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.logoOver}
                  resizeMode="cover"
                />
              ) : null}
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
              intensity={24}
              tint="light"
              style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
              pointerEvents="none"
            />
            {(msg || msgKey) ? (
              <View key={lang} style={[styles.msgBox, msgOk ? styles.msgOk : styles.msgErr]}>
                <Text style={[styles.msgText, msgOk ? styles.msgOkText : styles.msgErrText]}>{displayMsg}</Text>
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
                        {biometryType === 'fingerprint' ? <FingerprintIcon color="rgba(255,255,255,0.85)" /> : <FaceIDIcon color="rgba(255,255,255,0.85)" />}
                      </TouchableOpacity>
                    </Animated.View>
                    <Text style={{ fontSize: FONTS.h2.size, fontWeight: '500', color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>{username}</Text>
                    <TouchableOpacity onPress={() => { setFaceMode(false); setMsg(''); setMsgKey(''); }}>
                      <Text style={{ fontSize: FONTS.micro.size, color: colors.primary }}>{t('usePasswordLogin') || '使用密码登录'}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>{t('username')}</Text>
                      <View style={styles.pwWrap}>
                        <AppTextInput style={[styles.textInput, { paddingRight: username ? 44 : 16 }]} value={username} onChangeText={setUsername}
                          placeholder={t('loginPlaceholder') || '用户名 / 邮箱'} placeholderTextColor="rgba(255,255,255,0.55)"
                          onSubmitEditing={handleLogin} autoCapitalize="none"
                          onBlur={() => fetchUserMedia(username)} />
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
                        <AppTextInput style={styles.pwInput} value={password} onChangeText={setPassword}
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
                    <SubmitButton onPress={handleLogin} loading={loading} disabled={!username || !password || !!validatePassword(password)} label={t('loginBtn')} style={[styles.btnDark, (!username || !password || !!validatePassword(password)) && styles.btnDisabled]} textStyle={[styles.btnDarkText, (!username || !password || !!validatePassword(password)) && styles.disabledText]} />
                    <View style={styles.rowBetween}>
                      <TouchableOpacity onPress={() => setRemember(!remember)} style={styles.row}>
                        <View style={[styles.checkbox, remember && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                          {remember && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.rememberText}>{t('rememberMe') || '记住我'}</Text>
                      </TouchableOpacity>
                      {pwdHasFaceID && !!keychainUser ? (
                        <TouchableOpacity onPress={switchToFaceMode}>
                          <Text style={{ fontSize: FONTS.sub.size, color: colors.primary }}>{biometryType === 'fingerprint' ? (t('fingerprintLogin') || '指纹登录') : (t('faceIDLogin') || '面容登录')}</Text>
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
                    <AppTextInput style={[styles.textInput, { paddingRight: username ? 44 : 16 }]} value={username} onChangeText={setUsername}
                      placeholder={t('username')} placeholderTextColor="rgba(255,255,255,0.55)" autoCapitalize="none" />
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
                  <Text style={styles.fieldLabel}>{t('email') || 'Email'}</Text>
                  <AppTextInput style={styles.textInput} value={email} onChangeText={setEmail}
                    placeholder={t('email') || 'Email'} placeholderTextColor="rgba(255,255,255,0.55)" keyboardType="email-address" autoCapitalize="none" />
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>
                    {t('password')}{' '}
                    <Text style={styles.hintText}>{t('pwHint') || '8+ chars, letter + number + special'}</Text>
                  </Text>
                  <View style={styles.pwWrap}>
                    <AppTextInput style={styles.pwInput} value={password} onChangeText={setPassword}
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
                    <AppTextInput style={styles.pwInput} value={password2} onChangeText={setPassword2}
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
                <SubmitButton onPress={handleRegister} loading={loading} disabled={!username || !email || !password || !password2} label={t('registerBtn')} style={[styles.btnDark, (!username || !email || !password || !password2) && styles.btnDisabled]} textStyle={[styles.btnDarkText, (!username || !email || !password || !password2) && styles.disabledText]} />
                <TouchableOpacity onPress={goLogin}>
                  <Text style={styles.forgotText}>{t('backToLogin')}</Text>
                </TouchableOpacity>
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
                  <AppTextInput ref={codeRef} style={[styles.textInput, styles.codeInput]} maxLength={6} value={code} onChangeText={setCode}
                    placeholder={t('verifyCode')} placeholderTextColor="rgba(255,255,255,0.55)"
                    keyboardType="number-pad" onSubmitEditing={handleVerify} autoFocus />
                </View>
                <SubmitButton
                  onPress={handleVerify}
                  loading={loading}
                  disabled={!code || code.length < 6}
                  label={t('verifyBtn')}
                  style={[styles.btnDark, (!code || code.length < 6) && styles.btnDisabled]}
                  textStyle={[styles.btnDarkText, (!code || code.length < 6) && styles.disabledText]}
                />
                <Text style={styles.verifyHint}>
                  {t('verifyNewNoEmail') || '一直没收到？别着急，您可以 '}
                  <Text style={{ color: colors.surface, fontWeight: '500' }} onPress={resendCooldown > 0 ? undefined : handleResend}>
                    {resendCooldown > 0 ? `${resendCooldown}s 后${t('verifyNewResend') || '重新发送'}` : t('verifyNewResend') || '重新发送'}
                  </Text>
                  {t('verifyNewOrSpam') || ' 或检查一下垃圾箱。'}
                </Text>
                <Text style={styles.verifyHint}>
                  {t('verifyNewWrongEmail') || '填错邮箱了？'}
                  <Text style={{ color: colors.surface, fontWeight: '500' }} onPress={() => { setStep('register'); reset(); }}>
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
                  <AppTextInput style={styles.textInput} value={email} onChangeText={setEmail}
                    placeholder="Email" placeholderTextColor="rgba(255,255,255,0.55)"
                    keyboardType="email-address" onSubmitEditing={handleForgot} autoCapitalize="none" />
                </View>
                <SubmitButton onPress={handleForgot} loading={loading} disabled={!email} label={t('forgotSendBtn') || 'Send Code'} style={[styles.btnDark, !email && styles.btnDisabled]} textStyle={[styles.btnDarkText, !email && styles.disabledText]} />
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
                  <AppTextInput ref={codeRef} style={[styles.textInput, styles.codeInput]} maxLength={6} value={code} onChangeText={setCode}
                    placeholder={t('verifyCode')} placeholderTextColor="rgba(255,255,255,0.55)" keyboardType="number-pad" autoFocus />
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>{t('newPassword')}</Text>
                  <View style={styles.pwWrap}>
                    <AppTextInput style={styles.pwInput} value={password} onChangeText={setPassword}
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
                <SubmitButton onPress={handleReset} loading={loading} disabled={!code || !password} label={t('resetBtn')} style={[styles.btnDark, (!code || !password) && styles.btnDisabled]} textStyle={[styles.btnDarkText, (!code || !password) && styles.disabledText]} />
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

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  bgLayer: { position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)', zIndex: 1 },
  flex: { flex: 1, position: 'relative' as any, zIndex: 10 },
  content: { flex: 1, width: '100%', maxWidth: 420, alignSelf: 'center', paddingHorizontal: 20 } as any,
  contentScroll: { paddingTop: 48, paddingBottom: 60 },
  brand: { alignItems: 'center', marginBottom: 32 },
  logoWrap: {
    width: 80, height: 80, borderRadius: 40, marginBottom: 20,
  },
  logoImg: {
    width: 80, height: 80, borderRadius: 40,
    // Approximate web's boxShadow: 0 1px 3px rgba(0,0,0,.2), 0 8px 40px rgba(0,0,0,.15)
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 20,
  },
  logoOver: {
    position: 'absolute' as any, top: 0, left: 0, width: 80, height: 80, borderRadius: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 20,
  },
  subtitle: { fontSize: FONTS.sub.size, color: 'rgba(255,255,255,0.7)', marginTop: 6, letterSpacing: 1 },
  langRow: { flexDirection: 'row', gap: 4, marginTop: 12 },
  langBtn: { fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.4)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  langActive: { color: colors.surface, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, overflow: 'hidden' as const },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 24, padding: 28, overflow: 'hidden',
  },
  msgBox: { paddingVertical: 4, marginBottom: 8 },
  msgOk: {},
  msgErr: {},
  msgText: { fontSize: FONTS.sub.size, fontWeight: '500', textAlign: 'left' },
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
  formSection: { gap: 12 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: 'rgba(255,255,255,0.6)' },
  hintText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: 'rgba(255,255,255,0.3)' },
  pwWrap: { position: 'relative' },
  pwInput: {
    backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    paddingRight: 44, fontSize: FONTS.body.size, color: colors.surface,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  pwEye: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center',
  },
  clearBtn: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center',
  },
  faceModeWrap: { alignItems: 'center', gap: 16 },
  faceBtn: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  faceHint: { fontSize: FONTS.sub.size, color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: FONTS.body.size, color: colors.surface,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  codeInput: { textAlign: 'center', letterSpacing: 6 },
  btnDark: {
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  btnDarkText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.surface, letterSpacing: 1 },
  btnRed: {
    backgroundColor: withAlpha(colors.primary, 0.7), borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  btnRedText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: colors.surface, letterSpacing: 1 },
  btnDisabled: { opacity: 0.4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkbox: {
    width: 16, height: 16, borderRadius: 4, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  checkmark: { fontSize: FONTS.sub.size, color: colors.surface, fontWeight: '700' },
  rememberText: { fontSize: FONTS.sub.size, color: 'rgba(255,255,255,0.6)' },
  forgotText: { fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 8 },
  disabledText: { opacity: 0.3 },
  infoText: { fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20 },
  infoStrong: { fontWeight: '700', color: colors.surface },
  verifyTitle: { fontSize: FONTS.body.size, fontWeight: '700', color: colors.surface, textAlign: 'center', marginBottom: 12 },
  verifyBody: { fontSize: FONTS.sub.size, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20 },
  verifyEmail: { fontWeight: '700', color: colors.surface },
  verifyHint: { fontSize: FONTS.sub.size, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 18 },
  verifyLink: { color: colors.primary, fontWeight: '500' },
  devCodeCard: {
    backgroundColor: withAlpha(colors.warning, 0.15), borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: withAlpha(colors.warning, 0.3),
  },
  devCodeLabel: { fontSize: FONTS.sub.size, color: colors.warning, fontWeight: '500', marginBottom: 8 },
  devCodeValue: { fontSize: FONTS.amount.size, fontWeight: '700', color: colors.surface, letterSpacing: 8 },
  copyright: { fontSize: FONTS.sub.size, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 20 },
});
