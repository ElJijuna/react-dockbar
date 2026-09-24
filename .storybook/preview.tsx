import type { Preview } from '@storybook/react-vite';
import type { ReactElement } from 'react';
import '../src/theme/tokens.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
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
    (Story, ctx): ReactElement => (
      <div
        style={{
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
