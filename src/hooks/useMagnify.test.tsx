import { act, fireEvent, render, renderHook } from '@testing-library/react';
import type { DockBarMagnificationConfig, DockBarOrientation, DockBarVariant } from '../types';
import { scaleAtDistance, useMagnify } from './useMagnify';

interface Options {
  config: boolean | DockBarMagnificationConfig | undefined;
  orientation: DockBarOrientation;
  variant: DockBarVariant;
  hold: boolean;
}

const defaults: Options = {
  config: { scale: 1.5, distance: 150, transitionMs: 90 },
  orientation: 'horizontal',
  variant: 'pill',
  hold: false,
};

function rect(offset: number): DOMRect {
  return {
    x: offset,
    y: offset,
    left: offset,
    top: offset,
    right: offset + 50,
    bottom: offset + 50,
    width: 50,
    height: 50,
    toJSON: () => ({}),
  };
}

function setup(overrides: Partial<Options> = {}) {
  const levelRef: { current: HTMLElement | null } = { current: null };
  const hook = renderHook(
    (options: Options) =>
      useMagnify(options.config, options.variant, options.orientation, levelRef, {
        hold: options.hold,
      }),
    { initialProps: { ...defaults, ...overrides } },
  );
  // Real React pointer events invoke the current hook handlers, including after rerenders.
  const view = render(
    <div
      ref={(node) => {
        levelRef.current = node;
      }}
      onPointerEnter={(event) => hook.result.current.handlePointerEnter(event)}
      onPointerMove={(event) => hook.result.current.handlePointerMove(event)}
      onPointerLeave={() => hook.result.current.handlePointerLeave()}
    >
      <button type="button" data-dockbar-part="item">
        First
      </button>
      <hr />
      <button type="button" data-dockbar-part="item">
        Second
      </button>
      <button type="button" data-dockbar-part="item">
        Third
      </button>
    </div>,
  );
  const level = view.container.firstElementChild;
  if (!(level instanceof HTMLElement)) {
    throw new Error('Missing level');
  }
  const buttons = Array.from(level.querySelectorAll('button'));
  const rects = buttons.map((button, index) =>
    jest.spyOn(button, 'getBoundingClientRect').mockReturnValue(rect(index * 60)),
  );
  const scale = (index: number) =>
    Number(buttons[index].style.getPropertyValue('--dockbar-item-scale') || 1);
  const rerender = (options: Partial<Options>) =>
    hook.rerender({ ...defaults, ...overrides, ...options });
  const move = (coordinate: number, pointerType = 'mouse') =>
    fireEvent.pointerMove(level, { clientX: coordinate, clientY: coordinate, pointerType });
  const enter = (coordinate = 85, pointerType = 'mouse') =>
    fireEvent.pointerEnter(level, { clientX: coordinate, clientY: coordinate, pointerType });
  return { ...hook, level, buttons, rects, scale, rerender, move, enter };
}

describe('scaleAtDistance', () => {
  it.each([
    [0, 2],
    [50, 1.5],
    [100, 1],
    [150, 1],
  ])('returns %s distance as scale %s for a 100px range', (distance, expected) => {
    expect(scaleAtDistance(distance, 2, 100)).toBeCloseTo(expected);
  });

  it.each([0, -1])('disables magnification for range %s', (range) => {
    expect(scaleAtDistance(0, 2, range)).toBe(1);
  });

  it('decreases smoothly with distance and stays at 1 for maxScale=1', () => {
    expect(scaleAtDistance(25, 2, 100)).toBeGreaterThan(scaleAtDistance(75, 2, 100));
    expect(scaleAtDistance(25, 1, 100)).toBe(1);
  });
});

