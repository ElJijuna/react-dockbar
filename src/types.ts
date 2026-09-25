import type { AnchorHTMLAttributes, CSSProperties, ReactNode } from 'react';

export interface DockBarItem {
  type?: 'item';
  /** Stable unique id among its sibling array. Used for React keys and navigation. */
  id: string;
  label: string;
  icon: ReactNode;
  /** Presence of children turns the item into a drill-down trigger instead of a leaf action. */
  children?: DockBarEntry[];
  /** Called when a leaf item is activated. Never called for items that have children. */
  onSelect?: (event: DockBarSelectEvent) => void;
  href?: string;
  target?: AnchorHTMLAttributes<HTMLAnchorElement>['target'];
  disabled?: boolean;
  badge?: ReactNode;
  /**
   * Makes a leaf button a toggle (`aria-pressed`), e.g. for panels that can be open at the same
   * time. Controlled: flip it yourself in `onSelect`. Toggling never changes the active item.
   * Ignored on items with `children` or `href`.
   */
  pressed?: boolean;
  'aria-label'?: string;
}

/** Thin divider between groups of items. */
export interface DockBarSeparator {
  type: 'separator';
  id: string;
}

export type DockBarEntry = DockBarItem | DockBarSeparator;

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
/**
 * - `glass`: translucent frosted panel, dot active indicator.
 * - `solid`: opaque panel, dot active indicator.
 * - `pill`: compact opaque rounded toolbar, small icons, filled active item.
 */
export type DockBarVariant = 'glass' | 'solid' | 'pill';
export type DockBarSize = 'sm' | 'md' | 'lg';
export type DockBarOrientation = 'horizontal' | 'vertical';
/**
 * Where the dock is pinned in the viewport (`position: fixed`). `inline` keeps it in the normal
 * document flow so it can be placed inside your own layout.
 */
export type DockBarPosition =
  | 'bottom-center'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'top-left'
  | 'top-right'
  | 'left-center'
  | 'right-center'
  | 'inline';
export type DockBarReducedMotionMode = 'system' | 'always' | 'never';

export interface DockBarMagnificationConfig {
  /** Max scale reached by the item directly under the pointer. Default 1.6 */
  scale?: number;
  /** Pointer distance in px at which items stop being magnified. Default 140 */
  distance?: number;
  /** Size transition duration in ms, smoothing pointer movement. Default 90 */
  transitionMs?: number;
}

/**
 * Builders for the dynamic, screen-reader-facing texts. Functions (not templates) so each
 * language can handle its own grammar and plurals. The dock name and the Back label are set
 * with the `ariaLabel` and `backItem.label` props.
 */
export interface DockBarLabels {
  /** Accessible name of an item that opens a submenu. Default: "Settings, opens 3 more options". */
  parentItem?: (label: string, childCount: number) => string;
  /** Accessible name of Back when it returns to a named parent. Default: "Back to Settings". */
  backTo?: (parentLabel: string) => string;
  /** Announced after entering a submenu; `depth` is 1 for the first nested level. Default: "Settings, level 2". */
  enteredLevel?: (label: string, depth: number) => string;
  /** Announced after going back; `label` is null when returning to the root. Default: "Back to Settings" / "Back to main menu". */
  returnedTo?: (label: string | null) => string;
}

export interface DockBarItemState {
  hovered: boolean;
  isBack: boolean;
  /** This item is the active one. */
  active: boolean;
  /** The active item is nested somewhere inside this item's children. */
  containsActive: boolean;
  /** This item is a toggle that is currently on. */
  pressed: boolean;
}

export interface DockBarProps {
  items: DockBarEntry[];
  /**
   * Id of the active item (controlled). Parents of a nested active item are marked too.
   * Pass `null` for no active item.
   */
  activeId?: string | null;
  /** Initial active id when uncontrolled; activating a leaf item then makes it active. */
  defaultActiveId?: string | null;
  /**
   * Start inside the submenu that contains the active item (`activeId`/`defaultActiveId`)
   * instead of at the root. Applied on mount only: later `activeId` changes never move the
   * user away from the level they are browsing. Default `false`.
   */
  openActiveLevel?: boolean;
  colorScheme?: DockBarColorScheme;
  variant?: DockBarVariant;
  size?: DockBarSize;
  orientation?: DockBarOrientation;
  /**
   * Viewport position of the dock. Tune the distance to the edge with `--dockbar-offset`
   * (default 16px) and the stacking with `--dockbar-z-index` (default 1000). Use `inline` to
   * render it in the document flow. Default `'bottom-center'`.
   */
  position?: DockBarPosition;
  /**
   * `true` = the variant's default, `false` = disabled, object = overrides merged onto the
   * variant's default. Defaults: glass/solid `{ scale: 1.6, distance: 140 }`, pill
   * `{ scale: 1.25, distance: 90 }`. Default `true`.
   */
  magnification?: boolean | DockBarMagnificationConfig;
  /** Duration in ms of the collapse/expand level transition. Default 260. */
  animationDuration?: number;
  reducedMotion?: DockBarReducedMotionMode;
  backItem?: Partial<Pick<DockBarItem, 'label' | 'icon'>>;
  onNavigate?: (event: DockBarNavigateEvent) => void;
  ariaLabel?: string;
  /** Translatable screen-reader texts; any omitted builder falls back to English. */
  labels?: DockBarLabels;
  className?: string;
  style?: CSSProperties;
  itemClassName?: string | ((item: DockBarItem, state: DockBarItemState) => string | undefined);
}
