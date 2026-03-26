import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  base: '/spyouts/',
  build: { outDir: '../../server/public/spyouts', emptyOutDir: true },
})
