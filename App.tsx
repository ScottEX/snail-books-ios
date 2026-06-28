import { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import SessionKickedModal from './src/components/SessionKickedModal';
import { ErrorBoundary } from './src/components/CrashCatcher';
import { ThemeProvider } from './src/theme';
import { LangProvider } from './src/i18n';
import { onSessionKicked, onUserChange, setSessionExpiredHandler } from './src/api/client';
import { initStorageCache } from './src/platform';
import { clearCredential } from './src/utils/biometric';
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
  const lastExpireAt = useRef(0);

  useEffect(() => {
    initStorageCache().then(() => {
      try {
        if (localStorage.getItem('user')) setPage('home');
      } catch {}
      setReady(true);
    });
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
      setAppKey((k) => k + 1);
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
    let themeId = '';
    try {
      lang = localStorage.getItem('lang') || '';
      rememberMe = localStorage.getItem('remember_me') || '';
      savedLogin = localStorage.getItem('saved_login') || '';
      bgImage = localStorage.getItem('bg-image') || '';
      const themeKey = (() => { try { const { getThemeKey } = require('./src/theme'); return getThemeKey(); } catch { return 'snail-books-theme'; } })();
      themeId = localStorage.getItem(themeKey) || '';
      localStorage.clear();
      if (lang) localStorage.setItem('lang', lang);
      if (rememberMe) localStorage.setItem('remember_me', rememberMe);
      if (savedLogin) localStorage.setItem('saved_login', savedLogin);
      if (bgImage) localStorage.setItem('bg-image', bgImage);
      if (themeId) localStorage.setItem('snail-books-theme', themeId);
    } catch {}
    clearCredential().catch(() => {});
    clearWebAuthn();
    // If onUserChange already switched to login (e.g. HomeScreen modal
    // called api.logout() before us), skip the duplicate remount.
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
            {page === 'login' && <LoginScreen onLogin={goHome} />}
            {page === 'home' && <HomeScreen onLogout={goLogin} />}
          </ThemeProvider>
        </ErrorBoundary>
      </LangProvider>
    </SafeAreaProvider>
  );
}
