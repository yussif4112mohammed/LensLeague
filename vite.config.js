import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * Split the third-party code by how often it changes.
         *
         * React and the router change a few times a year; supabase-js changes
         * on its own release cycle; our application code changes every deploy.
         * In one chunk, every deploy invalidates all of it and every returning
         * visitor re-downloads React. Split, a deploy invalidates our chunk
         * alone and the rest is served from cache.
         *
         * Icons are separated for a different reason: lucide-react is a large
         * module graph of individually small icons, and keeping it out of the
         * entry chunk stops icon imports from inflating first paint.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-router') || id.includes('/react-dom/') || id.includes('/react/')) return 'vendor-react';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('lucide-react')) return 'vendor-icons';
          return undefined;
        },
      },
    },
    // The entry is now the application itself rather than the application plus
    // every screen in it. If this warns again, something large was imported
    // eagerly by mistake - which is the point of leaving the limit low.
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
})
