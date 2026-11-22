// src/utils/ordenPendiente.js
// Modo nube: una acción puede volver "pendiente" (`pendiente: true`): la orden quedó en el
// buzón porque el servidor del restaurante no respondió a tiempo. No es un éxito ni un
// error, así que se muestra con un mensaje neutral y su propio tono.

export const MENSAJE_ORDEN_PENDIENTE =
  'Orden enviada. Se aplicará cuando el sistema del restaurante se conecte.';

/** true si la respuesta de una acción es "orden en espera" (solo ocurre en modo nube). */
export const esPendiente = (respuesta) => respuesta?.ok === true && respuesta.pendiente === true;
