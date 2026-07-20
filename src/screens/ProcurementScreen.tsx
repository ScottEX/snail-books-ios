import React from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  FlatList, Image, ActivityIndicator, StyleSheet, Animated, Dimensions, useWindowDimensions,
  ActionSheetIOS,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { t } from '../i18n';
import { trPayment, payKey } from '../i18nHelpers';
import { api, resolveAssetUrl } from '../api/client';
import { getCurrentUserId } from '../utils/storage';
import { useTheme, withAlpha, ThemeColors, FONTS } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bottomSheetOverlay, MODAL_CARD_RADIUS } from '../sharedStyles';
import SheetHeader from '../components/SheetHeader';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { useServerDate } from '../hooks/useServerDate';
import ConfirmModal from "../components/ConfirmModal";
import EmptyState from "../components/EmptyState";
import TextField from '../components/TextField';
import ButtonPair from '../components/ButtonPair';
import SubmitButton from '../components/SubmitButton';
import { useToast } from '../hooks/useToast';
import ModalOverlay from '../components/ModalOverlay';
import CloseButton from '../components/CloseButton';
import { formatDate } from '../utils/format';
import DatePicker from '../components/DatePicker';
import TrashIcon from '../components/icons/TrashIcon';
import ReceiptUpload from '../components/ReceiptUpload';
import PaymentMethodChips from '../components/PaymentMethodChips';
import ExpenseNoteInput from '../components/ExpenseNoteInput';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import ReAnimated, { useAnimatedStyle } from 'react-native-reanimated';
import PlusIcon from '../components/icons/PlusIcon';
import { fmtDecInput } from '../utils/numbers';
import type { PickedImage } from '../utils/imagePicker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ImagePreview, { measureThumbLayout, resolveThumbLayout, ThumbLayoutResolver } from '../components/ImagePreview';
import { useImagePreview } from '../hooks/useImagePreview';

type SubTab = 'new' | 'history' | 'products';
type PayMethod = 'payCash' | 'payWechat' | 'payAlipay';

interface Product { id: number; name: string; spec: string; price: number; supplier: string; note?: string; }
interface CartItem { product: Product; quantity: number; subtotal: number; }
interface BatchRecord { id: number; batch_number: number; date: string; payment_method: string; category: string; total: number; images: string[]; thumb_images?: string[]; note: string; items: any[]; settled_at?: string | null; settled_by?: number | null; settled_by_username?: string | null; invoice_status?: string | null; }
interface ProcStats { total_spent: number; total_income: number; batch_count: number; margin_pct: number; }

// ═══════════════════════════════════════════════
// SVG Icons (local)
// ═══════════════════════════════════════════════

function CartIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="9" cy="21" r="1" /><Circle cx="20" cy="21" r="1" />
      <Path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
    </Svg>
  );
}
function PencilIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Svg>
  );
}
function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><Path d="M22 4L12 14.01l-3-3" />
    </Svg>
  );
}
function BoxIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <Path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </Svg>
  );
}
function ChevronDownIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}
function IcnSealProc({ color, label }: { color: string; label: string }) {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={22} fill="none" stroke={color} strokeWidth={1.4} />
      <Circle cx={24} cy={24} r={19.5} fill="none" stroke={color} strokeWidth={0.5} strokeDasharray="3 2" />
      <SvgText x={24} y={27} textAnchor="middle" fontSize={9} fontWeight="700" fill={color} transform="rotate(-12, 24, 24)">{label}</SvgText>
    </Svg>
  );
}
function EmptyCartIcon({ color }: { color: string }) {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <Path d="M3 6h18" />
      <Path d="M16 10a4 4 0 0 1-8 0" />
    </Svg>
  );
}
function EmptyClipboardIcon({ color }: { color: string }) {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <Path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
    </Svg>
  );
}
function EmptyBoxIcon({ color }: { color: string }) {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <Path d="M3.27 6.96L12 12.01l8.73-5.05" />
      <Path d="M12 22.08V12" />
    </Svg>
  );
}

const SUPPLIER_DISPLAY: Record<string, string> = {};
const SUPPLIER_ORDER = ['蓝姐', '蒙方', '鲜禾', '粉仔', '桂螺'];
const displaySupplier = (s: string) => SUPPLIER_DISPLAY[s] || s;
const sortByOrder = (a: string, b: string) => {
  const ai = SUPPLIER_ORDER.indexOf(a), bi = SUPPLIER_ORDER.indexOf(b);
  if (ai === -1 && bi === -1) return a.localeCompare(b);
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
};

