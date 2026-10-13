import { act, fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_LABELS } from '../constants';
import type { DockBarPreview } from '../types';
import { DockBarPreviews, type DockBarPreviewsProps } from './DockBarPreviews';

function previews(): DockBarPreview[] {
  return ['First', 'Second', 'Third'].map((title, index) => ({
    id: String(index),
    title,
    thumbnail: <span>{title} thumbnail</span>,
    onClose: jest.fn(),
  }));
}

function props(overrides: Partial<DockBarPreviewsProps> = {}): DockBarPreviewsProps {
  return {
    id: 'windows',
    item: { id: 'mail', label: 'Mail', icon: <span>M</span> },
    previews: previews(),
    side: 'top',
    getAnchor: () => null,
    pinned: false,
    autoFocus: false,
    instant: false,
    panelLabel: DEFAULT_LABELS.previewsPanel,
    closeLabel: DEFAULT_LABELS.closePreview,
    onSelectPreview: jest.fn(),
    onClosePreview: jest.fn(),
    onRequestClose: jest.fn(),
    onPointerEnter: jest.fn(),
    onPointerLeave: jest.fn(),
    ...overrides,
  };
}

const button = (name: string) => screen.getByRole('button', { name });
const panel = () => screen.getByRole('group', { name: 'Mail windows' });

function focus(name: string) {
  act(() => button(name).focus());
}

function key(keyName: string) {
  return fireEvent.keyDown(document.activeElement ?? panel(), { key: keyName });
}

