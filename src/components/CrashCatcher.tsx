import React, { Component, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CRASH_KEY = '__hermes_last_crash__';

// ── Global error handler (runs BEFORE Error Boundary) ──
// Captures uncaught JS errors and persists them to AsyncStorage
// so they survive the JS thread restart.

let globalHandlerInstalled = false;

function persistCrash(error: Error | string, info?: string) {
  const payload = JSON.stringify({
    message: String(error),
    stack: error instanceof Error ? error.stack : '',
    info: info || '',
    time: new Date().toISOString(),
  });
  AsyncStorage.setItem(CRASH_KEY, payload).catch(() => {});
}

export function getLastCrash(): Promise<string | null> {
  return AsyncStorage.getItem(CRASH_KEY);
}

export function clearLastCrash(): Promise<void> {
  return AsyncStorage.removeItem(CRASH_KEY);
}

export function installGlobalCrashHandler() {
  if (globalHandlerInstalled) return;
  globalHandlerInstalled = true;

  // React Native ErrorUtils — catches uncaught JS exceptions
  const g = globalThis as any;
  if (g.ErrorUtils) {
    const originalHandler = g.ErrorUtils.getGlobalHandler();
    g.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      persistCrash(error, isFatal ? 'fatal' : 'non-fatal');
      originalHandler?.(error, isFatal);
    });
  }

  // Unhandled promise rejections
  if (typeof g.addEventListener === 'function') {
    g.addEventListener('unhandledrejection', (event: any) => {
      const reason = event?.reason;
      persistCrash(
        reason instanceof Error ? reason : String(reason || 'Unknown promise rejection'),
        'unhandledrejection',
      );
    });
  }
}

// ── Error Boundary ──
// Catches React render errors and displays a crash report.
// Used as a last-resort safety net: shows the error + a "Restart" hint.

interface Props { children: React.ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    persistCrash(error, info.componentStack || '');
  }

  handleRestart = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <CrashScreen
          error={this.state.error}
          onRestart={this.handleRestart}
        />
      );
    }
    return this.props.children;
  }
}

// ── Crash Screen ──
// Shows the error details in a scrollable view. Not pretty, but functional.

function CrashScreen({ error, onRestart }: { error: Error; onRestart: () => void }) {
  return (
    <View style={s.container}>
      <View style={s.card}>
        <Text style={s.title}>App Crashed</Text>
        <Text style={s.label}>Error:</Text>
        <ScrollView style={s.scroll}>
          <Text style={s.code}>{error.message}</Text>
          {error.stack ? <Text style={s.codeDim}>{error.stack}</Text> : null}
        </ScrollView>
        <Text style={s.hint}>
          The app has crashed. If this keeps happening, share this screen with the developer.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#16213e', borderRadius: 16, padding: 20, maxHeight: '80%' },
  title: { color: '#e94560', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  label: { color: '#ccc', fontSize: 13, marginBottom: 4 },
  scroll: { maxHeight: 300, marginBottom: 12 },
  code: { color: '#ff6b6b', fontSize: 12, fontFamily: 'monospace', lineHeight: 18 },
  codeDim: { color: '#888', fontSize: 11, fontFamily: 'monospace', lineHeight: 16, marginTop: 8 },
  hint: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 12 },
});
