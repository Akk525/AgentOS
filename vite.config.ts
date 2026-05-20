import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Tauri packages are provided by the Tauri runtime — not bundled.
// Marking them external here keeps the browser/dev build clean even before
// `npm install` resolves them. In desktop mode, Tauri injects them.
const TAURI_EXTERNALS = [
  '@tauri-apps/api',
  '@tauri-apps/api/core',
  '@tauri-apps/plugin-dialog',
]

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: TAURI_EXTERNALS,
    },
  },
})
