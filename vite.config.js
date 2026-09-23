import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '')
  const port = Number(env.DEV_PORT) || 6420

  return {
    plugins: [react(), tailwindcss()],
    server: { port, strictPort: true },
    preview: { port, strictPort: true },
    resolve: {
      alias: { '@': path.resolve(root, 'src') },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['src/tests/setup.js'],
      // userEvent typing through dialogs is slow in jsdom under the parallel suite.
      testTimeout: 15000,
      css: false,
      // .env.local is not loaded in test mode; tests use a fake project and mock auth.
      env: {
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
      },
    },
  }
})
