import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, Switch, StatusBar,
} from 'react-native';
import HomeBackground from '../components/HomeBackground';
import HistoryHeader from '../components/HistoryHeader';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line } from 'react-native-svg';
import { t } from '../i18n';
import { trCategory, trPayment } from '../i18nHelpers';
import { api, resolveAssetUrl } from '../api/client';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { MODAL_CARD_RADIUS } from '../sharedStyles';
import ConfirmModal from '../components/ConfirmModal';
import ModalOverlay from '../components/ModalOverlay';
import ImagePreview, { measureThumbLayout, resolveThumbLayout, ThumbLayoutResolver } from '../components/ImagePreview';
import { useImagePreview } from '../hooks/useImagePreview';
import { useNavigation } from '@react-navigation/native';
import { formatDate } from '../utils/format';
import TrashIcon from '../components/icons/TrashIcon';
import { getCurrentUser } from '../utils/storage';
import { parseImages } from '../utils/parseImages';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface BatchItem {
  name?: string;
  product_name?: string;
  product_id?: number;
  quantity: number;
  subtotal?: number;
  unit_price?: number;
  supplier?: string;
}

interface BatchRecord {
  id: number;
  batch_number: number;
  date: string;
  payment_method: string;
  category: string;
  total: number;
  note?: string;
  images?: string[];
  thumb_images?: string[];
  items: BatchItem[];
  settled_at?: string | null;
  settled_by?: number | null;
  settled_by_username?: string | null;
}

function ViewIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <Path d="M14 2v6h6" />
      <Path d="M8 13h4" />
      <Path d="M8 17h8" />
      <Path d="M8 9h1" />
    </Svg>
  );
}

function EditIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Svg>
  );
}

