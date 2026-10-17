import { useCallback, useRef, useState } from 'react';

/**
 * Measure a chart container so the SVG is drawn at the width it is shown (text stays at its true
 * size on every device). Returns a callback ref and the current width.
 */
export function useChartWidth(fallback = 640) {
  const [width, setWidth] = useState(fallback);
  const observer = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const instance = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const next = Math.round(entry.contentRect.width);
      if (next > 0)
        setWidth((previous) => (Math.abs(previous - next) > 1 ? next : previous));
    });
    instance.observe(node);
    observer.current = instance;
  }, []);

  return [ref, width] as const;
}
