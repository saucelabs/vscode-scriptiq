import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import prism from 'vite-plugin-prismjs';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    prism({
      languages: ['java', 'python'],
      css: false,
    }),
    svgr(),
  ],
  mode: 'development',
  build: {
    outDir: 'build',
    assetsInlineLimit: 12288, // DEVX-2976: Workaround for missing assets.
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
});
