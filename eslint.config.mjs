// @ts-check

import { fixupConfigRules } from '@eslint/compat'
import { FlatCompat } from '@eslint/eslintrc'
import eslint from '@eslint/js'
import path from 'path'
import tseslint from 'typescript-eslint'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const flatCompat = new FlatCompat()

export default tseslint.config(
  {
    ignores: ['*/build/**', '*/coverage/**', '.yarn/**'],
  },
  {
    files: ['*/src/**/*.ts', '*/src/**/*.tsx'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommendedTypeChecked, ...tseslint.configs.stylisticTypeChecked],
  },
  {
    files: ['*/src/**/*.tsx'],
    // @ts-expect-error
    extends: [
      // @ts-expect-error
      ...fixupConfigRules(flatCompat.extends('plugin:react/recommended')),
      // @ts-expect-error
      ...fixupConfigRules(flatCompat.extends('plugin:react-hooks/recommended')),
    ],
    settings: {
      react: {
        version: 'detect',
      },
    },
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
  {
    languageOptions: {
      parserOptions: {
        project: ['./*/tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
    },
  },
)
