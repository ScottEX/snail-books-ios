import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, Alert, Modal,
} from 'react-native';
import { parseImages } from '../utils/parseImages';
import Svg, { Path } from 'react-native-svg';
import { t } from '../i18n';
import { trCategory, trPayment } from '../i18nHelpers';
import { api } from '../api/client';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { historyHeader } from '../sharedStyles';
import BackArrow from '../components/icons/BackArrow';
import TrashIcon from '../components/icons/TrashIcon';
import { getCurrentUser } from '../utils/storage';
import { formatDate } from '../utils/format';
import Toast from '../components/Toast';
import { useSwipeBack } from '../hooks/useSwipeBack';

interface BatchItem {
  name?: string;
  product_name?: string;
  product_id?: number;
  quantity: number;
  subtotal?: number;
  unit_price?: number;
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
  supplier?: string;
}

interface Props {
  batch: BatchRecord | null;
  onBack: () => void;
  onEdit: (batch: BatchRecord) => void;
  onDelete: (batch: BatchRecord) => void;
  onOpenInvoice: (batchId: number) => void;
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

function ShareIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <Path d="M16 6l-4-4-4 4" />
      <Path d="M12 2v13" />
    </Svg>
  );
}

function InvoiceIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <Path d="M14 2v6h6" />
      <Path d="M9 13h6" />
      <Path d="M9 17h4" />
    </Svg>
  );
}

