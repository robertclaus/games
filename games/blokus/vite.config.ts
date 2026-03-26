import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/blokus/',
  build: { outDir: '../../server/public/blokus', emptyOutDir: true },
})
