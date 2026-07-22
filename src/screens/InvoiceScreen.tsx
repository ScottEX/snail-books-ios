import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions, Modal,
} from 'react-native';
import CustomActionSheet, { ActionItem } from '../components/CustomActionSheet';
import AppTextInput from '../components/AppTextInput';
import Svg, { Path, Line, Circle, Rect, Polyline, Text as SvgText } from 'react-native-svg';
import { t } from '../i18n';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { api } from '../api/client';
import Toast from '../components/Toast';
import EmptyState from '../components/EmptyState';
import { pickImages, takePhoto, PickedImage } from '../utils/imagePicker';
import ConfirmModal from '../components/ConfirmModal';
import DatePicker from '../components/DatePicker';
import ReceiptUpload from '../components/ReceiptUpload';
import ExpenseNoteInput from '../components/ExpenseNoteInput';
import SubmitButton from '../components/SubmitButton';
import TrashIcon from '../components/icons/TrashIcon';
import ImagePreview, { ThumbLayout, ThumbLayoutResolver } from '../components/ImagePreview';
import PdfPreviewPage from './PdfPreviewPage';
import { useImagePreview } from '../hooks/useImagePreview';
import { useServerDate } from '../hooks/useServerDate';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BANK_ICON_MAP, DefaultBankIcon } from '../components/BankIcons';
import SheetHeader from '../components/SheetHeader';
import ModalOverlay from '../components/ModalOverlay';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import ReAnimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { bottomSheetOverlay } from '../sharedStyles';

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

const IcnCompany = ({ color }: { color: string }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" stroke={color} strokeWidth={1.8} fill="none">
    <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <Polyline points="9 22 9 12 15 12 15 22" />
  </Svg>
);

const IcnTax = ({ color }: { color: string }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" stroke={color} strokeWidth={1.8} fill="none">
    <Circle cx="12" cy="12" r="10" />
    <Line x1="12" y1="8" x2="12" y2="12" />
    <Line x1="12" y1="16" x2="12.01" y2="16" />
  </Svg>
);

const IcnAddr = ({ color }: { color: string }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" stroke={color} strokeWidth={1.8} fill="none">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <Circle cx="12" cy="10" r="3" />
  </Svg>
);

const IcnBank = ({ color }: { color: string }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" stroke={color} strokeWidth={1.8} fill="none">
    <Rect x="2" y="5" width="20" height="14" rx="2" />
    <Line x1="2" y1="10" x2="22" y2="10" />
  </Svg>
);

const IcnMail = ({ color }: { color: string }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" stroke={color} strokeWidth={1.8} fill="none">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <Polyline points="22,6 12,13 2,6" />
  </Svg>
);

const IcnPhone = ({ color }: { color: string }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" stroke={color} strokeWidth={1.8} fill="none">
    <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </Svg>
);

const IcnAccount = ({ color }: { color: string }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" stroke={color} strokeWidth={1.8} fill="none">
    <Line x1="12" y1="1" x2="12" y2="23" />
    <Path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </Svg>
);

const BANK_COLORS: Record<string, string> = {
  icbc: '#C41E2A', ccb: '#005BAC', abc: '#1A8B4A', boc: '#C41E2A',
  bocom: '#003D83', cmb: '#E61138', psbc: '#00843D', cib: '#003F87',
  citic: '#D7102A', ceb: '#7B2D8B', cmbc: '#00A950', pab: '#F46300',
  spdb: '#002C77', hxb: '#C41E2A', gdb: '#C41E2A', bob: '#C41E2A',
  bosh: '#005BAC',
};

/** 银行图标：品牌色圆底 + 首字 */
function BankIconView({ code, size = 24 }: { code: string; size?: number }) {
  const IconComponent = BANK_ICON_MAP[code] || DefaultBankIcon;
  return <IconComponent size={size} />;
}

