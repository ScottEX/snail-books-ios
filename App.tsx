import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import { ThemeProvider } from './src/theme';
import { initStorageCache } from './src/platform';
import { setSessionExpiredHandler } from './src/api/client';

export default function App() {
  const [page, setPage] = useState<'login' | 'home'>('login');
  const [ready, setReady] = useState(false);

  const goLogin = useCallback(() => setPage('login'), []);
  const goHome = useCallback(() => setPage('home'), []);

  useEffect(() => {
    initStorageCache().then(() => {
      const user = localStorage.getItem('user');
      if (user) setPage('home');
      setReady(true);
    });
    // Register 401/idle-timeout handler so api layer can force re-route
    setSessionExpiredHandler(() => setPage('login'));
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {page === 'login' && <LoginScreen onLogin={goHome} />}
        {page === 'home' && <HomeScreen onLogout={goLogin} />}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}