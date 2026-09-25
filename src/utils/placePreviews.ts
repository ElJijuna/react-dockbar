import type { DockBarOrientation, DockBarPosition } from '../types';

export type DockBarPreviewSide = 'top' | 'bottom' | 'left' | 'right';

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Size {
  width: number;
  height: number;
}

/** The panel opens away from the screen edge the dock is pinned to. */
export function resolvePreviewSide(
  position: DockBarPosition,
  orientation: DockBarOrientation,
): DockBarPreviewSide {
  if (orientation === 'vertical') {
    return position === 'right-center' || position.endsWith('-right') ? 'left' : 'right';
  }
  return position.startsWith('top-') ? 'bottom' : 'top';
}

/**
 * Viewport coordinates of the panel's top-left corner: `gap` px from the anchor on `side`,
 * centered on it along the other axis and kept `margin` px inside the viewport.
 */
export function placePreviews(
  anchor: Rect,
  panel: Size,
  side: DockBarPreviewSide,
  viewport: Size,
  gap = 12,
  margin = 8,
): { left: number; top: number } {
  const clamp = (value: number, size: number, max: number) =>
    Math.max(margin, Math.min(value, max - size - margin));

  if (side === 'top' || side === 'bottom') {
    const left = anchor.left + anchor.width / 2 - panel.width / 2;
    const top = side === 'top' ? anchor.top - gap - panel.height : anchor.top + anchor.height + gap;
    return { left: clamp(left, panel.width, viewport.width), top };
  }
  const top = anchor.top + anchor.height / 2 - panel.height / 2;
  const left = side === 'left' ? anchor.left - gap - panel.width : anchor.left + anchor.width + gap;
  return { left, top: clamp(top, panel.height, viewport.height) };
}
