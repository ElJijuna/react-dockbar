import type {
  CSSProperties,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactElement,
} from 'react';
import { DEFAULT_LABELS } from '../constants';
import type { DockBarItem, DockBarItemState, DockBarLabels, DockBarProps } from '../types';
import { getPreviews } from '../utils/getPreviews';
import { isSeparator } from '../utils/isSeparator';
import { isToggleItem } from '../utils/isToggleItem';
import styles from './DockBarItemButton.module.css';

export interface DockBarItemButtonProps {
  item: DockBarItem;
  isBack: boolean;
  /** Roving tabindex: 0 for the dock's single tab stop, -1 otherwise. */
  tabIndex: number;
  ariaLabel?: string;
  /** Builds the accessible name of items that open a submenu. */
  parentItemLabel?: Required<DockBarLabels>['parentItem'];
  /** Builds the accessible name of items with open windows. */
  previewsItemLabel?: Required<DockBarLabels>['previewsItem'];
  /** This item's previews panel is open; `previewsPanelId` is the panel's element id. */
  previewsOpen?: boolean;
  previewsPanelId?: string;
  onPreviewsHover?: (item: DockBarItem) => void;
  onPreviewsLeave?: () => void;
  hovered: boolean;
  active: boolean;
  containsActive: boolean;
  magnifyTransitionMs: number;
  onFocusItem: (element: HTMLElement) => void;
  onBlurItem: () => void;
  onActivate: (
    item: DockBarItem,
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  ) => void;
  itemClassName?: DockBarProps['itemClassName'];
}

export const DockBarItemButton = ({
  item,
  isBack,
  tabIndex,
  ariaLabel,
  parentItemLabel = DEFAULT_LABELS.parentItem,
  previewsItemLabel = DEFAULT_LABELS.previewsItem,
  previewsOpen = false,
  previewsPanelId,
  onPreviewsHover,
  onPreviewsLeave,
  hovered,
  active,
  containsActive,
  magnifyTransitionMs,
  onFocusItem,
  onBlurItem,
  onActivate,
  itemClassName,
}: DockBarItemButtonProps): ReactElement => {
  const isParent = !isBack && Boolean(item.children?.length);
  const isToggle = !isBack && isToggleItem(item);
  const pressed = isToggle && item.pressed === true;
  const state: DockBarItemState = { hovered, isBack, active, containsActive, pressed };
  const childCount = item.children?.filter((entry) => !isSeparator(entry)).length ?? 0;
  const previewCount = isBack ? 0 : getPreviews(item).length;
  const resolvedAriaLabel =
    ariaLabel ??
    item['aria-label'] ??
    (isParent
      ? parentItemLabel(item.label, childCount)
      : previewCount > 0
        ? previewsItemLabel(item.label, previewCount)
        : item.label);
  const extraClassName =
    typeof itemClassName === 'function' ? itemClassName(item, state) : itemClassName;
  const className = [styles.item, isParent && styles.parent, isBack && styles.back, extraClassName]
    .filter(Boolean)
    .join(' ');

  const style = {
    '--dockbar-magnify-transition': `${magnifyTransitionMs}ms`,
  } as CSSProperties;

  // Only keyboard focus magnifies; programmatic focus after navigation or a mouse click
  // must not magnify an item the pointer isn't over.
  const handleFocus = (event: FocusEvent<HTMLElement>) => {
    if (event.currentTarget.matches(':focus-visible')) {
      onFocusItem(event.currentTarget);
    }
  };

  // Touch has no hover: its taps open the panel through `onActivate` instead.
  const handlePointerEnter = (event: PointerEvent<HTMLElement>) => {
    if (previewCount > 0 && event.pointerType !== 'touch' && !item.disabled) {
      onPreviewsHover?.(item);
    }
  };

  const handlePointerLeave = (event: PointerEvent<HTMLElement>) => {
    if (previewCount > 0 && event.pointerType !== 'touch') {
      onPreviewsLeave?.();
    }
  };

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (item.disabled) {
      return;
    }
    onActivate(item, event);
  };

  const content = (
    <>
      <span className={styles.icon} aria-hidden="true">
        {item.icon}
      </span>
      <span className={styles.label} aria-hidden="true">
        {item.label}
      </span>
      {previewCount > 0 ? (
        <span className={styles.running} aria-hidden="true">
          {Array.from({ length: Math.min(previewCount, 3) }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: identical, purely decorative dots.
            <span key={index} className={styles.runningDot} />
          ))}
        </span>
      ) : null}
      {item.badge ? (
        <span className={styles.badge} aria-hidden="true">
          {item.badge}
        </span>
      ) : null}
    </>
  );

  const sharedProps = {
    className,
    style,
    'data-dockbar-part': 'item' as const,
    'data-dockbar-item-id': item.id,
    'data-dockbar-hovered': hovered || undefined,
    'data-dockbar-active': active ? 'self' : containsActive ? 'ancestor' : undefined,
    'aria-current': active ? (item.href ? ('page' as const) : true) : undefined,
    'data-dockbar-pressed': pressed || undefined,
    'data-dockbar-running': previewCount > 0 || undefined,
    'aria-label': resolvedAriaLabel,
    'aria-expanded': previewCount > 0 ? previewsOpen : undefined,
    'aria-controls': previewsOpen ? previewsPanelId : undefined,
    onFocus: handleFocus,
    onPointerEnter: handlePointerEnter,
    onPointerLeave: handlePointerLeave,
    onBlur: onBlurItem,
    onClick: handleClick,
  };

  if (item.href && !isParent && !isBack) {
    return (
      <a
        {...sharedProps}
        href={item.disabled ? undefined : item.href}
        target={item.target}
        rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
        aria-disabled={item.disabled || undefined}
        tabIndex={item.disabled ? -1 : tabIndex}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      {...sharedProps}
      type="button"
      disabled={item.disabled}
      tabIndex={tabIndex}
      aria-pressed={isToggle ? pressed : undefined}
    >
      {content}
    </button>
  );
};
