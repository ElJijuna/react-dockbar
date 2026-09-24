import type { DockBarMagnificationConfig } from './types';

export const DOCKBAR_BACK_ID = '__dockbar-back__';

export const DEFAULT_ANIMATION_DURATION_MS = 260;

export const DEFAULT_MAGNIFICATION: Required<DockBarMagnificationConfig> = {
  scale: 1.6,
  distance: 140,
  transitionMs: 90,
};

export const DEFAULT_ARIA_LABEL = 'App dock';
export const DEFAULT_BACK_LABEL = 'Back';
