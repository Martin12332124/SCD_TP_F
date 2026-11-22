import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // Las pruebas no dependen del .env de quien las corre: sin esto, una VITE_API_KEY real en el
    // .env se colaría en api.js y cambiaría las cabeceras que las pruebas esperan.
    env: { VITE_API_KEY: '' },
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      // Se miden todos los módulos propios, incluidos los componentes .jsx
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/test/**', 'src/**/*.test.{js,jsx}'],
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      thresholds: {
        statements: 85,
        lines: 85,
        functions: 80,
        branches: 75
      }
    }
  }
});
