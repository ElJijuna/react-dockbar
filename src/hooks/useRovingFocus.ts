import type { FocusEvent, KeyboardEvent, RefObject } from 'react';
import { useCallback, useState } from 'react';
import type { DockBarOrientation } from '../types';

const FOCUSABLE_ITEM_SELECTOR = '[data-dockbar-item-id]:not(:disabled):not([aria-disabled="true"])';

export interface UseRovingFocusOptions {
  containerRef: RefObject<HTMLElement | null>;
  orientation: DockBarOrientation;
  /** Ids of the currently focusable items, in DOM order. */
  focusableIds: string[];
  /** Preferred tab stop when the user has not focused an item yet (e.g. the active item). */
  preferredId: string | null;
  /** Arrow keys are ignored while false (e.g. during level transitions). */
  enabled: boolean;
}

export interface UseRovingFocusResult {
  /** The single item that is reachable with Tab; every other item gets tabIndex -1. */
  tabStopId: string | null;
  handleFocus: (event: FocusEvent<HTMLElement>) => void;
  /** Returns true when the key was handled. */
  handleKeyDown: (event: KeyboardEvent<HTMLElement>) => boolean;
}

/**
 * WAI-ARIA toolbar keyboard pattern: one tab stop for the whole dock, arrow keys (wrapping)
 * move between items, Home/End jump to the ends. Honours vertical orientation and RTL.
 */
export function useRovingFocus({
  containerRef,
  orientation,
  focusableIds,
  preferredId,
  enabled,
}: UseRovingFocusOptions): UseRovingFocusResult {
  const [lastFocusedId, setLastFocusedId] = useState<string | null>(null);

  const tabStopId =
    lastFocusedId && focusableIds.includes(lastFocusedId)
      ? lastFocusedId
      : preferredId && focusableIds.includes(preferredId)
        ? preferredId
        : (focusableIds[0] ?? null);

  const handleFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    const item = event.target.closest<HTMLElement>('[data-dockbar-item-id]');
    const id = item?.dataset.dockbarItemId;
    if (id) {
      setLastFocusedId(id);
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const container = containerRef.current;
      if (!enabled || !container) {
        return false;
      }
      const vertical = orientation === 'vertical';
      const rtl = !vertical && getComputedStyle(container).direction === 'rtl';
      const nextKey = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
      const prevKey = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
      if (![nextKey, prevKey, 'Home', 'End'].includes(event.key)) {
        return false;
      }

      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_ITEM_SELECTOR));
      if (items.length === 0) {
        return false;
      }
      const current = items.indexOf(document.activeElement as HTMLElement);
      let target: number;
      if (event.key === 'Home') {
        target = 0;
      } else if (event.key === 'End') {
        target = items.length - 1;
      } else if (event.key === nextKey) {
        target = current === -1 ? 0 : (current + 1) % items.length;
      } else {
        target = current === -1 ? items.length - 1 : (current - 1 + items.length) % items.length;
      }

      event.preventDefault();
      items[target].focus();
      return true;
    },
    [containerRef, orientation, enabled],
  );

  return { tabStopId, handleFocus, handleKeyDown };
}
