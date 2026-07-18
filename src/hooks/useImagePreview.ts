import { useState, useCallback } from 'react';
import type { ThumbLayout } from '../components/ImagePreview';

export interface PreviewState {
  images: string[];
  idx: number;
  visible: boolean;
  layout?: ThumbLayout | null;
}

export function useImagePreview() {
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const openPreview = useCallback((images: string[], idx: number = 0, layout?: ThumbLayout | null) => {
    if (!images || images.length === 0) return;
    setPreview({ images, idx, visible: true, layout: layout ?? null });
  }, []);

  const closePreview = useCallback(() => {
    setPreview(null);
  }, []);

  return { preview, openPreview, closePreview };
}
