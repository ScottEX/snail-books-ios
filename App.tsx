import { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, Image, ActivityIndicator, View, StyleSheet } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import SessionKickedModal from './src/components/SessionKickedModal';
import { ErrorBoundary } from './src/components/CrashCatcher';
import { ThemeProvider } from './src/theme';
import { LangProvider } from './src/i18n';
import { onSessionKicked, onUserChange, setSessionExpiredHandler } from './src/api/client';
import { initStorageCache } from './src/platform';
import { clearWebAuthn } from './src/utils/storage';

export default function App() {
  const [_page, _setPage] = useState<'login' | 'home'>('login');
  const loginConfirmedAt = useRef(0);
  const pageRef = useRef<'login' | 'home'>('login');
  // ── Prevent bounce-back: block setPage('login') for 30s after goHome
  // Uses pageRef (not _page) so the check works correctly inside stale
  // closures (handleExpire / onUserChange captured by useEffect with [] deps).
  const setPage = (v: 'login' | 'home' | ((p: 'login' | 'home') => 'login' | 'home')) => {
    const next = typeof v === 'function' ? v(pageRef.current) : v;
    if (next === 'login' && pageRef.current === 'home' && Date.now() - loginConfirmedAt.current < 30_000) {
      return;
    }
    pageRef.current = next;
    _setPage(v);
  };
  const page = _page;
  const [appKey, setAppKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const lastExpireAt = useRef(0);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Called by LoginScreen when background image is fully loaded.
  const handleReady = useCallback(() => {
    if (logoutTimer.current) { clearTimeout(logoutTimer.current); logoutTimer.current = null; }
    // Small delay so the user sees the full image for a frame before the overlay lifts.
    setTimeout(() => setLoggingOut(false), 100);
  }, []);

  // Safety timeout: force-close the loading overlay after 3s if onReady never fires.
  useEffect(() => {
    if (loggingOut) {
      logoutTimer.current = setTimeout(() => setLoggingOut(false), 3000);
    }
    return () => { if (logoutTimer.current) { clearTimeout(logoutTimer.current); logoutTimer.current = null; } };
  }, [loggingOut]);

  useEffect(() => {
    initStorageCache().then(() => {
      try {
        if (localStorage.getItem('user')) setPage('home');
      } catch {}
      setReady(true);
    });
  }, []);

  // Preload cached background image into RN's image cache so
  // LoginScreen renders it instantly — mirrors web's new Image().src = cached.
  useEffect(() => {
    try {
      const cached = localStorage.getItem('bg-image');
      if (cached) Image.prefetch(cached);
      const avatar = localStorage.getItem('avatar-uri');
      if (avatar) Image.prefetch(avatar);
    } catch {}
  }, []);

  useEffect(() => {
    const handleExpire = () => {
      const now = Date.now();
      if (now - lastExpireAt.current < 1500) return;
      lastExpireAt.current = now;
      setPage((p) => {
        if (p !== 'login') setAppKey((k) => k + 1);
        return 'login';
      });
    };
    const unsubKicked = onSessionKicked(handleExpire);
    const unsubChange = onUserChange(() => {
      try { setPage(localStorage.getItem('user') ? 'home' : 'login'); } catch {}
      lastExpireAt.current = Date.now();
    });
    setSessionExpiredHandler(handleExpire);
    return () => { unsubKicked(); unsubChange(); };
  }, []);

  const goHome = useCallback(() => {
    loginConfirmedAt.current = Date.now();
    setAppKey((k) => k + 1);
    setPage('home');
  }, []);

  const goLogin = useCallback(() => {
    loginConfirmedAt.current = 0; // allow explicit logout
    let lang = '';
    let rememberMe = '';
    let savedLogin = '';
    let bgImage = '';
    let avatarUri = '';
    let themeId = '';
    try {
      lang = localStorage.getItem('lang') || '';
      rememberMe = localStorage.getItem('remember_me') || '';
      savedLogin = localStorage.getItem('saved_login') || '';
      bgImage = localStorage.getItem('bg-image') || '';
      avatarUri = localStorage.getItem('avatar-uri') || '';
      const themeKey = (() => { try { const { getThemeKey } = require('./src/theme'); return getThemeKey(); } catch { return 'snail-books-theme'; } })();
      themeId = localStorage.getItem(themeKey) || '';
      localStorage.clear();
      if (lang) localStorage.setItem('lang', lang);
      if (rememberMe) localStorage.setItem('remember_me', rememberMe);
      if (savedLogin) localStorage.setItem('saved_login', savedLogin);
      if (bgImage) localStorage.setItem('bg-image', bgImage);
      if (avatarUri) localStorage.setItem('avatar-uri', avatarUri);
      if (themeId) localStorage.setItem('snail-books-theme', themeId);
    } catch {}
    clearWebAuthn();
    // Pre-decode the custom background so the Image in LoginScreen loads faster.
    if (bgImage) {
      Image.prefetch(bgImage).catch(() => {});
    }
    if (pageRef.current !== 'login') {
      setAppKey((k) => k + 1);
      setPage('login');
    }
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <LangProvider>
        <SessionKickedModal />
        <ErrorBoundary>
          <ThemeProvider key={appKey}>
            <StatusBar barStyle="light-content" />
            {page === 'login' && <LoginScreen onLogin={goHome} onReady={handleReady} />}
            {page === 'home' && <HomeScreen onLogout={goLogin} onLogoutStart={() => setLoggingOut(true)} />}
            {loggingOut && (
              <View style={styles.overlay} pointerEvents="auto">
                <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
              </View>
            )}
          </ThemeProvider>
        </ErrorBoundary>
      </LangProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
});
