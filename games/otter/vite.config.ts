import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/otter/',
  build: {
    outDir: '../../server/public/otter',
    emptyOutDir: true,
  },
})
