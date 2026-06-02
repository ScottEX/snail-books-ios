import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import { ThemeProvider } from './src/theme';
import { initStorageCache } from './src/platform';

export default function App() {
  const [page, setPage] = useState<'login' | 'home'>('login');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initStorageCache().then(() => {
      const user = localStorage.getItem('user');
      setPage(user ? 'home' : 'login');
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {page === 'login' && <LoginScreen onLogin={() => setPage('home')} />}
        {page === 'home' && <HomeScreen onLogout={() => { localStorage.removeItem('user'); setPage('login'); }} />}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}