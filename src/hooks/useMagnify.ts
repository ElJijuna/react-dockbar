import { useMemo, useState } from 'react';
import { DEFAULT_MAGNIFICATION } from '../constants';
import type { DockBarMagnificationConfig } from '../types';

export interface UseMagnifyResult {
  hoveredIndex: number | null;
  setHoveredIndex: (index: number | null) => void;
  getScale: (index: number) => number;
  transitionMs: number;
}

/**
 * macOS-dock-style magnification: the hovered item scales up to `scale`, and up to
 * `radius` neighbors on each side scale up proportionally less the further they are.
 */
export function useMagnify(
  config: boolean | DockBarMagnificationConfig | undefined,
): UseMagnifyResult {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const resolved = useMemo(() => {
    if (config === false) {
      return null;
    }
    if (config === true || config === undefined) {
      return DEFAULT_MAGNIFICATION;
    }
    return { ...DEFAULT_MAGNIFICATION, ...config };
  }, [config]);

  const getScale = useMemo(() => {
    if (!resolved || hoveredIndex === null) {
      return () => 1;
    }
    const { scale, radius } = resolved;
    return (index: number) => {
      const distance = Math.abs(index - hoveredIndex);
      if (distance > radius) {
        return 1;
      }
      const falloff = 1 - distance / (radius + 1);
      return 1 + (scale - 1) * falloff;
    };
  }, [resolved, hoveredIndex]);

  return {
    hoveredIndex,
    setHoveredIndex: resolved ? setHoveredIndex : () => {},
    getScale,
    transitionMs: resolved?.transitionMs ?? DEFAULT_MAGNIFICATION.transitionMs,
  };
}
