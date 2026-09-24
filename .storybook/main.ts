import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    // Relative to process.cwd(); npm scripts always run from the repo root.
    options: { builder: { viteConfigPath: '.storybook/vite.config.ts' } },
  },
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  docs: { autodocs: 'tag' },
};

export default config;
