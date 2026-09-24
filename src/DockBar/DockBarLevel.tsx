import type { CSSProperties, KeyboardEvent, MouseEvent, ReactElement } from 'react';
import { useCallback, useRef } from 'react';
import type { DockBarAnimationPhase, DockBarNavDirection } from '../hooks/useDockBarNavigation';
import { useMagnify } from '../hooks/useMagnify';
import type {
  DockBarEntry,
  DockBarItem,
  DockBarLabels,
  DockBarMagnificationConfig,
  DockBarOrientation,
  DockBarProps,
} from '../types';
import { isSeparator } from '../utils/isSeparator';
import { DockBarItemButton } from './DockBarItemButton';
import styles from './DockBarLevel.module.css';

export interface DockBarLevelProps {
  items: DockBarEntry[];
  phase: DockBarAnimationPhase;
  direction: DockBarNavDirection;
  orientation: DockBarOrientation;
  animationDuration: number;
  magnification: boolean | DockBarMagnificationConfig | undefined;
  /** Root-first ids of the active item and its ancestors. */
  activePathIds: string[];
  /** Id of the single item reachable with Tab (roving tabindex). */
  tabStopId: string | null;
  parentItemLabel: Required<DockBarLabels>['parentItem'];
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
  activePathIds,
  tabStopId,
  parentItemLabel,
  itemClassName,
  onActivate,
  onAnimationEnd,
}: DockBarLevelProps): ReactElement => {
  const activeId = activePathIds[activePathIds.length - 1];
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
  let itemIndex = -1;

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
      {items.map((entry) => {
        if (isSeparator(entry)) {
          return (
            <hr
              key={entry.id}
              aria-orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'}
              className={styles.separator}
              data-dockbar-part="separator"
            />
          );
        }
        const item = entry;
        // Magnification indexes only real items, matching the queried item elements.
        itemIndex += 1;
        const index = itemIndex;
        return (
          <DockBarItemButton
            key={item.id}
            item={item}
            isBack={false}
            tabIndex={item.id === tabStopId ? 0 : -1}
            parentItemLabel={parentItemLabel}
            scale={getScale(index)}
            hovered={hoveredIndex === index}
            active={item.id === activeId}
            containsActive={item.id !== activeId && activePathIds.includes(item.id)}
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
