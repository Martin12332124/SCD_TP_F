// src/utils/flujoPedido.js
// Ciclo de vida de un pedido, tal como lo valida el backend (TRANSICIONES en pedido.service.js):
// sin pedido → Recibido 📝 → En Cocina 🍳 → Listo 🍽️. El backend solo acepta avanzar un paso a la vez.

/** Estados del pedido, en el orden en que ocurren. */
export const FLUJO_PEDIDO = ['Recibido 📝', 'En Cocina 🍳', 'Listo 🍽️'];

/**
 * Pasos que hay que enviar, en orden, para llevar un pedido desde `estadoActual` hasta `objetivo`.
 * Ej.: sin pedido → "Listo 🍽️" = ["Recibido 📝", "En Cocina 🍳", "Listo 🍽️"].
 * Si el objetivo no está más adelante que el estado actual, devuelve solo el objetivo,
 * para que el backend responda con el motivo (ej. "En Cocina → En Cocina no permitido").
 *
 * @param {string|null} estadoActual - Estado del pedido vigente, o null si la mesa no tiene pedido
 * @param {string} objetivo - Estado al que se quiere llegar (uno de FLUJO_PEDIDO)
 * @returns {string[]}
 */
export function pasosHastaEstado(estadoActual, objetivo) {
  const desde = estadoActual ? FLUJO_PEDIDO.indexOf(estadoActual) + 1 : 0;
  const hasta = FLUJO_PEDIDO.indexOf(objetivo);
  return desde <= hasta ? FLUJO_PEDIDO.slice(desde, hasta + 1) : [objetivo];
}
