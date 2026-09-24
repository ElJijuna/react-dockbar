import type { CSSProperties, KeyboardEvent, MouseEvent, ReactElement } from 'react';
import { useState } from 'react';
import type { DockBarItem, DockBarProps } from '../types';
import styles from './DockBarBackButton.module.css';
import { DockBarItemButton } from './DockBarItemButton';

export interface DockBarBackButtonProps {
  item: DockBarItem;
  ariaLabel: string;
  /** Plays the exit animation while the dock collapses back to the root level. */
  leaving: boolean;
  animationDuration: number;
  itemClassName?: DockBarProps['itemClassName'];
  onActivate: (
    item: DockBarItem,
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  ) => void;
}

/** Circular Back control rendered beside (not inside) the dock while in a nested level. */
export const DockBarBackButton = ({
  item,
  ariaLabel,
  leaving,
  animationDuration,
  itemClassName,
  onActivate,
}: DockBarBackButtonProps): ReactElement => {
  const [hovered, setHovered] = useState(false);
  const style = { '--dockbar-transition-duration': `${animationDuration}ms` } as CSSProperties;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover tracking for the tooltip only; the child is a native button
    <div
      className={styles.backArea}
      data-dockbar-part="back-area"
      data-dockbar-leaving={leaving || undefined}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <DockBarItemButton
        item={item}
        isBack
        ariaLabel={ariaLabel}
        scale={1}
        hovered={hovered}
        active={false}
        containsActive={false}
        magnifyTransitionMs={0}
        onFocusItem={() => {}}
        onBlurItem={() => {}}
        onActivate={onActivate}
        itemClassName={itemClassName}
      />
    </div>
  );
};
