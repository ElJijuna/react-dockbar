import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { DockBarItem, DockBarPreview, DockBarProps } from '../types';
import { DockBar } from './DockBar';

function mailPreviews(): DockBarPreview[] {
  return [
    { id: 'inbox', title: 'Inbox', thumbnail: <span>inbox</span>, onSelect: jest.fn() },
    {
      id: 'draft',
      title: 'Draft',
      thumbnail: <span>draft</span>,
      active: true,
      onSelect: jest.fn(),
      onClose: jest.fn(),
    },
  ];
}

function items(previews = mailPreviews()): DockBarItem[] {
  return [
    { id: 'finder', label: 'Finder', icon: <span>F</span>, onSelect: jest.fn() },
    { id: 'mail', label: 'Mail', icon: <span>M</span>, onSelect: jest.fn(), previews },
    {
      id: 'notes',
      label: 'Notes',
      icon: <span>N</span>,
      onSelect: jest.fn(),
      previews: [{ id: 'note', title: 'Groceries', thumbnail: <span>note</span> }],
    },
  ];
}

const mailButton = () => screen.getByRole('button', { name: 'Mail, 2 open windows' });
const panel = () => screen.queryByRole('group', { name: 'Mail windows' });

function hover(element: HTMLElement) {
  fireEvent.pointerEnter(element, { pointerType: 'mouse' });
}

function unhover(element: HTMLElement) {
  fireEvent.pointerLeave(element, { pointerType: 'mouse' });
}

