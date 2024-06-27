import react from '@vitejs/plugin-react'
import autoprefixer from 'autoprefixer'
import { execSync } from 'child_process'
import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import { VitePWA } from 'vite-plugin-pwa'
import svgr from 'vite-plugin-svgr'
import viteTsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig(() => {
  process.env.VITE_GIT_SHA = execSync('git rev-parse --short HEAD').toString().trim() || undefined

  return {
    plugins: [
      react(),
      viteTsconfigPaths({ root: '.' }),
      svgr(),
      checker({
        typescript: true,
        eslint: { useFlatConfig: true, lintCommand: 'eslint .' },
      }),
      VitePWA({
        manifest: {
          short_name: 'Shopping List',
          name: 'Create Shared Shopping Lists',
          icons: [
            {
              src: 'favicon.ico',
              sizes: '256x256 192x192 128x128 96x96 64x64 48x48 40x40 32x32 24x24 16x16',
              type: 'image/x-icon',
            },
            {
              src: 'apple-touch-icon.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
          theme_color: '#4CAF50',
          background_color: '#ffffff',
        },
      }),
    ],

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
      proxy: {
        '/api': {
          target: 'http://localhost:4000/',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },

    test: {
      exclude: ['build', 'node_modules'],
      testTimeout: 20000,
      environment: 'jsdom',
    },
  }
})
