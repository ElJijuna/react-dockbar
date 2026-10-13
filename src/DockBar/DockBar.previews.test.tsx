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

describe('DockBar previews integration regressions', () => {
  it.each(['controlled', 'toggle'] as const)(
    'does not replace the active item when selecting a %s preview',
    async (mode) => {
      const user = userEvent.setup();
      const previews = mailPreviews();
      const dockItems = items(previews);
      if (mode === 'toggle') {
        dockItems[1].pressed = true;
      }
      render(
        <DockBar
          items={dockItems}
          activeId={mode === 'controlled' ? 'finder' : undefined}
          defaultActiveId="finder"
          openPreviewsId="mail"
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Inbox' }));
      expect(screen.getByRole('button', { name: 'Finder' })).toHaveAttribute(
        'aria-current',
        'true',
      );
      expect(mailButton()).not.toHaveAttribute('aria-current');
      expect(previews[0].onSelect).toHaveBeenCalledTimes(1);
      expect(dockItems[1].onSelect).not.toHaveBeenCalled();
    },
  );

  it('closes an existing panel on programmatic activation of an item with a single window', async () => {
    const user = userEvent.setup();
    const dockItems = items();
    render(<DockBar items={dockItems} />);
    await user.click(mailButton());
    // Programmatic activation has no pointerdown to dismiss the panel beforehand.
    act(() => screen.getByRole('button', { name: 'Notes, 1 open window' }).click());
    expect(panel()).not.toBeInTheDocument();
    expect(dockItems[2].onSelect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Notes, 1 open window' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('dismisses with Escape from the anchor instead of navigating out of the submenu', async () => {
    const user = userEvent.setup();
    const onNavigate = jest.fn();
    const dockItems: DockBarItem[] = [{ id: 'apps', label: 'Apps', icon: null, children: items() }];
    render(<DockBar items={dockItems} activeId="mail" openActiveLevel onNavigate={onNavigate} />);
    await user.click(mailButton());
    expect(panel()).toBeInTheDocument();
    act(() => mailButton().focus());
    await user.keyboard('{Escape}');
    expect(panel()).not.toBeInTheDocument();
    expect(mailButton()).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('closes a pinned panel when navigation to a different level starts', async () => {
    const user = userEvent.setup();
    const onPreviewsOpenChange = jest.fn();
    render(
      <DockBar
        items={[
          ...items(),
          {
            id: 'settings',
            label: 'Settings',
            icon: null,
            children: [{ id: 'wifi', label: 'Wi-Fi', icon: null }],
          },
        ]}
        onPreviewsOpenChange={onPreviewsOpenChange}
      />,
    );
    await user.click(mailButton());
    await user.click(screen.getByRole('button', { name: /Settings/ }));
    expect(panel()).not.toBeInTheDocument();
    expect(onPreviewsOpenChange.mock.calls).toEqual([['mail'], [null]]);
  });

  it.each(['removed item', 'empty previews'] as const)(
    'dismisses the panel after receiving %s',
    async (change) => {
      const user = userEvent.setup();
      const onPreviewsOpenChange = jest.fn();
      const dockItems = items();
      const { rerender } = render(
        <DockBar items={dockItems} onPreviewsOpenChange={onPreviewsOpenChange} />,
      );
      await user.click(mailButton());
      const updated =
        change === 'removed item'
          ? dockItems.filter((item) => item.id !== 'mail')
          : dockItems.map((item) => (item.id === 'mail' ? { ...item, previews: [] } : item));
      rerender(<DockBar items={updated} onPreviewsOpenChange={onPreviewsOpenChange} />);
      expect(panel()).not.toBeInTheDocument();
      expect(onPreviewsOpenChange).toHaveBeenLastCalledWith(null);
      expect(onPreviewsOpenChange).toHaveBeenCalledTimes(2);
    },
  );

  it.each(['missing', 'separator', 'parent', 'nested'])(
    'rejects a controlled previews id that refers to %s',
    (openPreviewsId) => {
      const onPreviewsOpenChange = jest.fn();
      render(
        <DockBar
          items={[
            ...items(),
            { type: 'separator', id: 'separator' },
            {
              id: 'parent',
              label: 'Parent',
              icon: null,
              previews: mailPreviews(),
              children: [{ id: 'nested', label: 'Nested', icon: null, previews: mailPreviews() }],
            },
          ]}
          openPreviewsId={openPreviewsId}
          onPreviewsOpenChange={onPreviewsOpenChange}
        />,
      );
      expect(screen.queryByRole('group')).not.toBeInTheDocument();
      expect(onPreviewsOpenChange).toHaveBeenCalledWith(null);
    },
  );

  it.each([
    ['left-center', 'ArrowRight', 'right'],
    ['right-center', 'ArrowLeft', 'left'],
  ] as const)('opens previews away from a vertical dock at %s', async (position, openKey, side) => {
    const user = userEvent.setup();
    render(<DockBar items={items()} orientation="vertical" position={position} />);
    act(() => mailButton().focus());
    await user.keyboard(`{${openKey}}`);
    expect(panel()).toHaveAttribute('data-dockbar-side', side);
    expect(screen.getByRole('button', { name: 'Draft' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Inbox' })).toHaveFocus();
  });

  it('supplies the current breadcrumb and native events to preview select and close callbacks', async () => {
    const user = userEvent.setup();
    const list = mailPreviews();
    const dockItems = items(list);
    const parent: DockBarItem = { id: 'apps', label: 'Apps', icon: null, children: dockItems };
    render(<DockBar items={[parent]} activeId="mail" openActiveLevel />);
    await user.click(mailButton());
    const closeEvent = new MouseEvent('click', { bubbles: true });
    fireEvent(screen.getByRole('button', { name: 'Close Draft' }), closeEvent);
    expect(list[1].onClose).toHaveBeenCalledWith(
      expect.objectContaining({
        item: dockItems[1],
        preview: list[1],
        path: [parent],
        nativeEvent: closeEvent,
      }),
    );
    const selectEvent = new MouseEvent('click', { bubbles: true });
    fireEvent(screen.getByRole('button', { name: 'Inbox' }), selectEvent);
    expect(list[0].onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        preview: list[0],
        path: [parent],
        nativeEvent: selectEvent,
      }),
    );
  });

  it('selects a preview without a callback and restores keyboard focus to its item', async () => {
    const user = userEvent.setup();
    const list = mailPreviews().map((preview) => ({ ...preview, onSelect: undefined }));
    render(<DockBar items={items(list)} />);
    act(() => mailButton().focus());
    await user.keyboard('{ArrowUp}{Enter}');
    expect(panel()).not.toBeInTheDocument();
    expect(mailButton()).toHaveFocus();
    expect(mailButton()).toHaveAttribute('aria-current', 'true');
  });

  it('keeps two docks previews and focus restoration independent', async () => {
    const user = userEvent.setup();
    render(
      <>
        <DockBar items={items()} ariaLabel="First dock" />
        <DockBar items={items()} ariaLabel="Second dock" />
      </>,
    );
    const anchors = screen.getAllByRole('button', { name: 'Mail, 2 open windows' });
    act(() => anchors[0].focus());
    await user.keyboard('{ArrowUp}');
    const firstId = anchors[0].getAttribute('aria-controls');
    expect(screen.getAllByRole('group')).toHaveLength(1);
    await user.keyboard('{Escape}');
    expect(anchors[0]).toHaveFocus();
    act(() => anchors[1].focus());
    await user.keyboard('{ArrowUp}');
    expect(anchors[1].getAttribute('aria-controls')).not.toBe(firstId);
    await user.keyboard('{Escape}');
    expect(anchors[1]).toHaveFocus();
  });
});

describe('DockBar previews edge cases', () => {
  it('rejects an empty controlled preview id and requests closure exactly once', () => {
    const onPreviewsOpenChange = jest.fn();
    const { rerender } = render(
      <DockBar items={items()} openPreviewsId="" onPreviewsOpenChange={onPreviewsOpenChange} />,
    );
    expect(screen.queryByRole('group')).toBeNull();
    expect(onPreviewsOpenChange.mock.calls).toEqual([[null]]);
    rerender(
      <DockBar items={items()} openPreviewsId="" onPreviewsOpenChange={onPreviewsOpenChange} />,
    );
    expect(onPreviewsOpenChange).toHaveBeenCalledTimes(1);
  });

  it('escapes item ids when positioning previews and restoring focus', async () => {
    const user = userEvent.setup();
    const dockItems = items();
    dockItems[1].id = 'mail["inbox"] #1';
    render(<DockBar items={dockItems} />);
    act(() => mailButton().focus());
    await user.keyboard('{ArrowUp}');
    expect(panel()).toBeInTheDocument();
    expect(panel()?.style.top).not.toBe('');
    expect(screen.getByRole('button', { name: 'Draft' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(panel()).not.toBeInTheDocument();
    expect(mailButton()).toHaveFocus();
  });

  it('updates open preview content without selecting an item or stealing focus', async () => {
    const user = userEvent.setup();
    const onPreviewsOpenChange = jest.fn();
    const list = mailPreviews();
    const { rerender } = render(
      <DockBar items={items(list)} onPreviewsOpenChange={onPreviewsOpenChange} />,
    );
    act(() => mailButton().focus());
    await user.keyboard('{ArrowUp}');
    const updated = list.map((preview) => ({ ...preview, title: `${preview.title} updated` }));
    rerender(<DockBar items={items(updated)} onPreviewsOpenChange={onPreviewsOpenChange} />);
    expect(screen.getByRole('button', { name: 'Draft updated' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Inbox updated' })).toBeInTheDocument();
    expect(mailButton()).not.toHaveAttribute('aria-current');
    expect(onPreviewsOpenChange.mock.calls).toEqual([['mail']]);
  });

  it('does not move outside focus when a controlled panel is closed externally', () => {
    const dockItems = items();
    const view = (openPreviewsId: string | null) => (
      <>
        <DockBar items={dockItems} openPreviewsId={openPreviewsId} />
        <button type="button">Outside</button>
      </>
    );
    const { rerender } = render(view('mail'));
    const outside = screen.getByRole('button', { name: 'Outside' });
    act(() => outside.focus());
    rerender(view(null));
    expect(panel()).not.toBeInTheDocument();
    expect(outside).toHaveFocus();
  });

  it('pins an already hovered panel on click, then closes it on the next click', () => {
    jest.useFakeTimers();
    try {
      const onPreviewsOpenChange = jest.fn();
      render(<DockBar items={items()} onPreviewsOpenChange={onPreviewsOpenChange} />);
      hover(mailButton());
      act(() => jest.advanceTimersByTime(400));
      fireEvent.click(mailButton(), { detail: 1 });
      unhover(mailButton());
      act(() => jest.advanceTimersByTime(1000));
      expect(panel()).toBeInTheDocument();
      expect(onPreviewsOpenChange.mock.calls).toEqual([['mail']]);
      fireEvent.click(mailButton(), { detail: 1 });
      expect(panel()).not.toBeInTheDocument();
      expect(onPreviewsOpenChange.mock.calls).toEqual([['mail'], [null]]);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('DockBar disabled activation boundaries', () => {
  it.each(['leaf', 'parent', 'link', 'previews'] as const)(
    'blocks a disabled %s without selecting, navigating or opening previews',
    (kind) => {
      const onSelect = jest.fn();
      const onNavigate = jest.fn();
      const onPreviewsOpenChange = jest.fn();
      const item: DockBarItem = {
        id: 'disabled',
        label: 'Disabled',
        icon: null,
        disabled: true,
        onSelect,
        ...(kind === 'parent' ? { children: [{ id: 'child', label: 'Child', icon: null }] } : {}),
        ...(kind === 'link' ? { href: '/disabled' } : {}),
        ...(kind === 'previews' ? { previews: mailPreviews() } : {}),
      };
      render(
        <DockBar
          items={[item]}
          onNavigate={onNavigate}
          onPreviewsOpenChange={onPreviewsOpenChange}
        />,
      );
      const control = screen.getByLabelText(/Disabled/);
      fireEvent.click(control);
      fireEvent.pointerEnter(control, { pointerType: 'mouse' });
      expect(onSelect).not.toHaveBeenCalled();
      expect(onNavigate).not.toHaveBeenCalled();
      expect(onPreviewsOpenChange).not.toHaveBeenCalled();
      expect(screen.queryByRole('group')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Child' })).toBeNull();
    },
  );
});