export default function ProcurementDetailScreen({ batch, onBack, onEdit, onDelete, onOpenInvoice }: Props) {
  const { colors: c } = useTheme();
  const swipeBack = useSwipeBack(onBack);
  const styles = useMemo(() => getStyles(c), [c]);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [settling, setSettling] = useState(false);
  const [showSettleConfirm, setShowSettleConfirm] = useState(false);
  const [toast, setToast] = useState('');
  // Local mirror so settled state updates without waiting for parent
  const [cur, setCur] = useState<BatchRecord | null>(batch);
  useEffect(() => { setCur(batch); }, [batch]);

  if (!cur) {
    return (
      <View style={styles.container} {...swipeBack}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
            <View style={styles.backBtn}>
              <BackArrow color="#000" />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>{t('procOrderItems')}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: c.textSub }}>—</Text>
        </View>
      </View>
    );
  }

  const isSettled = !!cur.settled_at;

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await api.deleteProcurementBatch(cur.id);
      setShowDeleteConfirm(false);
      setDeleting(false);
      onDelete(cur);
    } catch (err: any) {
      setToast(err?.message || t('toastSubmitFailed'));
      setDeleting(false);
    }
  };

  const handleSettle = async () => {
    if (settling) return;
    setSettling(true);
    try {
      const r: any = await api.settleProcurementBatch(cur.id);
      if (r?.status === 'ok' && r.batch) {
        setCur({ ...cur, ...r.batch });
        setShowSettleConfirm(false);
        setToast(t('procSettle') + ' ✓');
      } else {
        setToast(r?.message || t('toastSubmitFailed'));
      }
    } catch (err: any) {
      setToast(err?.message || t('toastSubmitFailed'));
    } finally {
      setSettling(false);
    }
  };

  const handleShare = async () => {
    try {
      const r: any = await api.getProcurementShareLink(cur.id);
      if (r?.url) {
        Alert.alert(t('shareLink'), r.url);
      } else {
        setToast(t('uploadFailedShort'));
      }
    } catch {
      setToast(t('toastLoadFailed'));
    }
  };

  const thumbImgs = (parseImages(cur.thumb_images).length ? parseImages(cur.thumb_images) : parseImages(cur.images));
  const items = cur.items || [];
  const paymentLabel = trPayment(cur.payment_method);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <View style={styles.backBtn}>
            <BackArrow color="#000" />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>{t('procDetail')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Batch info row with status + actions */}
        <View style={styles.batchInfoRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.batchLabel}>
              {t('procNowBatch').replace('{n}', String(cur.batch_number))}
            </Text>
            <Text style={styles.batchDate}>{formatDate(cur.date)}</Text>
          </View>
          <View style={[styles.statusBadge, isSettled ? styles.statusBadgeSettled : styles.statusBadgePending]}>
            <Text style={[styles.statusBadgeText, { color: isSettled ? c.success : c.warning }]}>
              {isSettled ? t('procSettle') : '待清账'}
            </Text>
          </View>
        </View>

        {/* Action row */}
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={handleShare} activeOpacity={0.7} style={styles.actionBtn}>
            <ShareIcon color={c.primary} />
            <Text style={styles.actionLabel}>{t('shareLink')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onOpenInvoice(cur.id)} activeOpacity={0.7} style={styles.actionBtn}>
            <InvoiceIcon color={c.primary} />
            <Text style={styles.actionLabel}>{'发票'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEdit(cur)} activeOpacity={0.7} style={styles.actionBtn}>
            <EditIcon color={c.primary} />
            <Text style={styles.actionLabel}>{t('changeEmail').includes('email') ? 'Edit' : '编辑'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowDeleteConfirm(true)}
            activeOpacity={isSettled ? 1 : 0.7}
            style={[styles.actionBtn, isSettled && { opacity: 0.3 }]}
            disabled={isSettled || deleting}
          >
            <TrashIcon color={c.danger} />
            <Text style={[styles.actionLabel, { color: c.danger }]}>{t('delete')}</Text>
          </TouchableOpacity>
        </View>

        {/* Settle button — only when not yet settled */}
        {!isSettled && (
          <TouchableOpacity
            onPress={() => setShowSettleConfirm(true)}
            activeOpacity={0.8}
            style={styles.settleBtn}
            disabled={settling}
          >
            <Text style={styles.settleBtnText}>{settling ? '...' : t('procSettle')}</Text>
          </TouchableOpacity>
        )}

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
          {cur.supplier ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{'供应商'}</Text>
              <Text style={styles.infoValue}>{cur.supplier}</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('procOperator')}</Text>
            <Text style={styles.infoValue}>{getCurrentUser() || '—'}</Text>
          </View>
          {cur.note ? (
            <View style={[styles.infoRow, { borderBottomWidth: 0, paddingTop: 0 }]}>
              <Text style={styles.infoLabel}>{t('procNoteLabel')}</Text>
              <Text style={styles.infoValue}>{cur.note}</Text>
            </View>
          ) : null}
        </View>

        {/* Settlement info */}
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

        {/* Image thumbnails */}
        {thumbImgs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('procImages')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {thumbImgs.map((img: string, i: number) => (
                <Image key={i} source={{ uri: img }} style={styles.thumb} />
              ))}
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
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.itemMeta}>
                      {item.quantity}{t('procProductSpec') ? ' · ' : ' × '}
                      {item.unit_price ? `¥${item.unit_price.toFixed(2)}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.itemAmt}>¥{(subtotal || 0).toFixed(2)}</Text>
                </View>
              );
            })}
            {items.length === 0 ? (
              <Text style={{ color: c.textSub, padding: 16, textAlign: 'center' }}>—</Text>
            ) : null}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Delete confirmation modal */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('procDeleteBatch')}</Text>
            <Text style={styles.modalMsg}>
              {t('procDeleteBatchConfirmV2')
                .split('{batch}')
                .map((part: string, i: number, arr: string[]) =>
                  i < arr.length - 1
                    ? (
                      <Text key={i}>
                        {part}
                        <Text style={{ color: c.primary, fontWeight: '600' }}>
                          {t('procNowBatch').replace('{n}', String(cur.batch_number))}
                        </Text>
                      </Text>
                    )
                    : <Text key={i}>{part}</Text>
                )}
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDeleteBtn} onPress={handleDelete} disabled={deleting}>
                <Text style={styles.modalDeleteText}>{deleting ? '...' : t('delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settle confirmation modal */}
      <Modal visible={showSettleConfirm} transparent animationType="fade" onRequestClose={() => setShowSettleConfirm(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('procSettleTitle')}</Text>
            <Text style={styles.modalMsg}>{t('procSettleMsg')}</Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowSettleConfirm(false)}>
                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSettle} disabled={settling}>
                <Text style={styles.modalConfirmText}>{settling ? '...' : t('procSettle')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
    </View>
  );
}

const getStyles = (c: ThemeColors) => {
  const hdr = historyHeader(c);
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    ...hdr,
    actionBtn: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: 10,
      gap: 4,
      backgroundColor: withAlpha(c.bg, 0.5),
      borderRadius: 10,
      borderWidth: 0.5,
      borderColor: withAlpha(c.textMain, 0.08),
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    actionLabel: {
      fontSize: FONTS.micro.size,
      color: c.primary,
      fontWeight: FONTS.micro.weight,
    },
    batchInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
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
      marginTop: 100,
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
    settleBtn: {
      backgroundColor: c.success,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 16,
    },
    settleBtnText: {
      color: '#fff',
      fontSize: FONTS.subBold.size,
      fontWeight: FONTS.subBold.weight,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 100,
    },
    statusBadgePending: {
      backgroundColor: withAlpha(c.warning, 0.12),
    },
    statusBadgeSettled: {
      backgroundColor: withAlpha(c.success, 0.12),
    },
    statusBadgeText: {
      fontSize: FONTS.micro.size,
      fontWeight: '600',
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
      gap: 12,
    },
    itemRowBorder: {
      borderBottomWidth: 0.5,
      borderBottomColor: withAlpha(c.textMain, 0.06),
    },
    itemName: {
      fontSize: FONTS.sub.size,
      color: c.textMain,
      fontWeight: FONTS.sub.weight,
    },
    itemMeta: {
      fontSize: FONTS.micro.size,
      color: c.textSub,
      marginTop: 2,
    },
    itemAmt: {
      fontSize: FONTS.sub.size,
      fontWeight: '600' as const,
      color: c.textMain,
      minWidth: 80,
      textAlign: 'right' as const,
    },
    totalLabel: {
      fontSize: FONTS.micro.size,
      color: c.textSub,
      marginRight: 6,
    },
    totalWrap: {
      flexDirection: 'row' as const,
      alignItems: 'baseline' as const,
      marginRight: 16,
    },
    totalAmt: {
      fontSize: FONTS.body.size,
      fontWeight: '700' as const,
      color: c.primary,
      minWidth: 72,
      textAlign: 'right' as const,
    },
    // Modal
    modalBackdrop: {
      flex: 1,
      backgroundColor: withAlpha(c.textMain, 0.4),
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      width: 320,
      maxWidth: '100%',
      padding: 20,
    },
    modalTitle: {
      fontSize: FONTS.subBold.size,
      fontWeight: '700' as const,
      color: c.textMain,
      marginBottom: 12,
      textAlign: 'center',
    },
    modalMsg: {
      fontSize: FONTS.sub.size,
      color: c.textSub,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: 20,
    },
    modalBtnRow: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancelBtn: {
      flex: 1,
      backgroundColor: c.bg,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    modalCancelText: {
      fontSize: FONTS.sub.size,
      fontWeight: FONTS.sub.weight,
      color: c.textSub,
    },
    modalConfirmBtn: {
      flex: 1,
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    modalConfirmText: {
      fontSize: FONTS.sub.size,
      fontWeight: FONTS.sub.weight,
      color: c.surface,
    },
    modalDeleteBtn: {
      flex: 1,
      backgroundColor: c.danger,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    modalDeleteText: {
      fontSize: FONTS.sub.size,
      fontWeight: FONTS.sub.weight,
      color: c.surface,
    },
  });
};