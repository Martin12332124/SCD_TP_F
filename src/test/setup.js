// Configuración global de las pruebas: matchers de jest-dom y limpieza del DOM.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
