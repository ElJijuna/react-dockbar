import type { CSSProperties, KeyboardEvent, MouseEvent, ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import type { DockBarAnimationPhase, DockBarNavDirection } from '../hooks/useDockBarNavigation';
import { useMagnify } from '../hooks/useMagnify';
import type {
  DockBarEntry,
  DockBarItem,
  DockBarLabels,
  DockBarMagnificationConfig,
  DockBarOrientation,
  DockBarProps,
  DockBarVariant,
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
  variant: DockBarVariant;
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
  variant,
  activePathIds,
  tabStopId,
  parentItemLabel,
  itemClassName,
  onActivate,
  onAnimationEnd,
}: DockBarLevelProps): ReactElement => {
  const activeId = activePathIds[activePathIds.length - 1];
  const levelRef = useRef<HTMLDivElement>(null);
  const magnify = useMagnify(magnification, variant, orientation, levelRef);
  const { invalidate } = magnify;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `items` is the trigger — adding, removing or reordering items in place moves them, so cached positions must be dropped.
  useEffect(() => {
    invalidate();
  }, [items, invalidate]);

  const style = { '--dockbar-transition-duration': `${animationDuration}ms` } as CSSProperties;
  let itemIndex = -1;

  return (
    <div
      ref={levelRef}
      className={styles.level}
      data-dockbar-part="level"
      data-dockbar-phase={phase}
      data-dockbar-direction={direction ?? undefined}
      style={style}
      onAnimationEnd={onAnimationEnd}
      onPointerEnter={magnify.handlePointerEnter}
      onPointerMove={magnify.handlePointerMove}
      onPointerLeave={magnify.handlePointerLeave}
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
            hovered={magnify.hoveredIndex === index}
            active={item.id === activeId}
            containsActive={item.id !== activeId && activePathIds.includes(item.id)}
            magnifyTransitionMs={magnify.transitionMs}
            onFocusItem={magnify.focusItem}
            onBlurItem={magnify.blurItem}
            onActivate={onActivate}
            itemClassName={itemClassName}
          />
        );
      })}
    </div>
  );
};
