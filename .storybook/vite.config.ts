import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Storybook's own Vite config. The root vite.config.ts is for the library build (lib mode,
// externals, d.ts generation) and must not leak into the Storybook app build.
export default defineConfig({
  plugins: [react()],
});
