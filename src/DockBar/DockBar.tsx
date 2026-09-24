import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DEFAULT_ANIMATION_DURATION_MS,
  DEFAULT_ARIA_LABEL,
  DEFAULT_BACK_LABEL,
  DEFAULT_LABELS,
  DOCKBAR_BACK_ID,
} from '../constants';
import { useDockBarNavigation } from '../hooks/useDockBarNavigation';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useRovingFocus } from '../hooks/useRovingFocus';
import type { DockBarItem, DockBarNavigateEvent, DockBarProps } from '../types';
import { findItemPath } from '../utils/findItemPath';
import { isSeparator } from '../utils/isSeparator';
import { isToggleItem } from '../utils/isToggleItem';
import styles from './DockBar.module.css';
import { DockBarBackButton } from './DockBarBackButton';
import { DockBarLevel } from './DockBarLevel';
import { ChevronLeftIcon } from './icons';

export const DockBar = ({
  items,
  activeId: activeIdProp,
  defaultActiveId = null,
  openActiveLevel = false,
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
  labels,
  className,
  style,
  itemClassName,
}: DockBarProps): ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [uncontrolledActiveId, setUncontrolledActiveId] = useState(defaultActiveId);
  const isActiveControlled = activeIdProp !== undefined;
  const activeId = isActiveControlled ? activeIdProp : uncontrolledActiveId;

  const activePathIds = useMemo(
    () => (activeId ? findItemPath(items, activeId).map((item) => item.id) : []),
    [items, activeId],
  );

  // Captured once on mount: the parents to open when `openActiveLevel` is set.
  const [initialPathIds] = useState(() =>
    openActiveLevel && activeId
      ? findItemPath(items, activeId)
          .slice(0, -1)
          .map((item) => item.id)
      : [],
  );
  // A Back bubble that is already there on mount should not play its entrance animation.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

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

  const resolvedLabels = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels]);

  const handleNavigate = useCallback(
    (event: DockBarNavigateEvent) => {
      const destinationLabel = event.path[event.path.length - 1]?.label ?? null;
      setLiveMessage(
        event.direction === 'forward' && destinationLabel
          ? resolvedLabels.enteredLevel(destinationLabel, event.depth)
          : resolvedLabels.returnedTo(destinationLabel),
      );
      onNavigate?.(event);
    },
    [onNavigate, resolvedLabels],
  );

  const {
    levelItems,
    phase,
    direction,
    depth,
    breadcrumb,
    focusRequest,
    navigateTo,
    navigateBack,
    handleLevelAnimationEnd,
  } = useDockBarNavigation(items, {
    animationDuration,
    instant,
    onNavigate: handleNavigate,
    initialPathIds,
  });

  // Move focus to the newly-revealed Back button (drilling in) or back to the item the
  // user originally drilled into (backing out) once the new level is committed to the DOM.
  useLayoutEffect(() => {
    if (!focusRequest) {
      return;
    }
    containerRef.current
      ?.querySelector<HTMLElement>(`[data-dockbar-item-id="${CSS.escape(focusRequest.id)}"]`)
      ?.focus();
  }, [focusRequest]);

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
      if (!isActiveControlled && !isToggleItem(item)) {
        setUncontrolledActiveId(item.id);
      }
      item.onSelect?.({ item, path: breadcrumb, nativeEvent: event.nativeEvent });
    },
    [navigateTo, navigateBack, breadcrumb, isActiveControlled],
  );

  const focusableIds = useMemo(
    () => [
      ...(depth > 0 ? [DOCKBAR_BACK_ID] : []),
      ...levelItems
        .filter((entry): entry is DockBarItem => !isSeparator(entry) && !entry.disabled)
        .map((item) => item.id),
    ],
    [depth, levelItems],
  );
  // Prefer the active item (or the parent that contains it) as the initial tab stop.
  const preferredTabStopId =
    [...activePathIds].reverse().find((id) => focusableIds.includes(id)) ?? null;

  const roving = useRovingFocus({
    containerRef,
    orientation,
    focusableIds,
    preferredId: preferredTabStopId,
    enabled: phase === 'idle',
  });

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && depth > 0 && phase === 'idle') {
        event.stopPropagation();
        navigateBack();
        return;
      }
      roving.handleKeyDown(event);
    },
    [depth, phase, navigateBack, roving],
  );

  const grandparent = breadcrumb[breadcrumb.length - 2];
  const backAriaLabel = grandparent
    ? resolvedLabels.backTo(grandparent.label)
    : resolvedBackItem.label;
  // Fade the Back bubble out together with the last collapse back to the root level.
  const backLeaving = depth === 1 && direction === 'back' && phase === 'collapsing';

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
      onFocus={roving.handleFocus}
    >
      {depth > 0 ? (
        <DockBarBackButton
          skipIntro={!hasMounted}
          item={resolvedBackItem}
          ariaLabel={backAriaLabel}
          leaving={backLeaving}
          tabIndex={roving.tabStopId === DOCKBAR_BACK_ID ? 0 : -1}
          animationDuration={animationDuration}
          itemClassName={itemClassName}
          onActivate={handleActivate}
        />
      ) : null}
      <DockBarLevel
        key={depth}
        items={levelItems}
        phase={phase}
        direction={direction}
        orientation={orientation}
        animationDuration={animationDuration}
        magnification={magnification}
        variant={variant}
        activePathIds={activePathIds}
        tabStopId={roving.tabStopId}
        parentItemLabel={resolvedLabels.parentItem}
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
