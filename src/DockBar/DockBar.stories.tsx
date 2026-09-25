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
import type {
  DockBarEntry,
  DockBarItem,
  DockBarPosition,
  DockBarPreview,
  DockBarProps,
} from '../types';
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
    autoHide: { control: 'boolean' },
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

/** Fake window screenshot for the stories: a title bar and a few content lines. */
const WindowThumbnail = ({ accent }: { accent: string }) => (
  <svg viewBox="0 0 160 100" role="presentation">
    <rect width="160" height="100" fill="#f4f4f5" />
    <rect width="160" height="14" fill={accent} />
    <circle cx="8" cy="7" r="2.5" fill="#fff" opacity="0.8" />
    <circle cx="16" cy="7" r="2.5" fill="#fff" opacity="0.8" />
    <rect x="10" y="24" width="90" height="8" rx="2" fill="#d4d4d8" />
    <rect x="10" y="40" width="140" height="5" rx="2" fill="#e4e4e7" />
    <rect x="10" y="51" width="120" height="5" rx="2" fill="#e4e4e7" />
    <rect x="10" y="62" width="130" height="5" rx="2" fill="#e4e4e7" />
    <rect x="10" y="76" width="44" height="14" rx="3" fill={accent} opacity="0.7" />
  </svg>
);

type OpenWindow = Omit<DockBarPreview, 'thumbnail' | 'onSelect' | 'onClose' | 'active'> & {
  accent: string;
};

const INITIAL_WINDOWS: Record<string, OpenWindow[]> = {
  chat: [
    { id: 'chat-team', title: 'Team channel', accent: '#6366f1' },
    { id: 'chat-design', title: 'Design review', accent: '#8b5cf6' },
    { id: 'chat-support', title: 'Support queue', accent: '#0ea5e9' },
  ],
  issues: [
    { id: 'issue-128', title: '#128 Magnification jitter', accent: '#ef4444' },
    { id: 'issue-131', title: '#131 Focus ring in Safari', accent: '#f97316' },
  ],
  images: [{ id: 'images-board', title: 'Moodboard.png', accent: '#10b981' }],
};

/**
 * Apps with open windows: hover an app to see its windows, or click one with several windows
 * to pin the panel. Focus an app and press ↑ to reach the windows from the keyboard.
 */
const PillToolbarWithWindowsRender = (args: DockBarProps) => {
  const [windows, setWindows] = useState(INITIAL_WINDOWS);
  const [frontWindowId, setFrontWindowId] = useState<string | null>('chat-design');
  const items = args.items.map((entry) => {
    const appWindows = entry.type === 'separator' ? undefined : windows[entry.id];
    if (!appWindows?.length) {
      return entry;
    }
    return {
      ...entry,
      previews: appWindows.map(({ accent, ...window }) => ({
        ...window,
        thumbnail: <WindowThumbnail accent={accent} />,
        active: window.id === frontWindowId,
        onSelect: () => setFrontWindowId(window.id),
        onClose: () =>
          setWindows((all) => ({
            ...all,
            [entry.id]: all[entry.id].filter((w) => w.id !== window.id),
          })),
      })),
    };
  });
  return <DockBar {...args} items={items} />;
};

export const PillToolbarWithWindows: Story = {
  args: {
    items: pillItems,
    defaultActiveId: 'chat',
    ariaLabel: 'Toolbar',
  },
  render: (args) => <PillToolbarWithWindowsRender {...args} />,
};

/**
 * A long page under the pinned dock. The page reserves the dock's space with
 * `padding-bottom: var(--dockbar-inset-bottom, 0px)`, so its last lines scroll clear of it.
 */
const PARAGRAPHS = Array.from(
  { length: 12 },
  (_, index) =>
    `Paragraph ${index + 1}. Scroll to the end: the last paragraph stops above the dock instead of hiding behind it.`,
);

export const ReservedSpace: Story = {
  parameters: { docsFrameHeight: 360 },
  args: {
    items: pillItems,
    defaultActiveId: 'home',
    ariaLabel: 'Toolbar',
  },
  render: (args) => (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'auto',
          padding: '24px 48px',
          paddingBottom: 'var(--dockbar-inset-bottom, 0px)',
          font: '15px/1.6 system-ui, sans-serif',
          color: 'light-dark(#333, #ddd)',
        }}
      >
        {PARAGRAPHS.map((text) => (
          <p key={text}>{text}</p>
        ))}
        <p style={{ fontWeight: 600 }}>Last paragraph — fully visible.</p>
      </div>
      <DockBar {...args} />
    </>
  ),
};

/** Hidden until the pointer reaches the bottom edge (or Tab reaches the dock), like the macOS Dock. */
export const AutoHide: Story = {
  args: {
    items: pillItems,
    defaultActiveId: 'home',
    ariaLabel: 'Toolbar',
    autoHide: true,
  },
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
      badge: (name, badge) =>
        typeof badge === 'number'
          ? `${name}, ${badge} ${badge === 1 ? 'notificación' : 'notificaciones'}`
          : `${name}, ${badge}`,
      previewsItem: (label, count) =>
        `${label}, ${count} ${count === 1 ? 'ventana abierta' : 'ventanas abiertas'}`,
      previewsPanel: (label) => `Ventanas de ${label}`,
      closePreview: (title) => `Cerrar ${title}`,
    },
  },
};
