import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/geistesblitz/',
  build: { outDir: '../../server/public/geistesblitz', emptyOutDir: true },
})
