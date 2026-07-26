// Build config for the installable web app (PWA) served at any path
// (e.g. tikcal.nyc/hq/): relative base, output in dist-web/.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'web',
  base: './',
  publicDir: 'public',
  plugins: [react()],
  build: {
    outDir: '../dist-web',
    emptyOutDir: true,
  },
})
