import { describe, test, expect } from 'vitest';
import { FLUJO_PEDIDO, pasosHastaEstado } from './flujoPedido.js';

const [RECIBIDO, COCINA, LISTO] = FLUJO_PEDIDO;

describe('pasosHastaEstado', () => {
  test.each([
    // Sin pedido (mesa recién abierta): se completan los pasos que faltan
    [null, RECIBIDO, [RECIBIDO]],
    [null, COCINA, [RECIBIDO, COCINA]],
    [null, LISTO, [RECIBIDO, COCINA, LISTO]],
    // Con pedido: solo los pasos siguientes al estado actual
    [RECIBIDO, COCINA, [COCINA]],
    [RECIBIDO, LISTO, [COCINA, LISTO]],
    [COCINA, LISTO, [LISTO]]
  ])('de %s hasta "%s" → %j', (actual, objetivo, esperado) => {
    expect(pasosHastaEstado(actual, objetivo)).toEqual(esperado);
  });

  test.each([
    [COCINA, COCINA],
    [COCINA, RECIBIDO],
    [RECIBIDO, RECIBIDO]
  ])(
    'si "%s" ya alcanzó o pasó "%s", devuelve solo el objetivo (el backend explica)',
    (actual, objetivo) => {
      expect(pasosHastaEstado(actual, objetivo)).toEqual([objetivo]);
    }
  );
});
