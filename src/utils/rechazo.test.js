import { describe, test, expect } from 'vitest';
import { textoRechazo } from './rechazo';

describe('textoRechazo', () => {
  test('un rechazo del dominio lleva su tipo entre corchetes', () => {
    expect(textoRechazo({ tipo: 'PEDIDO_ACTIVO', error: 'Hay un pedido.' })).toBe(
      '⚠️ [PEDIDO_ACTIVO] Hay un pedido.'
    );
  });
  test('agrega lo esperado si el backend lo informa', () => {
    expect(textoRechazo({ tipo: 'ENTRADA_INVALIDA', error: 'Mal.', esperado: 'un número' })).toBe(
      '⚠️ [ENTRADA_INVALIDA] Mal. — Esperado: un número'
    );
  });
  test.each(['LOCAL_DESCONECTADO', 'LOCAL_SIN_RESPUESTA', 'ORDEN_VENCIDA'])(
    '%s se muestra sin el código: ya es una frase para el usuario',
    (tipo) => {
      expect(textoRechazo({ tipo, error: 'Frase completa.' })).toBe('⚠️ Frase completa.');
    }
  );
});
