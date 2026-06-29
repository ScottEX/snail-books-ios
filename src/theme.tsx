import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api/client';
import { getCurrentUserId } from './utils/storage';

// ═══════════════════════════════════════════
// 三方案主题色值定义
// ═══════════════════════════════════════════

export interface ThemeColors {
  /** 基础底色 */
  bg: string;
  /** 卡片/面板 */
  surface: string;
  /** 主色调/主按钮 */
  primary: string;
  /** 强调色/金额高亮 */
  accent: string;
  /** 次按钮/默认描边 */
  secondary: string;
  /** 主标题文字 */
  textMain: string;
  /** 副标题文字 */
  textSub: string;
  /** 成功 */
  success: string;
  /** 警告 */
  warning: string;
  /** 危险 */
  danger: string;
  /** 信息 */
  info: string;
  /** 底部导航选中态图标颜色 — 柔和的主题色调，非 primary */
  navActiveColor: string;
  /** 支出 / 对账 tab 卡的渐变色 — 深色调，匹配 web */
  expenseGradientStart: string;
  expenseGradientEnd: string;
  /** 支出 / 对账 tab 卡上的金额色 — 每个主题独立，匹配 web */
  expenseAmountColor: string;
}

export interface Theme {
  id: string;
  name: string;
  nameZh: string;
  nameTw: string;
  nameEn: string;
  description: string;
  descZh: string;
  descTw: string;
  descEn: string;
  colors: ThemeColors;
}

// ═══════════════════════════════════════════
// 页面动画常量（统一控制，一处改全局生效）
// ═══════════════════════════════════════════
export const ENTER_DURATION = 380;
export const EXIT_DURATION = 350;
export const ENTER_EASING = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
export const EXIT_EASING = 'cubic-bezier(0.55, 0.055, 0.675, 0.19)';

// ═══════════════════════════════════════════
// 弹窗遮罩常量（统一控制，PDF 预览页除外）
// ═══════════════════════════════════════════
export const MODAL_BACKDROP_OPACITY = 0.8;

/** Required indicator (*) color — same across all themes */
export const REQUIRED_COLOR = '#E84040';

// ─── 方案一：勃艮第红与暖沙白 ───
const theme1: Theme = {
  id: 'burgundy-warm',
  name: 'Burgundy & Warm Sand',
  nameZh: '勃艮第红与暖沙白',
  nameTw: '勃艮第紅與暖沙白',
  nameEn: 'Burgundy & Warm Sand',
  description: '温润、沉稳、经典',
  descZh: '温润、沉稳、经典',
  descTw: '溫潤、沈穩、經典',
  descEn: 'Warm, Steady, Classic',
  colors: {
    bg: '#F9F7F4',
    surface: '#FFFFFF',
    primary: '#7D2329',
    accent: '#EAE5E0',
    secondary: '#EAE5E0',
    textMain: '#2C2626',
    textSub: '#8C8583',
    success: '#4C7A5D',
    warning: '#D59A53',
    danger: '#B34149',
    info: '#4A7299',
    navActiveColor: '#D4918A',
    expenseGradientStart: '#8B1A2B',
    expenseGradientEnd: '#4A0E16',
    expenseAmountColor: '#FFF5EC',
  },
};

// ─── 方案二：曜石黑与流沙金 ───
const theme2: Theme = {
  id: 'obsidian-gold',
  name: 'Obsidian & Gold',
  nameZh: '曜石黑与流沙金',
  nameTw: '曜石黑與流沙金',
  nameEn: 'Obsidian & Gold',
  description: '极简、冷峻、绝对专业',
  descZh: '极简、冷峻、绝对专业',
  descTw: '極簡、冷峻、絕對專業',
  descEn: 'Minimal, Crisp, Professional',
  colors: {
    bg: '#F3F4F6',
    surface: '#FFFFFF',
    primary: '#C5A880',
    accent: '#171A1F',
    secondary: '#E5E7EB',
    textMain: '#111827',
    textSub: '#6B7280',
    success: '#4C7A5D',
    warning: '#D59A53',
    danger: '#B34149',
    info: '#4A7299',
    navActiveColor: '#C5A880',
    expenseGradientStart: '#2C2C2C',
    expenseGradientEnd: '#0F0F0F',
    expenseAmountColor: '#E8C87A',
  },
};

