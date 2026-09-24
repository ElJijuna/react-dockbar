import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_MAGNIFICATION } from '../constants';
import type { DockBarMagnificationConfig, DockBarOrientation } from '../types';

export interface UseMagnifyResult {
  /** Index of the item closest to the pointer, or null when nothing is magnified. */
  hoveredIndex: number | null;
  getScale: (index: number) => number;
  /** Recompute scales from a pointer coordinate (clientX, or clientY when vertical). */
  update: (pointer: number, elements: HTMLElement[]) => void;
  reset: () => void;
  transitionMs: number;
}

/** Smooth bell curve: `maxScale` at distance 0, easing down to 1 at `range` px and beyond. */
export function scaleAtDistance(distance: number, maxScale: number, range: number): number {
  if (range <= 0 || distance >= range) {
    return 1;
  }
  const falloff = (1 + Math.cos((Math.PI * distance) / range)) / 2;
  return 1 + (maxScale - 1) * falloff;
}

/**
 * macOS-dock-style magnification: every item's size follows the pointer's distance to the
 * item's center, so neighbors grow continuously as the pointer glides across the dock.
 */
export function useMagnify(
  config: boolean | DockBarMagnificationConfig | undefined,
  orientation: DockBarOrientation,
): UseMagnifyResult {
  const [scales, setScales] = useState<number[] | null>(null);

  const resolved = useMemo(() => {
    if (config === false) {
      return null;
    }
    if (config === true || config === undefined) {
      return DEFAULT_MAGNIFICATION;
    }
    return { ...DEFAULT_MAGNIFICATION, ...config };
  }, [config]);

  const update = useCallback(
    (pointer: number, elements: HTMLElement[]) => {
      if (!resolved) {
        return;
      }
      setScales(
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          const center =
            orientation === 'vertical' ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
          return scaleAtDistance(Math.abs(pointer - center), resolved.scale, resolved.distance);
        }),
      );
    },
    [resolved, orientation],
  );

  const reset = useCallback(() => setScales(null), []);

  const activeScales = resolved ? scales : null;

  const hoveredIndex = useMemo(() => {
    if (!activeScales) {
      return null;
    }
    let best = -1;
    let bestScale = 1;
    activeScales.forEach((scale, index) => {
      if (scale > bestScale) {
        best = index;
        bestScale = scale;
      }
    });
    return best === -1 ? null : best;
  }, [activeScales]);

  const getScale = useCallback((index: number) => activeScales?.[index] ?? 1, [activeScales]);

  return {
    hoveredIndex,
    getScale,
    update,
    reset,
    transitionMs: resolved?.transitionMs ?? DEFAULT_MAGNIFICATION.transitionMs,
  };
}
