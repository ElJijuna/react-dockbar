import type { DockBarItem } from '../types';

/**
 * An item is a toggle button when it declares `pressed` and is a plain leaf button:
 * `aria-pressed` is not valid on links, and parents navigate instead of toggling.
 */
export function isToggleItem(item: DockBarItem): boolean {
  return item.pressed !== undefined && !item.href && !item.children?.length;
}