describe('DockBarPreviews', () => {
  beforeEach(() => jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(123));
  afterEach(() => jest.restoreAllMocks());

  it.each(['top', 'bottom', 'left', 'right'] as const)(
    'uses the %s layout and focuses the active preview',
    (side) => {
      const list = previews();
      list[1].active = true;
      render(
        <DockBarPreviews {...props({ previews: list, side, autoFocus: true, instant: true })} />,
      );
      expect(button('Second')).toHaveFocus();
      expect(button('Second')).toHaveAttribute('aria-current', 'true');
      expect(panel()).toHaveAttribute('data-dockbar-side', side);
      expect(panel()).toHaveAttribute('data-dockbar-instant', 'true');
      expect(screen.getByRole('list')).toHaveAttribute(
        'data-dockbar-layout',
        side === 'top' || side === 'bottom' ? 'row' : 'column',
      );
    },
  );

  it('focuses the first preview when none is active and does not steal focus on later renders', () => {
    const initial = props({ autoFocus: true });
    const { rerender } = render(<DockBarPreviews {...initial} />);
    expect(button('First')).toHaveFocus();
    focus('Third');
    rerender(<DockBarPreviews {...initial} previews={previews()} />);
    expect(button('Third')).toHaveFocus();
  });

  it('does not move focus when autoFocus becomes true after opening', () => {
    const initial = props();
    const { rerender } = render(<DockBarPreviews {...initial} />);
    focus('Third');
    rerender(<DockBarPreviews {...initial} autoFocus />);
    expect(button('Third')).toHaveFocus();
  });

  it.each([
    ['top', 'ArrowRight', 'ArrowLeft', 'ArrowDown'],
    ['left', 'ArrowDown', 'ArrowUp', 'ArrowRight'],
  ] as const)(
    'navigates and wraps on the %s axis, including Home and End',
    (side, next, previous, ignored) => {
      render(<DockBarPreviews {...props({ side, autoFocus: true })} />);
      expect(key(previous)).toBe(false);
      expect(button('Third')).toHaveFocus();
      key(next);
      expect(button('First')).toHaveFocus();
      key(next);
      expect(button('Second')).toHaveFocus();
      key(previous);
      expect(button('First')).toHaveFocus();
      key('End');
      expect(button('Third')).toHaveFocus();
      key('Home');
      expect(button('First')).toHaveFocus();
      expect(key(ignored)).toBe(true);
      expect(button('First')).toHaveFocus();
    },
  );

  it('navigates into thumbnails when focus is on a close button', () => {
    render(<DockBarPreviews {...props()} />);
    focus('Close Second');
    key('ArrowRight');
    expect(button('First')).toHaveFocus();
    focus('Close Second');
    key('ArrowLeft');
    expect(button('Third')).toHaveFocus();
  });

  it.each(['Delete', 'Backspace'])(
    'closes a focused closable preview with %s and focuses its successor',
    (keyName) => {
      const initial = props({ autoFocus: true });
      const { rerender } = render(<DockBarPreviews {...initial} />);
      focus('Second');
      expect(key(keyName)).toBe(false);
      expect(initial.onClosePreview).toHaveBeenCalledWith(
        initial.previews[1],
        expect.objectContaining({ key: keyName }),
      );
      expect(initial.onSelectPreview).not.toHaveBeenCalled();
      rerender(
        <DockBarPreviews {...initial} previews={[initial.previews[0], initial.previews[2]]} />,
      );
      expect(button('Third')).toHaveFocus();
    },
  );

  it('focuses the preceding thumbnail when the last preview is removed by its close button', () => {
    const initial = props();
    const { rerender } = render(<DockBarPreviews {...initial} />);
    focus('Close Third');
    fireEvent.click(button('Close Third'));
    rerender(<DockBarPreviews {...initial} previews={initial.previews.slice(0, 2)} />);
    expect(button('Second')).toHaveFocus();
  });

  it('does not steal outside focus when a preview is removed without panel focus', () => {
    const initial = props();
    const { rerender } = render(<DockBarPreviews {...initial} />);
    expect(document.body).toHaveFocus();
    fireEvent.click(button('Close First'));
    rerender(<DockBarPreviews {...initial} previews={initial.previews.slice(1)} />);
    expect(document.body).toHaveFocus();
  });

  it('ignores deletion for nonclosable thumbnails and close buttons', () => {
    const list = previews();
    list[0].onClose = undefined;
    const initial = props({ previews: list, autoFocus: true });
    render(<DockBarPreviews {...initial} />);
    expect(screen.queryByRole('button', { name: 'Close First' })).toBeNull();
    expect(key('Delete')).toBe(true);
    focus('Close Second');
    expect(key('Backspace')).toBe(true);
    expect(initial.onClosePreview).not.toHaveBeenCalled();
  });

  it('handles an empty panel and removal of its last focused preview', () => {
    const initial = props({ previews: previews().slice(0, 1), autoFocus: true });
    const { rerender } = render(<DockBarPreviews {...initial} />);
    key('Delete');
    rerender(<DockBarPreviews {...initial} previews={[]} />);
    expect(screen.queryByRole('button')).toBeNull();
    for (const value of ['Home', 'End', 'ArrowRight', 'ArrowLeft', 'Delete']) {
      expect(fireEvent.keyDown(panel(), { key: value })).toBe(true);
    }
  });

  it('forwards selection and requests dismissal with Escape', () => {
    const initial = props({ autoFocus: true });
    render(<DockBarPreviews {...initial} />);
    fireEvent.click(button('Second'));
    expect(initial.onSelectPreview).toHaveBeenCalledWith(
      initial.previews[1],
      expect.objectContaining({ type: 'click' }),
    );
    expect(key('Escape')).toBe(false);
    expect(initial.onRequestClose).toHaveBeenCalledTimes(1);
  });

  it('dismisses only when focus moves outside the panel and anchor', () => {
    const anchor = document.createElement('button');
    const child = document.createElement('span');
    anchor.append(child);
    const initial = props({ getAnchor: () => anchor });
    render(<DockBarPreviews {...initial} />);
    for (const relatedTarget of [null, button('First'), child]) {
      fireEvent.blur(panel(), { relatedTarget });
    }
    expect(initial.onRequestClose).not.toHaveBeenCalled();
    fireEvent.blur(panel(), { relatedTarget: document.body });
    expect(initial.onRequestClose).toHaveBeenCalledTimes(1);
  });

  it('ignores touch leave and forwards mouse enter and leave', () => {
    const initial = props();
    render(<DockBarPreviews {...initial} />);
    fireEvent.pointerEnter(panel(), { pointerType: 'mouse' });
    fireEvent.pointerLeave(panel(), { pointerType: 'touch' });
    expect(initial.onPointerEnter).toHaveBeenCalledTimes(1);
    expect(initial.onPointerLeave).not.toHaveBeenCalled();
    fireEvent.pointerLeave(panel(), { pointerType: 'mouse' });
    expect(initial.onPointerLeave).toHaveBeenCalledTimes(1);
  });

  it('listens for outside pointerdown only while pinned and removes the listener on unmount', () => {
    const anchor = document.createElement('button');
    document.body.append(anchor);
    try {
      const initial = props({ getAnchor: () => anchor });
      const { rerender, unmount } = render(<DockBarPreviews {...initial} />);
      fireEvent.pointerDown(document.body);
      expect(initial.onRequestClose).not.toHaveBeenCalled();
      rerender(<DockBarPreviews {...initial} pinned />);
      fireEvent.pointerDown(button('First'));
      fireEvent.pointerDown(anchor);
      expect(initial.onRequestClose).not.toHaveBeenCalled();
      fireEvent.pointerDown(document.body);
      expect(initial.onRequestClose).toHaveBeenCalledTimes(1);
      rerender(<DockBarPreviews {...initial} pinned={false} />);
      fireEvent.pointerDown(document.body);
      expect(initial.onRequestClose).toHaveBeenCalledTimes(1);
      rerender(<DockBarPreviews {...initial} pinned />);
      unmount();
      fireEvent.pointerDown(document.body);
      expect(initial.onRequestClose).toHaveBeenCalledTimes(1);
    } finally {
      anchor.remove();
    }
  });

  it('places the panel each frame, tolerates a missing anchor, and cancels the frame on unmount', () => {
    const anchor = document.createElement('button');
    const rect = jest.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
      x: 100,
      y: 100,
      left: 100,
      top: 100,
      right: 140,
      bottom: 140,
      width: 40,
      height: 40,
      toJSON: () => ({}),
    });
    const getAnchor = jest.fn((): HTMLElement | null => anchor);
    const cancel = jest.spyOn(window, 'cancelAnimationFrame');
    const { unmount } = render(<DockBarPreviews {...props({ getAnchor })} />);
    expect(panel().style.top).not.toBe('');
    const firstTop = panel().style.top;
    rect.mockReturnValue({
      x: 100,
      y: 200,
      left: 100,
      top: 200,
      right: 140,
      bottom: 240,
      width: 40,
      height: 40,
      toJSON: () => ({}),
    });
    const raf = jest.spyOn(window, 'requestAnimationFrame');
    act(() => raf.mock.calls[0][0](16));
    expect(panel().style.top).not.toBe(firstTop);
    const lastTop = panel().style.top;
    getAnchor.mockReturnValue(null);
    act(() => raf.mock.calls[1][0](32));
    expect(panel().style.top).toBe(lastTop);
    unmount();
    expect(cancel).toHaveBeenCalledWith(123);
  });

  it.each([true, false])(
    'opens a supported popover and hides it only when still open (%s)',
    (isOpen) => {
      // jsdom lacks Popover API; install its methods only for this feature-detection test.
      const show = jest.fn();
      const hide = jest.fn();
      Object.defineProperty(HTMLElement.prototype, 'showPopover', {
        configurable: true,
        value: show,
      });
      Object.defineProperty(HTMLElement.prototype, 'hidePopover', {
        configurable: true,
        value: hide,
      });
      jest.spyOn(HTMLElement.prototype, 'matches').mockImplementation(function (selector) {
        return selector === ':popover-open'
          ? isOpen
          : Element.prototype.matches.call(this, selector);
      });
      try {
        const { unmount } = render(<DockBarPreviews {...props()} />);
        expect(panel()).toHaveAttribute('popover', 'manual');
        expect(show).toHaveBeenCalledTimes(1);
        unmount();
        expect(hide).toHaveBeenCalledTimes(isOpen ? 1 : 0);
      } finally {
        Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');
        Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover');
      }
    },
  );
});
