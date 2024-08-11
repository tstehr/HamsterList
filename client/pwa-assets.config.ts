import { createAppleSplashScreens, defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...minimal2023Preset,
    appleSplashScreens: createAppleSplashScreens({
      padding: 0.3,
      resizeOptions: { fit: 'contain', background: 'white' },
      darkResizeOptions: { fit: 'contain', background: '#3e4b4c' },
      linkMediaOptions: {
        addMediaScreen: true,
        basePath: '/',
      },
    }),
    apple: {
      ...minimal2023Preset.apple,
      padding: 0.15,
    },
    transparent: {
      ...minimal2023Preset.transparent,
      padding: 0
    },
  },
  images: 'public/favicon.svg',
})
