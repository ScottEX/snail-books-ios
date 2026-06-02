// ═══════════════════════════════════════════
// Shared StyleSheet constants for snail-books
// Import these instead of copying animation/sizing properties per-screen.
// ═══════════════════════════════════════════

import { ThemeColors, withAlpha, FONTS } from './theme';

// ─── Modal / Popup ──────────────────────────

/** Modal card enter animation (scale+fade). Include via spread in modalCard StyleSheet. */
export const modalCardAnimation = {
  // @ts-ignore — CSS animation properties not typed in RN StyleSheet
  animationName: 'modalIn',
  animationDuration: '0.2s',
  animationTimingFunction: 'ease',
};

/** Modal close button (✕) — white at 70% opacity, light weight. Used on dark primary headers. */
export const modalClose = {
  fontSize: 18,
  color: 'rgba(255,255,255,0.7)',
  fontWeight: '300' as const,
};

// ─── History Page Header (‹ back + title + 🔍 filter) ──

/** Shared header / back-button / title styles for all history sub-pages.
 *  Pass your `colors` from useTheme(). Spread into StyleSheet.create().
 *
 *  Usage:
 *    const st = StyleSheet.create({
 *      ...historyHeader(colors),
 *      // page-specific styles ...
 *    });
 */
export const historyHeader = (colors: ThemeColors) => ({
  header: {
    position: 'absolute' as const, top: 36, left: 0, right: 0, zIndex: 90,
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const,
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: withAlpha(colors.bg, 0.55),
    // @ts-ignore
    backdropFilter: 'saturate(200%) blur(30px)',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: withAlpha(colors.bg, 0.30),
    justifyContent: 'center' as const, alignItems: 'center' as const,
    // @ts-ignore
    backdropFilter: 'saturate(200%) blur(30px)',
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.10)',
  },
  backArrow: {
    fontSize: FONTS.h1.size, fontWeight: '300' as const, color: colors.primary,
    marginTop: -2, marginLeft: -1,
  },
  title: {
    fontSize: FONTS.body.size, fontWeight: '400' as const, color: colors.textMain,
  },
  filterBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center' as const, alignItems: 'center' as const,
    backgroundColor: withAlpha(colors.bg, 0.30),
    // @ts-ignore
    backdropFilter: 'saturate(200%) blur(30px)',
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)',
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});

// ─── Image Upload (receipts / 凭证上传) ──

/** Shared upload-area styles for ExpenseScreen + ProcurementScreen.
 *  Pass your `colors` from useTheme(). Spread into StyleSheet.create(). */
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
