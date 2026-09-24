import type { CSSProperties, KeyboardEvent, MouseEvent, ReactElement } from 'react';
import { DOCKBAR_BACK_ID } from '../constants';
import type { DockBarAnimationPhase, DockBarNavDirection } from '../hooks/useDockBarNavigation';
import { useMagnify } from '../hooks/useMagnify';
import type { DockBarItem, DockBarMagnificationConfig, DockBarProps } from '../types';
import { DockBarItemButton } from './DockBarItemButton';
import styles from './DockBarLevel.module.css';

export interface DockBarLevelProps {
  items: DockBarItem[];
  phase: DockBarAnimationPhase;
  direction: DockBarNavDirection;
  animationDuration: number;
  magnification: boolean | DockBarMagnificationConfig | undefined;
  backAriaLabel?: string;
  itemClassName?: DockBarProps['itemClassName'];
  onActivate: (
    item: DockBarItem,
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  ) => void;
  onAnimationEnd: (event: {
    target: EventTarget | null;
    currentTarget: EventTarget | null;
  }) => void;
}

export const DockBarLevel = ({
  items,
  phase,
  direction,
  animationDuration,
  magnification,
  backAriaLabel,
  itemClassName,
  onActivate,
  onAnimationEnd,
}: DockBarLevelProps): ReactElement => {
  const { setHoveredIndex, getScale, transitionMs } = useMagnify(magnification);

  const style = { '--dockbar-transition-duration': `${animationDuration}ms` } as CSSProperties;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: level wrapper only tracks its own CSS animation lifecycle
    <div
      className={styles.level}
      data-dockbar-part="level"
      data-dockbar-phase={phase}
      data-dockbar-direction={direction ?? undefined}
      style={style}
      onAnimationEnd={onAnimationEnd}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      {items.map((item, index) => {
        const isBack = item.id === DOCKBAR_BACK_ID;
        return (
          <DockBarItemButton
            key={item.id}
            item={item}
            isBack={isBack}
            ariaLabel={isBack ? backAriaLabel : undefined}
            scale={getScale(index)}
            magnifyTransitionMs={transitionMs}
            onHover={(hovered) => setHoveredIndex(hovered ? index : null)}
            onActivate={onActivate}
            itemClassName={itemClassName}
          />
        );
      })}
    </div>
  );
};
