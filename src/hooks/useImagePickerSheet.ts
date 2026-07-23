import { useState, useCallback, useRef } from 'react';
import { pickImages, takePhoto, PickedImage } from '../utils/imagePicker';

export function useImagePickerSheet() {
  const [show, setShow] = useState(false);
  const resolveRef = useRef<((img: PickedImage | null) => void) | null>(null);

  const open = useCallback((): Promise<PickedImage | null> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setShow(true);
    });
  }, []);

  const chooseLibrary = useCallback(async () => {
    setShow(false);
    try {
      const imgs = await pickImages({ multiple: false });
      resolveRef.current?.(imgs.length > 0 ? imgs[0] : null);
    } catch {
      resolveRef.current?.(null);
    }
  }, []);

  const chooseCamera = useCallback(async () => {
    setShow(false);
    try {
      const img = await takePhoto();
      resolveRef.current?.(img);
    } catch {
      resolveRef.current?.(null);
    }
  }, []);

  const close = useCallback(() => {
    resolveRef.current?.(null);
    setShow(false);
  }, []);

  return { show, open, chooseLibrary, chooseCamera, close };
}
