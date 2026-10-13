import { act, renderHook } from '@testing-library/react';
import { type UsePreviewsStateOptions, usePreviewsState } from './usePreviewsState';

const delay = { open: 400, close: 200 };
const advance = (ms: number) => act(() => jest.advanceTimersByTime(ms));

function setup(options: Partial<UsePreviewsStateOptions> = {}) {
  const onOpenChange = jest.fn();
  return {
    onOpenChange,
    ...renderHook((props: UsePreviewsStateOptions) => usePreviewsState(props), {
      initialProps: { openId: undefined, delay, onOpenChange, ...options },
    }),
  };
}

describe('usePreviewsState', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('opens after the full delay and closes after the grace period', () => {
    const { result, onOpenChange } = setup();
    act(() => result.current.hoverItem('mail'));
    advance(399);
    expect(result.current.openId).toBeNull();
    advance(1);
    expect(result.current.openId).toBe('mail');
    expect(result.current.pinned).toBe(false);
    act(() => result.current.leave());
    advance(199);
    expect(result.current.openId).toBe('mail');
    advance(1);
    expect(result.current.openId).toBeNull();
    expect(onOpenChange.mock.calls).toEqual([['mail'], [null]]);
  });

  it('replaces a pending hover and restarts its delay', () => {
    const { result, onOpenChange } = setup();
    act(() => result.current.hoverItem('mail'));
    advance(200);
    act(() => result.current.hoverItem('notes'));
    advance(399);
    expect(result.current.openId).toBeNull();
    advance(1);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith('notes');
  });

  it('cancels a pending open when leaving, but cancelClose does not cancel an unopened hover', () => {
    const { result, onOpenChange } = setup();
    act(() => result.current.hoverItem('mail'));
    act(() => result.current.leave());
    advance(1000);
    expect(onOpenChange).not.toHaveBeenCalled();
    act(() => result.current.hoverItem('notes'));
    act(() => result.current.cancelClose());
    advance(400);
    expect(result.current.openId).toBe('notes');
  });

  it.each(['cancelClose', 'hoverItem'] as const)('cancels a pending close with %s', (action) => {
    const { result, onOpenChange } = setup();
    act(() => result.current.open('mail'));
    act(() => result.current.leave());
    advance(100);
    act(() => {
      if (action === 'hoverItem') {
        result.current.hoverItem('mail');
      } else {
        result.current.cancelClose();
      }
    });
    advance(1000);
    expect(result.current.openId).toBe('mail');
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  it('switches an open panel without the opening delay and cancels its pending close', () => {
    const { result, onOpenChange } = setup();
    act(() => result.current.open('mail'));
    act(() => result.current.leave());
    act(() => result.current.hoverItem('notes'));
    advance(0);
    expect(result.current.openId).toBe('notes');
    advance(1000);
    expect(onOpenChange.mock.calls).toEqual([['mail'], ['notes']]);
  });

  it('pins the same open item without repeating the notification and ignores hover and leave', () => {
    const { result, onOpenChange } = setup();
    act(() => result.current.open('mail'));
    act(() => result.current.leave());
    act(() => result.current.open('mail', { pinned: true }));
    act(() => result.current.hoverItem('notes'));
    act(() => result.current.leave());
    advance(1000);
    expect(result.current.openId).toBe('mail');
    expect(result.current.pinned).toBe(true);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    act(() => result.current.close());
    expect(result.current.pinned).toBe(false);
    expect(result.current.openId).toBeNull();
    act(() => result.current.close());
    expect(onOpenChange.mock.calls).toEqual([['mail'], [null]]);
  });

  it('explicit open or close cancels a pending hover', () => {
    const { result, onOpenChange } = setup();
    act(() => result.current.hoverItem('mail'));
    act(() => result.current.open('notes'));
    advance(1000);
    expect(result.current.openId).toBe('notes');
    act(() => result.current.close());
    act(() => result.current.hoverItem('mail'));
    act(() => result.current.close());
    advance(1000);
    expect(onOpenChange.mock.calls).toEqual([['notes'], [null]]);
  });

  it('requests controlled changes without replacing the prop value', () => {
    const { result, rerender, onOpenChange } = setup({ openId: null });
    act(() => result.current.open('mail', { pinned: true }));
    expect(result.current.openId).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith('mail');
    rerender({ openId: 'mail', delay, onOpenChange });
    expect(result.current.openId).toBe('mail');
    act(() => result.current.close());
    expect(result.current.openId).toBe('mail');
    expect(onOpenChange).toHaveBeenLastCalledWith(null);
    rerender({ openId: null, delay, onOpenChange });
    expect(result.current.openId).toBeNull();
  });

  it('uses the latest callback when an existing timer fires', () => {
    const { result, rerender, onOpenChange } = setup();
    act(() => result.current.hoverItem('mail'));
    const latest = jest.fn();
    rerender({ openId: undefined, delay, onOpenChange: latest });
    advance(400);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledWith('mail');
  });

  it('uses updated delays for subsequent hover and leave events, including zero', () => {
    const { result, rerender, onOpenChange } = setup();
    rerender({ openId: undefined, delay: { open: 0, close: 0 }, onOpenChange });
    act(() => result.current.hoverItem('mail'));
    advance(0);
    expect(result.current.openId).toBe('mail');
    act(() => result.current.leave());
    advance(0);
    expect(result.current.openId).toBeNull();
  });

  it.each(['open', 'close'])('clears a pending %s timer on unmount', (pending) => {
    const { result, unmount, onOpenChange } = setup();
    if (pending === 'open') {
      act(() => result.current.hoverItem('mail'));
    } else {
      act(() => result.current.open('mail'));
      act(() => result.current.leave());
      onOpenChange.mockClear();
    }
    unmount();
    expect(jest.getTimerCount()).toBe(0);
    advance(1000);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('works without an onOpenChange callback', () => {
    const { result } = setup({ onOpenChange: undefined });
    act(() => result.current.open('mail'));
    expect(result.current.openId).toBe('mail');
    act(() => result.current.close());
    expect(result.current.openId).toBeNull();
  });
});
