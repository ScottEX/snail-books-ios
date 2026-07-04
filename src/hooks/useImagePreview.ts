import { useState, useCallback } from 'react';

export interface PreviewState {
  images: string[];
  idx: number;
}

export function useImagePreview() {
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const openPreview = useCallback((images: string[], idx: number = 0) => {
    if (!images || images.length === 0) return;
    setPreview({ images, idx });
  }, []);

  const closePreview = useCallback(() => {
    setPreview(null);
  }, []);

  return { preview, openPreview, closePreview };
}
