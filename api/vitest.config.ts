import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Integration files share one Postgres database and reset it between
    // tests, so they must not run in parallel.
    fileParallelism: false,
    restoreMocks: true,
    testTimeout: 15_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/apps/*/server.ts', 'src/apps/worker/main.ts', 'src/types/**'],
    },
  },
});
