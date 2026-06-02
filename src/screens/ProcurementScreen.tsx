import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  FlatList, Image, ActivityIndicator, StyleSheet, Animated, PanResponder
} from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { t, getLang } from '../i18n';
import { api } from '../api/client';
import { useTheme, withAlpha, ThemeColors } from '../theme';
import { FONTS } from '../theme';
import { modalCardAnimation, modalClose, uploadReceiptStyles } from '../sharedStyles';
import Toast from '../components/Toast';

type SubTab = 'new' | 'history' | 'products';
type PayMethod = '现金' | '微信' | '支付宝';

interface Product { id: number; name: string; spec: string; price: number; supplier: string; }
interface CartItem { product: Product; quantity: number; subtotal: number; }
interface BatchRecord { id: number; batch_number: number; date: string; payment_method: string; category: string; total: number; images: string[]; thumb_images?: string[]; note: string; items: any[]; }
interface ProcStats { total_spent: number; total_income: number; batch_count: number; margin_pct: number; }

// ═══════════════════════════════════════════════
// SVG Icons
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
function CameraIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round">
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <Circle cx="12" cy="13" r="4" />
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
// Payment SVG icons — clean, modern design
const PAY_ICONS: Record<string, (color: string) => React.ReactNode> = {
  '现金': (color: string) => (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="1" y="4" width="22" height="16" rx="2" />
      <Path d="M1 10h22" />
      <Circle cx="12" cy="12" r="3" />
    </Svg>
  ),
  '微信': (color: string) => (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.5 8.5 0 018 8v.5z" />
    </Svg>
  ),
  '支付宝': (color: string) => (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
  ),
};
function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
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

const SUPPLIER_DISPLAY: Record<string, string> = { '蓝姐螺蛳粉': '蓝姐', '鲜禾配送': '鲜禾', '桂螺帮': '桂螺' };
const SUPPLIER_ORDER = ['蓝姐螺蛳粉', '蒙方', '鲜禾配送', '桂螺帮', '粉仔'];
const displaySupplier = (s: string) => SUPPLIER_DISPLAY[s] || s;
const sortByOrder = (a: string, b: string) => {
  const ai = SUPPLIER_ORDER.indexOf(a), bi = SUPPLIER_ORDER.indexOf(b);
  if (ai === -1 && bi === -1) return a.localeCompare(b);
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
};

const PAY_KEYS = ['现金', '微信', '支付宝'] as const;
const CHIP_ICON_BG: Record<string, string> = { '微信': '#07C160', '支付宝': '#1677FF', '现金': '#333' };

