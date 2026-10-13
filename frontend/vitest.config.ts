import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost'),
  },
  test: {
    // Bound concurrent jsdom processes on shared development/CI hosts; every test,
    // assertion and timeout still runs unchanged.
    maxWorkers: 2,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
});
