import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Vite 8 (Rolldown) rejects the object form of manualChunks; the function
        // form preserves the same two-vendor split. minify is dropped to use the
        // Oxc default (esbuild minify is deprecated in Vite 8).
        manualChunks(id) {
          // Rolldown on Windows passes native backslash paths; normalize so the
          // forward-slash substring tests work on all platforms.
          const p = id.replace(/\\/g, '/')
          if (p.includes('node_modules/react')) return 'react-vendor'
          if (p.includes('node_modules/cytoscape')) return 'cytoscape-vendor'
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    target: 'esnext',
  },
  test: {
    globals: true,
    // The fast-check property suites (automata language-equivalence batteries) can
    // exceed the 5s default under heavy CPU contention; raise the per-test budget so
    // the gate stays reliable under load. This does not reduce any property's run
    // count or weaken an assertion -- it only grants slow-but-correct tests more time.
    testTimeout: 20000,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // Co-located module suites (the share codec and its siblings) live next to
    // the code they prove under src/, so the runner discovers src/**/*.test.ts in
    // addition to the tests/ tree.
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/core/**/*.ts'],
    },
  },
})
