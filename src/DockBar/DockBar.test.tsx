import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useState } from 'react';
import { endLevelTransition } from '../test-utils/fireLevelTransition';
import type { DockBarEntry, DockBarItem } from '../types';
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

  describe('keyboard navigation (roving tabindex)', () => {
    const grouped = (): DockBarEntry[] => [
      { id: 'finder', label: 'Finder', icon: <span>F</span> },
      { type: 'separator', id: 'sep' },
      { id: 'mail', label: 'Mail', icon: <span>M</span> },
      { id: 'trash', label: 'Trash', icon: <span>T</span>, disabled: true },
      { id: 'photos', label: 'Photos', icon: <span>P</span> },
    ];
    const button = (name: string | RegExp) => screen.getByRole('button', { name });

    it('exposes a single tab stop for the whole dock', async () => {
      const user = userEvent.setup();
      render(
        <>
          <DockBar items={grouped()} />
          <button type="button">Outside</button>
        </>,
      );

      const tabStops = screen
        .getByRole('toolbar')
        .querySelectorAll('[data-dockbar-item-id][tabindex="0"]');
      expect(tabStops).toHaveLength(1);

      await user.tab();
      expect(button('Finder')).toHaveFocus();
      await user.tab();
      expect(button('Outside')).toHaveFocus();
    });

    it('moves with ArrowRight/ArrowLeft, wrapping and skipping separators and disabled items', async () => {
      const user = userEvent.setup();
      render(<DockBar items={grouped()} />);
      await user.tab();

      await user.keyboard('{ArrowRight}');
      expect(button('Mail')).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      expect(button('Photos')).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      expect(button('Finder')).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      expect(button('Photos')).toHaveFocus();
    });

    it('jumps to the ends with Home and End', async () => {
      const user = userEvent.setup();
      render(<DockBar items={grouped()} />);
      await user.tab();

      await user.keyboard('{End}');
      expect(button('Photos')).toHaveFocus();
      await user.keyboard('{Home}');
      expect(button('Finder')).toHaveFocus();
    });

    it('uses ArrowDown/ArrowUp when vertical and ignores horizontal arrows', async () => {
      const user = userEvent.setup();
      render(<DockBar items={grouped()} orientation="vertical" />);
      await user.tab();

      await user.keyboard('{ArrowRight}');
      expect(button('Finder')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(button('Mail')).toHaveFocus();
      await user.keyboard('{ArrowUp}');
      expect(button('Finder')).toHaveFocus();
    });

    it('reverses horizontal arrows in right-to-left layouts', async () => {
      const user = userEvent.setup();
      render(<DockBar items={grouped()} style={{ direction: 'rtl' }} />);
      await user.tab();

      await user.keyboard('{ArrowLeft}');
      expect(button('Mail')).toHaveFocus();
    });

    it('remembers the last focused item as the tab stop when tabbing back in', async () => {
      const user = userEvent.setup();
      render(
        <>
          <DockBar items={grouped()} />
          <button type="button">Outside</button>
        </>,
      );
      await user.tab();
      await user.keyboard('{End}');
      await user.tab();
      expect(button('Outside')).toHaveFocus();

      await user.tab({ shift: true });
      expect(button('Photos')).toHaveFocus();
    });

    it('starts on the active item, or on the parent that contains it', async () => {
      const user = userEvent.setup();
      const { unmount } = render(<DockBar items={grouped()} activeId="mail" />);
      await user.tab();
      expect(button('Mail')).toHaveFocus();
      unmount();

      render(<DockBar items={nestedItems()} activeId="bluetooth" />);
      await user.tab();
      expect(button(/Settings/)).toHaveFocus();
    });

    it('includes the Back bubble as the first stop inside a nested level', async () => {
      const user = userEvent.setup();
      const { container } = render(<DockBar items={nestedItems()} />);
      await user.tab();
      await user.keyboard('{ArrowRight}{Enter}');
      endLevelTransition(container);
      endLevelTransition(container);
      expect(button('Back')).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(button('Wi-Fi')).toHaveFocus();
      await user.keyboard('{Home}');
      expect(button('Back')).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      expect(button('Bluetooth')).toHaveFocus();
    });

    it('ignores arrow keys while a level transition is running', async () => {
      const user = userEvent.setup();
      const { container } = render(<DockBar items={nestedItems()} />);
      await user.tab();
      await user.keyboard('{ArrowRight}{Enter}');
      expect(getLevel(container)).toHaveAttribute('data-dockbar-phase', 'collapsing');

      await user.keyboard('{ArrowLeft}');
      expect(button(/Settings/)).toHaveFocus();
    });
  });

  describe('focus management', () => {
    const threeLevels = (): DockBarEntry[] => [
      { id: 'finder', label: 'Finder', icon: <span>F</span> },
      {
        id: 'settings',
        label: 'Settings',
        icon: <span>S</span>,
        children: [
          {
            id: 'network',
            label: 'Network',
            icon: <span>N</span>,
            children: [{ id: 'vpn', label: 'VPN', icon: <span>V</span> }],
          },
        ],
      },
    ];

    it('moves focus correctly under StrictMode', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <StrictMode>
          <DockBar items={nestedItems()} />
        </StrictMode>,
      );

      await user.click(screen.getByRole('button', { name: /Settings/ }));
      endLevelTransition(container);
      endLevelTransition(container);
      expect(screen.getByRole('button', { name: 'Back' })).toHaveFocus();

      await user.keyboard('{Enter}');
      endLevelTransition(container);
      endLevelTransition(container);
      expect(screen.getByRole('button', { name: /Settings/ })).toHaveFocus();
    });

    it('focuses Back again when drilling into consecutive levels (same focus target)', async () => {
      const user = userEvent.setup();
      const { container } = render(<DockBar items={threeLevels()} />);

      await user.click(screen.getByRole('button', { name: /Settings/ }));
      endLevelTransition(container);
      endLevelTransition(container);
      await user.click(screen.getByRole('button', { name: /Network/ }));
      endLevelTransition(container);
      endLevelTransition(container);

      expect(screen.getByRole('button', { name: 'Back to Settings' })).toHaveFocus();
    });

    it('does not steal focus back when re-rendering after a navigation', async () => {
      const user = userEvent.setup();
      const { container, rerender } = render(
        <>
          <DockBar items={nestedItems()} />
          <button type="button">Outside</button>
        </>,
      );
      await user.click(screen.getByRole('button', { name: /Settings/ }));
      endLevelTransition(container);
      endLevelTransition(container);

      await user.click(screen.getByRole('button', { name: 'Outside' }));
      rerender(
        <>
          <DockBar items={nestedItems()} />
          <button type="button">Outside</button>
        </>,
      );

      expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
    });
  });

  describe('badge', () => {
    const badgeItem = (extra: Partial<DockBarItem>): DockBarItem[] => [
      { id: 'mail', label: 'Mail', icon: <span>M</span>, ...extra },
    ];

    it('announces a number or text badge in the accessible name', () => {
      const { rerender } = render(<DockBar items={badgeItem({ badge: 3 })} />);
      expect(screen.getByRole('button', { name: 'Mail, 3 notifications' })).toBeInTheDocument();

      rerender(<DockBar items={badgeItem({ badge: 1 })} />);
      expect(screen.getByRole('button', { name: 'Mail, 1 notification' })).toBeInTheDocument();

      rerender(<DockBar items={badgeItem({ badge: 'New' })} />);
      expect(screen.getByRole('button', { name: 'Mail, New' })).toBeInTheDocument();
    });

    it('does not announce a badge that is not shown', () => {
      render(<DockBar items={badgeItem({ badge: 0, badgeLabel: 'no messages' })} />);

      expect(screen.getByRole('button', { name: 'Mail' })).toBeInTheDocument();
    });

    it('uses badgeLabel for a badge that is not text', () => {
      render(
        <DockBar
          items={badgeItem({ badge: <span className="dot" />, badgeLabel: 'unread messages' })}
        />,
      );

      expect(screen.getByRole('button', { name: 'Mail, unread messages' })).toBeInTheDocument();
    });

    it('leaves a non-text badge without badgeLabel out of the name', () => {
      render(<DockBar items={badgeItem({ badge: <span className="dot" /> })} />);

      expect(screen.getByRole('button', { name: 'Mail' })).toBeInTheDocument();
    });

    it('adds the badge after the submenu description of a parent item', () => {
      render(
        <DockBar
          items={[
            {
              id: 'settings',
              label: 'Settings',
              icon: <span>S</span>,
              badge: 2,
              children: settingsChildren,
            },
          ]}
        />,
      );

      expect(
        screen.getByRole('button', { name: 'Settings, opens 2 more options, 2 notifications' }),
      ).toBeInTheDocument();
    });

    it('builds the text with the labels.badge translation', () => {
      render(
        <DockBar
          items={badgeItem({ badge: 3 })}
          labels={{ badge: (name, badge) => `${name}, ${badge} sin leer` }}
        />,
      );

      expect(screen.getByRole('button', { name: 'Mail, 3 sin leer' })).toBeInTheDocument();
    });

    it('lets aria-label override the composed name', () => {
      render(<DockBar items={badgeItem({ badge: 3, 'aria-label': 'Inbox' })} />);

      expect(screen.getByRole('button', { name: 'Inbox' })).toBeInTheDocument();
    });
  });

  it('renders the pill toolbar by default', () => {
    render(<DockBar items={flatItems()} />);

    expect(screen.getByRole('toolbar')).toHaveAttribute('data-dockbar-variant', 'pill');
  });

  it('reflects the colorScheme and variant props as data attributes on the root element', () => {
    const { rerender } = render(<DockBar items={flatItems()} colorScheme="dark" variant="solid" />);
    expect(screen.getByRole('toolbar')).toHaveAttribute('data-dockbar-color-scheme', 'dark');
    expect(screen.getByRole('toolbar')).toHaveAttribute('data-dockbar-variant', 'solid');

    rerender(<DockBar items={flatItems()} colorScheme="light" variant="glass" />);
    expect(screen.getByRole('toolbar')).toHaveAttribute('data-dockbar-color-scheme', 'light');
    expect(screen.getByRole('toolbar')).toHaveAttribute('data-dockbar-variant', 'glass');
  });

  it('pins the dock to the bottom center by default and reflects the position prop', () => {
    const { rerender } = render(<DockBar items={flatItems()} />);
    expect(screen.getByRole('toolbar')).toHaveAttribute('data-dockbar-position', 'bottom-center');

    rerender(<DockBar items={flatItems()} position="top-left" />);
    expect(screen.getByRole('toolbar')).toHaveAttribute('data-dockbar-position', 'top-left');

    rerender(<DockBar items={flatItems()} position="inline" />);
    expect(screen.getByRole('toolbar')).toHaveAttribute('data-dockbar-position', 'inline');
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
    // Scale is written straight to the DOM; an unset property means the CSS default of 1.
    const scaleOf = (name: string) =>
      Number(
        screen.getByRole('button', { name }).style.getPropertyValue('--dockbar-item-scale') || 1,
      );
    // Pointer moves are applied on the next animation frame.
    const nextFrame = () =>
      act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    const pointerAt = async (container: HTMLElement, clientX: number, pointerType = 'mouse') => {
      fireEvent.pointerEnter(getLevel(container), { clientX, pointerType });
      fireEvent.pointerMove(getLevel(container), { clientX, pointerType });
      await nextFrame();
    };

    it('scales items continuously by pointer distance and marks the closest one as hovered', async () => {
      const { container } = render(
        <DockBar items={flatItems()} magnification={{ scale: 1.5, distance: 150 }} />,
      );
      mockItemRects(container);

      await pointerAt(container, 85);

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

    it('resets every item to its base size when the pointer leaves the dock', async () => {
      const { container } = render(<DockBar items={flatItems()} />);
      mockItemRects(container);

      await pointerAt(container, 85);
      expect(scaleOf('Mail')).toBeGreaterThan(1);

      fireEvent.pointerLeave(getLevel(container));
      expect(scaleOf('Mail')).toBe(1);
      expect(scaleOf('Finder')).toBe(1);
    });

    it('measures from the unmagnified layout, so magnified sizes do not feed back', async () => {
      const { container } = render(
        <DockBar items={flatItems()} magnification={{ scale: 1.5, distance: 150 }} />,
      );
      mockItemRects(container);
      await pointerAt(container, 85);
      const before = ['Finder', 'Mail', 'Photos', 'Trash'].map(scaleOf);

      // Simulate the magnified layout: every rect has shifted by 20px.
      container.querySelectorAll<HTMLElement>('[data-dockbar-part="item"]').forEach((el, i) => {
        jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
          x: i * 60 + 20,
          y: 0,
          left: i * 60 + 20,
          top: 0,
          width: 50,
          height: 50,
          right: i * 60 + 70,
          bottom: 50,
          toJSON: () => ({}),
        });
      });
      fireEvent.pointerMove(getLevel(container), { clientX: 85, pointerType: 'mouse' });
      await nextFrame();

      expect(['Finder', 'Mail', 'Photos', 'Trash'].map(scaleOf)).toEqual(before);
    });

    it('coalesces pointer moves into a single update per animation frame', async () => {
      const { container } = render(<DockBar items={flatItems()} />);
      mockItemRects(container);
      const rafSpy = jest.spyOn(window, 'requestAnimationFrame');

      fireEvent.pointerEnter(getLevel(container), { clientX: 0, pointerType: 'mouse' });
      for (const clientX of [10, 30, 50, 70, 85]) {
        fireEvent.pointerMove(getLevel(container), { clientX, pointerType: 'mouse' });
      }
      expect(rafSpy).toHaveBeenCalledTimes(1);
      rafSpy.mockRestore();

      await nextFrame();
      // The single update uses the latest pointer position.
      expect(screen.getByRole('button', { name: 'Mail' })).toHaveAttribute('data-dockbar-hovered');
    });

    it('ignores touch pointers so a tap never leaves an item magnified', async () => {
      const { container } = render(<DockBar items={flatItems()} />);
      mockItemRects(container);

      await pointerAt(container, 85, 'touch');
      expect(scaleOf('Mail')).toBe(1);
    });

    it('keeps pointer magnification when keyboard focus leaves an item', async () => {
      const { container } = render(<DockBar items={flatItems()} />);
      mockItemRects(container);
      await pointerAt(container, 85);

      fireEvent.blur(screen.getByRole('button', { name: 'Mail' }));
      expect(scaleOf('Mail')).toBeGreaterThan(1);
    });

    it('re-measures after the page scrolls', async () => {
      const { container } = render(
        <DockBar items={flatItems()} magnification={{ scale: 1.5, distance: 150 }} />,
      );
      mockItemRects(container);
      await pointerAt(container, 85);
      fireEvent.pointerLeave(getLevel(container));

      // Page scrolled 60px to the left: Photos now sits where Mail was.
      container.querySelectorAll<HTMLElement>('[data-dockbar-part="item"]').forEach((el, i) => {
        jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
          x: i * 60 - 60,
          y: 0,
          left: i * 60 - 60,
          top: 0,
          width: 50,
          height: 50,
          right: i * 60 - 10,
          bottom: 50,
          toJSON: () => ({}),
        });
      });
      fireEvent.scroll(window);
      await pointerAt(container, 85);

      expect(screen.getByRole('button', { name: 'Photos' })).toHaveAttribute(
        'data-dockbar-hovered',
      );
    });

    it('magnifies around the focused item for keyboard users', async () => {
      const user = userEvent.setup();
      const { container } = render(<DockBar items={flatItems()} />);
      mockItemRects(container);

      await user.tab();
      await user.keyboard('{ArrowRight}');
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

    it('never magnifies when disabled', async () => {
      const { container } = render(<DockBar items={flatItems()} magnification={false} />);
      mockItemRects(container);

      await pointerAt(container, 85);
      expect(scaleOf('Mail')).toBe(1);
    });

    describe('variant defaults', () => {
      it('uses the pronounced dock magnification for glass and solid', async () => {
        const { container, unmount } = render(<DockBar items={flatItems()} variant="glass" />);
        mockItemRects(container);
        await pointerAt(container, 85);
        expect(scaleOf('Mail')).toBe(1.6);
        unmount();

        const solid = render(<DockBar items={flatItems()} variant="solid" />);
        mockItemRects(solid.container);
        await pointerAt(solid.container, 85);
        expect(scaleOf('Mail')).toBe(1.6);
      });

      it('uses a subtler magnification for the default pill toolbar', async () => {
        const { container } = render(<DockBar items={flatItems()} />);
        mockItemRects(container);
        await pointerAt(container, 85);

        expect(scaleOf('Mail')).toBe(1.25);
        // Pill's shorter reach (90px) leaves items two slots away (120px) untouched.
        expect(scaleOf('Trash')).toBe(1);
      });

      it('merges a partial config onto the variant defaults', async () => {
        const { container } = render(
          <DockBar items={flatItems()} variant="pill" magnification={{ distance: 300 }} />,
        );
        mockItemRects(container);
        await pointerAt(container, 85);

        expect(scaleOf('Mail')).toBe(1.25);
        expect(scaleOf('Trash')).toBeGreaterThan(1);
      });
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

  describe('when the items prop changes', () => {
    const drillIntoSettings = async (container: HTMLElement) => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /Settings/ }));
      endLevelTransition(container);
      endLevelTransition(container);
    };

    it('keeps the current nested level when items are re-created with a new identity', async () => {
      // Simulates `items={[...]}` written inline in a parent that re-renders.
      const { container, rerender } = render(<DockBar items={nestedItems()} />);
      await drillIntoSettings(container);

      rerender(<DockBar items={nestedItems()} />);

      expect(screen.getByRole('button', { name: 'Wi-Fi' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Finder' })).not.toBeInTheDocument();
    });

    it('reflects updated data of the current nested level immediately', async () => {
      const { container, rerender } = render(<DockBar items={nestedItems()} />);
      await drillIntoSettings(container);

      const updated = nestedItems();
      const [, settings] = updated;
      settings.children = [
        { id: 'wifi', label: 'Wi-Fi 6E', icon: <span>W</span>, badge: 2 },
        { id: 'bluetooth', label: 'Bluetooth', icon: <span>B</span> },
      ];
      rerender(<DockBar items={updated} />);

      expect(screen.getByRole('button', { name: 'Wi-Fi 6E, 2 notifications' })).toBeInTheDocument();
    });

    it('falls back to the deepest level that still exists when the current parent is removed', async () => {
      const onNavigate = jest.fn();
      const { container, rerender } = render(
        <DockBar items={nestedItems()} onNavigate={onNavigate} />,
      );
      await drillIntoSettings(container);

      expect(onNavigate).toHaveBeenCalledTimes(1);

      rerender(<DockBar items={flatItems()} onNavigate={onNavigate} />);

      // Falling back is not a user navigation, so no extra onNavigate call.
      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Mail' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
      expect(getLevel(container)).toHaveAttribute('data-dockbar-phase', 'idle');
    });

    it('lands on the root when the parent disappears mid-transition', async () => {
      const user = userEvent.setup();
      const { container, rerender } = render(<DockBar items={nestedItems()} />);

      await user.click(screen.getByRole('button', { name: /Settings/ }));
      rerender(<DockBar items={flatItems()} />);
      endLevelTransition(container);
      endLevelTransition(container);

      expect(getLevel(container)).toHaveAttribute('data-dockbar-phase', 'idle');
      expect(screen.getByRole('button', { name: 'Mail' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    });
  });

  describe('openActiveLevel', () => {
    const tree = (): DockBarEntry[] => [
      { id: 'finder', label: 'Finder', icon: <span>F</span> },
      {
        id: 'settings',
        label: 'Settings',
        icon: <span>S</span>,
        children: [
          { id: 'wifi', label: 'Wi-Fi', icon: <span>W</span> },
          {
            id: 'network',
            label: 'Network',
            icon: <span>N</span>,
            children: [
              { id: 'vpn', label: 'VPN', icon: <span>V</span> },
              { id: 'proxy', label: 'Proxy', icon: <span>P</span> },
            ],
          },
        ],
      },
    ];
    const backArea = (container: HTMLElement) =>
      container.querySelector('[data-dockbar-part="back-area"]');

    it('opens directly on the level that contains the active item', () => {
      const { container } = render(<DockBar items={tree()} activeId="vpn" openActiveLevel />);

      expect(screen.getByRole('button', { name: 'VPN' })).toHaveAttribute('aria-current', 'true');
      expect(screen.getByRole('button', { name: 'Back to Settings' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Finder' })).not.toBeInTheDocument();
      expect(getLevel(container)).toHaveAttribute('data-dockbar-phase', 'idle');
    });

    it('works with defaultActiveId too', () => {
      render(<DockBar items={tree()} defaultActiveId="wifi" openActiveLevel />);
      expect(screen.getByRole('button', { name: 'Wi-Fi' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    });

    it('stays at the root without the prop, or when the active id does not exist', () => {
      const { unmount } = render(<DockBar items={tree()} activeId="vpn" />);
      expect(screen.getByRole('button', { name: 'Finder' })).toBeInTheDocument();
      unmount();

      render(<DockBar items={tree()} activeId="missing" openActiveLevel />);
      expect(screen.getByRole('button', { name: 'Finder' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Back/ })).not.toBeInTheDocument();
    });

    it('does not steal focus, fire onNavigate, or animate the Back bubble on mount', () => {
      const onNavigate = jest.fn();
      const { container } = render(
        <DockBar items={tree()} activeId="vpn" openActiveLevel onNavigate={onNavigate} />,
      );

      expect(document.body).toHaveFocus();
      expect(onNavigate).not.toHaveBeenCalled();
      expect(backArea(container)).toHaveAttribute('data-dockbar-static');
    });

    it('enters with Tab on the active item', async () => {
      const user = userEvent.setup();
      render(<DockBar items={tree()} activeId="proxy" openActiveLevel />);
      await user.tab();
      expect(screen.getByRole('button', { name: 'Proxy' })).toHaveFocus();
    });

    it('does not jump levels when activeId changes after mount', () => {
      const { rerender } = render(<DockBar items={tree()} activeId="vpn" openActiveLevel />);
      rerender(<DockBar items={tree()} activeId="finder" openActiveLevel />);

      expect(screen.getByRole('button', { name: 'VPN' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Finder' })).not.toBeInTheDocument();
    });

    it('navigates back up normally, and a later Back bubble animates again', async () => {
      const user = userEvent.setup();
      const { container } = render(<DockBar items={tree()} activeId="vpn" openActiveLevel />);

      await user.click(screen.getByRole('button', { name: 'Back to Settings' }));
      endLevelTransition(container);
      endLevelTransition(container);
      expect(screen.getByRole('button', { name: /Network/ })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Back' }));
      endLevelTransition(container);
      endLevelTransition(container);
      expect(backArea(container)).toBeNull();

      await user.click(screen.getByRole('button', { name: /Settings/ }));
      endLevelTransition(container);
      endLevelTransition(container);
      expect(backArea(container)).not.toHaveAttribute('data-dockbar-static');
    });
  });

  describe('toggle items (pressed)', () => {
    const TogglePanels = ({ onActiveSelect }: { onActiveSelect?: () => void }) => {
      const [open, setOpen] = useState<string[]>(['chat']);
      const toggle = (id: string) =>
        setOpen((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
      const panel = (id: string, label: string): DockBarItem => ({
        id,
        label,
        icon: <span>{label[0]}</span>,
        pressed: open.includes(id),
        onSelect: () => toggle(id),
      });
      return (
        <DockBar
          defaultActiveId="home"
          items={[
            { id: 'home', label: 'Home', icon: <span>H</span>, onSelect: onActiveSelect },
            panel('chat', 'Chat'),
            panel('forum', 'Forum'),
          ]}
        />
      );
    };

    it('exposes aria-pressed only on toggle items', () => {
      render(<TogglePanels />);
      expect(screen.getByRole('button', { name: 'Chat' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Forum' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-pressed');
    });

    it('lets several toggles be on at once without changing the active item', async () => {
      const user = userEvent.setup();
      render(<TogglePanels />);

      await user.click(screen.getByRole('button', { name: 'Forum' }));

      expect(screen.getByRole('button', { name: 'Chat' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Forum' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Forum' })).toHaveAttribute('data-dockbar-pressed');
      expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'true');
      expect(screen.getByRole('button', { name: 'Forum' })).not.toHaveAttribute('aria-current');
    });

    it('toggles off again and works from the keyboard', async () => {
      const user = userEvent.setup();
      render(<TogglePanels />);
      await user.tab();
      await user.keyboard('{ArrowRight}{Enter}');

      expect(screen.getByRole('button', { name: 'Chat' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: 'Chat' })).not.toHaveAttribute(
        'data-dockbar-pressed',
      );
    });

    it('ignores pressed on parents and links', () => {
      render(
        <DockBar
          items={[
            {
              id: 'settings',
              label: 'Settings',
              icon: <span>S</span>,
              pressed: true,
              children: [{ id: 'wifi', label: 'Wi-Fi', icon: <span>W</span> }],
            },
            { id: 'docs', label: 'Docs', icon: <span>D</span>, href: '/docs', pressed: true },
          ]}
        />,
      );
      expect(screen.getByRole('button', { name: /Settings/ })).not.toHaveAttribute('aria-pressed');
      expect(screen.getByRole('link', { name: 'Docs' })).not.toHaveAttribute('aria-pressed');
      expect(screen.getByRole('link', { name: 'Docs' })).not.toHaveAttribute(
        'data-dockbar-pressed',
      );
    });

    it('exposes the pressed state to itemClassName', () => {
      render(
        <DockBar
          items={[{ id: 'chat', label: 'Chat', icon: <span>C</span>, pressed: true }]}
          itemClassName={(_item, state) => (state.pressed ? 'is-on' : undefined)}
        />,
      );
      expect(screen.getByRole('button', { name: 'Chat' })).toHaveClass('is-on');
    });
  });

  describe('labels (i18n)', () => {
    const threeLevels = (): DockBarEntry[] => [
      { id: 'finder', label: 'Finder', icon: <span>F</span> },
      {
        id: 'settings',
        label: 'Ajustes',
        icon: <span>S</span>,
        children: [
          {
            id: 'network',
            label: 'Red',
            icon: <span>N</span>,
            children: [{ id: 'vpn', label: 'VPN', icon: <span>V</span> }],
          },
          { type: 'separator', id: 'sep' },
          { id: 'display', label: 'Pantalla', icon: <span>D</span> },
        ],
      },
    ];
    const spanish = {
      parentItem: (label: string, count: number) =>
        `${label}, abre ${count} ${count === 1 ? 'opción' : 'opciones'}`,
      backTo: (label: string) => `Volver a ${label}`,
      enteredLevel: (label: string, depth: number) => `${label}, nivel ${depth + 1}`,
      returnedTo: (label: string | null) =>
        label ? `De vuelta en ${label}` : 'De vuelta en el menú principal',
    };
    const liveRegion = () => screen.getByRole('status');

    const drill = async (container: HTMLElement, name: RegExp) => {
      await userEvent.setup().click(screen.getByRole('button', { name }));
      endLevelTransition(container);
      endLevelTransition(container);
    };

    it('uses English defaults, counting only real items (not separators)', async () => {
      const { container } = render(<DockBar items={threeLevels()} />);
      expect(
        screen.getByRole('button', { name: 'Ajustes, opens 2 more options' }),
      ).toBeInTheDocument();

      await drill(container, /Ajustes/);
      expect(liveRegion()).toHaveTextContent('Ajustes, level 2');
      expect(screen.getByRole('button', { name: 'Red, opens 1 more option' })).toBeInTheDocument();

      await drill(container, /Red/);
      expect(screen.getByRole('button', { name: 'Back to Ajustes' })).toBeInTheDocument();

      await drill(container, /Back to Ajustes/);
      expect(liveRegion()).toHaveTextContent('Back to Ajustes');
      await drill(container, /^Back$/);
      expect(liveRegion()).toHaveTextContent('Back to main menu');
    });

    it('uses the provided label builders for every screen-reader text', async () => {
      const { container } = render(
        <DockBar
          items={threeLevels()}
          labels={spanish}
          ariaLabel="Menú"
          backItem={{ label: 'Atrás' }}
        />,
      );
      expect(screen.getByRole('toolbar', { name: 'Menú' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ajustes, abre 2 opciones' })).toBeInTheDocument();

      await drill(container, /Ajustes/);
      expect(liveRegion()).toHaveTextContent('Ajustes, nivel 2');
      expect(screen.getByRole('button', { name: 'Atrás' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Red, abre 1 opción' })).toBeInTheDocument();

      await drill(container, /Red/);
      expect(screen.getByRole('button', { name: 'Volver a Ajustes' })).toBeInTheDocument();

      await drill(container, /Volver a Ajustes/);
      expect(liveRegion()).toHaveTextContent('De vuelta en Ajustes');
      await drill(container, /^Atrás$/);
      expect(liveRegion()).toHaveTextContent('De vuelta en el menú principal');
    });

    it('falls back to English for builders that are not provided', () => {
      render(<DockBar items={threeLevels()} labels={{ backTo: spanish.backTo }} />);
      expect(
        screen.getByRole('button', { name: 'Ajustes, opens 2 more options' }),
      ).toBeInTheDocument();
    });

    it('lets an item aria-label override the generated parent label', () => {
      const items = threeLevels();
      items[1] = { ...(items[1] as DockBarItem), 'aria-label': 'Preferencias del sistema' };
      render(<DockBar items={items} labels={spanish} />);
      expect(screen.getByRole('button', { name: 'Preferencias del sistema' })).toBeInTheDocument();
    });
  });

  describe('back bubble', () => {
    const getBackArea = (container: HTMLElement) =>
      container.querySelector<HTMLElement>('[data-dockbar-part="back-area"]');

    it('renders Back in its own area beside the dock, not inside the level', async () => {
      const user = userEvent.setup();
      const { container } = render(<DockBar items={nestedItems()} />);
      expect(getBackArea(container)).toBeNull();

      await user.click(screen.getByRole('button', { name: /Settings/ }));
      endLevelTransition(container);
      endLevelTransition(container);

      const backArea = getBackArea(container);
      const back = screen.getByRole('button', { name: 'Back' });
      expect(backArea).toContainElement(back);
      expect(getLevel(container)).not.toContainElement(back);
      expect(backArea?.nextElementSibling).toBe(getLevel(container));
    });

    it('stays mounted between nested levels and animates out on the last collapse to root', async () => {
      const user = userEvent.setup();
      const items: DockBarEntry[] = [
        {
          id: 'settings',
          label: 'Settings',
          icon: <span>S</span>,
          children: [
            {
              id: 'network',
              label: 'Network',
              icon: <span>N</span>,
              children: [{ id: 'vpn', label: 'VPN', icon: <span>V</span> }],
            },
          ],
        },
      ];
      const { container } = render(<DockBar items={items} />);
      const drillInto = async (name: RegExp) => {
        await user.click(screen.getByRole('button', { name }));
        endLevelTransition(container);
        endLevelTransition(container);
      };

      await drillInto(/Settings/);
      const firstBackArea = getBackArea(container);
      await drillInto(/Network/);
      expect(getBackArea(container)).toBe(firstBackArea);
      expect(screen.getByRole('button', { name: 'Back to Settings' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Back to Settings' }));
      expect(getBackArea(container)).not.toHaveAttribute('data-dockbar-leaving');
      endLevelTransition(container);
      endLevelTransition(container);

      await user.click(screen.getByRole('button', { name: 'Back' }));
      expect(getBackArea(container)).toHaveAttribute('data-dockbar-leaving');
      endLevelTransition(container);
      expect(getBackArea(container)).toBeNull();
    });
  });

  describe('separators', () => {
    const groupedItems = (): DockBarEntry[] => [
      { id: 'finder', label: 'Finder', icon: <span>F</span> },
      { type: 'separator', id: 'sep' },
      { id: 'mail', label: 'Mail', icon: <span>M</span> },
      { id: 'photos', label: 'Photos', icon: <span>P</span> },
    ];

    it('renders separators as accessible, non-focusable dividers between items', async () => {
      const user = userEvent.setup();
      render(<DockBar items={groupedItems()} />);

      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('aria-orientation', 'vertical');

      await user.tab();
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('button', { name: 'Mail' })).toHaveFocus();
    });

    it('keeps magnification aligned to items, skipping separators', async () => {
      const { container } = render(
        <DockBar items={groupedItems()} magnification={{ scale: 1.5, distance: 150 }} />,
      );
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

      // Mail is the 2nd item element (index 1), centered at x=85.
      fireEvent.pointerMove(getLevel(container), { clientX: 85, pointerType: 'mouse' });
      await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
      expect(screen.getByRole('button', { name: 'Mail' })).toHaveAttribute('data-dockbar-hovered');
    });
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
