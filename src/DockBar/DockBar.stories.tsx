import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  MdBugReport,
  MdCallSplit,
  MdChat,
  MdComment,
  MdForum,
  MdHistory,
  MdHome,
  MdImage,
  MdImageSearch,
  MdInventory2,
  MdLock,
  MdManageSearch,
  MdMessage,
  MdRocketLaunch,
  MdRouter,
  MdSearch,
  MdShield,
  MdVpnKey,
} from 'react-icons/md';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { DockBarEntry, DockBarItem, DockBarProps } from '../types';
import { DockBar } from './DockBar';

const icon = (glyph: string) => <span>{glyph}</span>;

const flatItems: DockBarItem[] = [
  { id: 'finder', label: 'Finder', icon: icon('🗂️'), onSelect: fn() },
  { id: 'mail', label: 'Mail', icon: icon('✉️'), badge: 3, onSelect: fn() },
  { id: 'photos', label: 'Photos', icon: icon('🖼️'), onSelect: fn() },
  { id: 'music', label: 'Music', icon: icon('🎵'), onSelect: fn() },
  { id: 'terminal', label: 'Terminal', icon: icon('⌨️'), onSelect: fn() },
];

const nestedItems: DockBarItem[] = [
  { id: 'finder', label: 'Finder', icon: icon('🗂️'), onSelect: fn() },
  { id: 'mail', label: 'Mail', icon: icon('✉️'), onSelect: fn() },
  {
    id: 'settings',
    label: 'Settings',
    icon: icon('⚙️'),
    children: [
      { id: 'wifi', label: 'Wi-Fi', icon: icon('📶'), onSelect: fn() },
      { id: 'bluetooth', label: 'Bluetooth', icon: icon('🔵'), onSelect: fn() },
      {
        id: 'network',
        label: 'Network',
        icon: icon('🌐'),
        children: [
          { id: 'vpn', label: 'VPN', icon: icon('🔒'), onSelect: fn() },
          { id: 'proxy', label: 'Proxy', icon: icon('🛰️'), onSelect: fn() },
        ],
      },
      { id: 'display', label: 'Display', icon: icon('🖥️'), onSelect: fn() },
    ],
  },
];

const meta: Meta<typeof DockBar> = {
  title: 'DockBar',
  component: DockBar,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: { control: 'radio', options: ['glass', 'solid', 'pill'] },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    colorScheme: { control: 'radio', options: ['auto', 'light', 'dark'] },
    animationDuration: { control: { type: 'range', min: 0, max: 800, step: 20 } },
    activeId: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof DockBar>;

export const FlatDock: Story = {
  args: {
    items: flatItems,
    defaultActiveId: 'finder',
    ariaLabel: 'App dock',
  },
};

export const NestedDock: Story = {
  args: {
    items: nestedItems,
    defaultActiveId: 'vpn',
    ariaLabel: 'App dock',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    // Items ignore pointers while a level animates, so wait for it to settle before clicking.
    const clickWhenSettled = async (name: string | RegExp) => {
      await waitFor(() =>
        expect(canvasElement.querySelector('[data-dockbar-part="level"]')).toHaveAttribute(
          'data-dockbar-phase',
          'idle',
        ),
      );
      await userEvent.click(canvas.getByRole('button', { name }));
    };

    await step('drill into Settings', async () => {
      await clickWhenSettled(/Settings/);
      await waitFor(() => expect(canvas.getByRole('button', { name: /Back/ })).toBeInTheDocument());
    });

    await step('drill into Network', async () => {
      await clickWhenSettled(/Network/);
      await waitFor(() => expect(canvas.getByRole('button', { name: 'VPN' })).toBeInTheDocument());
    });

    await step('navigate back up two levels', async () => {
      await clickWhenSettled(/Back/);
      await waitFor(() =>
        expect(canvas.getByRole('button', { name: /Network/ })).toBeInTheDocument(),
      );
      await clickWhenSettled(/Back/);
      await waitFor(() =>
        expect(canvas.getByRole('button', { name: 'Finder' })).toBeInTheDocument(),
      );
    });
  },
};

export const ThemeMatrix: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
      {(['light', 'dark'] as const).map((colorScheme) => (
        <div
          key={colorScheme}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            alignItems: 'center',
            padding: 24,
            background: colorScheme === 'dark' ? '#111' : '#eee',
          }}
        >
          {(['glass', 'solid'] as const).map((variant) => (
            <DockBar key={variant} items={flatItems} colorScheme={colorScheme} variant={variant} />
          ))}
        </div>
      ))}
    </div>
  ),
};

