import type { RefObject } from 'react';
import type { DockBarOrientation, DockBarPosition } from '../types';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

export type DockBarEdge = 'top' | 'bottom' | 'left' | 'right';

/** The viewport edge a pinned dock covers; `null` when it is rendered inline. */
export function resolveDockEdge(
  position: DockBarPosition,
  orientation: DockBarOrientation,
): DockBarEdge | null {
  if (position === 'inline') {
    return null;
  }
  if (orientation === 'vertical') {
    return position === 'right-center' || position.endsWith('-right') ? 'right' : 'left';
  }
  return position.startsWith('top-') ? 'top' : 'bottom';
}

/** CSS custom property, set on `<html>`, holding the space the dock takes from `edge`. */
export const insetProperty = (edge: DockBarEdge) => `--dockbar-inset-${edge}`;

/**
 * Publishes the space a pinned dock takes from its viewport edge (distance to the edge plus
 * its own thickness) as `--dockbar-inset-<edge>` on `<html>`, so pages can reserve it, e.g.
 * `padding-bottom: var(--dockbar-inset-bottom, 0px)`. Only the dock's thickness is measured —
 * it does not change while items magnify — so hovering never reflows the page.
 */
export function useViewportInset(
  containerRef: RefObject<HTMLElement | null>,
  position: DockBarPosition,
  orientation: DockBarOrientation,
  enabled = true,
): void {
  const edge = enabled ? resolveDockEdge(position, orientation) : null;

  useIsomorphicLayoutEffect(() => {
    const element = containerRef.current;
    if (!edge || !element) {
      return;
    }
    const root = document.documentElement;
    const property = insetProperty(edge);
    const vertical = edge === 'top' || edge === 'bottom';

    const update = () => {
      // The resolved `bottom`/`top`/... is the offset plus the safe-area inset, in px.
      const distance = Number.parseFloat(getComputedStyle(element)[edge]) || 0;
      const thickness = vertical ? element.offsetHeight : element.offsetWidth;
      root.style.setProperty(property, `${Math.round(distance + thickness)}px`);
    };

    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(element);
    // Safe-area insets and viewport units change with the window, not the dock.
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
      root.style.removeProperty(property);
    };
  }, [containerRef, edge]);
}
