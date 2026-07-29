import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, Switch, Modal, useWindowDimensions,
} from 'react-native';
import AppTextInput from '../components/AppTextInput';
import Svg, { Path, Defs, LinearGradient as SVGGradient, Stop, Rect } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, getLang, langs, useLang } from '../i18n';
import { api, resolveAssetUrl } from '../api/client';
import * as FileSystem from 'expo-file-system';
import { useTheme, withAlpha, ThemeColors, DEFAULT_THEME_ID } from '../theme';
import { FONTS } from '../theme';
import Toast from '../components/Toast';
import BackArrow from '../components/icons/BackArrow';
import CameraIcon from '../components/icons/CameraIcon';
import ThemePickerModal from '../components/ThemePickerModal';
import LogoutConfirmModal from '../components/LogoutConfirmModal';
import DisableFaceIDModal from '../components/DisableFaceIDModal';
import BgCropModal from '../components/BgCropModal';
import CropModal from '../components/CropModal';
import CloseButton from '../components/CloseButton';
import ButtonPair from '../components/ButtonPair';
import SubmitButton from '../components/SubmitButton';
import LoadingSpinner from '../components/LoadingSpinner';
import ModalOverlay from '../components/ModalOverlay';
import ImagePickerSheet from '../components/ImagePickerSheet';
import { getCurrentUser, getCurrentUserId } from '../utils/storage';
import { pickImages, PickedImage } from '../utils/imagePicker';
import { cacheBackground } from '../utils/backgroundCache';
import { modalClose, MODAL_CARD_RADIUS, switchColors } from '../sharedStyles';
import { isBiometricAvailable, saveCredential, promptBiometric, getCredential, BiometryType } from '../utils/biometric';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import ReAnimated, { useAnimatedStyle, useSharedValue, useAnimatedScrollHandler, interpolate, Extrapolation, withTiming, withSpring, cancelAnimation } from 'react-native-reanimated';

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


function FingerprintIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 1024 1024">
      <Path d="M896 0 770.2528 0l17.1008 17.408L896 17.408c61.1328 0 110.592 49.4592 110.592 110.592l0 107.7248 17.408 16.9984L1024 128C1024 57.344 966.656 0 896 0zM128 1006.592c-61.1328 0-110.592-49.4592-110.592-110.592L17.408 780.8 0 763.4944 0 896c0 70.656 57.344 128 128 128l129.7408 0-16.896-17.408L128 1006.592zM17.408 128C17.408 66.8672 66.8672 17.408 128 17.408l112.128 0 17.408-17.408L128 0C57.344 0 0 57.344 0 128l0 124.928 17.408-16.7936L17.408 128zM1006.592 896c0 61.1328-49.4592 110.592-110.592 110.592L785.408 1006.592l-16.6912 17.408L896 1024c70.656 0 128-57.344 128-128L1024 763.2896l-17.408 17.408L1006.592 896zM160.0512 403.5584c0-10.3424-8.3968-18.8416-18.8416-18.8416-7.0656 0-12.9024 3.8912-15.9744 9.6256l-1.536-0.7168c0 0-42.1888 154.112 5.8368 243.3024l2.048-0.6144c1.8432 7.5776 8.704 13.2096 16.7936 13.2096 9.6256 0 16.9984-7.7824 16.9984-17.408 0-2.3552-0.512-4.608-1.3312-6.656l0.2048-0.1024c0 0-41.0624-109.1584-5.9392-213.8112C159.4368 409.088 160.0512 406.4256 160.0512 403.5584zM836.096 573.44c6.0416 0 11.264-3.072 14.336-7.68l3.2768 1.6384c0 0 9.3184-212.1728-104.1408-301.1584 0 0-144.2816-148.0704-370.5856-63.6928l0 0.1024c-6.144 1.7408-10.24 7.3728-10.24 14.0288 0 8.0896 6.4512 14.6432 14.5408 14.6432 0.4096 0 0.8192-0.1024 1.2288-0.1024l0.1024 0.4096c0 0 205.824-68.8128 330.1376 46.2848 0 0 122.2656 97.5872 104.2432 272.1792l0.512 0.2048c-0.6144 1.7408-0.9216 3.584-0.9216 5.5296C818.3808 565.5552 826.368 573.44 836.096 573.44zM331.9808 746.8032c0.7168-1.7408 1.024-3.6864 1.024-5.7344 0-8.3968-6.7584-15.2576-15.1552-15.2576-6.4512 0-11.6736 3.9936-13.824 9.728l-0.7168-0.3072c-10.1376 33.1776-34.816 75.264-34.816 75.264l0.512 0.3072c-2.9696 3.1744-4.8128 7.4752-4.8128 12.288 0 9.6256 7.7824 17.5104 17.408 17.5104 8.3968 0 15.0528-5.9392 16.6912-13.824 15.36-24.7808 33.9968-79.872 33.9968-79.872L331.9808 746.8032zM343.9616 254.5664l-0.7168-0.7168c2.6624-2.8672 4.4032-6.7584 4.4032-11.0592 0-8.704-7.0656-15.7696-15.7696-15.7696-4.3008 0-8.192 1.7408-10.8544 4.5056l-0.2048-0.1024C140.9024 343.4496 175.9232 573.2352 175.9232 573.2352c18.0224 78.336 0 138.9568 0 138.9568l0.512 0.3072c-2.9696 3.1744-4.9152 7.4752-4.9152 12.288 0 9.6256 7.7824 17.408 17.408 17.408 8.6016 0 15.4624-6.3488 16.7936-14.6432 26.7264-62.3616-0.8192-189.1328-0.8192-189.1328C197.9392 329.9328 343.9616 254.5664 343.9616 254.5664zM153.088 329.216c-2.4576 2.8672-3.9936 6.5536-3.9936 10.6496 0 8.8064 7.0656 15.872 15.7696 15.872 3.8912 0 7.2704-1.4336 10.0352-3.7888l1.1264 1.1264C288.4608 162.816 453.632 150.016 495.9232 150.016c1.4336 0.3072 2.7648 0.512 4.3008 0.512 1.3312 0 2.56-0.1024 3.7888-0.4096 1.4336 0 2.2528 0.1024 2.1504 0.1024l-0.1024-0.8192c6.7584-2.4576 11.4688-8.9088 11.4688-16.5888 0-9.8304-7.8848-17.7152-17.6128-17.7152-1.7408 0-3.3792 0.3072-4.9152 0.8192C253.0304 130.2528 159.1296 316.7232 153.088 329.216zM569.7536 277.8112l0.3072-0.8192c1.7408 0.7168 3.7888 1.1264 5.7344 1.1264 8.2944 0 14.7456-6.7584 14.7456-15.0528 0-6.3488-3.8912-11.776-9.3184-14.0288l0.1024-0.2048c-173.2608-41.0624-278.016 86.8352-278.016 86.8352-81.8176 77.5168-63.6928 220.16-63.6928 220.16 28.5696 115.2-11.5712 202.752-11.5712 202.752l0.3072 0.4096c-2.9696 3.1744-4.7104 7.3728-4.7104 12.0832 0 9.6256 7.7824 17.408 17.408 17.408 3.2768 0 6.3488-1.024 8.9088-2.56l1.2288 1.536c56.7296-78.336 28.9792-208.4864 28.9792-208.4864-27.4432-84.0704 5.7344-162.2016 5.7344-162.2016C376.7296 236.1344 569.7536 277.8112 569.7536 277.8112zM830.0544 712.192c0 9.728 7.8848 17.92 17.6128 17.92 9.728 0 17.3056-8.192 17.3056-17.408l0.2048 0c0 0 4.4032-39.3216 0-92.9792l-1.2288 0.1024c-2.3552-7.0656-8.9088-12.288-16.6912-12.288-9.728 0-17.3056 7.8848-17.3056 17.7152 0 1.6384 0.3072 3.2768 0.7168 4.8128 0.7168 12.6976 2.56 48.8448 0.2048 76.3904C830.3616 708.1984 830.0544 710.144 830.0544 712.192zM581.5296 155.4432l-0.1024 0.7168C845.0048 201.3184 879.616 469.6064 882.3808 495.7184c-0.1024 0.7168-0.2048 1.4336-0.2048 2.1504 0 9.728 8.0896 17.7152 17.8176 17.7152 9.728 0 17.5104-7.8848 17.5104-17.6128L917.504 497.664l-0.2048 0c-20.0704-299.008-277.6064-365.6704-323.1744-375.0912-2.2528-1.024-4.8128-1.6384-7.4752-1.6384-9.728 0-17.3056 7.9872-17.3056 17.7152C569.344 146.5344 574.464 153.088 581.5296 155.4432zM713.4208 451.8912c-2.2528-7.168-8.9088-12.3904-16.7936-12.3904-9.728 0-17.3056 7.8848-17.3056 17.7152 0 1.9456 0.4096 3.8912 1.024 5.632l-0.6144 0.2048c0 0 45.568 121.6512 0.1024 370.2784-2.7648 2.7648-4.5056 6.7584-4.5056 11.0592 0 8.6016 6.9632 15.5648 15.5648 15.5648 4.1984 0 7.8848-1.7408 10.6496-4.4032l1.3312 1.3312c0 0 52.5312-140.6976 11.5712-405.504L713.4208 451.8912zM691.2 399.36c0-6.5536-3.584-12.1856-8.9088-15.36-87.7568-100.352-205.2096-77.312-205.2096-77.312-180.1216 35.6352-179.5072 202.752-179.5072 202.752 30.9248 83.5584 11.5712 156.3648 11.5712 156.3648l0 0c-0.2048 1.1264-0.3072 2.3552-0.3072 3.4816 0 9.6256 7.7824 17.5104 17.408 17.5104 8.9088 0 15.7696-6.656 16.7936-15.36l0.8192 0.1024c21.2992-57.4464-11.5712-167.936-11.5712-167.936 21.1968-147.2512 144.7936-162.2016 144.7936-162.2016 91.648-22.7328 161.1776 43.1104 180.1216 63.5904 2.3552 6.9632 8.9088 11.9808 16.5888 11.9808C683.6224 417.0752 691.2 409.1904 691.2 399.36zM467.456 379.0848c-8.192 0.512-14.4384 7.2704-14.4384 15.6672 0 8.704 7.0656 15.7696 15.7696 15.7696 0.8192 0 1.536-0.1024 2.3552-0.2048l0.2048 0.6144c0 0 127.6928-48.9472 162.2016 98.4064 0 0 20.3776 184.0128-28.672 352.4608-2.8672 2.7648-4.608 6.5536-4.608 10.9568 0 8.2944 6.656 14.9504 14.9504 14.9504 8.192 0 14.5408-6.656 14.5408-14.848 12.3904-47.3088 77.5168-315.392 3.8912-444.5184C633.5488 428.3392 568.1152 343.1424 467.456 379.0848zM789.7088 794.5216c0-0.4096-0.1024-0.9216-0.1024-1.3312l0.3072 0.1024c0 0 12.6976-192.4096-5.7344-330.1376 0 0-29.9008-145.92-139.0592-185.344l-0.2048 0.3072c-1.9456-1.024-4.096-1.6384-6.4512-1.6384-7.7824 0-13.824 6.3488-13.824 14.2336 0 3.6864 1.4336 6.9632 3.7888 9.5232l-0.6144 0.7168c0 0 119.7056 60.1088 127.3856 196.9152 0 0 13.6192 147.8656 0 289.5872l0.9216 0.1024c-0.8192 2.1504-1.3312 4.4032-1.3312 6.8608 0 9.728 7.8848 17.7152 17.6128 17.7152C782.1312 812.2368 789.7088 804.2496 789.7088 794.5216zM523.4688 787.456c0 0 37.4784-115.9168 5.7344-283.8528l-1.024 0.3072c-3.072-5.5296-8.8064-9.216-15.5648-9.216-9.8304 0-17.408 7.9872-17.408 17.92 0 0.7168 0.1024 1.536 0.2048 2.2528l-0.9216 0.3072c0 0 36.352 149.9136-5.7344 260.7104l1.3312 0.4096c-1.1264 2.3552-1.8432 5.0176-1.8432 7.8848 0 9.6256 7.7824 17.408 17.408 17.408 8.6016 0 15.4624-6.3488 16.7936-14.5408L523.4688 787.456zM465.5104 578.9696c-26.0096-124.416 46.3872-121.6512 46.3872-121.6512 82.6368-3.072 57.9584 185.344 57.9584 185.344l0.512 0.1024c-0.512 1.6384-0.9216 3.2768-0.9216 5.0176 0 8.192 6.5536 14.848 14.7456 14.848 7.8848 0 14.0288-6.2464 14.336-14.2336l0.2048 0c6.0416-69.5296-5.7344-144.7936-5.7344-144.7936-27.4432-93.2864-110.08-63.6928-110.08-63.6928C406.8352 461.1072 442.368 619.52 442.368 619.52c20.8896 125.44-52.1216 249.0368-52.1216 249.0368l0.512 0.3072c-2.9696 3.1744-4.8128 7.4752-4.8128 12.288 0 9.6256 7.7824 17.408 17.408 17.408 8.4992 0 15.2576-6.0416 16.6912-14.0288C500.5312 737.9968 465.5104 578.9696 465.5104 578.9696zM486.8096 825.0368c-3.4816 0-6.656 1.3312-9.0112 3.4816l-0.7168-0.512c0 0-21.504 38.0928-28.2624 50.8928-3.072 2.7648-5.0176 6.7584-5.0176 11.264 0 8.2944 6.656 14.9504 14.848 14.9504 5.632 0 10.24-3.1744 12.6976-7.68 1.2288-2.56 21.2992-18.432 28.8768-52.0192l-0.4096-0.3072c0.8192-1.7408 1.2288-3.6864 1.2288-5.8368C501.0432 831.488 494.6944 825.0368 486.8096 825.0368zM424.96 439.9104l-0.7168-0.512c0.9216-1.9456 1.4336-3.9936 1.4336-6.2464 0-7.7824-6.2464-14.1312-14.1312-14.1312-3.6864 0-6.9632 1.4336-9.4208 3.7888l-0.3072-0.3072c-54.272 43.52-28.9792 173.7728-28.9792 173.7728 27.4432 112.64-40.5504 237.4656-40.5504 237.4656l0 0c-2.6624 2.8672-4.4032 6.8608-4.4032 11.1616 0 8.9088 7.168 16.1792 16.0768 16.1792 4.4032 0 8.192-1.7408 11.0592-4.608l0.4096 0.4096c57.6512-93.696 57.9584-225.8944 57.9584-225.8944C374.1696 483.6352 424.96 439.9104 424.96 439.9104zM584.2944 697.2416c-8.192 0-14.4384 6.8608-14.4384 15.0528 0 0 0-0.7168 0 0.3072l0 0c0 0-6.5536 110.592-46.2848 167.7312l0.4096 0.1024c-3.072 3.1744-4.8128 7.3728-4.8128 12.1856 0 9.6256 7.7824 17.408 17.408 17.408 8.192 0 14.848-5.7344 16.5888-13.4144 4.4032-6.0416 32.0512-48.8448 45.2608-180.224 0.4096-1.4336 0.7168-2.8672 0.7168-4.4032C599.04 703.8976 592.384 697.2416 584.2944 697.2416z" fill={color} />
    </Svg>
  );
}

