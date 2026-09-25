import type { Preview } from '@storybook/react-vite';
import type { ReactElement } from 'react';
import '../src/theme/tokens.css';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
  },
  decorators: [
    // The transform makes this frame the containing block of the `position: fixed` dock, so it
    // is pinned to the preview (also each docs-page preview) instead of the browser window.
    // The background follows the story's `colorScheme` control (`auto` = the OS setting).
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
          colorScheme:
            ctx.args.colorScheme === 'light' || ctx.args.colorScheme === 'dark'
              ? ctx.args.colorScheme
              : 'light dark',
          background: 'light-dark(#eee, #111)',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default preview;