// ═══════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════
const getStyles = (c: ThemeColors, bgOpacity: number) => {
  const dimColor = bgOpacity > 0.5 ? c.surface : c.textSub;
  return StyleSheet.create({
  container: { flex: 1, position: 'relative' as const, paddingHorizontal: 16 },

  frostedBlock: {
    marginHorizontal: 0, marginTop: 4, borderRadius: 16, overflow: 'hidden' as const,
    borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.08),
    backgroundColor: withAlpha(c.surface, 0.65),
  },
  headerSection: { padding: 16, paddingBottom: 8 },
  headerTop: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: 12 },
  headerTitle: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: c.textMain },
  headerBadge: { backgroundColor: withAlpha(c.primary, 0.1), borderRadius: 20, paddingHorizontal: 12, paddingVertical: 3 },
  headerBadgeText: { fontSize: FONTS.microBold.size, color: c.primary, fontWeight: FONTS.microBold.weight },
  headerComingSoon: { fontSize: FONTS.micro.size, color: dimColor },
  statRow: { flexDirection: 'row' as const, gap: 6 },
  statPill: { flex: 1, backgroundColor: withAlpha(c.textMain, 0.04), borderRadius: 10, padding: 10, alignItems: 'center' as const },
  statNum: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.textMain },
  statLbl: { fontSize: FONTS.micro.size, color: dimColor, marginTop: 3 },

  searchSection: { paddingHorizontal: 18, paddingBottom: 8, borderTopWidth: 0 },
  searchRow: { position: 'relative' as const },
  searchInput: { paddingHorizontal: 12, paddingVertical: 9, paddingRight: 36, borderWidth: 0, borderRadius: 10, fontSize: FONTS.sub.size, color: c.textMain, backgroundColor: withAlpha(c.textMain, 0.03), outline: 'none' as any },
  searchClear: { position: 'absolute' as const, right: 8, top: 0, bottom: 0, justifyContent: 'center' as const, alignItems: 'center' as const },
  filterRow: { flexDirection: 'row' as const, gap: 6, marginTop: 8 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: withAlpha(c.textMain, 0.12) },
  filterChipOn: { backgroundColor: c.primary, borderColor: c.primary },
  filterChipText: { fontSize: FONTS.micro.size, color: dimColor },
  filterChipTextOn: { color: c.surface },

  subTabRow: { flexDirection: 'row' as const, borderTopWidth: 0, marginHorizontal: 4, paddingTop: 2, marginBottom: 6 },
  subTab: { flex: 1, flexDirection: 'row' as const, gap: 4, paddingVertical: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  subTabOn: { backgroundColor: withAlpha(c.primary, 0.1), borderRadius: 10 },
  subTabText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: dimColor },
  subTabTextOn: { color: c.primary, fontWeight: FONTS.subBold.weight },
  subTabCount: { fontSize: FONTS.micro.size, fontWeight: '600' as any, color: dimColor, backgroundColor: withAlpha(c.textMain, 0.06), borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, textAlign: 'center' as any, overflow: 'hidden' as const },
  subTabCountOn: { color: c.primary },

  sectionHead: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4, fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: c.primary, textTransform: 'uppercase' as const, letterSpacing: 1 },
  productCard: { marginHorizontal: 0, marginBottom: 6, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: withAlpha(c.textMain, 0.06), overflow: 'hidden' as const },
  productCardSel: { borderColor: c.primary, borderWidth: 1.5 },
  prodRow: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 10, paddingHorizontal: 18, gap: 10 },
  prodInfo: { flex: 1 },
  prodName: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: c.textMain, marginBottom: 2 },
  prodSpec: { fontSize: FONTS.micro.size, color: c.textSub },
  prodPriceWrap: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, marginRight: 8 },
  prodPrice: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.primary },
  qtyRow: { flexDirection: 'row' as const, alignItems: 'center' as const },
  qtyBtn: { width: 44, height: 44, borderRadius: 8, alignItems: 'center' as const, justifyContent: 'center' as const },
  qtyBtnMinus: { backgroundColor: withAlpha(c.textMain, 0.06) },
  qtyBtnMinusText: { fontSize: FONTS.h2.size, color: c.textSub },
  qtyBtnPlus: { backgroundColor: c.primary },
  qtyBtnPlusText: { fontSize: FONTS.h2.size, color: c.surface, fontWeight: '300' as const },
  qtyNum: { width: 36, textAlign: 'center' as const, fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.textMain },
  prodSubtotal: { paddingHorizontal: 12, paddingBottom: 8, fontSize: FONTS.micro.size, color: c.primary, fontWeight: FONTS.micro.weight },

  cartBar: {
    position: 'absolute' as const, bottom: 76, left: 0, right: 0, zIndex: 100,
    marginHorizontal: 0, backgroundColor: withAlpha(c.surface, 0.65), borderRadius: 14,
    borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.08),
  },
  cartPreview: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, padding: 12 },
  cartIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const, overflow: 'visible' as const },
  cartBadge: { position: 'absolute' as const, top: -4, right: -4, minWidth: 18, height: 18, backgroundColor: c.warning, borderRadius: 9, borderWidth: 2, borderColor: c.surface, alignItems: 'center' as const, justifyContent: 'center' as const, paddingHorizontal: 3 },
  cartBadgeText: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: c.surface },
  cartInfo: { flex: 1 },
  cartInfoText: { fontSize: FONTS.micro.size, color: c.textSub },
  cartInfoCount: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.primary },
  cartTotal: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: c.primary },
  cartClearBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: withAlpha(c.danger, 0.08) },
  cartClearBtnText: { fontSize: FONTS.micro.size, color: c.danger, fontWeight: FONTS.microBold.weight },

  drawerHead: { flexDirection: 'column' as const, alignItems: 'flex-start' as const, paddingVertical: 14, paddingHorizontal: 20, backgroundColor: c.primary, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  drawerBody: { padding: 16, flex: 1 } as any,
  drawerFooter: { backgroundColor: c.surface, borderTopWidth: 0.5, borderTopColor: withAlpha(c.textMain, 0.08), paddingHorizontal: 18, paddingVertical: 10, paddingBottom: 24 },

  dateCatRow: { marginBottom: 12 },
  dateCatLine: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: withAlpha(c.textMain, 0.06), gap: 8 },
  dateCatLabel: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: c.textSub },
  dateCatValue: { fontSize: FONTS.sub.size, color: c.textMain, flexDirection: 'row' as const, alignItems: 'center' as const },

  sectionLabel: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: c.textSub, marginBottom: 6 },
  itemsBtnText: { fontSize: FONTS.sub.size, color: c.textMain, fontWeight: FONTS.sub.weight },

  itemsModalCard: { backgroundColor: c.surface, borderRadius: MODAL_CARD_RADIUS, overflow: 'hidden' as const, display: 'flex' as any, flexDirection: 'column' as any, paddingBottom: 12 },
  itemsModalBodyWrap: { paddingTop: 12, paddingBottom: 4 },
  itemsRow: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: withAlpha(c.textMain, 0.06) },
  itemsRowLast: { borderBottomWidth: 0 },
  itemsRowName: { flex: 1, fontSize: FONTS.sub.size, color: c.textMain },
  itemsRowQty: { fontSize: FONTS.micro.size, color: c.textSub, marginRight: 12, width: 48, textAlign: 'right' as const },
  itemsRowAmt: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.primary, width: 80, textAlign: 'right' as const },
  itemsTotalRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingVertical: 14, paddingHorizontal: 18, marginTop: 6, borderTopWidth: 1, borderTopColor: withAlpha(c.textMain, 0.12) },
  itemsTotalLabel: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.textMain },
  itemsTotal: { fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, color: c.primary },

  submitBtn: { backgroundColor: c.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' as const, marginTop: 16 },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: c.surface, fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight },

  mgmtRow: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 10, paddingHorizontal: 18, marginHorizontal: 0, marginBottom: 6, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: withAlpha(c.textMain, 0.06) },
  mgmtInfo: { flex: 1 },
  mgmtName: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: c.textMain },
  mgmtMeta: { fontSize: FONTS.micro.size, color: c.textSub, marginTop: 2 },
  mgmtActions: { flexDirection: 'row' as const, gap: 8 },
  mgmtActionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: withAlpha(c.textMain, 0.05) },
  mgmtAddBtn: { marginHorizontal: 0, marginTop: 8, marginBottom: 8, flexDirection: 'row' as const, backgroundColor: c.surface, borderRadius: 10, paddingVertical: 11, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6 },
  mgmtAddBtnText: { fontSize: FONTS.sub.size, fontWeight: FONTS.subBold.weight, color: c.primary },

  modalCard: { backgroundColor: c.surface, borderRadius: MODAL_CARD_RADIUS, width: 340, maxWidth: '90%' as any, overflow: 'hidden' as const },
  modalHeader: { backgroundColor: c.primary, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  modalTitle: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.surface },
  modalBody: { padding: 24 },
  modalInput: { paddingHorizontal: 14, paddingVertical: 13, borderRadius: 10, fontSize: FONTS.sub.size, color: c.textMain, backgroundColor: withAlpha(c.textMain, 0.03), marginBottom: 12 },
  modalDeleteBox: { backgroundColor: withAlpha(c.primary, 0.1), borderRadius: 12, padding: 12, alignItems: 'center' as const },
  modalDeleteText: { fontSize: FONTS.micro.size, color: c.textSub, textAlign: 'center' as const },

  historyList: { paddingVertical: 12, paddingBottom: 100 },
  historyCard: { backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: withAlpha(c.textMain, 0.06), marginBottom: 10, overflow: 'hidden' as const },
  histHead: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 10, borderBottomWidth: 1, borderBottomColor: withAlpha(c.textMain, 0.05) },
  histNo: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: c.primary },
  histDate: { fontSize: FONTS.micro.size, color: c.textSub },
  histActions: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  histActionBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: withAlpha(c.textMain, 0.04) },
  histAmountRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginTop: 8, minHeight: 48, position: 'relative' as const },
  histAmountNumberWrap: { position: 'relative' as const },
  histAmountSealOverlay: { position: 'absolute' as const, right: 0, top: '50%', marginTop: -40, opacity: 0.75, zIndex: 2 },
  histBody: { padding: 10 },
  histRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 4 },
  histRowLabel: { fontSize: FONTS.micro.size, color: c.textSub, flexShrink: 0 },
  histRowVal: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: c.textMain, flex: 1, textAlign: 'right' as const },
  histPayBadge: { alignSelf: 'flex-start' as const, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: withAlpha(c.primary, 0.08), borderRadius: 12, marginTop: 4 },
  histPayText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: c.primary },
  histAmount: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: c.primary, marginTop: 8 },
  histImages: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 4, marginTop: 6 },

  successOverlay: { position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 400, alignItems: 'center' as const, justifyContent: 'center' as const },
  successCard: { backgroundColor: c.surface, borderRadius: MODAL_CARD_RADIUS, padding: 28, width: 'calc(100% - 40px)' as any, maxWidth: 320, alignItems: 'center' as const },
  successTitle: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: c.textMain, marginBottom: 6, marginTop: 8 },
  successSub: { fontSize: FONTS.sub.size, color: c.textSub, lineHeight: 20 } as any,
  successAmount: { fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, color: c.primary, marginVertical: 12 },
  successBtns: { flexDirection: 'row' as const, gap: 8, marginTop: 16, width: '100%' as any },
  successBtnNew: { flex: 1, paddingVertical: 12, backgroundColor: c.primary, borderRadius: 12, alignItems: 'center' as const },
  successBtnNewText: { color: c.surface, fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight },
  successBtnView: { flex: 1, paddingVertical: 12, backgroundColor: c.secondary, borderRadius: 12, alignItems: 'center' as const },
  successBtnViewText: { color: c.textMain, fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight },

  loadingMore: { paddingVertical: 20, alignItems: 'center' as const },
  contentArea: { flex: 1, paddingBottom: 150 },
});
};

