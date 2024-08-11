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
          short_name: 'HamsterList',
          name: 'HamsterList – Shared Shopping Lists',
          theme_color: '#4CAF50',
          background_color: '#ffffff',
        },
        pwaAssets:  {
          config: true,
          overrideManifestIcons: true,
        }
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
