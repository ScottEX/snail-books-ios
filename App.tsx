import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import { ThemeProvider, useTheme } from './src/theme';
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
        {page === 'home' && <HomePlaceholder onLogout={() => setPage('login')} />}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function HomePlaceholder({ onLogout }: { onLogout: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.textMain }]}>蓝姐螺蛳粉</Text>
      <Text style={[styles.subtitle, { color: colors.textSub }]}>
        首页 / 对账 / 供应链 三个 tab 还在迁移到 React Native
      </Text>
      <Text style={[styles.note, { color: colors.textSub }]}>
        · HTML input 元素 (`type=date`, `type=file`) → 需装 @react-native-community/datetimepicker + expo-image-picker{'\n'}
        · CSS `position: fixed` / `backdrop-filter` / `calc(100vw)` / `background-image: url()` → 需重写样式{'\n'}
        · `document.createElement('canvas')`, `window.xxx` → 需改 RN 等价{'\n'}
        · `className` / `onClick` → 需改成 `style` / `onPress`
      </Text>
      <Text style={[styles.note, { color: colors.textSub, marginTop: 16 }]}>
        这是临时 placeholder,确认登录流程 + API 通了。要继续推进完整 RN 化,跟我说一声。
      </Text>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.primary }]}
        onPress={onLogout}
      >
        <Text style={{ color: colors.surface, fontWeight: '600' }}>退出登录</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 20 },
  note: { fontSize: 13, lineHeight: 20 },
  btn: { marginTop: 24, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});