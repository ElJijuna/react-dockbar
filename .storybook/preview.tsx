import type { Preview } from '@storybook/react-vite';
import type { ReactElement } from 'react';
import '../src/theme/tokens.css';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
  },
  globalTypes: {
    colorScheme: {
      description: 'DockBar color scheme',
      toolbar: {
        title: 'Color scheme',
        icon: 'circlehollow',
        items: [
          { value: 'auto', title: 'Auto' },
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { colorScheme: 'auto' },
  decorators: [
    // The transform makes this frame the containing block of the `position: fixed` dock, so it
    // is pinned to the preview (also each docs-page preview) instead of the browser window.
    (Story, ctx): ReactElement => (
      <div
        style={{
          position: 'relative',
          transform: 'translateZ(0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          height: ctx.viewMode === 'docs' ? (ctx.parameters.docsFrameHeight ?? 280) : '100vh',
          padding: 48,
          background: ctx.globals.colorScheme === 'dark' ? '#111' : '#eee',
        }}
      >
        <Story args={{ ...ctx.args, colorScheme: ctx.globals.colorScheme }} />
      </div>
    ),
  ],
};

export default preview;