// ═══════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════
const getStyles = (c: ThemeColors) => StyleSheet.create({
  ...uploadReceiptStyles(c),
  container: { flex: 1, position: 'relative' as const },

  frostedBlock: {
    marginHorizontal: 12, marginTop: 4, borderRadius: 16, overflow: 'hidden' as const,
    borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.08),
    backgroundColor: withAlpha(c.surface, 0.65),
    // @ts-ignore
    backdropFilter: 'saturate(180%) blur(24px)',
    // @ts-ignore
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
  },
  headerSection: { padding: 16, paddingBottom: 8 },
  headerTop: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: 12 },
  headerTitle: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: c.textMain },
  headerBadge: { backgroundColor: withAlpha(c.primary, 0.1), borderRadius: 20, paddingHorizontal: 12, paddingVertical: 3 },
  headerBadgeText: { fontSize: FONTS.microBold.size, color: c.primary, fontWeight: FONTS.microBold.weight },
  statRow: { flexDirection: 'row' as const, gap: 6 },
  statPill: { flex: 1, backgroundColor: withAlpha(c.textMain, 0.04), borderRadius: 10, padding: 10, alignItems: 'center' as const },
  statNum: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.textMain },
  statLbl: { fontSize: FONTS.micro.size, color: c.textSub, marginTop: 3 },

  searchSection: { paddingHorizontal: 16, paddingBottom: 8, borderTopWidth: 0.5, borderTopColor: withAlpha(c.textMain, 0.06) },
  searchInput: { paddingHorizontal: 12, paddingVertical: 9, borderWidth: 0, borderRadius: 10, fontSize: FONTS.sub.size, color: c.textMain, backgroundColor: withAlpha(c.textMain, 0.03), outline: 'none' },
  filterRow: { flexDirection: 'row' as const, gap: 6, marginTop: 8 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: withAlpha(c.textMain, 0.12) },
  filterChipOn: { backgroundColor: c.primary, borderColor: c.primary },
  filterChipText: { fontSize: FONTS.micro.size, color: c.textSub },
  filterChipTextOn: { color: c.surface },

  // Sub-tabs inside frosted block
  subTabRow: { flexDirection: 'row' as const, borderTopWidth: 0.5, borderTopColor: withAlpha(c.textMain, 0.06), marginHorizontal: 4, paddingTop: 2, marginBottom: 6 },
  subTab: { flex: 1, paddingVertical: 10, alignItems: 'center' as const },
  subTabOn: { backgroundColor: withAlpha(c.primary, 0.1), borderRadius: 10 },
  subTabText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: c.textSub },
  subTabTextOn: { color: c.primary, fontWeight: FONTS.subBold.weight },

  sectionHead: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: c.textSub, textTransform: 'uppercase' as const, letterSpacing: 1 },
  productCard: { marginHorizontal: 12, marginBottom: 6, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: withAlpha(c.textMain, 0.06), overflow: 'hidden' as const },
  productCardSel: { borderColor: c.primary, borderWidth: 1.5 },
  prodRow: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 10, gap: 10 },
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
    position: 'absolute' as const, bottom: 68, left: 0, right: 0, zIndex: 100,
    marginHorizontal: 12, backgroundColor: withAlpha(c.surface, 0.95), borderRadius: 14,
    borderWidth: 0.5, borderColor: withAlpha(c.textMain, 0.08),
    // @ts-ignore
    backdropFilter: 'saturate(180%) blur(20px)',
  },
  cartPreview: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, padding: 12 },
  cartIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const, overflow: 'visible' as const },
  cartBadge: { position: 'absolute' as const, top: -4, right: -4, minWidth: 18, height: 18, backgroundColor: c.warning, borderRadius: 9, borderWidth: 2, borderColor: c.surface, alignItems: 'center' as const, justifyContent: 'center' as const, paddingHorizontal: 3 },
  cartBadgeText: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: c.surface },
  cartInfo: { flex: 1 },
  cartInfoText: { fontSize: FONTS.micro.size, color: c.textSub },
  cartInfoCount: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.primary },
  cartTotal: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: c.primary },

  // Drawer overlay
  overlay: { position: 'fixed' as any, inset: 0, backgroundColor: 'rgba(0,0,0,0)', zIndex: 200 },
  // Animated drawer — slides up
  drawer: {
    position: 'fixed' as any, bottom: 0, left: 0, right: 0,
    backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '88%' as any, zIndex: 201, display: 'flex' as any, flexDirection: 'column' as any,
    // @ts-ignore
    boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
  },
  drawerHandle: { width: 36, height: 4, backgroundColor: withAlpha(c.textMain, 0.15), borderRadius: 2, alignSelf: 'center' as const, marginTop: 10 },
  drawerHead: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, padding: 12, borderBottomWidth: 1, borderBottomColor: withAlpha(c.textMain, 0.08) },
  drawerHeadTitle: { fontSize: FONTS.body.size, fontWeight: FONTS.h2.weight, color: c.textMain },
  drawerClose: { width: 30, height: 30, borderRadius: 15, backgroundColor: withAlpha(c.textMain, 0.06), alignItems: 'center' as const, justifyContent: 'center' as const },
  drawerCloseText: { fontSize: FONTS.h2.size, color: c.textSub },
  drawerBody: { padding: 16, overflow: 'scroll' as any, flex: 1 } as any,
  drawerFooter: { backgroundColor: c.surface, borderTopWidth: 0.5, borderTopColor: withAlpha(c.textMain, 0.08), paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 60 },

  // Date row (all 4 elements inline)
  dateCatRow: { marginBottom: 12 },
  dateCatLine: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: withAlpha(c.textMain, 0.06), gap: 8 },
  dateCatLabel: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: c.textMain },
  dateCatValue: { fontSize: FONTS.sub.size, color: c.textSub, flexDirection: 'row' as const, alignItems: 'center' as const },

  // Payment capsules (matching ExpenseScreen)
  sectionLabel: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: c.textMain, marginBottom: 6 },
  payRow: { flexDirection: 'row' as const, gap: 6, marginBottom: 12 },
  payChip: {
    flex: 1, flexDirection: 'row' as const, paddingVertical: 8, borderRadius: 22,
    backgroundColor: c.bg,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  payChipOn: { backgroundColor: c.primary },
  payChipOnWechat: { backgroundColor: '#07C160' },
  payChipOnAlipay: { backgroundColor: '#1677FF' },
  payChipText: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.textSub },
  payChipTextOn: { color: c.surface },

  chipIconCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.04)', alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 4 },
  chipIconCircleActive: { backgroundColor: 'rgba(255,255,255,0.2)' },

  // Upload (expense page style)
  // Image upload — now in sharedStyles

  // Items row
  itemsBtnText: { fontSize: FONTS.sub.size, color: c.textMain, fontWeight: FONTS.sub.weight },

  // Items modal
  itemsModalOverlay: { position: 'fixed' as any, inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 500, alignItems: 'center' as const, justifyContent: 'center' as const },
  itemsModalCard: { backgroundColor: c.surface, borderRadius: 16, width: 'calc(100% - 40px)' as any, maxWidth: 360, maxHeight: '75%' as any, overflow: 'hidden' as const, display: 'flex' as any, flexDirection: 'column' as any },
  itemsModalHeader: { backgroundColor: c.primary, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  itemsModalTitle: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.surface },
  itemsModalClose: { fontSize: FONTS.h2.size, color: withAlpha(c.surface, 0.7), fontWeight: '300' as const },
  itemsModalBody: { padding: 16 },
  itemsRow: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 10 },
  itemsRowName: { flex: 1, fontSize: FONTS.sub.size, color: c.textMain },
  itemsRowQty: { fontSize: FONTS.micro.size, color: c.textSub, marginRight: 12 },
  itemsRowAmt: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.primary },
  itemsTotalRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingTop: 14, marginTop: 8, borderTopWidth: 1, borderTopColor: withAlpha(c.textMain, 0.12) },
  itemsTotalLabel: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.textMain },
  itemsTotal: { fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, color: c.primary },

  // Submit
  submitBtn: { backgroundColor: c.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' as const, marginTop: 16 },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: c.surface, fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight },

  // Product mgmt
  mgmtRow: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 12, marginHorizontal: 12, marginBottom: 6, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: withAlpha(c.textMain, 0.06) },
  mgmtInfo: { flex: 1 },
  mgmtName: { fontSize: FONTS.sub.size, fontWeight: FONTS.sub.weight, color: c.textMain },
  mgmtMeta: { fontSize: FONTS.micro.size, color: c.textSub, marginTop: 2 },
  mgmtActions: { flexDirection: 'row' as const, gap: 8 },
  mgmtActionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: withAlpha(c.textMain, 0.05) },
  mgmtAddBtn: { marginHorizontal: 12, marginTop: 8, marginBottom: 16, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: withAlpha(c.primary, 0.2), paddingVertical: 12, alignItems: 'center' as const },
  mgmtAddBtnText: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.primary },

  // Modal (product add/edit)
  modalOverlay: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 400, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center' as const, alignItems: 'center' as const },
  modalCard: { backgroundColor: c.surface, borderRadius: 16, width: 340, maxWidth: '90%' as any, overflow: 'hidden' as const,
    // @ts-ignore
    ...modalCardAnimation, },
  modalHeader: { backgroundColor: c.primary, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  modalTitle: { fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.surface },
  modalClose: { ...modalClose, },
  modalBody: { padding: 24 },
  modalInput: { paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, borderColor: withAlpha(c.textMain, 0.12), borderRadius: 8, fontSize: FONTS.sub.size, color: c.textMain, backgroundColor: withAlpha(c.textMain, 0.03), marginBottom: 10, outline: 'none' },
  modalBtnRow: { flexDirection: 'row' as const, gap: 8, marginTop: 10, width: '100%' as any },
  modalBtnCancel: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: withAlpha(c.textMain, 0.06), alignItems: 'center' as const },
  modalBtnCancelText: { fontSize: FONTS.sub.size, color: c.textSub, fontWeight: FONTS.sub.weight },
  modalBtnConfirm: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center' as const },
  modalBtnConfirmText: { fontSize: FONTS.subBold.size, color: c.surface, fontWeight: FONTS.subBold.weight },
  modalDeleteBox: { backgroundColor: withAlpha(c.primary, 0.1), borderRadius: 12, padding: 12, alignItems: 'center' as const },
  modalDeleteText: { fontSize: FONTS.micro.size, color: c.textSub, textAlign: 'center' as const },

  // History
  historyList: { padding: 12, paddingBottom: 100 },
  historyCard: { backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: withAlpha(c.textMain, 0.06), marginBottom: 10, overflow: 'hidden' as const },
  histHead: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 10, borderBottomWidth: 1, borderBottomColor: withAlpha(c.textMain, 0.05) },
  histNo: { fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: c.primary },
  histDate: { fontSize: FONTS.micro.size, color: c.textSub },
  histBody: { padding: 10 },
  histRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 4 },
  histRowLabel: { fontSize: FONTS.micro.size, color: c.textSub },
  histRowVal: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: c.textMain },
  histPayBadge: { alignSelf: 'flex-start' as const, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: withAlpha(c.primary, 0.08), borderRadius: 12, marginTop: 4 },
  histPayText: { fontSize: FONTS.micro.size, fontWeight: FONTS.micro.weight, color: c.primary },
  histAmount: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: c.primary, marginTop: 8 },
  histImages: { flexDirection: 'row' as const, gap: 4, marginTop: 6 },

  // Success
  successOverlay: { position: 'fixed' as any, inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 400, alignItems: 'center' as const, justifyContent: 'center' as const },
  successCard: { backgroundColor: c.surface, borderRadius: 20, padding: 28, width: 'calc(100% - 40px)' as any, maxWidth: 320, alignItems: 'center' as const },
  successTitle: { fontSize: FONTS.h2.size, fontWeight: FONTS.h2.weight, color: c.textMain, marginBottom: 6, marginTop: 8 },
  successSub: { fontSize: FONTS.sub.size, color: c.textSub, lineHeight: 20 } as any,
  successAmount: { fontSize: FONTS.amount.size, fontWeight: FONTS.amount.weight, color: c.primary, marginVertical: 12 },
  successBtns: { flexDirection: 'row' as const, gap: 8, marginTop: 16, width: '100%' as any },
  successBtnNew: { flex: 1, paddingVertical: 12, backgroundColor: c.primary, borderRadius: 12, alignItems: 'center' as const },
  successBtnNewText: { color: c.surface, fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight },
  successBtnView: { flex: 1, paddingVertical: 12, backgroundColor: c.secondary, borderRadius: 12, alignItems: 'center' as const },
  successBtnViewText: { color: c.textMain, fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight },

  // Empty state
  emptyWrap: { alignItems: 'center' as const, paddingVertical: 60 },
  emptyTitle: { fontSize: FONTS.body.size, fontWeight: FONTS.body.weight, color: c.textSub, marginBottom: 6 },
  emptyHint: { fontSize: FONTS.sub.size, color: c.textSub, textAlign: 'center' as const, paddingHorizontal: 40, lineHeight: 20 },
  loadingWrap: { paddingVertical: 20, alignItems: 'center' as const },
  contentArea: { flex: 1, paddingBottom: 100 },
});

