import { act, renderHook } from '@testing-library/react';
import { DOCKBAR_BACK_ID } from '../constants';
import type { DockBarItem } from '../types';
import { useDockBarNavigation } from './useDockBarNavigation';

const settingsChildren: DockBarItem[] = [
  { id: 'wifi', label: 'Wi-Fi', icon: null },
  { id: 'bluetooth', label: 'Bluetooth', icon: null },
];

const rootItems: DockBarItem[] = [
  { id: 'finder', label: 'Finder', icon: null },
  { id: 'settings', label: 'Settings', icon: null, children: settingsChildren },
];

const sameTarget = {};
const levelAnimationEnd = { target: sameTarget, currentTarget: sameTarget };
const bubbledAnimationEnd = { target: {}, currentTarget: sameTarget };

function renderNav(overrides?: Partial<Parameters<typeof useDockBarNavigation>[1]>) {
  return renderHook((items: DockBarItem[] = rootItems) =>
    useDockBarNavigation(items, { ...overrides }),
  );
}

describe('useDockBarNavigation', () => {
  it('starts at depth 0 showing the root items with no back item', () => {
    const { result } = renderNav();
    expect(result.current.depth).toBe(0);
    expect(result.current.levelItems).toEqual(rootItems);
    expect(result.current.phase).toBe('idle');
  });

  it('enters the collapsing phase without changing levelItems until the animation ends', () => {
    const { result } = renderNav();
    act(() => result.current.navigateTo(rootItems[1]));
    expect(result.current.phase).toBe('collapsing');
    expect(result.current.levelItems).toEqual(rootItems);
  });

  it('progresses collapsing -> expanding -> idle on two animation-end events, revealing children + back item', () => {
    const { result } = renderNav();
    act(() => result.current.navigateTo(rootItems[1]));

    act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
    expect(result.current.phase).toBe('expanding');
    expect(result.current.depth).toBe(1);
    expect(result.current.levelItems).toEqual(settingsChildren);

    act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
    expect(result.current.phase).toBe('idle');
    expect(result.current.focusRequest).toEqual({ id: DOCKBAR_BACK_ID });
  });

  it('ignores animation-end events bubbled from a child instead of the level wrapper itself', () => {
    const { result } = renderNav();
    act(() => result.current.navigateTo(rootItems[1]));

    act(() => result.current.handleLevelAnimationEnd(bubbledAnimationEnd));
    expect(result.current.phase).toBe('collapsing');
  });

  it('navigates back through breadcrumb and restores the root level, focusing the item drilled into', () => {
    const { result } = renderNav();
    act(() => result.current.navigateTo(rootItems[1]));
    act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
    act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));

    act(() => result.current.navigateBack());
    expect(result.current.phase).toBe('collapsing');
    act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
    expect(result.current.phase).toBe('expanding');
    expect(result.current.depth).toBe(0);
    act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));

    expect(result.current.phase).toBe('idle');
    expect(result.current.levelItems).toEqual(rootItems);
    expect(result.current.focusRequest).toEqual({ id: 'settings' });
  });

  it('ignores navigateTo/navigateBack calls while a transition is already in progress', () => {
    const { result } = renderNav();
    act(() => result.current.navigateTo(rootItems[1]));
    act(() => result.current.navigateTo(rootItems[0]));
    act(() => result.current.navigateBack());

    expect(result.current.phase).toBe('collapsing');
    expect(result.current.direction).toBe('forward');
  });

  it('resolves navigation synchronously with no observable collapsing/expanding phase when instant', () => {
    const { result } = renderNav({ instant: true });
    act(() => result.current.navigateTo(rootItems[1]));

    expect(result.current.phase).toBe('idle');
    expect(result.current.depth).toBe(1);
    expect(result.current.levelItems).toEqual(settingsChildren);
  });

  it('resolves navigation synchronously when animationDuration is 0', () => {
    const { result } = renderNav({ animationDuration: 0 });
    act(() => result.current.navigateTo(rootItems[1]));

    expect(result.current.phase).toBe('idle');
    expect(result.current.depth).toBe(1);
  });

  it('calls onNavigate exactly once per completed navigation with the right payload', () => {
    const onNavigate = jest.fn();
    const { result } = renderNav({ onNavigate });

    act(() => result.current.navigateTo(rootItems[1]));
    act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
    act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith({
      direction: 'forward',
      depth: 1,
      path: [rootItems[1]],
      item: rootItems[1],
    });
  });

  it('falls back to a timeout-driven phase advance if animationend never fires', () => {
    jest.useFakeTimers();
    try {
      const { result } = renderNav({ animationDuration: 200 });
      act(() => result.current.navigateTo(rootItems[1]));
      expect(result.current.phase).toBe('collapsing');

      act(() => {
        jest.advanceTimersByTime(250);
      });
      expect(result.current.phase).toBe('expanding');

      act(() => {
        jest.advanceTimersByTime(250);
      });
      expect(result.current.phase).toBe('idle');
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps its depth and derives the level from new items with the same ids', () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: DockBarItem[] }) => useDockBarNavigation(items, { instant: true }),
      { initialProps: { items: rootItems } },
    );
    act(() => result.current.navigateTo(rootItems[1]));
    expect(result.current.depth).toBe(1);

    const renamedChildren: DockBarItem[] = [{ id: 'wifi', label: 'Wi-Fi 7', icon: null }];
    const nextItems: DockBarItem[] = [rootItems[0], { ...rootItems[1], children: renamedChildren }];
    rerender({ items: nextItems });

    expect(result.current.depth).toBe(1);
    expect(result.current.levelItems).toBe(renamedChildren);
    expect(result.current.breadcrumb).toEqual([nextItems[1]]);
  });
});
