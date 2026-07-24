import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, useWindowDimensions,
} from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import ReAnimated, { useAnimatedStyle, useSharedValue, withTiming, cancelAnimation } from 'react-native-reanimated';
import AppTextInput from '../components/AppTextInput';
import Svg, { Path } from 'react-native-svg';
import TrashIcon from '../components/icons/TrashIcon';
import { t, getLang } from '../i18n';
import { trCategory, trPayment } from '../i18nHelpers';
import { fmtDecInput, toDec2 } from '../utils/numbers';
import { api, resolveAssetUrl } from '../api/client';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import ButtonPair from '../components/ButtonPair';
import { useToast } from '../hooks/useToast';
import ConfirmModal from '../components/ConfirmModal';
import CategoryChips from '../components/CategoryChips';
import PaymentMethodChips from '../components/PaymentMethodChips';
import ExpenseNoteInput from '../components/ExpenseNoteInput';
import DatePicker from '../components/DatePicker';
import HistoryHeader from '../components/HistoryHeader';
import HomeBackground from '../components/HomeBackground';
import { StatusBar } from 'react-native';
import { getCurrentUser, getCurrentUserId } from '../utils/storage';
import { PickedImage } from '../utils/imagePicker';
import { parseImages } from '../utils/parseImages';
import ImagePreview, { measureThumbLayout, resolveThumbLayout, ThumbLayout, ThumbLayoutResolver } from '../components/ImagePreview';
import { Image as ExpoImage } from 'expo-image';
import { useImagePreview } from '../hooks/useImagePreview';
import { useNavigation } from '@react-navigation/native';
import ReceiptUpload from '../components/ReceiptUpload';
import { useServerDate } from '../hooks/useServerDate';

/* ── Date helpers ── */
const fmtLocalDate = (s: string, lang: string) => {
  if (!s) return '—';
  const [y, m, day] = s.split('-');
  if (lang.startsWith('en')) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[+m - 1]} ${+day}, ${y}`;
  }
  return `${y}年${+m}月${+day}日`;
};

/* ── Date helpers ── */
const fmtCreatedAt = (raw: string, lang: string) => {
  if (!raw) return '—';
  const d = new Date(raw.replace(' ', 'T') + '+08:00');
  if (isNaN(d.getTime())) return raw.slice(0, 19).replace('T', ' ');
  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  if (lang.startsWith('en')) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[mo - 1]} ${day}, ${y} ${h}:${mi}:${s}`;
  }
  return `${y}年${mo}月${day}日 ${h}:${mi}:${s}`;
};

/* ── Props ── */
interface Props {
  expense: any;
  onBack: () => void;
  onEdited: () => void;
  onDeleted: () => void;
}

