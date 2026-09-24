import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({
      tsconfigPath: './tsconfig.build.json',
    }),
  ],
  build: {
    cssCodeSplit: false,
    sourcemap: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'ReactDockbar',
      fileName: (format) => (format === 'cjs' ? 'react-dockbar.cjs' : 'react-dockbar.js'),
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        exports: 'named',
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith('.css')
            ? 'style.css'
            : (assetInfo.name ?? 'assets/[name][extname]'),
      },
    },
  },
});