// ─── 方案三：深空青与燕麦色 ───
const theme3: Theme = {
  id: 'deep-teal',
  name: 'Deep Teal & Oat',
  nameZh: '深空青与燕麦色',
  nameTw: '深空青與燕麥色',
  nameEn: 'Deep Teal & Oat',
  description: '现代、清新、克制',
  descZh: '现代、清新、克制',
  descTw: '現代、清新、克制',
  descEn: 'Modern, Fresh, Restrained',
  colors: {
    bg: '#F4F5F4',
    surface: '#FFFFFF',
    primary: '#2A4B4B',
    accent: '#D4C5B2',
    secondary: '#E1E5E4',
    textMain: '#1B2626',
    textSub: '#738080',
    success: '#4C7A5D',
    warning: '#D59A53',
    danger: '#B34149',
    info: '#4A7299',
    navActiveColor: '#3AB8C8',
    expenseGradientStart: '#1A3A4A',
    expenseGradientEnd: '#0B1F2A',
    expenseAmountColor: '#5EDBF5',
  },
};

export const THEMES: Record<string, Theme> = {
  'burgundy-warm': theme1,
  'obsidian-gold': theme2,
  'deep-teal': theme3,
};

export const DEFAULT_THEME_ID = 'burgundy-warm';

export function getThemeKey(): string {
  try {
    const uid = getCurrentUserId();
    return uid ? `snail-books-theme-${uid}` : 'snail-books-theme';
  } catch {
    return 'snail-books-theme';
  }
}

/**
 * Convert hex color to rgba string.
 * Example: withAlpha('#7D2329', 0.5) → 'rgba(125,35,41,0.5)'
 */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ═══════════════════════════════════════════
// 排版变量（所有主题通用，不随主题切换）
// ═══════════════════════════════════════════

export interface FontToken {
  size: number;
  weight: '300' | '400' | '500' | '600' | '700' | '800';
  color: 'textMain' | 'textSub';
}

export const FONTS = {
  h1:       { size: 28, weight: '600' as const, color: 'textMain' as const },
  h2:       { size: 20, weight: '700' as const, color: 'textMain' as const },
  body:     { size: 18, weight: '500' as const, color: 'textMain' as const },
  sub:      { size: 16, weight: '500' as const, color: 'textSub'  as const },
  subBold:  { size: 16, weight: '700' as const, color: 'textSub'  as const },
  micro:    { size: 14, weight: '500' as const, color: 'textSub'  as const },
  microBold:{ size: 14, weight: '700' as const, color: 'textSub'  as const },
  amount:   { size: 28, weight: '700' as const, color: 'textMain' as const },
} as const;

// ═══════════════════════════════════════════
// ThemeContext
// ═══════════════════════════════════════════

interface ThemeContextValue {
  theme: Theme;
  colors: ThemeColors;
  setTheme: (themeId: string) => void;
  allThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: theme1,
  colors: theme1.colors,
  setTheme: () => {},
  allThemes: Object.values(THEMES),
});

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(getThemeKey());
      if (stored && THEMES[stored]) return THEMES[stored];
      // Fallback: check device-level key (survives logout)
      const deviceStored = localStorage.getItem('snail-books-theme');
      if (deviceStored && THEMES[deviceStored]) return THEMES[deviceStored];
    } catch {}
    return theme1;
  });

  const setTheme = useCallback((themeId: string) => {
    const t = THEMES[themeId];
    if (!t) return;
    setThemeState(t);
    try { localStorage.setItem(getThemeKey(), themeId); } catch {}
    try { localStorage.setItem('snail-books-theme', themeId); } catch {}
    api.saveTheme(themeId).catch(() => {});
  }, []);

  useEffect(() => {
    // Short-circuit when no user — avoids 401 → app:user-change → remount loop
    if (typeof localStorage === 'undefined' || !localStorage.getItem('user')) {
      return;
    }
    let cancelled = false;
    api.getTheme().then(resp => {
      if (cancelled) return;
      const serverThemeId = (resp as any)?.theme;
      if (serverThemeId && THEMES[serverThemeId]) {
        setThemeState(THEMES[serverThemeId]);
        try { localStorage.setItem(getThemeKey(), serverThemeId); } catch {}
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, colors: theme.colors, setTheme, allThemes: Object.values(THEMES) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
