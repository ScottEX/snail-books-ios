import { useState, useCallback } from 'react';

interface UseImagePreviewResult {
  visible: boolean;
  uri: string | null;
  show: (uri: string) => void;
  close: () => void;
}

/** Tap-to-zoom image preview state. Reused by ReceiptUpload and any other image list. */
export function useImagePreview(): UseImagePreviewResult {
  const [visible, setVisible] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const show = useCallback((u: string) => { setUri(u); setVisible(true); }, []);
  const close = useCallback(() => { setVisible(false); setTimeout(() => setUri(null), 200); }, []);
  return { visible, uri, show, close };
}
