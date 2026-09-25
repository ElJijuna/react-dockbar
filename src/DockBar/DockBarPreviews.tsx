import type { FocusEvent, KeyboardEvent, MouseEvent, PointerEvent, ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import { useIsomorphicLayoutEffect } from '../hooks/useIsomorphicLayoutEffect';
import type { DockBarItem, DockBarLabels, DockBarPreview } from '../types';
import { type DockBarPreviewSide, placePreviews } from '../utils/placePreviews';
import styles from './DockBarPreviews.module.css';
import { CloseIcon } from './icons';

const PREVIEW_SELECTOR = '[data-dockbar-part="preview"]';

type PreviewHandler = (
  preview: DockBarPreview,
  event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
) => void;

export interface DockBarPreviewsProps {
  id: string;
  item: DockBarItem;
  previews: DockBarPreview[];
  side: DockBarPreviewSide;
  getAnchor: () => HTMLElement | null;
  /** Opened by a click or the keyboard: an outside click dismisses it. */
  pinned: boolean;
  /** Move focus into the panel on open (keyboard). */
  autoFocus: boolean;
  instant: boolean;
  panelLabel: Required<DockBarLabels>['previewsPanel'];
  closeLabel: Required<DockBarLabels>['closePreview'];
  onSelectPreview: PreviewHandler;
  onClosePreview: PreviewHandler;
  onRequestClose: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

/**
 * Thumbnails of an item's open windows. Shown in the top layer (Popover API) when available,
 * so no ancestor `overflow`, `transform` or stacking context can clip or cover it, and
 * re-placed every frame next to its item while the item magnifies.
 */
export const DockBarPreviews = ({
  id,
  item,
  previews,
  side,
  getAnchor,
  pinned,
  autoFocus,
  instant,
  panelLabel,
  closeLabel,
  onSelectPreview,
  onClosePreview,
  onRequestClose,
  onPointerEnter,
  onPointerLeave,
}: DockBarPreviewsProps): ReactElement => {
  const panelRef = useRef<HTMLDivElement>(null);
  const horizontal = side === 'top' || side === 'bottom';
  /** Thumbnail to focus once a closed preview has been removed from `previews`. */
  const pendingFocusIndexRef = useRef<number | null>(null);

  const getPreviewButtons = () =>
    Array.from(panelRef.current?.querySelectorAll<HTMLElement>(PREVIEW_SELECTOR) ?? []);

  useIsomorphicLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }
    // Set here rather than in JSX: @types/react 18 does not know the `popover` attribute.
    if (typeof panel.showPopover === 'function') {
      panel.setAttribute('popover', 'manual');
      panel.showPopover();
    }
    let frame = 0;
    const update = () => {
      const anchor = getAnchor();
      if (anchor) {
        const { left, top } = placePreviews(
          anchor.getBoundingClientRect(),
          { width: panel.offsetWidth, height: panel.offsetHeight },
          side,
          { width: document.documentElement.clientWidth, height: window.innerHeight },
        );
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
      }
      frame = requestAnimationFrame(update);
    };
    update();
    return () => {
      cancelAnimationFrame(frame);
      if (typeof panel.hidePopover === 'function' && panel.matches(':popover-open')) {
        panel.hidePopover();
      }
    };
  }, [getAnchor, side]);

  // Runs once on open; later autoFocus changes must not steal focus.
  useIsomorphicLayoutEffect(() => {
    if (!autoFocus) {
      return;
    }
    const buttons = getPreviewButtons();
    (buttons.find((button) => button.hasAttribute('aria-current')) ?? buttons[0])?.focus();
  }, []);

  // `previews` is the trigger: the closed one has just been removed.
  useIsomorphicLayoutEffect(() => {
    const index = pendingFocusIndexRef.current;
    if (index === null) {
      return;
    }
    pendingFocusIndexRef.current = null;
    const buttons = getPreviewButtons();
    buttons[Math.min(index, buttons.length - 1)]?.focus();
  }, [previews]);

  useEffect(() => {
    if (!pinned) {
      return;
    }
    const handlePointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !getAnchor()?.contains(target)) {
        onRequestClose();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [pinned, getAnchor, onRequestClose]);

  const closePreview = (
    preview: DockBarPreview,
    index: number,
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  ) => {
    if (panelRef.current?.contains(document.activeElement)) {
      pendingFocusIndexRef.current = index;
    }
    onClosePreview(preview, event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onRequestClose();
      return;
    }
    const buttons = getPreviewButtons();
    const current = buttons.indexOf(document.activeElement as HTMLElement);
    if ((event.key === 'Delete' || event.key === 'Backspace') && current !== -1) {
      const preview = previews[current];
      if (preview?.onClose) {
        event.preventDefault();
        closePreview(preview, current, event);
      }
      return;
    }
    const nextKeys = horizontal ? ['ArrowRight'] : ['ArrowDown'];
    const prevKeys = horizontal ? ['ArrowLeft'] : ['ArrowUp'];
    let target: number | null = null;
    if (event.key === 'Home') {
      target = 0;
    } else if (event.key === 'End') {
      target = buttons.length - 1;
    } else if (nextKeys.includes(event.key)) {
      target = (current + 1) % buttons.length;
    } else if (prevKeys.includes(event.key)) {
      target = current <= 0 ? buttons.length - 1 : current - 1;
    }
    if (target !== null && buttons[target]) {
      event.preventDefault();
      buttons[target].focus();
    }
  };

  // Focus moving anywhere but the panel or its item (e.g. Tab out) dismisses it.
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && !event.currentTarget.contains(next) && !getAnchor()?.contains(next)) {
      onRequestClose();
    }
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') {
      onPointerLeave();
    }
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: a <fieldset> groups form controls; this groups window thumbnails.
    <div
      ref={panelRef}
      id={id}
      role="group"
      aria-label={panelLabel(item.label)}
      className={styles.panel}
      data-dockbar-part="previews"
      data-dockbar-side={side}
      data-dockbar-instant={instant || undefined}
      onPointerEnter={onPointerEnter}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      <div className={styles.title} aria-hidden="true">
        {item.label}
      </div>
      <ul className={styles.list} data-dockbar-layout={horizontal ? 'row' : 'column'}>
        {previews.map((preview, index) => (
          <li key={preview.id} className={styles.card}>
            <button
              type="button"
              className={styles.select}
              data-dockbar-part="preview"
              data-dockbar-preview-id={preview.id}
              data-dockbar-active={preview.active || undefined}
              aria-current={preview.active || undefined}
              onClick={(event) => onSelectPreview(preview, event)}
            >
              <span className={styles.thumbnail} aria-hidden="true">
                {preview.thumbnail}
              </span>
              <span className={styles.caption}>{preview.title}</span>
            </button>
            {preview.onClose ? (
              <button
                type="button"
                className={styles.close}
                data-dockbar-part="preview-close"
                aria-label={closeLabel(preview.title)}
                onClick={(event) => closePreview(preview, index, event)}
              >
                <CloseIcon />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
};
