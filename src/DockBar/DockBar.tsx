import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DEFAULT_ANIMATION_DURATION_MS,
  DEFAULT_ARIA_LABEL,
  DEFAULT_BACK_LABEL,
  DEFAULT_LABELS,
  DEFAULT_PREVIEW_DELAY,
  DOCKBAR_BACK_ID,
} from '../constants';
import { useDockBarNavigation } from '../hooks/useDockBarNavigation';
import { useIsomorphicLayoutEffect } from '../hooks/useIsomorphicLayoutEffect';
import { usePreviewsState } from '../hooks/usePreviewsState';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useRovingFocus } from '../hooks/useRovingFocus';
import type { DockBarItem, DockBarNavigateEvent, DockBarPreview, DockBarProps } from '../types';
import { findItemPath } from '../utils/findItemPath';
import { getPreviews } from '../utils/getPreviews';
import { isSeparator } from '../utils/isSeparator';
import { isToggleItem } from '../utils/isToggleItem';
import { resolvePreviewSide } from '../utils/placePreviews';
import styles from './DockBar.module.css';
import { DockBarBackButton } from './DockBarBackButton';
import { DockBarLevel } from './DockBarLevel';
import { DockBarPreviews } from './DockBarPreviews';
import { ChevronLeftIcon } from './icons';

const PREVIEW_OPEN_KEY = {
  top: 'ArrowUp',
  bottom: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
} as const;

