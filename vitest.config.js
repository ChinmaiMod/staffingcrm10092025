import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitestReporter } from 'tdd-guard-vitest'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
    reporters: [
      'default',
      new VitestReporter(path.resolve(__dirname)),
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/supabase/functions/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.js',
        '**/index.jsx',
        '**/main.jsx',
      ],
    },
  },
})
