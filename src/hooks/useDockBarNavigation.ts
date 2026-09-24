import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { DEFAULT_ANIMATION_DURATION_MS, DOCKBAR_BACK_ID } from '../constants';
import type { DockBarItem, DockBarNavigateEvent } from '../types';

export type DockBarAnimationPhase = 'idle' | 'collapsing' | 'expanding';
export type DockBarNavDirection = 'forward' | 'back' | null;

interface NavState {
  stack: DockBarItem[][];
  breadcrumb: DockBarItem[];
  phase: DockBarAnimationPhase;
  direction: DockBarNavDirection;
  pendingParent: DockBarItem | null;
  focusTargetId: string | null;
  lastEvent: DockBarNavigateEvent | null;
}

type NavAction =
  | { type: 'NAVIGATE_FORWARD'; item: DockBarItem }
  | { type: 'NAVIGATE_BACK' }
  | { type: 'COLLAPSE_END' }
  | { type: 'EXPAND_END' }
  | { type: 'CLEAR_EVENT' }
  | { type: 'RESET'; items: DockBarItem[] };

function createInitialState(items: DockBarItem[]): NavState {
  return {
    stack: [items],
    breadcrumb: [],
    phase: 'idle',
    direction: null,
    pendingParent: null,
    focusTargetId: null,
    lastEvent: null,
  };
}

function reducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case 'NAVIGATE_FORWARD': {
      if (state.phase !== 'idle' || !action.item.children?.length) {
        return state;
      }
      return { ...state, phase: 'collapsing', direction: 'forward', pendingParent: action.item };
    }
    case 'NAVIGATE_BACK': {
      if (state.phase !== 'idle' || state.stack.length <= 1) {
        return state;
      }
      const returningTo = state.breadcrumb[state.breadcrumb.length - 1];
      return { ...state, phase: 'collapsing', direction: 'back', pendingParent: returningTo };
    }
    case 'COLLAPSE_END': {
      if (state.phase !== 'collapsing') {
        return state;
      }
      if (state.direction === 'forward' && state.pendingParent) {
        return {
          ...state,
          stack: [...state.stack, state.pendingParent.children ?? []],
          breadcrumb: [...state.breadcrumb, state.pendingParent],
          phase: 'expanding',
        };
      }
      if (state.direction === 'back') {
        return {
          ...state,
          stack: state.stack.slice(0, -1),
          breadcrumb: state.breadcrumb.slice(0, -1),
          phase: 'expanding',
        };
      }
      return state;
    }
    case 'EXPAND_END': {
      if (state.phase !== 'expanding' || !state.direction || !state.pendingParent) {
        return state;
      }
      const depth = state.stack.length - 1;
      const focusTargetId =
        state.direction === 'forward' ? DOCKBAR_BACK_ID : state.pendingParent.id;
      const lastEvent: DockBarNavigateEvent = {
        direction: state.direction,
        depth,
        path: state.breadcrumb,
        item: state.pendingParent,
      };
      return {
        ...state,
        phase: 'idle',
        direction: null,
        pendingParent: null,
        focusTargetId,
        lastEvent,
      };
    }
    case 'CLEAR_EVENT':
      return state.lastEvent ? { ...state, lastEvent: null } : state;
    case 'RESET':
      return createInitialState(action.items);
    default:
      return state;
  }
}

export interface UseDockBarNavigationOptions {
  backItem: DockBarItem;
  animationDuration?: number;
  /** Skip waiting for CSS transitions entirely and resolve navigation synchronously. */
  instant?: boolean;
  onNavigate?: (event: DockBarNavigateEvent) => void;
}

export interface UseDockBarNavigationResult {
  levelItems: DockBarItem[];
  phase: DockBarAnimationPhase;
  direction: DockBarNavDirection;
  depth: number;
  breadcrumb: DockBarItem[];
  focusTargetId: string | null;
  navigateTo: (item: DockBarItem) => void;
  navigateBack: () => void;
  handleLevelAnimationEnd: (event: {
    target: EventTarget | null;
    currentTarget: EventTarget | null;
  }) => void;
}

/** Stack-based drill-down navigation state machine driving the DockBar's shrink/expand transitions. */
export function useDockBarNavigation(
  rootItems: DockBarItem[],
  {
    backItem,
    animationDuration = DEFAULT_ANIMATION_DURATION_MS,
    instant = false,
    onNavigate,
  }: UseDockBarNavigationOptions,
): UseDockBarNavigationResult {
  const [state, dispatch] = useReducer(reducer, rootItems, createInitialState);
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootItemsRef = useRef(rootItems);
  const isInstant = instant || animationDuration <= 0;

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Reset navigation state whenever the consumer swaps `items` to a different array.
  useEffect(() => {
    if (rootItemsRef.current !== rootItems) {
      rootItemsRef.current = rootItems;
      clearTimer();
      dispatch({ type: 'RESET', items: rootItems });
    }
  }, [rootItems, clearTimer]);

  // Drive phase progression: instantly when animations are disabled, otherwise via a
  // timeout safety net that only fires if the real `transitionend` event is dropped.
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

  // Fire the public onNavigate callback exactly once per completed navigation.
  useEffect(() => {
    if (state.lastEvent) {
      onNavigateRef.current?.(state.lastEvent);
      dispatch({ type: 'CLEAR_EVENT' });
    }
  }, [state.lastEvent]);

  const navigateTo = useCallback((item: DockBarItem) => {
    if (!item.children?.length) {
      return;
    }
    dispatch({ type: 'NAVIGATE_FORWARD', item });
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

  const depth = state.stack.length - 1;
  const rawLevel = state.stack[state.stack.length - 1];
  const levelItems = useMemo(
    () => (depth > 0 ? [backItem, ...rawLevel] : rawLevel),
    [depth, rawLevel, backItem],
  );

  return {
    levelItems,
    phase: state.phase,
    direction: state.direction,
    depth,
    breadcrumb: state.breadcrumb,
    focusTargetId: state.focusTargetId,
    navigateTo,
    navigateBack,
    handleLevelAnimationEnd,
  };
}
