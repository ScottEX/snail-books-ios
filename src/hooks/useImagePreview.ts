import { useState, useCallback } from 'react';

export interface PreviewState {
  images: string[];
  idx: number;
  visible: boolean;
}

export function useImagePreview() {
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const openPreview = useCallback((images: string[], idx: number = 0) => {
    if (!images || images.length === 0) return;
    setPreview({ images, idx, visible: true });
  }, []);

  const closePreview = useCallback(() => {
    setPreview(prev => prev ? { ...prev, visible: false } : null);
  }, []);

  return { preview, openPreview, closePreview };
}
