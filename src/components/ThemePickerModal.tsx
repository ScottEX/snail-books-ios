import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, ThemeColors, FONTS, DEFAULT_THEME_ID } from '../theme';
import { MODAL_CARD_RADIUS } from '../sharedStyles';
import { t } from '../i18n';
import { api } from '../api/client';

import ThemePicker from './ThemePicker';
import Slider from '@react-native-community/slider';
import CloseButton from './CloseButton';
import BgCropModal from './BgCropModal';
import ModalOverlay from './ModalOverlay';
import { useState } from 'react';
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
    card: {
      backgroundColor: colors.surface, borderRadius: MODAL_CARD_RADIUS,
      width: 340, maxWidth: '90%',
      overflow: 'hidden' as any,
    },
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20, paddingVertical: 14,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    title: { fontSize: 14, fontWeight: '700', color: colors.surface },
    body: { padding: 20, paddingTop: 16, gap: 0 } as any,
    hint: { fontSize: FONTS.micro.size, color: colors.textSub, lineHeight: 20 },
    btnRow: { flexDirection: 'row', gap: 10, marginTop: 18 } as any,
    bgBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 10,
      justifyContent: 'center', alignItems: 'center',
    },
    bgBtnOutline: {
      borderWidth: 1, borderColor: colors.primary, backgroundColor: 'transparent',
    },
    bgBtnOutlineText: { fontSize: 13, fontWeight: '600', color: colors.primary },
    bgBtnDanger: {
      borderWidth: 1, borderColor: colors.danger, backgroundColor: 'transparent',
    },
    bgBtnDangerText: { fontSize: 13, fontWeight: '600', color: colors.danger },
  });
}

export default function ThemePickerModal({
  visible, onClose,
  showCoverTools, coverOpacity, onCoverOpacityChange,
  onCoverImagePicked, onResetCover, coverUploading,
}: ThemePickerModalProps) {
  const { colors, setTheme } = useTheme();
  const styles = getStyles(colors);
  const [showCrop, setShowCrop] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const [pickedFile, setPickedFile] = useState<any>(null);
  const [resetting, setResetting] = useState(false);

  // ── Shared "reset to default" logic ──
  const handleResetDefault = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      setTheme(DEFAULT_THEME_ID);
      await api.resetBackground();
      try {
        const { getCurrentUserId } = require('../utils/storage');
        const uid = getCurrentUserId();
        localStorage.setItem(uid ? `bg-opacity-${uid}` : 'bg-opacity', '0');
        api.saveBackgroundSettings({ opacity: 0 }).catch(() => {});
      } catch {}
      try { localStorage.removeItem('bg-image'); } catch {}
      try { localStorage.setItem('__theme_reset_ts', String(Date.now())); } catch {}
      if (typeof (window as any).dispatchEvent === 'function') {
        (window as any).dispatchEvent(new CustomEvent('bg-changed', { detail: { url: '' } }));
      }
      await onResetCover?.();
    } finally {
      setResetting(false);
    }
  };

  const handleClose = () => {
    setShowCrop(false);
    setImageSrc('');
    setPickedFile(null);
    onClose();
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

  const opacityValue = coverOpacity ?? 1;
  const opacityPct = Math.round(opacityValue * 100);

  return (
    <>
      <ModalOverlay visible={visible} onClose={handleClose} animation="springScale">
        <View style={styles.card}>
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
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0}
                maximumValue={1}
                step={0.05}
                value={opacityValue}
                onValueChange={(v) => onCoverOpacityChange?.(Math.round(v * 20) / 20)}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.secondary}
                thumbTintColor={colors.primary}
              />
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
                disabled={coverUploading || resetting}
                onPress={handleResetDefault}
              >
                <Text style={styles.bgBtnDangerText}>{t('resetDefault')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      </ModalOverlay>

      {/* Background image crop modal (RN-native). The image picker is
          handled by handlePickImage above; BgCropModal just renders
          whatever imageSrc it's given. */}
      <BgCropModal
        visible={showCrop}
        src={imageSrc}
        onCancel={() => { setShowCrop(false); setImageSrc(''); setPickedFile(null); }}
        onConfirm={async (dataUri: string) => {
          if (!onCoverImagePicked) return;
          const file = { uri: dataUri, type: 'image/jpeg', name: 'background.jpg' };
          await onCoverImagePicked(file);
          setShowCrop(false);
          setImageSrc('');
          setPickedFile(null);
        }}
      />
    </>
  );
}
