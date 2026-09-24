/**
 * @jest-environment node
 */
import { renderToString } from 'react-dom/server';
import type { DockBarEntry } from '../types';
import { DockBar } from './DockBar';

const items: DockBarEntry[] = [
  { id: 'home', label: 'Home', icon: <span>H</span> },
  { type: 'separator', id: 'sep' },
  {
    id: 'settings',
    label: 'Settings',
    icon: <span>S</span>,
    children: [{ id: 'wifi', label: 'Wi-Fi', icon: <span>W</span> }],
  },
];

describe('DockBar server rendering', () => {
  let consoleError: jest.SpyInstance;
  let consoleWarn: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  it('renders the root level without a DOM and without React warnings', () => {
    expect(typeof window).toBe('undefined');

    const html = renderToString(<DockBar items={items} activeId="home" />);

    expect(html).toContain('role="toolbar"');
    expect(html).toContain('aria-label="Home"');
    expect(html).toContain('aria-current="true"');
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it('renders the active nested level with its Back bubble when openActiveLevel is set', () => {
    const html = renderToString(<DockBar items={items} activeId="wifi" openActiveLevel />);

    expect(html).toContain('aria-label="Wi-Fi"');
    expect(html).toContain('data-dockbar-part="back-area"');
    expect(consoleError).not.toHaveBeenCalled();
  });
});
