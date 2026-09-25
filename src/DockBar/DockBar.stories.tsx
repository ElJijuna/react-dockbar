import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  MdBluetooth,
  MdBugReport,
  MdCallSplit,
  MdChat,
  MdComment,
  MdFolder,
  MdForum,
  MdHistory,
  MdHome,
  MdImage,
  MdImageSearch,
  MdInventory2,
  MdLan,
  MdLock,
  MdMail,
  MdManageSearch,
  MdMessage,
  MdMonitor,
  MdMusicNote,
  MdPhotoLibrary,
  MdPublic,
  MdRocketLaunch,
  MdRouter,
  MdSearch,
  MdSettings,
  MdShield,
  MdTerminal,
  MdVpnKey,
  MdWifi,
} from 'react-icons/md';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { DockBarEntry, DockBarItem, DockBarPosition, DockBarProps } from '../types';
import { DockBar } from './DockBar';

// All stories share the Pill Toolbar look (pill variant, Material icons, bottom-center),
// which is the reference for how the component should look by default.

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

const flatItems: DockBarItem[] = [
  { id: 'files', label: 'Files', icon: <MdFolder />, onSelect: fn() },
  { id: 'mail', label: 'Mail', icon: <MdMail />, badge: 3, onSelect: fn() },
  { id: 'photos', label: 'Photos', icon: <MdPhotoLibrary />, onSelect: fn() },
  { id: 'music', label: 'Music', icon: <MdMusicNote />, onSelect: fn() },
  { id: 'terminal', label: 'Terminal', icon: <MdTerminal />, onSelect: fn() },
];

const nestedItems: DockBarEntry[] = [
  { id: 'home', label: 'Home', icon: <MdHome />, onSelect: fn() },
  { id: 'mail', label: 'Mail', icon: <MdMail />, onSelect: fn() },
  { type: 'separator', id: 'sep-1' },
  {
    id: 'settings',
    label: 'Settings',
    icon: <MdSettings />,
    children: [
      { id: 'wifi', label: 'Wi-Fi', icon: <MdWifi />, onSelect: fn() },
      { id: 'bluetooth', label: 'Bluetooth', icon: <MdBluetooth />, onSelect: fn() },
      {
        id: 'network',
        label: 'Network',
        icon: <MdLan />,
        children: [
          { id: 'vpn', label: 'VPN', icon: <MdLock />, onSelect: fn() },
          { id: 'proxy', label: 'Proxy', icon: <MdPublic />, onSelect: fn() },
        ],
      },
      { id: 'display', label: 'Display', icon: <MdMonitor />, onSelect: fn() },
    ],
  },
];

const POSITIONS: DockBarPosition[] = [
  'bottom-center',
  'bottom-left',
  'bottom-right',
  'top-center',
  'top-left',
  'top-right',
  'left-center',
  'right-center',
  'inline',
];

const SIDE_POSITIONS = new Set<DockBarPosition>(['left-center', 'right-center']);

const meta: Meta<typeof DockBar> = {
  title: 'DockBar',
  component: DockBar,
  args: {
    variant: 'pill',
    position: 'bottom-center',
    colorScheme: 'auto',
  },
  argTypes: {
    variant: { control: 'radio', options: ['pill', 'glass', 'solid'] },
    position: { control: 'select', options: POSITIONS },
    orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    colorScheme: { control: 'radio', options: ['auto', 'light', 'dark'] },
    animationDuration: { control: { type: 'range', min: 0, max: 800, step: 20 } },
    activeId: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof DockBar>;

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
    defaultActiveId: 'image-search',
    ariaLabel: 'Toolbar',
  },
  render: (args) => <PillToolbarWithPanels {...args} />,
};

export const FlatDock: Story = {
  args: {
    items: flatItems,
    defaultActiveId: 'files',
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
      await waitFor(() => expect(canvas.getByRole('button', { name: 'Home' })).toBeInTheDocument());
    });
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

export const ReducedMotion: Story = {
  args: {
    items: nestedItems,
    reducedMotion: 'always',
    ariaLabel: 'App dock (reduced motion)',
  },
};

/** Every `position` at once; the side positions use a vertical dock. */
export const Positions: Story = {
  parameters: { docsFrameHeight: 520 },
  render: (args) => (
    <>
      {POSITIONS.map((position) => (
        <DockBar
          key={position}
          {...args}
          items={flatItems.slice(0, 3)}
          position={position}
          orientation={SIDE_POSITIONS.has(position) ? 'vertical' : 'horizontal'}
          defaultActiveId="files"
          ariaLabel={`Dock ${position}`}
        />
      ))}
    </>
  ),
};

/** The three variants in light and dark, rendered in the document flow (`position="inline"`). */
export const ThemeMatrix: Story = {
  parameters: { docsFrameHeight: 420 },
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
          {(['pill', 'glass', 'solid'] as const).map((variant) => (
            <DockBar
              key={variant}
              items={flatItems}
              defaultActiveId="files"
              colorScheme={colorScheme}
              variant={variant}
              position="inline"
              ariaLabel={`${variant} ${colorScheme}`}
            />
          ))}
        </div>
      ))}
    </div>
  ),
};

/** Screen-reader texts translated to Spanish via `ariaLabel`, `backItem.label` and `labels`. */
export const SpanishLabels: Story = {
  args: {
    items: pillItems,
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