// ═══════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════
export default function ProcurementScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);

  const [subTab, setSubTab] = useState<SubTab>(() => {
    try {
      const saved = localStorage.getItem('snail_proc_tab');
      return (saved === 'new' || saved === 'history' || saved === 'products') ? saved : 'new';
    } catch { return 'new'; }
  });
  // Persist selected tab across page navigations
  useEffect(() => {
    try { localStorage.setItem('snail_proc_tab', subTab); } catch {}
  }, [subTab]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem('snail_proc_cart');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('全部');
  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [editPriceVal, setEditPriceVal] = useState('');

  const [showDrawer, setShowDrawer] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState<PayMethod>('微信');
  const [orderNote, setOrderNote] = useState('');
  const [receipts, setReceipts] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showImgTip, setShowImgTip] = useState(false);
  const fileRef = useRef<any>(null);

  const [showItemsModal, setShowItemsModal] = useState(false);
  const [detailItems, setDetailItems] = useState<Array<{ name: string; quantity: number; subtotal: number }>>([]);
  const [detailTotal, setDetailTotal] = useState(0);

  const [successTotal, setSuccessTotal] = useState(0);
  const [successBatch, setSuccessBatch] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [stats, setStats] = useState<ProcStats>({ total_spent: 0, total_income: 0, batch_count: 0, margin_pct: 0 });
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [histPage, setHistPage] = useState(1);
  const [histTotal, setHistTotal] = useState(0);
  const [loadingHist, setLoadingHist] = useState(false);

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({ name: '', spec: '', price: '', supplier: '' });
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // ── Shared slide-from-top animation for product/delete/success modals ──
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

  // ── Items modal animation (slide from top) ──
  const itemsModalAnim = useRef(new Animated.Value(0)).current;
  const itemsModalOverlayAnim = useRef(new Animated.Value(0)).current;
  const openItemsModal = () => {
    setDetailItems(cartItems.map(i => ({ name: i.product.name, quantity: i.quantity, subtotal: i.subtotal })));
    setDetailTotal(cartTotal);
    setShowItemsModal(true);
    itemsModalAnim.setValue(-300);
    itemsModalOverlayAnim.setValue(0);
    Animated.parallel([
      Animated.spring(itemsModalAnim, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
      Animated.timing(itemsModalOverlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };
  const closeItemsModal = () => {
    Animated.parallel([
      Animated.timing(itemsModalAnim, { toValue: -300, duration: 180, useNativeDriver: true }),
      Animated.timing(itemsModalOverlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setShowItemsModal(false));
  };
  const openHistoryDetail = (batch: BatchRecord) => {
    setDetailItems(batch.items.map((item: any) => ({
      name: item.name || item.product_name || `商品#${item.product_id}`,
      quantity: item.quantity,
      subtotal: item.subtotal || item.unit_price * item.quantity || 0,
    })));
    setDetailTotal(batch.total);
    setShowItemsModal(true);
    itemsModalAnim.setValue(-300);
    itemsModalOverlayAnim.setValue(0);
    Animated.parallel([
      Animated.spring(itemsModalAnim, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
      Animated.timing(itemsModalOverlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  // ── Drawer animation ──
  const openDrawer = () => {
    setShowDrawer(true);
    if (!orderNote) setOrderNote(t('procNowBatch').replace('{n}', String(stats.batch_count + 1)));
    Animated.parallel([
      Animated.spring(drawerAnim, { toValue: 1, useNativeDriver: true, bounciness: 4, speed: 14 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };
  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowDrawer(false));
  };

  const drawerTranslateY = drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });
  const overlayOpacity = overlayAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });

  // ── Swipe down to close drawer ──
  const dragY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_: any, gs: any) => gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),
    onPanResponderMove: (_: any, gs: any) => { if (gs.dy > 0) dragY.setValue(gs.dy); },
    onPanResponderRelease: (_: any, gs: any) => {
      if (gs.dy > 120 || gs.vy > 0.6) {
        closeDrawer();
        dragY.setValue(0);
      } else {
        Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      }
    },
  })).current;

  // ── Date formatting ──
  const formatDateLocale = useCallback((d: string) => {
    const l = getLang();
    const [y, m, day] = d.split('-');
    if (l.startsWith('en')) {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${months[+m - 1]} ${+day}, ${y}`;
    }
    return `${y}年${+m}月${+day}日`;
  }, []);

  const todayStr = () => new Date().toISOString().slice(0, 10);

  // ── Image compression — no-op on RN (use expo-image-manipulator instead) ──
  const compressImage = (file: any): Promise<any> => Promise.resolve(file);

  // ── Suppliers ──
  const suppliers = useMemo(() => {
    const set = new Set(products.map(p => p.supplier).filter(Boolean));
    const sorted = Array.from(set).sort(sortByOrder);
    return ['全部', ...sorted];
  }, [products]);

  const loadProducts = useCallback(() => {
    api.getProducts().then((data: any) => { if (Array.isArray(data)) setProducts(data); }).catch(() => {});
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

  // Sync uncontrolled date input when orderDate changes externally
  useEffect(() => { if (orderDateInputRef.current) orderDateInputRef.current.value = orderDate; }, [orderDate]);

  // Persist cart to localStorage
  useEffect(() => {
    try { localStorage.setItem('snail_proc_cart', JSON.stringify(cart)); } catch {}
  }, [cart]);

  useEffect(() => {
    if (subTab !== 'history') return;
    setLoadingHist(true);
    api.getProcurementBatches(1).then((data: any) => {
      setBatches(data.records || []); setHistTotal(data.total || 0); setHistPage(1);
    }).catch(() => {}).finally(() => setLoadingHist(false));
  }, [subTab]);

  const loadMoreHistory = () => {
    if (loadingHist) return;
    const next = histPage + 1;
    setLoadingHist(true);
    api.getProcurementBatches(next).then((data: any) => {
      setBatches(prev => [...prev, ...(data.records || [])]); setHistPage(next);
    }).catch(() => {}).finally(() => setLoadingHist(false));
  };

  const filteredProducts = useMemo(() => {
    let list = products;
    if (supplierFilter !== '全部') list = list.filter(p => p.supplier === supplierFilter);
    if (search) list = list.filter(p => p.name.includes(search));
    return list;
  }, [products, supplierFilter, search]);

  const groupedProducts = useMemo(() => {
    const map: Record<string, Product[]> = {};
    filteredProducts.forEach(p => {
      const sup = p.supplier || '';
      if (!map[sup]) map[sup] = [];
      map[sup].push(p);
    });
    // Sort section heads by SUPPLIER_ORDER, unknown suppliers at end
    const sortedMap: [string, Product[]][] = Object.entries(map).sort(([a], [b]) => sortByOrder(a, b));
    return sortedMap;
  }, [filteredProducts]);

  // section head display name
  const supplierLabel = (sup: string) => displaySupplier(sup) || t('procAll');

  const cartItems: CartItem[] = useMemo(() => {
    return Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([pid, qty]) => {
        const product = products.find(p => p.id === Number(pid));
        if (!product) return null;
        return { product, quantity: qty, subtotal: product.price * qty };
      }).filter(Boolean) as CartItem[];
  }, [cart, products]);

  const cartTotal = useMemo(() => cartItems.reduce((s, i) => s + i.subtotal, 0), [cartItems]);
  const cartCount = cartItems.length;

  const updateQty = (pid: number, delta: number) => {
    setCart(prev => ({ ...prev, [pid]: Math.max(0, (prev[pid] || 0) + delta) }));
  };

  const clearCart = () => {
    setCart({});
    try { localStorage.removeItem('snail_proc_cart'); } catch {}
  };

  const startEditPrice = (pid: number) => {
    const p = products.find(x => x.id === pid);
    if (p) { setEditingPrice(pid); setEditPriceVal(String(p.price)); }
  };

  const commitPrice = (pid: number) => {
    const val = parseFloat(editPriceVal);
    if (!isNaN(val) && val > 0) {
      api.updateProduct({ id: pid, name: products.find(p => p.id === pid)?.name, price: val }).then((r: any) => {
        if (r.status === 'ok') setProducts(prev => prev.map(p => p.id === pid ? { ...p, price: val } : p));
      }).catch(() => {});
    }
    setEditingPrice(null);
  };

  // ── File upload (matching ExpenseScreen pattern) ──
  const handleFileSelect = async (e: any) => {
    const files: any[] = e?.files || e?.target?.files || e?.nativeEvent?.target?.files || [];
    if (!files || files.length === 0) return;
    const newFiles: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) continue;
      if (f.size > 10 * 1024 * 1024) continue;
      if (receipts.some((r: any) => r.name === f.name && r.size === f.size)) continue;
      const compressed = await compressImage(f);
      newFiles.push(compressed);
    }
    setReceipts((prev: any[]) => [...prev, ...newFiles]);
    if (fileRef.current?.value !== undefined) fileRef.current.value = '';
  };

  const urlCache = useRef<Map<any, string>>(new Map());
  const orderDateInputRef = useRef<any>(null);
  const getPreviewUrl = (file: any) => {
    // RN: expo-image-picker returns { uri, type, name, size }
    return file?.uri || '';
  };
  const revokePreviewUrl = (file: any) => {
    const url = urlCache.current.get(file);
    if (url) { URL.revokeObjectURL(url); urlCache.current.delete(file); }
  };
  // Cleanup all object URLs on unmount
  useEffect(() => {
    return () => {
      urlCache.current.clear();
    };
  }, []);

  const removeReceipt = (i: number) => {
    setReceipts(prev => {
      const removed = prev[i];
      if (removed) revokePreviewUrl(removed);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const submitOrder = async () => {
    if (cartItems.length === 0) return;
    setSubmitting(true);
    try {
      // Upload images first (matching ExpenseScreen pattern)
      let imageUrls: string[] = [];
      let thumbUrls: string[] = [];
      if (receipts.length > 0) {
        setUploading(true);
        const result = await api.uploadExpenseImages(receipts);
        setUploading(false);
        if (result.status !== 'ok') {
          setSubmitting(false);
          setToastMsg(t('toastSubmitFailed'));
          setShowToast(true);
          return;
        }
        imageUrls = result.images || [];
        // Prefer server-generated thumb URLs; fall back to full-size images if PIL is disabled
        thumbUrls = (result.thumb_images && result.thumb_images.length > 0)
          ? result.thumb_images
          : imageUrls;
      }
      const r = await api.createProcurementBatch({
        date: orderDate, payment_method: payMethod, category: t('procPurchase'),
        items: cartItems.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
        images: imageUrls, thumb_images: thumbUrls, note: orderNote,
      });
      if (r.status === 'ok') {
        setSuccessTotal(r.total); setSuccessBatch(r.batch_number);
        Animated.parallel([
          Animated.timing(drawerAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => {
          setCart({}); try { localStorage.removeItem('snail_proc_cart'); } catch {} setReceipts([]); setOrderNote('');
          setShowDrawer(false);
          openSlideModal(() => setShowSuccess(true));
        });
        loadStats();
      } else {
        setToastMsg(t('toastSubmitFailed'));
        setShowToast(true);
      }
    } catch (err) {
      console.error('[procurement] submit error:', err);
      setToastMsg(t('toastSubmitFailed'));
      setShowToast(true);
    }
    setSubmitting(false); setUploading(false);
  };

  const resetOrder = () => {
    closeSlideModal(() => { setShowSuccess(false); setOrderDate(todayStr()); setPayMethod('微信'); setOrderNote(''); setReceipts([]); });
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setProdForm({ name: '', spec: '', price: '', supplier: '' });
    openSlideModal(() => setShowProductModal(true));
  };
  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdForm({ name: p.name, spec: p.spec, price: String(p.price), supplier: p.supplier });
    openSlideModal(() => setShowProductModal(true));
  };
  const saveProduct = async () => {
    if (!prodForm.name) return;
    const data = { name: prodForm.name, spec: prodForm.spec, price: parseFloat(prodForm.price) || 0, supplier: prodForm.supplier };
    try {
      editingProduct ? await api.updateProduct({ ...data, id: editingProduct.id }) : await api.createProduct(data);
      closeSlideModal(() => setShowProductModal(false));
      loadProducts();
    } catch {
      setToastMsg(t('toastSubmitFailed'));
      setShowToast(true);
    }
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteProduct(deleteTarget.id);
      // Clean orphan cart entries for deleted product
      setCart(prev => { const cp = { ...prev }; delete cp[deleteTarget.id]; return cp; });
      loadProducts();
    } catch {
      setToastMsg(t('toastSubmitFailed'));
      setShowToast(true);
    }
    closeSlideModal(() => setDeleteTarget(null));
  };

  return (
    <View style={styles.container}>
      {/* ── Frosted Glass Block (everything merged) ── */}
      <View style={styles.frostedBlock}>
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.headerTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BoxIcon color={c.primary} />
              <Text style={styles.headerTitle}>{t('procTitle')}</Text>
            </View>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{t('procNowBatch').replace('{n}', String(stats.batch_count + 1))}</Text>
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
              <Text style={styles.statNum}>{stats.margin_pct}%</Text>
              <Text style={styles.statLbl}>{t('procMargin')}</Text>
            </View>
          </View>
        </View>

        {/* Search + filters */}
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('procSearchPlaceholder')}
            placeholderTextColor={c.textSub}
            value={search} onChangeText={setSearch}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 6 }}>
            {suppliers.map(sup => (
              <TouchableOpacity key={sup} style={[styles.filterChip, supplierFilter === sup && styles.filterChipOn]} onPress={() => setSupplierFilter(sup)}>
                <Text style={[styles.filterChipText, supplierFilter === sup && styles.filterChipTextOn]}>{sup === '全部' ? t('procAll') : displaySupplier(sup)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Sub-tabs inside frosted block */}
        <View style={styles.subTabRow}>
          <TouchableOpacity style={[styles.subTab, subTab === 'new' && styles.subTabOn]} onPress={() => setSubTab('new')}>
            <Text style={[styles.subTabText, subTab === 'new' && styles.subTabTextOn]}>{t('procNewOrder')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.subTab, subTab === 'history' && styles.subTabOn]} onPress={() => setSubTab('history')}>
            <Text style={[styles.subTabText, subTab === 'history' && styles.subTabTextOn]}>{t('procHistory')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.subTab, subTab === 'products' && styles.subTabOn]} onPress={() => setSubTab('products')}>
            <Text style={[styles.subTabText, subTab === 'products' && styles.subTabTextOn]}>{t('procProductMgmt')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── New Order ── */}
      {subTab === 'new' && (
        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 150 }}>
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
                              style={{ width: 70, fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.primary, borderWidth: 1, borderColor: c.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, outline: 'none', backgroundColor: c.surface } as any}
                              value={editPriceVal} onChangeText={setEditPriceVal}
                              onBlur={() => commitPrice(p.id)} autoFocus keyboardType="numeric"
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
          </ScrollView>

          {cartCount > 0 && (
            <View style={styles.cartBar}>
              <TouchableOpacity style={styles.cartPreview} onPress={openDrawer} activeOpacity={0.8}>
                <View style={[styles.cartIconWrap, { backgroundColor: c.primary }]}>
                  <CartIcon color={c.surface} />
                  <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>
                </View>
                <View style={styles.cartInfo}>
                  <Text style={styles.cartInfoText}>{t('procSelected')} <Text style={styles.cartInfoCount}>{cartCount}</Text> {t('procUnit')}</Text>
                </View>
                <Text style={styles.cartTotal}>¥{cartTotal.toFixed(2)}</Text>
                <TouchableOpacity onPress={clearCart} activeOpacity={0.6}
                  style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: withAlpha(c.textMain, 0.08) }}>
                  <Text style={{ fontSize: FONTS.micro.size, color: c.textSub, fontWeight: FONTS.micro.weight }}>{t('clear')}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── History ── */}
      {subTab === 'history' && (
        <FlatList
          data={batches}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.historyList}
          onEndReached={batches.length < histTotal ? loadMoreHistory : undefined}
          onEndReachedThreshold={0.4}
          renderItem={({ item: batch }) => (
            <TouchableOpacity style={styles.historyCard} onPress={() => openHistoryDetail(batch)} activeOpacity={0.7}>
              <View style={styles.histHead}>
                <Text style={styles.histNo}>{t('procNowBatch').replace('{n}', String(batch.batch_number))}</Text>
                <Text style={styles.histDate}>{batch.date}</Text>
              </View>
              <View style={styles.histBody}>
                <View style={styles.histRow}>
                  <Text style={styles.histRowLabel}>{t('procOrderItems')}</Text>
                  <Text style={styles.histRowVal}>{batch.items?.length || 0} 种</Text>
                </View>
                <View style={styles.histRow}>
                  <Text style={styles.histRowLabel}>{t('procPaymentMethod')}</Text>
                  <Text style={styles.histRowVal}>{batch.payment_method}</Text>
                </View>
                {batch.note ? (
                  <View style={styles.histRow}>
                    <Text style={styles.histRowLabel}>{t('procNoteOptional')}</Text>
                    <Text style={styles.histRowVal}>{batch.note}</Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ fontSize: FONTS.micro.size, color: c.textSub }}>{t('procThisBatch')}</Text>
                  <Text style={styles.histAmount}>¥{batch.total.toFixed(2)}</Text>
                </View>
                {(() => {
                  // Prefer 128×128 thumb URLs (fast), fall back to full-size for old data
                  const thumbImgs: string[] = (batch.thumb_images?.length ? batch.thumb_images : batch.images) || [];
                  return thumbImgs.length > 0 && (
                    <View style={styles.histImages}>
                      {thumbImgs.map((img: string, i: number) => (
                        <Image key={i} source={{ uri: img }}
                          style={{ width: 60, height: 60, borderRadius: 6, borderWidth: 1, borderColor: withAlpha(c.textMain, 0.08) }} />
                      ))}
                    </View>
                  );
                })()}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>{t('noRecords')}</Text>
              <Text style={styles.emptyHint}>{t('procNoHistory')}</Text>
            </View>
          }
          ListFooterComponent={loadingHist ? <View style={styles.loadingWrap}><ActivityIndicator color={c.primary} /></View> : null}
        />
      )}

      {/* ── Product Mgmt ── */}
      {subTab === 'products' && (
        <ScrollView style={styles.contentArea}>
          <TouchableOpacity style={styles.mgmtAddBtn} onPress={openAddProduct}>
            <Text style={styles.mgmtAddBtnText}>+ {t('procAddProduct')}</Text>
          </TouchableOpacity>
          {products.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>{t('noRecords')}</Text>
              <Text style={styles.emptyHint}>{t('noProducts')}</Text>
            </View>
          ) : (
            products.map(p => (
              <View key={p.id} style={styles.mgmtRow}>
                <View style={styles.mgmtInfo}>
                  <Text style={styles.mgmtName}>{p.name}</Text>
                  <Text style={styles.mgmtMeta}>{p.supplier} · {p.spec} · ¥{p.price.toFixed(2)}</Text>
                </View>
                <View style={styles.mgmtActions}>
                  <TouchableOpacity style={styles.mgmtActionBtn} onPress={() => openEditProduct(p)}>
                    <PencilIcon color={c.textSub} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.mgmtActionBtn} onPress={() => openSlideModal(() => setDeleteTarget(p))}>
                    <TrashIcon color={c.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Product Modal ── */}
      {showProductModal && (
        <Animated.View style={[styles.modalOverlay, { opacity: modalOverlayFade }]}>
          <Animated.View style={[styles.modalCard, { transform: [{ translateY: modalSlide }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProduct ? t('procEditProduct') : t('procAddProduct')}</Text>
              <TouchableOpacity onPress={() => closeSlideModal(() => setShowProductModal(false))}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput style={styles.modalInput} placeholder={t('procProductName')} placeholderTextColor={c.textSub} value={prodForm.name} onChangeText={v => setProdForm(p => ({ ...p, name: v }))} />
              <TextInput style={styles.modalInput} placeholder={t('procProductSpec')} placeholderTextColor={c.textSub} value={prodForm.spec} onChangeText={v => setProdForm(p => ({ ...p, spec: v }))} />
              <TextInput style={styles.modalInput} placeholder={t('procProductSupplier')} placeholderTextColor={c.textSub} value={prodForm.supplier} onChangeText={v => setProdForm(p => ({ ...p, supplier: v }))} />
              <TextInput style={styles.modalInput} placeholder={t('procProductPrice')} placeholderTextColor={c.textSub} value={prodForm.price} onChangeText={v => setProdForm(p => ({ ...p, price: v }))} keyboardType="numeric" />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => closeSlideModal(() => setShowProductModal(false))}>
                  <Text style={styles.modalBtnCancelText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnConfirm} onPress={saveProduct}>
                  <Text style={styles.modalBtnConfirmText}>{t('procSubmit')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <Animated.View style={[styles.modalOverlay, { opacity: modalOverlayFade }]}>
          <Animated.View style={[styles.modalCard, { transform: [{ translateY: modalSlide }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('procDeleteProduct') || '删除商品'}</Text>
              <TouchableOpacity onPress={() => closeSlideModal(() => setDeleteTarget(null))}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.modalBody, { gap: 16 }]}>
              <View style={styles.modalDeleteBox}>
                <Text style={styles.modalDeleteText}>
                  {t('procDeleteProductConfirm').replace('{name}', deleteTarget.name)}{' '}{t('procDeleteProductWarning')}
                </Text>
              </View>
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => closeSlideModal(() => setDeleteTarget(null))}>
                  <Text style={styles.modalBtnCancelText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtnConfirm, { backgroundColor: c.primary }]} onPress={confirmDelete}>
                  <Text style={styles.modalBtnConfirmText}>{t('delete') || '删除'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* ── Order Drawer (slides up) ── */}
      {showDrawer && (
        <>
          <Animated.View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: overlayOpacity }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>
          <Animated.View style={[styles.drawer, { transform: [{ translateY: Animated.add(drawerTranslateY, dragY) }] }]}>
            <View style={styles.drawerHandle} {...panResponder.panHandlers} />
            <View style={styles.drawerHead} {...panResponder.panHandlers}>
              <Text style={styles.drawerHeadTitle}>{t('procConfirmOrder')}</Text>
              <TouchableOpacity style={styles.drawerClose} onPress={closeDrawer}>
                <Text style={styles.drawerCloseText}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.drawerBody}>
              {/* Date + Category — single line */}
              <View style={styles.dateCatRow}>
                <View style={styles.dateCatLine}>
                  <Text style={styles.dateCatLabel}>{t('procOrderDate')}</Text>
                  <View style={styles.dateCatValue}>
                    <Text style={{ fontSize: FONTS.sub.size, color: c.textSub }}>{formatDateLocale(orderDate)}</Text>
                    {/* TODO: open DatePickerModal on tap */}
                  </View>
                  <Text style={styles.dateCatLabel}>{t('expenseCategory')}</Text>
                  <Text style={{ fontSize: FONTS.sub.size, color: c.textSub }}>{t('procPurchase')}</Text>
                </View>
              </View>

              {/* Payment method capsules */}
              <Text style={styles.sectionLabel}>{t('procPaymentMethod')}</Text>
              <View style={styles.payRow}>
                {PAY_KEYS.map(pm => {
                  const active = payMethod === pm;
                  const isWechat = pm === '微信';
                  const isAlipay = pm === '支付宝';
                  return (
                    <TouchableOpacity key={pm}
                      style={[styles.payChip, active && (isWechat ? styles.payChipOnWechat : isAlipay ? styles.payChipOnAlipay : styles.payChipOn)]}
                      onPress={() => setPayMethod(pm)} activeOpacity={0.7}>
                      <View style={[styles.chipIconCircle, active && { backgroundColor: CHIP_ICON_BG[pm] }]}>
                        {PAY_ICONS[pm](active ? c.surface : c.textSub)}
                      </View>
                      <Text style={[styles.payChipText, active && styles.payChipTextOn]}>{pm}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Upload receipts (expense page style) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>{t('uploadImage')}</Text>
                <TouchableOpacity onPress={() => setShowImgTip(!showImgTip)} activeOpacity={0.7} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c.secondary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: FONTS.microBold.size, fontWeight: FONTS.microBold.weight, color: c.textSub }}>!</Text>
                </TouchableOpacity>
                {showImgTip && (
                  <View style={styles.imgTipBubble}>
                    <Text style={styles.imgTipText}>支持 jpg/png/webp，单张最大 10MB</Text>
                  </View>
                )}
              </View>
              <View style={styles.imgRow}>
                {/* TODO: expo-image-picker.launchImageLibraryAsync */}
                <View style={{ display: 'none' }} ref={fileRef as any} />
                <TouchableOpacity style={styles.imgAddBtn} onPress={() => {/* TODO: open image picker */}} activeOpacity={0.7}>
                  <CameraIcon color={c.textSub} />
                  <Text style={styles.imgAddText}>{t('addImage')}</Text>
                </TouchableOpacity>
                {receipts.map((file: any, i: number) => (
                  <View key={`rec-${i}`} style={styles.imgPreview}>
                    <Image source={{ uri: getPreviewUrl(file) }} style={{ width: 92, height: 92, borderRadius: 12 }} />
                    <TouchableOpacity style={styles.imgRemove} onPress={() => removeReceipt(i)} activeOpacity={0.7}>
                      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round">
                        <Path d="M18 6L6 18M6 6l12 12" />
                      </Svg>
                    </TouchableOpacity>
                  </View>
                ))}
                {uploading && <ActivityIndicator color={c.primary} style={{ marginLeft: 8 }} />}
              </View>

              {/* Items row — matching 近7天 pattern: label left, theme button right */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 }}>
                <Text style={styles.itemsBtnText}>{t('procOrderItems')}（{cartCount} 项）</Text>
                <TouchableOpacity onPress={openItemsModal} activeOpacity={0.7}>
                  <Text style={{ fontSize: FONTS.subBold.size, fontWeight: FONTS.subBold.weight, color: c.primary }}>{t('procViewDetail')} →</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>{t('procNoteOptional')}</Text>
                <TextInput style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 8, fontSize: FONTS.sub.size, color: c.textMain, backgroundColor: withAlpha(c.textMain, 0.03), outline: 'none' } as any}
                  value={orderNote} onChangeText={setOrderNote} placeholder={t('procNowBatch').replace('{n}', String(stats.batch_count + 1))} placeholderTextColor={c.textSub} />
              </View>

              {/* Total + Submit moved to drawer footer */}
            </ScrollView>
            {/* Footer: Total + Submit — fixed at drawer bottom, above nav bar */}
            <View style={styles.drawerFooter}>
              <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const }}>
                <Text style={{ fontSize: FONTS.body.size, fontWeight: FONTS.h2.weight, color: c.primary }}>{t('procTotal')}：¥{cartTotal.toFixed(2)}</Text>
                <TouchableOpacity style={[styles.submitBtn, cartCount === 0 && styles.submitBtnDisabled, { marginTop: 0, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22 }]} onPress={submitOrder} disabled={cartCount === 0 || submitting}>
                  {submitting ? <ActivityIndicator color={c.surface} /> : <Text style={[styles.submitBtnText, { fontSize: FONTS.sub.size }]}>{t('procSubmit')}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </>
      )}

      {/* ── Items Modal (slides from top) ── */}
      {showItemsModal && (
        <Animated.View style={[styles.itemsModalOverlay, { opacity: itemsModalOverlayAnim }]}>
          <Animated.View style={[styles.itemsModalCard, { transform: [{ translateY: itemsModalAnim }] }]}>
            <View style={styles.itemsModalHeader}>
              <Text style={styles.itemsModalTitle}>{t('procOrderItems')}</Text>
              <TouchableOpacity onPress={closeItemsModal}>
                <Text style={styles.itemsModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={[styles.itemsModalBody, { flex: 1 }]}>
              {detailItems.map((item, idx) => (
                <View key={idx} style={styles.itemsRow}>
                  <Text style={styles.itemsRowName}>{item.name}</Text>
                  <Text style={styles.itemsRowQty}>×{item.quantity}</Text>
                  <Text style={styles.itemsRowAmt}>¥{item.subtotal.toFixed(2)}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={[styles.itemsTotalRow, { paddingHorizontal: 16, paddingBottom: 12 }]}>
              <Text style={styles.itemsTotalLabel}>{t('procTotal')}</Text>
              <Text style={styles.itemsTotal}>¥{detailTotal.toFixed(2)}</Text>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* ── Success ── */}
      {showSuccess && (
        <Animated.View style={[styles.successOverlay, { opacity: modalOverlayFade }]}>
          <Animated.View style={[styles.successCard, { transform: [{ translateY: modalSlide }] }]}>
            <CheckIcon color={c.primary} />
            <Text style={styles.successTitle}>{t('procSubmitted')}</Text>
            <Text style={styles.successSub}>{t('procSubmittedMsg')}</Text>
            <Text style={styles.successAmount}>¥{successTotal.toFixed(2)}</Text>
            <Text style={{ fontSize: FONTS.micro.size, color: c.textSub }}>
              {t('procNowBatch').replace('{n}', String(successBatch))} · {orderDate} · {payMethod}
            </Text>
            <View style={styles.successBtns}>
              <TouchableOpacity style={styles.successBtnView} onPress={() => { closeSlideModal(() => setShowSuccess(false)); setSubTab('history'); }}>
                <Text style={styles.successBtnViewText}>{t('procViewRecords')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.successBtnNew} onPress={resetOrder}>
                <Text style={styles.successBtnNewText}>{t('procContinue')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
      <Toast message={toastMsg} visible={showToast} onDismiss={() => setShowToast(false)} />
    </View>
  );
}
