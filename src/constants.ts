import type { DockBarLabels, DockBarMagnificationConfig, DockBarVariant } from './types';

export const DOCKBAR_BACK_ID = '__dockbar-back__';

export const DEFAULT_ANIMATION_DURATION_MS = 260;

const DOCK_MAGNIFICATION: Required<DockBarMagnificationConfig> = {
  scale: 1.6,
  distance: 140,
  transitionMs: 90,
};

/**
 * Magnification used when `magnification` is `true`/omitted, and the base that a partial
 * config object is merged onto. The compact `pill` toolbar gets a subtler effect that stays
 * inside its rounded bar.
 */
export const DEFAULT_MAGNIFICATION_BY_VARIANT: Record<
  DockBarVariant,
  Required<DockBarMagnificationConfig>
> = {
  glass: DOCK_MAGNIFICATION,
  solid: DOCK_MAGNIFICATION,
  pill: { scale: 1.25, distance: 90, transitionMs: 90 },
};

export const DEFAULT_ARIA_LABEL = 'App dock';
export const DEFAULT_BACK_LABEL = 'Back';

export const DEFAULT_LABELS: Required<DockBarLabels> = {
  parentItem: (label, childCount) =>
    `${label}, opens ${childCount} more ${childCount === 1 ? 'option' : 'options'}`,
  backTo: (parentLabel) => `Back to ${parentLabel}`,
  enteredLevel: (label, depth) => `${label}, level ${depth + 1}`,
  returnedTo: (label) => (label ? `Back to ${label}` : 'Back to main menu'),
};
