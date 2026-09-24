import type { DockBarItem } from '../types';
import { findItemPath } from './findItemPath';

const items: DockBarItem[] = [
  { id: 'finder', label: 'Finder', icon: null },
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

describe('findItemPath', () => {
  it('returns the root-first chain to a deeply nested item', () => {
    expect(findItemPath(items, 'vpn').map((item) => item.id)).toEqual([
      'settings',
      'network',
      'vpn',
    ]);
  });

  it('returns a single-item path for a root item', () => {
    expect(findItemPath(items, 'finder').map((item) => item.id)).toEqual(['finder']);
  });

  it('returns an empty path for an unknown id', () => {
    expect(findItemPath(items, 'missing')).toEqual([]);
  });
});
