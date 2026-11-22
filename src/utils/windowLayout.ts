export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WindowMeasurable {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
}

export function measureWindowRect(view: WindowMeasurable | null, callback: (rect: WindowRect | null) => void) {
  if (typeof view?.measureInWindow !== 'function') {
    callback(null);
    return;
  }
  let finished = false;
  const finish = (rect: WindowRect | null) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    callback(rect);
  };
  // Fabric can leave a measurement unanswered if the view was unmounted.
  const timer = setTimeout(() => finish(null), 120);
  try {
    view.measureInWindow((x, y, width, height) => {
      finish([x, y, width, height].every(Number.isFinite) && width > 0 && height > 0
        ? { x, y, width, height }
        : null);
    });
  } catch (error) {
    if (finished) throw error;
    finish(null);
  }
}

export function relativeWindowRect(rect: WindowRect, viewport: WindowRect): WindowRect {
  return { ...rect, x: rect.x - viewport.x, y: rect.y - viewport.y };
}

export function anchoredSheetPosition(anchor: WindowRect, viewport: WindowRect, sheet: { width: number; height: number }) {
  const margin = 8;
  const local = relativeWindowRect(anchor, viewport);
  const maxLeft = Math.max(margin, viewport.width - sheet.width - margin);
  const maxTop = Math.max(margin, viewport.height - sheet.height - margin);
  const top = local.y > maxTop && local.y - sheet.height >= margin ? local.y - sheet.height : local.y;
  return {
    left: Math.min(maxLeft, Math.max(margin, local.x)),
    top: Math.min(maxTop, Math.max(margin, top)),
  };
}
