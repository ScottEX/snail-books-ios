import React from 'react';
import { View, Text, TouchableOpacity, Image, LayoutChangeEvent, Alert } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme, withAlpha, REQUIRED_COLOR } from '../theme';
import { FONTS } from '../theme';
import { t } from '../i18n';
import { useCallback, useRef, useState } from 'react';
import { pickImages, PickedImage } from '../utils/imagePicker';
import { measureThumbLayout, ThumbLayout } from './ImagePreview';

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
  onPreviewExisting?: (index: number, layout?: ThumbLayout) => void;
  /** Optional callback when a new file thumbnail is tapped (for preview) */
  onPreviewNew?: (index: number, layout?: ThumbLayout) => void;
  /** Show * required indicator on label */
  required?: boolean;
}

const GAP = 8;
const MAX_IMAGES = 9;

const isPdfFile = (f: PickedFile) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name || '');
const isPdfUrl = (url: string) => /\.pdf(\?|$)/i.test(url);

export default function ReceiptUpload({
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
  const busyRef = useRef(false);
  const existingThumbRefs = useRef<(any | null)[]>([]);
  const newThumbRefs = useRef<(any | null)[]>([]);

  const handlePreviewExisting = useCallback((i: number) => {
    if (!onPreviewExisting) return;
    const ref = existingThumbRefs.current[i];
    if (!ref) { onPreviewExisting(i); return; }
    measureThumbLayout(ref, (layout) => onPreviewExisting(i, layout));
  }, [onPreviewExisting]);

  const handlePreviewNew = useCallback((i: number) => {
    if (!onPreviewNew) return;
    const ref = newThumbRefs.current[i];
    if (!ref) { onPreviewNew(i); return; }
    measureThumbLayout(ref, (layout) => onPreviewNew(i, layout));
  }, [onPreviewNew]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setContainerWidth(w);
  }, []);

  const handlePick = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const available = MAX_IMAGES - existingImages.length - newFiles.length;
      if (available <= 0) {
        setShowMaxHint(true);
        setTimeout(() => setShowMaxHint(false), 3000);
        return;
      }
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
  };

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
            <Text style={{ fontSize: 10, color: c.textSub, marginTop: 4 }}>{label || t('uploadImage')}</Text>
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
                <Text style={{ fontSize: 22 }}>📄</Text>
                <Text style={{ fontSize: 9, color: c.textSub }}>PDF</Text>
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
                <Text style={{ fontSize: 22 }}>📄</Text>
                <Text style={{ fontSize: 9, color: c.textSub }}>PDF</Text>
              </View>
            ) : getPreviewUrl ? (
              <Image source={{ uri: getPreviewUrl(file) }} style={{ width: thumbSize, height: thumbSize, borderRadius: 8 }} />
            ) : (
              <View style={{ width: thumbSize, height: thumbSize, borderRadius: 8, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 10, color: c.textSub }} numberOfLines={2}>{file.name}</Text>
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
    </View>
  );
}
