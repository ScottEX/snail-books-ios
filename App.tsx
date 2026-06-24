import { useState, useEffect, useCallback } from 'react';
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
    const unsubKicked = onSessionKicked(() => {
      setAppKey((k) => k + 1);
      setPage('login');
    });
    // User-change bus (any module that does logout() or hits 401 fires this)
    const unsubChange = onUserChange(() => {
      setAppKey((k) => k + 1);
      try { setPage(localStorage.getItem('user') ? 'home' : 'login'); } catch {}
    });
    // Also wire the api layer's manual handler (used by some 401 paths)
    setSessionExpiredHandler(() => {
      setAppKey((k) => k + 1);
      setPage('login');
    });
    return () => { unsubKicked(); unsubChange(); };
  }, []);

  const goHome = useCallback(() => setPage('home'), []);
  const goLogin = useCallback(() => {
    // Preserve lang across logout (per-device setting)
    let lang = '';
    try {
      lang = localStorage.getItem('lang') || '';
      localStorage.clear();
      if (lang) localStorage.setItem('lang', lang);
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
