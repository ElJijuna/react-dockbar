import type { FocusEvent, PointerEvent, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

export const REVEAL_ZONE_SELECTOR = '[data-dockbar-part="reveal-zone"]';

export interface UseAutoHideOptions {
  enabled: boolean;
  /** ms the dock stays after the pointer leaves and focus moves out. */
  delay: number;
  containerRef: RefObject<HTMLElement | null>;
  /** Something that must stay on screen is open (e.g. a previews panel). */
  keepVisible: boolean;
}

export interface UseAutoHideResult {
  hidden: boolean;
  /** For both the dock and the reveal zone along its edge. */
  handlePointerEnter: (event: PointerEvent<HTMLElement>) => void;
  handlePointerLeave: (event: PointerEvent<HTMLElement>) => void;
  handleFocus: () => void;
  handleBlur: (event: FocusEvent<HTMLElement>) => void;
}

/**
 * macOS-style auto-hide: the dock stays off-screen until the pointer reaches its edge, the
 * pointer is over it, or focus is inside it (so Tab always reveals it). It hides again `delay`
 * ms after none of that holds. A touch reveal has no pointer leave to rely on, so it lasts until
 * the next touch outside the dock.
 */
export function useAutoHide({
  enabled,
  delay,
  containerRef,
  keepVisible,
}: UseAutoHideOptions): UseAutoHideResult {
  const [pointerInside, setPointerInside] = useState(false);
  const [touchRevealed, setTouchRevealed] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const [hidden, setHidden] = useState(enabled);

  const wanted = !enabled || pointerInside || touchRevealed || focusInside || keepVisible;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (wanted) {
      setHidden(false);
      return;
    }
    timerRef.current = setTimeout(() => setHidden(true), delay);
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [wanted, delay]);

  useEffect(() => {
    if (!touchRevealed) {
      return;
    }
    const handlePointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as Element;
      // The reveal zone counts as part of the dock: its tap is what revealed it.
      if (!containerRef.current?.contains(target) && !target.closest?.(REVEAL_ZONE_SELECTOR)) {
        setTouchRevealed(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [touchRevealed, containerRef]);

  const handlePointerEnter = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') {
      setTouchRevealed(true);
    } else {
      setPointerInside(true);
    }
  }, []);

  const handlePointerLeave = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') {
      setPointerInside(false);
    }
  }, []);

  const handleFocus = useCallback(() => setFocusInside(true), []);

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      if (!containerRef.current?.contains(event.relatedTarget)) {
        setFocusInside(false);
      }
    },
    [containerRef],
  );

  return {
    hidden: enabled && hidden,
    handlePointerEnter,
    handlePointerLeave,
    handleFocus,
    handleBlur,
  };
}
