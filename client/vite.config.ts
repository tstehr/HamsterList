import react from '@vitejs/plugin-react'
import autoprefixer from 'autoprefixer'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import viteTsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), viteTsconfigPaths({ root: '.' }), svgr()],
  css: {
    postcss: {
      plugins: [autoprefixer()],
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  },
  test: {
    exclude: ['build', 'node_modules'],
    testTimeout: 20000,
    environment: 'jsdom',
  },
})
