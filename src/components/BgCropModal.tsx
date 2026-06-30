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
  imageSrc: string;
  onClearImage: () => void;
  onConfirm: (file: any) => void | Promise<void>;
  onUploaded?: () => void;
  aspectRatio?: number;
  title?: string;
  confirmLabel?: string;
  mode?: 'cover';
}

export default function BgCropModal({
  visible, onClose, imageSrc, onClearImage,
  onConfirm, onUploaded, aspectRatio, title, confirmLabel, mode,
}: BgCropModalProps) {
  const { width: WIN_W, height: WIN_H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCover = mode === 'cover';

  const [src, setSrc] = useState('');
  const [msg, setMsg] = useState('');
  const [phase, setPhase] = useState<'cropping' | 'preview' | 'uploading'>('cropping');
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [previewUri, setPreviewUri] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const stateRef = useRef({
    scale: 1, minScale: 1, maxScale: 3,
    rotation: 0, flipX: false,
    tx: 0, ty: 0,
    imgW: 0, imgH: 0,
    // Drag
    startTx: 0, startTy: 0,
    // Pinch
    pinchStartDist: 0, startScale: 1,
    pinchCX: 0, pinchCY: 0, startTxP: 0, startTyP: 0,
  });

  // Guide dimensions (match web: cropW ≈ 80% stage width, cropH = cropW * ratio)
  const aspect = aspectRatio != null
    ? Math.max(0.5, Math.min(2.4, aspectRatio))
    : isCover ? 260 / 375 : WIN_H / WIN_W;
  
  // Stage is full width minus padding
  const stagePad = 16;
  const stageW = WIN_W - stagePad * 2;
  const cropW = Math.round(stageW * 0.8);
  const cropH = Math.round(cropW * aspect);

  useEffect(() => {
    if (!imageSrc) {
      setSrc(''); setIsProcessing(false);
      return;
    }
    setSrc(imageSrc);
    setRotation(0); setFlipX(false);
    setTx(0); setTy(0); setScale(1);
    const s = stateRef.current;
    s.rotation = 0; s.flipX = false;
    s.tx = 0; s.ty = 0;
    
    Image.getSize(imageSrc, (w, h) => {
      s.imgW = w; s.imgH = h;
      // Web: minScale = Math.max(cropW / imgW, cropH / imgH)
      s.minScale = Math.max(cropW / w, cropH / h);
      s.maxScale = 3;
      // Web: initial scale = minScale * 1.05
      s.scale = Math.min(s.maxScale, s.minScale * 1.05);
      setScale(s.scale);
      clampDrag();
      setTx(s.tx); setTy(s.ty);
    }, () => {});
  }, [imageSrc]);

  useEffect(() => {
    if (!visible) {
      setSrc(''); setMsg(''); setPhase('cropping'); setPreviewUri(''); setIsProcessing(false);
    }
  }, [visible]);

  const close = () => {
    setSrc(''); setMsg(''); setPhase('cropping'); setPreviewUri(''); setIsProcessing(false);
    onClearImage(); onClose();
  };

  // Web clamp: maxX = hw - hrw, maxY = hh - hrh
  const clampDrag = () => {
    const s = stateRef.current;
    if (!s.imgW) return;
    const hw = (s.imgW * s.scale) / 2;
    const hh = (s.imgH * s.scale) / 2;
    const maxX = hw - cropW / 2;
    const maxY = hh - cropH / 2;
    s.tx = maxX > 0 ? Math.max(-maxX, Math.min(maxX, s.tx)) : 0;
    s.ty = maxY > 0 ? Math.max(-maxY, Math.min(maxY, s.ty)) : 0;
  };

  const updateScale = (newScale: number) => {
    const s = stateRef.current;
    s.scale = Math.max(s.minScale, Math.min(s.maxScale, newScale));
    clampDrag();
    setScale(s.scale);
    setTx(s.tx); setTy(s.ty);
  };

  const touchDist = (touches: any[]) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Web zoom: s.x = cx + (s.x - cx) * sd
  const zoomAt = (cx: number, cy: number, sd: number) => {
    const s = stateRef.current;
    s.tx = cx + (s.tx - cx) * sd;
    s.ty = cy + (s.ty - cy) * sd;
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => phase === 'cropping',
    onMoveShouldSetPanResponder: (_, gs) =>
      phase === 'cropping' && (Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4 || (gs as any).numberActiveTouches >= 2),
    onPanResponderGrant: (evt) => {
      const s = stateRef.current;
      const touches = evt.nativeEvent.touches;
      if (touches && touches.length >= 2) {
        s.pinchStartDist = touchDist([touches[0], touches[1]]);
        s.startScale = s.scale;
        s.startTxP = s.tx;
        s.startTyP = s.ty;
        s.pinchCX = (touches[0].pageX + touches[1].pageX) / 2;
        s.pinchCY = (touches[0].pageY + touches[1].pageY) / 2;
      } else {
        s.startTx = s.tx;
        s.startTy = s.ty;
      }
    },
    onPanResponderMove: (evt, gs) => {
      const s = stateRef.current;
      const touches = evt.nativeEvent.touches;
      
      if (touches && touches.length >= 2 && s.pinchStartDist > 0) {
        const dist = touchDist([touches[0], touches[1]]);
        const ratio = dist / s.pinchStartDist;
        const newScale = Math.max(s.minScale, Math.min(s.maxScale, s.startScale * ratio));
        const sd = newScale / s.scale;
        s.scale = newScale;
        // Web zoom: x = cx + (x - cx) * sd
        const stageCenterX = WIN_W / 2;
        const stageCenterY = WIN_H / 2;
        // Convert page coords to stage coords (approximate)
        const cx = s.pinchCX - (WIN_W - stageW) / 2 - stagePad;
        const cy = s.pinchCY - (WIN_H - stageW) / 2 - insets.top - 60;
        s.tx = s.startTxP + (s.pinchCX - stageCenterX) * (1 - sd) * 0.1;
        s.ty = s.startTyP + (s.pinchCY - stageCenterY) * (1 - sd) * 0.1;
        clampDrag();
      } else {
        s.tx = s.startTx + gs.dx;
        s.ty = s.startTy + gs.dy;
        clampDrag();
      }
      
      setScale(s.scale);
      setTx(s.tx); setTy(s.ty);
    },
    onPanResponderRelease: () => {},
  }), [phase, cropW, cropH, WIN_W, WIN_H]);

  const cycleRotation = () => {
    const s = stateRef.current;
    s.rotation = (s.rotation + 90) % 360;
    setRotation(s.rotation);
  };

  const toggleFlip = () => {
    setFlipX(!flipX);
    stateRef.current.flipX = !stateRef.current.flipX;
  };

  // Slider: maps 0-100 to scale range (same as web: minScale + (maxScale-minScale) * t * 0.5)

  // Crop using expo-image-manipulator
  const handleConfirm = async () => {
    if (isProcessing || !src) return;
    const s = stateRef.current;
    if (!s.imgW) return;
    setIsProcessing(true);
    try {
      const outW = 720;
      const outH = Math.round(outW * aspect);
      const outScale = outW / cropW;
      
      const cropOriginW = s.imgW / s.scale * outScale;
      const cropOriginH = s.imgH / s.scale * outScale;
      const originX = Math.max(0, (s.imgW * outScale - cropOriginW) / 2 - s.tx * outScale);
      const originY = Math.max(0, (s.imgH * outScale - cropOriginH) / 2 - s.ty * outScale);
      
      const actions: any[] = [{
        crop: {
          originX: Math.round(Math.max(0, originX)),
          originY: Math.round(Math.max(0, originY)),
          width: Math.round(Math.min(cropOriginW, s.imgW * outScale - originX)),
          height: Math.round(Math.min(cropOriginH, s.imgH * outScale - originY)),
        }
      }];
      
      if (flipX) actions.push({ flip: 'horizontal' as any });
      
      const result = await manipulateAsync(src, actions, { format: SaveFormat.JPEG, compress: 0.92 });
      setPreviewUri(result.uri);
      setPhase('preview');
    } catch (e: any) {
      setMsg(e?.message || 'Crop failed');
    }
    setIsProcessing(false);
  };

  const handlePreviewConfirm = async () => {
    if (!previewUri || isProcessing) return;
    setIsProcessing(true);
    try {
      const file: any = { uri: previewUri, type: 'image/jpeg', name: isCover ? 'cover.jpg' : 'background.jpg' };
      await onConfirm(file);
      setSrc(''); setMsg(''); setPhase('cropping'); setPreviewUri('');
      onUploaded?.();
    } catch (e: any) {
      setMsg(e?.message || 'Upload failed');
    }
    setIsProcessing(false);
  };

  if (!visible || !imageSrc) return null;

  return (
    <View style={styles.overlay}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>{title || (isCover ? t('coverCropTitle') : t('editBg'))}</Text>
        <TouchableOpacity onPress={close} style={styles.closeBtn}>
          <Svg width="14" height="14" viewBox="0 0 1088 1024">
            <Path d="M843.712 191.936l-6.08-5.568-5.184-3.84-5.696-3.328a67.712 67.712 0 0 0-80.448 11.264L520.768 416.064l-224.64-224.64-2.688-2.56c-27.968-24.32-68.224-24.256-92.672 0.128l-4.8 5.12-4.608 6.144-3.392 5.632a67.84 67.84 0 0 0 11.328 80.512L424.96 512l-227.2 227.328c-24.32 28.16-24.32 68.48 0 92.864l5.12 4.8 6.208 4.608 5.632 3.392c26.816 14.336 59.136 9.984 80.448-11.328l225.6-225.728 227.072 227.2c28.608 24.832 68.928 24 94.336-1.472l4.544-5.056 4.096-5.568a67.84 67.84 0 0 0-8.64-85.312L616.64 512.064l224.512-224.64 4.16-4.352c23.04-26.752 22.4-67.008-1.6-91.136z" fill="rgba(255,255,255,0.7)" />
          </Svg>
        </TouchableOpacity>
      </View>

      <View style={styles.stage}>
        {src !== '' && phase === 'cropping' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }} {...panResponder.panHandlers}>
            <Image
              source={{ uri: src }}
              style={{
                width: stateRef.current.imgW * scale,
                height: stateRef.current.imgH * scale,
                transform: [
                  { translateX: tx },
                  { translateY: ty },
                  { rotate: `${rotation}deg` },
                ],
              }}
              resizeMode="contain"
            />
            <View pointerEvents="none" style={[styles.guide, { width: cropW, height: cropH }]}>
              <View style={[styles.gridLine, { top: '33.3%' }]} />
              <View style={[styles.gridLine, { top: '66.6%' }]} />
              <View style={[styles.gridLineV, { left: '33.3%' }]} />
              <View style={[styles.gridLineV, { left: '66.6%' }]} />
            </View>
          </View>
        )}

        {phase === 'preview' && previewUri !== '' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
            <View style={{ backgroundColor: 'rgba(28,28,32,0.95)', borderRadius: 20, padding: 24, alignItems: 'center', width: '100%', maxWidth: 320 }}>
              <Text style={{ fontSize: 20, color: '#1B7A4A', marginBottom: 8 }}>✓</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 12 }}>{isCover ? t('coverUpdated') : t('bgUpdated')}</Text>
              <Image source={{ uri: previewUri }}
                style={[{ borderRadius: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
                  isCover ? { width: 240, height: Math.round(240 * aspect) } : { width: 180, height: 180 / aspect * cropW / cropH }
                ]}
                resizeMode="cover"
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, width: '100%' }}>
                <TouchableOpacity style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' }}
                  onPress={() => { setPhase('cropping'); setPreviewUri(''); }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>{t('recrop') || '重新裁剪'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 2, paddingVertical: 10, borderRadius: 10, backgroundColor: '#5B5BD6', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                  onPress={handlePreviewConfirm}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{t('confirmUse') || '确认使用'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {phase === 'cropping' && (
        <View style={styles.toolbar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>A</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity style={styles.scaleBtn} onPress={() => { updateScale(stateRef.current.scale - 0.1); }}>
                <Text style={styles.scaleBtnText}>−</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }} />
              <TouchableOpacity style={styles.scaleBtn} onPress={() => { updateScale(stateRef.current.scale + 0.1); }}>
                <Text style={styles.scaleBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>A</Text>
          </View>
          <View style={styles.dividerV} />
          <TouchableOpacity style={styles.toolBtn} onPress={cycleRotation}>
            <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <Path d="M3 12a9 9 0 109-9H9m0 0l3 3m-3-3l3-3" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={styles.toolBtnText}>{t('cropRotate') || '旋转'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={toggleFlip}>
            <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <Path d="M12 3v18M3 8l9-5 9 5M3 16l9 5 9-5" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={styles.toolBtnText}>{t('cropFlip') || '翻转'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'cropping' && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={close}>
            <Text style={styles.cancelText}>{t('cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.confirmBtn]} onPress={handleConfirm}>
            <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>
            <Text style={styles.confirmText}>{confirmLabel || (isCover ? t('useThisCover') : t('useThisBg'))}</Text>
          </TouchableOpacity>
        </View>
      )}

      {msg !== '' && <Text style={styles.errMsg}>{msg}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(8,8,12,0.92)' },
  header: { paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 14, fontWeight: '600', color: '#fff', letterSpacing: -0.2 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  stage: { flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#000' },
  guide: { position: 'absolute', borderRadius: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' },
  gridLine: { position: 'absolute', width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  gridLineV: { position: 'absolute', width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.18)' },
  toolbar: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  dividerV: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 10 },
  toolBtn: { paddingVertical: 6, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  scaleBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  scaleBtnText: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '600' },
  toolBtnText: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  actions: { paddingTop: 10, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', gap: 10 },
  actionBtn: { padding: 11, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'transparent' },
  cancelText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  confirmBtn: { flex: 2, backgroundColor: '#5B5BD6' },
  confirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  checkmark: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  checkmarkText: { fontSize: 10, color: '#fff' },
  errMsg: { fontSize: 12, color: '#ef4444', textAlign: 'center', paddingBottom: 8, fontWeight: '500' },
});
