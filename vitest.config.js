import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true, // Enable global test functions (describe, it, expect, etc.)
    testTimeout: 15000, // Default timeout of 15 seconds
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js'],
    },
    setupFiles: [], // if needed for global setups
  },
});
