// src/utils/rechazo.js
// Texto con el que se muestra una acción rechazada ({ ok: false, tipo, error }).
// Los rechazos del dominio llevan su tipo entre corchetes (`⚠️ [PEDIDO_ACTIVO] ...`). Los de
// la conexión con el local (modo nube) ya son frases completas pensadas para el usuario del
// restaurante: el código entre corchetes solo estorbaría, así que se muestran tal cual.

export const TIPO_LOCAL_DESCONECTADO = 'LOCAL_DESCONECTADO';
export const TIPO_LOCAL_SIN_RESPUESTA = 'LOCAL_SIN_RESPUESTA';

const TIPOS_SIN_ETIQUETA = new Set([
  TIPO_LOCAL_DESCONECTADO,
  TIPO_LOCAL_SIN_RESPUESTA,
  'ORDEN_VENCIDA' // lo rechaza el servidor local con un motivo legible
]);

/** @param {{ tipo: string, error: string, esperado?: string }} r */
export const textoRechazo = (r) =>
  `⚠️ ${TIPOS_SIN_ETIQUETA.has(r.tipo) ? '' : `[${r.tipo}] `}${r.error}` +
  (r.esperado ? ` — Esperado: ${r.esperado}` : '');