export default function ProcurementDetailScreen({ batch, onBack, onEdit, onPreview }: { batch: BatchRecord | null; onBack: () => void; onEdit?: () => void; onPreview: (id: number, number: number, supplier?: string) => void }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const safeTop = insets.top;
  const headerHeight = safeTop + 44;
  const styles = useMemo(() => getStyles(c), [c]);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const { preview: previewData, openPreview, closePreview } = useImagePreview();
  const thumbRefs = useRef<(any | null)[]>([]);
  const navigation = useNavigation<any>();

  const [cur, setCur] = useState<BatchRecord | null>(batch);
  useEffect(() => { setCur(batch); }, [batch]);

  const openPdf = useCallback((url: string) => {
    const title = cur?.batch_number
      ? (t('procVoucherTitle') as string).replace('{n}', String(cur.batch_number))
      : (t('procOrderItems') as string);
    navigation.navigate('PdfPreview', { id: 0, number: cur?.batch_number || 0, fileUrl: url, title, fileNamePrefix: t('procVoucherFileName') as string });
  }, [navigation, cur?.batch_number]);

  const handleThumbPreview = useCallback((images: string[], i: number) => {
    const url = images[i];
    if (url && /\.pdf(\?|$)/i.test(url)) {
      openPdf(url);
      return;
    }
    // Filter out PDFs from carousel (matching InvoiceScreen pattern)
    const isPdf = (p: string) => /\.pdf(\?|$)/i.test(p);
    const imageUrls = images.filter(p => !isPdf(p));
    const imageIndex = images.slice(0, i).filter(p => !isPdf(p)).length;
    // Map carousel index back to display index (skip PDFs)
    const wrappedResolver: ThumbLayoutResolver = (idx, cb) => {
      let orig = 0, cnt = 0;
      for (let k = 0; k < images.length; k++) {
        if (!isPdf(images[k])) {
          if (cnt === idx) { orig = k; break; }
          cnt++;
        }
      }
      resolveThumbLayout(thumbRefs.current[orig], cb);
    };
    const ref = thumbRefs.current[i];
    if (!ref) { openPreview(imageUrls, imageIndex, undefined, wrappedResolver); return; }
    measureThumbLayout(ref, (layout) => openPreview(imageUrls, imageIndex, layout, wrappedResolver));
  }, [openPreview, openPdf]);
  const [settling, setSettling] = useState(false);
  const [showSettleConfirm, setShowSettleConfirm] = useState(false);
  const [settleError, setSettleError] = useState('');

  if (!cur) {
    return (
      <View style={styles.container}>
        <HomeBackground />
        <StatusBar barStyle="dark-content" />
        <HistoryHeader safeTop={safeTop} onBack={onBack} title={t('procOrderItems')} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: c.textSub }}>—</Text>
        </View>
      </View>
    );
  }

  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const downloadPDF = () => {
    const suppliers = [...new Set((cur?.items || []).map(i => i.supplier).filter(Boolean))];
    if (suppliers.length === 0) {
      jumpToPdf();
      return;
    }
    setShowSupplierPicker(true);
  };
  const jumpToPdf = (supplier?: string) => {
    setShowSupplierPicker(false);
    onPreview(cur!.id, cur!.batch_number, supplier);
  };

  const handleDelete = async () => {
    if (!cur || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.deleteProcurementBatch(cur.id);
      setShowDeleteConfirm(false);
      setDeleting(false);
      onBack();
    } catch (err: any) {
      setDeleteError(err?.message || '删除失败，请重试');
      setDeleting(false);
    }
  };

  const handleSettle = async () => {
    if (!cur || settling) return;
    setSettling(true);
    setSettleError('');
    try {
      const r: any = await api.settleProcurementBatch(cur.id);
      if (r?.status === 'ok' && r.batch) {
        setCur({ ...cur, ...r.batch });
        setShowSettleConfirm(false);
        // Notify parent list so the settled state reflects without manual refresh
        const onBatchChanged = (cur as any)?._onBatchChanged;
        if (typeof onBatchChanged === 'function') {
          onBatchChanged({ ...cur, ...r.batch });
        }
      } else {
        setSettleError(r?.message || t('toastSubmitFailed'));
      }
    } catch (err: any) {
      setSettleError(err?.message || t('toastSubmitFailed'));
    } finally {
      setSettling(false);
    }
  };

  const thumbImgs = (parseImages(cur.thumb_images).length ? parseImages(cur.thumb_images) : parseImages(cur.images));
  const images: string[] = parseImages(cur.images).map(img => resolveAssetUrl(img) || img);
  const resolvedThumbImgs = thumbImgs.map(img => resolveAssetUrl(img) || img);
  const items = cur.items || [];

  const paymentLabel = trPayment(cur.payment_method);

  return (
    <View style={styles.container}>
      <HomeBackground />
      <StatusBar barStyle="light-content" />
      <HistoryHeader safeTop={safeTop} onBack={onBack} title={t('procDetail')} />

      <ScrollView
        style={[styles.body, { marginTop: headerHeight }]}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Batch info — with action buttons on the right */}
        <View style={styles.batchInfoRow}>
          <View>
            <Text style={styles.batchLabel}>
              {t('procNowBatch').replace('{n}', String(cur.batch_number))}
            </Text>
            <Text style={styles.batchDate}>{formatDate(cur.date)}</Text>
          </View>
          <View style={styles.batchActions}>
            <Switch
              value={!!cur.settled_at}
              onValueChange={(v) => {
                if (v && !cur.settled_at) setShowSettleConfirm(true);
              }}
              disabled={settling || !!cur.settled_at}
              trackColor={{ false: withAlpha(c.textMain, 0.18), true: '#3DBC75' }}
              thumbColor="#fff"
              style={{ transform: [{ scale: 0.75 }] }}
            />
            <TouchableOpacity onPress={downloadPDF} activeOpacity={0.6} style={styles.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ViewIcon color={c.primary} />
            </TouchableOpacity>
            {onEdit && (
              <TouchableOpacity onPress={onEdit} activeOpacity={0.6} style={styles.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <EditIcon color={c.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setShowDeleteConfirm(true)}
              activeOpacity={0.6}
              style={[styles.actionBtn, !!cur.settled_at && { opacity: 0.3 }]}
              disabled={deleting || !!cur.settled_at}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <TrashIcon color={c.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('procPaymentMethod')}</Text>
            <Text style={styles.infoValue}>{paymentLabel}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('expenseCategory')}</Text>
            <Text style={styles.infoValue}>{trCategory(cur.category)}</Text>
          </View>
          <View style={[styles.infoRow, !cur.note && { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>{t('procOperator')}</Text>
            <Text style={styles.infoValue}>{getCurrentUser() || '—'}</Text>
          </View>
          {cur.note ? (
            <View style={[styles.infoRow, { borderBottomWidth: 0, alignItems: 'flex-start' as const, paddingTop: 12 }]}>
              <Text style={styles.infoLabel}>{t('procNoteLabel')}</Text>
              <Text style={styles.infoValue}>{cur.note}</Text>
            </View>
          ) : null}
        </View>

        {/* Settlement info — only shown if this batch has been settled */}
        {cur.settled_at ? (
          <View style={styles.infoCard}>
            <Text style={[styles.sectionTitle, { marginBottom: 8, color: c.success }]}>
              {t('procSettleInfo')}
            </Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('procSettleAt')}</Text>
              <Text style={styles.infoValue}>{cur.settled_at}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>{t('procSettleBy')}</Text>
              <Text style={styles.infoValue}>{cur.settled_by_username || '—'}</Text>
            </View>
          </View>
        ) : null}

        {/* Images */}
        {thumbImgs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('procImages')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {thumbImgs.map((img: string, i: number) => {
                const fullImgs: string[] = cur?.images || [];
                const isPdf = /\.pdf(\?|$)/i.test(String(fullImgs[i] || ''));
                return (
                <TouchableOpacity
                  key={i}
                  ref={el => { thumbRefs.current[i] = el; }}
                  onPress={() => handleThumbPreview(images.length ? images : resolvedThumbImgs, i)}
                  activeOpacity={0.8}
                  style={{ marginRight: 8 }}
                >
                  {isPdf ? (
                    <View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: withAlpha(c.textMain, 0.06), marginRight: 0 }]}>
                      <Text style={{ fontSize: FONTS.large.size }}>📄</Text>
                      <Text style={{ fontSize: FONTS.tiny.size, color: c.textSub }}>PDF</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: resolveAssetUrl(img) || img }} style={[styles.thumb, { marginRight: 0 }]} />
                  )}
                </TouchableOpacity>
              ); })}
            </ScrollView>
          </View>
        )}

        {/* Items */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{t('procOrderItems')}</Text>
            <View style={styles.totalWrap}>
              <Text style={styles.totalLabel}>{t('procTotal')}</Text>
              <Text style={styles.totalAmt}>¥{cur.total.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.itemsCard}>
            {items.map((item, idx) => {
              const name = item.name || item.product_name || `${t('procProduct')}#${item.product_id}`;
              const subtotal = item.subtotal ?? (item.unit_price ?? 0) * item.quantity;
              return (
                <View key={idx} style={[styles.itemRow, idx < items.length - 1 && styles.itemRowBorder]}>
                  <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.itemQty}>×{item.quantity}</Text>
                  <Text style={styles.itemAmt}>¥{(subtotal || 0).toFixed(2)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfirmModal
        visible={showDeleteConfirm}
        title={t('procDeleteBatch')}
        message={deleteError ? (
          <Text style={{ color: c.danger, fontSize: FONTS.micro.size, textAlign: 'center' }}>{deleteError}</Text>
        ) : (
          <>{t('procDeleteBatchConfirmV2').split('{batch}')[0]}<Text style={{ color: c.primary, fontWeight: '600' }}>{t('procNowBatch').replace('{n}', String(cur.batch_number))}</Text>{t('procDeleteBatchConfirmV2').split('{batch}')[1]}</>
        )}
        confirmLabel={deleting ? '删除中…' : t('delete')}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
      />

      <ConfirmModal
        visible={showSettleConfirm}
        title={t('procSettleTitle')}
        message={settleError ? (
          <Text style={{ color: c.danger, fontSize: FONTS.micro.size, textAlign: 'center' }}>{settleError}</Text>
        ) : (
          <Text>{t('procSettleMsg')}</Text>
        )}
        confirmLabel={settling ? '清账中…' : t('procSettle')}
        loading={settling}
        onConfirm={handleSettle}
        onCancel={() => { setShowSettleConfirm(false); setSettleError(''); }}
      />

      {previewData && (
        <ImagePreview
          images={previewData.images}
          initialIdx={previewData.idx}
          visible={true}
          thumbLayout={previewData.layout}
          getThumbLayout={previewData.getLayout}
          onClose={closePreview}
        />
      )}

      {/* Supplier picker for PDF */}
      <ModalOverlay visible={showSupplierPicker} onClose={() => setShowSupplierPicker(false)} animation="springScale">
        <View style={{ backgroundColor: c.surface, borderRadius: MODAL_CARD_RADIUS, width: 320, maxWidth: '90%', overflow: 'hidden' as const }}>
          <View style={{ backgroundColor: c.primary, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.surface, flex: 1 }} numberOfLines={1}>{t('procSelectSupplier')}</Text>
              <TouchableOpacity style={{ padding: 4 }} onPress={() => setShowSupplierPicker(false)}>
                <Svg width="18" height="18" viewBox="0 0 24 24" stroke={c.surface} strokeWidth="2" fill="none">
                  <Line x1="18" y1="6" x2="6" y2="18" />
                  <Line x1="6" y1="6" x2="18" y2="18" />
                </Svg>
              </TouchableOpacity>
          </View>
          <View style={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(() => {
              const suppliers = ['__all__', ...new Set((cur?.items || []).map(i => i.supplier).filter(Boolean))];
              return suppliers.map((sup, idx) => {
                const isAll = sup === '__all__';
                const label = isAll ? t('procAll') : sup;
                return (
                  <TouchableOpacity key={idx}
                    style={{
                      flexGrow: 1, flexBasis: '30%', maxWidth: '32%',
                      paddingVertical: 9, borderRadius: 20, alignItems: 'center',
                      backgroundColor: withAlpha(c.primary, 0.08),
                      borderWidth: 1.5, borderColor: withAlpha(c.primary, 0.15),
                    }}
                    onPress={() => jumpToPdf(isAll ? undefined : sup)}
                    activeOpacity={0.6}
                  >
                    <Text style={{ fontSize: FONTS.sub.size, color: c.primary, fontWeight: '500' }}>{label}</Text>
                  </TouchableOpacity>
                );
              });
            })()}
          </View>
        </View>
      </ModalOverlay>

    </View>
  );
}

const getStyles = (c: ThemeColors) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.08)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    title: {
      flex: 1,
      fontSize: FONTS.sub.size,
      fontWeight: '600' as const,
      color: '#000',
    },
    actionBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: withAlpha(c.bg, 0.30),
      justifyContent: 'center' as const, alignItems: 'center' as const,
      // @ts-ignore
      borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.10)',
    },
    batchInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    batchActions: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      marginTop: 2,
    },
    batchLabel: {
      fontSize: FONTS.subBold.size,
      fontWeight: FONTS.subBold.weight,
      color: c.textMain,
    },
    batchDate: {
      fontSize: FONTS.micro.size,
      color: c.textSub,
      marginTop: 2,
    },
    body: {
      flex: 1,
      backgroundColor: c.bg,
    },
    bodyContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    infoCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    infoRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      minHeight: 42,
      borderBottomWidth: 0.5,
      borderBottomColor: withAlpha(c.textMain, 0.06),
    },
    infoLabel: {
      fontSize: FONTS.sub.size,
      color: c.textSub,
      flexShrink: 0,
    },
    infoValue: {
      fontSize: FONTS.sub.size,
      fontWeight: '500' as const,
      color: c.textMain,
      flex: 1,
      textAlign: 'right' as const,
    },
    section: {
      marginBottom: 16,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: FONTS.micro.size,
      fontWeight: '600',
      color: c.textSub,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    totalLabel: {
      fontSize: FONTS.micro.size,
      color: c.textSub,
      marginRight: 6,
    },
    totalWrap: {
      flexDirection: 'row', alignItems: 'baseline',
      marginRight: 16,
    },
    totalAmt: {
      fontSize: FONTS.body.size,
      fontWeight: '700' as const,
      color: c.primary,
      minWidth: 72,
      textAlign: 'right' as const,
    },
    thumb: {
      width: 72,
      height: 72,
      borderRadius: 8,
      marginRight: 8,
      borderWidth: 0.5,
      borderColor: withAlpha(c.textMain, 0.08),
    },
    itemsCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    itemRowBorder: {
      borderBottomWidth: 0.5,
      borderBottomColor: withAlpha(c.textMain, 0.06),
    },
    itemName: {
      flex: 1,
      fontSize: FONTS.sub.size,
      color: c.textMain,
    },
    itemQty: {
      fontSize: FONTS.sub.size,
      color: c.textSub,
      marginRight: 16,
    },
    itemAmt: {
      fontSize: FONTS.sub.size,
      fontWeight: '600' as const,
      color: c.textMain,
      minWidth: 72,
      textAlign: 'right' as const,
    },
  });
};
