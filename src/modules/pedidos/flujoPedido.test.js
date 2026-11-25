import { describe, test, expect } from 'vitest';
import {
  FLUJO_PEDIDO,
  ESTADO_RECIBIDO,
  ESTADO_EN_COCINA,
  ESTADO_LISTO,
  siguienteEstado
} from './flujoPedido.js';

describe('flujoPedido', () => {
  test('los estados coinciden exactamente con los que valida el backend', () => {
    expect(FLUJO_PEDIDO).toEqual(['Recibido 📝', 'En Cocina 🍳', 'Listo 🍽️']);
  });

  test.each([
    [null, ESTADO_RECIBIDO],
    [undefined, ESTADO_RECIBIDO],
    ['', ESTADO_RECIBIDO],
    [ESTADO_RECIBIDO, ESTADO_EN_COCINA],
    [ESTADO_EN_COCINA, ESTADO_LISTO]
  ])('después de %j sigue %j', (actual, siguiente) => {
    expect(siguienteEstado(actual)).toBe(siguiente);
  });

  test('un pedido Listo no tiene siguiente paso', () => {
    expect(siguienteEstado(ESTADO_LISTO)).toBeNull();
  });

  test('un estado desconocido no tiene siguiente paso', () => {
    expect(siguienteEstado('En Espera')).toBeNull();
  });
});
