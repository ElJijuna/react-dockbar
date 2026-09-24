import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, ReactElement } from 'react';
import { DEFAULT_LABELS } from '../constants';
import type { DockBarItem, DockBarItemState, DockBarLabels, DockBarProps } from '../types';
import { isSeparator } from '../utils/isSeparator';
import styles from './DockBarItemButton.module.css';

export interface DockBarItemButtonProps {
  item: DockBarItem;
  isBack: boolean;
  /** Roving tabindex: 0 for the dock's single tab stop, -1 otherwise. */
  tabIndex: number;
  ariaLabel?: string;
  /** Builds the accessible name of items that open a submenu. */
  parentItemLabel?: Required<DockBarLabels>['parentItem'];
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
  const state: DockBarItemState = { hovered, isBack, active, containsActive };
  const childCount = item.children?.filter((entry) => !isSeparator(entry)).length ?? 0;
  const resolvedAriaLabel =
    ariaLabel ??
    item['aria-label'] ??
    (isParent ? parentItemLabel(item.label, childCount) : item.label);
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
    'aria-label': resolvedAriaLabel,
    onFocus: handleFocus,
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
    <button {...sharedProps} type="button" disabled={item.disabled} tabIndex={tabIndex}>
      {content}
    </button>
  );
};
