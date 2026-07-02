// ═══════════════════════════════════════════════════════════════
// useToast — 轻量 Toast hook(与 web 端 src/hooks/useToast.tsx 对齐)
// ═══════════════════════════════════════════════════════════════
//
// 用法:
//   const { showToast, ToastHost } = useToast();
//   showToast('保存成功');
//   return <View>...{ToastHost}</View>;

import { useState, useCallback } from 'react';
import Toast from '../components/Toast';

export function useToast() {
  const [toast, setToast] = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  const ToastHost = (
    <Toast message={toast} visible={!!toast} onDismiss={() => setToast('')} />
  );

  return { showToast, ToastHost };
}