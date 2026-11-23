import { describe, test, expect } from 'vitest';
import {
  segundosDesde,
  urgencia,
  comandasActivas,
  MINUTOS_ATENCION,
  MINUTOS_ATRASO,
  TOPE_SEGUNDOS
} from './tiempoComanda.js';

const BASE = Date.parse('2026-11-16T12:00:00.000Z');
const hace = (segundos) => new Date(BASE - segundos * 1000).toISOString();

describe('segundosDesde', () => {
  test.each([
    [0, 0],
    [59, 59],
    [61, 61],
    [900, 900]
  ])('hace %i s → %i', (atras, esperado) => {
    expect(segundosDesde(hace(atras), BASE)).toBe(esperado);
  });

  test('un reloj adelantado no da tiempos negativos', () => {
    expect(segundosDesde(hace(-30), BASE)).toBe(0);
  });

  test('se detiene en el tope de 99:59', () => {
    expect(segundosDesde(hace(7000), BASE)).toBe(TOPE_SEGUNDOS);
  });

  test.each([null, undefined, '', 'no es fecha'])('sin hora válida (%j) devuelve null', (desde) => {
    expect(segundosDesde(desde, BASE)).toBeNull();
  });
});

describe('urgencia (REF-04: alertas a los 15 y 20 minutos)', () => {
  test('los umbrales son 15 y 20 minutos', () => {
    expect([MINUTOS_ATENCION, MINUTOS_ATRASO]).toEqual([15, 20]);
  });

  test.each([
    [0, 'normal'],
    [15 * 60, 'normal'], // justo 15:00 todavía es normal
    [15 * 60 + 1, 'atencion'],
    [20 * 60, 'atencion'],
    [20 * 60 + 1, 'atrasado'],
    [null, 'normal']
  ])('%j segundos → %s', (segundos, nivel) => {
    expect(urgencia(segundos)).toBe(nivel);
  });
});

describe('comandasActivas', () => {
  const mesa = (numero, estado, estadoPedido, pedidoDesde) => ({
    id: `Mesa ${numero}`,
    numero,
    estado,
    estadoPedido,
    pedidoDesde
  });

  test('solo mesas ocupadas con pedido, de la más antigua a la más nueva', () => {
    const lista = comandasActivas([
      mesa(1, 'libre', null, null),
      mesa(2, 'ocupada', null, null), // ocupada sin pedido: no es comanda
      mesa(3, 'ocupada', 'En Cocina 🍳', hace(60)),
      mesa(6, 'ocupada', 'Recibido 📝', hace(600)),
      mesa(7, 'ocupada', 'Listo 🍽️', hace(10))
    ]);
    expect(lista.map((m) => m.numero)).toEqual([6, 3, 7]);
  });

  test('las comandas sin hora conocida van al final, por número', () => {
    const lista = comandasActivas([
      mesa(9, 'ocupada', 'En Cocina 🍳', null),
      mesa(4, 'ocupada', 'En Cocina 🍳', null),
      mesa(5, 'ocupada', 'Recibido 📝', hace(5))
    ]);
    expect(lista.map((m) => m.numero)).toEqual([5, 4, 9]);
  });

  test('ignora estados desconocidos y no modifica la lista original', () => {
    const original = [mesa(1, 'ocupada', 'En Espera', hace(1))];
    expect(comandasActivas(original)).toEqual([]);
    expect(original).toHaveLength(1);
  });
});
