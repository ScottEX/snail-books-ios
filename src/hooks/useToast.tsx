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
