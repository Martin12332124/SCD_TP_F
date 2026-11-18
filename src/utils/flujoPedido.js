// src/utils/flujoPedido.js
// Ciclo de un pedido, tal como lo valida el backend (TRANSICIONES en pedido.service.js):
// sin pedido → Recibido 📝 → En Cocina 🍳 → Listo 🍽️. Solo se puede avanzar un paso a la vez.

export const ESTADO_RECIBIDO = 'Recibido 📝';
export const ESTADO_EN_COCINA = 'En Cocina 🍳';
export const ESTADO_LISTO = 'Listo 🍽️';

/** Estados del pedido, en el orden en que ocurren. */
export const FLUJO_PEDIDO = [ESTADO_RECIBIDO, ESTADO_EN_COCINA, ESTADO_LISTO];

/**
 * Siguiente estado válido de un pedido.
 * @param {string|null|undefined} estadoActual - Estado vigente, o vacío si la mesa no tiene pedido
 * @returns {string|null} El estado al que se puede avanzar, o null si no hay siguiente paso
 *   (el pedido ya está Listo, o el estado no es uno conocido).
 */
export function siguienteEstado(estadoActual) {
  if (!estadoActual) return FLUJO_PEDIDO[0];
  const posicion = FLUJO_PEDIDO.indexOf(estadoActual);
  if (posicion === -1 || posicion === FLUJO_PEDIDO.length - 1) return null;
  return FLUJO_PEDIDO[posicion + 1];
}
