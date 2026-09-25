import { useCallback, useEffect, useRef, useState } from 'react';
import type { DockBarPreviewDelay } from '../types';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

export interface UsePreviewsStateOptions {
  /** Controlled open item id; `undefined` leaves the state uncontrolled. */
  openId: string | null | undefined;
  onOpenChange?: (itemId: string | null) => void;
  delay: Required<DockBarPreviewDelay>;
}

export interface UsePreviewsStateResult {
  openId: string | null;
  /** Opened by a click or the keyboard: stays open until dismissed, ignoring hover. */
  pinned: boolean;
  open: (itemId: string, options?: { pinned?: boolean }) => void;
  close: () => void;
  /** Pointer entered an item with previews: open it after the hover delay. */
  hoverItem: (itemId: string) => void;
  /** Pointer left the item or the panel: close after the grace delay. */
  leave: () => void;
  /** Pointer reached the panel (or came back to its item): keep it open. */
  cancelClose: () => void;
}

/**
 * Open/close state of the previews panel. Hover opens it after `delay.open` and closes it
 * `delay.close` after the pointer leaves, so the pointer can cross the gap into the panel.
 * Once a panel is showing, moving to another item with previews switches immediately.
 */
export function usePreviewsState({
  openId: controlledOpenId,
  onOpenChange,
  delay,
}: UsePreviewsStateOptions): UsePreviewsStateResult {
  const [uncontrolledOpenId, setUncontrolledOpenId] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const isControlled = controlledOpenId !== undefined;
  const openId = isControlled ? controlledOpenId : uncontrolledOpenId;

  // Timers fire after renders: read the latest state from refs, not stale closures.
  const openIdRef = useRef(openId);
  const pinnedRef = useRef(pinned);
  const onOpenChangeRef = useRef(onOpenChange);
  useIsomorphicLayoutEffect(() => {
    openIdRef.current = openId;
    pinnedRef.current = pinned;
    onOpenChangeRef.current = onOpenChange;
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  useEffect(() => clearTimer, [clearTimer]);

  const commit = useCallback(
    (itemId: string | null, nextPinned: boolean) => {
      clearTimer();
      pinnedRef.current = nextPinned;
      setPinned(nextPinned);
      if (itemId === openIdRef.current) {
        return;
      }
      openIdRef.current = itemId;
      if (!isControlled) {
        setUncontrolledOpenId(itemId);
      }
      onOpenChangeRef.current?.(itemId);
    },
    [clearTimer, isControlled],
  );

  const open = useCallback(
    (itemId: string, options?: { pinned?: boolean }) => commit(itemId, options?.pinned ?? false),
    [commit],
  );
  const close = useCallback(() => commit(null, false), [commit]);

  const hoverItem = useCallback(
    (itemId: string) => {
      if (pinnedRef.current) {
        return;
      }
      clearTimer();
      if (openIdRef.current === itemId) {
        return;
      }
      const wait = openIdRef.current === null ? delay.open : 0;
      timerRef.current = setTimeout(() => commit(itemId, false), wait);
    },
    [clearTimer, commit, delay.open],
  );

  const leave = useCallback(() => {
    if (pinnedRef.current) {
      return;
    }
    clearTimer();
    if (openIdRef.current === null) {
      return;
    }
    timerRef.current = setTimeout(() => commit(null, false), delay.close);
  }, [clearTimer, commit, delay.close]);

  const cancelClose = useCallback(() => {
    if (openIdRef.current !== null) {
      clearTimer();
    }
  }, [clearTimer]);

  return { openId, pinned, open, close, hoverItem, leave, cancelClose };
}
