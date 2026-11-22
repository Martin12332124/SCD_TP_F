// src/utils/conexionLocal.js
// Modo nube: ¿está conectado el servidor del restaurante? Lo decide la hora de su última
// sincronización con Supabase. El local sube su estado al menos cada 30 s, así que si la
// última subida tiene menos de 75 s (dos periodos y medio) se considera conectado.
//
// Este criterio lo comparten dos piezas, para que nunca se contradigan:
//   - AvisoConexionLocal: la franja que informa el estado.
//   - nube.js: antes de enviar cualquier orden, rechaza el cambio si el local no está conectado.
// La hora de "ahora" es la del navegador; la de la última subida la puso la base de Supabase.

export const UMBRAL_CONEXION_MS = 75000;

/** true si `ultima` (texto ISO) es de hace menos de 75 s. null/undefined/ilegible → false. */
export const localConectado = (ultima, ahora = Date.now()) => {
  const hora = ultima ? new Date(ultima).getTime() : NaN;
  return Number.isFinite(hora) && ahora - hora < UMBRAL_CONEXION_MS;
};

/** "HH:MM" en la hora local del navegador. */
export const horaCorta = (iso) =>
  new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });

/** "HH:MM" de la última subida, o null si nunca hubo una (o la hora es ilegible). */
export const horaDeUltima = (ultima) =>
  Number.isFinite(ultima ? new Date(ultima).getTime() : NaN) ? horaCorta(ultima) : null;

/** " (desde las HH:MM)" si se conoce la última subida; "" si nunca hubo una. */
export const desdeLas = (ultima) => {
  const hora = horaDeUltima(ultima);
  return hora ? ` (desde las ${hora})` : '';
};

/** Motivo con el que se rechaza un cambio cuando el local está desconectado. */
export const mensajeLocalDesconectado = (ultima) =>
  `No se pudo hacer el cambio: el sistema del restaurante no está conectado${desdeLas(ultima)}. ` +
  'Inténtalo cuando vuelva a estar conectado.';

/** Motivo cuando la orden se envió pero el local no contestó dentro del tiempo de espera. */
export const MENSAJE_LOCAL_SIN_RESPUESTA =
  'El sistema del restaurante no respondió a tiempo. El cambio no se aplicó.';
