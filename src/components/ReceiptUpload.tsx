1|import React from 'react';
2|import { View, Text, TouchableOpacity, LayoutChangeEvent, Alert } from 'react-native';
3|import { Image } from 'expo-image';
4|import Svg, { Path } from 'react-native-svg';
5|import { useTheme, withAlpha, REQUIRED_COLOR } from '../theme';
6|import { FONTS } from '../theme';
7|import { t } from '../i18n';
8|import { useCallback, useRef, useState } from 'react';
9|import { pickImages, takePhoto, pickFiles, PickedImage } from '../utils/imagePicker';
10|import CustomActionSheet from './CustomActionSheet';
11|import { measureThumbLayout, resolveThumbLayout, ThumbLayout, ThumbLayoutResolver } from './ImagePreview';
12|
13|/** File-like type — on RN we use { uri, type, name } from expo-image-picker. */
14|type PickedFile = PickedImage;
15|
16|interface Props {
17|  /** Existing image URLs (from server) */
18|  existingImages?: string[];
19|  /** Newly added files (URI objects) */
20|  newFiles?: PickedFile[];
21|  onAdd: (files: PickedFile[]) => void;
22|  onRemoveExisting?: (index: number) => void;
23|  onRemoveNew?: (index: number) => void;
24|  getPreviewUrl?: (file: PickedFile) => string;
25|  /** Max thumbnail size in px (default 120), actual size auto-calculated to fill row */
26|  maxThumbSize?: number;
27|  /** Label text override (default: 凭证上传) */
28|  label?: string;
29|  /** Optional callback when an existing thumbnail is tapped (for preview) */
30|  onPreviewExisting?: (index: number, layout?: ThumbLayout, getLayout?: ThumbLayoutResolver) => void;
31|  /** Optional callback when a new file thumbnail is tapped (for preview) */
32|  onPreviewNew?: (index: number, layout?: ThumbLayout, getLayout?: ThumbLayoutResolver) => void;
33|  /** Show * required indicator on label */
34|  required?: boolean;
35|}
36|
37|const GAP = 8;
38|const MAX_IMAGES = 9;
39|
40|const isPdfFile = (f: PickedFile) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name || '');
41|const isPdfUrl = (url: string) => /\.pdf(\?|$)/i.test(url);
42|
43|export default React.memo(function ReceiptUpload({
44|  existingImages = [],
45|  newFiles = [],
46|  onAdd,
47|  onRemoveExisting,
48|  onRemoveNew,
49|  getPreviewUrl,
50|  maxThumbSize = 120,
51|  label,
52|  onPreviewExisting,
53|  onPreviewNew,
54|  required,
55|}: Props) {
56|  const { colors: c } = useTheme();
57|  const [showTip, setShowTip] = useState(false);
58|  const [containerWidth, setContainerWidth] = useState(0);
59|  const [showMaxHint, setShowMaxHint] = useState(false);
60|  const [showPickerSheet, setShowPickerSheet] = useState(false);
61|  const busyRef = useRef(false);
62|  const existingThumbRefs = useRef<(any | null)[]>([]);
63|  const newThumbRefs = useRef<(any | null)[]>([]);
64|  const pickBtnRef = useRef<any>(null);
65|  const [pickOffsetY, setPickOffsetY] = useState(0);
66|  const [pickOffsetX, setPickOffsetX] = useState(0);
67|
68|  const handlePreviewExisting = useCallback((i: number) => {
69|    if (!onPreviewExisting) return;
70|    const resolver: ThumbLayoutResolver = (idx, cb) => resolveThumbLayout(existingThumbRefs.current[idx], cb);
71|    const ref = existingThumbRefs.current[i];
72|    if (!ref) { onPreviewExisting(i, undefined, resolver); return; }
73|    measureThumbLayout(ref, (layout) => onPreviewExisting(i, layout, resolver));
74|  }, [onPreviewExisting]);
75|
76|  const handlePreviewNew = useCallback((i: number) => {
77|    if (!onPreviewNew) return;
78|    const resolver: ThumbLayoutResolver = (idx, cb) => resolveThumbLayout(newThumbRefs.current[idx], cb);
79|    const ref = newThumbRefs.current[i];
80|    if (!ref) { onPreviewNew(i, undefined, resolver); return; }
81|    measureThumbLayout(ref, (layout) => onPreviewNew(i, layout, resolver));
82|  }, [onPreviewNew]);
83|
84|  const onLayout = useCallback((e: LayoutChangeEvent) => {
85|    const w = e.nativeEvent.layout.width;
86|    if (w > 0) setContainerWidth(w);
87|  }, []);
88|
89|  const handlePick = () => {
90|    const available = MAX_IMAGES - existingImages.length - newFiles.length;
91|    if (available <= 0) {
92|      setShowMaxHint(true);
93|      setTimeout(() => setShowMaxHint(false), 3000);
94|      return;
95|    }
96|    // 测量按钮位置，弹窗跟在其上方
97|    (pickBtnRef.current as any)?.measureInWindow?.((x: number, y: number, _w: number, h: number) => {
98|      setPickOffsetX(x || 16);
99|      setPickOffsetY(y || 100);
100|      setShowPickerSheet(true);
101|    }) || setShowPickerSheet(true);
102|  };
103|
104|  const handlePickFromCamera = useCallback(async () => {
105|    setShowPickerSheet(false);
106|    try {
107|      const photo = await takePhoto();
108|      if (!photo) return;
109|      onAdd([photo]);
110|    } catch (err: any) {
111|      Alert.alert('Error', err?.message || 'Failed to take photo');
112|    }
113|  }, [onAdd]);
114|
115|  const handlePickFromLibrary = useCallback(async () => {
116|    setShowPickerSheet(false);
117|    if (busyRef.current) return;
118|    busyRef.current = true;
119|    try {
120|      const available = MAX_IMAGES - existingImages.length - newFiles.length;
121|      const picked = await pickImages({ multiple: true });
122|      if (!picked || picked.length === 0) return;
123|      const slice = picked.slice(0, available);
124|      if (picked.length > available) {
125|        setShowMaxHint(true);
126|        setTimeout(() => setShowMaxHint(false), 3000);
127|      }
128|      onAdd(slice);
129|    } catch (err: any) {
130|      Alert.alert('Error', err?.message || 'Failed to pick images');
131|    } finally {
132|      busyRef.current = false;
133|    }
134|  }, [existingImages.length, newFiles.length, onAdd]);
135|
136|  const handlePickFiles = useCallback(async () => {
137|    setShowPickerSheet(false);
138|    if (busyRef.current) return;
139|    busyRef.current = true;
140|    try {
141|      const available = MAX_IMAGES - existingImages.length - newFiles.length;
142|      const picked = await pickFiles();
143|      if (!picked || picked.length === 0) return;
144|      const slice = picked.slice(0, available);
145|      if (picked.length > available) {
146|        setShowMaxHint(true);
147|        setTimeout(() => setShowMaxHint(false), 3000);
148|      }
149|      onAdd(slice);
150|    } catch (err: any) {
151|      Alert.alert('Error', err?.message || 'Failed to pick files');
152|    } finally {
153|      busyRef.current = false;
154|    }
155|  }, [existingImages.length, newFiles.length, onAdd]);
156|
157|  const atMax = existingImages.length + newFiles.length >= MAX_IMAGES;
158|  const totalItems = atMax ? existingImages.length + newFiles.length : 1 + existingImages.length + newFiles.length;
159|  const itemsPerRow = Math.min(totalItems, 4);
160|  const thumbSize = containerWidth > 0
161|    ? Math.min(maxThumbSize, (containerWidth - GAP * (itemsPerRow - 1)) / itemsPerRow)
162|    : maxThumbSize;
163|
164|  return (
165|    <View onLayout={onLayout}>
166|      {/* Label + info tip */}
167|      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
168|        <Text style={{ fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: c.textSub, marginBottom: 0 }}>
169|          {label || t('uploadImage')}{required ? <Text style={{ color: REQUIRED_COLOR }}>*</Text> : null}
170|        </Text>
171|        <TouchableOpacity
172|          onPress={() => setShowTip(!showTip)}
173|          activeOpacity={0.7}
174|          style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c.secondary, alignItems: 'center', justifyContent: 'center' }}
175|        >
176|          <Text style={{ fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: c.textSub }}>!</Text>
177|        </TouchableOpacity>
178|        {showTip && (
179|          <View style={{ backgroundColor: c.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
180|            <Text style={{ fontSize: FONTS.micro.size, color: c.surface, fontWeight: '500' as const }}>
181|              {t('uploadFileTip') || '支持 JPG / PNG / WebP / PDF'}
182|            </Text>
183|          </View>
184|        )}
185|      </View>
186|
187|      {/* Add button + previews */}
188|      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
189|        {/* Add button */}
190|        {!atMax && (
191|        <TouchableOpacity
192|          ref={pickBtnRef}
193|          style={{
194|            width: thumbSize, height: thumbSize,
195|            borderRadius: 8,
196|            borderWidth: 1.5, borderStyle: 'dashed' as any,
197|            borderColor: c.secondary,
198|            backgroundColor: c.surface,
199|            alignItems: 'center' as const, justifyContent: 'center' as const,
200|          }}
201|          onPress={handlePick}
202|          activeOpacity={0.7}
203|        >
204|          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c.textSub} strokeWidth={1.5} strokeLinecap="round">
205|            <Path d="M12 5v14M5 12h14" />
206|          </Svg>
207|          {totalItems === 1 && (
208|            <Text style={{ fontSize: FONTS.tiny.size, color: c.textSub, marginTop: 4 }}>{label || t('uploadImage')}</Text>
209|          )}
210|        </TouchableOpacity>
211|        )}
212|
213|        {/* Existing previews */}
214|        {existingImages.map((url: string, i: number) => (
215|          <View key={`existing-${i}`} style={{ position: 'relative' }}>
216|            <TouchableOpacity
217|              ref={el => { existingThumbRefs.current[i] = el; }}
218|              onPress={() => handlePreviewExisting(i)}
219|              activeOpacity={onPreviewExisting ? 0.7 : 1}
220|              disabled={!onPreviewExisting}
221|            >
222|            {isPdfUrl(url) ? (
223|              <View style={{ width: thumbSize, height: thumbSize, borderRadius: 8, backgroundColor: withAlpha(c.textMain, 0.06), alignItems: 'center', justifyContent: 'center', gap: 2 }}>
224|                <Text style={{ fontSize: FONTS.xlarge.size }}>📄</Text>
225|                <Text style={{ fontSize: FONTS.tiny.size, color: c.textSub }}>PDF</Text>
226|              </View>
227|            ) : (
228|              <Image source={{ uri: url }} style={{ width: thumbSize, height: thumbSize, borderRadius: 8 }} />
229|            )}
230|            </TouchableOpacity>
231|            {onRemoveExisting && (
232|              <TouchableOpacity
233|                onPress={() => onRemoveExisting(i)}
234|                activeOpacity={0.7}
235|                style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
236|              >
237|                <Svg width={14} height={14} viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth={2} strokeLinecap="round">
238|                  <Path d="M18 6L6 18M6 6l12 12" />
239|                </Svg>
240|              </TouchableOpacity>
241|            )}
242|          </View>
243|        ))}
244|
245|        {/* New file previews */}
246|        {newFiles.map((file: PickedFile, i: number) => (
247|          <View key={`new-${i}`} style={{ position: 'relative' }}>
248|            <TouchableOpacity
249|              ref={el => { newThumbRefs.current[i] = el; }}
250|              onPress={() => handlePreviewNew(i)}
251|              activeOpacity={onPreviewNew ? 0.7 : 1}
252|              disabled={!onPreviewNew}
253|            >
254|            {isPdfFile(file) ? (
255|              <View style={{ width: thumbSize, height: thumbSize, borderRadius: 8, backgroundColor: withAlpha(c.textMain, 0.06), alignItems: 'center', justifyContent: 'center', gap: 2 }}>
256|                <Text style={{ fontSize: FONTS.xlarge.size }}>📄</Text>
257|                <Text style={{ fontSize: FONTS.tiny.size, color: c.textSub }}>PDF</Text>
258|              </View>
259|            ) : getPreviewUrl ? (
260|              <Image source={{ uri: getPreviewUrl(file) }} style={{ width: thumbSize, height: thumbSize, borderRadius: 8 }} />
261|            ) : (
262|              <View style={{ width: thumbSize, height: thumbSize, borderRadius: 8, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
263|                <Text style={{ fontSize: FONTS.tiny.size, color: c.textSub }} numberOfLines={2}>{file.name}</Text>
264|              </View>
265|            )}
266|            </TouchableOpacity>
267|            {onRemoveNew && (
268|              <TouchableOpacity
269|                onPress={() => onRemoveNew(i)}
270|                activeOpacity={0.7}
271|                style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
272|              >
273|                <Svg width={14} height={14} viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth={2} strokeLinecap="round">
274|                  <Path d="M18 6L6 18M6 6l12 12" />
275|                </Svg>
276|              </TouchableOpacity>
277|            )}
278|          </View>
279|        ))}
280|      </View>
281|
282|      {/* Max limit hint */}
283|      {showMaxHint && (
284|        <Text style={{ fontSize: FONTS.micro.size, color: c.danger, marginTop: 4 }}>
285|          最多{MAX_IMAGES}张
286|        </Text>
287|      )}
288|
289|      <CustomActionSheet
290|        visible={showPickerSheet}
291|        onClose={() => setShowPickerSheet(false)}
292|        actions={[
293|          {
294|            label: t('chooseFromLibrary'),
295|            icon: (
296|              <Svg width={18} height={18} viewBox="0 0 1024 1024" fill={c.textMain}>
297|                <Path d="M875.5 151.4H149.2c-46.3 0-83.8 37.5-83.8 83.8v558.7c0 46.3 37.5 83.8 83.8 83.8h726.3c46.3 0 83.8-37.5 83.8-83.8V235.2c0-46.3-37.5-83.8-83.8-83.8z m14 557L714.1 474.6s-10.2-18.9-46-18.9c-40.6 0-52.8 18.3-52.8 18.3L461.7 711.1s-8.4 15.9-28.8 15.9c-21.5 0-31.7-15.9-31.7-15.9l-80.8-92.3s-20.7-27.4-47.6-27.4c-26.8 0-49 30.3-49 30.3l-88.6 110.4v-482c0-15.4 12.5-28 28-28h698.4c15.4 0 28 12.5 28 28l-0.1 458.3zM470.3 402.8c0 54.7-44.3 99-98.9 99-54.6 0-99-44.3-99-99 0-54.6 44.3-98.9 99-98.9 54.6 0 98.9 44.3 98.9 98.9z" />
298|              </Svg>
299|            ),
300|            onPress: handlePickFromLibrary,
301|          },
302|          {
303|            label: t('takePhoto'),
304|            icon: (
305|              <Svg width={18} height={18} viewBox="0 0 1024 1024" fill={c.textMain}>
306|                <Path d="M851.552 890.88 172.448 890.88c-74.592 0-135.296-60.672-135.296-135.296L37.152 370.752c0-74.624 60.672-135.328 135.296-135.328l132.16 0L302.912 195.904c0-34.624 28.192-62.816 62.816-62.816l302.016 0c29.408 0 53.312 23.904 53.312 53.312l0 49.024 130.464 0c74.592 0 135.296 60.672 135.296 135.328l0 384.832C986.816 830.208 926.144 890.88 851.552 890.88zM172.448 283.456c-48.128 0-87.296 39.168-87.296 87.328l0 384.832c0 48.128 39.168 87.296 87.296 87.296l679.104 0c48.128 0 87.296-39.168 87.296-87.296L938.848 370.752c0-48.16-39.168-87.328-87.296-87.328L716.8 283.424c-24.096 0-43.712-19.616-43.712-43.712L673.088 186.4c0-2.944-2.368-5.312-5.312-5.312l-302.016 0c-8.16 0-14.816 6.656-14.816 14.816L350.944 237.12c0 25.536-20.768 46.304-46.304 46.304L172.448 283.424zM512 755.84c-107.04 0-194.08-87.072-194.08-194.08S404.992 367.68 512 367.68s194.08 87.072 194.08 194.08S619.04 755.84 512 755.84zM512 415.68c-80.576 0-146.08 65.536-146.08 146.08S431.456 707.84 512 707.84s146.08-65.536 146.08-146.08S592.576 415.68 512 415.68zM816.8 438.016c-25.568 0-46.336-20.768-46.336-46.336s20.768-46.336 46.336-46.336 46.336 20.768 46.336 46.336S842.368 438.016 816.8 438.016z" />
307|              </Svg>
308|            ),
309|            onPress: handlePickFromCamera,
310|          },
311|          {
312|            label: t('chooseFile'),
313|            icon: (
314|              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c.textMain} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
315|                <Path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
316|              </Svg>
317|            ),
318|            onPress: handlePickFiles,
319|          },
320|        ]}
321|        dark
322|        noOverlay
323|        offsetY={pickOffsetY}
324|        offsetX={pickOffsetX}
325|      />
326|    </View>
327|  );
328|});
329|