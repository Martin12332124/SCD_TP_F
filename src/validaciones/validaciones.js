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

/** Número de mesa más alto que acepta el backend al agregar una mesa. */
export const NUMERO_MESA_MAXIMO = 99;

/**
 * Validador defensivo: el número es válido y corresponde a una mesa que existe.
 * La cantidad de mesas es configurable, así que "entero mayor a 0" ya no alcanza:
 * la mesa tiene que estar en la lista que envió el backend.
 * - Precondición: `valor` es una entrada externa; `mesas` es la lista [{ numero, ... }].
 * - Postcondición: igual que validarNumeroMesa; agrega el rechazo "La mesa N no existe.".
 */
export const validarMesaExistente = (valor, mesas) => {
  const base = validarNumeroMesa(valor);
  if (!base.esValido) return base;

  const existe = Array.isArray(mesas) && mesas.some((m) => m.numero === base.numero);
  if (!existe) {
    return {
      esValido: false,
      numero: null,
      mensajeError: `⚠️ La mesa ${base.numero} no existe.`
    };
  }

  return base;
};

/**
 * Validador defensivo del traslado de un pedido (US-05), antes de enviarlo al backend:
 * - origen y destino son números de mesa válidos (mismas reglas que validarNumeroMesa),
 * - son mesas distintas,
 * - y las dos existen.
 * Que el origen tenga pedido y el destino esté libre lo valida el backend.
 * - Postcondición: retorna { esValido, origen: number|null, destino: number|null, mensajeError }.
 */
export const validarTraslado = (origen, destino, mesas) => {
  const invalido = (mensajeError) => ({
    esValido: false,
    origen: null,
    destino: null,
    mensajeError
  });

  const resOrigen = validarNumeroMesa(origen);
  if (!resOrigen.esValido) return invalido(resOrigen.mensajeError);

  const resDestino = validarNumeroMesa(destino);
  if (!resDestino.esValido) return invalido(resDestino.mensajeError);

  if (resOrigen.numero === resDestino.numero) {
    return invalido('⚠️ [ENTRADA_INVALIDA] origen y destino deben ser mesas distintas.');
  }

  for (const numero of [resOrigen.numero, resDestino.numero]) {
    const existe = validarMesaExistente(numero, mesas);
    if (!existe.esValido) return invalido(existe.mensajeError);
  }

  return {
    esValido: true,
    origen: resOrigen.numero,
    destino: resDestino.numero,
    mensajeError: null
  };
};

/**
 * Validador defensivo del número de una mesa NUEVA (pantalla "Configurar mesas"):
 * mismas reglas que validarNumeroMesa, más el máximo permitido y que no exista ya.
 * - Postcondición: retorna { esValido, numero: number|null, mensajeError }.
 */
export const validarNumeroMesaNueva = (valor, mesas) => {
  const base = validarNumeroMesa(valor);
  if (!base.esValido) return base;

  if (base.numero > NUMERO_MESA_MAXIMO) {
    return {
      esValido: false,
      numero: null,
      mensajeError: `⚠️ El número de mesa no puede ser mayor a ${NUMERO_MESA_MAXIMO}.`
    };
  }

  if (Array.isArray(mesas) && mesas.some((m) => m.numero === base.numero)) {
    return {
      esValido: false,
      numero: null,
      mensajeError: `⚠️ La mesa ${base.numero} ya existe.`
    };
  }

  return base;
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
