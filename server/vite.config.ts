// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['build', 'node_modules'],
    testTimeout: 20000,
  },
});
