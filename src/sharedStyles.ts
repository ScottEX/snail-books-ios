// ═══════════════════════════════════════════
// Shared StyleSheet constants for snail-books
// Import these instead of copying animation/sizing properties per-screen.
// ═══════════════════════════════════════════

import { ThemeColors, withAlpha, FONTS } from './theme';

// ─── Modal / Popup ──────────────────────────

/** Modal card enter animation (scale+fade). Spread in modalCard StyleSheet. */
export const modalCardAnimation = {
  // @ts-ignore
  animationName: 'modalIn',
  animationDuration: '0.2s',
  animationTimingFunction: 'ease',
};

/** Modal close button (✕) — white at 70% opacity, light weight. Used on dark primary headers. */
export const modalClose = {
  fontSize: FONTS.h2.size,
  color: 'rgba(255,255,255,0.7)',
  fontWeight: '300' as const,
};

/** Modal card border radius — used by PartnerScreen, ThemePicker, etc. */
export const MODAL_CARD_RADIUS = 24;

/** 底部 sheet 抽屉的 ModalOverlay overlayStyle 共用配置 */
export const bottomSheetOverlay = {
  justifyContent: 'flex-end' as const,
  padding: 0,
  alignItems: 'stretch' as const,
};

// ─── History Page Header (‹ back + title + 🔍 filter) ──

/** Shared header / back-button / title styles for all history sub-pages.
 *  Pass your `colors` from useTheme(). Spread into StyleSheet.create(). */
export const historyHeader = (colors: ThemeColors) => ({
  header: {
    position: 'absolute' as const, top: 36, left: 0, right: 0, zIndex: 90,
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12,
    paddingTop: 20, paddingBottom: 8, paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: withAlpha(colors.bg, 0.30),
    justifyContent: 'center' as const, alignItems: 'center' as const,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.10)',
  },
  backArrow: {
    fontSize: FONTS.h1.size, fontWeight: '300' as const, color: colors.primary,
    marginTop: -2, marginLeft: -1,
  },
  title: {
    flex: 1, fontSize: FONTS.body.size, fontWeight: '600' as const, color: '#1A1410',
  },
  filterBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center' as const, alignItems: 'center' as const,
    backgroundColor: withAlpha(colors.bg, 0.30),
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)',
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});

// ─── Image Upload (receipts / 凭证上传) ──

/** Shared upload-area styles for ExpenseScreen + ProcurementScreen. */
export const uploadReceiptStyles = (colors: ThemeColors) => ({
  imgRow: {
    flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8,
    marginBottom: 4, paddingHorizontal: 10,
  },
  imgAddBtn: {
    width: 92, height: 92, borderRadius: 12,
    borderWidth: 1.5, borderStyle: 'dashed' as any, borderColor: colors.secondary,
    backgroundColor: colors.surface,
    alignItems: 'center' as const, justifyContent: 'center' as const, gap: 4,
  },
  imgAddText: { fontSize: FONTS.micro.size, color: colors.textSub, fontWeight: '500' as const },
  imgPreview: { position: 'relative' as any },
  imgRemove: {
    position: 'absolute' as const, top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.50)',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  imgTipBubble: {
    backgroundColor: colors.textMain, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
    // @ts-ignore
    whiteSpace: 'nowrap',
  },
  imgTipText: { fontSize: FONTS.micro.size, color: colors.surface, fontWeight: '500' as const },
});

// ─── Loading Spinner ──────────────────────────

/** Shared loading-spinner layout. */
export const spinnerAnimation = {
  container: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 60,
    gap: 16,
  } as const,
  label: {
    fontSize: FONTS.sub.size,
    color: '#999',
    fontWeight: '500' as const,
  } as const,
};
