import type { DockBarItem, DockBarPreview } from '../types';

/**
 * The open windows of a plain leaf item. Parents navigate and links follow their `href`
 * instead, so previews are ignored on them (like `pressed`).
 */
export function getPreviews(item: DockBarItem): DockBarPreview[] {
  if (item.href || item.children?.length || !item.previews) {
    return [];
  }
  return item.previews;
}
