import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import type { DockBarItem } from '../types';
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
    variant: { control: 'radio', options: ['glass', 'solid'] },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    colorScheme: { control: 'radio', options: ['auto', 'light', 'dark'] },
    animationDuration: { control: { type: 'range', min: 0, max: 800, step: 20 } },
  },
};

export default meta;
type Story = StoryObj<typeof DockBar>;

export const FlatDock: Story = {
  args: {
    items: flatItems,
    ariaLabel: 'App dock',
  },
};

export const NestedDock: Story = {
  args: {
    items: nestedItems,
    ariaLabel: 'App dock',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('drill into Settings', async () => {
      await userEvent.click(canvas.getByRole('button', { name: /Settings/ }));
      await waitFor(() => expect(canvas.getByRole('button', { name: /Back/ })).toBeInTheDocument());
    });

    await step('drill into Network', async () => {
      await userEvent.click(canvas.getByRole('button', { name: /Network/ }));
      await waitFor(() => expect(canvas.getByRole('button', { name: 'VPN' })).toBeInTheDocument());
    });

    await step('navigate back up two levels', async () => {
      await userEvent.click(canvas.getByRole('button', { name: /Back/ }));
      await waitFor(() =>
        expect(canvas.getByRole('button', { name: /Settings/ })).toBeInTheDocument(),
      );
      await userEvent.click(canvas.getByRole('button', { name: /Back/ }));
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
