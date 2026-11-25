// Ciclo de un pedido, tal como lo valida el backend: solo se avanza un paso a la vez.
import {
  ESTADO_RECIBIDO,
  ESTADO_EN_COCINA,
  ESTADO_LISTO
} from '../../shared/utils/estadosPedido.js';

export { ESTADO_RECIBIDO, ESTADO_EN_COCINA, ESTADO_LISTO };

export const FLUJO_PEDIDO = [ESTADO_RECIBIDO, ESTADO_EN_COCINA, ESTADO_LISTO];

/**
 * Siguiente estado válido de un pedido.
 * @param {string|null|undefined} estadoActual
 * @returns {string|null}
 */
export function siguienteEstado(estadoActual) {
  if (!estadoActual) return FLUJO_PEDIDO[0];
  const posicion = FLUJO_PEDIDO.indexOf(estadoActual);
  if (posicion === -1 || posicion === FLUJO_PEDIDO.length - 1) return null;
  return FLUJO_PEDIDO[posicion + 1];
}