export default function ExpenseDetailScreen({ expense, onBack, onEdited, onDeleted }: Props) {
  const { colors: c, theme } = useTheme();
  const sd = useServerDate();
  const lang = getLang();
  const { width: w, height: windowHeight } = useWindowDimensions();
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const expenseCapAmount = -windowHeight * 0;
  const expenseCapNote   = -windowHeight * 0.18;
  const pushCapSV = useSharedValue(expenseCapAmount);
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(keyboardHeight.value, pushCapSV.value) }],
  }));
  const styles = useMemo(() => getStyles(c), [c]);
  const thumbSize = (w - 16 * 2 - 8 * 3) / 4;

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSavedConfirm, setShowSavedConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const { showToast, ToastHost } = useToast();
  const { preview, openPreview, closePreview } = useImagePreview();
  const navigation = useNavigation<any>();
  const viewThumbRefs = useRef<(any | null)[]>([]);

  const openPdf = useCallback((url: string) => {
    navigation.navigate('PdfPreview', { id: 0, number: 0, fileUrl: url, title: t('expensePdfTitle') as string });
  }, [navigation]);

  const handleViewPreview = useCallback((previewUrls: string[], i: number) => {
    const url = previewUrls[i];
    if (url && /\.pdf(\?|$)/i.test(url)) {
      openPdf(url);
      return;
    }
    // Filter out PDFs from carousel (matching InvoiceScreen pattern)
    const isPdf = (p: string) => /\.pdf(\?|$)/i.test(p);
    const imageUrls = previewUrls.filter(p => !isPdf(p));
    const imageIndex = previewUrls.slice(0, i).filter(p => !isPdf(p)).length;
    // Map carousel index back to display index (skip PDFs)
    const wrappedResolver: ThumbLayoutResolver = (idx, cb) => {
      let orig = 0, cnt = 0;
      for (let k = 0; k < previewUrls.length; k++) {
        if (!isPdf(previewUrls[k])) {
          if (cnt === idx) { orig = k; break; }
          cnt++;
        }
      }
      resolveThumbLayout(viewThumbRefs.current[orig], cb);
    };
    const ref = viewThumbRefs.current[i];
    if (!ref) { openPreview(imageUrls, imageIndex, undefined, wrappedResolver); return; }
    measureThumbLayout(ref, (layout) => openPreview(imageUrls, imageIndex, layout, wrappedResolver));
  }, [openPreview, openPdf]);

  const [category, setCategory] = useState(expense?.category || 'daily');
  const [account, setAccount] = useState(expense?.account || 'payWechat');
  const [amount, setAmount] = useState(toDec2(Math.abs(Number(expense?.amount || 0))));
  const [date, setDate] = useState(expense?.date || expense?.created_at?.slice(0, 10) || sd.today);
  const [note, setNote] = useState(expense?.note || '');
  const [images, setImages] = useState<string[]>(parseImages(expense?.images));
  const [thumbImages, setThumbImages] = useState<string[]>(parseImages(expense?.thumb_images));
  const [newFiles, setNewFiles] = useState<PickedImage[]>([]);

  // Existing images preview (PDF-aware)
  const handlePreviewExisting = useCallback((index: number, layout?: ThumbLayout, getLayout?: ThumbLayoutResolver) => {
    const path = images[index];
    if (path && /\.pdf(\?|$)/i.test(path)) { openPdf(resolveAssetUrl(path) || path); return; }
    const isPdf = (p: string) => /\.pdf(\?|$)/i.test(p);
    const imageUrls = images.filter(p => !isPdf(p)).map(p => resolveAssetUrl(p) || p);
    const imageIndex = images.slice(0, index).filter(p => !isPdf(p)).length;
    const wrappedGetLayout: ThumbLayoutResolver | undefined = getLayout
      ? (ci, cb) => {
          let orig = 0, cnt = 0;
          for (let i = 0; i < images.length; i++) {
            if (!isPdf(images[i])) { if (cnt === ci) { orig = i; break; } cnt++; }
          }
          getLayout(orig, cb);
        } : undefined;
    openPreview(imageUrls, imageIndex, layout, wrappedGetLayout);
  }, [images, openPreview, openPdf]);

  // New files preview (PDF-aware)
  const handlePreviewNew = useCallback((index: number, layout?: ThumbLayout, getLayout?: ThumbLayoutResolver) => {
    const f = newFiles[index];
    if (f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name || '') || /\.pdf$/i.test(f.uri || ''))) {
      openPdf(f.uri); return;
    }
    const isPdf = (ff: any) => ff.type === 'application/pdf' || /\.pdf$/i.test(ff.name || '') || /\.pdf$/i.test(ff.uri || '');
    const imageUris = newFiles.filter(ff => !isPdf(ff)).map(ff => ff.uri);
    const imageIndex = newFiles.slice(0, index).filter(ff => !isPdf(ff)).length;
    const wrappedGetLayout: ThumbLayoutResolver | undefined = getLayout
      ? (ci, cb) => {
          let orig = 0, cnt = 0;
          for (let i = 0; i < newFiles.length; i++) {
            if (!isPdf(newFiles[i])) { if (cnt === ci) { orig = i; break; } cnt++; }
          }
          getLayout(orig, cb);
        } : undefined;
    openPreview(imageUris, imageIndex, layout, wrappedGetLayout);
  }, [newFiles, openPreview, openPdf]);

  const hasChanges =
    category !== (expense?.category || 'daily') ||
    account !== (expense?.account || 'payWechat') ||
    amount !== toDec2(Math.abs(Number(expense?.amount || 0))) ||
    date !== (expense?.date || expense?.created_at?.slice(0, 10) || sd.today) ||
    note !== (expense?.note || '') ||
    JSON.stringify(images) !== JSON.stringify(parseImages(expense?.images)) ||
    JSON.stringify(thumbImages) !== JSON.stringify(parseImages(expense?.thumb_images)) ||
    newFiles.length > 0;

  const currentUser = getCurrentUser();
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  useEffect(() => {
    const uid = getCurrentUserId();
    if (!uid) return;
    try {
      const cached = sessionStorage.getItem('cached_avatar_b64');
      if (cached) setAvatarUrl(cached);
    } catch {}
    // Avatar fetch is optional — fallback to logo if API doesn't support it
    api.getUserAvatar(uid).then((b64: any) => {
        if (!b64) return;
        setAvatarUrl(b64);
        try { sessionStorage.setItem('cached_avatar_b64', b64); } catch {}
      }).catch(() => {});
  }, []);

  const handleSave = async () => {
    const absAmt = parseFloat(amount) || Math.abs(Number(expense?.amount || 0));
    if (!absAmt || absAmt <= 0) { showToast(t('enterAmount')); return; }
    const amt = absAmt * (Number(expense?.amount || 0) < 0 ? -1 : 1);
    setSaving(true);
    try {
      let finalImages = images;
      let finalThumbs = thumbImages;
      if (newFiles.length > 0) {
        const uploadRes: any = await api.uploadExpenseImages(newFiles);
        if (uploadRes?.status !== 'ok') {
          showToast(t('uploadFailed'));
          setSaving(false);
          return;
        }
        finalImages = [...images, ...(uploadRes.images || [])];
        finalThumbs = [...thumbImages, ...(uploadRes.thumb_images || uploadRes.images || [])];
      }
      await api.updateTransaction(expense.id, {
        amount: amt, category, account, date, note,
        images: finalImages, thumb_images: finalThumbs,
      });
      expense.amount = amt;
      expense.category = category;
      expense.account = account;
      expense.date = date;
      expense.note = note;
      expense.images = JSON.stringify(finalImages);
      expense.thumb_images = JSON.stringify(finalThumbs);
      setImages(finalImages);
      setThumbImages(finalThumbs);
      setNewFiles([]);
      setEditMode(false);
      setShowSavedConfirm(true);
      onEdited?.();
    } catch (e: any) {
      showToast(e?.message || t('errNetworkError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.deleteTransaction(expense.id);
      setShowDeleteConfirm(false);
      setDeleting(false);
      onDeleted?.();
      onBack();
    } catch (e: any) {
      setDeleteError(e?.message || t('errNetworkError'));
      setDeleting(false);
    }
  };

  const removeImage = async (idx: number) => {
    const removedUrl = images[idx];
    if (!removedUrl || !expense?.id) return;

    // Optimistic UI update
    setImages(prev => prev.filter((_, i) => i !== idx));
    setThumbImages(prev => prev.filter((_, i) => i !== idx));

    try {
      await api.deleteExpenseImage(removedUrl, expense.id);
      // Clear expo-image cache so stale image isn't shown
      ExpoImage.clearMemoryCache?.();
      ExpoImage.clearDiskCache?.();
    } catch {
      // Rollback on failure
      setImages(parseImages(expense?.images));
      setThumbImages(parseImages(expense?.thumb_images));
      showToast(t('toastDeleteFailed'));
    }
  };
  const removeNewFile = (idx: number) => setNewFiles(prev => prev.filter((_, i) => i !== idx));

  const thumbImgs = parseImages(expense?.thumb_images);
  const displayImgs = thumbImgs.length > 0 ? thumbImgs : parseImages(expense?.images);
  const previewImgs = parseImages(expense?.images);
  const resolvedPreviews = previewImgs.map((u: string) => resolveAssetUrl(u) || u);
  const isRefundRecord = Number(expense?.amount || 0) < 0;

  // theme-specific accent for amount card
  const AMOUNT_COLORS: Record<string, string> = {
    'burgundy-warm': '#FF6B3D',
    'obsidian-gold': '#3B82F6',
    'deep-teal': '#22C55E',
  };
  const amtColor = AMOUNT_COLORS[theme?.id || ''] || '#FF6B3D';
  const amtBg = withAlpha(amtColor, 0.10);

  return (
    <ReAnimated.View style={[{ flex: 1 }, contentStyle]}>
    <View style={styles.container}>
      <HomeBackground />
      <StatusBar barStyle="dark-content" />
      <HistoryHeader
        onBack={onBack}
        title={t('expDetail')}
        rightAction={!expense?.procurement_batch_id ? (
          <TouchableOpacity
            onPress={() => setShowDeleteConfirm(true)}
            activeOpacity={0.7}
            style={styles.actionBtn}
            disabled={deleting}
          >
            <TrashIcon color={c.danger} />
          </TouchableOpacity>
        ) : undefined}
      />
      {/* Body */}
      <ScrollView style={[styles.body, { marginTop: 100 }]} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false} keyboardDismissMode="interactive">
        {/* ── View mode ── */}
        {!editMode && (
          <View>
            {/* Amount card */}
            <View style={[styles.amountCard, { backgroundColor: isRefundRecord ? withAlpha(c.success, 0.10) : amtBg }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.amountLabel}>{t('expTotalAmount')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                  <Text style={[styles.amountSymbol, { color: isRefundRecord ? c.success : amtColor }]}>
                    {isRefundRecord ? '+¥' : '-¥'}
                  </Text>
                  <Text style={[styles.amountValue, { color: isRefundRecord ? c.success : amtColor }]}>
                    {isRefundRecord
                    ? Math.abs(Number(expense?.amount || 0)).toFixed(2)
                    : Number(expense?.amount || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
              {currentUser ? (
                <View style={styles.amountUser}>
                  <Image
                    source={{ uri: avatarUrl || resolveAssetUrl('/img/logo.jpg') || '/img/logo.jpg' }}
                    style={styles.amountAvatar}
                    defaultSource={undefined}
                  />
                  <Text style={styles.amountUsername} numberOfLines={1}>{currentUser}</Text>
                </View>
              ) : null}
            </View>

            {/* Info card */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('expenseCategory')}</Text>
                <Text style={styles.infoValue}>{trCategory(expense?.category)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('paymentMethod')}</Text>
                <Text style={styles.infoValue}>{trPayment(expense?.account)}</Text>
              </View>
              {expense?.proc_batch_number ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('procBatchLabel')}</Text>
                  <Text style={styles.infoValue}>
                    {t('procNowBatch').replace('{n}', String(expense.proc_batch_number))}
                  </Text>
                </View>
              ) : null}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('expenseDate')}</Text>
                <Text style={styles.infoValue}>{fmtLocalDate(expense?.date || '', lang)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('createdAt')}</Text>
                <Text style={styles.infoValue}>{fmtCreatedAt(expense?.created_at || '', lang)}</Text>
              </View>
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>{t('expenseNote')}</Text>
                <Text style={[styles.infoValue, { flex: 1, textAlign: 'right', marginLeft: 12 }]}>
                  {expense?.note || '—'}
                </Text>
              </View>
            </View>

            {/* Settlement info */}
            {expense?.proc_settled_at ? (
              <View style={styles.infoCard}>
                <Text style={[styles.sectionTitle, { marginBottom: 8, color: c.success }]}>
                  {t('procSettleInfo')}
                </Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('procSettleAt')}</Text>
                  <Text style={styles.infoValue}>{expense.proc_settled_at}</Text>
                </View>
                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.infoLabel}>{t('procSettleBy')}</Text>
                  <Text style={styles.infoValue}>{expense.proc_settled_by_username || '—'}</Text>
                </View>
              </View>
            ) : null}

            {/* Receipt images */}
            {displayImgs.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { marginBottom: 6 }]}>{t('receiptExpenseLabel')}</Text>
                <View style={styles.thumbRow}>
                  {displayImgs.map((url: string, i: number) => {
                    const resolvedUrl = resolveAssetUrl(url) || url;
                    const isPdf = /\.pdf(\?|$)/i.test(String(previewImgs[i] || ''));
                    return (
                    <TouchableOpacity
                      key={`v-${i}`}
                      ref={el => { viewThumbRefs.current[i] = el; }}
                      onPress={() => handleViewPreview(resolvedPreviews, i)}
                      activeOpacity={0.8}
                    >
                      {isPdf ? (
                        <View style={[styles.thumb, { width: thumbSize, height: thumbSize, borderRadius: 8, backgroundColor: withAlpha(c.textMain, 0.06), alignItems: 'center', justifyContent: 'center', gap: 2 }]}>
                          <Text style={{ fontSize: FONTS.xlarge.size }}>📄</Text>
                          <Text style={{ fontSize: FONTS.tiny.size, color: c.textSub }}>PDF</Text>
                        </View>
                      ) : (
                        <Image source={{ uri: resolvedUrl }} style={[styles.thumb, { width: thumbSize, height: thumbSize }]} />
                      )}
                    </TouchableOpacity>
                  ); })}
                </View>
              </View>
            )}
            <View style={{ height: 80 }} />
          </View>
        )}

        {/* ── Edit mode ── */}
        {editMode && (
          <View style={styles.editContainer}>
            <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>{t('expTotalAmount')}</Text>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <Text style={{ fontSize: FONTS.large.size, fontWeight: '600', color: isRefundRecord ? c.success : amtColor, marginRight: 2, marginBottom: 4 }}>
                  {isRefundRecord ? '+¥' : '-¥'}
                </Text>
                {expense?.procurement_batch_id ? (
                  <Text style={{ fontSize: FONTS.display.size, fontWeight: '700', color: isRefundRecord ? c.success : c.textSub }}>{amount || '0.00'}</Text>
                ) : (
                  <AppTextInput
                    style={{ fontSize: FONTS.display.size, fontWeight: '700', color: isRefundRecord ? c.success : amtColor, borderWidth: 0, backgroundColor: 'transparent', textAlign: 'left', padding: 0, flex: 0, width: 180 } as any}
                    value={amount}
                    onChangeText={(v: string) => setAmount(fmtDecInput(v))}
                    onFocus={() => { cancelAnimation(pushCapSV); pushCapSV.value = expenseCapAmount; }}
                    onBlur={() => { if (amount !== '') setAmount(toDec2(amount)); }}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={c.textSub}
                  />
                )}
              </View>
            </View>

            {/* Category */}
            {expense?.procurement_batch_id ? (
              <View style={styles.editRow}>
                <Text style={styles.sectionTitleInline}>{t('expenseCategory')}</Text>
                <Text style={styles.editRowValue}>{trCategory(category)}</Text>
              </View>
            ) : (
              <CategoryChips selected={category} onSelect={setCategory} />
            )}

            <PaymentMethodChips selected={account} onSelect={setAccount} />

            {expense?.proc_batch_number ? (
              <View style={styles.editRow}>
                <Text style={styles.sectionTitleInline}>{t('procBatchLabel')}</Text>
                <Text style={styles.editRowValue}>
                  {t('procNowBatch').replace('{n}', String(expense.proc_batch_number))}
                </Text>
              </View>
            ) : null}

            {/* Date */}
            <View style={styles.editRow}>
              <Text style={styles.sectionTitleInline}>{t('expenseDate')}</Text>
              <View style={styles.dateField}>
                <View style={{ paddingVertical: 12, paddingRight: 12 }}>
                <DatePicker
                  date={date}
                  onChange={setDate}
                  max={sd.today}
                  displayDate={fmtLocalDate(date, lang)}
                  fontSize={FONTS.sub.size}
                  color={c.textSub}
                  disabled={!!expense?.procurement_batch_id}
                  showCalendarIcon
                  showChevron
                />
                </View>
              </View>
            </View>

            <ExpenseNoteInput value={note} onChangeText={setNote} onFocus={() => { pushCapSV.value = withTiming(expenseCapNote, { duration: 200 }); }} onBlur={() => { pushCapSV.value = withTiming(expenseCapAmount, { duration: 200 }); }} />

            {/* Images */}
            <ReceiptUpload
              existingImages={images.map(u => resolveAssetUrl(u) || u)}
              newFiles={newFiles}
              onAdd={(files: PickedImage[]) => setNewFiles(prev => {
                const deduped = files.filter(f => !prev.some(p => p.name === f.name && p.size === f.size));
                return [...prev, ...deduped];
              })}
              onRemoveExisting={removeImage}
              onRemoveNew={removeNewFile}
              getPreviewUrl={(f: PickedImage) => f.uri}
              maxThumbSize={thumbSize}
              onPreviewExisting={handlePreviewExisting}
              onPreviewNew={handlePreviewNew}
            />
            <View style={{ height: 100 }} />
          </View>
        )}
      </ScrollView>

      {/* Bottom bar */}
      {editMode ? (
        <View style={styles.bottomBar}>
          <ButtonPair
            leftLabel={t('cancel')}
            leftOnPress={() => {
              setCategory(expense?.category || 'daily');
              setAccount(expense?.account || 'payWechat');
              setAmount(toDec2(Math.abs(Number(expense?.amount || 0))));
              setDate(expense?.date || expense?.created_at?.slice(0, 10) || sd.today);
              setNote(expense?.note || '');
              setImages(parseImages(expense?.images));
              setThumbImages(parseImages(expense?.thumb_images));
              setNewFiles([]);
              setEditMode(false);
            }}
            rightLabel={t('confirm')}
            rightOnPress={handleSave}
            rightDisabled={!hasChanges || saving}
            rightLoading={saving}
          />
        </View>
      ) : (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: c.primary }]}
            onPress={() => setEditMode(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.editBtnText}>{t('edit')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Delete confirm — shared ConfirmModal */}
      <ConfirmModal visible={showDeleteConfirm}
        title={t('confirmDeleteRecord')}
        message={deleteError ? (
          <Text style={{ color: c.danger, fontSize: FONTS.micro.size, textAlign: 'center' }}>{deleteError}</Text>
        ) : (
          "确认删除该笔支出数据，将无法恢复"
        )}
        confirmLabel={deleting ? '删除中…' : (t('confirm') || t('delete'))}
        cancelLabel={t('cancel')}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setShowDeleteConfirm(false); setDeleteError(''); }} />

      {/* Save success confirm */}
      <ConfirmModal visible={showSavedConfirm}
        title={t('expUpdated')}
        message={t('expSavedMsg')}
        confirmLabel={t('backToList')} cancelLabel={t('stayPage')}
        onConfirm={() => { setShowSavedConfirm(false); onBack(); }}
        onCancel={() => setShowSavedConfirm(false)} />

      {/* Image preview */}
      <ImagePreview
        images={preview?.images ?? []}
        initialIdx={preview?.idx ?? 0}
        visible={preview !== null}
        thumbLayout={preview?.layout}
        getThumbLayout={preview?.getLayout}
        onClose={closePreview}
      />

      {ToastHost}
    </View>
    </ReAnimated.View>
  );
}

const getStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 50,
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 10,
      backgroundColor: withAlpha(c.bg, 0.6),
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: withAlpha(c.bg, 0.30),
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.10)',
    },
    title: {
      flex: 1, fontSize: FONTS.h2.size, fontWeight: '700', color: c.textMain,
    },
    actionBtn: {
      width: 34, height: 34,
      justifyContent: 'center', alignItems: 'center', padding: 4,
    },
    body: { flex: 1, backgroundColor: c.bg },
    bodyContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },

    amountCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingVertical: 20,
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    amountLabel: {
      fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: c.textSub,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
    },
    amountValue: { fontSize: FONTS.display.size, fontWeight: '700' },
    amountSymbol: { fontSize: FONTS.large.size, fontWeight: '600', marginRight: 2, marginBottom: 2 },
    amountUser: { alignItems: 'center', marginLeft: 12 },
    amountAvatar: { width: 36, height: 36, borderRadius: 18, marginBottom: 4, backgroundColor: withAlpha(c.textMain, 0.08) },
    amountUsername: { fontSize: FONTS.sub.size, fontWeight: '600', color: c.textMain, maxWidth: 100 },

    infoCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 42,
      borderBottomWidth: 0.5,
      borderBottomColor: withAlpha(c.textMain, 0.06),
    },
    infoLabel: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: c.textSub },
    infoValue: { fontSize: FONTS.sub.size, fontWeight: '500', color: c.textMain },

    section: { marginBottom: 16 },
    sectionTitle: {
      fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: c.textSub,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
    },
    sectionTitleInline: {
      fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: c.textSub,
      width: 56,
    },
    thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    thumb: {
      width: 72, height: 72, borderRadius: 8,
      borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.08),
      backgroundColor: withAlpha(c.textMain, 0.04),
    },
    thumbWrap: { position: 'relative' },
    thumbRemove: {
      position: 'absolute', top: -6, right: -6,
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center', alignItems: 'center',
    },
    thumbRemoveText: { color: '#fff', fontSize: FONTS.body.size, fontWeight: '700', lineHeight: 18 },
    addThumb: {
      borderRadius: 8, borderWidth: 1, borderColor: withAlpha(c.textMain, 0.18),
      borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
      backgroundColor: withAlpha(c.textMain, 0.04),
    },

    editContainer: { gap: 14 },
    amountEditWrap: { alignItems: 'center', paddingVertical: 8 },
    amountEditSymbol: { fontSize: FONTS.large.size, fontWeight: '600', marginRight: 2, marginBottom: 4 },
    amountEditValue: {
      fontSize: FONTS.display.size, fontWeight: '700',
      borderWidth: 0, backgroundColor: 'transparent',
      textAlign: 'left', padding: 0, flex: 0, width: 180,
    },
    editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    editRowValue: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: c.textSub },
    dateField: {
      flex: 1, backgroundColor: c.bg, borderRadius: 10,
    },
    dateText: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: c.textSub },

    bottomBar: {
      backgroundColor: c.bg,
      paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8,
    },
    editBtn: {
      borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    },
    editBtnText: {
      color: c.surface, fontSize: FONTS.subBold.size,
      fontWeight: FONTS.subBold.weight,
    },

    /* Image preview */
    previewBackdrop: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    },
    previewClose: {
      position: 'absolute', top: 50, right: 16, zIndex: 10,
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center', alignItems: 'center',
    },
    previewCloseText: { color: '#fff', fontSize: FONTS.xlarge.size, fontWeight: '600', lineHeight: 24 },
  });
