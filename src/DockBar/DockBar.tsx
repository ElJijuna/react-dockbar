import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DEFAULT_ANIMATION_DURATION_MS,
  DEFAULT_ARIA_LABEL,
  DEFAULT_BACK_LABEL,
  DOCKBAR_BACK_ID,
} from '../constants';
import { useDockBarNavigation } from '../hooks/useDockBarNavigation';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { DockBarItem, DockBarNavigateEvent, DockBarProps } from '../types';
import styles from './DockBar.module.css';
import { DockBarLevel } from './DockBarLevel';
import { ChevronLeftIcon } from './icons';

export const DockBar = ({
  items,
  colorScheme = 'auto',
  variant = 'glass',
  size = 'md',
  orientation = 'horizontal',
  magnification = true,
  animationDuration = DEFAULT_ANIMATION_DURATION_MS,
  reducedMotion = 'system',
  backItem,
  onNavigate,
  ariaLabel = DEFAULT_ARIA_LABEL,
  className,
  style,
  itemClassName,
}: DockBarProps): ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevPhaseRef = useRef<'idle' | 'collapsing' | 'expanding'>('idle');
  const [liveMessage, setLiveMessage] = useState('');

  const osReducedMotion = useReducedMotion();
  const instant =
    reducedMotion === 'always' ? true : reducedMotion === 'never' ? false : osReducedMotion;

  const resolvedBackItem = useMemo<DockBarItem>(
    () => ({
      id: DOCKBAR_BACK_ID,
      label: backItem?.label ?? DEFAULT_BACK_LABEL,
      icon: backItem?.icon ?? <ChevronLeftIcon />,
    }),
    [backItem?.label, backItem?.icon],
  );

  const handleNavigate = useCallback(
    (event: DockBarNavigateEvent) => {
      const destinationLabel = event.path[event.path.length - 1]?.label;
      setLiveMessage(
        event.direction === 'forward'
          ? `${destinationLabel}, level ${event.depth + 1}`
          : destinationLabel
            ? `Back to ${destinationLabel}`
            : 'Back to main menu',
      );
      onNavigate?.(event);
    },
    [onNavigate],
  );

  const {
    levelItems,
    phase,
    direction,
    depth,
    breadcrumb,
    focusTargetId,
    navigateTo,
    navigateBack,
    handleLevelAnimationEnd,
  } = useDockBarNavigation(items, {
    backItem: resolvedBackItem,
    animationDuration,
    instant,
    onNavigate: handleNavigate,
  });

  // Move focus to the newly-revealed Back button (drilling in) or back to the item the
  // user originally drilled into (backing out) exactly once per completed navigation.
  const wasAnimating = prevPhaseRef.current !== 'idle';
  prevPhaseRef.current = phase;
  if (phase === 'idle' && wasAnimating && focusTargetId) {
    const target = containerRef.current?.querySelector<HTMLElement>(
      `[data-dockbar-item-id="${CSS.escape(focusTargetId)}"]`,
    );
    target?.focus();
  }

  const handleActivate = useCallback(
    (item: DockBarItem, event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
      if (item.disabled) {
        return;
      }
      if (item.id === DOCKBAR_BACK_ID) {
        navigateBack();
        return;
      }
      if (item.children?.length) {
        navigateTo(item);
        return;
      }
      item.onSelect?.({ item, path: breadcrumb, nativeEvent: event.nativeEvent });
    },
    [navigateTo, navigateBack, breadcrumb],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && depth > 0 && phase === 'idle') {
        event.stopPropagation();
        navigateBack();
      }
    },
    [depth, phase, navigateBack],
  );

  const backAriaLabel = useMemo(() => {
    if (depth === 0) {
      return undefined;
    }
    const grandparent = breadcrumb[breadcrumb.length - 2];
    return grandparent ? `Back to ${grandparent.label}` : resolvedBackItem.label;
  }, [depth, breadcrumb, resolvedBackItem.label]);

  const rootClassName = [styles.dockbar, styles[`size-${size}`], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={containerRef}
      role="toolbar"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      data-dockbar-color-scheme={colorScheme}
      data-dockbar-variant={variant}
      data-dockbar-orientation={orientation}
      className={rootClassName}
      style={style}
      onKeyDown={handleKeyDown}
    >
      <DockBarLevel
        key={depth}
        items={levelItems}
        phase={phase}
        direction={direction}
        orientation={orientation}
        animationDuration={animationDuration}
        magnification={magnification}
        backAriaLabel={backAriaLabel}
        itemClassName={itemClassName}
        onActivate={handleActivate}
        onAnimationEnd={handleLevelAnimationEnd}
      />
      <span className={styles.visuallyHidden} role="status" aria-live="polite">
        {liveMessage}
      </span>
    </div>
  );
};
