// Pruebas unitarias de validarNumeroMesa (frontera de entrada del frontend).
import { describe, test, expect } from 'vitest';
import { validarNumeroMesa } from './validaciones';

describe('validarNumeroMesa', () => {
  test.each([
    [5, 5],
    ['5', 5],
    ['1', 1], // límite inferior válido
    ['  7  ', 7]
  ])('acepta %j y devuelve el número %i', (entrada, esperado) => {
    const r = validarNumeroMesa(entrada);
    expect(r).toEqual({ esValido: true, numero: esperado, mensajeError: null });
  });

  test.each([undefined, null, '', '   '])('rechaza el valor vacío %j', (entrada) => {
    const r = validarNumeroMesa(entrada);
    expect(r.esValido).toBe(false);
    expect(r.numero).toBeNull();
    expect(r.mensajeError).toMatch(/válido/);
  });

  test('rechaza texto no numérico', () => {
    expect(validarNumeroMesa('abc').mensajeError).toMatch(/numérico/);
  });

  test('rechaza decimales', () => {
    expect(validarNumeroMesa('1.5').mensajeError).toMatch(/entero/);
  });

  test.each(['0', '-1', -10])('rechaza %j por no ser mayor a 0 (límite)', (entrada) => {
    const r = validarNumeroMesa(entrada);
    expect(r.esValido).toBe(false);
    expect(r.mensajeError).toMatch(/mayor a 0/);
  });
});
