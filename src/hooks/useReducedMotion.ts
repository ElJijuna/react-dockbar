import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }
  const mediaQueryList = window.matchMedia(QUERY);
  mediaQueryList.addEventListener('change', callback);
  return () => mediaQueryList.removeEventListener('change', callback);
}

function getSnapshot() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

/** Reflects the live `prefers-reduced-motion: reduce` OS setting. SSR-safe (defaults to false). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
