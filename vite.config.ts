import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const ignoredWatchPaths = [
  /(^|[/\\])\.venv([/\\]|$)/,
  /(^|[/\\])venv([/\\]|$)/,
  /(^|[/\\])__pycache__([/\\]|$)/,
  /(^|[/\\])stems([/\\]|$)/,
  /(^|[/\\])downloads([/\\]|$)/,
  /(^|[/\\])dist([/\\]|$)/,
  /(^|[/\\])dist-electron([/\\]|$)/,
  /(^|[/\\])yt-dlp([/\\]|$)/,
]

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensure assets are loaded relatively for Electron
  server: {
    watch: {
      ignored: ignoredWatchPaths,
    },
  },
})
