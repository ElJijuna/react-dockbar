import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { DEFAULT_ANIMATION_DURATION_MS, DOCKBAR_BACK_ID } from '../constants';
import type { DockBarEntry, DockBarItem, DockBarNavigateEvent } from '../types';
import { resolvePath } from '../utils/resolvePath';

export type DockBarAnimationPhase = 'idle' | 'collapsing' | 'expanding';
export type DockBarNavDirection = 'forward' | 'back' | null;

export interface DockBarFocusRequest {
  /** `data-dockbar-item-id` of the element to focus once navigation completes. */
  id: string;
}

interface CompletedNavigation {
  direction: 'forward' | 'back';
  pathIds: string[];
  itemId: string;
}

// Navigation is stored as ids only; levels are always derived from the live `items`, so a
// new `items` array (e.g. an inline literal re-created each render) never resets the dock.
interface NavState {
  pathIds: string[];
  phase: DockBarAnimationPhase;
  direction: DockBarNavDirection;
  /** Forward: id of the item being entered. Back: id of the item being left. */
  pendingId: string | null;
  /** New object per completed navigation, so repeated targets still trigger focus. */
  focusRequest: DockBarFocusRequest | null;
  lastEvent: CompletedNavigation | null;
}

type NavAction =
  | { type: 'NAVIGATE_FORWARD'; id: string }
  | { type: 'NAVIGATE_BACK' }
  | { type: 'COLLAPSE_END' }
  | { type: 'EXPAND_END' }
  | { type: 'CLEAR_EVENT' }
  | { type: 'SYNC_PATH'; pathIds: string[] };

const initialState: NavState = {
  pathIds: [],
  phase: 'idle',
  direction: null,
  pendingId: null,
  focusRequest: null,
  lastEvent: null,
};

function reducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case 'NAVIGATE_FORWARD':
      if (state.phase !== 'idle') {
        return state;
      }
      return { ...state, phase: 'collapsing', direction: 'forward', pendingId: action.id };
    case 'NAVIGATE_BACK': {
      if (state.phase !== 'idle' || state.pathIds.length === 0) {
        return state;
      }
      const leavingId = state.pathIds[state.pathIds.length - 1];
      return { ...state, phase: 'collapsing', direction: 'back', pendingId: leavingId };
    }
    case 'COLLAPSE_END':
      if (state.phase !== 'collapsing' || !state.pendingId) {
        return state;
      }
      return {
        ...state,
        phase: 'expanding',
        pathIds:
          state.direction === 'forward'
            ? [...state.pathIds, state.pendingId]
            : state.pathIds.slice(0, -1),
      };
    case 'EXPAND_END':
      if (state.phase !== 'expanding' || !state.direction || !state.pendingId) {
        return state;
      }
      return {
        ...state,
        phase: 'idle',
        direction: null,
        pendingId: null,
        focusRequest: { id: state.direction === 'forward' ? DOCKBAR_BACK_ID : state.pendingId },
        lastEvent: {
          direction: state.direction,
          pathIds: state.pathIds,
          itemId: state.pendingId,
        },
      };
    case 'CLEAR_EVENT':
      return state.lastEvent ? { ...state, lastEvent: null } : state;
    case 'SYNC_PATH':
      return { ...state, pathIds: action.pathIds };
    default:
      return state;
  }
}

export interface UseDockBarNavigationOptions {
  animationDuration?: number;
  /** Skip waiting for CSS transitions entirely and resolve navigation synchronously. */
  instant?: boolean;
  onNavigate?: (event: DockBarNavigateEvent) => void;
}

export interface UseDockBarNavigationResult {
  levelItems: DockBarEntry[];
  phase: DockBarAnimationPhase;
  direction: DockBarNavDirection;
  depth: number;
  breadcrumb: DockBarItem[];
  focusRequest: DockBarFocusRequest | null;
  navigateTo: (item: DockBarItem) => void;
  navigateBack: () => void;
  handleLevelAnimationEnd: (event: {
    target: EventTarget | null;
    currentTarget: EventTarget | null;
  }) => void;
}

/** Stack-based drill-down navigation state machine driving the DockBar's shrink/expand transitions. */
export function useDockBarNavigation(
  rootItems: DockBarEntry[],
  {
    animationDuration = DEFAULT_ANIMATION_DURATION_MS,
    instant = false,
    onNavigate,
  }: UseDockBarNavigationOptions,
): UseDockBarNavigationResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInstant = instant || animationDuration <= 0;

  const { breadcrumb, level } = useMemo(
    () => resolvePath(rootItems, state.pathIds),
    [rootItems, state.pathIds],
  );

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // If the consumer removed a parent we are inside, drop the ids that no longer resolve so
  // the dock settles on the deepest level that still exists.
  useEffect(() => {
    if (breadcrumb.length < state.pathIds.length) {
      dispatch({ type: 'SYNC_PATH', pathIds: breadcrumb.map((item) => item.id) });
    }
  }, [breadcrumb, state.pathIds]);

  // Drive phase progression: instantly when animations are disabled, otherwise via a
  // timeout safety net that only fires if the real `animationend` event is dropped.
  useEffect(() => {
    if (state.phase === 'idle') {
      return;
    }
    const nextAction = state.phase === 'collapsing' ? 'COLLAPSE_END' : 'EXPAND_END';
    if (isInstant) {
      dispatch({ type: nextAction });
      return;
    }
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      dispatch({ type: nextAction });
    }, animationDuration + 50);
    return clearTimer;
  }, [state.phase, isInstant, animationDuration, clearTimer]);

  // Fire the public onNavigate callback exactly once per completed navigation, resolving the
  // ids against the current items.
  useEffect(() => {
    const completed = state.lastEvent;
    if (!completed) {
      return;
    }
    dispatch({ type: 'CLEAR_EVENT' });
    const resolved = resolvePath(rootItems, completed.pathIds);
    const item =
      completed.direction === 'forward'
        ? resolved.breadcrumb[resolved.breadcrumb.length - 1]
        : resolved.level.find(
            (entry): entry is DockBarItem =>
              entry.type !== 'separator' && entry.id === completed.itemId,
          );
    if (item?.id !== completed.itemId) {
      return;
    }
    onNavigateRef.current?.({
      direction: completed.direction,
      depth: resolved.breadcrumb.length,
      path: resolved.breadcrumb,
      item,
    });
  }, [state.lastEvent, rootItems]);

  const navigateTo = useCallback((item: DockBarItem) => {
    if (!item.children?.length) {
      return;
    }
    dispatch({ type: 'NAVIGATE_FORWARD', id: item.id });
  }, []);

  const navigateBack = useCallback(() => {
    dispatch({ type: 'NAVIGATE_BACK' });
  }, []);

  const handleLevelAnimationEnd = useCallback(
    (event: { target: EventTarget | null; currentTarget: EventTarget | null }) => {
      if (event.target !== event.currentTarget) {
        return;
      }
      if (isInstant || state.phase === 'idle') {
        return;
      }
      clearTimer();
      dispatch({ type: state.phase === 'collapsing' ? 'COLLAPSE_END' : 'EXPAND_END' });
    },
    [state.phase, isInstant, clearTimer],
  );

  return {
    levelItems: level,
    phase: state.phase,
    direction: state.direction,
    depth: breadcrumb.length,
    breadcrumb,
    focusRequest: state.focusRequest,
    navigateTo,
    navigateBack,
    handleLevelAnimationEnd,
  };
}
