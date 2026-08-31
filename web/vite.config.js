import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves the production build as a project site under
  // /process-twin-ai-dashboard/, not the domain root — but `npm run dev`
  // must stay at "/" or the local README/demo-script instructions break.
  base: command === 'build' ? '/process-twin-ai-dashboard/' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    globals: true,
  },
}))
