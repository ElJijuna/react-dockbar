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

    const backButton = screen.getByRole('button', { name: 'Back' });
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

  describe('magnification', () => {
    // jsdom has no layout: place items 60px apart, 50px wide, so Mail's center is x=85.
    const mockItemRects = (container: HTMLElement) => {
      container.querySelectorAll<HTMLElement>('[data-dockbar-part="item"]').forEach((el, i) => {
        jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
          x: i * 60,
          y: 0,
          left: i * 60,
          top: 0,
          width: 50,
          height: 50,
          right: i * 60 + 50,
          bottom: 50,
          toJSON: () => ({}),
        });
      });
    };
    const scaleOf = (name: string) =>
      Number(screen.getByRole('button', { name }).style.getPropertyValue('--dockbar-item-scale'));

    it('scales items continuously by pointer distance and marks the closest one as hovered', () => {
      const { container } = render(
        <DockBar items={flatItems()} magnification={{ scale: 1.5, distance: 150 }} />,
      );
      mockItemRects(container);

      fireEvent.mouseMove(getLevel(container), { clientX: 85 });

      expect(scaleOf('Mail')).toBe(1.5);
      expect(scaleOf('Finder')).toBeGreaterThan(1);
      expect(scaleOf('Finder')).toBeLessThan(1.5);
      expect(scaleOf('Finder')).toBeCloseTo(scaleOf('Photos'));
      expect(scaleOf('Trash')).toBeLessThan(scaleOf('Photos'));
      expect(screen.getByRole('button', { name: 'Mail' })).toHaveAttribute('data-dockbar-hovered');
      expect(screen.getByRole('button', { name: 'Finder' })).not.toHaveAttribute(
        'data-dockbar-hovered',
      );
    });

    it('resets every item to its base size when the pointer leaves the dock', () => {
      const { container } = render(<DockBar items={flatItems()} />);
      mockItemRects(container);

      fireEvent.mouseMove(getLevel(container), { clientX: 85 });
      expect(scaleOf('Mail')).toBeGreaterThan(1);

      fireEvent.mouseLeave(getLevel(container));
      expect(scaleOf('Mail')).toBe(1);
      expect(scaleOf('Finder')).toBe(1);
    });

    it('magnifies around the focused item for keyboard users', async () => {
      const user = userEvent.setup();
      const { container } = render(<DockBar items={flatItems()} />);
      mockItemRects(container);

      await user.tab();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Mail' })).toHaveAttribute('data-dockbar-hovered');
    });

    it('does not magnify an item that only received focus from a mouse click', async () => {
      const user = userEvent.setup();
      const { container } = render(<DockBar items={flatItems()} />);
      mockItemRects(container);
      jest.spyOn(HTMLElement.prototype, 'matches').mockImplementation(function (
        this: HTMLElement,
        selector: string,
      ) {
        return selector === ':focus-visible'
          ? false
          : Element.prototype.matches.call(this, selector);
      });

      await user.click(screen.getByRole('button', { name: 'Photos' }));
      expect(scaleOf('Photos')).toBe(1);
      jest.restoreAllMocks();
    });

    it('never magnifies when disabled', () => {
      const { container } = render(<DockBar items={flatItems()} magnification={false} />);
      mockItemRects(container);

      fireEvent.mouseMove(getLevel(container), { clientX: 85 });
      expect(scaleOf('Mail')).toBe(1);
    });
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

  describe('active item', () => {
    it('marks the controlled activeId with aria-current and the active indicator', () => {
      render(<DockBar items={flatItems()} activeId="mail" />);

      const mail = screen.getByRole('button', { name: 'Mail' });
      expect(mail).toHaveAttribute('aria-current', 'true');
      expect(mail).toHaveAttribute('data-dockbar-active', 'self');
      expect(screen.getByRole('button', { name: 'Finder' })).not.toHaveAttribute('aria-current');
    });

    it('marks the parent of a nested active item, then the item itself once drilled in', async () => {
      const user = userEvent.setup();
      const { container } = render(<DockBar items={nestedItems()} activeId="bluetooth" />);

      const settings = screen.getByRole('button', { name: /Settings/ });
      expect(settings).toHaveAttribute('data-dockbar-active', 'ancestor');
      expect(settings).not.toHaveAttribute('aria-current');

      await user.click(settings);
      endLevelTransition(container);
      endLevelTransition(container);

      expect(screen.getByRole('button', { name: 'Bluetooth' })).toHaveAttribute(
        'data-dockbar-active',
        'self',
      );
      expect(screen.getByRole('button', { name: 'Back' })).not.toHaveAttribute(
        'data-dockbar-active',
      );
    });

    it('does not change the active item on click when controlled', async () => {
      const user = userEvent.setup();
      render(<DockBar items={flatItems()} activeId="mail" />);

      await user.click(screen.getByRole('button', { name: 'Photos' }));
      expect(screen.getByRole('button', { name: 'Mail' })).toHaveAttribute('aria-current');
      expect(screen.getByRole('button', { name: 'Photos' })).not.toHaveAttribute('aria-current');
    });

    it('moves the active item to the selected leaf when uncontrolled', async () => {
      const user = userEvent.setup();
      render(<DockBar items={flatItems()} defaultActiveId="finder" />);
      expect(screen.getByRole('button', { name: 'Finder' })).toHaveAttribute('aria-current');

      await user.click(screen.getByRole('button', { name: 'Photos' }));
      expect(screen.getByRole('button', { name: 'Photos' })).toHaveAttribute('aria-current');
      expect(screen.getByRole('button', { name: 'Finder' })).not.toHaveAttribute('aria-current');
    });

    it('exposes active state to itemClassName', () => {
      render(
        <DockBar
          items={nestedItems()}
          activeId="wifi"
          itemClassName={(_item, state) =>
            state.active ? 'is-active' : state.containsActive ? 'has-active' : undefined
          }
        />,
      );
      expect(screen.getByRole('button', { name: /Settings/ })).toHaveClass('has-active');
    });
  });
});
