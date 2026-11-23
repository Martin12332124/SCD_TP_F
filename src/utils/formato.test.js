import { describe, test, expect } from 'vitest';
import { formatearPrecio, formatearTiempo } from './formato.js';

describe('formatearPrecio', () => {
  test.each([
    [0, '$0'],
    [990, '$990'],
    [8500, '$8.500'],
    [19000, '$19.000'],
    [1234567, '$1.234.567']
  ])('%i → %s', (entrada, esperado) => {
    expect(formatearPrecio(entrada)).toBe(esperado);
  });

  test.each([[undefined], [null], ['8500'], [NaN], [Infinity]])(
    'rechaza entrada inválida (%s) con TypeError',
    (entrada) => {
      expect(() => formatearPrecio(entrada)).toThrow(TypeError);
    }
  );
});

describe('formatearTiempo', () => {
  test.each([
    [0, '00:00'],
    [59, '00:59'],
    [60, '01:00'],
    [900, '15:00'],
    [5999, '99:59'],
    [6000, '100:00']
  ])('%i s → %s', (entrada, esperado) => {
    expect(formatearTiempo(entrada)).toBe(esperado);
  });
});
