import { act, render } from '@testing-library/react';
import { DockBar } from '../DockBar/DockBar';
import type { DockBarItem } from '../types';
import { resolveDockEdge } from './useViewportInset';

const items: DockBarItem[] = [{ id: 'home', label: 'Home', icon: <span>H</span> }];
const inset = (edge: string) =>
  document.documentElement.style.getPropertyValue(`--dockbar-inset-${edge}`);

describe('resolveDockEdge', () => {
  it('maps a horizontal dock to the top or bottom edge', () => {
    expect(resolveDockEdge('bottom-left', 'horizontal')).toBe('bottom');
    expect(resolveDockEdge('top-right', 'horizontal')).toBe('top');
  });

  it('maps a vertical dock to the left or right edge', () => {
    expect(resolveDockEdge('left-center', 'vertical')).toBe('left');
    expect(resolveDockEdge('right-center', 'vertical')).toBe('right');
    expect(resolveDockEdge('bottom-right', 'vertical')).toBe('right');
  });

  it('has no edge when rendered inline', () => {
    expect(resolveDockEdge('inline', 'horizontal')).toBeNull();
  });
});

describe('viewport inset', () => {
  let height = 52;
  let width = 300;

  beforeEach(() => {
    height = 52;
    width = 300;
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => height);
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => width);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('publishes the distance to the bottom edge plus the dock height by default', () => {
    render(<DockBar items={items} style={{ bottom: '16px' }} />);

    expect(inset('bottom')).toBe('68px');
  });

  it('moves the variable to the edge the dock is pinned to', () => {
    const { rerender } = render(<DockBar items={items} style={{ bottom: '16px' }} />);

    rerender(<DockBar items={items} position="top-center" style={{ top: '8px' }} />);

    expect(inset('bottom')).toBe('');
    expect(inset('top')).toBe('60px');
  });

  it('uses the width of a vertical dock on a side edge', () => {
    render(
      <DockBar
        items={items}
        position="right-center"
        orientation="vertical"
        style={{ right: '16px' }}
      />,
    );

    expect(inset('right')).toBe('316px');
  });

  it('publishes nothing for an inline dock', () => {
    render(<DockBar items={items} position="inline" />);

    expect(['top', 'bottom', 'left', 'right'].map(inset)).toEqual(['', '', '', '']);
  });

  it('updates when the window resizes', () => {
    render(<DockBar items={items} style={{ bottom: '16px' }} />);

    height = 64;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(inset('bottom')).toBe('80px');
  });

  it('removes the variable on unmount', () => {
    const { unmount } = render(<DockBar items={items} style={{ bottom: '16px' }} />);

    unmount();

    expect(inset('bottom')).toBe('');
  });
});
