import type { CSSProperties, KeyboardEvent, MouseEvent, ReactElement } from 'react';
import { useCallback, useRef } from 'react';
import { DOCKBAR_BACK_ID } from '../constants';
import type { DockBarAnimationPhase, DockBarNavDirection } from '../hooks/useDockBarNavigation';
import { useMagnify } from '../hooks/useMagnify';
import type {
  DockBarItem,
  DockBarMagnificationConfig,
  DockBarOrientation,
  DockBarProps,
} from '../types';
import { DockBarItemButton } from './DockBarItemButton';
import styles from './DockBarLevel.module.css';

export interface DockBarLevelProps {
  items: DockBarItem[];
  phase: DockBarAnimationPhase;
  direction: DockBarNavDirection;
  orientation: DockBarOrientation;
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
  orientation,
  animationDuration,
  magnification,
  backAriaLabel,
  itemClassName,
  onActivate,
  onAnimationEnd,
}: DockBarLevelProps): ReactElement => {
  const levelRef = useRef<HTMLDivElement>(null);
  const { hoveredIndex, getScale, update, reset, transitionMs } = useMagnify(
    magnification,
    orientation,
  );

  const getItemElements = useCallback(
    () =>
      Array.from(
        levelRef.current?.querySelectorAll<HTMLElement>('[data-dockbar-part="item"]') ?? [],
      ),
    [],
  );

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    update(orientation === 'vertical' ? event.clientY : event.clientX, getItemElements());
  };

  const handleItemFocus = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const center =
      orientation === 'vertical' ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
    update(center, getItemElements());
  };

  const style = { '--dockbar-transition-duration': `${animationDuration}ms` } as CSSProperties;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pointer tracking for magnification only; items are native buttons
    <div
      ref={levelRef}
      className={styles.level}
      data-dockbar-part="level"
      data-dockbar-phase={phase}
      data-dockbar-direction={direction ?? undefined}
      style={style}
      onAnimationEnd={onAnimationEnd}
      onMouseMove={handleMouseMove}
      onMouseLeave={reset}
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
            hovered={hoveredIndex === index}
            magnifyTransitionMs={transitionMs}
            onFocusItem={handleItemFocus}
            onBlurItem={reset}
            onActivate={onActivate}
            itemClassName={itemClassName}
          />
        );
      })}
    </div>
  );
};