export const DockBar = ({
  items,
  activeId: activeIdProp,
  defaultActiveId = null,
  openActiveLevel = false,
  colorScheme = 'auto',
  variant = 'pill',
  size = 'md',
  orientation = 'horizontal',
  position = 'bottom-center',
  magnification = true,
  animationDuration = DEFAULT_ANIMATION_DURATION_MS,
  reducedMotion = 'system',
  backItem,
  onNavigate,
  openPreviewsId: openPreviewsIdProp,
  onPreviewsOpenChange,
  previewDelay,
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

  const previewsPanelId = `${useId()}previews`;
  const isInPreviewsPanel = useCallback(
    (node: Node | null) =>
      Boolean(node && document.getElementById(previewsPanelId)?.contains(node)),
    [previewsPanelId],
  );
  const previewDelayOpen = previewDelay?.open ?? DEFAULT_PREVIEW_DELAY.open;
  const previewDelayClose = previewDelay?.close ?? DEFAULT_PREVIEW_DELAY.close;
  const resolvedPreviewDelay = useMemo(
    () => ({ open: previewDelayOpen, close: previewDelayClose }),
    [previewDelayOpen, previewDelayClose],
  );
  const previews = usePreviewsState({
    openId: openPreviewsIdProp,
    onOpenChange: onPreviewsOpenChange,
    delay: resolvedPreviewDelay,
  });
  const {
    open: openPreviewsState,
    close: closePreviewsState,
    hoverItem: hoverPreviewsItem,
  } = previews;
  // Only an item of the current level that still has previews can show its panel.
  const openPreviewsItem = previews.openId
    ? levelItems.find(
        (entry): entry is DockBarItem =>
          !isSeparator(entry) && entry.id === previews.openId && getPreviews(entry).length > 0,
      )
    : undefined;
  const previewSide = resolvePreviewSide(position, orientation);
  /** Item whose panel should take focus when it opens (opened from the keyboard). */
  const [previewsFocusId, setPreviewsFocusId] = useState<string | null>(null);

  const getPreviewsAnchor = useCallback(
    () =>
      previews.openId
        ? (containerRef.current?.querySelector<HTMLElement>(
            `[data-dockbar-part="level"] [data-dockbar-item-id="${CSS.escape(previews.openId)}"]`,
          ) ?? null)
        : null,
    [previews.openId],
  );

  // Closing while focus is inside the panel hands it back to the item instead of <body>.
  const closePreviews = useCallback(() => {
    const anchor = getPreviewsAnchor();
    const restoreFocus = isInPreviewsPanel(document.activeElement);
    closePreviewsState();
    setPreviewsFocusId(null);
    if (restoreFocus) {
      anchor?.focus();
    }
  }, [getPreviewsAnchor, isInPreviewsPanel, closePreviewsState]);

  const openPreviews = useCallback(
    (item: DockBarItem, { focus }: { focus: boolean }) => {
      setPreviewsFocusId(focus ? item.id : null);
      openPreviewsState(item.id, { pinned: true });
    },
    [openPreviewsState],
  );

  // Navigating to another level, or the open item losing its previews, closes the panel.
  useEffect(() => {
    if (previews.openId !== null && (!openPreviewsItem || phase !== 'idle')) {
      closePreviews();
    }
  }, [previews.openId, openPreviewsItem, phase, closePreviews]);

  const handlePreviewsHover = useCallback(
    (item: DockBarItem) => hoverPreviewsItem(item.id),
    [hoverPreviewsItem],
  );

  const handleSelectPreview = useCallback(
    (preview: DockBarPreview, event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
      if (!openPreviewsItem) {
        return;
      }
      closePreviews();
      if (!isActiveControlled && !isToggleItem(openPreviewsItem)) {
        setUncontrolledActiveId(openPreviewsItem.id);
      }
      preview.onSelect?.({
        item: openPreviewsItem,
        preview,
        path: breadcrumb,
        nativeEvent: event.nativeEvent,
      });
    },
    [openPreviewsItem, closePreviews, isActiveControlled, breadcrumb],
  );

  const handleClosePreview = useCallback(
    (preview: DockBarPreview, event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
      if (openPreviewsItem) {
        preview.onClose?.({
          item: openPreviewsItem,
          preview,
          path: breadcrumb,
          nativeEvent: event.nativeEvent,
        });
      }
    },
    [openPreviewsItem, breadcrumb],
  );

  // Move focus to the newly-revealed Back button (drilling in) or back to the item the
  // user originally drilled into (backing out) once the new level is committed to the DOM.
  useIsomorphicLayoutEffect(() => {
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
      // Several windows: the item opens its panel (and pins it) instead of selecting.
      const previewCount = getPreviews(item).length;
      if (previewCount >= 2) {
        if (previews.openId === item.id && previews.pinned) {
          closePreviews();
        } else {
          // `detail` is 0 for clicks synthesized by Enter/Space.
          openPreviews(item, { focus: event.detail === 0 });
        }
        return;
      }
      if (previewCount === 1 && previews.openId !== null) {
        closePreviews();
      }
      if (!isActiveControlled && !isToggleItem(item)) {
        setUncontrolledActiveId(item.id);
      }
      item.onSelect?.({ item, path: breadcrumb, nativeEvent: event.nativeEvent });
    },
    [
      navigateTo,
      navigateBack,
      breadcrumb,
      isActiveControlled,
      previews.openId,
      previews.pinned,
      closePreviews,
      openPreviews,
    ],
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
      // The previews panel handles its own keys.
      if (isInPreviewsPanel(event.target as Node)) {
        return;
      }
      if (event.key === 'Escape' && previews.openId !== null) {
        event.stopPropagation();
        closePreviews();
        return;
      }
      // The arrow that points at the panel opens it and moves focus into it.
      const focusedId = (event.target as HTMLElement).closest<HTMLElement>('[data-dockbar-item-id]')
        ?.dataset.dockbarItemId;
      const focusedItem = levelItems.find(
        (entry): entry is DockBarItem => !isSeparator(entry) && entry.id === focusedId,
      );
      if (
        focusedItem &&
        phase === 'idle' &&
        event.key === PREVIEW_OPEN_KEY[previewSide] &&
        getPreviews(focusedItem).length > 0
      ) {
        event.preventDefault();
        openPreviews(focusedItem, { focus: true });
        return;
      }
      if (event.key === 'Escape' && depth > 0 && phase === 'idle') {
        event.stopPropagation();
        navigateBack();
        return;
      }
      roving.handleKeyDown(event);
    },
    [
      depth,
      phase,
      navigateBack,
      roving,
      isInPreviewsPanel,
      previews.openId,
      closePreviews,
      levelItems,
      previewSide,
      openPreviews,
    ],
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
      data-dockbar-position={position}
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
        previewsItemLabel={resolvedLabels.previewsItem}
        badgeLabel={resolvedLabels.badge}
        openPreviewsId={openPreviewsItem?.id ?? null}
        previewsPanelId={previewsPanelId}
        onPreviewsHover={handlePreviewsHover}
        onPreviewsLeave={previews.leave}
        itemClassName={itemClassName}
        onActivate={handleActivate}
        onAnimationEnd={handleLevelAnimationEnd}
      />
      {openPreviewsItem ? (
        <DockBarPreviews
          key={openPreviewsItem.id}
          id={previewsPanelId}
          item={openPreviewsItem}
          previews={getPreviews(openPreviewsItem)}
          side={previewSide}
          getAnchor={getPreviewsAnchor}
          pinned={previews.pinned}
          autoFocus={previewsFocusId === openPreviewsItem.id}
          instant={instant}
          panelLabel={resolvedLabels.previewsPanel}
          closeLabel={resolvedLabels.closePreview}
          onSelectPreview={handleSelectPreview}
          onClosePreview={handleClosePreview}
          onRequestClose={closePreviews}
          onPointerEnter={previews.cancelClose}
          onPointerLeave={previews.leave}
        />
      ) : null}
      <span className={styles.visuallyHidden} role="status" aria-live="polite">
        {liveMessage}
      </span>
    </div>
  );
};
