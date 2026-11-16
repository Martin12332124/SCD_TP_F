// src/utils/tiempoComanda.js
// Tiempo de las comandas: cuánto lleva cada pedido en su estado actual y si está atrasado.
// Umbrales de REF-04: alertas a los 15 y a los 20 minutos.

import { estadoVisualPedido } from './estadoMesa';

/** Pasados estos minutos en el mismo estado, la comanda pide atención. */
export const MINUTOS_ATENCION = 15;
/** Pasados estos minutos en el mismo estado, la comanda está atrasada. */
export const MINUTOS_ATRASO = 20;
/** Tope visual del temporizador (99:59) para que no desborde. */
export const TOPE_SEGUNDOS = 99 * 60 + 59;

/**
 * Segundos transcurridos desde `desde` hasta `ahora`.
 * @param {string|null|undefined} desde - Fecha ISO 8601 del último cambio de estado
 * @param {number} ahora - Milisegundos (Date.now())
 * @returns {number|null} Entre 0 y TOPE_SEGUNDOS, o null si no se sabe desde cuándo
 */
export function segundosDesde(desde, ahora) {
  if (!desde) return null;
  const inicio = Date.parse(desde);
  if (Number.isNaN(inicio)) return null;
  const segundos = Math.floor((ahora - inicio) / 1000);
  // Un reloj de tablet algo adelantado no debe mostrar tiempos negativos
  return Math.min(Math.max(segundos, 0), TOPE_SEGUNDOS);
}

/**
 * Nivel de urgencia de una comanda según el tiempo en su estado.
 * @param {number|null} segundos
 * @returns {'normal'|'atencion'|'atrasado'}
 */
export function urgencia(segundos) {
  if (segundos === null || segundos === undefined) return 'normal';
  if (segundos > MINUTOS_ATRASO * 60) return 'atrasado';
  if (segundos > MINUTOS_ATENCION * 60) return 'atencion';
  return 'normal';
}

/**
 * Comandas en curso: las mesas ocupadas con un pedido de estado conocido, de la más
 * antigua a la más nueva (como se leen en el riel de una cocina). Las que no tienen
 * hora conocida van al final.
 * @param {Array<{ id, numero, estado, estadoPedido?, pedidoDesde? }>} mesas
 */
export function comandasActivas(mesas) {
  const valor = (m) => (m.pedidoDesde ? Date.parse(m.pedidoDesde) : Infinity);
  return mesas
    .filter((m) => m.estado === 'ocupada' && estadoVisualPedido(m.estadoPedido))
    .sort((a, b) => valor(a) - valor(b) || a.numero - b.numero);
}
