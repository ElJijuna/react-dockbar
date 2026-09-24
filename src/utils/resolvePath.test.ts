import type { DockBarEntry } from '../types';
import { resolvePath } from './resolvePath';

const root: DockBarEntry[] = [
  { id: 'finder', label: 'Finder', icon: null },
  { type: 'separator', id: 'sep' },
  {
    id: 'settings',
    label: 'Settings',
    icon: null,
    children: [
      {
        id: 'network',
        label: 'Network',
        icon: null,
        children: [{ id: 'vpn', label: 'VPN', icon: null }],
      },
    ],
  },
];

const ids = (entries: { id: string }[]) => entries.map((entry) => entry.id);

describe('resolvePath', () => {
  it('returns the root level for an empty path', () => {
    expect(resolvePath(root, [])).toEqual({ breadcrumb: [], level: root });
  });

  it('walks a nested path to its level', () => {
    const { breadcrumb, level } = resolvePath(root, ['settings', 'network']);
    expect(ids(breadcrumb)).toEqual(['settings', 'network']);
    expect(ids(level)).toEqual(['vpn']);
  });

  it('stops at the deepest id that still resolves', () => {
    const { breadcrumb, level } = resolvePath(root, ['settings', 'missing']);
    expect(ids(breadcrumb)).toEqual(['settings']);
    expect(ids(level)).toEqual(['network']);
  });

  it('does not enter items without children or separators', () => {
    expect(resolvePath(root, ['finder']).breadcrumb).toEqual([]);
    expect(resolvePath(root, ['sep']).breadcrumb).toEqual([]);
  });
});
