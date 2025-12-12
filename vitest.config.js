import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitestReporter } from 'tdd-guard-vitest'

export default defineConfig({
  plugins: [react()],
  test: {
    reporters: ['default', new VitestReporter(process.cwd())],
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
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
