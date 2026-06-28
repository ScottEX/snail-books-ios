import { View, Text, TouchableOpacity, Image, StyleSheet, useWindowDimensions, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingSpinner from './LoadingSpinner';
import Svg, { Path } from 'react-native-svg';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { t } from '../i18n';
import { useEffect, useRef, useState, useMemo } from 'react';

interface BgCropModalProps {
  visible: boolean;
  onClose: () => void;
  /** URI of the image to crop. When this changes from '' to a URI,
   *  the modal loads it. When cleared, the modal is reset. The image
   *  picker lives in the parent (ThemePickerModal). */
  imageSrc: string;
  /** Called when the modal wants to clear the image (e.g. on close /
   *  cancel / recrop reset). Parent should set imageSrc back to ''. */
  onClearImage: () => void;
  /** Called with the cropped file after user confirms. For 'cover' mode,
   *  this receives an actual cropped bitmap (via expo-image-manipulator).
   *  For default mode, passes original file with crop hints. */
  onConfirm: (file: any) => void | Promise<void>;
  /** Called after the upload triggered by onConfirm has resolved
   *  successfully. */
  onUploaded?: () => void;
  /** Optional crop aspect ratio (height/width). Default: viewport ratio. */
  aspectRatio?: number;
  /** Title shown in the header. */
  title?: string;
  /** Label of the confirm button. */
  confirmLabel?: string;
  /** 'cover' mode: uses cover aspect ratio + two-step preview flow */
  mode?: 'cover';
}

/** Fullscreen crop modal used by the background image flow.
 *
 *  Web uses an HTML canvas with pinch / drag / rotate / flip. RN
 *  doesn't expose Canvas, so this port provides a simpler
 *  approximation: a draggable + pinchable + rotatable preview of the
 *  picked image inside a fixed crop frame. The final crop is intended
 *  to be performed server-side; the metadata returned to onConfirm
 *  includes the chosen scale and rotation so the backend can crop
 *  accordingly.
 *
 *  Output aspect ratio is viewport-adaptive by default — the cropped
 *  image is intended to fill the screen. */
export default function BgCropModal({
  visible, onClose, imageSrc, onClearImage,
  onConfirm, onUploaded, aspectRatio, title, confirmLabel, mode,
}: BgCropModalProps) {
  const { width: WIN_W, height: WIN_H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCover = mode === 'cover';

  // ── Internal crop state machine ──
  const [src, setSrc] = useState('');
  const [msg, setMsg] = useState('');
  const [phase, setPhase] = useState<'cropping' | 'preview' | 'uploading'>('cropping');
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [previewUri, setPreviewUri] = useState(''); // cropped preview image
  const [isProcessing, setIsProcessing] = useState(false); // crop in progress (don't show full spinner)

  // Refs to live gesture state (so PanResponder sees fresh values without rerenders)
  const stateRef = useRef({
    scale: 1,
    minScale: 0.5,
    rotation: 0,
    tx: 0,
    ty: 0,
    dragStartX: 0,
    dragStartY: 0,
    startTx: 0,
    startTy: 0,
    pinchStart: 0,
    startScale: 1,
    isDragging: false,
  });

  // Load image whenever parent passes a new imageSrc
  useEffect(() => {
    if (!imageSrc) {
      setSrc('');
      setIsProcessing(false);
      return;
    }
    setSrc(imageSrc);
    setRotation(0);
    setTx(0);
    setTy(0);
    stateRef.current.rotation = 0;
    stateRef.current.tx = 0;
    stateRef.current.ty = 0;
    // Fit image to cover the crop guide (matching web's coverFitImage).
    // The image fills the container via resizeMode="cover" — minScale is
    // purely geometric: guide must stay covered on both axes.
    const geoMinScale = Math.max(1 / 1.4, guideH / (guideW * 1.4));
    const clamped = Math.max(geoMinScale, Math.min(3, geoMinScale * 1.05));
    setScale(clamped);
    stateRef.current.scale = clamped;
    stateRef.current.minScale = geoMinScale;
  }, [imageSrc]);

  // Reset internal state on close
  useEffect(() => {
    if (!visible) {
      setSrc(''); setMsg(''); setPhase('cropping'); setPreviewUri(''); setIsProcessing(false);
      setScale(1); setRotation(0); setTx(0); setTy(0);
    }
  }, [visible]);

  const close = () => {
    setSrc(''); setMsg(''); setPhase('cropping'); setPreviewUri(''); setIsProcessing(false);
    setScale(1); setRotation(0); setTx(0); setTy(0);
    onClearImage();
    onClose();
  };

  // Crop guide box — cover uses fixed ratio (260/375), bg uses viewport
  const aspect = aspectRatio != null
    ? Math.max(0.5, Math.min(2.4, aspectRatio))
    : isCover ? 260 / 375 : WIN_H / WIN_W;
  const guideW = Math.min(WIN_W * 0.85, (WIN_H * 0.55) / aspect);
  const guideH = guideW * aspect;

  // Drag clamping — ensures the crop guide stays within the image area
  const clampDrag = () => {
    const s = stateRef.current;
    const halfImg = (guideW * 1.4 * s.scale) / 2;
    const halfGW = guideW / 2;
    const halfGH = guideH / 2;
    const maxX = halfImg - halfGW;
    const maxY = halfImg - halfGH;
    if (maxX > 0) { s.tx = Math.max(-maxX, Math.min(maxX, s.tx)); } else { s.tx = 0; }
    if (maxY > 0) { s.ty = Math.max(-maxY, Math.min(maxY, s.ty)); } else { s.ty = 0; }
  };

  // PanResponder — drag only; pinch is approximated with double-tap-scale.
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => phase === 'cropping',
    onMoveShouldSetPanResponder: (_, gs) =>
      phase === 'cropping' && (Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4),
    onPanResponderGrant: () => {
      const s = stateRef.current;
      s.isDragging = true;
      s.startTx = s.tx;
      s.startTy = s.ty;
    },
    onPanResponderMove: (_, gs) => {
      const s = stateRef.current;
      s.tx = s.startTx + gs.dx;
      s.ty = s.startTy + gs.dy;
      clampDrag();
      setTx(s.tx);
      setTy(s.ty);
    },
    onPanResponderRelease: () => {
      stateRef.current.isDragging = false;
    },
  }), [phase]);

  const adjustScale = (delta: number) => {
    const s = stateRef.current;
    s.scale = Math.max(s.minScale, Math.min(3, s.scale + delta));
    clampDrag();
    setScale(s.scale);
    setTx(s.tx);
    setTy(s.ty);
  };

  const cycleRotation = () => {
    const s = stateRef.current;
    s.rotation = (s.rotation + 90) % 360;
    setRotation(s.rotation);
  };

  const resetTransform = () => {
    const s = stateRef.current;
    s.scale = 1; s.rotation = 0; s.tx = 0; s.ty = 0;
    setScale(1); setRotation(0); setTx(0); setTy(0);
  };

  // Confirm: crop client-side via expo-image-manipulator, show preview, then upload.
  const handleConfirm = async () => {
    if (isProcessing || !src) return;
    setIsProcessing(true);
    try {
      const s = stateRef.current;
      // Get original image dimensions for accurate crop
      const imgSize = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        Image.getSize(src, (w, h) => resolve({ w, h }), reject);
      });
      // Image display size: guideW * 1.4, resizeMode cover → image fits within
      const displayW = guideW * 1.4;
      const displayH = guideW * 1.4;
      const imgAspect = imgSize.w / imgSize.h;
      const displayAspect = displayW / displayH;
      let renderW: number, renderH: number;
      if (imgAspect > displayAspect) {
        renderH = displayH;
        renderW = displayH * imgAspect;
      } else {
        renderW = displayW;
        renderH = displayW / imgAspect;
      }
      // Map guide center (in display coords) to image pixel coords
      const scaleImgToDisp = renderW / imgSize.w;
      const guideCenterX = displayW / 2 - s.tx;
      const guideCenterY = displayH / 2 - s.ty;
      // Crop size in display coords, then convert to original px
      const cropW = (guideW / s.scale) / scaleImgToDisp;
      const cropH = (guideH / s.scale) / scaleImgToDisp;
      const originX = Math.max(0, (guideCenterX - (renderW - displayW) / 2) / scaleImgToDisp - cropW / 2);
      const originY = Math.max(0, (guideCenterY - (renderH - displayH) / 2) / scaleImgToDisp - cropH / 2);
      const finalW = Math.min(cropW, imgSize.w - originX);
      const finalH = Math.min(cropH, imgSize.h - originY);

      const result = await manipulateAsync(
        src,
        [{ crop: { originX, originY, width: finalW, height: finalH } }],
        { format: SaveFormat.JPEG, compress: 0.92 }
      );
      setPreviewUri(result.uri);
      setPhase('preview');
      setIsProcessing(false);
    } catch (e: any) {
      setMsg(e?.message || t('uploadFailed') || 'Crop failed');
      setPhase('cropping');
      setIsProcessing(false);
    }
  };

  // Preview confirm: upload the cropped bitmap
  const handlePreviewConfirm = async () => {
    if (!previewUri || isProcessing) return;
    setIsProcessing(true);
    try {
      const file: any = {
        uri: previewUri,
        type: 'image/jpeg',
        name: isCover ? 'cover.jpg' : 'background.jpg',
      };
      await onConfirm(file);
      setSrc(''); setMsg(''); setPhase('cropping'); setPreviewUri('');
      setIsProcessing(false);
      resetTransform();
      onUploaded?.();
    } catch (e: any) {
      setMsg(e?.message || t('uploadFailed') || 'Upload failed');
      setPhase('cropping');
      setIsProcessing(false);
    }
  };

  if (!visible) return null;
  if (imageSrc === '') return null;

  return (
    <View style={styles.overlay}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>{title || (isCover ? t('coverCropTitle') : t('editBg'))}</Text>
        <TouchableOpacity onPress={close} style={styles.closeBtn}>
          <Svg width="14" height="14" viewBox="0 0 1088 1024">
            <Path d="M843.712 191.936l-6.08-5.568-5.184-3.84-5.696-3.328a67.712 67.712 0 0 0-80.448 11.264L520.768 416.064l-224.64-224.64-2.688-2.56c-27.968-24.32-68.224-24.256-92.672 0.128l-4.8 5.12-4.608 6.144-3.392 5.632a67.84 67.84 0 0 0 11.328 80.512L424.96 512l-227.2 227.328c-24.32 28.16-24.32 68.48 0 92.864l5.12 4.8 6.208 4.608 5.632 3.392c26.816 14.336 59.136 9.984 80.448-11.328l225.6-225.728 227.072 227.2c28.608 24.832 68.928 24 94.336-1.472l4.544-5.056 4.096-5.568a67.84 67.84 0 0 0-8.64-85.312L616.64 512.064l224.512-224.64 4.16-4.352c23.04-26.752 22.4-67.008-1.6-91.136z" fill="rgba(255,255,255,0.7)" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Stage */}
      <View style={styles.stage}>
        {src !== '' && phase === 'cropping' && (
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}
            {...panResponder.panHandlers}
          >
            {/* Render image with transforms */}
            <Image
              source={{ uri: src }}
              style={{
                width: guideW * 1.4,
                height: guideW * 1.4,
                transform: [
                  { translateX: tx },
                  { translateY: ty },
                  { scale },
                  { rotate: `${rotation}deg` },
                ],
              }}
              resizeMode="cover"
            />
            {/* Crop guide frame (decorative — visual only) */}
            <View pointerEvents="none" style={[styles.guide, { width: guideW, height: guideH }]}>
              <View style={[styles.gridLine, { top: '33.3%' }]} />
              <View style={[styles.gridLine, { top: '66.6%' }]} />
              <View style={[styles.gridLineV, { left: '33.3%' }]} />
              <View style={[styles.gridLineV, { left: '66.6%' }]} />
            </View>
            <View pointerEvents="none" style={styles.pill}>
              <Text style={styles.pillText}>{t('cropPill') || '拖动图片 · 选择区域'}</Text>
            </View>
          </View>
        )}

        {/* Preview phase — shows cropped result with mode-appropriate text */}
        {phase === 'preview' && previewUri !== '' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
            <View style={{ backgroundColor: 'rgba(28,28,32,0.95)', borderRadius: 20, padding: 24, alignItems: 'center', width: '100%', maxWidth: 320 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(27,122,74,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 20, color: '#1B7A4A' }}>✓</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 12 }}>
                {isCover ? t('coverUpdated') : t('bgUpdated')}
              </Text>
              <Image source={{ uri: previewUri }}
                style={{
                  width: 240,
                  height: isCover ? Math.round(240 * (260 / 375)) : Math.round(240 * aspect),
                  borderRadius: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)',
                }}
                resizeMode="cover"
              />
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 10 }}>
                {isCover ? t('coverHint') : t('bgResultHint')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, width: '100%' }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', opacity: isProcessing ? 0.5 : 1 }}
                  onPress={() => { setPhase('cropping'); setPreviewUri(''); }}
                  disabled={isProcessing}
                >
                  <Text style={{ fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>{t('recrop') || '重新裁剪'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 2, paddingVertical: 10, borderRadius: 10, backgroundColor: '#5B5BD6', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', opacity: isProcessing ? 0.6 : 1 }}
                  onPress={handlePreviewConfirm}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <LoadingSpinner label={false} size={20} color="#fff" />
                  ) : null}
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginLeft: isProcessing ? 8 : 0 }}>{t('confirmUse') || '确认使用'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Toolbar */}
      {phase === 'cropping' && (
        <View style={styles.toolbar}>
          <View style={styles.toolbarRow}>
            <Text style={styles.toolbarLabel}>A</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                style={styles.scaleBtn}
                onPress={() => adjustScale(-0.1)}
              >
                <Text style={styles.scaleBtnText}>−</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }} />
              <TouchableOpacity
                style={styles.scaleBtn}
                onPress={() => adjustScale(0.1)}
              >
                <Text style={styles.scaleBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.toolbarLabel}>A</Text>
          </View>
          <View style={styles.dividerV} />
          <TouchableOpacity style={styles.toolBtn} onPress={cycleRotation}>
            <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <Path d="M3 12a9 9 0 109-9H9m0 0l3 3m-3-3l3-3" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={styles.toolBtnText}>{t('cropRotate') || '旋转'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={resetTransform}>
            <Text style={styles.toolBtnText}>↺</Text>
            <Text style={styles.toolBtnText}>{t('reset') || '重置'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions */}
      {phase === 'cropping' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.cancelBtn, isProcessing && { opacity: 0.5 }]}
            onPress={close}
            disabled={isProcessing}
          >
            <Text style={styles.cancelText}>{t('cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.confirmBtn, isProcessing && { opacity: 0.6 }]}
            onPress={handleConfirm}
            disabled={!src || isProcessing}
          >
            {isProcessing ? (
              <View style={{ marginRight: 6 }}>
                <LoadingSpinner label={false} size={20} color="#fff" />
              </View>
            ) : (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
            <Text style={styles.confirmText}>{confirmLabel || (isCover ? t('useThisCover') : t('useThisBg'))}</Text>
          </TouchableOpacity>
        </View>
      )}

      {msg !== '' && (
        <Text style={styles.errMsg}>{msg}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
    backgroundColor: 'rgba(8,8,12,0.92)',
  },
  header: {
    paddingHorizontal: 16, paddingBottom: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 14, fontWeight: '600', color: '#fff', letterSpacing: -0.2 },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  stage: { flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#000' },
  guide: {
    position: 'absolute',
    borderRadius: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)',
  },
  gridLine: {
    position: 'absolute', width: '100%', height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  gridLineV: {
    position: 'absolute', width: 1, height: '100%',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  pill: {
    position: 'absolute', bottom: 8, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20,
    paddingVertical: 4, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  pillText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  toolbar: {
    paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  toolbarLabel: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  scaleBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  scaleBtnText: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '600' },
  dividerV: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 10 },
  toolBtn: {
    paddingVertical: 6, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  toolBtnText: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  actions: {
    paddingTop: 10, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', gap: 10,
  },
  actionBtn: { padding: 11, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'transparent' },
  cancelText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  confirmBtn: { flex: 2, backgroundColor: '#5B5BD6' },
  confirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  checkmark: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginRight: 6,
  },
  checkmarkText: { fontSize: 10, color: '#fff' },
  errMsg: {
    fontSize: 12, color: '#ef4444', textAlign: 'center', paddingBottom: 8, fontWeight: '500',
  },
});
