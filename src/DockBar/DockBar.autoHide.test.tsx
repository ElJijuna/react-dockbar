import { act, fireEvent, render, screen } from '@testing-library/react';
import type { DockBarItem, DockBarPreview } from '../types';
import { DockBar } from './DockBar';

function items(previews?: DockBarPreview[]): DockBarItem[] {
  return [
    { id: 'home', label: 'Home', icon: <span>H</span> },
    { id: 'mail', label: 'Mail', icon: <span>M</span>, previews },
  ];
}

const toolbar = () => screen.getByRole('toolbar');
const revealZone = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-dockbar-part="reveal-zone"]');
const isHidden = () => toolbar().hasAttribute('data-dockbar-hidden');

function renderAutoHide(props: Partial<Parameters<typeof DockBar>[0]> = {}) {
  const result = render(<DockBar items={items()} autoHide {...props} />);
  const zone = revealZone(result.container);
  if (!zone) {
    throw new Error('reveal zone not rendered');
  }
  return { ...result, zone };
}

describe('DockBar autoHide', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('is off by default: no reveal zone and never hidden', () => {
    const { container } = render(<DockBar items={items()} />);

    expect(revealZone(container)).toBeNull();
    expect(isHidden()).toBe(false);
    expect(toolbar()).not.toHaveAttribute('data-dockbar-auto-hide');
  });

  it('starts hidden, with a reveal zone along the edge of the dock', () => {
    const { zone } = renderAutoHide();

    expect(isHidden()).toBe(true);
    expect(zone).toHaveAttribute('data-dockbar-edge', 'bottom');
    expect(zone).toHaveAttribute('aria-hidden', 'true');
  });

  it('follows the edge of the position and orientation', () => {
    const { zone } = renderAutoHide({ position: 'right-center', orientation: 'vertical' });

    expect(zone).toHaveAttribute('data-dockbar-edge', 'right');
    expect(toolbar()).toHaveAttribute('data-dockbar-edge', 'right');
  });

  it('is ignored for an inline dock', () => {
    const { container } = render(<DockBar items={items()} autoHide position="inline" />);

    expect(revealZone(container)).toBeNull();
    expect(isHidden()).toBe(false);
  });

  it('shows when the pointer reaches the edge and hides after the delay once it leaves', () => {
    const { zone } = renderAutoHide();

    fireEvent.pointerEnter(zone, { pointerType: 'mouse' });
    expect(isHidden()).toBe(false);

    fireEvent.pointerLeave(zone, { pointerType: 'mouse' });
    act(() => jest.advanceTimersByTime(399));
    expect(isHidden()).toBe(false);
    act(() => jest.advanceTimersByTime(1));
    expect(isHidden()).toBe(true);
  });

  it('stays while the pointer moves from the edge onto the dock', () => {
    const { zone } = renderAutoHide();
    fireEvent.pointerEnter(zone, { pointerType: 'mouse' });

    fireEvent.pointerLeave(zone, { pointerType: 'mouse' });
    act(() => jest.advanceTimersByTime(200));
    fireEvent.pointerEnter(toolbar(), { pointerType: 'mouse' });
    act(() => jest.advanceTimersByTime(1000));

    expect(isHidden()).toBe(false);
  });

  it('honours a custom delay', () => {
    const { zone } = renderAutoHide({ autoHide: { delay: 50 } });
    fireEvent.pointerEnter(zone, { pointerType: 'mouse' });
    fireEvent.pointerLeave(zone, { pointerType: 'mouse' });

    act(() => jest.advanceTimersByTime(50));

    expect(isHidden()).toBe(true);
  });

  it('shows while focus is inside, so Tab reveals it', () => {
    render(
      <>
        <DockBar items={items()} autoHide />
        <button type="button">After</button>
      </>,
    );

    act(() => screen.getByRole('button', { name: 'Home' }).focus());
    expect(isHidden()).toBe(false);

    act(() => screen.getByRole('button', { name: 'After' }).focus());
    act(() => jest.advanceTimersByTime(400));
    expect(isHidden()).toBe(true);
  });

  it('keeps a touch reveal until the next touch outside the dock', () => {
    const { zone } = renderAutoHide();

    fireEvent.pointerEnter(zone, { pointerType: 'touch' });
    fireEvent.pointerDown(zone, { pointerType: 'touch' });
    fireEvent.pointerLeave(zone, { pointerType: 'touch' });
    act(() => jest.advanceTimersByTime(1000));
    expect(isHidden()).toBe(false);

    fireEvent.pointerDown(document.body, { pointerType: 'touch' });
    act(() => jest.advanceTimersByTime(400));
    expect(isHidden()).toBe(true);
  });

  it('stays while a previews panel is open', () => {
    render(
      <DockBar
        items={items([
          { id: 'a', title: 'A', thumbnail: <span>a</span> },
          { id: 'b', title: 'B', thumbnail: <span>b</span> },
        ])}
        autoHide
        openPreviewsId="mail"
      />,
    );

    act(() => jest.advanceTimersByTime(1000));

    expect(isHidden()).toBe(false);
  });

  it('does not publish the viewport inset: it overlays the page', () => {
    renderAutoHide();

    expect(document.documentElement.style.getPropertyValue('--dockbar-inset-bottom')).toBe('');
  });
});
