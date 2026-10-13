import { defineConfig } from 'vite'

export default defineConfig({
  base: '/ants/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
  },
  server: {
    port: 5173,
  },
})
