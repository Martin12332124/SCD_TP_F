// src/servicios/api.js
// Único punto de acceso REST al backend. Los componentes no llaman a fetch directamente
// ni escriben la URL del servidor: la toman de aquí.
//
// Contrato común de las operaciones:
// - Entrada: número de mesa (entero) cuando la ruta lo necesita.
// - Salida: Promise con el cuerpo JSON que entrega el backend, tal cual
//   (por ejemplo { ok: true, mesas: [...] } o { ok: false, tipo, error }).
//   Un `ok: false` NO lanza error: cada vista decide qué mensaje mostrar.
// - Errores: la promesa se rechaza si falla la red (backend apagado, sin conexión).
//   obtenerMenu() además se rechaza si el servidor responde con un código HTTP de error.

/** URL del backend. Se configura con VITE_API_URL (archivo .env); por defecto, el backend local. */
export const API_URL = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000';

async function pedirJson(ruta, opciones) {
  const res = opciones
    ? await fetch(`${API_URL}${ruta}`, opciones)
    : await fetch(`${API_URL}${ruta}`);
  return res.json();
}

/**
 * Lista todas las mesas con su estado.
 * @returns {Promise<{ ok: boolean, mesas?: Array<{ id: string, numero: number, estado: string }> }>}
 */
export const obtenerMesas = () => pedirJson('/api/mesas');

/**
 * Resumen del pedido de una mesa: ítems, total y estado.
 * @param {number} numero
 * @returns {Promise<{ ok: boolean, items?: Array, total?: number, estado?: string, tipo?: string, error?: string }>}
 */
export const obtenerPedidoMesa = (numero) => pedirJson(`/api/mesas/${numero}/pedido`);

/**
 * Marca una mesa libre como ocupada.
 * @param {number} numero
 * @returns {Promise<{ ok: boolean, tipo?: string, error?: string }>}
 */
export const abrirMesa = (numero) => pedirJson(`/api/mesas/${numero}/abrir`, { method: 'POST' });

/**
 * Libera una mesa ocupada. El backend la rechaza (tipo PEDIDO_ACTIVO) si tiene un pedido vigente.
 * @param {number} numero
 * @returns {Promise<{ ok: boolean, tipo?: string, error?: string }>}
 */
export const cerrarMesa = (numero) => pedirJson(`/api/mesas/${numero}/cerrar`, { method: 'POST' });

/**
 * Carta del restaurante.
 * Se rechaza con Error("Error del servidor: <código>") si la respuesta HTTP no es 2xx.
 * @returns {Promise<{ ok: boolean, items?: Array<{ id: number, nombre: string, precioBase: number, disponible: boolean }> }>}
 */
export const obtenerMenu = async () => {
  const res = await fetch(`${API_URL}/api/menu-items`);
  if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
  return res.json();
};
