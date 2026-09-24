import { fireEvent } from '@testing-library/react';

/**
 * jsdom never fires real `animationend` events, so tests drive the DockBar navigation
 * state machine explicitly by firing the exact event shape `handleLevelAnimationEnd`
 * listens for (see useDockBarNavigation.ts): a same-target animation end on the level
 * wrapper itself, not a bubbled event from a child item's own hover/magnify transition.
 */
export function endLevelTransition(container: ParentNode): void {
  const level = container.querySelector('[data-dockbar-part="level"]');
  if (!level) {
    throw new Error('endLevelTransition: no [data-dockbar-part="level"] element found');
  }
  fireEvent.animationEnd(level);
}
