/**
 * Validador defensivo del número de mesa según el contrato de la operación:
 * - Precondición: Recibe una entrada externa `valor` (string, number, etc.).
 * - Validación defensiva: Rechaza valores vacíos, no numéricos, no enteros o menores/iguales a 0.
 * - Invariante: Una mesa válida debe tener estrictamente un identificador entero mayor a 0.
 * - Postcondición: Retorna { esValido: boolean, numero: number | null, mensajeError: string | null }.
 */
export const validarNumeroMesa = (valor) => {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return {
      esValido: false,
      numero: null,
      mensajeError: '⚠️ Por favor, ingresa un número de mesa válido (mayor a 0).'
    };
  }

  const str = String(valor).trim();
  const num = Number(str);

  if (isNaN(num)) {
    return {
      esValido: false,
      numero: null,
      mensajeError: '⚠️ El número de mesa debe ser un valor numérico.'
    };
  }

  if (!Number.isInteger(num)) {
    return {
      esValido: false,
      numero: null,
      mensajeError: '⚠️ El número de mesa debe ser un número entero.'
    };
  }

  if (num <= 0) {
    return {
      esValido: false,
      numero: null,
      mensajeError: '⚠️ El número de mesa debe ser mayor a 0.'
    };
  }

  // Comprobación interna del invariante (aserto interno)
  console.assert(
    Number.isInteger(num) && num > 0,
    'Invariante violada: el número de mesa validado debe ser un entero positivo'
  );

  return {
    esValido: true,
    numero: num,
    mensajeError: null
  };
};

/** Límites de cantidad por producto (US-13 CA2 y CA3). */
export const CANTIDAD_MINIMA = 1;
export const CANTIDAD_MAXIMA = 99;

/**
 * Validador defensivo de la cantidad de un producto en el pedido:
 * - Precondición: recibe una entrada externa `valor` (number, string, etc.).
 * - Validación defensiva: rechaza vacíos, no numéricos, decimales, negativos, 0 y mayores a 99.
 * - Invariante: una cantidad válida es un entero entre CANTIDAD_MINIMA y CANTIDAD_MAXIMA.
 * - Postcondición: retorna { esValido: boolean, cantidad: number | null, mensajeError: string | null }.
 */
export const validarCantidad = (valor) => {
  const mensajeError = `⚠️ La cantidad debe ser un número entero de ${CANTIDAD_MINIMA} a ${CANTIDAD_MAXIMA}.`;
  const invalido = { esValido: false, cantidad: null, mensajeError };

  if (valor === undefined || valor === null || String(valor).trim() === '') return invalido;

  const num = Number(String(valor).trim());
  if (!Number.isInteger(num) || num < CANTIDAD_MINIMA || num > CANTIDAD_MAXIMA) return invalido;

  return { esValido: true, cantidad: num, mensajeError: null };
};
