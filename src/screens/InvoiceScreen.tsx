import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Image,
  Modal, ActivityIndicator, Animated, useWindowDimensions,
} from 'react-native';
import Svg, { Path, Line, Circle, Rect } from 'react-native-svg';
import { t } from '../i18n';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { api } from '../api/client';
import Toast from '../components/Toast';
import EmptyState from '../components/EmptyState';
import { pickImages, takePhoto, PickedImage } from '../utils/imagePicker';
import { useImagePreview } from '../hooks/useImagePreview';

/* ═══════════════ ICONS ═══════════════ */

const IcnBack = ({ color }: { color: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M15 18l-6-6 6-6" />
  </Svg>
);

const IcnPlus = ({ color }: { color: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" stroke={color} strokeWidth={2} fill="none">
    <Line x1="12" y1="5" x2="12" y2="19" />
    <Line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);

const IcnClose = ({ color }: { color: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 6L6 18M6 6l12 12" />
  </Svg>
);

const IcnTrash = ({ color }: { color: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
  </Svg>
);

const IcnCamera = ({ color }: { color: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
    <Circle cx="12" cy="13" r="4" />
  </Svg>
);

const IcnGallery = ({ color }: { color: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="3" width="18" height="18" rx="2" />
    <Circle cx="8.5" cy="8.5" r="1.5" />
    <Path d="M21 15l-5-5L5 21" />
  </Svg>
);

const InvoiceEmptyIcon = ({ color }: { color: string }) => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <Path d="M14 2v6h6" />
    <Line x1="8" y1="13" x2="16" y2="13" />
    <Line x1="8" y1="17" x2="14" y2="17" />
  </Svg>
);

/* ═══════════════ TYPES ═══════════════ */

type InvType = 'vat' | 'general';
type InvStatus = 'done' | 'pending';

interface InvoiceData {
  company_name: string;
  tax_id: string;
  bank_name: string;
  bank_account: string;
  address: string;
  phone: string;
  email: string;
  inv_type: InvType;
}

interface InvoiceRecord {
  id: number;
  user_id?: number;
  procurement_batch_id?: number | null;
  batch_number?: number | null;
  type: InvType;
  company: string;
  tax_id: string;
  amount: number;
  date: string;
  invoice_number: string;
  email: string;
  status: InvStatus;
  file_path?: string;
  file_type?: string;
  file_size?: number;
  note?: string;
  created_at?: string;
}

const EMPTY_INV: InvoiceData = {
  company_name: '', tax_id: '', bank_name: '', bank_account: '',
  address: '', phone: '', email: '', inv_type: 'vat',
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function formatAmountForDisplay(raw: string): string {
  if (!raw) return '';
  const num = Number(raw);
  if (!isFinite(num) || isNaN(num)) return raw;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAmountForStorage(raw: string): string {
  if (!raw) return '';
  const num = Number(raw);
  if (!isFinite(num) || isNaN(num)) return raw;
  return num.toFixed(2);
}

const formatPhone = (phone: string): string => {
  const d = (phone || '').replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
  return phone || '';
};

const parseFilePaths = (fp: string | null | undefined): string[] => {
  if (!fp) return [];
  if (fp.startsWith('[')) { try { return JSON.parse(fp); } catch { return [fp]; } }
  return [fp];
};

/* ═══════════════ COMPONENT ═══════════════ */

interface Props {
  onBack: () => void;
  filterBatchId?: number | null;
}

export default function InvoiceScreen({ onBack, filterBatchId }: Props) {
  const { colors: c } = useTheme();
  const { width: w } = useWindowDimensions();
  const styles = useMemo(() => getStyles(c), [c]);

  // Tabs: 0 = info, 1 = records
  const [tab, setTab] = useState<number>(filterBatchId ? 1 : 0);
  const [invType, setInvType] = useState<InvType>('vat');
  const [data, setData] = useState<InvoiceData>(EMPTY_INV);
  const [orig, setOrig] = useState<InvoiceData>(EMPTY_INV);
  const [loaded, setLoaded] = useState(false);

  // Admin check (we keep editable rows enabled — backend permits all users)
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r: any = await api.admin?.check?.();
        setIsAdmin(r?.is_admin === true);
      } catch { /* default false */ }
    })();
  }, []);

  // User email for display
  const [userEmail, setUserEmail] = useState('');
  useEffect(() => {
    try {
      const stored = localStorage.getItem('email');
      if (stored) { setUserEmail(stored); return; }
    } catch {}
    (async () => {
      try {
        const j: any = await api.admin?.getMe?.();
        const u = j?.user || j?.data || j;
        if (u?.email) setUserEmail(u.email);
      } catch {}
    })();
  }, []);

  // Records
  const [records, setRecords] = useState<InvoiceRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Drawer (create/edit)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dType, setDType] = useState<InvType>('general');
  const [dAmount, setDAmount] = useState('');
  const [dAmountFocus, setDAmountFocus] = useState(false);
  const [dDate, setDDate] = useState(todayStr());
  const [dNote, setDNote] = useState('');
  const [dEmail, setDEmail] = useState('');
  const [dInvoiceNo, setDInvoiceNo] = useState('');
  const [dStatus, setDStatus] = useState<InvStatus>('pending');
  const [dBatchId, setDBatchId] = useState<number | null>(null);
  const [batchList, setBatchList] = useState<any[]>([]);
  const [dFiles, setDFiles] = useState<PickedImage[]>([]);
  const [dExistingFilePath, setDExistingFilePath] = useState<string[]>([]);

  // Drawer animation
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const [toast, setToast] = useState('');

  // Image preview (for the in-drawer preview taps)
  const { visible: previewVisible, uri: previewUri, show: showPreview, close: closePreview } = useImagePreview();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  };

  /* ── Load records ── */
  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const f: any = {};
      if (filterBatchId) f.procurement_batch_id = filterBatchId;
      const list = await api.getInvoiceRecords(f);
      setRecords(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('loadRecords failed', e);
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  }, [filterBatchId]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  /* ── Load invoice info (info tab) ── */
  useEffect(() => {
    (async () => {
      try {
        const inv: any = await api.getInvoice();
        if (inv?.status === 'ok' && inv.data) {
          const d = { ...EMPTY_INV, ...inv.data };
          setData(d);
          setOrig(d);
          setDEmail(inv.data.email || '');
          setInvType(inv.data.inv_type || 'vat');
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const hasChanged = JSON.stringify(data) !== JSON.stringify(orig);
  const isSaving = useRef(false);

  const handleSaveInfo = async () => {
    if (!hasChanged || isSaving.current) return;
    isSaving.current = true;
    try {
      await api.updateInvoice({ ...data, inv_type: invType } as any);
      setOrig({ ...data, inv_type: invType });
      showToast(t('invSavedMsg') || '已保存');
    } catch {
      showToast('保存失败');
    }
    isSaving.current = false;
  };

  /* ── Stats ── */
  const totalCount = records.length;
  const totalAmount = records.reduce((s, r) => s + (r.amount || 0), 0);
  const pendingCount = records.filter(r => r.status === 'pending').length;

  /* ── Filtered records ── */
  const filtered = records.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'done') return r.status === 'done';
    if (filter === 'vat') return r.type === 'vat';
    if (filter === 'general') return r.type === 'general';
    return true;
  });

  const FILTERS = [
    { key: 'all', label: t('invFilterAll') },
    { key: 'pending', label: t('invFilterPending') },
    { key: 'done', label: t('invFilterDone') },
    { key: 'general', label: t('invGeneral') },
    { key: 'vat', label: t('invVatSpecial') },
  ];

  const typeBadgeLabel = (tp: InvType) => tp === 'vat' ? t('invVatSpecial') : t('invGeneral');

  /* ── Delete ── */
  const handleConfirmDelete = async () => {
    if (confirmDeleteId == null || deleting) return;
    setDeleting(true);
    try {
      await api.deleteInvoiceRecord(confirmDeleteId);
      setConfirmDeleteId(null);
      await loadRecords();
    } catch (e: any) {
      showToast('⚠️ ' + (e?.message || t('errNetworkError')));
    } finally {
      setDeleting(false);
    }
  };

  /* ── Drawer submit ── */
  const handleDrawerSubmit = async () => {
    if (submitting) return;
    if (!dAmount) { showToast('⚠️ ' + t('invDrawerAmount')); return; }
    if (!data.company_name || !data.tax_id) { showToast('⚠️ ' + t('invEmpty')); return; }
    if (dStatus === 'done' && !dInvoiceNo.trim()) {
      showToast('⚠️ ' + t('invRecInvoiceNo'));
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        type: dType,
        amount: Number(dAmount) || 0,
        date: dDate,
        company: data.company_name,
        tax_id: data.tax_id,
        invoice_number: dInvoiceNo.trim(),
        email: dEmail.trim(),
        status: dStatus,
        procurement_batch_id: dBatchId,
        note: dNote.trim(),
      };
      let rid: number;
      if (editingId) {
        const uploadedPaths: string[] = [];
        for (const f of dFiles) {
          const res: any = await api.uploadInvoiceFile(editingId, f);
          if (res?.file_path) uploadedPaths.push(res.file_path);
        }
        const finalFilePath = JSON.stringify([...dExistingFilePath, ...uploadedPaths]);
        await api.updateInvoiceRecord(editingId, { ...payload, file_path: finalFilePath });
        rid = editingId;
      } else {
        const res: any = await api.createInvoiceRecord(payload);
        rid = res?.id;
        if (rid && dFiles.length > 0) {
          for (const f of dFiles) {
            await api.uploadInvoiceFile(rid, f);
          }
        }
      }
      closeDrawer();
      setEditingId(null);
      setDFiles([]);
      setDExistingFilePath([]);
      await loadRecords();
    } catch (e: any) {
      showToast('⚠️ ' + (e?.message || t('errNetworkError')));
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Drawer open/close ── */
  const openDrawer = (forEdit?: InvoiceRecord) => {
    setEditingId(forEdit ? forEdit.id : null);
    setDType(forEdit ? (forEdit.type as InvType) : 'general');
    setDAmount(forEdit ? String(forEdit.amount) : '');
    setDDate(forEdit ? forEdit.date : todayStr());
    setDNote(forEdit ? (forEdit.note || '') : '');
    setDInvoiceNo(forEdit ? (forEdit.invoice_number || '') : '');
    setDStatus(forEdit ? (forEdit.status as InvStatus) : 'pending');
    setDBatchId(forEdit ? (forEdit.procurement_batch_id ?? null) : null);
    setDFiles([]);
    setDExistingFilePath(forEdit ? parseFilePaths(forEdit.file_path) : []);
    setDrawerOpen(true);
    drawerAnim.setValue(0);
    overlayAnim.setValue(0);
    Animated.parallel([
      Animated.spring(drawerAnim, { toValue: 1, useNativeDriver: true, bounciness: 4, speed: 14 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    // Fetch batch list
    (async () => {
      try {
        const list = await api.getProcurementBatchesLite?.();
        let batches = Array.isArray(list) ? list : [];
        if (forEdit && forEdit.procurement_batch_id && !batches.find((b: any) => b.id === forEdit.procurement_batch_id)) {
          batches = [{ id: forEdit.procurement_batch_id, batch_number: forEdit.batch_number, date: forEdit.date }, ...batches];
        }
        setBatchList(batches);
      } catch { setBatchList([]); }
    })();

    // Auto-fill email
    try {
      const stored = localStorage.getItem('email');
      if (stored) setDEmail(stored);
    } catch {}
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setDrawerOpen(false);
      setEditingId(null);
      setDStatus('pending');
      setDInvoiceNo('');
      setDExistingFilePath([]);
      setDFiles([]);
    });
  };

  const drawerTranslateY = drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });
  const overlayOpacity = overlayAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  /* ── Auto-fill amount when batch selected ── */
  useEffect(() => {
    if (!dBatchId) return;
    (async () => {
      try {
        const j: any = await api.getProcurementBatchDetail?.(dBatchId);
        const batch = j?.batch || j?.data || j;
        const amt = batch?.total || batch?.total_amount || batch?.amount || 0;
        setDAmount(Number(amt).toFixed(2));
      } catch {}
    })();
  }, [dBatchId]);

  /* ── File handlers ── */
  const pickNewFiles = async () => {
    try {
      const imgs = await pickImages({ multiple: true });
      if (imgs && imgs.length > 0) setDFiles(prev => [...prev, ...imgs]);
    } catch {}
  };

  const captureNewFile = async () => {
    try {
      const photo = await takePhoto();
      if (photo) setDFiles(prev => [...prev, photo]);
    } catch {}
  };

  return (
    <View style={styles.root}>
      {/* ═══ HEADER CARD ═══ */}
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <IcnBack color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{t('invTitle')}</Text>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => { setDDate(todayStr()); setDNote(''); setDInvoiceNo(''); openDrawer(); }}
            activeOpacity={0.8}
          >
            <IcnPlus color="rgba(255,255,255,0.9)" />
            <Text style={styles.applyBtnText}>{t('invApply')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>{totalCount}</Text>
            <Text style={styles.headerStatLbl}>{t('invTotalCount')}</Text>
          </View>
          <View style={[styles.headerStat, { flex: 2 }]}>
            <Text style={styles.headerStatNum}>
              ¥{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.headerStatLbl}>{t('invTotalAmount')}</Text>
          </View>
          <View style={[styles.headerStat, { borderRightWidth: 0 }]}>
            <Text style={styles.headerStatNum}>{pendingCount}</Text>
            <Text style={styles.headerStatLbl}>{t('invPending')}</Text>
          </View>
        </View>
      </View>

      {/* ═══ TABS ═══ */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 0 && styles.tabOn]}
          onPress={() => setTab(0)}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, { color: tab === 0 ? '#fff' : c.textSub }]}>
            {t('invInfoTab')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 1 && styles.tabOn]}
          onPress={() => setTab(1)}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, { color: tab === 1 ? '#fff' : c.textSub }]}>
            {t('invRecordsTab')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ═══ PANEL 0: INFO ═══ */}
      {tab === 0 && (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.tips}>
            <Text style={styles.tipsIcon}>💡</Text>
            <Text style={styles.tipsText}>{t('invTips')}</Text>
          </View>

          {/* Header info section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitleText}>{t('invHeaderInfo')}</Text>
              <View style={[styles.sectionTitleLine, { backgroundColor: withAlpha(c.textMain, 0.08) }]} />
            </View>
            <View style={styles.infoCard}>
              <EditableInfoRow
                label={t('companyName')}
                value={data.company_name}
                colors={c}
                onChange={(v) => setData({ ...data, company_name: v })}
                editable
              />
              <View style={styles.divider} />
              <EditableInfoRow
                label={t('taxId')}
                value={data.tax_id}
                colors={c}
                mono
                onChange={(v) => setData({ ...data, tax_id: v })}
                editable
              />
              <View style={styles.divider} />
              <EditableInfoRow
                label={t('addressPhone')}
                value={data.address}
                colors={c}
                onChange={(v) => setData({ ...data, address: v })}
                editable
              />
              <View style={styles.divider} />
              <EditableInfoRow
                label={t('companyPhone')}
                value={formatPhone(data.phone)}
                colors={c}
                mono
                onChange={(v) => setData({ ...data, phone: v })}
                editable
              />
            </View>
          </View>

          {/* Bank section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitleText}>{t('invBankInfo')}</Text>
              <View style={[styles.sectionTitleLine, { backgroundColor: withAlpha(c.textMain, 0.08) }]} />
            </View>
            <View style={styles.infoCard}>
              <EditableInfoRow
                label={t('bankName')}
                value={data.bank_name}
                colors={c}
                onChange={(v) => setData({ ...data, bank_name: v })}
                editable
              />
              <View style={styles.divider} />
              <EditableInfoRow
                label={t('bankAccount')}
                value={data.bank_account}
                colors={c}
                mono
                onChange={(v) => setData({ ...data, bank_account: v })}
                editable
              />
            </View>
          </View>

          {/* Email section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitleText}>{t('invReceiveMethod')}</Text>
              <View style={[styles.sectionTitleLine, { backgroundColor: withAlpha(c.textMain, 0.08) }]} />
            </View>
            <View style={styles.infoCard}>
              <EditableInfoRow
                label={t('invEmail')}
                value={userEmail || data.email}
                colors={c}
                onChange={(v) => setData({ ...data, email: v })}
                editable
              />
            </View>
          </View>

          {/* Save button */}
          {hasChanged && (
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: c.primary }]}
              onPress={handleSaveInfo}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>{t('invSave') || t('confirm')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* ═══ PANEL 1: RECORDS ═══ */}
      {tab === 1 && (
        <View style={styles.scroll}>
          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
            contentContainerStyle={styles.filterRowContent}
          >
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  filter === f.key && { backgroundColor: c.primary, borderColor: c.primary },
                ]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, { color: filter === f.key ? '#fff' : c.textSub }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {recordsLoading ? (
              <View style={styles.empty}>
                <ActivityIndicator color={c.primary} />
              </View>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<InvoiceEmptyIcon color={c.textSub} />}
                title={t('noRecords')}
                hint={t('emptyInvoiceHint')}
              />
            ) : (
              filtered.map(r => (
                <View key={r.id} style={styles.invCard}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => openDrawer(r)}
                    style={styles.invTop}
                  >
                    <View style={[styles.invBadge, r.type === 'vat' ? styles.invBadgeVat : styles.invBadgeGeneral]}>
                      <Text style={[styles.invBadgeText, { color: r.type === 'vat' ? c.primary : c.info }]}>
                        {typeBadgeLabel(r.type)}
                      </Text>
                    </View>
                    <View style={styles.invMain}>
                      <Text style={styles.invCompany} numberOfLines={1}>{r.company}</Text>
                      <Text style={styles.invTax}>{r.tax_id}</Text>
                      <View style={styles.invMeta}>
                        <Text style={styles.invDate}>{r.date}</Text>
                        {!!r.invoice_number && (
                          <>
                            <Text style={styles.invDot}>·</Text>
                            <Text style={styles.invNo}>{r.invoice_number}</Text>
                          </>
                        )}
                        {!!r.batch_number && (
                          <>
                            <Text style={styles.invDot}>·</Text>
                            <Text style={styles.invNo}>
                              {t('procNowBatch').replace('{n}', String(r.batch_number))}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    <View style={styles.invSealWrap}>
                      <View style={[styles.seal, { borderColor: r.status === 'done' ? c.success : c.warning }]}>
                        <Text style={[styles.sealText, { color: r.status === 'done' ? c.success : c.warning }]}>
                          {r.status === 'done' ? t('invRecStatusDone') : t('invRecStatusPending')}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.invBottom}>
                    <View>
                      <Text style={[styles.invAmount, { color: c.primary }]}>
                        ¥{(r.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                      <Text style={styles.invAmountLabel}>
                        {r.status === 'pending' ? t('invApplyAmount') : t('invTaxAmount')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.delBtn, { backgroundColor: withAlpha(c.textMain, 0.05) }]}
                      onPress={() => setConfirmDeleteId(r.id)}
                      activeOpacity={0.7}
                    >
                      <IcnTrash color={c.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* ═══ TOAST ═══ */}
      <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />

      {/* ═══ DELETE CONFIRM ═══ */}
      <Modal visible={confirmDeleteId != null} transparent animationType="fade" onRequestClose={() => !deleting && setConfirmDeleteId(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <View style={[styles.confirmHeader, { backgroundColor: c.danger }]}>
              <Text style={styles.confirmTitle}>{t('confirmDeleteRecord')}</Text>
            </View>
            <View style={styles.confirmBody}>
              <Text style={styles.confirmMsg}>
                {t('invDelConfirmPrefix')}{records.find(r => r.id === confirmDeleteId)?.invoice_number || '—'}{t('invDelConfirmSuffix')}
              </Text>
              <View style={styles.confirmBtnRow}>
                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={() => !deleting && setConfirmDeleteId(null)}
                  disabled={deleting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmCancelText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmOkBtn, { backgroundColor: c.danger }]}
                  onPress={handleConfirmDelete}
                  disabled={deleting}
                  activeOpacity={0.8}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmOkText}>{t('confirmDeleteRecord')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══ DRAWER (create/edit) ═══ */}
      {drawerOpen && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View style={[styles.drawerOverlay, { opacity: overlayOpacity }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>
          <Animated.View
            style={[styles.drawer, { backgroundColor: c.surface, transform: [{ translateY: drawerTranslateY }] }]}
          >
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHead}>
              <Text style={styles.drawerTitle}>
                {editingId ? t('invRecEditTitle') : t('invRecAddTitle')}
              </Text>
              <TouchableOpacity onPress={closeDrawer} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <IcnClose color={c.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.drawerBody} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
              {/* Type */}
              <Text style={styles.dLabel}>{t('invDrawerType')}</Text>
              <View style={styles.dTypeRow}>
                {(['general', 'vat'] as InvType[]).map(tp => (
                  <TouchableOpacity
                    key={tp}
                    style={[styles.dTypeChip, { backgroundColor: dType === tp ? c.primary : withAlpha(c.textMain, 0.06) }]}
                    onPress={() => setDType(tp)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dTypeChipText, { color: dType === tp ? c.surface : c.textSub }]}>
                      {tp === 'vat' ? t('invVatSpecial') : t('invGeneral')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Batch selector */}
              <Text style={styles.dLabel}>{t('invDrawerBatch')}</Text>
              <TouchableOpacity
                style={styles.dSelect}
                onPress={() => {
                  if (batchList.length === 0) return;
                  // Cycle through batches — simple sequential selector
                  const cur = batchList.findIndex((b: any) => b.id === dBatchId);
                  if (cur < 0) setDBatchId(batchList[0]?.id || null);
                  else if (cur === batchList.length - 1) setDBatchId(null);
                  else setDBatchId(batchList[cur + 1]?.id || null);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.dSelectText, !dBatchId && { color: c.textSub }]}>
                  {dBatchId
                    ? t('procNowBatch').replace('{n}', String(batchList.find((b: any) => b.id === dBatchId)?.batch_number || ''))
                    : t('invDrawerBatchPlaceholder')}
                </Text>
                <Text style={[styles.dSelectChevron, { color: c.textSub }]}>›</Text>
              </TouchableOpacity>

              {/* Amount */}
              <Text style={styles.dLabel}>{t('invDrawerAmount')}<Text style={{ color: c.danger }}> *</Text></Text>
              <View style={styles.dAmountWrap}>
                <Text style={[styles.dAmountPrefix, { color: c.textSub }]}>¥</Text>
                <TextInput
                  style={[styles.dInput, styles.dAmountInput, { color: c.textMain, backgroundColor: withAlpha(c.textMain, 0.03) }]}
                  value={dAmountFocus ? dAmount : formatAmountForDisplay(dAmount)}
                  onFocus={() => setDAmountFocus(true)}
                  onBlur={() => { setDAmountFocus(false); setDAmount(formatAmountForStorage(dAmount)); }}
                  onChangeText={setDAmount}
                  placeholder="0.00"
                  placeholderTextColor={c.textSub}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Buyer (auto-filled, read-only) */}
              <Text style={styles.dLabel}>{t('invDrawerBuyer')}<Text style={{ color: c.danger }}> *</Text></Text>
              <TextInput
                style={[styles.dInput, { color: c.textMain, backgroundColor: withAlpha(c.textMain, 0.03) }]}
                value={data.company_name}
                editable={false}
                placeholder="—"
                placeholderTextColor={c.textSub}
              />

              {/* Tax ID (auto-filled, read-only) */}
              <Text style={styles.dLabel}>{t('invDrawerTaxId')}<Text style={{ color: c.danger }}> *</Text></Text>
              <TextInput
                style={[styles.dInput, { color: c.textMain, backgroundColor: withAlpha(c.textMain, 0.03) }]}
                value={data.tax_id}
                editable={false}
                placeholder="—"
                placeholderTextColor={c.textSub}
              />

              {/* Date + Email */}
              <View style={styles.dRow}>
                <View style={styles.dFieldHalf}>
                  <Text style={styles.dLabel}>{t('invDrawerDate')}</Text>
                  <View style={[styles.dInput, { backgroundColor: withAlpha(c.textMain, 0.03), justifyContent: 'center' }]}>
                    <Text style={{ color: c.textMain, fontSize: FONTS.sub.size }}>{dDate}</Text>
                  </View>
                </View>
                <View style={styles.dFieldHalf}>
                  <Text style={styles.dLabel}>{t('invEmail')}</Text>
                  <TextInput
                    style={[styles.dInput, { color: c.textMain, backgroundColor: withAlpha(c.textMain, 0.03) }]}
                    value={dEmail}
                    onChangeText={setDEmail}
                    placeholder="email@example.com"
                    placeholderTextColor={c.textSub}
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Status */}
              <Text style={styles.dLabel}>{t('invStatus')}</Text>
              <View style={styles.dTypeRow}>
                {(['pending', 'done'] as InvStatus[]).map(s_ => (
                  <TouchableOpacity
                    key={s_}
                    style={[styles.dTypeChip, { backgroundColor: dStatus === s_ ? c.primary : withAlpha(c.textMain, 0.06) }]}
                    onPress={() => setDStatus(s_)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dTypeChipText, { color: dStatus === s_ ? c.surface : c.textSub }]}>
                      {s_ === 'pending' ? t('invRecStatusPending') : t('invRecStatusDone')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Invoice number — only when done */}
              {dStatus === 'done' && (
                <>
                  <Text style={styles.dLabel}>{t('invRecInvoiceNo')}<Text style={{ color: c.danger }}> *</Text></Text>
                  <TextInput
                    style={[styles.dInput, { color: c.textMain, backgroundColor: withAlpha(c.textMain, 0.03) }]}
                    value={dInvoiceNo}
                    onChangeText={(v) => setDInvoiceNo(v.replace(/[^a-zA-Z0-9]/g, ''))}
                    placeholder="NO.2026060001"
                    placeholderTextColor={c.textSub}
                  />
                </>
              )}

              {/* File upload — only when done */}
              {dStatus === 'done' && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={styles.dLabel}>{t('invUploadInvoice')}</Text>
                  {/* Existing file thumbnails */}
                  {dExistingFilePath.length > 0 && (
                    <View style={styles.fileRow}>
                      {dExistingFilePath.map((p, i) => (
                        <View key={`ex-${i}`} style={styles.fileThumb}>
                          <TouchableOpacity onPress={() => showPreview(api.getInvoiceFileUrl(p))} activeOpacity={0.7}>
                            <Image source={{ uri: api.getInvoiceFileUrl(p) }} style={styles.fileThumbImg} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.fileRemove}
                            onPress={() => setDExistingFilePath(prev => prev.filter((_, j) => j !== i))}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.fileRemoveText}>×</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                  {/* New file thumbnails */}
                  {dFiles.length > 0 && (
                    <View style={styles.fileRow}>
                      {dFiles.map((f, i) => (
                        <View key={`nw-${i}`} style={styles.fileThumb}>
                          <TouchableOpacity onPress={() => showPreview(f.uri)} activeOpacity={0.7}>
                            <Image source={{ uri: f.uri }} style={styles.fileThumbImg} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.fileRemove}
                            onPress={() => setDFiles(prev => prev.filter((_, j) => j !== i))}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.fileRemoveText}>×</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                  {/* Add buttons */}
                  <View style={styles.fileAddRow}>
                    <TouchableOpacity
                      style={[styles.fileAddBtn, { backgroundColor: withAlpha(c.primary, 0.08) }]}
                      onPress={pickNewFiles}
                      activeOpacity={0.7}
                    >
                      <IcnGallery color={c.primary} />
                      <Text style={[styles.fileAddText, { color: c.primary }]}>{t('addImage') || '相册'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.fileAddBtn, { backgroundColor: withAlpha(c.primary, 0.08) }]}
                      onPress={captureNewFile}
                      activeOpacity={0.7}
                    >
                      <IcnCamera color={c.primary} />
                      <Text style={[styles.fileAddText, { color: c.primary }]}>{t('invTakePhoto') || '拍照'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Note */}
              <Text style={styles.dLabel}>{t('invDrawerNote')}</Text>
              <TextInput
                style={[styles.dInput, styles.dNoteInput]}
                value={dNote}
                onChangeText={setDNote}
                placeholder={t('invDrawerNotePlaceholder')}
                placeholderTextColor={c.textSub}
                multiline
              />
            </ScrollView>

            {/* Submit */}
            {(() => {
              const submitDisabled = submitting || !dAmount || !data.company_name || !data.tax_id
                || (dStatus === 'done' && !dInvoiceNo.trim())
                || (dStatus === 'done' && dFiles.length === 0 && dExistingFilePath.length === 0);
              return (
                <TouchableOpacity
                  style={[styles.dSubmit, { backgroundColor: c.primary }, submitDisabled && { opacity: 0.4 }]}
                  onPress={handleDrawerSubmit}
                  disabled={submitDisabled}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.dSubmitText}>{editingId ? t('invSave') : t('invSubmit')}</Text>
                  )}
                </TouchableOpacity>
              );
            })()}
          </Animated.View>
        </View>
      )}

      {/* Image preview (fullscreen) */}
      {previewVisible && previewUri ? (
        <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={closePreview}>
          <View style={styles.previewBackdrop}>
            <TouchableOpacity style={styles.previewClose} onPress={closePreview} activeOpacity={0.7}>
              <Text style={styles.previewCloseText}>×</Text>
            </TouchableOpacity>
            <Image source={{ uri: previewUri }} style={{ width: w, height: '100%' }} resizeMode="contain" />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

/* ═══════════════ EDITABLE INFO ROW ═══════════════ */

function EditableInfoRow({ label, value, colors, mono, onChange, editable = true }: {
  label: string; value: string; colors: ThemeColors; mono?: boolean;
  onChange: (v: string) => void; editable?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);

  const commit = () => {
    if (draft !== value) onChange(draft);
    setEditing(false);
  };

  return (
    <View style={styles.eirRow}>
      <View style={styles.eirBody}>
        <Text style={styles.eirLabel}>{label}</Text>
        {editing ? (
          <TextInput
            style={[styles.eirValueInput, { color: colors.textMain }]}
            value={draft}
            onChangeText={setDraft}
            onBlur={commit}
            autoFocus
            placeholder={value || '—'}
            placeholderTextColor={colors.textSub}
          />
        ) : (
          <Text
            style={[styles.eirValue, { color: value ? colors.textMain : colors.textSub }]}
            numberOfLines={1}
          >
            {value || '—'}
          </Text>
        )}
      </View>
      {editable && !editing && (
        <TouchableOpacity
          onPress={() => { setDraft(value); setEditing(true); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textSub} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5Z" />
            <Path d="M15 5l4 4" />
          </Svg>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ═══════════════ STYLES ═══════════════ */

const getStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    scroll: { flex: 1 },

    /* HEADER */
    headerCard: { backgroundColor: '#D15F6C', paddingTop: 50, paddingBottom: 14, paddingHorizontal: 20 },
    headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '600' },
    applyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
    applyBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
    headerStats: { flexDirection: 'row' },
    headerStat: { flex: 1, paddingHorizontal: 12, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.12)' },
    headerStatNum: { color: '#fff', fontSize: 18, fontWeight: '700' },
    headerStatLbl: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 },

    /* TABS */
    tabs: { flexDirection: 'row', marginHorizontal: 16, marginTop: 14, marginBottom: 12, backgroundColor: withAlpha(c.textMain, 0.06), borderRadius: 10, padding: 3 },
    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    tabOn: { backgroundColor: c.primary },
    tabText: { fontSize: 13, fontWeight: '500' },

    /* TIPS */
    tips: { marginHorizontal: 16, marginBottom: 14, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: withAlpha(c.warning, 0.08) },
    tipsIcon: { fontSize: 15, marginTop: 1 },
    tipsText: { fontSize: 12, lineHeight: 19, flex: 1, color: c.warning },

    /* SECTIONS */
    section: { paddingHorizontal: 0, marginTop: 12 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8, paddingHorizontal: 16 },
    sectionTitleText: { fontSize: 10, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: c.textSub },
    sectionTitleLine: { flex: 1, height: 1 },

    infoCard: { backgroundColor: c.surface, borderRadius: 12, marginHorizontal: 16, overflow: 'hidden' },
    divider: { height: 0.5, backgroundColor: withAlpha(c.textMain, 0.08), marginLeft: 16 },

    /* EDITABLE INFO ROW */
    eirRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12 },
    eirBody: { flex: 1 },
    eirLabel: { fontSize: 11, color: c.textSub, marginBottom: 2 },
    eirValue: { fontSize: 13, fontWeight: '500' },
    eirValueInput: { fontSize: 13, fontWeight: '500', padding: 0 },

    saveBtn: { margin: 16, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

    /* FILTERS */
    filterRow: { maxHeight: 40, marginBottom: 12 },
    filterRowContent: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
    filterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: c.secondary, backgroundColor: c.surface },
    filterChipText: { fontSize: 12 },

    /* INVOICE CARD */
    invCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.secondary, overflow: 'hidden' },
    invTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, marginTop: 4, borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: c.secondary },
    invBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, flexShrink: 0, marginTop: 2 },
    invBadgeVat: { backgroundColor: withAlpha(c.primary, 0.08), borderColor: withAlpha(c.primary, 0.3) },
    invBadgeGeneral: { backgroundColor: withAlpha(c.info, 0.08), borderColor: withAlpha(c.info, 0.3) },
    invBadgeText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.6 },
    invMain: { flex: 1, minWidth: 0 },
    invCompany: { fontSize: 14, fontWeight: '600', color: c.textMain, marginBottom: 3 },
    invTax: { fontSize: 11, color: c.textSub, marginBottom: 4 },
    invMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    invDate: { fontSize: 11, color: c.textSub },
    invDot: { color: c.secondary, fontSize: 11 },
    invNo: { fontSize: 10, color: c.textSub },
    invSealWrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
    seal: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    sealText: { fontSize: 11, fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },
    invBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    invAmount: { fontSize: 20, fontWeight: '700' },
    invAmountLabel: { fontSize: 10, color: c.textSub, marginTop: 1 },
    delBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

    empty: { alignItems: 'center', paddingVertical: 48 },

    /* MODAL */
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    confirmCard: { width: 320, maxWidth: '100%', backgroundColor: c.surface, borderRadius: 14, overflow: 'hidden' },
    confirmHeader: { paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
    confirmTitle: { color: '#fff', fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight },
    confirmBody: { padding: 20, gap: 16 },
    confirmMsg: { color: c.textSub, fontSize: FONTS.sub.size, textAlign: 'center' },
    confirmBtnRow: { flexDirection: 'row', gap: 12 },
    confirmCancelBtn: { flex: 1, backgroundColor: withAlpha(c.textMain, 0.06), borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    confirmCancelText: { color: c.textSub, fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight },
    confirmOkBtn: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    confirmOkText: { color: '#fff', fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight },

    /* DRAWER */
    drawerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 200 },
    drawer: { position: 'absolute', left: 0, right: 0, top: 80, bottom: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 201, paddingBottom: 16 },
    drawerHandle: { width: 36, height: 4, borderRadius: 2, marginTop: 12, alignSelf: 'center', backgroundColor: c.secondary },
    drawerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, paddingBottom: 12 },
    drawerTitle: { fontSize: 15, fontWeight: '600', color: c.textMain },
    drawerBody: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },

    dLabel: { fontSize: 13, fontWeight: '500', color: c.textSub, marginBottom: 6, marginTop: 8 },
    dFieldHalf: { flex: 1 },
    dRow: { flexDirection: 'row', gap: 10 },
    dInput: { width: '100%', paddingVertical: 11, paddingHorizontal: 14, borderWidth: 0, borderRadius: 10, fontSize: 14, color: c.textMain },
    dNoteInput: { minHeight: 60, textAlignVertical: 'top' },
    dSelect: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10, backgroundColor: withAlpha(c.textMain, 0.03) },
    dSelectText: { fontSize: 14, color: c.textMain },
    dSelectChevron: { fontSize: 18 },
    dAmountWrap: { position: 'relative' },
    dAmountPrefix: { position: 'absolute', left: 14, top: 14, fontSize: 14, fontWeight: '600' },
    dAmountInput: { paddingLeft: 26, fontSize: 16, fontWeight: '700' },
    dTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    dTypeChip: { flex: 1, flexDirection: 'row', paddingVertical: 10, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    dTypeChipText: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight },

    /* File upload */
    fileRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    fileThumb: { position: 'relative', width: 64, height: 64 },
    fileThumbImg: { width: 64, height: 64, borderRadius: 8, backgroundColor: withAlpha(c.textMain, 0.05) },
    fileRemove: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    fileRemoveText: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 18 },
    fileAddRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    fileAddBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
    fileAddText: { fontSize: 13, fontWeight: '500' },
    dSubmit: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginHorizontal: 20, marginTop: 8 },
    dSubmitText: { fontSize: 15, fontWeight: '600', color: '#fff' },

    /* Preview */
    previewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
    previewClose: { position: 'absolute', top: 50, right: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    previewCloseText: { color: '#fff', fontSize: 22, fontWeight: '600', lineHeight: 24 },
  });
