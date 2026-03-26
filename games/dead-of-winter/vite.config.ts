import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  base: '/dead-of-winter/',
  build: { outDir: '../../server/public/dead-of-winter', emptyOutDir: true },
})
