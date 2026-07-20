import { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar, StyleSheet, AppState } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import LoginScreen from './src/screens/LoginScreen';
import RootStack from './src/navigation/RootStack';
import { NavigationContainer } from '@react-navigation/native';
import SessionKickedModal from './src/components/SessionKickedModal';
import { ErrorBoundary } from './src/components/CrashCatcher';
import { ThemeProvider } from './src/theme';
import { LangProvider } from './src/i18n';
import { onSessionKicked, onUserChange, setSessionExpiredHandler, setIdleTimeoutHours, api, bumpActivity } from './src/api/client';
import { initStorageCache } from './src/platform';

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
  const [kickedVisible, setKickedVisible] = useState(false);
  const expiring = useRef(false);

  // Reset idle timer when the app returns to foreground — prevents premature
  // logout when the user is actively using the app without making API calls.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        try { if (localStorage.getItem('user')) bumpActivity(); } catch {}
      }
    });
    return () => { sub.remove(); };
  }, []);

  useEffect(() => {
    initStorageCache().then(() => {
      try {
        if (localStorage.getItem('user')) setPage('home');
      } catch {}
      setReady(true);
    });
  }, []);

  useEffect(() => {
    const handleTimeout = () => {
      // Idle timeout — silent redirect to login, same as web
      const now = Date.now();
      if (now - lastExpireAt.current < 1500) return;
      lastExpireAt.current = now;
      loginConfirmedAt.current = 0;
      expiring.current = true;
      try { if (typeof window !== 'undefined') (window as any).__expiring = true; } catch {}
      setPage('login');
    };
    const handleKicked = () => {
      // Kicked by another device — show modal
      const now = Date.now();
      if (now - lastExpireAt.current < 1500) return;
      lastExpireAt.current = now;
      loginConfirmedAt.current = 0;
      expiring.current = true;
      try { if (typeof window !== 'undefined') (window as any).__expiring = true; } catch {}
      setKickedVisible(true);
    };
    const unsubKicked = onSessionKicked(handleKicked);
    const unsubChange = onUserChange(() => {
      if (expiring.current) return;
      try { setPage(localStorage.getItem('user') ? 'home' : 'login'); } catch {}
      lastExpireAt.current = Date.now();
    });
    setSessionExpiredHandler(handleTimeout);
    return () => { unsubKicked(); unsubChange(); };
  }, []);

  const goHome = useCallback(() => {
    loginConfirmedAt.current = Date.now();
    setAppKey((k) => k + 1);
    setPage('home');
    // Load user auth prefs (session_timeout_hours) and apply to idle timer
    api.getAuthPrefs().then((data: any) => {
      if (data?.session_timeout_hours && data.session_timeout_hours > 0) {
        setIdleTimeoutHours(data.session_timeout_hours);
      }
    }).catch(() => {});
  }, []);

  const goLogin = useCallback(() => {
    loginConfirmedAt.current = 0; // allow explicit logout
    let lang = '';
    let rememberMe = '';
    let savedLogin = '';
    let faceModeUser = '';
    let bgImage = '';
    let avatarUri = '';
    let themeId = '';
    let bgLocalPath = '';
    let bgRemoteUrl = '';
    try {
      lang = localStorage.getItem('lang') || '';
      rememberMe = localStorage.getItem('remember_me') || '';
      savedLogin = localStorage.getItem('saved_login') || '';
      faceModeUser = localStorage.getItem('face_mode_user') || '';
      bgImage = savedLogin ? localStorage.getItem(`bg-image-${savedLogin}`) || '' : '';
      avatarUri = savedLogin ? localStorage.getItem(`avatar-uri-${savedLogin}`) || '' : '';
      bgLocalPath = localStorage.getItem('bg-local-path') || '';
      bgRemoteUrl = localStorage.getItem('bg-remote-url') || '';
      const themeKey = (() => { try { const { getThemeKey } = require('./src/theme'); return getThemeKey(); } catch { return 'snail-books-theme'; } })();
      themeId = localStorage.getItem(themeKey) || '';
      localStorage.clear();
      if (lang) localStorage.setItem('lang', lang);
      if (rememberMe) localStorage.setItem('remember_me', rememberMe);
      if (savedLogin) localStorage.setItem('saved_login', savedLogin);
      if (faceModeUser) localStorage.setItem('face_mode_user', faceModeUser);
      if (bgImage) localStorage.setItem(`bg-image-${savedLogin}`, bgImage);
      if (avatarUri) localStorage.setItem(`avatar-uri-${savedLogin}`, avatarUri);
      if (bgLocalPath) localStorage.setItem('bg-local-path', bgLocalPath);
      if (bgRemoteUrl) localStorage.setItem('bg-remote-url', bgRemoteUrl);
      if (themeId) localStorage.setItem('snail-books-theme', themeId);
    } catch {}
    if (pageRef.current !== 'login') {
      setAppKey((k) => k + 1);
      setPage('login');
    }
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
    <SafeAreaProvider>
      <KeyboardProvider>
        <LangProvider>
        <SessionKickedModal visible={kickedVisible} onConfirm={() => { setKickedVisible(false); expiring.current = false; setPage('login'); }} />
        <ErrorBoundary>
          <ThemeProvider key={appKey}>
            <StatusBar barStyle="light-content" />
            {page === 'login' && <LoginScreen onLogin={goHome} />}
            {page === 'home' && (
              <NavigationContainer>
                <RootStack onLogout={goLogin} />
              </NavigationContainer>
            )}
          </ThemeProvider>
        </ErrorBoundary>
      </LangProvider>
      </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
