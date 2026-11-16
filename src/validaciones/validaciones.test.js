// Pruebas unitarias de validarNumeroMesa (frontera de entrada del frontend).
import { describe, test, expect } from 'vitest';
import {
  validarNumeroMesa,
  validarCantidad,
  validarMesaExistente,
  validarTraslado,
  validarNumeroMesaNueva,
  NUMERO_MESA_MAXIMO
} from './validaciones';

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

describe('validarCantidad (límites 1 a 99)', () => {
  test.each([
    [1, 1], // límite inferior
    [99, 99], // límite superior
    ['50', 50],
    [' 7 ', 7]
  ])('acepta %j y devuelve %i', (entrada, esperado) => {
    expect(validarCantidad(entrada)).toEqual({
      esValido: true,
      cantidad: esperado,
      mensajeError: null
    });
  });

  test.each([0, 100, -1, 1.5, '1.5', 'abc', '', '  ', null, undefined, NaN])(
    'rechaza %j con el mensaje de la regla',
    (entrada) => {
      const r = validarCantidad(entrada);
      expect(r.esValido).toBe(false);
      expect(r.cantidad).toBeNull();
      expect(r.mensajeError).toMatch(/entero de 1 a 99/);
    }
  );
});

// Lista de mesas como la envía el backend (con un hueco: no existe la mesa 5)
const MESAS = [1, 2, 3, 4, 6].map((numero) => ({ id: `Mesa ${numero}`, numero, estado: 'libre' }));

describe('validarMesaExistente (la mesa tiene que existir)', () => {
  test.each([
    [3, 3],
    ['6', 6],
    ['1', 1]
  ])('acepta %j porque la mesa existe', (entrada, esperado) => {
    expect(validarMesaExistente(entrada, MESAS)).toEqual({
      esValido: true,
      numero: esperado,
      mensajeError: null
    });
  });

  test.each([5, '7', 99])('rechaza %j porque esa mesa no existe', (entrada) => {
    const r = validarMesaExistente(entrada, MESAS);
    expect(r.esValido).toBe(false);
    expect(r.numero).toBeNull();
    expect(r.mensajeError).toBe(`⚠️ La mesa ${Number(entrada)} no existe.`);
  });

  test.each([
    ['', /válido/],
    ['abc', /numérico/],
    ['1.5', /entero/],
    ['0', /mayor a 0/],
    ['-1', /mayor a 0/]
  ])('conserva las reglas de validarNumeroMesa para %j', (entrada, mensaje) => {
    const r = validarMesaExistente(entrada, MESAS);
    expect(r.esValido).toBe(false);
    expect(r.mensajeError).toMatch(mensaje);
  });

  test.each([[undefined], [null], [[]]])('sin lista de mesas (%j) ninguna existe', (mesas) => {
    expect(validarMesaExistente(1, mesas).esValido).toBe(false);
  });
});

describe('validarTraslado (US-05)', () => {
  test('acepta dos mesas distintas que existen y devuelve sus números', () => {
    expect(validarTraslado('2', 6, MESAS)).toEqual({
      esValido: true,
      origen: 2,
      destino: 6,
      mensajeError: null
    });
  });

  // Mismos casos inválidos que antes se probaban escribiendo en los campos de App
  test.each([
    ['0', '3', /mayor a 0/],
    ['2', '-1', /mayor a 0/],
    ['', '3', /válido/],
    ['2', '', /válido/],
    ['abc', '3', /numérico/],
    ['2', '1.5', /entero/],
    ['4', '4', /distintas/]
  ])('origen %j y destino %j se rechazan', (origen, destino, mensaje) => {
    const r = validarTraslado(origen, destino, MESAS);
    expect(r).toMatchObject({ esValido: false, origen: null, destino: null });
    expect(r.mensajeError).toMatch(mensaje);
  });

  test('conserva el mensaje exacto de mesas iguales', () => {
    expect(validarTraslado(4, 4, MESAS).mensajeError).toBe(
      '⚠️ [ENTRADA_INVALIDA] origen y destino deben ser mesas distintas.'
    );
  });

  test.each([
    [5, 2, 'La mesa 5 no existe.'],
    [2, 9, 'La mesa 9 no existe.']
  ])('rechaza si el origen %i o el destino %i no existen', (origen, destino, mensaje) => {
    const r = validarTraslado(origen, destino, MESAS);
    expect(r.esValido).toBe(false);
    expect(r.mensajeError).toContain(mensaje);
  });
});

describe('validarNumeroMesaNueva (agregar mesa)', () => {
  test.each([
    [5, 5], // hueco libre
    ['7', 7],
    [NUMERO_MESA_MAXIMO, NUMERO_MESA_MAXIMO] // límite superior válido
  ])('acepta %j: número libre dentro del rango', (entrada, esperado) => {
    expect(validarNumeroMesaNueva(entrada, MESAS)).toEqual({
      esValido: true,
      numero: esperado,
      mensajeError: null
    });
  });

  test('rechaza un número mayor al máximo (límite)', () => {
    const r = validarNumeroMesaNueva(NUMERO_MESA_MAXIMO + 1, MESAS);
    expect(r.esValido).toBe(false);
    expect(r.mensajeError).toMatch(/no puede ser mayor a 99/);
  });

  test('rechaza un número que ya existe', () => {
    const r = validarNumeroMesaNueva('3', MESAS);
    expect(r).toEqual({ esValido: false, numero: null, mensajeError: '⚠️ La mesa 3 ya existe.' });
  });

  test.each([
    ['', /válido/],
    ['abc', /numérico/],
    ['1.5', /entero/],
    ['0', /mayor a 0/],
    ['-1', /mayor a 0/]
  ])('conserva las reglas de validarNumeroMesa para %j', (entrada, mensaje) => {
    expect(validarNumeroMesaNueva(entrada, MESAS).mensajeError).toMatch(mensaje);
  });

  test('sin lista de mesas solo valida el formato y el rango', () => {
    expect(validarNumeroMesaNueva(3, undefined).esValido).toBe(true);
  });
});
