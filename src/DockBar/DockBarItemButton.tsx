import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, ReactElement } from 'react';
import type { DockBarItem, DockBarItemState, DockBarProps } from '../types';
import styles from './DockBarItemButton.module.css';

export interface DockBarItemButtonProps {
  item: DockBarItem;
  isBack: boolean;
  ariaLabel?: string;
  scale: number;
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
  ariaLabel,
  scale,
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
  const resolvedAriaLabel =
    ariaLabel ??
    item['aria-label'] ??
    (isParent ? `${item.label}, opens ${item.children?.length} more options` : item.label);
  const extraClassName =
    typeof itemClassName === 'function' ? itemClassName(item, state) : itemClassName;
  const className = [styles.item, isParent && styles.parent, isBack && styles.back, extraClassName]
    .filter(Boolean)
    .join(' ');

  const style = {
    '--dockbar-item-scale': scale,
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
        tabIndex={item.disabled ? -1 : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <button {...sharedProps} type="button" disabled={item.disabled}>
      {content}
    </button>
  );
};
