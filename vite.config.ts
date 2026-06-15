import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
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
          if (id.includes('node_modules/react')) return 'react-vendor'
          if (id.includes('node_modules/cytoscape')) return 'cytoscape-vendor'
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    target: 'esnext',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/core/**/*.ts'],
    },
  },
})
