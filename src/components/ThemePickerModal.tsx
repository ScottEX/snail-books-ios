import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, ThemeColors, FONTS, DEFAULT_THEME_ID } from '../theme';
import { MODAL_CARD_RADIUS } from '../sharedStyles';
import { t } from '../i18n';
import { api } from '../api/client';
import * as DocumentPicker from 'expo-document-picker';

import ThemePicker from './ThemePicker';
import Slider from '@react-native-community/slider';
import CloseButton from './CloseButton';
import ModalOverlay from './ModalOverlay';
import CustomActionSheet from './CustomActionSheet';
import { pickImages, takePhoto, PickedImage } from '../utils/imagePicker';

interface ThemePickerModalProps {
  visible: boolean;
  onClose: () => void;
  showCoverTools?: boolean;
  coverOpacity?: number;
  onCoverOpacityChange?: (v: number) => void;
  onCoverImagePicked?: (file: PickedImage) => Promise<void> | void;
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
    title: { fontSize: FONTS.sub.size, fontWeight: '700', color: colors.surface },
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
    bgBtnOutlineText: { fontSize: FONTS.small.size, fontWeight: '600', color: colors.primary },
    bgBtnDanger: {
      borderWidth: 1, borderColor: colors.danger, backgroundColor: 'transparent',
    },
    bgBtnDangerText: { fontSize: FONTS.small.size, fontWeight: '600', color: colors.danger },
  });
}

export default function ThemePickerModal({
  visible, onClose,
  showCoverTools, coverOpacity, onCoverOpacityChange,
  onCoverImagePicked, onResetCover, coverUploading,
}: ThemePickerModalProps) {
  const { colors, setTheme } = useTheme();
  const styles = getStyles(colors);
  const [resetting, setResetting] = useState(false);
  const [showPickerSheet, setShowPickerSheet] = useState(false);
  const fastClose = useRef(false);

  const applyPicked = async (img: PickedImage | null) => {
    if (!img) return;
    fastClose.current = true;
    await onCoverImagePicked?.(img);
    onClose();
  };

  // Camera
  const handlePickFromCamera = async () => {
    setShowPickerSheet(false);
    applyPicked(await takePhoto().catch(() => null));
  };

  // Library
  const handlePickFromLibrary = async () => {
    setShowPickerSheet(false);
    const imgs = await pickImages({ multiple: false }).catch(() => []);
    applyPicked(imgs.length > 0 ? imgs[0] : null);
  };

  // Files
  const handlePickFromFile = async () => {
    setShowPickerSheet(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const a = result.assets[0];
      applyPicked({ uri: a.uri, type: a.mimeType ?? 'image/jpeg', name: a.name, size: a.size ?? 0 });
    } catch {}
  };

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
    fastClose.current = false;
    onClose();
  };

  const opacityValue = coverOpacity ?? 1;
  const opacityPct = Math.round(opacityValue * 100);

  return (
    <>
      <ModalOverlay visible={visible} onClose={handleClose} animation="springScale" outDuration={fastClose.current ? 10 : undefined}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{showCoverTools ? t('bgSettings') : (t('themeLabel') || '主题')}</Text>
            <CloseButton onPress={handleClose} />
          </View>
          <View style={styles.body}>

          {showCoverTools && (
            <Text style={styles.hint}>{t('bgHint')}</Text>
          )}

          <View style={{ marginTop: showCoverTools ? 12 : 0 }}>
            <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: FONTS.micro.weight, marginBottom: 10 }}>
              {t('themePicker') || '主题'}
            </Text>
            <ThemePicker onSelect={handleClose} />
          </View>

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
                thumbTintColor="#FFFFFF"
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub }}>0</Text>
                <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub }}>50</Text>
                <Text style={{ fontSize: FONTS.micro.size, color: colors.textSub }}>100</Text>
              </View>
            </View>
          )}

          {showCoverTools && (
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.bgBtn, styles.bgBtnOutline]}
                disabled={coverUploading}
                onPress={() => setShowPickerSheet(true)}
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

      <CustomActionSheet
        visible={showPickerSheet}
        onClose={() => setShowPickerSheet(false)}
        position="bottom"
        actions={[
          { label: t('takePhoto'), onPress: handlePickFromCamera },
          { label: t('chooseFromLibrary'), onPress: handlePickFromLibrary },
          { label: t('chooseFile'), onPress: handlePickFromFile },
        ]}
      />
    </>
  );
}
