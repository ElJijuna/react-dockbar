import type { DockBarEntry, DockBarSeparator } from '../types';

export function isSeparator(entry: DockBarEntry): entry is DockBarSeparator {
  return entry.type === 'separator';
}
