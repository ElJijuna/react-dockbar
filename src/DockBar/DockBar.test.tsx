import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { endLevelTransition } from '../test-utils/fireLevelTransition';
import type { DockBarItem } from '../types';
import { DockBar } from './DockBar';

const settingsChildren: DockBarItem[] = [
  { id: 'wifi', label: 'Wi-Fi', icon: <span>W</span> },
  { id: 'bluetooth', label: 'Bluetooth', icon: <span>B</span> },
];

function flatItems(): DockBarItem[] {
  return [
    { id: 'finder', label: 'Finder', icon: <span>F</span>, onSelect: jest.fn() },
    { id: 'mail', label: 'Mail', icon: <span>M</span>, onSelect: jest.fn() },
    { id: 'photos', label: 'Photos', icon: <span>P</span>, onSelect: jest.fn() },
    { id: 'trash', label: 'Trash', icon: <span>T</span>, onSelect: jest.fn(), disabled: true },
  ];
}

function nestedItems(): DockBarItem[] {
  return [
    { id: 'finder', label: 'Finder', icon: <span>F</span>, onSelect: jest.fn() },
    {
      id: 'settings',
      label: 'Settings',
      icon: <span>S</span>,
      children: settingsChildren,
      onSelect: jest.fn(),
    },
  ];
}

function getLevel(container: HTMLElement): HTMLElement {
  const level = container.querySelector<HTMLElement>('[data-dockbar-part="level"]');
  if (!level) {
    throw new Error('level element not found');
  }
  return level;
}

describe('DockBar', () => {
  it('renders flat items and calls onSelect with the item and an empty path on click', async () => {
    const user = userEvent.setup();
    const items = flatItems();
    render(<DockBar items={items} />);

    await user.click(screen.getByRole('button', { name: 'Mail' }));

    expect(items[1].onSelect).toHaveBeenCalledTimes(1);
    expect(items[1].onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ item: items[1], path: [] }),
    );
  });

  it('does not call onSelect for a parent item and instead drills into its children', async () => {
    const user = userEvent.setup();
    const items = nestedItems();
    const { container } = render(<DockBar items={items} />);

    await user.click(screen.getByRole('button', { name: /Settings/ }));
    expect(getLevel(container)).toHaveAttribute('data-dockbar-phase', 'collapsing');
    expect(items[1].onSelect).not.toHaveBeenCalled();

    endLevelTransition(container);
    expect(getLevel(container)).toHaveAttribute('data-dockbar-phase', 'expanding');
    endLevelTransition(container);

    expect(getLevel(container)).toHaveAttribute('data-dockbar-phase', 'idle');
    expect(screen.getByRole('button', { name: 'Wi-Fi' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Finder' })).not.toBeInTheDocument();
  });

  it('shows a Back item only when nested, and navigating back restores the parent level', async () => {
    const user = userEvent.setup();
    const items = nestedItems();
    const { container } = render(<DockBar items={items} />);

    expect(screen.queryByRole('button', { name: /Back/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Settings/ }));
    endLevelTransition(container);
    endLevelTransition(container);

    const backButton = screen.getByRole('button', { name: /Back/ });
    expect(backButton).toBeInTheDocument();

    await user.click(backButton);
    endLevelTransition(container);
    endLevelTransition(container);

    expect(screen.getByRole('button', { name: 'Finder' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Wi-Fi' })).not.toBeInTheDocument();
  });

  it('activates items via keyboard (Enter and Space)', async () => {
    const user = userEvent.setup();
    const items = flatItems();
    render(<DockBar items={items} />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Finder' })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(items[0].onSelect).toHaveBeenCalledTimes(1);

    await user.keyboard(' ');
    expect(items[0].onSelect).toHaveBeenCalledTimes(2);
  });

  it('moves focus to the Back button after drilling in, and back to the origin item after backing out', async () => {
    const user = userEvent.setup();
    const items = nestedItems();
    const { container } = render(<DockBar items={items} />);

    await user.click(screen.getByRole('button', { name: /Settings/ }));
    endLevelTransition(container);
    endLevelTransition(container);
    expect(screen.getByRole('button', { name: /Back/ })).toHaveFocus();

    await user.keyboard('{Enter}');
    endLevelTransition(container);
    endLevelTransition(container);
    expect(screen.getByRole('button', { name: /Settings/ })).toHaveFocus();
  });

  it('reflects the colorScheme and variant props as data attributes on the root element', () => {
    const { rerender } = render(<DockBar items={flatItems()} colorScheme="dark" variant="solid" />);
    expect(screen.getByRole('toolbar')).toHaveAttribute('data-dockbar-color-scheme', 'dark');
    expect(screen.getByRole('toolbar')).toHaveAttribute('data-dockbar-variant', 'solid');

    rerender(<DockBar items={flatItems()} colorScheme="light" variant="glass" />);
    expect(screen.getByRole('toolbar')).toHaveAttribute('data-dockbar-color-scheme', 'light');
    expect(screen.getByRole('toolbar')).toHaveAttribute('data-dockbar-variant', 'glass');
  });

  it('scales the hovered item (and tapers off for neighbors) only when magnification is enabled', () => {
    const items = flatItems();
    const { rerender } = render(
      <DockBar items={items} magnification={{ scale: 1.5, radius: 1 }} />,
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Mail' }));
    expect(
      screen.getByRole('button', { name: 'Mail' }).style.getPropertyValue('--dockbar-item-scale'),
    ).toBe('1.5');
    expect(
      screen.getByRole('button', { name: 'Finder' }).style.getPropertyValue('--dockbar-item-scale'),
    ).not.toBe('1');
    expect(
      screen.getByRole('button', { name: 'Photos' }).style.getPropertyValue('--dockbar-item-scale'),
    ).not.toBe('1');

    rerender(<DockBar items={items} magnification={false} />);
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Mail' }));
    expect(
      screen.getByRole('button', { name: 'Mail' }).style.getPropertyValue('--dockbar-item-scale'),
    ).toBe('1');
  });

  it('does not activate a disabled item', async () => {
    const user = userEvent.setup();
    const items = flatItems();
    render(<DockBar items={items} />);

    const trash = screen.getByRole('button', { name: 'Trash' });
    expect(trash).toBeDisabled();
    await user.click(trash);
    expect(items[3].onSelect).not.toHaveBeenCalled();
  });

  it('resets cleanly to the new root level when the items prop identity changes mid-animation', async () => {
    const user = userEvent.setup();
    const items = nestedItems();
    const { container, rerender } = render(<DockBar items={items} />);

    await user.click(screen.getByRole('button', { name: /Settings/ }));
    expect(getLevel(container)).toHaveAttribute('data-dockbar-phase', 'collapsing');

    const nextItems = flatItems();
    rerender(<DockBar items={nextItems} />);

    expect(getLevel(container)).toHaveAttribute('data-dockbar-phase', 'idle');
    expect(screen.getByRole('button', { name: 'Finder' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Back/ })).not.toBeInTheDocument();
  });
});
