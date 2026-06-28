import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme, ThemeColors, withAlpha, FONTS } from '../theme';
import { t } from '../i18n';

import ThemePicker from './ThemePicker';
import ThemeOpacitySlider from './ThemeOpacitySlider';
import CloseButton from './CloseButton';
import BgCropModal from './BgCropModal';
import { useEffect, useRef, useState } from 'react';
import { pickImages } from '../utils/imagePicker';

interface ThemePickerModalProps {
  visible: boolean;
  onClose: () => void;
  // Theme tools
  showCoverTools?: boolean;
  coverOpacity?: number;
  onCoverOpacityChange?: (v: number) => void;
  // Receives a cropped File when user confirms in the BgCropModal preview.
  // Caller is responsible for uploading (e.g. api.uploadBackground).
  onCoverImagePicked?: (file: any) => Promise<void> | void;
  // Optional: reset to default (e.g. api.resetBackground / api.resetProfileCover).
  onResetCover?: () => Promise<void> | void;
  coverUploading?: boolean;
}

function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 500, backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center', alignItems: 'center',
    },
    card: {
      backgroundColor: colors.surface, borderRadius: 16, width: 340, maxWidth: '90%',
      overflow: 'hidden' as any,
    },
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20, paddingVertical: 14,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    title: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.surface },
    body: { padding: 24 },
    hint: { fontSize: FONTS.micro.size, color: colors.textSub, textAlign: 'center' as any },
    btnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    bgBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' as any },
    bgBtnOutline: { borderWidth: 1, borderColor: colors.primary },
    bgBtnOutlineText: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight },
    bgBtnDanger: { borderWidth: 1, borderColor: withAlpha(colors.primary, 0.2), backgroundColor: withAlpha(colors.primary, 0.06) },
    bgBtnDangerText: { fontSize: FONTS.micro.size, color: colors.primary, fontWeight: FONTS.micro.weight },
  });
}

export default function ThemePickerModal({
  visible, onClose,
  showCoverTools, coverOpacity, onCoverOpacityChange,
  onCoverImagePicked, onResetCover, coverUploading,
}: ThemePickerModalProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(-300)).current;
  const [show, setShow] = React.useState(false);
  const [showCrop, setShowCrop] = useState(false);
  // imageSrc is the URI the user picked via the image picker. It is
  // passed to BgCropModal. The image picker lives HERE so that clicking
  // the "选择图片" button opens the system picker immediately.
  const [imageSrc, setImageSrc] = useState('');
  const [pickedFile, setPickedFile] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      setShow(true);
      fade.setValue(0);
      slide.setValue(-300);
      Animated.parallel([
        Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (show) {
      Animated.parallel([
        Animated.timing(slide, { toValue: -300, duration: 180, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setShow(false));
    }
  }, [visible]);

  const handleClose = () => {
    setShowCrop(false);
    setImageSrc('');
    setPickedFile(null);
    Animated.parallel([
      Animated.timing(slide, { toValue: -300, duration: 180, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => { setShow(false); onClose(); });
  };

  const handlePickImage = async () => {
    try {
      const picked = await pickImages({ multiple: false });
      if (!picked || picked.length === 0) return;
      const file = picked[0];
      setPickedFile(file);
      setImageSrc(file.uri);
      setShowCrop(true);
    } catch {
      // Permission denied / cancelled
    }
  };

  if (!show) return null;

  const opacityValue = coverOpacity ?? 1;
  const opacityPct = Math.round(opacityValue * 100);

  return (
    <Animated.View style={[styles.overlay as any, { opacity: fade }]}>
      <Animated.View style={[styles.card as any, { transform: [{ translateY: slide }] }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{showCoverTools ? t('bgSettings') : (t('themeLabel') || '主题')}</Text>
          <CloseButton onPress={handleClose} />
        </View>
        <View style={styles.body}>

          {/* ── Cover image tools (ProfileScreen only) ── */}
          {showCoverTools && (
            <Text style={styles.hint}>{t('bgHint')}</Text>
          )}

          {/* ── Theme Picker ── */}
          <View style={{ marginTop: showCoverTools ? 12 : 0 }}>
            <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight, marginBottom: 10 }}>
              {t('themePicker') || '主题'}
            </Text>
            <ThemePicker onSelect={handleClose} />
          </View>

          {/* ── Opacity slider (ProfileScreen only) — matches web track+fill+range input ── */}
          {showCoverTools && (
            <View style={{ marginTop: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight }}>{t('opacity')}</Text>
                <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: colors.primary }}>{opacityPct}%</Text>
              </View>
              <ThemeOpacitySlider value={opacityValue} onChange={onCoverOpacityChange || (() => {})} colors={colors} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub }}>0</Text>
                <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub }}>50</Text>
                <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub }}>100</Text>
              </View>
            </View>
          )}

          {/* ── Image buttons (ProfileScreen only) ── */}
          {showCoverTools && (
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.bgBtn, styles.bgBtnOutline]}
                disabled={coverUploading}
                onPress={handlePickImage}
              >
                <Text style={styles.bgBtnOutlineText}>{coverUploading ? t('uploading') : t('chooseImage')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bgBtn, styles.bgBtnDanger]}
                disabled={coverUploading}
                onPress={onResetCover}
              >
                <Text style={styles.bgBtnDangerText}>{t('resetDefault')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Background image crop modal (RN-native). The image picker is
          handled by handlePickImage above; BgCropModal just renders
          whatever imageSrc it's given. */}
      <BgCropModal
        visible={showCrop}
        onClose={() => { setShowCrop(false); setImageSrc(''); setPickedFile(null); }}
        imageSrc={imageSrc}
        onClearImage={() => { setImageSrc(''); setPickedFile(null); }}
        onUploaded={handleClose}
        onConfirm={async (file) => {
          if (!onCoverImagePicked) return;
          await onCoverImagePicked(file);
          setShowCrop(false);
          setImageSrc('');
          setPickedFile(null);
        }}
      />
    </Animated.View>
  );
}
