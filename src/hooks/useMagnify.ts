import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_MAGNIFICATION_BY_VARIANT } from '../constants';
import type { DockBarMagnificationConfig, DockBarOrientation, DockBarVariant } from '../types';

const ITEM_SELECTOR = '[data-dockbar-part="item"]';
const SCALE_PROPERTY = '--dockbar-item-scale';

export interface UseMagnifyResult {
  /** Index of the item closest to the pointer, or null when nothing is magnified. */
  hoveredIndex: number | null;
  handlePointerEnter: (event: ReactPointerEvent<HTMLElement>) => void;
  handlePointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  handlePointerLeave: () => void;
  /** Magnify around a keyboard-focused item. */
  focusItem: (element: HTMLElement) => void;
  blurItem: () => void;
  /** Drop cached item positions (call when the items change). */
  invalidate: () => void;
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
 * macOS-dock-style magnification. Item centers are measured once, unmagnified, when the
 * pointer enters, so scales never feed back into their own measurement. Pointer moves are
 * coalesced to one update per animation frame and written straight to each item's
 * `--dockbar-item-scale`; React only re-renders when the closest item changes.
 */
export function useMagnify(
  config: boolean | DockBarMagnificationConfig | undefined,
  variant: DockBarVariant,
  orientation: DockBarOrientation,
  levelRef: RefObject<HTMLElement | null>,
): UseMagnifyResult {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const centersRef = useRef<number[] | null>(null);
  const pointerInsideRef = useRef(false);
  const pendingPointerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const magnifiedRef = useRef(false);
  /** When items last started shrinking back to 1; until they finish, rects are still magnified. */
  const settledAtRef = useRef(0);

  // Resolve against the variant's defaults, memoized on primitives so an inline config object
  // (a new identity every render) does not recreate every handler.
  const defaults = DEFAULT_MAGNIFICATION_BY_VARIANT[variant];
  const custom = typeof config === 'object' ? config : undefined;
  const enabled = config !== false;
  const scale = custom?.scale ?? defaults.scale;
  const distance = custom?.distance ?? defaults.distance;
  const transitionMs = custom?.transitionMs ?? defaults.transitionMs;
  const resolved = useMemo(
    () => (enabled ? { scale, distance, transitionMs } : null),
    [enabled, scale, distance, transitionMs],
  );

  const getItems = useCallback(
    () => Array.from(levelRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []),
    [levelRef],
  );

  const centerOf = useCallback(
    (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return orientation === 'vertical' ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
    },
    [orientation],
  );

  const measure = useCallback(() => {
    centersRef.current = getItems().map(centerOf);
    return centersRef.current;
  }, [getItems, centerOf]);

  /** Cached centers, re-measured only when items are at rest (unmagnified). */
  const baseCenters = useCallback(() => {
    const atRest = performance.now() >= settledAtRef.current;
    if (!centersRef.current || (atRest && !magnifiedRef.current)) {
      return measure();
    }
    return centersRef.current;
  }, [measure]);

  const apply = useCallback(
    (pointer: number | null) => {
      const items = getItems();
      const centers = centersRef.current;
      let closest: number | null = null;
      let closestScale = 1;
      items.forEach((element, index) => {
        const center = centers?.[index];
        const itemScale =
          resolved && pointer !== null && center !== undefined
            ? scaleAtDistance(Math.abs(pointer - center), resolved.scale, resolved.distance)
            : 1;
        element.style.setProperty(SCALE_PROPERTY, String(itemScale));
        if (itemScale > closestScale) {
          closest = index;
          closestScale = itemScale;
        }
      });
      if (magnifiedRef.current && closest === null) {
        settledAtRef.current = performance.now() + transitionMs;
      }
      magnifiedRef.current = closest !== null;
      setHoveredIndex(closest);
    },
    [getItems, resolved, transitionMs],
  );

  const cancelFrame = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cancelFrame();
    apply(null);
  }, [cancelFrame, apply]);

  const pointerCoordinate = useCallback(
    (event: ReactPointerEvent<HTMLElement>) =>
      orientation === 'vertical' ? event.clientY : event.clientX,
    [orientation],
  );

  const handlePointerEnter = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType === 'touch' || !resolved) {
        return;
      }
      pointerInsideRef.current = true;
      baseCenters();
    },
    [resolved, baseCenters],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      // Touch has no hover: a tap would otherwise leave an item stuck magnified.
      if (event.pointerType === 'touch' || !resolved) {
        return;
      }
      pointerInsideRef.current = true;
      pendingPointerRef.current = pointerCoordinate(event);
      if (frameRef.current !== null) {
        return;
      }
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        if (!centersRef.current) {
          measure();
        }
        apply(pendingPointerRef.current);
      });
    },
    [resolved, pointerCoordinate, measure, apply],
  );
  const handlePointerLeave = useCallback(() => {
    pointerInsideRef.current = false;
    reset();
  }, [reset]);

  const focusItem = useCallback(
    (element: HTMLElement) => {
      if (!resolved || pointerInsideRef.current) {
        return;
      }
      const centers = baseCenters();
      const index = getItems().indexOf(element);
      apply(centers[index] ?? centerOf(element));
    },
    [resolved, baseCenters, getItems, apply, centerOf],
  );

  // Keyboard blur must not undo magnification that the pointer is still driving.
  const blurItem = useCallback(() => {
    if (!pointerInsideRef.current) {
      reset();
    }
  }, [reset]);

  const invalidate = useCallback(() => {
    centersRef.current = null;
  }, []);

  // Cached centers are viewport coordinates: scrolling or resizing makes them stale.
  useEffect(() => {
    window.addEventListener('scroll', invalidate, { capture: true, passive: true });
    window.addEventListener('resize', invalidate);
    return () => {
      window.removeEventListener('scroll', invalidate, { capture: true });
      window.removeEventListener('resize', invalidate);
    };
  }, [invalidate]);

  useEffect(() => {
    if (!resolved) {
      reset();
    }
  }, [resolved, reset]);

  useEffect(() => cancelFrame, [cancelFrame]);

  return {
    hoveredIndex,
    handlePointerEnter,
    handlePointerMove,
    handlePointerLeave,
    focusItem,
    blurItem,
    invalidate,
    transitionMs,
  };
}
