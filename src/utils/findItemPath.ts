import type { DockBarItem } from '../types';

/** Returns the root-first chain of items leading to (and including) `id`, or [] if absent. */
export function findItemPath(items: DockBarItem[], id: string): DockBarItem[] {
  for (const item of items) {
    if (item.id === id) {
      return [item];
    }
    if (item.children?.length) {
      const childPath = findItemPath(item.children, id);
      if (childPath.length) {
        return [item, ...childPath];
      }
    }
  }
  return [];
}
