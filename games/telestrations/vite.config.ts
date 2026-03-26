import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/telestrations/',
  build: { outDir: '../../server/public/telestrations', emptyOutDir: true },
})
