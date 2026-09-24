import type { AnchorHTMLAttributes, CSSProperties, ReactNode } from 'react';

export interface DockBarItem {
  /** Stable unique id among its sibling array. Used for React keys and navigation. */
  id: string;
  label: string;
  icon: ReactNode;
  /** Presence of children turns the item into a drill-down trigger instead of a leaf action. */
  children?: DockBarItem[];
  /** Called when a leaf item is activated. Never called for items that have children. */
  onSelect?: (event: DockBarSelectEvent) => void;
  href?: string;
  target?: AnchorHTMLAttributes<HTMLAnchorElement>['target'];
  disabled?: boolean;
  badge?: ReactNode;
  'aria-label'?: string;
}

export interface DockBarSelectEvent {
  item: DockBarItem;
  /** Breadcrumb of parent items leading to this item, root-first, excluding the item itself. */
  path: DockBarItem[];
  nativeEvent: globalThis.MouseEvent | globalThis.KeyboardEvent;
}

export interface DockBarNavigateEvent {
  direction: 'forward' | 'back';
  depth: number;
  path: DockBarItem[];
  item: DockBarItem;
}

export type DockBarColorScheme = 'light' | 'dark' | 'auto';
export type DockBarVariant = 'glass' | 'solid';
export type DockBarSize = 'sm' | 'md' | 'lg';
export type DockBarOrientation = 'horizontal' | 'vertical';
export type DockBarReducedMotionMode = 'system' | 'always' | 'never';

export interface DockBarMagnificationConfig {
  /** Max scale reached by the item directly under the pointer. Default 1.6 */
  scale?: number;
  /** Pointer distance in px at which items stop being magnified. Default 140 */
  distance?: number;
  /** Size transition duration in ms, smoothing pointer movement. Default 90 */
  transitionMs?: number;
}

export interface DockBarItemState {
  hovered: boolean;
  isBack: boolean;
}

export interface DockBarProps {
  items: DockBarItem[];
  colorScheme?: DockBarColorScheme;
  variant?: DockBarVariant;
  size?: DockBarSize;
  orientation?: DockBarOrientation;
  /** true = default magnification config, false = disabled, object = tuned config. Default true. */
  magnification?: boolean | DockBarMagnificationConfig;
  /** Duration in ms of the collapse/expand level transition. Default 260. */
  animationDuration?: number;
  reducedMotion?: DockBarReducedMotionMode;
  backItem?: Partial<Pick<DockBarItem, 'label' | 'icon'>>;
  onNavigate?: (event: DockBarNavigateEvent) => void;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
  itemClassName?: string | ((item: DockBarItem, state: DockBarItemState) => string | undefined);
}