export const ReducedMotion: Story = {
  args: {
    items: nestedItems,
    reducedMotion: 'always',
    ariaLabel: 'App dock (reduced motion)',
  },
};

/** Starts inside Settings → Network because the active item (VPN) lives there. */
export const OpenActiveLevel: Story = {
  args: {
    items: nestedItems,
    defaultActiveId: 'vpn',
    openActiveLevel: true,
    ariaLabel: 'App dock',
  },
};

const pillItems: DockBarEntry[] = [
  { id: 'search', label: 'Search', icon: <MdSearch />, onSelect: fn() },
  { id: 'home', label: 'Home', icon: <MdHome />, onSelect: fn() },
  { id: 'branches', label: 'Branches', icon: <MdCallSplit />, onSelect: fn() },
  { id: 'deploy', label: 'Deploy', icon: <MdRocketLaunch />, onSelect: fn() },
  { type: 'separator', id: 'sep-1' },
  { id: 'secrets', label: 'Secrets', icon: <MdVpnKey />, disabled: true },
  { type: 'separator', id: 'sep-2' },
  { id: 'history', label: 'History', icon: <MdHistory />, onSelect: fn() },
  { type: 'separator', id: 'sep-3' },
  { id: 'packages', label: 'Packages', icon: <MdInventory2 />, onSelect: fn() },
  { id: 'issues', label: 'Issues', icon: <MdBugReport />, onSelect: fn() },
  { id: 'inspect', label: 'Inspect', icon: <MdManageSearch />, onSelect: fn() },
  {
    id: 'security',
    label: 'Security',
    icon: <MdShield />,
    children: [
      { id: 'vpn', label: 'VPN', icon: <MdLock />, onSelect: fn() },
      { id: 'firewall', label: 'Firewall', icon: <MdRouter />, onSelect: fn() },
    ],
  },
  { id: 'image-search', label: 'Image search', icon: <MdImageSearch />, onSelect: fn() },
  { id: 'images', label: 'Images', icon: <MdImage />, onSelect: fn() },
  { type: 'separator', id: 'sep-4' },
  { id: 'chat', label: 'Chat', icon: <MdChat />, onSelect: fn() },
  { id: 'comments', label: 'Comments', icon: <MdComment />, onSelect: fn() },
  { id: 'forum', label: 'Forum', icon: <MdForum />, onSelect: fn() },
  { id: 'messages', label: 'Messages', icon: <MdMessage />, onSelect: fn() },
];

const PANEL_IDS = new Set(['comments', 'forum', 'messages']);

/** Pill toolbar whose chat panels are toggles: several can be on next to the active item. */
const PillToolbarWithPanels = (args: DockBarProps) => {
  const [openPanels, setOpenPanels] = useState<string[]>(['forum', 'messages']);
  const togglePanel = (id: string) =>
    setOpenPanels((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const items = args.items.map((entry) =>
    entry.type !== 'separator' && PANEL_IDS.has(entry.id)
      ? { ...entry, pressed: openPanels.includes(entry.id), onSelect: () => togglePanel(entry.id) }
      : entry,
  );
  return <DockBar {...args} items={items} />;
};

/** Compact toolbar theme: white pill, grouped icons with separators, filled active and pressed items. */
export const PillToolbar: Story = {
  args: {
    items: pillItems,
    variant: 'pill',
    defaultActiveId: 'image-search',
    ariaLabel: 'Toolbar',
  },
  render: (args) => <PillToolbarWithPanels {...args} />,
};

/** Screen-reader texts translated to Spanish via `ariaLabel`, `backItem.label` and `labels`. */
export const SpanishLabels: Story = {
  args: {
    items: pillItems,
    variant: 'pill',
    ariaLabel: 'Barra de herramientas',
    backItem: { label: 'Atrás' },
    labels: {
      parentItem: (label, count) =>
        `${label}, abre ${count} ${count === 1 ? 'opción' : 'opciones'}`,
      backTo: (label) => `Volver a ${label}`,
      enteredLevel: (label, depth) => `${label}, nivel ${depth + 1}`,
      returnedTo: (label) => (label ? `De vuelta en ${label}` : 'De vuelta en el menú principal'),
    },
  },
};
