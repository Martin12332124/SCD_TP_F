// src/utils/formato.js
// Funciones puras de formato para la interfaz. No dependen de React ni del backend,
// por eso se pueden reutilizar en cualquier vista y probar por separado.

/**
 * Formatea un monto como precio en pesos chilenos.
 * - Entrada: `precio` número entero (CLP no usa decimales).
 * - Salida: string con símbolo $ y punto de miles. Ej.: 8500 → "$8.500".
 * - Error: lanza TypeError si `precio` no es un número finito.
 * @param {number} precio
 * @returns {string}
 */
export const formatearPrecio = (precio) => {
  if (typeof precio !== 'number' || !Number.isFinite(precio)) {
    throw new TypeError(`formatearPrecio espera un número finito y recibió: ${precio}`);
  }
  return precio.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
};

/**
 * Formatea una cantidad de segundos como MM:SS.
 * - Entrada: `totSegundos` entero >= 0.
 * - Salida: string con minutos y segundos de 2 dígitos. Ej.: 61 → "01:01".
 *   Sobre 99 minutos los minutos crecen a 3 dígitos (6000 → "100:00").
 * @param {number} totSegundos
 * @returns {string}
 */
export const formatearTiempo = (totSegundos) => {
  const minutos = Math.floor(totSegundos / 60);
  const segundosRestantes = totSegundos % 60;
  return `${minutos.toString().padStart(2, '0')}:${segundosRestantes.toString().padStart(2, '0')}`;
};
