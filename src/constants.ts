import type { DockBarLabels, DockBarMagnificationConfig } from './types';

export const DOCKBAR_BACK_ID = '__dockbar-back__';

export const DEFAULT_ANIMATION_DURATION_MS = 260;

export const DEFAULT_MAGNIFICATION: Required<DockBarMagnificationConfig> = {
  scale: 1.6,
  distance: 140,
  transitionMs: 90,
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
