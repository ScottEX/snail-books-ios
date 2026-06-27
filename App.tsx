import { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import SessionKickedModal from './src/components/SessionKickedModal';
import { ThemeProvider } from './src/theme';
import { LangProvider } from './src/i18n';
import { onSessionKicked, onUserChange, setSessionExpiredHandler } from './src/api/client';
import { initStorageCache } from './src/platform';
import { clearCredential } from './src/utils/biometric';
import { clearWebAuthn } from './src/utils/storage';

export default function App() {
  const [page, setPage] = useState<'login' | 'home'>('login');
  const [appKey, setAppKey] = useState(0);
  const [ready, setReady] = useState(false);
  // Guard against the LoginScreen <-> HomeScreen remount loop: when
  // several API calls 401 simultaneously (common during a fresh login
  // or after the session was kicked server-side) each one fires
  // onUserChange + onSessionKicked + onSessionExpired, and if every
  // handler bumps appKey the LoginScreen remounts three times per 401
  // — and its mount-effect calls api.webauthnStatus() which can 401
  // again, starting the cycle over. Coalesce within a 1500ms window.
  const lastExpireAt = useRef(0);

  // Hydrate AsyncStorage → localStorage cache before anything reads it
  useEffect(() => {
    initStorageCache().then(() => {
      try {
        if (localStorage.getItem('user')) setPage('home');
      } catch {}
      setReady(true);
    });
  }, []);

  // 401 / account disabled / session kicked → force back to login
  useEffect(() => {
    const handleExpire = () => {
      console.error('[AUTH DEBUG] App.handleExpire called');
      const now = Date.now();
      if (now - lastExpireAt.current < 1500) { console.warn('[AUTH DEBUG] handleExpire coalesced — skipping'); return; }
      lastExpireAt.current = now;
      setPage((p) => {
        console.error('[AUTH DEBUG] handleExpire setPage → login (was', p, ')');
        if (p !== 'login') setAppKey((k) => k + 1);
        return 'login';
      });
    };
    const unsubKicked = onSessionKicked(handleExpire);
    // User-change bus (logout / 401). Still bumps appKey so any
    // stateful children re-initialise.
    const unsubChange = onUserChange(() => {
      console.error('[AUTH DEBUG] App.onUserChange — user in storage:', !!localStorage.getItem('user'));
      setAppKey((k) => k + 1);
      try { setPage(localStorage.getItem('user') ? 'home' : 'login'); } catch {}
      lastExpireAt.current = Date.now();
    });
    setSessionExpiredHandler(handleExpire);
    return () => { unsubKicked(); unsubChange(); };
  }, []);

  const goHome = useCallback(() => { console.warn('[AUTH DEBUG] App.goHome called — page→home'); setAppKey((k) => k + 1); setPage('home'); }, []);
  const goLogin = useCallback(() => {
    // Preserve device-level settings across logout: language, the
    // "remember me" checkbox, and the saved username so the login
    // form re-hydrates nicely on next launch. Everything else (user,
    // token, webauthn state, bg-image, etc.) is per-session and gets
    // cleared.
    let lang = '';
    let rememberMe = '';
    let savedLogin = '';
    let themeId = '';
    try {
      lang = localStorage.getItem('lang') || '';
      rememberMe = localStorage.getItem('remember_me') || '';
      savedLogin = localStorage.getItem('saved_login') || '';
      // Preserve theme preference across logout — save under a device key
      // so it survives the clear (per-user key depends on user_id which is also cleared)
      const themeKey = (() => { try { const { getThemeKey } = require('./src/theme'); return getThemeKey(); } catch { return 'snail-books-theme'; } })();
      themeId = localStorage.getItem(themeKey) || '';
      localStorage.clear();
      if (lang) localStorage.setItem('lang', lang);
      if (rememberMe) localStorage.setItem('remember_me', rememberMe);
      if (savedLogin) localStorage.setItem('saved_login', savedLogin);
      if (themeId) localStorage.setItem('snail-books-theme', themeId);
    } catch {}
    // Clear biometric-unlock credential + WebAuthn state so a logged-out
    // device can never be unlocked into another user's account.
    clearCredential().catch(() => {});
    clearWebAuthn();
    setAppKey((k) => k + 1);
    setPage('login');
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <LangProvider>
        {/* SessionKickedModal sits OUTSIDE the keyed ThemeProvider subtree
            so its visible state survives the user-change remount. */}
        <SessionKickedModal />
        <ThemeProvider key={appKey}>
          {/* System status bar: use light icons/text over the dark
              background-image screens (login, home) so the time/battery
              remain visible. The sub-screens rendered via SlideScreen
              manage their own StatusBar locally. */}
          <StatusBar barStyle="light-content" />
          {page === 'login' && <LoginScreen onLogin={goHome} />}
          {page === 'home' && <HomeScreen onLogout={goLogin} />}
        </ThemeProvider>
      </LangProvider>
    </SafeAreaProvider>
  );
}