// ═══════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════
export default function ProcurementScreen({ onDrawerOpen, onDrawerClose, onProcurementDetail, pendingEditBatch, onPendingEditConsumed, onInvoice }: { onDrawerOpen?: () => void; onDrawerClose?: () => void; onProcurementDetail?: (batch: BatchRecord) => void; pendingEditBatch?: BatchRecord | null; onPendingEditConsumed?: () => void; onInvoice?: (batchId: number) => void }) {
  const { colors: c } = useTheme();
  const sd = useServerDate();
  const readBgOpacity = (): number => {
    try {
      const uid = getCurrentUserId();
      const key = uid ? `bg-opacity-${uid}` : 'bg-opacity';
      const s = localStorage.getItem(key);
      return s !== null ? parseFloat(s) : 1;
    } catch { return 1; }
  };
  const bgOpacity = readBgOpacity();
  const dimColor = bgOpacity > 0.5 ? c.surface : c.textSub;
  const styles = useMemo(() => getStyles(c, bgOpacity), [c, bgOpacity]);
  const insets = useSafeAreaInsets();

  // Drawer keyboard push
  const { height: screenH } = useWindowDimensions();
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const drawerCap = -screenH * 0.2;
  const drawerPushStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(keyboardHeight.value, drawerCap) }],
  }));

  const [subTab, setSubTab] = useState<SubTab>(() => {
    try {
      const saved = localStorage.getItem('snail_proc_tab');
      return (saved === 'new' || saved === 'history' || saved === 'products') ? saved : 'new';
    } catch { return 'new'; }
  });
  useEffect(() => { try { localStorage.setItem('snail_proc_tab', subTab); } catch {} }, [subTab]);
  useEffect(() => { setSearch(''); }, [subTab]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('全部');
  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [editPriceVal, setEditPriceVal] = useState('');

  const [showDrawer, setShowDrawer] = useState(false);
  const drawerCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleDrawerClose = () => {
    if (drawerCloseTimer.current) { clearTimeout(drawerCloseTimer.current); drawerCloseTimer.current = null; }
    setShowDrawer(false);
    onDrawerClose?.();
    drawerCloseTimer.current = setTimeout(() => {
      if (editingBatchId !== null) {
        setEditingBatchId(null); setEditingBatchNumber(0);
        setEditingBatchSettled(false); setCartUnitPrices({});
        setExistingImageUrls([]); setExistingThumbUrls([]);
        setEditSnapshot(null);
        setReceipts([]); setOrderNote('');
        setOrderDate(sd.today); setPayMethod('payWechat');
        // Reload cart from server instead of clearing — preserves items user added before editing
        api.getCart().then((data: any) => {
          if (Array.isArray(data)) {
            const map: Record<number, number> = {};
            data.forEach((item: any) => { map[item.product_id] = item.quantity; });
            setCart(map);
          }
        }).catch(() => { setCart({}); });
      }
      drawerCloseTimer.current = null;
    }, 300);
  };
  const [orderDate, setOrderDate] = useState('');
  useEffect(() => { if (sd.ready && orderDate === '') setOrderDate(sd.today); }, [sd.ready, sd.today, orderDate]);
  const [payMethod, setPayMethod] = useState<PayMethod>('payWechat');
  const [orderNote, setOrderNote] = useState('');
  const [receipts, setReceipts] = useState<PickedImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<number | null>(null);
  const [editingBatchNumber, setEditingBatchNumber] = useState<number>(0);
  const [editingBatchSettled, setEditingBatchSettled] = useState(false);
  const [cartUnitPrices, setCartUnitPrices] = useState<Record<number, number>>({});
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [existingThumbUrls, setExistingThumbUrls] = useState<string[]>([]);
  const [editSnapshot, setEditSnapshot] = useState<string | null>(null);
  const [deleteBatchTarget, setDeleteBatchTarget] = useState<BatchRecord | null>(null);
  const delBatchRef = useRef<BatchRecord | null>(null);

  const [showItemsModal, setShowItemsModal] = useState(false);
  const [itemsModalIsCart, setItemsModalIsCart] = useState(false);
  const [itemsModalView, setItemsModalView] = useState<'items' | 'products'>('items');
  const [productPickerSearch, setProductPickerSearch] = useState('');

  const [successTotal, setSuccessTotal] = useState(0);
  const [successBatch, setSuccessBatch] = useState(0);
  const [successIsEdit, setSuccessIsEdit] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { showToast, ToastHost } = useToast();

  const { preview, openPreview, closePreview } = useImagePreview();
  const histThumbRefs = useRef<Record<string, any>>({});

  const handleHistPreview = useCallback((batchId: string | number, images: string[], i: number) => {
    const resolver: ThumbLayoutResolver = (idx, cb) => resolveThumbLayout(histThumbRefs.current[`${batchId}-${idx}`], cb);
    const ref = histThumbRefs.current[`${batchId}-${i}`];
    if (!ref) { openPreview(images, i, undefined, resolver); return; }
    measureThumbLayout(ref, (layout) => openPreview(images, i, layout, resolver));
  }, [openPreview]);

  const [stats, setStats] = useState<ProcStats>({ total_spent: 0, total_income: 0, batch_count: 0, margin_pct: 0 });

  const { records: batches, total: histTotal, hasMore, loading: loadingHist, loadingMore, refresh, loadMore } = usePaginatedList<BatchRecord>({
    fetcher: useCallback(async (pg: number, perPage: number) => {
      const data: any = await api.getProcurementBatches(pg, perPage);
      return { records: data?.records || [], total: data?.total || 0, total_all: data?.total_all, pages: data?.pages || 1 };
    }, []),
  });

  const [searchBatches, setSearchBatches] = useState<BatchRecord[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  useEffect(() => {
    if (!search || subTab !== 'history') { setSearchBatches(null); return; }
    let cancelled = false;
    setSearchLoading(true);
    api.getProcurementBatches(1, 9999).then((data: any) => {
      if (cancelled) return;
      setSearchBatches(data?.records || []);
    }).catch(() => {}).finally(() => {
      if (!cancelled) setSearchLoading(false);
    });
    return () => { cancelled = true; };
  }, [search, subTab]);

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({ name: '', spec: '', price: '', supplier: '', note: '' });
  const [prodSaving, setProdSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const delTargetRef = useRef<Product | null>(null);

  const modalSlide = useRef(new Animated.Value(0)).current;
  const modalOverlayFade = useRef(new Animated.Value(0)).current;
  const openSlideModal = (show: () => void) => {
    show();
    modalSlide.setValue(-300);
    modalOverlayFade.setValue(0);
    Animated.parallel([
      Animated.spring(modalSlide, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
      Animated.timing(modalOverlayFade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };
  const closeSlideModal = (hide: () => void) => {
    Animated.parallel([
      Animated.timing(modalSlide, { toValue: -300, duration: 180, useNativeDriver: true }),
      Animated.timing(modalOverlayFade, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => hide());
  };

  const openItemsModal = () => {
    setItemsModalIsCart(true);
    setItemsModalView('items');
    setProductPickerSearch('');
    setShowItemsModal(true);
  };

  const openHistoryDetail = (batch: BatchRecord) => {
    onProcurementDetail?.(batch);
  };

  const suppliers = useMemo(() => {
    const set = new Set(products.map(p => p.supplier).filter(Boolean));
    const sorted = Array.from(set).sort(sortByOrder);
    return ['全部', ...sorted];
  }, [products]);

  const loadProducts = useCallback(() => {
    api.getProducts().then((data: any) => {
      if (Array.isArray(data)) { setProducts(data); }
      if (pendingEditRef.current) {
        openEditBatch(pendingEditRef.current);
        onPendingEditConsumedRef.current?.();
      }
    }).catch(() => {
      if (pendingEditRef.current) {
        openEditBatch(pendingEditRef.current);
        onPendingEditConsumedRef.current?.();
      }
    }).finally(() => {
      setProductsLoading(false);
    });
  }, []);
  const loadStats = useCallback(() => {
    api.getProcurementStats().then((s: any) => {
      if (s && typeof s === 'object') {
        setStats({
          total_spent: Number(s.total_spent) || 0,
          total_income: Number(s.total_income) || 0,
          batch_count: Number(s.batch_count) || 0,
          margin_pct: Number(s.margin_pct) || 0,
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => { loadProducts(); loadStats(); }, [loadProducts, loadStats]);

  useEffect(() => {
    api.getCart().then((data: any) => {
      if (Array.isArray(data)) {
        const map: Record<number, number> = {};
        data.forEach((item: any) => { map[item.product_id] = item.quantity; });
        setCart(map);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (subTab !== 'history') return; refresh(); }, [subTab]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (supplierFilter !== '全部') list = list.filter(p => p.supplier === supplierFilter);
    if (search) list = list.filter(p => p.name.includes(search));
    return list;
  }, [products, supplierFilter, search]);

  const filteredBatches = useMemo(() => {
    if (!search) return batches;
    if (searchBatches === null) return [];
    const s = search.toLowerCase();
    return searchBatches.filter(b => String(b.batch_number).includes(s));
  }, [batches, search, searchBatches]);

  const filteredMgmtProducts = useMemo(() => {
    if (!search) return products;
    const s = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(s) ||
      (p.spec || '').toLowerCase().includes(s) ||
      (p.supplier || '').toLowerCase().includes(s) ||
      (p.note || '').toLowerCase().includes(s)
    );
  }, [products, search]);

  const groupedProducts = useMemo(() => {
    const map: Record<string, Product[]> = {};
    filteredProducts.forEach(p => {
      const sup = p.supplier || '';
      if (!map[sup]) map[sup] = [];
      map[sup].push(p);
    });
    const sortedMap: [string, Product[]][] = Object.entries(map).sort(([a], [b]) => sortByOrder(a, b));
    return sortedMap;
  }, [filteredProducts]);

  const supplierLabel = (sup: string) => displaySupplier(sup) || t('procAll');

  const cartItems: CartItem[] = useMemo(() => {
    return Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([pid, qty]) => {
        const product = products.find(p => p.id === Number(pid));
        if (!product) return null;
        const unitPrice = cartUnitPrices[product.id] ?? product.price;
        return { product, quantity: qty, subtotal: unitPrice * qty };
      }).filter(Boolean) as CartItem[];
  }, [cart, products, cartUnitPrices]);

  const cartTotal = useMemo(() => cartItems.reduce((s, i) => s + i.subtotal, 0), [cartItems]);
  const cartCount = cartItems.length;

  const editUnchanged = useMemo(() => {
    if (editingBatchId === null || !editSnapshot) return false;
    try {
      const s = JSON.parse(editSnapshot);
      return s.date === orderDate && s.pm === payMethod &&
        JSON.stringify(s.cart) === JSON.stringify(cart) &&
        s.note === orderNote && s.imgs === existingImageUrls.length &&
        receipts.length === 0;
    } catch { return false; }
  }, [editingBatchId, editSnapshot, orderDate, payMethod, cart, orderNote, existingImageUrls.length, receipts.length]);

  const updateQty = (pid: number, delta: number) => {
    setCart(prev => {
      const newQty = Math.max(0, (prev[pid] || 0) + delta);
      if (newQty === 0) {
        api.removeFromCart(pid).catch(() => {});
        const next = { ...prev };
        delete next[pid];
        return next;
      }
      api.addToCart(pid, newQty).catch(() => {});
      return { ...prev, [pid]: newQty };
    });
  };

  const clearCart = () => {
    setCart({});
    api.clearCart().catch(() => {});
  };

  const startEditPrice = (pid: number) => {
    const p = products.find(x => x.id === pid);
    if (p) { setEditingPrice(pid); setEditPriceVal(String(p.price)); }
  };

  const commitPrice = (pid: number) => {
    const val = parseFloat(editPriceVal);
    if (!isNaN(val) && val > 0) {
      api.updateProduct({ id: pid, name: products.find(p => p.id === pid)?.name, price: val }).then((r: any) => {
        if (r?.status === 'ok') setProducts(prev => prev.map(p => p.id === pid ? { ...p, price: val } : p));
      }).catch(() => {});
    }
    setEditingPrice(null);
  };

  const handleAddFiles = useCallback(async (files: PickedImage[]) => {
    const newFiles: PickedImage[] = [];
    for (const f of files) {
      if (receipts.some(r => r.uri === f.uri)) continue;
      newFiles.push(f);
    }
    setReceipts(prev => [...prev, ...newFiles]);
  }, [receipts]);

  const handleRemoveNewFile = useCallback((i: number) => {
    setReceipts(prev => prev.filter((_, idx) => idx !== i));
  }, []);

  const getPreviewUrl = useCallback((file: PickedImage) => file.uri || '', []);

  const submitOrder = async () => {
    if (cartItems.length === 0) return;
    setSubmitting(true);
    try {
      let newImageUrls: string[] = [];
      let newThumbUrls: string[] = [];
      if (receipts.length > 0) {
        const result = await api.uploadExpenseImages(receipts);
        if (result.status !== 'ok') {
          setSubmitting(false);
          showToast(t('toastSubmitFailed'));
          return;
        }
        newImageUrls = result.images || [];
        newThumbUrls = (result.thumb_images && result.thumb_images.length > 0)
          ? result.thumb_images
          : newImageUrls;
      }
      if (editingBatchId !== null) {
        const allImages = [...existingImageUrls, ...newImageUrls];
        const allThumbs = [...existingThumbUrls, ...newThumbUrls];
        const r = await api.updateProcurementBatch(editingBatchId, {
          date: orderDate, payment_method: payMethod, category: 'goods',
          items: cartItems.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
          images: allImages, thumb_images: allThumbs, note: orderNote,
        });
        if (r?.status === 'ok') {
          setShowDrawer(false);
          onDrawerClose?.();
          setTimeout(() => {
          setReceipts([]); setOrderNote('');
          setExistingImageUrls([]); setExistingThumbUrls([]);
          setEditingBatchId(null); setEditingBatchNumber(0);
          setEditingBatchSettled(false); setCartUnitPrices({});
          setOrderDate(sd.today); setPayMethod('payWechat');
          api.getCart().then((data: any) => {
            if (Array.isArray(data)) {
              const map: Record<number, number> = {};
              data.forEach((item: any) => { map[item.product_id] = item.quantity; });
              setCart(map);
            }
          }).catch(() => { setCart({}); });
          }, 300);
          setSuccessTotal(r.total); setSuccessBatch(editingBatchNumber);
          setSuccessIsEdit(true);
          setTimeout(() => openSlideModal(() => setShowSuccess(true)), 250);
          loadStats();
          refresh();
        } else {
          showToast(t('toastSubmitFailed'));
        }
        setSubmitting(false);
        return;
      }
      const r = await api.createProcurementBatch({
        date: orderDate, payment_method: payMethod, category: 'goods',
        items: cartItems.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
        images: newImageUrls, thumb_images: newThumbUrls, note: orderNote,
      });
      if (r?.status === 'ok') {
        setSuccessTotal(r.total); setSuccessBatch(r.batch_number); setSuccessIsEdit(false);
        setShowDrawer(false);
        onDrawerClose?.();
        setTimeout(() => {
        setCart({}); api.clearCart().catch(() => {}); setReceipts([]); setOrderNote('');
        }, 300);
        setTimeout(() => openSlideModal(() => setShowSuccess(true)), 250);
        loadStats();
        refresh();
      } else {
        showToast(t('toastSubmitFailed'));
      }
    } catch (err) {
      console.error('[procurement] submit error:', err);
      showToast(t('toastSubmitFailed'));
    }
    setSubmitting(false);
  };

  const openEditBatch = (batch: BatchRecord) => {
    if (drawerCloseTimer.current) { clearTimeout(drawerCloseTimer.current); drawerCloseTimer.current = null; }
    setEditingBatchId(batch.id);
    setEditingBatchNumber(batch.batch_number);
    setOrderDate(batch.date);
    setPayMethod((payKey(batch.payment_method) as PayMethod) || 'payWechat');
    setOrderNote(batch.note || '');
    const newCart: Record<number, number> = {};
    const newUnitPrices: Record<number, number> = {};
    const isSettled = !!batch.settled_at;
    for (const it of batch.items) {
      const pid = it.product_id;
      const qty = it.quantity;
      if (pid && qty > 0) newCart[pid] = qty;
      if (isSettled && pid && typeof it.unit_price === 'number') {
        newUnitPrices[pid] = it.unit_price;
      }
    }
    setCart(newCart);
    setCartUnitPrices(newUnitPrices);
    setEditingBatchSettled(isSettled);
    setReceipts([]);
    setExistingImageUrls(batch.images || []);
    setExistingThumbUrls(batch.thumb_images || []);
    setEditSnapshot(JSON.stringify({ date: batch.date, pm: payKey(batch.payment_method), cart: newCart, note: batch.note || '', imgs: (batch.images || []).length }));
    setShowDrawer(true);
    onDrawerOpen?.();
  };

  const pendingEditRef = useRef<any>(null);
  useEffect(() => { pendingEditRef.current = pendingEditBatch; }, [pendingEditBatch]);

  const onPendingEditConsumedRef = useRef(onPendingEditConsumed);
  useEffect(() => { onPendingEditConsumedRef.current = onPendingEditConsumed; }, [onPendingEditConsumed]);

  // popTo('Main', { editBatch }) returns to the ALREADY-MOUNTED screen, so
  // loadProducts (mount-only) never re-fires. Watch the prop directly and
  // open the edit drawer when a pending edit arrives. Guard against the
  // double-open race with loadProducts' own pendingEdit consumption.
  useEffect(() => {
    if (pendingEditBatch) {
      openEditBatch(pendingEditBatch);
      onPendingEditConsumedRef.current?.();
    }
  }, [pendingEditBatch]);

  const confirmDeleteBatch = async () => {
    if (!delBatchRef.current) return;
    const targetId = delBatchRef.current.id;
    setDeleteBatchTarget(null);
    try {
      const r = await api.deleteProcurementBatch(targetId);
      if (r?.status === 'ok') {
        refresh();
        loadStats();
      } else {
        showToast(t('toastSubmitFailed'));
      }
    } catch (err) {
      console.error('[procurement] delete error:', err);
      showToast(t('toastSubmitFailed'));
    }
  };

  const removeExistingImage = useCallback((i: number) => {
    setExistingImageUrls(prev => prev.filter((_, idx) => idx !== i));
    setExistingThumbUrls(prev => prev.filter((_, idx) => idx !== i));
  }, []);

  const resolvedExistingImages = useMemo(
    () => existingImageUrls.map(u => resolveAssetUrl(u) || u),
    [existingImageUrls]
  );

  const resetOrder = () => {
    closeSlideModal(() => { setShowSuccess(false); setOrderDate(sd.today); setPayMethod('payWechat'); setOrderNote(''); setReceipts([]); });
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setProdForm({ name: '', spec: '', price: '', supplier: '', note: '' });
    setShowProductModal(true);
  };
  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdForm({ name: p.name, spec: p.spec, price: String(p.price), supplier: p.supplier, note: p.note || '' });
    setShowProductModal(true);
  };
  const saveProduct = async () => {
    if (!prodForm.name || prodSaving) return;
    setProdSaving(true);
    const data = { name: prodForm.name, spec: prodForm.spec, price: parseFloat(prodForm.price) || 0, supplier: prodForm.supplier, note: prodForm.note };
    try {
      editingProduct ? await api.updateProduct({ ...data, id: editingProduct.id }) : await api.createProduct(data);
      setShowProductModal(false);
      loadProducts();
    } catch {
      showToast(t('toastSubmitFailed'));
    }
    setProdSaving(false);
  };
  const confirmDelete = async () => {
    if (!delTargetRef.current) return;
    try {
      await api.deleteProduct(delTargetRef.current.id);
      setCart(prev => { const cp = { ...prev }; delete cp[delTargetRef.current!.id]; return cp; });
      loadProducts();
    } catch {
      showToast(t('toastSubmitFailed'));
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <View style={styles.container}>
      {/* ── Frosted card block ── */}
      <View style={{ marginTop: 4, borderRadius: 16, overflow: 'hidden' }}>
        <BlurView
          intensity={24}
          tint="light"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.headerSection}>
          <View style={styles.headerTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BoxIcon color={c.primary} />
              <Text style={styles.headerTitle}>{t('procTitle')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerComingSoon}>{t('procComingSoon')}</Text>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{t('procNowBatch').replace('{n}', String(stats.batch_count + 1))}</Text>
              </View>
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statPill}>
              <Text style={styles.statNum}>{stats.batch_count}</Text>
              <Text style={styles.statLbl}>{t('procBatchCount')}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statNum}>¥{stats.total_spent.toFixed(2)}</Text>
              <Text style={styles.statLbl}>{t('procCumulative')}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statNum}>{stats.margin_pct.toFixed(2)}%</Text>
              <Text style={styles.statLbl}>{t('procMargin')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder={subTab === 'history' ? t('procSearchHistory') : subTab === 'products' ? t('procSearchProducts') : t('procSearchPlaceholder')}
              placeholderTextColor={dimColor}
              value={search} onChangeText={setSearch}
            />
            {search !== '' && (
              <TouchableOpacity style={styles.searchClear} onPress={() => setSearch('')}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={c.textSub} strokeWidth={2} strokeLinecap="round">
                  <Path d="M18 6L6 18M6 6l12 12" />
                </Svg>
              </TouchableOpacity>
            )}
          </View>
          {subTab === 'new' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 6 }}>
            {suppliers.map(sup => (
              <TouchableOpacity key={sup} style={[styles.filterChip, supplierFilter === sup && styles.filterChipOn]} onPress={() => setSupplierFilter(sup)}>
                <Text style={[styles.filterChipText, supplierFilter === sup && styles.filterChipTextOn]}>{sup === '全部' ? t('procAll') : displaySupplier(sup)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          )}
        </View>

        <View style={styles.subTabRow}>
          <TouchableOpacity activeOpacity={0.7} style={[styles.subTab, subTab === 'new' && styles.subTabOn]} onPress={() => setSubTab('new')}>
            <Text style={[styles.subTabText, subTab === 'new' && styles.subTabTextOn]}>{t('procNewOrder')}</Text>
            <Text style={[styles.subTabCount, subTab === 'new' && styles.subTabCountOn]}>{products.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={[styles.subTab, subTab === 'history' && styles.subTabOn]} onPress={() => setSubTab('history')}>
            <Text style={[styles.subTabText, subTab === 'history' && styles.subTabTextOn]}>{t('procHistory')}</Text>
            <Text style={[styles.subTabCount, subTab === 'history' && styles.subTabCountOn]}>{histTotal}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={[styles.subTab, subTab === 'products' && styles.subTabOn]} onPress={() => setSubTab('products')}>
            <Text style={[styles.subTabText, subTab === 'products' && styles.subTabTextOn]}>{t('procProductMgmt')}</Text>
            <Text style={[styles.subTabCount, subTab === 'products' && styles.subTabCountOn]}>{products.length}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── New Order ── */}
      {subTab === 'new' && (
        <View style={{ flex: 1 }}>
          {productsLoading ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              {[...Array(8)].map((_, i) => (
                <View key={i} style={{ marginBottom: 12 }}>
                  <View style={{ width: 56, height: 12, backgroundColor: withAlpha(c.textSub, 0.08), borderRadius: 4, marginLeft: 18, marginBottom: 8 }} />
                  {[...Array(3)].map((_, j) => (
                    <View key={j} style={[styles.productCard, { marginHorizontal: 0, pointerEvents: 'none' as any }]}>
                      <View style={styles.prodRow}>
                        <View style={styles.prodInfo}>
                          <View style={{ width: 100, height: 14, backgroundColor: withAlpha(c.textSub, 0.08), borderRadius: 4 }} />
                          <View style={{ width: 60, height: 11, backgroundColor: withAlpha(c.textSub, 0.05), borderRadius: 4, marginTop: 4 }} />
                        </View>
                        <View style={styles.prodPriceWrap}>
                          <View style={{ width: 52, height: 14, backgroundColor: withAlpha(c.textSub, 0.08), borderRadius: 4 }} />
                        </View>
                        <View style={styles.qtyRow}>
                          <View style={[styles.qtyBtn, styles.qtyBtnMinus]} />
                          <View style={{ width: 24, height: 14, backgroundColor: withAlpha(c.textSub, 0.06), borderRadius: 4 }} />
                          <View style={[styles.qtyBtn, styles.qtyBtnPlus, { backgroundColor: withAlpha(c.textSub, 0.08) }]} />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
              <View style={{ height: 120 }} />
            </ScrollView>
          ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            {groupedProducts.map(([sup, items]) => (
              <View key={sup}>
                <Text style={styles.sectionHead}>{supplierLabel(sup)}</Text>
                {items.map(p => {
                  const qty = cart[p.id] || 0;
                  const isEditing = editingPrice === p.id;
                  return (
                    <View key={p.id} style={[styles.productCard, qty > 0 && styles.productCardSel]}>
                      <View style={styles.prodRow}>
                        <View style={styles.prodInfo}>
                          <Text style={styles.prodName}>{p.name}</Text>
                          <Text style={styles.prodSpec}>{p.spec}</Text>
                        </View>
                        <View style={styles.prodPriceWrap}>
                          {isEditing ? (
                            <TextInput
                              style={{ width: 70, fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.textMain, borderWidth: 1, borderColor: c.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: c.surface } as any}
                              value={editPriceVal} onChangeText={(v) => setEditPriceVal(fmtDecInput(v))}
                              onBlur={() => commitPrice(p.id)} autoFocus keyboardType="decimal-pad"
                            />
                          ) : (
                            <>
                              <Text style={styles.prodPrice}>¥{p.price.toFixed(2)}</Text>
                              <TouchableOpacity onPress={() => startEditPrice(p.id)} style={{ padding: 2 }}>
                                <PencilIcon color={c.textSub} />
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                        <View style={styles.qtyRow}>
                          <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnMinus]} onPress={() => updateQty(p.id, -1)}>
                            <Text style={styles.qtyBtnMinusText}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.qtyNum}>{qty}</Text>
                          <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnPlus]} onPress={() => updateQty(p.id, 1)}>
                            <Text style={styles.qtyBtnPlusText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      {qty > 0 && <Text style={styles.prodSubtotal}>{t('procSubtotal')} ¥{(p.price * qty).toFixed(2)}</Text>}
                    </View>
                  );
                })}
              </View>
            ))}
            {groupedProducts.length === 0 && (
              <EmptyState
                icon={<EmptyCartIcon color={c.textSub} />}
                title={t('procEmptyNewTitle')}
                hint={t('procEmptyNewHint')}
              />
            )}
            <View style={{ height: 120 }} />
          </ScrollView>
          )}

          {cartCount > 0 && (
            <View style={styles.cartBar}>
              <View style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, borderRadius: 14, overflow: 'hidden' as const } as any}>
                <BlurView
                  intensity={40}
                  tint="regular"
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              </View>
              <TouchableOpacity style={styles.cartPreview} onPress={() => { setShowDrawer(true); onDrawerOpen?.(); }} activeOpacity={0.8}>
                <View style={[styles.cartIconWrap, { backgroundColor: c.primary }]}>
                  <CartIcon color={c.surface} />
                  <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>
                </View>
                <View style={styles.cartInfo}>
                  <Text style={styles.cartInfoText}>{t('procSelected')} <Text style={styles.cartInfoCount}>{cartCount}</Text> {t('procUnit')}</Text>
                </View>
                <Text style={styles.cartTotal}>¥{cartTotal.toFixed(2)}</Text>
                <TouchableOpacity onPress={clearCart} activeOpacity={0.6} style={styles.cartClearBtn}>
                  <Text style={styles.cartClearBtnText}>{t('clear')}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── History ── */}
      {subTab === 'history' && (
        loadingHist || (search !== '' && searchLoading) ? (
          <View style={styles.historyList}>
            {[...Array(10)].map((_, i) => (
              <View key={i} style={[styles.historyCard, { pointerEvents: 'none' as any }]}>
                <View style={styles.histHead}>
                  <View style={{ width: 100, height: 14, backgroundColor: withAlpha(c.textSub, 0.08), borderRadius: 4 }} />
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <View style={{ width: 60, height: 12, backgroundColor: withAlpha(c.textSub, 0.06), borderRadius: 4 }} />
                    <View style={{ width: 20, height: 20, backgroundColor: withAlpha(c.textSub, 0.06), borderRadius: 4 }} />
                    <View style={{ width: 20, height: 20, backgroundColor: withAlpha(c.textSub, 0.06), borderRadius: 4 }} />
                  </View>
                </View>
                <View style={[styles.histBody, { paddingHorizontal: 18 }]}>
                  <View style={[styles.histRow, { marginBottom: 6 }]}>
                    <View style={{ width: 56, height: 12, backgroundColor: withAlpha(c.textSub, 0.05), borderRadius: 4 }} />
                    <View style={{ width: 40, height: 12, backgroundColor: withAlpha(c.textSub, 0.06), borderRadius: 4 }} />
                  </View>
                  <View style={[styles.histRow, { marginBottom: 6 }]}>
                    <View style={{ width: 64, height: 12, backgroundColor: withAlpha(c.textSub, 0.05), borderRadius: 4 }} />
                    <View style={{ width: 32, height: 12, backgroundColor: withAlpha(c.textSub, 0.06), borderRadius: 4 }} />
                  </View>
                  <View style={[styles.histAmountRow, { marginTop: 4 }]}>
                    <View style={{ width: 48, height: 12, backgroundColor: withAlpha(c.textSub, 0.05), borderRadius: 4 }} />
                    <View style={{ width: 80, height: 20, backgroundColor: withAlpha(c.primary, 0.08), borderRadius: 4 }} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : batches.length === 0 ? (
          <EmptyState
            icon={<EmptyClipboardIcon color={c.textSub} />}
            title={t('procEmptyHistoryTitle')}
            hint={t('procEmptyHistoryHint')}
          />
        ) : (
          <FlatList
            data={filteredBatches}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={styles.historyList}
            showsVerticalScrollIndicator={false}
            onEndReached={hasMore ? () => loadMore() : undefined}
            onEndReachedThreshold={0.4}
            renderItem={({ item: batch }) => (
            <View style={styles.historyCard}>
              <TouchableOpacity onPress={() => openHistoryDetail(batch)} activeOpacity={0.7}>
                <View style={styles.histHead}>
                  <Text style={styles.histNo}>{t('procNowBatch').replace('{n}', String(batch.batch_number))}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={styles.histDate}>{batch.date}</Text>
                    <View style={styles.histActions}>
                      {batch.invoice_status ? (
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation?.(); onInvoice?.(batch.id); }}
                          activeOpacity={0.7}
                          style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: batch.invoice_status === 'done' ? withAlpha(c.success, 0.12) : withAlpha(c.warning, 0.12) }}
                        >
                          <Text style={{ fontSize: FONTS.nano.size, fontWeight: '600', color: batch.invoice_status === 'done' ? c.success : c.warning }}>
                            {batch.invoice_status === 'done' ? t('invRecStatusDone') : t('invRecStatusPending')}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation?.(); onInvoice?.(batch.id); }}
                          activeOpacity={0.7}
                          style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: withAlpha(c.primary, 0.10) }}
                        >
                          <Text style={{ fontSize: FONTS.nano.size, fontWeight: '600', color: c.primary }}>
                            {t('invToInvoice')}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.histActionBtn}
                        onPress={(e) => { e.stopPropagation?.(); openEditBatch(batch); }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <PencilIcon color={c.textSub} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.histActionBtn, batch.settled_at && { opacity: 0.3 }]}
                        onPress={(e) => { e.stopPropagation?.(); if (!batch.settled_at) { delBatchRef.current = batch; openSlideModal(() => setDeleteBatchTarget(batch)); } }}
                        disabled={!!batch.settled_at}
                        activeOpacity={batch.settled_at ? 1 : 0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <TrashIcon color={c.danger} size={14} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                <View style={[styles.histBody, { paddingHorizontal: 18 }]}>
                  <View style={styles.histRow}>
                    <Text style={styles.histRowLabel}>{t('procOrderItems')}</Text>
                    <Text style={styles.histRowVal}>{batch.items?.length || 0} {t('procUnit')}</Text>
                  </View>
                  <View style={styles.histRow}>
                    <Text style={styles.histRowLabel}>{t('procPaymentMethod')}</Text>
                    <Text style={styles.histRowVal}>{trPayment(batch.payment_method)}</Text>
                  </View>
                  {batch.note ? (
                    <View style={styles.histRow}>
                      <Text style={styles.histRowLabel}>{t('procNoteOptional')}</Text>
                      <Text style={styles.histRowVal}>{batch.note}</Text>
                    </View>
                  ) : null}
                  <View style={styles.histAmountRow}>
                    <Text style={{ fontSize: FONTS.micro.size, color: c.textSub }}>{t('procThisBatch')}</Text>
                    <View style={styles.histAmountNumberWrap}>
                      <Text style={styles.histAmount}>¥{batch.total.toFixed(2)}</Text>
                      <View style={styles.histAmountSealOverlay} pointerEvents="none">
                        <IcnSealProc
                          color={batch.settled_at ? c.success : c.warning}
                          label={batch.settled_at ? t('procSettled') : t('procUnsettled')}
                        />
                      </View>
                    </View>
                  </View>
                  {(() => {
                  const thumbImgs: string[] = (batch.thumb_images?.length ? batch.thumb_images : batch.images) || [];
                  const fullImgs: string[] = batch.images || [];
                  return thumbImgs.length > 0 && (
                    <View style={styles.histImages}>
                      {thumbImgs.map((img: string, i: number) => (
                        <TouchableOpacity
                          key={i}
                          ref={el => { histThumbRefs.current[`${batch.id}-${i}`] = el; }}
                          onPress={() => handleHistPreview(batch.id, fullImgs.map((u: string) => resolveAssetUrl(u) || u), i)}
                          activeOpacity={0.7}
                        >
                          <Image source={{ uri: resolveAssetUrl(img) || img }}
                            style={{ width: 60, height: 60, borderRadius: 6, borderWidth: 1, borderColor: withAlpha(c.textMain, 0.08) }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                  })()}
                </View>
              </TouchableOpacity>
            </View>
          )}
          ListFooterComponent={hasMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={c.primary} />
            </View>
          ) : null}
        />
      ))}

      {/* ── Product Mgmt ── */}
      {subTab === 'products' && (
        <>
          <TouchableOpacity style={styles.mgmtAddBtn} onPress={openAddProduct}>
            <PlusIcon color={c.primary} />
            <Text style={styles.mgmtAddBtnText}>{t('procAddProduct')}</Text>
          </TouchableOpacity>
          <ScrollView style={styles.contentArea} showsVerticalScrollIndicator={false}>
          {productsLoading ? (
            [...Array(6)].map((_, i) => (
              <View key={i} style={[styles.mgmtRow, { pointerEvents: 'none' as any }]}>
                <View style={styles.mgmtInfo}>
                  <View style={{ width: 90, height: 14, backgroundColor: withAlpha(c.textSub, 0.08), borderRadius: 4 }} />
                  <View style={{ width: 140, height: 11, backgroundColor: withAlpha(c.textSub, 0.05), borderRadius: 4, marginTop: 4 }} />
                </View>
                <View style={styles.mgmtActions}>
                  <View style={[styles.mgmtActionBtn, { backgroundColor: withAlpha(c.textSub, 0.05) }]} />
                  <View style={[styles.mgmtActionBtn, { backgroundColor: withAlpha(c.textSub, 0.05) }]} />
                </View>
              </View>
            ))
          ) : (
          <>
          {filteredMgmtProducts.length === 0 ? (
            <EmptyState
              icon={<EmptyBoxIcon color={c.textSub} />}
              title={t('procEmptyProductsTitle')}
              hint={t('procEmptyProductsHint')}
            />
          ) : (
            [...filteredMgmtProducts].sort((a, b) => b.id - a.id).map(p => (
              <View key={p.id} style={styles.mgmtRow}>
                <View style={styles.mgmtInfo}>
                  <Text style={styles.mgmtName}>{p.name}</Text>
                  <Text style={styles.mgmtMeta}>{p.supplier} · {p.spec} · ¥{p.price.toFixed(2)}</Text>
                </View>
                <View style={styles.mgmtActions}>
                  <TouchableOpacity style={styles.mgmtActionBtn} onPress={() => openEditProduct(p)}>
                    <PencilIcon color={c.textSub} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.mgmtActionBtn} onPress={() => { delTargetRef.current = p; openSlideModal(() => setDeleteTarget(p)); }}>
                    <TrashIcon color={c.danger} size={14} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </>
      )}
      </ScrollView>
      </>
      )}

      {/* ── Product Modal (springScale) ── */}
      <ModalOverlay visible={showProductModal} onClose={() => setShowProductModal(false)} animation="springScale">
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingProduct ? t('procEditProduct') : t('procAddProduct')}</Text>
            <CloseButton onPress={() => setShowProductModal(false)} />
          </View>
          <View style={styles.modalBody}>
            <TextField placeholder={t('procProductName')} value={prodForm.name} onChangeText={v => setProdForm(p => ({ ...p, name: v }))} />
            <TextField placeholder={t('procProductSpec')} value={prodForm.spec} onChangeText={v => setProdForm(p => ({ ...p, spec: v }))} />
            <TouchableOpacity
              style={[styles.modalInput, { justifyContent: 'center' }]}
              onPress={() => {
                const opts = suppliers.filter((s: string) => s !== '全部');
                ActionSheetIOS.showActionSheetWithOptions(
                  { options: [...opts, t('cancel') as string], cancelButtonIndex: opts.length, title: (t('procProductSupplier') as string) },
                  (i: number) => { if (i < opts.length) setProdForm(p => ({ ...p, supplier: opts[i] })); },
                );
              }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: FONTS.sub.size, color: prodForm.supplier ? c.textMain : c.textSub }}>
                  {prodForm.supplier || t('procProductSupplier')}
                </Text>
                <ChevronDownIcon color={c.textSub} />
              </View>
            </TouchableOpacity>
            <TextField placeholder={t('procProductPrice')} value={prodForm.price} onChangeText={v => setProdForm(p => ({ ...p, price: fmtDecInput(v) }))} keyboardType="decimal-pad" />
            <TextField placeholder={t('procProductNote')} value={prodForm.note} onChangeText={v => setProdForm(p => ({ ...p, note: v }))} />
            <ButtonPair
              leftLabel={t('cancel')}
              leftOnPress={() => setShowProductModal(false)}
              rightLabel={t('procSubmit')}
              rightOnPress={saveProduct}
              rightLoading={prodSaving}
            />
          </View>
        </View>
      </ModalOverlay>

      {/* ── Delete confirmation modal (product) ── */}
      <ConfirmModal
        visible={deleteTarget !== null}
        title={t('procDeleteProduct') || '删除商品'}
        message={<>{t('procDeleteProductConfirm').split('{name}')[0]}<Text style={{ color: c.primary, fontWeight: '600' }}>{delTargetRef.current?.name}</Text>{t('procDeleteProductConfirm').split('{name}')[1]}{' '}{t('procDeleteProductWarning')}</>}
        confirmLabel={t('delete')}
        onConfirm={() => confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
        animation="blurMorph"
      />

      {/* ── Delete batch confirmation modal ── */}
      <ConfirmModal
        visible={deleteBatchTarget !== null}
        title={t('procDeleteBatch')}
        message={<>{t('procDeleteBatchConfirmV2').split('{batch}')[0]}<Text style={{ color: c.primary, fontWeight: '600' }}>{t('procNowBatch').replace('{n}', String(delBatchRef.current?.batch_number ?? ''))}</Text>{t('procDeleteBatchConfirmV2').split('{batch}')[1]}</>}
        confirmLabel={t('delete')}
        onConfirm={() => confirmDeleteBatch()}
        onCancel={() => setDeleteBatchTarget(null)}
        animation="blurMorph"
      />

      {/* ── Order Drawer (slide up + scale) ── */}
      <ModalOverlay
        visible={showDrawer}
        onClose={handleDrawerClose}
        animation="slideUpScale"
        overlayStyle={bottomSheetOverlay as any}
        contentStyle={{ position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'stretch' } as any}
      >
        <ReAnimated.View style={[drawerPushStyle, { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: Dimensions.get('window').height * 0.7, maxHeight: Dimensions.get('window').height * 0.7, width: '100%', maxWidth: 768, alignSelf: 'center', overflow: 'hidden' as any, display: 'flex' as any, flexDirection: 'column' as any }]}>
          <View style={styles.drawerHead}>
            <SheetHeader
              title={editingBatchId !== null
                ? t('procEditBatch').replace('{n}', String(editingBatchNumber))
                : t('procConfirmOrder')}
              onClose={handleDrawerClose}
            />
          </View>
          <ScrollView style={styles.drawerBody} showsVerticalScrollIndicator={false}>
            <View style={styles.dateCatRow}>
              <View style={styles.dateCatLine}>
                <Text style={styles.dateCatLabel}>{t('procOrderDate')}</Text>
                <DatePicker
                  date={orderDate}
                  onChange={setOrderDate}
                  max={sd.today}
                  displayDate={formatDate(orderDate)}
                  fontSize={FONTS.sub.size}
                  showChevron
                  showCalendarIcon
                />
                <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.dateCatLabel}>{t('expenseCategory')}</Text>
                  <Text style={{ fontSize: FONTS.sub.size, color: c.textMain, fontWeight: FONTS.sub.weight }}>{t('goods')}</Text>
                </View>
              </View>
            </View>

            <PaymentMethodChips label={t('procPaymentMethod') as string} selected={payMethod} onSelect={(m) => setPayMethod(m as PayMethod)} />

            <View style={{ marginTop: 12, opacity: showItemsModal ? 0 : 1 }}>
              <ReceiptUpload
                existingImages={resolvedExistingImages}
                newFiles={receipts}
                onAdd={handleAddFiles}
                onRemoveExisting={removeExistingImage}
                onRemoveNew={handleRemoveNewFile}
                getPreviewUrl={getPreviewUrl}
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 }}>
              <Text style={styles.itemsBtnText}>{t('procOrderItems')}（{cartCount} 项）</Text>
              <TouchableOpacity onPress={openItemsModal} activeOpacity={0.7}>
                <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.primary }}>{t('procViewDetail')} →</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>{t('procBatchLabel')}</Text>
              <Text style={{ flex: 1, fontSize: FONTS.sub.size, color: c.textMain, fontWeight: FONTS.sub.weight }}>
                {t('procNowBatch').replace('{n}', String(editingBatchId !== null ? editingBatchNumber : stats.batch_count + 1))}
              </Text>
            </View>

            <ExpenseNoteInput
              label={t('procNoteOptional') as string}
              value={orderNote}
              onChangeText={setOrderNote}
              placeholder={`${t('procNoteHintPhone')}\n${t('procNoteHintAddress')}`}
            />
          </ScrollView>
          <View style={[styles.drawerFooter, { paddingBottom: Math.max(insets.bottom - 6, 6) }]}>
            <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const }}>
              <Text style={{ fontSize: FONTS.body.size, fontWeight: FONTS.h2.weight, color: c.primary }}>{t('procTotal')}：￥{cartTotal.toFixed(2)}</Text>
              <SubmitButton
                onPress={submitOrder}
                loading={submitting}
                disabled={cartCount === 0 || editUnchanged}
                label={t('procSubmit')}
                style={[styles.submitBtn, (cartCount === 0 || editUnchanged) && styles.submitBtnDisabled, { marginTop: 0, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22 }]}
                textStyle={[styles.submitBtnText, { fontSize: FONTS.sub.size }]}
              />
            </View>
          </View>
        </ReAnimated.View>
      </ModalOverlay>

      {/* ── Items Modal (stagger reveal) ── */}
      <ModalOverlay
        visible={showItemsModal}
        onClose={() => {
          if (itemsModalIsCart && itemsModalView === 'products') {
            setItemsModalView('items');
          } else {
            setShowItemsModal(false);
          }
        }}
        animation="stagger"
        staggerCount={3}
        overlayStyle={{ justifyContent: 'center', padding: 0, alignItems: 'stretch' } as any}
        contentStyle={{ alignItems: 'stretch' } as any}
      >
        {(anims) => (
          <View style={[styles.itemsModalCard, { width: '90%', maxWidth: 768 * 0.9, maxHeight: Dimensions.get('window').height * 0.6, alignSelf: 'center' } as any]}>
            <Animated.View style={{
              opacity: anims[0],
              transform: [{ translateY: anims[0].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }]
            }}>
              <View style={{ backgroundColor: c.primary, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.surface }}>
                  {itemsModalIsCart && itemsModalView === 'products' ? t('procAddProduct') : t('procOrderItems')}
                </Text>
                <TouchableOpacity style={{ padding: 4 }} onPress={() => {
                  if (itemsModalIsCart && itemsModalView === 'products') {
                    setItemsModalView('items');
                  } else {
                    setShowItemsModal(false);
                  }
                }}>
                  <Svg width="18" height="18" viewBox="0 0 24 24" stroke={c.surface} strokeWidth="2" fill="none">
                    <Line x1="18" y1="6" x2="6" y2="18" />
                    <Line x1="6" y1="6" x2="18" y2="18" />
                  </Svg>
                </TouchableOpacity>
              </View>
            </Animated.View>
            <Animated.View style={{
              opacity: anims[1],
              transform: [{ translateY: anims[1].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            }}>
            {itemsModalIsCart && itemsModalView === 'products' ? (
              <View>
                <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 0 }}>
                  <TextInput
                    value={productPickerSearch}
                    onChangeText={setProductPickerSearch}
                    placeholder={t('procSearchProducts')}
                    placeholderTextColor={dimColor}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, fontSize: FONTS.sub.size,
                      color: c.textMain, backgroundColor: withAlpha(c.textMain, 0.04),
                    } as any}
                  />
                </View>
                <View style={styles.itemsModalBodyWrap}>
                  <ScrollView style={{ paddingHorizontal: 18, maxHeight: Math.max(120, Dimensions.get('window').height * 0.6 - 192) }} showsVerticalScrollIndicator={false}>
                    {products
                      .filter(p => !productPickerSearch || p.name.includes(productPickerSearch) || (p.supplier || '').includes(productPickerSearch))
                      .map((p, idx, arr) => {
                        const qty = cart[p.id] || 0;
                        return (
                          <View key={p.id} style={[styles.itemsRow, idx === arr.length - 1 && styles.itemsRowLast]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemsRowName}>{p.name}</Text>
                            <Text style={{ fontSize: FONTS.micro.size, color: c.textSub, marginTop: 2 }}>
                              {p.spec} · ¥{p.price.toFixed(2)}
                            </Text>
                          </View>
                          <View style={styles.qtyRow}>
                            <TouchableOpacity
                              style={[styles.qtyBtn, styles.qtyBtnMinus]}
                              onPress={() => updateQty(p.id, -1)}
                            >
                              <Text style={styles.qtyBtnMinusText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.qtyNum}>{qty}</Text>
                            <TouchableOpacity
                              style={[styles.qtyBtn, styles.qtyBtnPlus]}
                              onPress={() => updateQty(p.id, 1)}
                            >
                              <Text style={styles.qtyBtnPlusText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  {products.filter(p => !productPickerSearch || p.name.includes(productPickerSearch) || (p.supplier || '').includes(productPickerSearch)).length === 0 && (
                    <View style={{ padding: 24, alignItems: 'center' }}>
                      <Text style={{ color: c.textSub, fontSize: FONTS.micro.size }}>—</Text>
                    </View>
                  )}
                  </ScrollView>
                </View>
              </View>
            ) : (
              <View>
                <View style={styles.itemsModalBodyWrap}>
                  <ScrollView style={{ paddingHorizontal: 18, maxHeight: Math.max(120, Dimensions.get('window').height * 0.6 - 192) }} showsVerticalScrollIndicator={false}>
                    {cartItems.length === 0 ? (
                      <View style={{ padding: 24, alignItems: 'center' }}>
                        <Text style={{ color: c.textSub, fontSize: FONTS.micro.size }}>—</Text>
                      </View>
                    ) : (
                      cartItems.map((i, idx, arr) => {
                        const unitPrice = cartUnitPrices[i.product.id] ?? i.product.price;
                        return (
                        <View key={i.product.id} style={[styles.itemsRow, idx === arr.length - 1 && styles.itemsRowLast]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemsRowName}>{i.product.name}</Text>
                            <Text style={{ fontSize: FONTS.micro.size, color: c.textSub, marginTop: 2 }}>
                              ¥{unitPrice.toFixed(2)}
                            </Text>
                            <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.primary, marginTop: 2 }}>
                              {t('procSubtotal')} ¥{i.subtotal.toFixed(2)}
                            </Text>
                          </View>
                          <View style={styles.qtyRow}>
                            <TouchableOpacity
                              style={[styles.qtyBtn, styles.qtyBtnMinus, editingBatchSettled && { opacity: 0.35 }]}
                              onPress={() => updateQty(i.product.id, -1)}
                              disabled={editingBatchSettled}
                              activeOpacity={editingBatchSettled ? 1 : 0.6}
                            >
                              <Text style={styles.qtyBtnMinusText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.qtyNum}>{i.quantity}</Text>
                            <TouchableOpacity
                              style={[styles.qtyBtn, styles.qtyBtnPlus, editingBatchSettled && { opacity: 0.35 }]}
                              onPress={() => updateQty(i.product.id, 1)}
                              disabled={editingBatchSettled}
                              activeOpacity={editingBatchSettled ? 1 : 0.6}
                            >
                              <Text style={styles.qtyBtnPlusText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                  </ScrollView>
                </View>
                <View style={styles.itemsTotalRow}>
                  <Text style={styles.itemsTotalLabel}>{t('procTotal')}</Text>
                  <Text style={styles.itemsTotal}>¥{cartTotal.toFixed(2)}</Text>
                </View>
              </View>
            )}
            </Animated.View>
            <Animated.View style={[{
              opacity: anims[2],
              transform: [{ translateY: anims[2].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            }]}>
            {!(itemsModalIsCart && itemsModalView === 'products') ? (
              <>
                {!editingBatchSettled && (
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingBottom: 12, paddingTop: 4 }}>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: withAlpha(c.primary, 0.08), alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                    onPress={() => setItemsModalView('products')}
                  >
                    <Text style={{ fontSize: FONTS.body.size, fontWeight: '600', color: c.primary }}>+ {t('procAddProduct')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: c.primary, alignItems: 'center' }}
                    onPress={() => setShowItemsModal(false)}
                  >
                    <Text style={{ fontSize: FONTS.body.size, fontWeight: '600', color: c.surface }}>{t('done') || '完成'}</Text>
                  </TouchableOpacity>
                </View>
                )}
              </>
            ) : (
              <TouchableOpacity
                style={{ marginHorizontal: 16, marginBottom: 12, marginTop: 4, paddingVertical: 12, borderRadius: 8, backgroundColor: c.primary, alignItems: 'center' }}
                onPress={() => setItemsModalView('items')}
              >
                <Text style={{ fontSize: FONTS.body.size, fontWeight: '600', color: c.surface }}>{t('done') || '完成'}</Text>
              </TouchableOpacity>
            )}
            </Animated.View>
          </View>
        )}
      </ModalOverlay>

      {/* ── Success ── */}
      {showSuccess && (
        <Animated.View style={[styles.successOverlay, { opacity: modalOverlayFade }]}>
          <Animated.View style={[styles.successCard, { transform: [{ translateY: modalSlide }] }]}>
            <CheckIcon color={c.primary} />
            <Text style={styles.successTitle}>{successIsEdit ? t('procUpdated') : t('procSubmitted')}</Text>
            <Text style={styles.successSub}>{successIsEdit ? t('procUpdatedMsg') : t('procSubmittedMsg')}</Text>
            <Text style={styles.successAmount}>¥{successTotal.toFixed(2)}</Text>
            <Text style={{ fontSize: FONTS.micro.size, color: c.textSub }}>
              {t('procNowBatch').replace('{n}', String(successBatch))} · {orderDate} · {trPayment(payMethod)}
            </Text>
            <View style={styles.successBtns}>
              <TouchableOpacity style={[styles.successBtnView, !successIsEdit && { flex: 1 }]} onPress={() => { closeSlideModal(() => { setShowSuccess(false); setSuccessIsEdit(false); }); setSubTab('history'); }}>
                <Text style={styles.successBtnViewText}>{t('procViewRecords')}</Text>
              </TouchableOpacity>
              {!successIsEdit && (
                <TouchableOpacity style={styles.successBtnNew} onPress={resetOrder}>
                  <Text style={styles.successBtnNewText}>{t('procContinue')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </Animated.View>
      )}
      {ToastHost}
    </View>

    <ImagePreview
      images={preview?.images ?? []}
      initialIdx={preview?.idx ?? 0}
      visible={preview !== null}
      thumbLayout={preview?.layout}
      getThumbLayout={preview?.getLayout}
      onClose={closePreview}
    />
    </>
  );
}
