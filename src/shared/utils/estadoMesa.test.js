import { describe, test, expect } from 'vitest';
import { ESTADOS_MESA, estadoVisualMesa, estadoVisualPedido, contarEstados } from './estadoMesa.js';

const mesa = (numero, estado, estadoPedido) => ({
  id: `Mesa ${numero}`,
  numero,
  estado,
  ...(estadoPedido === undefined ? {} : { estadoPedido })
});

describe('estadoVisualMesa', () => {
  test.each([
    ['libre', null, 'libre'],
    ['ocupada', null, 'ocupada'],
    ['ocupada', 'Recibido 📝', 'recibido'],
    ['ocupada', 'En Cocina 🍳', 'cocina'],
    ['ocupada', 'Listo 🍽️', 'listo']
  ])('mesa %s con pedido %j se muestra como "%s"', (estado, estadoPedido, clave) => {
    expect(estadoVisualMesa(mesa(1, estado, estadoPedido))).toBe(ESTADOS_MESA[clave]);
  });

  test('sin el campo estadoPedido (backend anterior), una mesa ocupada se muestra "Ocupada"', () => {
    expect(estadoVisualMesa(mesa(1, 'ocupada')).etiqueta).toBe('Ocupada');
  });

  test('un estado de pedido desconocido se muestra "Ocupada"', () => {
    expect(estadoVisualMesa(mesa(1, 'ocupada', 'En Espera')).clave).toBe('ocupada');
  });

  test('una mesa libre es "Libre" aunque traiga un estado de pedido', () => {
    expect(estadoVisualMesa(mesa(1, 'libre', 'En Cocina 🍳')).clave).toBe('libre');
  });

  test('sin mesa devuelve "Libre" en vez de fallar', () => {
    expect(estadoVisualMesa(null).clave).toBe('libre');
  });

  test('cada estado tiene texto e ícono propios (no depende solo del color)', () => {
    const estados = Object.values(ESTADOS_MESA);
    expect(new Set(estados.map((e) => e.etiqueta)).size).toBe(estados.length);
    expect(new Set(estados.map((e) => e.icono)).size).toBe(estados.length);
  });
});

describe('estadoVisualPedido', () => {
  test('traduce el estado del pedido a su estado visual', () => {
    expect(estadoVisualPedido('En Cocina 🍳')).toBe(ESTADOS_MESA.cocina);
  });

  test.each([null, undefined, 'Sin Pedidos'])('devuelve null para %j', (estado) => {
    expect(estadoVisualPedido(estado)).toBeNull();
  });
});

describe('contarEstados', () => {
  test('cuenta libres, ocupadas (todas las no libres) y cada estado de pedido', () => {
    const mesas = [
      mesa(1, 'libre', null),
      mesa(2, 'libre', null),
      mesa(3, 'ocupada', null),
      mesa(4, 'ocupada', 'Recibido 📝'),
      mesa(5, 'ocupada', 'En Cocina 🍳'),
      mesa(6, 'ocupada', 'En Cocina 🍳'),
      mesa(7, 'ocupada', 'Listo 🍽️')
    ];
    expect(contarEstados(mesas)).toEqual({
      libre: 2,
      ocupada: 5,
      recibido: 1,
      cocina: 2,
      listo: 1
    });
  });

  test('sin mesas todo queda en cero', () => {
    expect(contarEstados([])).toEqual({ libre: 0, ocupada: 0, recibido: 0, cocina: 0, listo: 0 });
  });
});
