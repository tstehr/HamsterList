// @ts-check

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['*/build/**', '*/coverage/**', '.yarn/**'],
  },
  {
    files: ['*/src/**/*.ts', '*/src/**/*.tsx'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...tseslint.configs.stylistic],
  },
  {
    files: ['*/src/**/*.tsx'],
    rules: {
      '@typescript-eslint/ban-types': [
        'error',
        {
          extendDefaults: true,
          types: {
            '{}': false,
          },
        },
      ],
      'react/prop-types': 'off',
    },
  },
)