/** Stamp seal — active (done: 已开票 / pending: 待开票) */
const IcnSealActive = ({ color, label }: { color: string; label: string }) => (
  <Svg width={52} height={52} viewBox="0 0 52 52">
    <Circle cx="26" cy="26" r="24" fill="none" stroke={color} strokeWidth="1.5" />
    <Circle cx="26" cy="26" r="21" fill="none" stroke={color} strokeWidth="0.5" strokeDasharray="3 2" />
    <SvgText
      x="26"
      y="31"
      textAnchor="middle"
      fontSize="11"
      fontWeight="700"
      fill={color}
      transform="rotate(-12, 26, 26)"
    >
      {label}
    </SvgText>
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

/** Pen icon */
const PencilSvg = ({ color }: { color: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5Z" />
    <Path d="M15 5l4 4" />
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
  file_thumb_paths?: string;
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

function fmtBankAccount(v: string) {
  if (!v) return '';
  return v.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
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
  const sd = useServerDate();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(c), [c]);

  // Drawer keyboard push
  const { height: screenH } = useWindowDimensions();
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const drawerCap = -screenH * 0.4;
  const drawerPushStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(keyboardHeight.value, drawerCap) }],
  }));
  const infoPushCap = -screenH * 0.25;
  const infoPushSV = useSharedValue(0); // default: no push for header info
  const infoPushStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(keyboardHeight.value, infoPushSV.value) }],
  }));

  // Tabs: 0 = info, 1 = records
  const [tab, setTab] = useState<number>(filterBatchId ? 1 : 0);
  const [invType, setInvType] = useState<InvType>('vat');
  const [data, setData] = useState<InvoiceData>(EMPTY_INV);
  const [orig, setOrig] = useState<InvoiceData>(EMPTY_INV);
  const [loaded, setLoaded] = useState(false);
  const [entryCardH, setEntryCardH] = useState(0);
  const winHRef = useRef(screenH);
  useEffect(() => { winHRef.current = screenH; }, [screenH]);
  const drawerMaxH = entryCardH > 0 ? winHRef.current - entryCardH : undefined;

  // Admin check
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
    } catch { }
    (async () => {
      try {
        const j: any = await api.admin?.getMe?.();
        const u = j?.user || j?.data || j;
        if (u?.email) setUserEmail(u.email);
      } catch { }
    })();
  }, []);

  // Records
  const [records, setRecords] = useState<InvoiceRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
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
  const [bankCode, setBankCode] = useState('');
  const [bankLookupError, setBankLookupError] = useState('');
  const [dInvoiceNo, setDInvoiceNo] = useState('');
  const [dStatus, setDStatus] = useState<InvStatus>('pending');
  const [dBatchId, setDBatchId] = useState<number | null>(null);
  const [batchList, setBatchList] = useState<any[]>([]);
  const [showBatchPicker, setShowBatchPicker] = useState(false);
  const [batchOffsetY, setBatchOffsetY] = useState(0);
  const [batchOffsetX, setBatchOffsetX] = useState(0);
  const batchBtnRef = useRef<any>(null);
  const [dFiles, setDFiles] = useState<PickedImage[]>([]);
  const [dExistingFilePath, setDExistingFilePath] = useState<string[]>([]);
  // Existing thumb paths (128×128 thumbnails for display) — mirrors web
  const [dExistingThumbPaths, setDExistingThumbPaths] = useState<string[]>([]);

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);

  // PDF preview (rendered in Modal above everything, like ImagePreview)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState('');

  // Toast
  const [toast, setToast] = useState('');

  const { preview, openPreview, closePreview } = useImagePreview();

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

  // Auto-open drawer when coming from "去开票" — edit if record exists, new otherwise
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!filterBatchId || recordsLoading || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    const existing = records.find((r: any) => r.procurement_batch_id === filterBatchId);
    if (existing) {
      openDrawer(existing);
    } else {
      openDrawer(undefined, filterBatchId);
    }
  }, [filterBatchId, recordsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Load invoice info (info tab) ── */
  useEffect(() => {
    (async () => {
      try {
        const inv: any = await api.getInvoice();
        const perUserEmail: any = await api.getInvoiceEmail().catch(() => ({}));
        if (inv?.status === 'ok' && inv.data) {
          const d = { ...EMPTY_INV, ...inv.data, email: perUserEmail.email || inv.data.email || '' };
          setData(d);
          setOrig(d);
          setDEmail(d.email);
          setInvType(inv.data.inv_type || 'vat');
          // Re-detect bank on load
          const acct = (d.bank_account || '').replace(/\s/g, '');
          if (acct.length >= 6) {
            try {
              const r: any = await api.bankLookup(acct.slice(0, 6));
              if (r.status === 'ok' && r.data) setBankCode(r.data.code);
            } catch { }
          }
        }
      } catch { }
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
        const uploadedThumbPaths: string[] = [];
        for (const f of dFiles) {
          const res: any = await api.uploadInvoiceFile(editingId, f);
          if (res?.file_path) {
            uploadedPaths.push(res.file_path);
            uploadedThumbPaths.push(res.thumb_path || res.file_path);
          }
        }
        const finalFilePath = JSON.stringify([...dExistingFilePath, ...uploadedPaths]);
        const finalThumbPath = JSON.stringify([...dExistingThumbPaths, ...uploadedThumbPaths]);
        await api.updateInvoiceRecord(editingId, { ...payload, file_path: finalFilePath, file_thumb_paths: finalThumbPath });
        rid = editingId;
      } else {
        const res: any = await api.createInvoiceRecord(payload);
        rid = res?.id;
        if (rid && dFiles.length > 0) {
          const uploadedFilePaths: string[] = [];
          const uploadedThumbPaths: string[] = [];
          for (const f of dFiles) {
            const upRes: any = await api.uploadInvoiceFile(rid, f);
            if (upRes?.file_path) {
              uploadedFilePaths.push(upRes.file_path);
              uploadedThumbPaths.push(upRes.thumb_path || upRes.file_path);
            }
          }
          await api.updateInvoiceRecord(rid, {
            file_path: JSON.stringify(uploadedFilePaths),
            file_thumb_paths: JSON.stringify(uploadedThumbPaths),
          });
        }
      }
      closeDrawer();
      setEditingId(null);
      setDFiles([]);
      setDExistingFilePath([]);
      setDExistingThumbPaths([]);
      await loadRecords();
    } catch (e: any) {
      showToast('⚠️ ' + (e?.message || t('errNetworkError')));
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Drawer open/close ── */
  const openDrawer = (forEdit?: InvoiceRecord, preSelectBatchId?: number | null) => {
    setEditingId(forEdit ? forEdit.id : null);
    setDType(forEdit ? (forEdit.type as InvType) : 'general');
    setDAmount(forEdit ? String(forEdit.amount) : '');
    setDDate(forEdit ? forEdit.date : todayStr());
    setDNote(forEdit ? (forEdit.note || '') : '');
    setDInvoiceNo(forEdit ? (forEdit.invoice_number || '') : '');
    setDStatus(forEdit ? (forEdit.status as InvStatus) : 'pending');
    setDBatchId(forEdit ? (forEdit.procurement_batch_id ?? null) : (preSelectBatchId ?? null));
    setDFiles([]);
    setDExistingFilePath(forEdit ? parseFilePaths(forEdit.file_path) : []);
    setDExistingThumbPaths(forEdit ? parseFilePaths(forEdit.file_thumb_paths) : []);
    setDrawerOpen(true);

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
    } catch { }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => {
      setEditingId(null);
      setDStatus('pending');
      setDInvoiceNo('');
      setDExistingFilePath([]);
      setDExistingThumbPaths([]);
      setDFiles([]);
    }, 250);
  };

  /* ── Batch picker (CustomActionSheet) ── */
  const batchActions: ActionItem[] = useMemo(() =>
    batchList.map((b: any) => ({
      label: t('procNowBatch').replace('{n}', String(b.batch_number)),
      selected: b.id === dBatchId,
      onPress: () => setDBatchId(b.id),
    })),
    [batchList, dBatchId],
  );

  /* ── Auto-fill amount when batch selected ── */
  useEffect(() => {
    if (!dBatchId) return;
    (async () => {
      try {
        const j: any = await api.getProcurementBatchDetail?.(dBatchId);
        const batch = j?.batch || j?.data || j;
        const amt = batch?.total || batch?.total_amount || batch?.amount || 0;
        setDAmount(Number(amt).toFixed(2));
      } catch { }
    })();
  }, [dBatchId]);

  /* ── Preview handlers ── */
  const handlePreviewExisting = (index: number, layout?: ThumbLayout, getLayout?: ThumbLayoutResolver) => {
    const path = dExistingFilePath[index];
    if (path && /\.pdf(\?|$)/i.test(path)) {
      setPdfPreviewUrl(api.getInvoiceFileUrl(path));
      setPdfPreviewTitle(t('invTitle') as string);
      return;
    }
    openPreview(dExistingFilePath.map(p => api.getInvoiceFileUrl(p)), index, layout, getLayout);
  };

  const handlePreviewNew = (index: number, layout?: ThumbLayout, getLayout?: ThumbLayoutResolver) => {
    const f = dFiles[index];
    if (f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name || '') || /\.pdf$/i.test(f.uri || ''))) {
      setPdfPreviewUrl(f.uri);
      setPdfPreviewTitle(t('invTitle') as string);
      return;
    }
    openPreview(dFiles.map(f => f.uri), index, layout, getLayout);
  };

  const handleClosePreview = () => {
    closePreview();
    setDrawerOpen(true);
  };

  return (
    <>
      <View style={styles.root}>
      {/* ═══ ENTRY CARD ═══ */}
      <View
        style={[styles.entryCard, { backgroundColor: '#D15F6C', paddingTop: insets.top }]}
        onLayout={(e: any) => { const h = e.nativeEvent?.layout?.height; if (h) setEntryCardH(h); }}
      >
        <View style={styles.ecTop}>
          <TouchableOpacity style={styles.ecBackBtn} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <IcnBack color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <Text style={styles.ecTitle} numberOfLines={1}>{t('invTitle')}</Text>
          <TouchableOpacity
            style={styles.ecBtn}
            onPress={() => { setDDate(todayStr()); setDNote(''); setDInvoiceNo(''); openDrawer(); }}
            activeOpacity={0.8}
          >
            <IcnPlus color="rgba(255,255,255,0.9)" />
            <Text style={styles.ecBtnText}>{t('invApply')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.ecStats}>
          <View style={styles.ecStat}>
            <Text style={styles.ecStatNum}>{totalCount}</Text>
            <Text style={styles.ecStatLbl}>{t('invTotalCount')}</Text>
          </View>
          <View style={[styles.ecStat, { flex: 2 }]}>
            <Text style={styles.ecStatNum}>
              ¥{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.ecStatLbl}>{t('invTotalAmount')}</Text>
          </View>
          <View style={[styles.ecStat, { borderRightWidth: 0 }]}>
            <Text style={styles.ecStatNum}>{pendingCount}</Text>
            <Text style={styles.ecStatLbl}>{t('invPending')}</Text>
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
        <ReAnimated.View style={[{ flex: 1 }, infoPushStyle]}>
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
                icon={<IcnCompany color={c.info} />}
                iconBg={withAlpha(c.info, 0.1)}
                label={t('companyName')}
                placeholder={t('invPleaseMaintain')}
                value={data.company_name}
                colors={c}
                onChange={(v) => setData({ ...data, company_name: v })}
                editable={isAdmin}
              />
              <View style={styles.divider} />
              <EditableInfoRow
                icon={<IcnTax color={c.warning} />}
                iconBg={withAlpha(c.warning, 0.1)}
                label={t('taxId')}
                placeholder={t('invPleaseMaintain')}
                value={data.tax_id}
                colors={c}
                mono
                filter={(v: string) => v.replace(/[^a-zA-Z0-9]/g, '')}
                onChange={(v) => setData({ ...data, tax_id: v })}
                editable={isAdmin}
              />
              <View style={styles.divider} />
              <EditableInfoRow
                icon={<IcnAddr color={c.success} />}
                iconBg={withAlpha(c.success, 0.1)}
                label={t('addressPhone')}
                placeholder={t('invPleaseMaintain')}
                value={data.address}
                colors={c}
                onChange={(v) => setData({ ...data, address: v })}
                editable={isAdmin}
              />
              <View style={styles.divider} />
              <EditableInfoRow
                icon={<IcnPhone color="#2E8B4A" />}
                iconBg="#EAF8EE"
                label={t('companyPhone')}
                placeholder={t('invPleaseMaintain')}
                value={formatPhone(data.phone)}
                colors={c}
                mono
                keyboardType="phone-pad"
                filter={(v: string) => v.replace(/[^\d]/g, '').slice(0, 11)}
                validate={(v: string) => v && !/^1[3-9]\d{9}$/.test(v) ? t('errPhoneInvalid') : null}
                onChange={(v) => setData({ ...data, phone: v })}
                editable={isAdmin}
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
                icon={bankCode ? <BankIconView code={bankCode} size={22} /> : <IcnBank color={c.primary} />}
                iconBg={bankCode ? (BANK_COLORS[bankCode] || c.primary) + '20' : withAlpha(c.primary, 0.08)}
                label={t('bankName')}
                placeholder={t('invPleaseMaintain')}
                value={data.bank_name}
                colors={c}
                onChange={(v) => setData({ ...data, bank_name: v })}
                editable={false}
              />
              <View style={styles.divider} />
              <EditableInfoRow
                icon={<IcnAccount color={c.primary} />}
                iconBg={withAlpha(c.primary, 0.08)}
                label={t('bankAccount')}
                placeholder={t('invPleaseMaintain')}
                value={fmtBankAccount(data.bank_account)}
                colors={c}
                mono
                keyboardType="numeric"
                filter={(v: string) => v.replace(/[^\d]/g, '')}
                onFocus={() => { infoPushSV.value = withTiming(infoPushCap, { duration: 200 }); }}
                onChange={async (v) => {
                  setData({ ...data, bank_account: v });
                  setBankLookupError('');
                  const clean = v.replace(/\s/g, '');
                  if (!clean || clean.length < 6) { setBankCode(''); setData(prev => ({ ...prev, bank_name: '' })); return; }
                  try {
                    const res = await api.bankLookup(clean.slice(0, 6));
                    if (res.status === 'ok' && res.data) {
                      setData(prev => ({ ...prev, bank_name: res.data.name }));
                      setBankCode(res.data.code);
                    } else {
                      setBankLookupError(t('errBankCardInvalid'));
                    }
                  } catch { setBankLookupError(t('errBankCardInvalid')); }
                }}
                editable={isAdmin}
              />
              {bankLookupError !== '' && (
                <Text style={{ fontSize: FONTS.nano.size, color: c.danger, textAlign: 'right', paddingHorizontal: 16, paddingBottom: 8, marginTop: -6 }}>{bankLookupError}</Text>
              )}
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
                icon={<IcnMail color="#7B52AB" />}
                iconBg="#F0EAF8"
                label={t('invEmail')}
                placeholder={t('invPleaseMaintain')}
                value={data.email}
                colors={c}
                validate={(v: string) => v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? t('errEmailInvalid') : null}
                onFocus={() => { infoPushSV.value = withTiming(infoPushCap, { duration: 200 }); }}
                onChange={async (v) => { setData({ ...data, email: v }); await api.saveInvoiceEmail(v).catch(() => {}); if (!v) { const em = await api.getInvoiceEmail().catch(() => ({})); setData(prev => ({ ...prev, email: em.email || '' })); } }}
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
        </ReAnimated.View>
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
                <Text style={styles.emptyText}>...</Text>
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
                  {/* Torn edge */}
                  <View style={[styles.invTorn, { backgroundColor: c.primary }]} />
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
                      {r.status === 'done' ? (
                        <IcnSealActive color={c.success} label={t('invRecStatusDone')} />
                      ) : (
                        <IcnSealActive color={c.warning} label={t('invRecStatusPending')} />
                      )}
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
                    <View style={styles.invActions}>
                      <TouchableOpacity
                        style={[styles.invDelBtn, { backgroundColor: withAlpha(c.textMain, 0.05) }]}
                        onPress={() => setConfirmDeleteId(r.id)}
                        activeOpacity={0.7}
                      >
                        <TrashIcon color={c.danger} size={14} />
                      </TouchableOpacity>
                    </View>
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
      <ConfirmModal
        visible={confirmDeleteId != null}
        title={t('confirmDeleteRecord')}
        message={
          <>
            {t('invDelConfirmPrefix')}
            <Text style={{ fontWeight: '600', color: c.textMain }}>
              {records.find(r => r.id === confirmDeleteId)?.invoice_number || '—'}
            </Text>
            {t('invDelConfirmSuffix')}
          </>
        }
        confirmLabel={t('confirmDeleteRecord')}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => !deleting && setConfirmDeleteId(null)}
      />

      {/* ═══ DRAWER (create/edit) ═══ */}
      <ModalOverlay
        visible={drawerOpen}
        onClose={closeDrawer}
        animation="stagger"
        staggerCount={3}
        overlayStyle={bottomSheetOverlay}
        contentStyle={{ alignItems: 'stretch', justifyContent: 'flex-end' }}
      >
        <ReAnimated.View style={[drawerPushStyle, styles.drawer, { backgroundColor: c.surface, maxHeight: drawerMaxH }]}>
            <View style={[styles.drawerHead, { backgroundColor: c.primary, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 14, paddingHorizontal: 20, paddingBottom: 14 }]}>
              <SheetHeader title={editingId ? t('invRecEditTitle') : t('invRecAddTitle')} onClose={closeDrawer} />
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

              {/* Batch selector — CustomActionSheet */}
              <View style={styles.dField}>
                <Text style={styles.dLabel}>{t('invDrawerBatch')}</Text>
                <TouchableOpacity
                  ref={batchBtnRef as any}
                  style={[styles.dBatchSelect, { backgroundColor: withAlpha(c.textMain, 0.03) }]}
                  onPress={() => {
                    if (showBatchPicker) { setShowBatchPicker(false); return; }
                    (batchBtnRef.current as any)?.measureInWindow?.((x: number, y: number, _w: number, h: number) => {
                      setBatchOffsetX(x || 16);
                      setBatchOffsetY((y || 100) + (h || 40) + 8);
                      setShowBatchPicker(true);
                    }) || setShowBatchPicker(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                  <Text
                    style={{ fontSize: FONTS.sub.size, color: dBatchId ? c.textMain : c.textSub }}
                    numberOfLines={1}
                  >
                    {dBatchId
                      ? t('procNowBatch').replace('{n}', String(batchList.find(b => b.id === dBatchId)?.batch_number ?? dBatchId))
                      : t('invDrawerBatchPlaceholder')}
                  </Text>
                  <Svg width={12} height={12} viewBox="0 0 1024 1024" style={{ marginLeft: 4, transform: [{ rotate: showBatchPicker ? '180deg' : '0deg' }] }}>
                    <Path d="M836.899 399.237l-218.01 335.037c-47.506 73.007-166.272 73.007-213.778 0l-218.01-335.037C139.595 326.23 198.977 234.97 293.99 234.97h436.02c95.013 0 154.395 91.26 106.889 164.267z" fill={c.textSub} />
                  </Svg>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <View style={styles.dField}>
                <Text style={styles.dLabel}>{t('invDrawerAmount')}<Text style={{ color: c.danger }}> *</Text></Text>
                <View style={styles.dAmountWrap}>
                  <Text style={[styles.dAmountPrefix, { color: c.textSub }]}>¥</Text>
                  <AppTextInput
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
              </View>

              {/* Buyer (auto-filled, read-only) */}
              <View style={styles.dField}>
                <View style={styles.dLabelRow}>
                  <Text style={styles.dLabel}>{t('invDrawerBuyer')}<Text style={{ color: c.danger }}> *</Text></Text>
                  <Text style={styles.dAutoFillLabel}>{t('invAutoFilled')}</Text>
                </View>
                <AppTextInput
                  style={[styles.dInput, { color: c.textMain, backgroundColor: withAlpha(c.textMain, 0.03) }]}
                  value={data.company_name}
                  editable={false}
                  placeholder="—"
                  placeholderTextColor={c.textSub}
                />
              </View>

              {/* Tax ID (auto-filled, read-only) */}
              <View style={styles.dField}>
                <View style={styles.dLabelRow}>
                  <Text style={styles.dLabel}>{t('invDrawerTaxId')}<Text style={{ color: c.danger }}> *</Text></Text>
                  <Text style={styles.dAutoFillLabel}>{t('invAutoFilled')}</Text>
                </View>
                <AppTextInput
                  style={[styles.dInput, { color: c.textMain, backgroundColor: withAlpha(c.textMain, 0.03) }]}
                  value={data.tax_id}
                  editable={false}
                  placeholder="—"
                  placeholderTextColor={c.textSub}
                />
              </View>

              {/* Date + Email */}
              <View style={styles.dRow}>
                <View style={[styles.dFieldHalf, { overflow: 'hidden' }]}>
                  <Text style={styles.dLabel}>{t('invDrawerDate')}</Text>
                  <View style={[styles.dInput, { backgroundColor: withAlpha(c.textMain, 0.03), justifyContent: 'center', paddingVertical: 0 }]}>
                    <DatePicker
                      date={dDate}
                      onChange={setDDate}
                      max={sd.today}
                      fontSize={FONTS.sub.size}
                      showChevron
                      showCalendarIcon
                    />
                  </View>
                </View>
                <View style={styles.dFieldHalf}>
                  <Text style={styles.dLabel}>{t('invEmail')}</Text>
                  <AppTextInput
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
              <View style={styles.dField}>
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
              </View>

              {/* Invoice number — only when done */}
              {dStatus === 'done' && (
                <View style={styles.dField}>
                  <Text style={styles.dLabel}>{t('invRecInvoiceNo')}<Text style={{ color: c.danger }}> *</Text></Text>
                  <AppTextInput
                    style={[styles.dInput, { color: c.textMain, backgroundColor: withAlpha(c.textMain, 0.03) }]}
                    value={dInvoiceNo}
                    onChangeText={(v) => setDInvoiceNo(v.replace(/[^\d]/g, '').slice(0, 20))}
                    placeholder="20260600000001"
                    placeholderTextColor={c.textSub}
                    keyboardType="numeric"
                  />
                </View>
              )}

              {/* File upload — only when done */}
              {dStatus === 'done' && (
                <View style={{ marginBottom: 8 }}>
                  <ReceiptUpload
                    existingImages={editingId && dExistingFilePath.length > 0
                      ? (dExistingThumbPaths.length === dExistingFilePath.length ? dExistingThumbPaths : dExistingFilePath).map(p => api.getInvoiceFileUrl(p))
                      : []}
                    newFiles={dFiles}
                    onAdd={(files: PickedImage[]) => setDFiles(prev => [...prev, ...files])}
                    onRemoveExisting={(i: number) => { setDExistingFilePath(prev => prev.filter((_, j) => j !== i)); setDExistingThumbPaths(prev => prev.filter((_, j) => j !== i)); }}
                    onRemoveNew={(i: number) => setDFiles(dFiles.filter((_, j) => j !== i))}
                    getPreviewUrl={(f: PickedImage) => f.uri}
                    label={t('invUploadInvoice') as string}
                    required
                    onPreviewExisting={handlePreviewExisting}
                    onPreviewNew={handlePreviewNew}
                  />
                </View>
              )}

              {/* Note */}
              <View style={styles.dField}>
                <ExpenseNoteInput
                  label={t('invDrawerNote') as string}
                  value={dNote}
                  onChangeText={setDNote}
                  placeholder={t('invDrawerNotePlaceholder')}
                />
              </View>

            </ScrollView>

            {/* Submit */}
            {(() => {
              const nonLoadDisabled = !dAmount || !data.company_name || !data.tax_id
                || (dStatus === 'done' && !dInvoiceNo.trim())
                || (dStatus === 'done' && dFiles.length === 0 && dExistingFilePath.length === 0);
              return (
                <SubmitButton
                  onPress={handleDrawerSubmit}
                  loading={submitting}
                  disabled={nonLoadDisabled}
                  label={editingId ? t('invSave') : t('invSubmit')}
                  style={[styles.dSubmit, { backgroundColor: c.primary }, nonLoadDisabled && { opacity: 0.4 }]}
                  textStyle={styles.dSubmitText}
                />
              );
            })()}
        </ReAnimated.View>
      </ModalOverlay>

      <CustomActionSheet
        visible={showBatchPicker}
        actions={batchActions}
        onClose={() => setShowBatchPicker(false)}
        offsetY={batchOffsetY}
        offsetX={batchOffsetX}
        dark
      />
    </View>

    <ImagePreview
      images={preview?.images ?? []}
      initialIdx={preview?.idx ?? 0}
      visible={preview !== null}
      thumbLayout={preview?.layout}
      getThumbLayout={preview?.getLayout}
      onClose={handleClosePreview}
    />
      {pdfPreviewUrl !== '' && (
        <Modal visible animationType="slide" onRequestClose={() => { setPdfPreviewUrl(''); setPdfPreviewTitle(''); }}>
          <PdfPreviewPage
            batchId={0}
            fileUrl={pdfPreviewUrl}
            title={pdfPreviewTitle}
            onBack={() => { setPdfPreviewUrl(''); setPdfPreviewTitle(''); }}
          />
        </Modal>
      )}
    </>
  );
}

/* ═══════════════ EDITABLE INFO ROW ═══════════════ */

function EditableInfoRow({ icon, iconBg, label, value, colors, mono, onChange, editable = true, placeholder, filter, validate, keyboardType, onFocus }: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  colors: ThemeColors;
  mono?: boolean;
  onChange: (v: string) => void;
  editable?: boolean;
  placeholder?: string;
  filter?: (v: string) => string;
  validate?: (v: string) => string | null;
  keyboardType?: string;
  onFocus?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [err, setErr] = useState<string | null>(null);

  const handleChange = (v: string) => {
    const filtered = filter ? filter(v) : v;
    setDraft(filtered);
    if (validate) setErr(validate(filtered));
  };

  const commit = () => {
    if (validate) {
      const e = validate(draft);
      if (e) { setErr(e); return; }
    }
    if (draft !== value) onChange(draft);
    setEditing(false);
    setErr(null);
  };

  const styles = useMemo(() => getEirStyles(), []);

  if (editing) {
    return (
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: iconBg }]}>{icon}</View>
        <View style={styles.body}>
          <Text style={[styles.label, { color: colors.textSub }]}>{label}</Text>
          <AppTextInput
            style={[styles.valueInput, { color: colors.textMain, fontFamily: mono ? 'DMMono-Regular' : undefined }]}
            value={draft}
            onChangeText={handleChange}
            onFocus={onFocus}
            onBlur={commit}
            autoFocus
            placeholder={placeholder || value || '—'}
            placeholderTextColor={colors.textSub}
            keyboardType={keyboardType as any}
          />
          {err && <Text style={{ fontSize: FONTS.tiny.size, color: colors.danger, marginTop: 4 }}>{err}</Text>}
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={commit}>
          <PencilSvg color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.body}>
        <Text style={[styles.label, { color: colors.textSub }]}>{label}</Text>
        <Text
          style={[styles.value, { color: value ? colors.textMain : colors.textSub, fontWeight: value ? '500' : '400', fontFamily: mono ? 'DMMono-Regular' : undefined }]}
          numberOfLines={1}
        >
          {value || t('invEmpty')}
        </Text>
      </View>
      {editable && (
        <TouchableOpacity onPress={() => { setDraft(filter ? filter(value) : value); setEditing(true); }} activeOpacity={0.7}>
          <PencilSvg color={colors.textSub} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const getEirStyles = () => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12 },
  icon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body: { flex: 1, minWidth: 0 },
  label: { fontSize: FONTS.nano.size, marginBottom: 2 },
  value: { fontSize: FONTS.small.size },
  valueInput: { fontSize: FONTS.small.size, fontWeight: '500', padding: 0 },
  editBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});