/* ════════════ MAIN ════════════ */

export default function ProfileScreen({ onBack, onLogout, onLangChange, onManageUsers, onAvatarChange, refreshKey }: Props) {
  const insets = useSafeAreaInsets();
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
  const [biometryType, setBiometryType] = useState<BiometryType | null>(null);
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
  const [showDisableFaceIDModal, setShowDisableFaceIDModal] = useState(false);
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
  const FREEZE_POINT = 92;
  // ── Scroll-driven cover animation — all on UI thread via Reanimated ──
  const scrollY = useSharedValue(0);
  // Pull-down displacement: direct sqrt damping while dragging,
  // spring rebound on release (decoupled from the scroll view's bounce curve)
  const pullD = useSharedValue(0);
  const dragging = useSharedValue(false);
  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => {
      dragging.value = true;
      cancelAnimation(pullD);
    },
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
      if (dragging.value) {
        const y = e.contentOffset.y;
        pullD.value = y < 0 ? Math.sqrt(-y) * 4.472 : 0;
      }
    },
    onEndDrag: () => {
      dragging.value = false;
      pullD.value = withSpring(0, { damping: 13, stiffness: 170, mass: 0.9 });
    },
  });
  // Cover slides up when scrolling past cover, stays at top on pull-down
  const coverStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [-200, 0, FREEZE_POINT], [0, 0, -FREEZE_POINT], Extrapolation.CLAMP) }],
  }));
  // Pull-down stretch: true sqrt damping + uniform scale (was piecewise approx)
  const coverFade = useSharedValue(0);
  const coverLoaded = useRef(false);
  useEffect(() => {
    coverLoaded.current = false;
    coverFade.value = 0;
  }, [coverUrl]);
  const coverImgStyle = useAnimatedStyle(() => {
    // Clamp tiny spring overshoot so scale never dips below 1 (no edge gap)
    const d = Math.max(pullD.value, 0);
    return {
      opacity: coverFade.value,
      transform: [{ translateY: d }, { scale: 1 + d / 110 }],
    };
  });
  // Blur overlay fades in as you scroll up — opacity-only, no re-renders
  const blurOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 20], [0, 1], Extrapolation.CLAMP),
  }));
  // Cover overlay UI (更换封面 button + avatar) rides along with pull-down stretch
  const coverFollowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(pullD.value, 0) }],
  }));

    // Modal keyboard push
  const { height: screenH, width: screenW } = useWindowDimensions();
  const coverHeight = Math.round(screenW * 260 / 360);
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
      if (typeof data?.session_timeout_hours === 'number' && [1, 2, 6, 24, 72].includes(data.session_timeout_hours)) {
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

  // Face ID — iOS Keychain only, independent from web WebAuthn.
  const loadFaceIDStatus = async () => {
    try {
      const { available, biometryType: type } = await isBiometricAvailable();
      setFaceAvailable(available);
      setBiometryType(type ?? null);
      if (!available) return;

      // Keychain: iOS biometric credential (local-only).
      // Must belong to the currently logged-in user.
      let keychainHas = false;
      try {
        const currentUser = getCurrentUser();
        const cred = await getCredential(currentUser);
        keychainHas = !!(cred && cred.username === currentUser);
      } catch {}

      setHasFaceID(keychainHas);
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
      setShowDisableFaceIDModal(true);
    }
  };

  const enrollFaceID = async () => {
    if (!faceIDPassword) {
      setFaceIDError(t('errEmptyFields'));
      return;
    }
    // Enforce the same password rules as registration (8+ chars, letter,
    // digit, special char). All accounts are created under these rules, so
    // an input that fails them can't be a valid password — reject locally
    // without a network round-trip.
    if (!isPwValid(faceIDPassword)) {
      setFaceIDError(t('errPwRequirements'));
      return;
    }
    setFaceIDLoading(true);
    try {
      const username = getCurrentUser() || '';
      // 1. Verify the password against the server BEFORE storing it in
      //    Keychain. Otherwise a wrong password gets saved and every future
      //    Face ID login silently fails (it replays the stored password).
      //    Uses the side-effect-free /profile/verify-password endpoint
      //    (does NOT create a session or trigger login rate-limiting).
      try {
        const vr = await api.verifyPassword(faceIDPassword);
        if (!vr || vr.status !== 'ok') {
          setFaceIDError(t('errWrongPassword'));
          setFaceIDLoading(false);
          return;
        }
      } catch {
        setFaceIDError(t('errWrongPassword'));
        setFaceIDLoading(false);
        return;
      }
      // 2. Password confirmed — now prompt biometric.
      const enrollPrompt = biometryType === 'fingerprint'
        ? t('fingerprintEnrollPrompt') || '启用指纹登录'
        : t('faceIDEnrollPrompt') || '启用面容登录';
      const { success, error } = await promptBiometric(enrollPrompt);
      if (!success) {
        setFaceIDLoading(false);
        return;
      }
      const { ok, error: saveErr } = await saveCredential(username, faceIDPassword);
      if (ok) {
        const verify = await getCredential(username);
        if (!verify) {
          setFaceIDError('Keychain 写入失败，请重试');
          setFaceIDLoading(false);
          return;
        }
        setHasFaceID(true);
        setShowFaceIDSetup(false);
        setFaceIDPassword('');
      } else {
        setFaceIDError(saveErr || t('toastSubmitFailed'));
      }
    } catch {
      setFaceIDError(t('toastSubmitFailed'));
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
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [showCoverSheet, setShowCoverSheet] = useState(false);
  const [pickOffsetX, setPickOffsetX] = useState(0);
  const [pickOffsetY, setPickOffsetY] = useState(0);
  const avatarRef = useRef<any>(null);

  const openAvatarPicker = () => {
    (avatarRef.current as any)?.measureInWindow?.((x: number, y: number, _w: number, h: number) => {
      setPickOffsetX(Math.max(8, (x || 16) + (_w || 0) - 160));
      setPickOffsetY(Math.max(y - 20, 60));
      setShowAvatarSheet(true);
    }) || setShowAvatarSheet(true);
  };

  const handleAvatarPicked = (img: PickedImage | null) => {
    if (!img) return;
    setAvatarCropSrc(img.uri);
    setShowAvatarCrop(true);
  };

  const handleAvatarPress = async () => {
    if (uploadingAvatar) return;
    openAvatarPicker();
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
        onAvatarChange?.();
      }
    } catch (err: any) {
    } finally {
      setUploadingAvatar(false);
      setShowAvatarPreview(false);
    }
  };

  const handleCoverPress = async () => {
    if (uploadingCover) return;
    setShowCoverSheet(true);
  };

  const handleCoverPicked = (img: PickedImage | null) => {
    if (!img) return;
    setCoverCropSrc(img.uri);
    setShowCoverCrop(true);
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
      }
    } catch (err: any) {
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
        // Download to local FileSystem for instant next-load
        try { await cacheBackground(resolved); } catch {}
        try { localStorage.setItem('__bg_changed_ts', String(Date.now())); } catch {}
        if (typeof window !== 'undefined' && typeof (window as any).dispatchEvent === 'function') {
          (window as any).dispatchEvent(new CustomEvent('bg-changed', { detail: { url: resolved } }));
        }
      } else {
      }
    } catch {
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
    } catch (err: any) {
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
      if (!rawUid) { setDeleteLoading(false); setShowDeleteModal(false); return; }
      await api.deleteAccount(Number(rawUid));
      setShowDeleteModal(false);
      setDeleteConfirmUsername('');
    } catch (err: any) {
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
    <>
    <View style={st.root}>
      {/* Nav bar — always visible, fixed at top */}
      <View
        style={[
          st.navBar,
          { backgroundColor: 'transparent', paddingTop: insets.top },
        ]}
        pointerEvents="auto">
        <TouchableOpacity onPress={onBack} style={st.navBackBtn} activeOpacity={0.7}>
          <BackArrow color="#fff" />
        </TouchableOpacity>
        <Text style={[st.navTitle, { color: '#fff' }]}>{t('editProfile')}</Text>
      </View>
      {/* ── Cover — absolutely positioned, slides up 92px then freezes ── */}
      <ReAnimated.View
        style={[{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
        }, coverStyle]}
      >
        <TouchableOpacity
        style={[st.coverWrap, { height: coverHeight }]}
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
          <ReAnimated.Image
            key={coverUrl}
            source={{ uri: coverUrl }}
            onLoad={() => {
              if (coverLoaded.current) return;
              coverLoaded.current = true;
              coverFade.value = withTiming(1, { duration: 300 });
            }}
            style={[
              st.coverImg,
              { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
              coverImgStyle,
            ]}
          />
        ) : null}

        {/* Scroll-up blur overlay — always mounted, opacity animated on UI thread */}
        <ReAnimated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, blurOverlayStyle]}>
          <BlurView
            intensity={10}
            tint="dark"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        </ReAnimated.View>

        {/* "更换封面" button — follows pull-down stretch */}
        <ReAnimated.View style={[st.coverOverlay, coverFollowStyle]}>
          <CameraIcon color="#fff" size={14} strokeWidth={2} />
          <Text style={st.coverOverlayText}>{uploadingCover ? '...' : t('editCover') || '更换封面'}</Text>
        </ReAnimated.View>

        {/* Avatar — overlaps cover bottom, follows pull-down stretch */}
        <ReAnimated.View style={[st.avatarFloat, coverFollowStyle]}>
          <TouchableOpacity ref={avatarRef} onPress={handleAvatarPress} activeOpacity={0.8} disabled={uploadingAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={st.avatar} />
            ) : (
              <Image source={{ uri: resolveAssetUrl('/img/logo.jpg') || '/img/logo.jpg' }} style={st.avatar} />
            )}
          </TouchableOpacity>
        </ReAnimated.View>
      </TouchableOpacity>
      </ReAnimated.View>
      <ReAnimated.ScrollView style={st.scroll} showsVerticalScrollIndicator={false}
        bounces={true} alwaysBounceVertical={true}
        onScroll={scrollHandler}
        scrollEventThrottle={16}>
        {/* Spacer — keeps content below the absolutely-positioned cover */}
        <View style={{ height: coverHeight }} />

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
                  {biometryType === 'fingerprint' ? <FingerprintIcon color={colors.primary} /> : <FaceIDIcon color={colors.primary} />}
                </View>
                <Text style={st.authLabel}>{biometryType === 'fingerprint' ? (t('fingerprintLabel') || '指纹登录') : (t('faceIDLabel') || '面容登录')}</Text>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Switch
                    value={hasFaceID}
                    onValueChange={toggleFaceID}
                    {...switchColors(colors)}
                    disabled={faceIDLoading}
                    style={{ transform: [{ scale: 0.75 }] }}
                  />
                </View>
              </View>
              <Text style={st.authDesc}>{biometryType === 'fingerprint' ? (t('fingerprintDesc') || '使用指纹快速登录') : (t('faceIDDesc') || '使用面容快速登录')}</Text>
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
                  {...switchColors(colors)}
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
              {[1, 2, 6, 24, 72].map(h => {
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
      </ReAnimated.ScrollView>

      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />

      {/* ══════ Logout modal ══════ */}
      <LogoutConfirmModal visible={showLogoutModal} onClose={() => setShowLogoutModal(false)} onLogout={onLogout} />

      {/* ══════ Disable Face ID modal ══════ */}
      <DisableFaceIDModal
        visible={showDisableFaceIDModal}
        onClose={() => setShowDisableFaceIDModal(false)}
        onDisabled={() => { setShowDisableFaceIDModal(false); setHasFaceID(false); }}
        username={username}
        biometryType={biometryType}
      />

      {/* ══════ Admin block modal ══════ */}
      <ModalOverlay visible={showAdminBlockModal} onClose={() => setShowAdminBlockModal(false)} animation="blurMorph">
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
                <Text style={{ color: '#fff', fontSize: FONTS.sub.size, fontWeight: 'bold' }}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
      </ModalOverlay>

      {/* ══════ Partner block modal ══════ */}
      <ModalOverlay visible={showPartnerBlockModal} onClose={() => setShowPartnerBlockModal(false)} animation="blurMorph">
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
                <Text style={{ color: '#fff', fontSize: FONTS.sub.size, fontWeight: 'bold' }}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
      </ModalOverlay>

      {/* ══════ Delete account modal ══════ */}
      <ModalOverlay visible={showDeleteModal} onClose={() => setShowDeleteModal(false)} animation="blurMorph">
          <View style={mo.card}>
            <View style={mo.header}>
              <Text style={mo.title}>{t('deleteAccountConfirmTitle')}</Text>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                <Text style={mo.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={mo.body}>
              <Text style={{ color: colors.textMain, fontSize: FONTS.sub.size, lineHeight: 22, marginBottom: 8 }}>
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
                  <Text style={mo.confirmText}>
                    {deleteLoading ? <LoadingSpinner label={false} size={20} color="#fff" /> : t('deleteAccountBtn')}
                  </Text>
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
                    style={[mo.input, { textAlign: 'center', letterSpacing: 8, fontSize: FONTS.amount.size, fontWeight: '700' }]}
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
              <Text style={{ fontSize: FONTS.large.size, color: '#1B7A4A' }}>✓</Text>
            </View>
            <Text style={{ fontSize: FONTS.sub.size, fontWeight: '600', color: '#fff' }}>{t('avatarUpdated')}</Text>
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-end' }}>
              {[80, 48, 32].map(size => (
                <View key={size} style={{ alignItems: 'center', gap: 6 }}>
                  <Image source={{ uri: avatarCropResult }} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
                  <Text style={{ fontSize: FONTS.tiny.size, color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>{size}px</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.4)' }}>{t('avatarSizeHint')}</Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' }}
                onPress={() => { avatarRecropRef.current = true; setShowAvatarPreview(false); }}>
                <Text style={{ fontSize: FONTS.small.size, fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>{t('recrop')}</Text>
              </TouchableOpacity>
              <SubmitButton
                onPress={handleAvatarUpload}
                loading={uploadingAvatar}
                label={t('confirmUse')}
                style={{ flex: 2, padding: 12, borderRadius: 10, backgroundColor: '#5B5BD6', alignItems: 'center' }}
                textStyle={{ fontSize: FONTS.small.size, fontWeight: '600', color: '#fff' }}
              />
            </View>
          </View>
      </ModalOverlay>
      {/* Cover preview modal — springScale, matches ThemePickerModal */}
      <ModalOverlay visible={showCoverPreview && coverCropResult !== ''} onClose={() => { coverRecropRef.current = false; setShowCoverPreview(false); }} onClosed={() => { if (coverRecropRef.current) { coverRecropRef.current = false; setShowCoverCrop(true); setCoverCropResult(''); } else { setCoverCropSrc(''); setCoverCropResult(''); } }} animation="springScale" backdropColor="rgba(8,8,12,0.92)">
        <View style={{ backgroundColor: 'rgba(28,28,32,0.95)', borderRadius: MODAL_CARD_RADIUS, padding: 24, width: Math.min(screenW * 0.85, 360), alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' as any }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(27,122,74,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: FONTS.large.size, color: '#1B7A4A' }}>✓</Text>
            </View>
            <Text style={{ fontSize: FONTS.sub.size, fontWeight: '600', color: '#fff' }}>{t('coverUpdated')}</Text>
            <Image source={{ uri: coverCropResult }} style={{ width: Math.min(screenW * 0.7, 300), height: Math.round(Math.min(screenW * 0.7, 300) * 260 / 360), borderRadius: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' }} resizeMode="cover" />
            <Text style={{ fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.4)' }}>{t('coverHint')}</Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' }}
                onPress={() => { coverRecropRef.current = true; setShowCoverPreview(false); }}>
                <Text style={{ fontSize: FONTS.small.size, fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>{t('recrop')}</Text>
              </TouchableOpacity>
              <SubmitButton
                onPress={handleCoverUpload}
                loading={uploadingCover}
                label={t('confirmUse')}
                style={{ flex: 2, padding: 12, borderRadius: 10, backgroundColor: '#5B5BD6', alignItems: 'center' }}
                textStyle={{ fontSize: FONTS.small.size, fontWeight: '600', color: '#fff' }}
              />
            </View>
          </View>
      </ModalOverlay>
      {/* BG preview modal — springScale, matches ThemePickerModal */}
      <ModalOverlay visible={showBgPreview && bgCropResult !== ''} onClose={() => { bgRecropRef.current = false; setShowBgPreview(false); }} onClosed={() => { if (bgRecropRef.current) { bgRecropRef.current = false; setShowBgCrop(true); setBgCropResult(''); } else { setBgCropSrc(''); setBgCropResult(''); } }} animation="springScale" backdropColor="rgba(8,8,12,0.92)">
        <View style={{ backgroundColor: 'rgba(28,28,32,0.95)', borderRadius: MODAL_CARD_RADIUS, padding: 24, width: 360, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' as any }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(27,122,74,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: FONTS.large.size, color: '#1B7A4A' }}>✓</Text>
            </View>
            <Text style={{ fontSize: FONTS.sub.size, fontWeight: '600', color: '#fff' }}>{t('bgUpdated') || '背景已更新'}</Text>
            <Image source={{ uri: bgCropResult }} style={{ width: 130, height: 280, borderRadius: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' }} resizeMode="cover" />
            <Text style={{ fontSize: FONTS.micro.size, color: 'rgba(255,255,255,0.4)' }}>{t('bgResultHint') || '点击确认后将从照片中直接选取'}</Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' }}
                onPress={() => { bgRecropRef.current = true; setShowBgPreview(false); }}>
                <Text style={{ fontSize: FONTS.small.size, fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>{t('recrop') || '再编辑'}</Text>
              </TouchableOpacity>
              <SubmitButton
                onPress={handleBgUpload}
                loading={uploadingCover}
                label={t('confirmUse') || '确认使用'}
                style={{ flex: 2, padding: 12, borderRadius: 10, backgroundColor: '#5B5BD6', alignItems: 'center' }}
                textStyle={{ fontSize: FONTS.small.size, fontWeight: '600', color: '#fff' }}
              />
            </View>
          </View>
      </ModalOverlay>
      {/* Face ID setup modal */}
      <ModalOverlay visible={showFaceIDSetup} onClose={() => { setShowFaceIDSetup(false); setFaceIDPassword(''); setFaceIDError(''); }} animation="springScale">
        <ReAnimated.View style={modalPushStyleEmail}>
          <View style={mo.card}>
            <View style={mo.header}>
              <Text style={mo.title}>{biometryType === 'fingerprint' ? (t('fingerprintLabel') || '指纹登录') : (t('faceIDLabel') || '面容登录')}</Text>
              <TouchableOpacity onPress={() => { setShowFaceIDSetup(false); setFaceIDPassword(''); setFaceIDError(''); }}>
                <Text style={mo.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={mo.body}>
              <Text style={{ color: colors.textMain, fontSize: FONTS.sub.size, lineHeight: 22, textAlign: 'center', marginBottom: 8 }}>
                {biometryType === 'fingerprint' ? '请输入密码以启用指纹登录' : '请输入密码以启用面容登录'}
              </Text>
              <AppTextInput
                style={mo.input}
                placeholder={t('password')}
                placeholderTextColor={colors.textSub}
                secureTextEntry
                value={faceIDPassword}
                onChangeText={(t) => { setFaceIDPassword(t); setFaceIDError(''); }}
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
                  <Text style={mo.confirmText}>
                    {faceIDLoading ? <LoadingSpinner label={false} size={20} color="#fff" /> : t('confirm')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ReAnimated.View>
      </ModalOverlay>
    </View>

    <ImagePickerSheet
      visible={showAvatarSheet}
      onClose={() => setShowAvatarSheet(false)}
      onPicked={handleAvatarPicked}
      showFileOption
      offsetY={pickOffsetY}
      offsetX={pickOffsetX}
    />
    <ImagePickerSheet
      visible={showCoverSheet}
      onClose={() => setShowCoverSheet(false)}
      onPicked={handleCoverPicked}
      showFileOption
      position="center"
    />
    </>
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
    paddingHorizontal: 16, paddingBottom: 12,
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
  coverOverlayText: { fontSize: FONTS.micro.size, fontWeight: '500', color: '#fff' },
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
  profileEmail: { fontSize: FONTS.micro.size, color: colors.textSub, marginTop: 4 },
  signatureText: { fontSize: FONTS.micro.size, color: colors.textSub, marginTop: 6, transform: [{ skewX: '-8deg' }] },
  signatureEditRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8,
  },
  signatureInput: {
    flex: 1, fontSize: FONTS.small.size, color: colors.textMain,
    paddingVertical: 4, borderWidth: 0,
  } as any,
  // Cards & sections
  card: {
    marginTop: 4, backgroundColor: colors.surface,
    borderRadius: 12, paddingVertical: 2,
  },
  section: { paddingHorizontal: 20, marginTop: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  sectionTitleText: { fontSize: FONTS.tiny.size, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: colors.textSub },
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
  badgeText: { fontSize: FONTS.small.size, fontWeight: '500', color: colors.textSub },
  langBtn: { fontSize: FONTS.small.size, fontWeight: FONTS.micro.weight, color: colors.textSub },
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
    fontSize: FONTS.micro.size, color: colors.textSub, lineHeight: 16, marginLeft: 42,
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
  capsuleText: { fontSize: FONTS.small.size, color: colors.textSub, fontWeight: '500' },
  capsuleTextActive: { color: colors.primary, fontWeight: '600' },
  unreviewedBadge: {
    backgroundColor: colors.danger, borderRadius: 10,
    minWidth: 20, height: 20, paddingHorizontal: 6,
    justifyContent: 'center', alignItems: 'center', marginLeft: 4,
  },
  unreviewedBadgeText: { color: '#fff', fontSize: FONTS.micro.size, fontWeight: '700' },
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
  stampPre: { fontSize: FONTS.small.size, color: colors.textSub, letterSpacing: 0.5, lineHeight: 48, textAlign: 'center' },
  stampNum: { fontSize: FONTS.stamp.size, fontWeight: '700', fontStyle: 'italic' as any },
});

const getMo = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: withAlpha(colors.textMain, 0.4),
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: MODAL_CARD_RADIUS,
    width: 340, maxWidth: '90%', overflow: 'hidden' as any,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: FONTS.sub.size, fontWeight: '700', color: colors.surface },
  close: { ...modalClose },
  body: { padding: 24, gap: 18 } as any,
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
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
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
  confirmText: { fontSize: FONTS.sub.size, fontWeight: '600', color: colors.surface },
});