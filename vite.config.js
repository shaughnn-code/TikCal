import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom domain (tikcal.nyc) serves from the site root, so base stays '/'.
export default defineConfig({
  plugins: [react()],
})
