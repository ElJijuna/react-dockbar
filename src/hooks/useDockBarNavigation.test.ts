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

describe('useDockBarNavigation regressions', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('ignores Back and animationend at the root, and refuses leaves and empty parents', () => {
    const onNavigate = jest.fn();
    const { result } = renderNav({ onNavigate });
    act(() => result.current.navigateBack());
    act(() => result.current.navigateTo(rootItems[0]));
    act(() => result.current.navigateTo({ id: 'empty', label: 'Empty', icon: null, children: [] }));
    act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
    expect(result.current.phase).toBe('idle');
    expect(result.current.depth).toBe(0);
    expect(result.current.focusRequest).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it.each(['collapsing', 'expanding'])('ignores another parent and Back while %s', (phase) => {
    const other: DockBarItem = {
      id: 'other',
      label: 'Other',
      icon: null,
      children: settingsChildren,
    };
    const { result } = renderHook(() => useDockBarNavigation([...rootItems, other], {}));
    act(() => result.current.navigateTo(rootItems[1]));
    if (phase === 'expanding') {
      act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
    }
    act(() => result.current.navigateTo(other));
    act(() => result.current.navigateBack());
    expect(result.current.phase).toBe(phase);
    expect(result.current.direction).toBe('forward');
    if (phase === 'collapsing') {
      act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
    }
    act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
    expect(result.current.breadcrumb).toEqual([rootItems[1]]);
  });

  it('validates the initial path only on mount and backs through a nested breadcrumb', () => {
    const inner: DockBarItem = {
      id: 'inner',
      label: 'Inner',
      icon: null,
      children: settingsChildren,
    };
    const outer: DockBarItem = { id: 'outer', label: 'Outer', icon: null, children: [inner] };
    const onNavigate = jest.fn();
    const { result, rerender } = renderHook(
      ({ initialPathIds }) =>
        useDockBarNavigation([outer], { initialPathIds, instant: true, onNavigate }),
      { initialProps: { initialPathIds: ['outer', 'inner', 'missing'] } },
    );
    expect(result.current.depth).toBe(2);
    expect(result.current.levelItems).toBe(settingsChildren);
    expect(onNavigate).not.toHaveBeenCalled();
    rerender({ initialPathIds: [] });
    expect(result.current.depth).toBe(2);
    act(() => result.current.navigateBack());
    expect(result.current.focusRequest).toEqual({ id: 'inner' });
    expect(onNavigate).toHaveBeenLastCalledWith({
      direction: 'back',
      depth: 1,
      path: [outer],
      item: inner,
    });
    act(() => result.current.navigateBack());
    expect(result.current.depth).toBe(0);
    expect(result.current.focusRequest).toEqual({ id: 'outer' });
  });

  it.each(['removed', 'empty children'])(
    'drops an invalidated parent path when it has %s',
    (change) => {
      const inner: DockBarItem = {
        id: 'inner',
        label: 'Inner',
        icon: null,
        children: settingsChildren,
      };
      const outer: DockBarItem = { id: 'outer', label: 'Outer', icon: null, children: [inner] };
      const onNavigate = jest.fn();
      const { result, rerender } = renderHook(
        (items: DockBarItem[]) =>
          useDockBarNavigation(items, {
            instant: true,
            initialPathIds: ['outer', 'inner'],
            onNavigate,
          }),
        { initialProps: [outer] },
      );
      const children = change === 'removed' ? [rootItems[0]] : [{ ...inner, children: [] }];
      const updated = { ...outer, children };
      rerender([updated]);
      expect(result.current.depth).toBe(1);
      expect(result.current.breadcrumb).toEqual([updated]);
      expect(result.current.levelItems).toBe(children);
      expect(onNavigate).not.toHaveBeenCalled();
      act(() => result.current.navigateBack());
      expect(result.current.depth).toBe(0);
      expect(onNavigate).toHaveBeenCalledTimes(1);
    },
  );

  it('uses current items and the latest callback when navigation completes', () => {
    const oldCallback = jest.fn();
    const latest = jest.fn();
    const { result, rerender } = renderHook(
      ({ items, onNavigate }) => useDockBarNavigation(items, { onNavigate }),
      { initialProps: { items: rootItems, onNavigate: oldCallback } },
    );
    act(() => result.current.navigateTo(rootItems[1]));
    act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
    const renamed = { ...rootItems[1], label: 'Updated settings' };
    rerender({ items: [rootItems[0], renamed], onNavigate: latest });
    act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
    expect(oldCallback).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledWith({
      direction: 'forward',
      depth: 1,
      path: [renamed],
      item: renamed,
    });
    act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
    act(() => jest.advanceTimersByTime(1000));
    expect(latest).toHaveBeenCalledTimes(1);
  });

  it.each(['forward', 'back'])(
    'does not report a %s navigation whose target disappears',
    (direction) => {
      const onNavigate = jest.fn();
      const { result, rerender } = renderHook(
        (items: DockBarItem[]) =>
          useDockBarNavigation(items, {
            onNavigate,
            initialPathIds: direction === 'back' ? ['settings'] : [],
          }),
        { initialProps: rootItems },
      );
      act(() => {
        if (direction === 'forward') {
          result.current.navigateTo(rootItems[1]);
        } else {
          result.current.navigateBack();
        }
      });
      act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
      rerender([rootItems[0]]);
      act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
      expect(result.current.phase).toBe('idle');
      expect(result.current.depth).toBe(0);
      expect(onNavigate).not.toHaveBeenCalled();
    },
  );

  it('cancels the timeout safety net when animation events advance both phases', () => {
    const onNavigate = jest.fn();
    const { result } = renderNav({ animationDuration: 200, onNavigate });
    act(() => result.current.navigateTo(rootItems[1]));
    act(() => jest.advanceTimersByTime(249));
    expect(result.current.phase).toBe('collapsing');
    act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
    expect(jest.getTimerCount()).toBe(1);
    act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
    expect(jest.getTimerCount()).toBe(0);
    act(() => jest.advanceTimersByTime(1000));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it.each(['collapsing', 'expanding'])(
    'clears the pending timeout on unmount during %s',
    (phase) => {
      const onNavigate = jest.fn();
      const { result, unmount } = renderNav({ onNavigate });
      act(() => result.current.navigateTo(rootItems[1]));
      if (phase === 'expanding') {
        act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
      }
      unmount();
      expect(jest.getTimerCount()).toBe(0);
      act(() => jest.advanceTimersByTime(1000));
      expect(onNavigate).not.toHaveBeenCalled();
    },
  );

  it('finishes an in-flight transition when instant is enabled and ignores stale animation events', () => {
    const onNavigate = jest.fn();
    const { result, rerender } = renderHook(
      ({ instant }) => useDockBarNavigation(rootItems, { instant, onNavigate }),
      { initialProps: { instant: false } },
    );
    act(() => result.current.navigateTo(rootItems[1]));
    rerender({ instant: true });
    expect(result.current.phase).toBe('idle');
    expect(result.current.depth).toBe(1);
    expect(jest.getTimerCount()).toBe(0);
    act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('creates a new focus request each time the same parent is entered', () => {
    const { result } = renderNav({ instant: true });
    act(() => result.current.navigateTo(rootItems[1]));
    const first = result.current.focusRequest;
    act(() => result.current.navigateBack());
    act(() => result.current.navigateTo(rootItems[1]));
    expect(result.current.focusRequest).toEqual(first);
    expect(result.current.focusRequest).not.toBe(first);
  });
});

describe('useDockBarNavigation duplicate animation events', () => {
  it('advances only once when duplicate collapse events arrive in the same batch', () => {
    const { result } = renderNav();
    act(() => result.current.navigateTo(rootItems[1]));
    const finishCollapse = result.current.handleLevelAnimationEnd;
    act(() => {
      finishCollapse(levelAnimationEnd);
      finishCollapse(levelAnimationEnd);
    });
    expect(result.current.phase).toBe('expanding');
    expect(result.current.depth).toBe(1);
    expect(result.current.breadcrumb).toEqual([rootItems[1]]);
  });

  it('emits one callback and one focus request for duplicate expand events', () => {
    const onNavigate = jest.fn();
    const { result } = renderNav({ onNavigate });
    act(() => result.current.navigateTo(rootItems[1]));
    act(() => result.current.handleLevelAnimationEnd(levelAnimationEnd));
    const finishExpand = result.current.handleLevelAnimationEnd;
    act(() => {
      finishExpand(levelAnimationEnd);
      finishExpand(levelAnimationEnd);
    });
    expect(result.current.phase).toBe('idle');
    expect(result.current.focusRequest).toEqual({ id: DOCKBAR_BACK_ID });
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
