import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Two build targets share one codebase:
//   - default (desktop/Electron): relative base so it loads from file://
//   - `--mode web` (installable PWA): absolute base for hosting at a site root
// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'web' ? '/' : './',
}))
