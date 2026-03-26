import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/word-slam/',
  build: {
    outDir: '../../server/public/word-slam',
    emptyOutDir: true,
  },
});
