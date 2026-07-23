// Build config for the hosted single-file demo (see artifact/).
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-artifact',
    rollupOptions: { input: 'artifact/index.html' },
  },
})
