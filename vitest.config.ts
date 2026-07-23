import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/.pnpm-store/**',
      '**/destinyone-work/**',
      '**/dist/**',
    ],
  },
});
