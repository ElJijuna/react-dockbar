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
   * Screen-reader text of the badge, e.g. "3 unread messages". Needed when `badge` is not plain
   * text or a number (a dot, an icon); otherwise `labels.badge` builds it from the value.
   */
  badgeLabel?: string;
  /**
   * Makes a leaf button a toggle (`aria-pressed`), e.g. for panels that can be open at the same
   * time. Controlled: flip it yourself in `onSelect`. Toggling never changes the active item.
   * Ignored on items with `children` or `href`.
   */
  pressed?: boolean;
  /**
   * Open windows of this app, shown as thumbnails in a panel over the item on hover (or on
   * click when there are two or more). Ignored on items with `children` or `href`.
   */
  previews?: DockBarPreview[];
  'aria-label'?: string;
}

/** One open window of an app, shown as a thumbnail in the item's previews panel. */
export interface DockBarPreview {
  id: string;
  /** Window title, shown under the thumbnail and used as its accessible name. */
  title: string;
  /** Any content: an `<img>`, `<canvas>`, `<video>`… Only mounted while the panel is open. */
  thumbnail: ReactNode;
  /** The window currently in front; marked with `aria-current`. */
  active?: boolean;
  /** Called when the thumbnail is activated. Closes the panel. */
  onSelect?: (event: DockBarPreviewEvent) => void;
  /** When set, a close button is shown (also `Delete` on the focused thumbnail). */
  onClose?: (event: DockBarPreviewEvent) => void;
}

export interface DockBarPreviewEvent {
  /** The dock item that owns the preview. */
  item: DockBarItem;
  preview: DockBarPreview;
  /** Breadcrumb of parent items leading to the dock item, root-first. */
  path: DockBarItem[];
  nativeEvent: globalThis.MouseEvent | globalThis.KeyboardEvent;
}

export interface DockBarPreviewDelay {
  /** Hover time in ms before the panel opens. Default 400. */
  open?: number;
  /** Time in ms the panel stays after the pointer leaves, to reach it across the gap. Default 200. */
  close?: number;
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
 * - `pill` (default): compact opaque rounded toolbar, small icons, filled active item.
 * - `glass`: translucent frosted panel, dot active indicator.
 * - `solid`: opaque panel, dot active indicator.
 */
export type DockBarVariant = 'pill' | 'glass' | 'solid';
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
  /** Accessible name of an item with open windows. Default: "Mail, 2 open windows". */
  previewsItem?: (label: string, count: number) => string;
  /**
   * Adds a text or number `badge` to the item's accessible name; `name` is the name without
   * it. Default: "Mail, 3 notifications" / "Mail, New". Not used when the item has `badgeLabel`.
   */
  badge?: (name: string, badge: string | number) => string;
  /** Accessible name of the previews panel. Default: "Mail windows". */
  previewsPanel?: (label: string) => string;
  /** Accessible name of a thumbnail's close button. Default: "Close Inbox". */
  closePreview?: (title: string) => string;
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
  /** Visual style. Default `'pill'`. */
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
  /**
   * Id of the item whose previews panel is open (controlled). Pass `null` for none. Use with
   * `onPreviewsOpenChange`.
   */
  openPreviewsId?: string | null;
  /** Called with the item id when a previews panel opens, and `null` when it closes. */
  onPreviewsOpenChange?: (itemId: string | null) => void;
  /** Hover delays of the previews panel. Default `{ open: 400, close: 200 }`. */
  previewDelay?: DockBarPreviewDelay;
  /** Translatable screen-reader texts; any omitted builder falls back to English. */
  labels?: DockBarLabels;
  className?: string;
  style?: CSSProperties;
  itemClassName?: string | ((item: DockBarItem, state: DockBarItemState) => string | undefined);
}
