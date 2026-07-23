import React from 'react';
import { View, Text, TouchableOpacity, LayoutChangeEvent, Alert } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { useTheme, withAlpha, REQUIRED_COLOR } from '../theme';
import { FONTS } from '../theme';
import { t } from '../i18n';
import { useCallback, useRef, useState } from 'react';
import { pickImages, takePhoto, pickFiles, PickedImage } from '../utils/imagePicker';
import CustomActionSheet from './CustomActionSheet';
import { measureThumbLayout, resolveThumbLayout, ThumbLayout, ThumbLayoutResolver } from './ImagePreview';

/** File-like type — on RN we use { uri, type, name } from expo-image-picker. */
type PickedFile = PickedImage;

interface Props {
  /** Existing image URLs (from server) */
  existingImages?: string[];
  /** Newly added files (URI objects) */
  newFiles?: PickedFile[];
  onAdd: (files: PickedFile[]) => void;
  onRemoveExisting?: (index: number) => void;
  onRemoveNew?: (index: number) => void;
  getPreviewUrl?: (file: PickedFile) => string;
  /** Max thumbnail size in px (default 120), actual size auto-calculated to fill row */
  maxThumbSize?: number;
  /** Label text override (default: 凭证上传) */
  label?: string;
  /** Optional callback when an existing thumbnail is tapped (for preview) */
  onPreviewExisting?: (index: number, layout?: ThumbLayout, getLayout?: ThumbLayoutResolver) => void;
  /** Optional callback when a new file thumbnail is tapped (for preview) */
  onPreviewNew?: (index: number, layout?: ThumbLayout, getLayout?: ThumbLayoutResolver) => void;
  /** Show * required indicator on label */
  required?: boolean;
}

const GAP = 8;
const MAX_IMAGES = 9;

const isPdfFile = (f: PickedFile) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name || '');
const isPdfUrl = (url: string) => /\.pdf(\?|$)/i.test(url);

