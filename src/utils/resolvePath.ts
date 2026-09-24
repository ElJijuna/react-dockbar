import type { DockBarEntry, DockBarItem } from '../types';
import { isSeparator } from './isSeparator';

export interface ResolvedPath {
  /** Parent items for the ids that still resolve, root-first. */
  breadcrumb: DockBarItem[];
  /** Entries of the deepest level that resolves. */
  level: DockBarEntry[];
}

/**
 * Walks `pathIds` (sibling-unique ids of drilled-into parents) through the current `root`
 * entries, stopping at the first id that no longer exists or no longer has children.
 */
export function resolvePath(root: DockBarEntry[], pathIds: string[]): ResolvedPath {
  const breadcrumb: DockBarItem[] = [];
  let level = root;
  for (const id of pathIds) {
    const parent = level.find(
      (entry): entry is DockBarItem => !isSeparator(entry) && entry.id === id,
    );
    if (!parent?.children?.length) {
      break;
    }
    breadcrumb.push(parent);
    level = parent.children;
  }
  return { breadcrumb, level };
}
