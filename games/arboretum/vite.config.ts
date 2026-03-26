import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/arboretum/',
  build: {
    outDir: '../../server/public/arboretum',
    emptyOutDir: true,
  },
})
