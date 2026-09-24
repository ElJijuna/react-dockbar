import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, ReactElement } from 'react';
import type { DockBarItem, DockBarItemState, DockBarProps } from '../types';
import styles from './DockBarItemButton.module.css';

export interface DockBarItemButtonProps {
  item: DockBarItem;
  isBack: boolean;
  ariaLabel?: string;
  scale: number;
  magnifyTransitionMs: number;
  onHover: (hovered: boolean) => void;
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
  magnifyTransitionMs,
  onHover,
  onActivate,
  itemClassName,
}: DockBarItemButtonProps): ReactElement => {
  const isParent = !isBack && Boolean(item.children?.length);
  const state: DockBarItemState = { hovered: scale > 1, isBack };
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
    transitionDuration: `${magnifyTransitionMs}ms`,
  } as CSSProperties;

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (item.disabled) {
      return;
    }
    onActivate(item, event);
  };

  const handleFocus = (_event: FocusEvent<HTMLElement>) => onHover(true);
  const handleBlur = (_event: FocusEvent<HTMLElement>) => onHover(false);

  const content = (
    <>
      <span className={styles.icon}>{item.icon}</span>
      <span className={styles.label}>{item.label}</span>
      {item.badge ? <span className={styles.badge}>{item.badge}</span> : null}
    </>
  );

  const sharedProps = {
    className,
    style,
    'data-dockbar-part': 'item' as const,
    'data-dockbar-item-id': item.id,
    'aria-label': resolvedAriaLabel,
    onMouseEnter: () => onHover(true),
    onMouseLeave: () => onHover(false),
    onFocus: handleFocus,
    onBlur: handleBlur,
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