/* ═══════════════ STYLES ═══════════════ */

const getStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    scroll: { flex: 1 },

    /* ENTRY CARD */
    entryCard: {
      borderRadius: 0, paddingTop: 0, paddingRight: 20, paddingBottom: 14, paddingLeft: 20,
      position: 'relative' as any, overflow: 'hidden' as any, marginBottom: 14,
    },
    ecTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    ecBackBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    ecTitle: { flex: 1, color: '#fff', fontSize: FONTS.h2.size, fontWeight: '600', letterSpacing: 0.3 },
    ecBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
      borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, flexShrink: 0,
    },
    ecBtnText: { color: '#fff', fontSize: FONTS.small.size, fontWeight: '500' },
    ecStats: { flexDirection: 'row', marginBottom: 16 },
    ecStat: { flex: 1, paddingHorizontal: 12, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.12)' },
    ecStatNum: { color: '#fff', fontSize: FONTS.large.size, fontWeight: '600' },
    ecStatLbl: { color: 'rgba(255,255,255,0.5)', fontSize: FONTS.tiny.size, marginTop: 2 },

    /* TABS */
    tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 14, backgroundColor: withAlpha(c.textMain, 0.06), borderRadius: 10, padding: 3 },
    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    tabOn: { backgroundColor: c.primary, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    tabText: { fontSize: FONTS.small.size, fontWeight: '500' },

    /* TIPS */
    tips: { marginHorizontal: 16, marginBottom: 14, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: withAlpha(c.warning, 0.08) },
    tipsIcon: { fontSize: FONTS.sub.size, marginTop: 1 },
    tipsText: { fontSize: FONTS.micro.size, lineHeight: 19, flex: 1, color: c.warning },

    /* SECTIONS */
    section: { paddingHorizontal: 0, marginTop: 12 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8, paddingHorizontal: 16 },
    sectionTitleText: { fontSize: FONTS.tiny.size, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: c.textSub },
    sectionTitleLine: { flex: 1, height: 1 },

    infoCard: { backgroundColor: c.surface, borderRadius: 12, overflow: 'hidden', marginHorizontal: 16 },
    divider: { height: 0.5, backgroundColor: withAlpha(c.textMain, 0.08), marginLeft: 16 },

    typeToggle: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.secondary },
    typeChip: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, borderWidth: 1.5 },
    typeChipActive: { backgroundColor: withAlpha(c.primary, 0.08), borderColor: c.primary },
    typeChipText: { fontSize: FONTS.micro.size, fontWeight: '500' },

    saveBtn: { marginTop: 16, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: FONTS.sub.size, fontWeight: '600' },

    /* FILTERS */
    filterRow: { maxHeight: 40, marginBottom: 12 },
    filterRowContent: { gap: 6, alignItems: 'center', paddingHorizontal: 16 },
    filterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: c.secondary, backgroundColor: c.surface },
    filterChipText: { fontSize: FONTS.micro.size },

    /* INVOICE CARD */
    invCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.secondary, overflow: 'hidden', position: 'relative' as any },
    invTorn: { position: 'absolute' as any, top: 0, left: 0, right: 0, height: 4, opacity: 0.4 },
    invTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, marginTop: 4, borderBottomWidth: 1, borderStyle: 'dashed' as any, borderBottomColor: c.secondary },
    invBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, flexShrink: 0, marginTop: 2 },
    invBadgeVat: { backgroundColor: withAlpha(c.primary, 0.08), borderColor: withAlpha(c.primary, 0.3) },
    invBadgeGeneral: { backgroundColor: withAlpha(c.info, 0.08), borderColor: withAlpha(c.info, 0.3) },
    invBadgeText: { fontSize: FONTS.tiny.size, fontWeight: '600', letterSpacing: 0.6 },
    invMain: { flex: 1, minWidth: 0 },
    invCompany: { fontSize: FONTS.sub.size, fontWeight: '600', color: c.textMain, marginBottom: 3 },
    invTax: { fontSize: FONTS.nano.size, color: c.textSub, marginBottom: 4 },
    invMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' as any },
    invDate: { fontSize: FONTS.nano.size, color: c.textSub },
    invDot: { color: c.secondary, fontSize: FONTS.nano.size },
    invNo: { fontSize: FONTS.tiny.size, color: c.textSub },
    invSealWrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    invBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    invAmount: { fontSize: FONTS.large.size, fontWeight: '700' },
    invAmountLabel: { fontSize: FONTS.tiny.size, color: c.textSub, marginTop: 1 },
    invActions: { flexDirection: 'row', gap: 6 },
    invDelBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

    empty: { alignItems: 'center', paddingVertical: 48 },
    emptyText: { fontSize: FONTS.sub.size, color: c.textSub },

    /* DRAWER */
    drawer: { width: '100%' as any, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' as any, paddingBottom: 16 },
    drawerHandle: { width: 36, height: 4, borderRadius: 2, marginTop: 12, alignSelf: 'center', backgroundColor: c.secondary },
    drawerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, paddingBottom: 12 },
    drawerTitle: { fontSize: FONTS.sub.size, fontWeight: '600', color: c.textMain },
    drawerBody: { paddingHorizontal: 20, paddingTop: 8 },

    dLabel: { fontSize: FONTS.small.size, fontWeight: '500', color: c.textSub, marginBottom: 6, marginTop: 8 },
    dLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, marginTop: 8 },
    dAutoFillLabel: { fontSize: FONTS.nano.size, color: c.textSub, fontWeight: '400' },
    dField: { marginBottom: 14 },
    dFieldHalf: { flex: 1, minWidth: 0 },
    dRow: { flexDirection: 'row', gap: 10 },
    dInput: { width: '100%', paddingVertical: 11, paddingHorizontal: 14, borderWidth: 0, borderRadius: 10, fontSize: FONTS.sub.size, color: c.textMain },
    dAmountWrap: { position: 'relative' as any },
    dAmountPrefix: { position: 'absolute' as any, left: 14, top: 14, fontSize: FONTS.sub.size, fontWeight: '600' },
    dAmountInput: { paddingLeft: 26, fontSize: FONTS.body.size, fontWeight: '700' },
    dTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    dTypeChip: { flex: 1, flexDirection: 'row', paddingVertical: 10, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    dTypeChipText: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight },
    dSelectWrap: { minHeight: 40, justifyContent: 'center' },
    dBatchSelect: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 11, paddingHorizontal: 14,
      borderRadius: 10,
    },

    dSubmit: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginHorizontal: 20, marginBottom: 16, marginTop: 8 },
    dSubmitText: { fontSize: FONTS.sub.size, fontWeight: '600', color: '#fff' },
  });