describe('useMagnify', () => {
  let frames: Map<number, FrameRequestCallback>;
  let frameId: number;

  beforeEach(() => {
    jest.useFakeTimers();
    frames = new Map();
    frameId = 0;
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.set(++frameId, callback);
      return frameId;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      frames.delete(id);
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function flush() {
    act(() => {
      const pending = Array.from(frames.values());
      frames.clear();
      pending.forEach((callback) => {
        callback(performance.now());
      });
    });
  }

  it.each(['horizontal', 'vertical'] as const)(
    'magnifies using the %s axis and ignores separators',
    (orientation) => {
      const { level, result, scale } = setup({ orientation });
      fireEvent.pointerMove(level, {
        pointerType: 'mouse',
        clientX: orientation === 'horizontal' ? 85 : 1000,
        clientY: orientation === 'vertical' ? 85 : 1000,
      });
      flush();
      expect(result.current.hoveredIndex).toBe(1);
      expect(scale(1)).toBe(1.5);
      expect(scale(0)).toBeCloseTo(scale(2));
    },
  );

  it.each(['pill', 'glass', 'solid'] as const)(
    'uses %s defaults when no custom config is supplied',
    (variant) => {
      const { move, result, scale } = setup({ config: undefined, variant });
      move(85);
      flush();
      expect(scale(1)).toBe(variant === 'pill' ? 1.25 : 1.6);
      expect(result.current.transitionMs).toBe(90);
    },
  );

  it('applies partial overrides and keeps handlers stable for equivalent inline configs', () => {
    const { result, rerender, move, scale } = setup({ config: { scale: 2, transitionMs: 30 } });
    const moveHandler = result.current.handlePointerMove;
    rerender({ config: { scale: 2, transitionMs: 30 } });
    expect(result.current.handlePointerMove).toBe(moveHandler);
    expect(result.current.transitionMs).toBe(30);
    move(85);
    flush();
    expect(scale(1)).toBe(2);
  });

  it('coalesces moves and applies the most recent position without requiring pointerenter', () => {
    const { move, result, scale } = setup();
    move(25);
    move(85);
    move(145);
    expect(frames.size).toBe(1);
    flush();
    expect(result.current.hoveredIndex).toBe(2);
    expect(scale(2)).toBe(1.5);
  });

  it('cancels a pending frame and resets when the pointer leaves', () => {
    const { move, level, result, scale } = setup();
    move(85);
    fireEvent.pointerLeave(level);
    expect(frames.size).toBe(0);
    flush();
    expect(result.current.hoveredIndex).toBeNull();
    expect(scale(1)).toBe(1);
  });

  it('ignores touch enter and move without scheduling animation frames', () => {
    const { enter, move, result, scale } = setup();
    enter(85, 'touch');
    move(85, 'touch');
    expect(frames.size).toBe(0);
    expect(result.current.hoveredIndex).toBeNull();
    expect(scale(1)).toBe(1);
  });

  it('resets active scales and cancels pending work when disabled, then can be re-enabled', () => {
    const { move, enter, rerender, result, buttons, scale } = setup();
    move(85);
    flush();
    move(145);
    rerender({ config: false });
    expect(frames.size).toBe(0);
    expect(scale(1)).toBe(1);
    enter();
    move(85);
    act(() => result.current.focusItem(buttons[1]));
    expect(frames.size).toBe(0);
    expect(result.current.hoveredIndex).toBeNull();
    rerender({ config: true });
    move(85);
    flush();
    expect(scale(1)).toBe(1.25);
  });

  it('keeps cached base centers during magnification and re-entry before shrinking finishes', () => {
    const { enter, move, level, rects, scale } = setup();
    enter();
    move(85);
    flush();
    rects.forEach((spy, index) => {
      spy.mockReturnValue(rect(index * 60 - 60));
    });
    enter();
    move(85);
    flush();
    expect(scale(1)).toBe(1.5);
    fireEvent.pointerLeave(level);
    enter();
    move(85);
    flush();
    expect(scale(1)).toBe(1.5);
    fireEvent.pointerLeave(level);
    act(() => jest.advanceTimersByTime(90));
    enter();
    move(85);
    flush();
    expect(scale(2)).toBe(1.5);
  });

  it.each(['invalidate', 'scroll', 'resize'])(
    're-measures cached positions after %s while magnified',
    (trigger) => {
      const { move, rects, result, scale } = setup();
      move(85);
      flush();
      rects.forEach((spy, index) => {
        spy.mockReturnValue(rect(index * 60 - 60));
      });
      if (trigger === 'invalidate') {
        act(() => result.current.invalidate());
      } else {
        fireEvent(window, new Event(trigger));
      }
      move(85);
      flush();
      expect(result.current.hoveredIndex).toBe(2);
      expect(scale(2)).toBe(1.5);
    },
  );

  it('magnifies around keyboard focus and resets on blur', () => {
    const { result, buttons, scale } = setup();
    act(() => result.current.focusItem(buttons[1]));
    expect(scale(1)).toBe(1.5);
    expect(result.current.hoveredIndex).toBe(1);
    act(() => result.current.blurItem());
    expect(scale(1)).toBe(1);
    expect(result.current.hoveredIndex).toBeNull();
  });

  it('ignores keyboard focus and blur while pointer movement drives magnification', () => {
    const { move, result, buttons, scale } = setup();
    move(85);
    flush();
    act(() => result.current.focusItem(buttons[0]));
    act(() => result.current.blurItem());
    expect(scale(1)).toBe(1.5);
    expect(result.current.hoveredIndex).toBe(1);
  });

  it('uses the focused element position if it has left the current item list', () => {
    const { result, buttons, scale } = setup();
    // A focus handler can refer to an item removed during the same update.
    const [, removed] = buttons;
    removed.remove();
    act(() => result.current.focusItem(removed));
    expect(scale(0)).toBeGreaterThan(1);
    expect(scale(2)).toBeGreaterThan(1);
  });

  it.each([true, false])('holds magnification until release (pointer inside=%s)', (inside) => {
    const { move, level, result, rerender, scale } = setup({ hold: true });
    move(85);
    flush();
    if (!inside) {
      fireEvent.pointerLeave(level);
    }
    act(() => result.current.blurItem());
    expect(scale(1)).toBe(1.5);
    rerender({ hold: false });
    expect(scale(1)).toBe(inside ? 1.5 : 1);
    fireEvent.pointerLeave(level);
    expect(scale(1)).toBe(1);
  });

  it('tolerates an unmounted ref with default hold options', () => {
    const { result } = renderHook(() => useMagnify(true, 'pill', 'horizontal', { current: null }));
    act(() => result.current.focusItem(document.createElement('button')));
    act(() => result.current.blurItem());
    expect(result.current.hoveredIndex).toBeNull();
  });

  it('cancels pending frames and unregisters resize and scroll listeners on unmount', () => {
    const remove = jest.spyOn(window, 'removeEventListener');
    const { move, unmount } = setup();
    move(85);
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function), { capture: true });
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