export default React.memo(function ReceiptUpload({
  existingImages = [],
  newFiles = [],
  onAdd,
  onRemoveExisting,
  onRemoveNew,
  getPreviewUrl,
  maxThumbSize = 120,
  label,
  onPreviewExisting,
  onPreviewNew,
  required,
}: Props) {
  const { colors: c } = useTheme();
  const [showTip, setShowTip] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [showMaxHint, setShowMaxHint] = useState(false);
  const [showPickerSheet, setShowPickerSheet] = useState(false);
  const busyRef = useRef(false);
  const existingThumbRefs = useRef<(any | null)[]>([]);
  const newThumbRefs = useRef<(any | null)[]>([]);
  const pickBtnRef = useRef<any>(null);
  const [pickOffsetY, setPickOffsetY] = useState(0);
  const [pickOffsetX, setPickOffsetX] = useState(0);

  const handlePreviewExisting = useCallback((i: number) => {
    if (!onPreviewExisting) return;
    const resolver: ThumbLayoutResolver = (idx, cb) => resolveThumbLayout(existingThumbRefs.current[idx], cb);
    const ref = existingThumbRefs.current[i];
    if (!ref) { onPreviewExisting(i, undefined, resolver); return; }
    measureThumbLayout(ref, (layout) => onPreviewExisting(i, layout, resolver));
  }, [onPreviewExisting]);

  const handlePreviewNew = useCallback((i: number) => {
    if (!onPreviewNew) return;
    const resolver: ThumbLayoutResolver = (idx, cb) => resolveThumbLayout(newThumbRefs.current[idx], cb);
    const ref = newThumbRefs.current[i];
    if (!ref) { onPreviewNew(i, undefined, resolver); return; }
    measureThumbLayout(ref, (layout) => onPreviewNew(i, layout, resolver));
  }, [onPreviewNew]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setContainerWidth(w);
  }, []);

  const handlePick = () => {
    const available = MAX_IMAGES - existingImages.length - newFiles.length;
    if (available <= 0) {
      setShowMaxHint(true);
      setTimeout(() => setShowMaxHint(false), 3000);
      return;
    }
    // 测量按钮位置，弹窗跟在其上方
    (pickBtnRef.current as any)?.measureInWindow?.((x: number, y: number, _w: number, h: number) => {
      setPickOffsetX(x || 16);
      setPickOffsetY(y || 100);
      setShowPickerSheet(true);
    }) || setShowPickerSheet(true);
  };

  const handlePickFromCamera = useCallback(async () => {
    setShowPickerSheet(false);
    try {
      const photo = await takePhoto();
      if (!photo) return;
      onAdd([photo]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to take photo');
    }
  }, [onAdd]);

  const handlePickFromLibrary = useCallback(async () => {
    setShowPickerSheet(false);
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const available = MAX_IMAGES - existingImages.length - newFiles.length;
      const picked = await pickImages({ multiple: true });
      if (!picked || picked.length === 0) return;
      const slice = picked.slice(0, available);
      if (picked.length > available) {
        setShowMaxHint(true);
        setTimeout(() => setShowMaxHint(false), 3000);
      }
      onAdd(slice);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to pick images');
    } finally {
      busyRef.current = false;
    }
  }, [existingImages.length, newFiles.length, onAdd]);

  const handlePickFiles = useCallback(async () => {
    setShowPickerSheet(false);
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const available = MAX_IMAGES - existingImages.length - newFiles.length;
      const picked = await pickFiles();
      if (!picked || picked.length === 0) return;
      const slice = picked.slice(0, available);
      if (picked.length > available) {
        setShowMaxHint(true);
        setTimeout(() => setShowMaxHint(false), 3000);
      }
      onAdd(slice);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to pick files');
    } finally {
      busyRef.current = false;
    }
  }, [existingImages.length, newFiles.length, onAdd]);

  const atMax = existingImages.length + newFiles.length >= MAX_IMAGES;
  const totalItems = atMax ? existingImages.length + newFiles.length : 1 + existingImages.length + newFiles.length;
  const itemsPerRow = Math.min(totalItems, 4);
  const thumbSize = containerWidth > 0
    ? Math.min(maxThumbSize, (containerWidth - GAP * (itemsPerRow - 1)) / itemsPerRow)
    : maxThumbSize;

  return (
    <View onLayout={onLayout}>
      {/* Label + info tip */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Text style={{ fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: c.textSub, marginBottom: 0 }}>
          {label || t('uploadImage')}{required ? <Text style={{ color: REQUIRED_COLOR }}>*</Text> : null}
        </Text>
        <TouchableOpacity
          onPress={() => setShowTip(!showTip)}
          activeOpacity={0.7}
          style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c.secondary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: c.textSub }}>!</Text>
        </TouchableOpacity>
        {showTip && (
          <View style={{ backgroundColor: c.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: FONTS.micro.size, color: c.surface, fontWeight: '500' as const }}>
              {t('uploadFileTip') || '支持 JPG / PNG / WebP / PDF'}
            </Text>
          </View>
        )}
      </View>

      {/* Add button + previews */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
        {/* Add button */}
        {!atMax && (
        <TouchableOpacity
          ref={pickBtnRef}
          style={{
            width: thumbSize, height: thumbSize,
            borderRadius: 8,
            borderWidth: 1.5, borderStyle: 'dashed' as any,
            borderColor: c.secondary,
            backgroundColor: c.surface,
            alignItems: 'center' as const, justifyContent: 'center' as const,
          }}
          onPress={handlePick}
          activeOpacity={0.7}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c.textSub} strokeWidth={1.5} strokeLinecap="round">
            <Path d="M12 5v14M5 12h14" />
          </Svg>
          {totalItems === 1 && (
            <Text style={{ fontSize: FONTS.tiny.size, color: c.textSub, marginTop: 4 }}>{label || t('uploadImage')}</Text>
          )}
        </TouchableOpacity>
        )}

        {/* Existing previews */}
        {existingImages.map((url: string, i: number) => (
          <View key={`existing-${i}`} style={{ position: 'relative' }}>
            <TouchableOpacity
              ref={el => { existingThumbRefs.current[i] = el; }}
              onPress={() => handlePreviewExisting(i)}
              activeOpacity={onPreviewExisting ? 0.7 : 1}
              disabled={!onPreviewExisting}
            >
            {isPdfUrl(url) ? (
              <View style={{ width: thumbSize, height: thumbSize, borderRadius: 8, backgroundColor: withAlpha(c.textMain, 0.06), alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <Text style={{ fontSize: FONTS.xlarge.size }}>📄</Text>
                <Text style={{ fontSize: FONTS.tiny.size, color: c.textSub }}>PDF</Text>
              </View>
            ) : (
              <Image source={{ uri: url }} style={{ width: thumbSize, height: thumbSize, borderRadius: 8 }} />
            )}
            </TouchableOpacity>
            {onRemoveExisting && (
              <TouchableOpacity
                onPress={() => onRemoveExisting(i)}
                activeOpacity={0.7}
                style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
              >
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth={2} strokeLinecap="round">
                  <Path d="M18 6L6 18M6 6l12 12" />
                </Svg>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* New file previews */}
        {newFiles.map((file: PickedFile, i: number) => (
          <View key={`new-${i}`} style={{ position: 'relative' }}>
            <TouchableOpacity
              ref={el => { newThumbRefs.current[i] = el; }}
              onPress={() => handlePreviewNew(i)}
              activeOpacity={onPreviewNew ? 0.7 : 1}
              disabled={!onPreviewNew}
            >
            {isPdfFile(file) ? (
              <View style={{ width: thumbSize, height: thumbSize, borderRadius: 8, backgroundColor: withAlpha(c.textMain, 0.06), alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <Text style={{ fontSize: FONTS.xlarge.size }}>📄</Text>
                <Text style={{ fontSize: FONTS.tiny.size, color: c.textSub }}>PDF</Text>
              </View>
            ) : getPreviewUrl ? (
              <Image source={{ uri: getPreviewUrl(file) }} style={{ width: thumbSize, height: thumbSize, borderRadius: 8 }} />
            ) : (
              <View style={{ width: thumbSize, height: thumbSize, borderRadius: 8, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: FONTS.tiny.size, color: c.textSub }} numberOfLines={2}>{file.name}</Text>
              </View>
            )}
            </TouchableOpacity>
            {onRemoveNew && (
              <TouchableOpacity
                onPress={() => onRemoveNew(i)}
                activeOpacity={0.7}
                style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
              >
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth={2} strokeLinecap="round">
                  <Path d="M18 6L6 18M6 6l12 12" />
                </Svg>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Max limit hint */}
      {showMaxHint && (
        <Text style={{ fontSize: FONTS.micro.size, color: c.danger, marginTop: 4 }}>
          最多{MAX_IMAGES}张
        </Text>
      )}

      <CustomActionSheet
        visible={showPickerSheet}
        onClose={() => setShowPickerSheet(false)}
        actions={[
          {
            label: t('chooseFromLibrary'),
            icon: (
              <Svg width={18} height={18} viewBox="0 0 1024 1024" fill={c.textMain}>
                <Path d="M875.5 151.4H149.2c-46.3 0-83.8 37.5-83.8 83.8v558.7c0 46.3 37.5 83.8 83.8 83.8h726.3c46.3 0 83.8-37.5 83.8-83.8V235.2c0-46.3-37.5-83.8-83.8-83.8z m14 557L714.1 474.6s-10.2-18.9-46-18.9c-40.6 0-52.8 18.3-52.8 18.3L461.7 711.1s-8.4 15.9-28.8 15.9c-21.5 0-31.7-15.9-31.7-15.9l-80.8-92.3s-20.7-27.4-47.6-27.4c-26.8 0-49 30.3-49 30.3l-88.6 110.4v-482c0-15.4 12.5-28 28-28h698.4c15.4 0 28 12.5 28 28l-0.1 458.3zM470.3 402.8c0 54.7-44.3 99-98.9 99-54.6 0-99-44.3-99-99 0-54.6 44.3-98.9 99-98.9 54.6 0 98.9 44.3 98.9 98.9z" />
              </Svg>
            ),
            onPress: handlePickFromLibrary,
          },
          {
            label: t('takePhoto'),
            icon: (
              <Svg width={18} height={18} viewBox="0 0 1024 1024" fill={c.textMain}>
                <Path d="M851.552 890.88 172.448 890.88c-74.592 0-135.296-60.672-135.296-135.296L37.152 370.752c0-74.624 60.672-135.328 135.296-135.328l132.16 0L302.912 195.904c0-34.624 28.192-62.816 62.816-62.816l302.016 0c29.408 0 53.312 23.904 53.312 53.312l0 49.024 130.464 0c74.592 0 135.296 60.672 135.296 135.328l0 384.832C986.816 830.208 926.144 890.88 851.552 890.88zM172.448 283.456c-48.128 0-87.296 39.168-87.296 87.328l0 384.832c0 48.128 39.168 87.296 87.296 87.296l679.104 0c48.128 0 87.296-39.168 87.296-87.296L938.848 370.752c0-48.16-39.168-87.328-87.296-87.328L716.8 283.424c-24.096 0-43.712-19.616-43.712-43.712L673.088 186.4c0-2.944-2.368-5.312-5.312-5.312l-302.016 0c-8.16 0-14.816 6.656-14.816 14.816L350.944 237.12c0 25.536-20.768 46.304-46.304 46.304L172.448 283.424zM512 755.84c-107.04 0-194.08-87.072-194.08-194.08S404.992 367.68 512 367.68s194.08 87.072 194.08 194.08S619.04 755.84 512 755.84zM512 415.68c-80.576 0-146.08 65.536-146.08 146.08S431.456 707.84 512 707.84s146.08-65.536 146.08-146.08S592.576 415.68 512 415.68zM816.8 438.016c-25.568 0-46.336-20.768-46.336-46.336s20.768-46.336 46.336-46.336 46.336 20.768 46.336 46.336S842.368 438.016 816.8 438.016z" />
              </Svg>
            ),
            onPress: handlePickFromCamera,
          },
          {
            label: t('chooseFile'),
            icon: (
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c.textMain} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
              </Svg>
            ),
            onPress: handlePickFiles,
          },
        ]}
        dark
        noOverlay
        offsetY={pickOffsetY}
        offsetX={pickOffsetX}
      />
    </View>
  );
});
