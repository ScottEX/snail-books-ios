import { useRef, useCallback } from 'react';

/**
 * Swipe-right-from-left-edge to go back.
 * Usage: <View {...useSwipeBack(onBack)}> ... </View>
 * Skips touch events originating from interactive elements (input, button, etc.).
 */
export function useSwipeBack(onBack: () => void) {
  const touchRef = useRef({ startX: 99999, startY: 0 });

  const onTouchStart = useCallback((e: any) => {
    // Skip if touch originated from an interactive element (input, textarea, button, select, a)
    const target = e.nativeEvent?.target || e.target;
    if (target) {
      const tag = (target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'button' || tag === 'select' || tag === 'a') return;
    }
    const t = e.nativeEvent?.touches?.[0] || e.nativeEvent;
    touchRef.current = { startX: t.pageX, startY: t.pageY };
  }, []);

  const onTouchEnd = useCallback((e: any) => {
    const t = e.nativeEvent?.changedTouches?.[0] || e.nativeEvent;
    if (!t) return;
    const dx = t.pageX - touchRef.current.startX;
    const dy = Math.abs(t.pageY - touchRef.current.startY);
    if (touchRef.current.startX < 36 && dx > 80 && dx > dy * 1.5) onBack();
  }, [onBack]);

  return { onTouchStart, onTouchEnd };
}
