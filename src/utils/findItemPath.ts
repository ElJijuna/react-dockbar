import type { DockBarEntry, DockBarItem } from '../types';
import { isSeparator } from './isSeparator';

/** Returns the root-first chain of items leading to (and including) `id`, or [] if absent. */
export function findItemPath(entries: DockBarEntry[], id: string): DockBarItem[] {
  for (const entry of entries) {
    if (isSeparator(entry)) {
      continue;
    }
    if (entry.id === id) {
      return [entry];
    }
    if (entry.children?.length) {
      const childPath = findItemPath(entry.children, id);
      if (childPath.length) {
        return [entry, ...childPath];
      }
    }
  }
  return [];
}