describe('DockBar previews', () => {
  it('names the item after its open windows and shows it as collapsed', () => {
    const { container } = render(<DockBar items={items()} />);

    expect(mailButton()).toHaveAttribute('aria-expanded', 'false');
    expect(mailButton()).not.toHaveAttribute('aria-controls');
    expect(mailButton()).toHaveAttribute('data-dockbar-running');
    expect(screen.getByRole('button', { name: 'Notes, 1 open window' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finder' })).not.toHaveAttribute('aria-expanded');
    expect(container.querySelectorAll('[data-dockbar-item-id="mail"] .runningDot')).toHaveLength(2);
  });

  it('ignores previews on items that open a submenu', () => {
    render(
      <DockBar
        items={[
          {
            id: 'settings',
            label: 'Settings',
            icon: <span>S</span>,
            children: [{ id: 'wifi', label: 'Wi-Fi', icon: <span>W</span> }],
            previews: mailPreviews(),
          },
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: /Settings/ })).not.toHaveAttribute('aria-expanded');
  });

  describe('hover', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('opens the panel after the open delay and links it to the item', () => {
      render(<DockBar items={items()} />);

      hover(mailButton());
      act(() => jest.advanceTimersByTime(399));
      expect(panel()).not.toBeInTheDocument();

      act(() => jest.advanceTimersByTime(1));
      expect(panel()).toBeInTheDocument();
      expect(mailButton()).toHaveAttribute('aria-expanded', 'true');
      expect(mailButton()).toHaveAttribute('aria-controls', panel()?.id);
      expect(screen.getByRole('button', { name: 'Inbox' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Draft' })).toHaveAttribute('aria-current', 'true');
      expect(screen.getByRole('button', { name: 'Close Draft' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Close Inbox' })).not.toBeInTheDocument();
    });

    it('does not open when the pointer leaves before the delay', () => {
      render(<DockBar items={items()} />);

      hover(mailButton());
      act(() => jest.advanceTimersByTime(200));
      unhover(mailButton());
      act(() => jest.advanceTimersByTime(1000));

      expect(panel()).not.toBeInTheDocument();
    });

    it('stays open while the pointer crosses into the panel and closes after leaving it', () => {
      render(<DockBar items={items()} />);
      hover(mailButton());
      act(() => jest.advanceTimersByTime(400));

      unhover(mailButton());
      act(() => jest.advanceTimersByTime(100));
      hover(panel() as HTMLElement);
      act(() => jest.advanceTimersByTime(1000));
      expect(panel()).toBeInTheDocument();

      unhover(panel() as HTMLElement);
      act(() => jest.advanceTimersByTime(199));
      expect(panel()).toBeInTheDocument();
      act(() => jest.advanceTimersByTime(1));
      expect(panel()).not.toBeInTheDocument();
    });

    it('switches right away to another item once a panel is showing', () => {
      render(<DockBar items={items()} />);
      hover(mailButton());
      act(() => jest.advanceTimersByTime(400));

      unhover(mailButton());
      hover(screen.getByRole('button', { name: 'Notes, 1 open window' }));
      act(() => jest.advanceTimersByTime(0));

      expect(panel()).not.toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Notes windows' })).toBeInTheDocument();
    });

    it('ignores touch pointers', () => {
      render(<DockBar items={items()} />);

      fireEvent.pointerEnter(mailButton(), { pointerType: 'touch' });
      act(() => jest.advanceTimersByTime(1000));

      expect(panel()).not.toBeInTheDocument();
    });

    it('honours a custom previewDelay', () => {
      render(<DockBar items={items()} previewDelay={{ open: 50 }} />);

      hover(mailButton());
      act(() => jest.advanceTimersByTime(50));

      expect(panel()).toBeInTheDocument();
    });
  });

  describe('click', () => {
    it('pins the panel of an item with several windows instead of selecting it', async () => {
      const user = userEvent.setup();
      const dockItems = items();
      render(<DockBar items={dockItems} />);

      await user.click(mailButton());

      expect(panel()).toBeInTheDocument();
      expect(dockItems[1].onSelect).not.toHaveBeenCalled();

      unhover(mailButton());
      await act(() => new Promise((resolve) => setTimeout(resolve, 250)));
      expect(panel()).toBeInTheDocument();

      await user.click(mailButton());
      expect(panel()).not.toBeInTheDocument();
    });

    it('closes a pinned panel on an outside click', async () => {
      const user = userEvent.setup();
      render(
        <>
          <DockBar items={items()} />
          <button type="button">Outside</button>
        </>,
      );
      await user.click(mailButton());

      await user.click(screen.getByRole('button', { name: 'Outside' }));

      expect(panel()).not.toBeInTheDocument();
    });

    it('selects an item with a single window as usual', async () => {
      const user = userEvent.setup();
      const dockItems = items();
      render(<DockBar items={dockItems} />);

      await user.click(screen.getByRole('button', { name: 'Notes, 1 open window' }));

      expect(dockItems[2].onSelect).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('group')).not.toBeInTheDocument();
    });

    it('selects a window: calls onSelect, closes the panel and makes the item active', async () => {
      const user = userEvent.setup();
      const previews = mailPreviews();
      const dockItems = items(previews);
      render(<DockBar items={dockItems} />);
      await user.click(mailButton());

      await user.click(screen.getByRole('button', { name: 'Inbox' }));

      expect(previews[0].onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ item: dockItems[1], preview: previews[0], path: [] }),
      );
      expect(panel()).not.toBeInTheDocument();
      expect(mailButton()).toHaveAttribute('aria-current', 'true');
      expect(dockItems[1].onSelect).not.toHaveBeenCalled();
    });

    it('calls onClose from the close button without selecting the window', async () => {
      const user = userEvent.setup();
      const previews = mailPreviews();
      render(<DockBar items={items(previews)} />);
      await user.click(mailButton());

      await user.click(screen.getByRole('button', { name: 'Close Draft' }));

      expect(previews[1].onClose).toHaveBeenCalledWith(
        expect.objectContaining({ preview: previews[1] }),
      );
      expect(previews[1].onSelect).not.toHaveBeenCalled();
      expect(panel()).toBeInTheDocument();
    });
  });

  describe('keyboard', () => {
    it('opens with the arrow pointing at the panel and focuses the active window', async () => {
      const user = userEvent.setup();
      render(<DockBar items={items()} />);
      act(() => mailButton().focus());

      await user.keyboard('{ArrowUp}');

      expect(panel()).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Draft' })).toHaveFocus();
    });

    it('opens with ArrowDown when the dock is pinned to the top', async () => {
      const user = userEvent.setup();
      render(<DockBar items={items()} position="top-center" />);
      act(() => mailButton().focus());

      await user.keyboard('{ArrowUp}');
      expect(panel()).not.toBeInTheDocument();

      await user.keyboard('{ArrowDown}');
      expect(panel()).toBeInTheDocument();
    });

    it('opens from Enter on an item with several windows and moves focus inside', async () => {
      const user = userEvent.setup();
      render(<DockBar items={items()} />);
      act(() => mailButton().focus());

      await user.keyboard('{Enter}');

      expect(screen.getByRole('button', { name: 'Draft' })).toHaveFocus();
    });

    it('moves between windows with the arrows without moving the dock focus', async () => {
      const user = userEvent.setup();
      render(<DockBar items={items()} />);
      act(() => mailButton().focus());
      await user.keyboard('{ArrowUp}');

      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('button', { name: 'Inbox' })).toHaveFocus();

      await user.keyboard('{ArrowLeft}');
      expect(screen.getByRole('button', { name: 'Draft' })).toHaveFocus();
    });

    it('closes with Escape and returns focus to the item', async () => {
      const user = userEvent.setup();
      render(<DockBar items={items()} />);
      act(() => mailButton().focus());
      await user.keyboard('{ArrowUp}');

      await user.keyboard('{Escape}');

      expect(panel()).not.toBeInTheDocument();
      expect(mailButton()).toHaveFocus();
    });

    it('closes the focused window with Delete and keeps focus in the panel', async () => {
      const user = userEvent.setup();
      const Harness = () => {
        const [previews, setPreviews] = useState<DockBarPreview[]>(() =>
          mailPreviews().map((preview) => ({
            ...preview,
            onClose: ({ preview: closed }) =>
              setPreviews((list) => list.filter((p) => p.id !== closed.id)),
          })),
        );
        return <DockBar items={items(previews)} />;
      };
      render(<Harness />);
      act(() => mailButton().focus());
      await user.keyboard('{ArrowUp}');

      await user.keyboard('{Delete}');

      expect(screen.queryByRole('button', { name: 'Draft' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Inbox' })).toHaveFocus();
    });

    it('closes when focus leaves the dock with Tab', async () => {
      const user = userEvent.setup();
      render(
        <>
          <DockBar items={items()} />
          <button type="button">After</button>
        </>,
      );
      act(() => mailButton().focus());
      await user.keyboard('{ArrowUp}');

      // Draft → its close button → out of the dock.
      await user.tab();
      await user.tab();

      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
      expect(panel()).not.toBeInTheDocument();
    });
  });

  it('supports a controlled openPreviewsId', async () => {
    const user = userEvent.setup();
    const onPreviewsOpenChange = jest.fn();
    const Harness = (props: Partial<DockBarProps>) => {
      const [openId, setOpenId] = useState<string | null>('mail');
      return (
        <DockBar
          items={items()}
          openPreviewsId={openId}
          onPreviewsOpenChange={(id) => {
            onPreviewsOpenChange(id);
            setOpenId(id);
          }}
          {...props}
        />
      );
    };
    render(<Harness />);
    expect(panel()).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Draft' }));

    expect(onPreviewsOpenChange).toHaveBeenCalledWith(null);
    expect(panel()).not.toBeInTheDocument();
  });

  it('uses translated labels', async () => {
    const user = userEvent.setup();
    render(
      <DockBar
        items={items()}
        labels={{
          previewsItem: (label, count) => `${label}, ${count} ventanas abiertas`,
          previewsPanel: (label) => `Ventanas de ${label}`,
          closePreview: (title) => `Cerrar ${title}`,
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Mail, 2 ventanas abiertas' }));

    expect(screen.getByRole('group', { name: 'Ventanas de Mail' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar Draft' })).toBeInTheDocument();
  });
});
