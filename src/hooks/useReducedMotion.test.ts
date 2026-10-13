import { act, renderHook } from '@testing-library/react';
import { useReducedMotion } from './useReducedMotion';

const query = '(prefers-reduced-motion: reduce)';

function mockMedia(matches: boolean) {
  const target = new EventTarget();
  const media: MediaQueryList = {
    ...window.matchMedia(query),
    matches,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  };
  const add = jest.spyOn(media, 'addEventListener');
  const remove = jest.spyOn(media, 'removeEventListener');
  const matchMedia = jest.spyOn(window, 'matchMedia').mockReturnValue(media);
  const change = (next: boolean) => {
    Object.defineProperty(media, 'matches', { configurable: true, value: next });
    act(() => {
      media.dispatchEvent(new Event('change'));
    });
  };
  return { media, add, remove, matchMedia, change };
}

describe('useReducedMotion', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([true, false])('reads the initial OS preference (%s)', (matches) => {
    const { matchMedia, add } = mockMedia(matches);
    const { result } = renderHook(useReducedMotion);
    expect(result.current).toBe(matches);
    expect(matchMedia).toHaveBeenCalledWith(query);
    expect(add).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('updates in both directions when the preference changes', () => {
    const { change } = mockMedia(false);
    const { result } = renderHook(useReducedMotion);
    change(true);
    expect(result.current).toBe(true);
    change(false);
    expect(result.current).toBe(false);
  });

  it('keeps the subscription across renders and removes the same listener on unmount', () => {
    const { add, remove, change } = mockMedia(false);
    const { result, rerender, unmount } = renderHook(useReducedMotion);
    rerender();
    change(true);
    expect(result.current).toBe(true);
    expect(add).toHaveBeenCalledTimes(1);
    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('change', add.mock.calls[0][1]);
    change(false);
    expect(result.current).toBe(true);
  });

  it('updates multiple subscribers independently and keeps remaining subscribers after unmount', () => {
    const { change, remove } = mockMedia(false);
    const first = renderHook(useReducedMotion);
    const second = renderHook(useReducedMotion);
    change(true);
    expect(first.result.current).toBe(true);
    expect(second.result.current).toBe(true);
    first.unmount();
    change(false);
    expect(second.result.current).toBe(false);
    expect(remove).toHaveBeenCalledTimes(1);
    second.unmount();
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it('defaults to false when matchMedia is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: undefined });
    try {
      const { result, unmount } = renderHook(useReducedMotion);
      expect(result.current).toBe(false);
      unmount();
    } finally {
      if (descriptor) {
        Object.defineProperty(window, 'matchMedia', descriptor);
      }
    }
  });
});
