import type { CSSProperties, KeyboardEvent, MouseEvent, ReactElement } from 'react';
import { useState } from 'react';
import type { DockBarItem, DockBarProps } from '../types';
import styles from './DockBarBackButton.module.css';
import { DockBarItemButton } from './DockBarItemButton';

export interface DockBarBackButtonProps {
  /** Skip the entrance animation (the bubble was already there when the dock mounted). */
  skipIntro: boolean;
  item: DockBarItem;
  ariaLabel: string;
  /** Plays the exit animation while the dock collapses back to the root level. */
  leaving: boolean;
  tabIndex: number;
  animationDuration: number;
  itemClassName?: DockBarProps['itemClassName'];
  onActivate: (
    item: DockBarItem,
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  ) => void;
}

/** Circular Back control rendered beside (not inside) the dock while in a nested level. */
export const DockBarBackButton = ({
  skipIntro: skipIntroProp,
  item,
  ariaLabel,
  leaving,
  tabIndex,
  animationDuration,
  itemClassName,
  onActivate,
}: DockBarBackButtonProps): ReactElement => {
  const [hovered, setHovered] = useState(false);
  // Decided once per bubble: later bubbles (after real navigation) animate normally.
  const [skipIntro] = useState(skipIntroProp);
  const style = { '--dockbar-transition-duration': `${animationDuration}ms` } as CSSProperties;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover tracking for the tooltip only; the child is a native button
    <div
      className={styles.backArea}
      data-dockbar-part="back-area"
      data-dockbar-leaving={leaving || undefined}
      data-dockbar-static={skipIntro || undefined}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <DockBarItemButton
        item={item}
        isBack
        tabIndex={tabIndex}
        ariaLabel={ariaLabel}
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
