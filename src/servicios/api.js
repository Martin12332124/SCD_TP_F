// src/servicios/api.js
// Único punto de acceso al backend. Los componentes no llaman a fetch ni a Supabase
// directamente ni escriben la URL del servidor: todo pasa por aquí.
//
// Dos modos, elegidos con VITE_MODO (archivo .env o panel de Netlify):
// - local (por defecto): API REST y Socket.IO del servidor del restaurante (VITE_API_URL).
// - nube: réplica en Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY). Lee las
//   tablas espejo y convierte cada acción en una orden para el servidor local (ver nube.js).
// Las funciones exportadas tienen la misma firma y la misma forma de respuesta en ambos modos.
//
// Contrato común de las operaciones:
// - Entrada: número de mesa (entero) cuando la ruta lo necesita.
// - Salida: Promise con el cuerpo JSON que entrega el backend, tal cual
//   (por ejemplo { ok: true, mesas: [...] } o { ok: false, tipo, error }).
//   Un `ok: false` NO lanza error: cada vista decide qué mensaje mostrar.
// - Errores: la promesa se rechaza si falla la red (backend apagado, sin conexión).
//   obtenerMenu() además se rechaza si el servidor responde con un código HTTP de error.
// - API key (solo modo local): VITE_API_KEY viaja como cabecera x-api-key en TODA petición al
//   servidor, también el login, y en el handshake de Socket.IO. Identifica a la aplicación
//   ante el API gateway del servidor local (ver docs/api-gateway.md en el repo backend). En
//   el navegador es visible para cualquiera: la seguridad del usuario la da el JWT. En modo
//   nube no se usa: el gateway es el de Supabase (cabecera apikey, que ya pone supabase-js).
// - Sesión: todo, salvo iniciarSesion, exige sesión. En modo local el token (JWT) se guarda
//   en localStorage y viaja en la cabecera Authorization y en el handshake de Socket.IO;
//   en modo nube la sesión la guarda y renueva supabase-js. Un 401 (o la sesión perdida
//   en la nube) avisa a quien se registró con alPerderSesion: la pantalla vuelve al login.

import { io } from 'socket.io-client';
import { createClient } from '@supabase/supabase-js';
import { crearApiNube, crearConexionNube } from './nube.js';
import { crearApiPedidos } from '../modules/pedidos/pedidos.api.js';

/** URL del backend. Se configura con VITE_API_URL (archivo .env); por defecto, el backend local. */
export const API_URL = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000';

/** 'nube' solo si VITE_MODO lo dice explícitamente; cualquier otro valor es 'local'. */
export const MODO = import.meta.env?.VITE_MODO === 'nube' ? 'nube' : 'local';

/**
 * Cliente de Supabase del modo nube, creado una sola vez y solo en ese modo.
 * Usa la llave publishable: es pública por diseño; lo que protege los datos son los
 * GRANT y las políticas RLS de supabase/esquema.sql (repo backend).
 */
function crearClienteNube() {
  const url = import.meta.env?.VITE_SUPABASE_URL;
  const llave = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !llave) {
    throw new Error('Modo nube: faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY.');
  }
  return createClient(url, llave);
}

/** Llave de esta aplicación ante el gateway del servidor local ('' = no se envía cabecera). */
// Bajo Vite viene de import.meta.env; ejecutado con Node a secas (scripts/probar-api.mjs) no
// existe import.meta.env y se lee de process.env. En el navegador esa segunda rama no existe.
const API_KEY =
  MODO === 'local'
    ? import.meta.env?.VITE_API_KEY || globalThis.process?.env?.VITE_API_KEY || ''
    : '';

/** Valor de `tipo` con que el gateway rechaza una llave ausente o inválida (HTTP 401). */
export const API_KEY_INVALIDA = 'API_KEY_INVALIDA';

const supabase = MODO === 'nube' ? crearClienteNube() : null;
const nube = supabase ? crearApiNube(supabase) : null;

// ── Sesión del modo local ────────────────────────────────────────────────────

/** Clave de localStorage con { token, usuario } del modo local. */
export const CLAVE_SESION = 'comanda.sesion';

/** Mensaje que el servidor envía en connect_error cuando el socket no trae token válido. */
export const SOCKET_NO_AUTORIZADO = 'NO_AUTORIZADO';

// localStorage puede no estar disponible (modo privado estricto): sin él, la sesión dura
// solo mientras la pestaña esté abierta, pero la app funciona.
let sesionEnMemoria = null;
function leerSesionLocal() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION)) ?? sesionEnMemoria;
  } catch {
    return sesionEnMemoria;
  }
}
function guardarSesionLocal(sesion) {
  sesionEnMemoria = sesion;
  try {
    if (sesion) localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    else localStorage.removeItem(CLAVE_SESION);
  } catch {
    // sin localStorage: queda solo en memoria
  }
}

let alPerder = null;
/** El token ya no sirve (401): se borra y se avisa para volver al login. */
function sesionPerdida() {
  guardarSesionLocal(null);
  if (alPerder) alPerder();
}

/**
 * Registra qué hacer cuando la sesión deja de ser válida (token vencido, 401, sesión de
 * Supabase cerrada). Devuelve la función para dejar de escuchar.
 * @param {() => void} fn
 */
export function alPerderSesion(fn) {
  alPerder = fn;
  const dejarNube = nube ? nube.alPerderSesion(fn) : null;
  return () => {
    if (alPerder === fn) alPerder = null;
    if (dejarNube) dejarNube();
  };
}

/**
 * Inicia sesión con el servidor local (POST /api/auth/login) o con Supabase Auth.
 * @param {string} usuario
 * @param {string} contrasena
 * @returns {Promise<{ ok: true, usuario: string } | { ok: false, tipo: string, error: string }>}
 */
export async function iniciarSesion(usuario, contrasena) {
  if (nube) return nube.iniciarSesion(usuario, contrasena);
  let res;
  try {
    res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: conLlave({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ usuario, contrasena })
    });
  } catch {
    return {
      ok: false,
      tipo: 'SIN_CONEXION',
      error: 'No se pudo contactar el servidor del restaurante.'
    };
  }
  const datos = await res.json();
  if (!datos.ok) return datos;
  guardarSesionLocal({ token: datos.token, usuario: datos.usuario });
  return { ok: true, usuario: datos.usuario };
}

/** Sesión guardada de una visita anterior: { usuario } o null. */
export async function obtenerSesion() {
  if (nube) return nube.obtenerSesion();
  const sesion = leerSesionLocal();
  return sesion?.token ? { usuario: sesion.usuario } : null;
}

export async function cerrarSesion() {
  if (nube) return nube.cerrarSesion();
  guardarSesionLocal(null);
}

/**
 * Conexión en tiempo real con interfaz de socket (on, off, emit, disconnect).
 * En modo local es el socket de Socket.IO, que envía el token al conectarse; en modo
 * nube, Supabase Realtime con los mismos nombres de eventos. Se crea después del login.
 */
export const conectarTiempoReal = () =>
  nube
    ? crearConexionNube(supabase, nube)
    : io(API_URL, { auth: { token: leerSesionLocal()?.token, apiKey: API_KEY || undefined } });

/** Agrega x-api-key a unas cabeceras, si hay llave configurada. */
function conLlave(headers = {}) {
  return API_KEY ? { ...headers, 'x-api-key': API_KEY } : headers;
}

/**
 * Agrega x-api-key (si hay llave) y Authorization (si hay token) a las opciones de fetch.
 * Sin ninguna de las dos la petición sale igual que antes.
 */
function conCredenciales(opciones) {
  const token = leerSesionLocal()?.token;
  if (!token && !API_KEY) return opciones;
  return {
    ...opciones,
    headers: conLlave({
      ...(opciones?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    })
  };
}

/**
 * Un 401 con tipo API_KEY_INVALIDA es un problema de configuración de la aplicación
 * (VITE_API_KEY mal puesta o rotada), no de la sesión: cerrar la sesión no lo arregla.
 */
function esSesionPerdida(status, cuerpo) {
  return status === 401 && cuerpo?.tipo !== API_KEY_INVALIDA;
}

async function pedirJson(ruta, opcionesBase) {
  const opciones = conCredenciales(opcionesBase);
  const res = opciones
    ? await fetch(`${API_URL}${ruta}`, opciones)
    : await fetch(`${API_URL}${ruta}`);
  const cuerpo = await res.json();
  if (esSesionPerdida(res.status, cuerpo)) sesionPerdida();
  return cuerpo;
}

const apiPedidos = crearApiPedidos({ pedirJson, nube });

/**
 * Lista todas las mesas con su estado. `estadoPedido` es el estado del pedido vigente de la mesa
 * ("Recibido 📝", "En Cocina 🍳", "Listo 🍽️") o null; puede faltar si el backend es anterior.
 * @returns {Promise<{ ok: boolean, mesas?: Array<{ id: string, numero: number, estado: string, estadoPedido?: string|null }> }>}
 */
export const obtenerMesas = () => (nube ? nube.obtenerMesas() : pedirJson('/api/mesas'));

/**
 * Resumen del pedido de una mesa: ítems, total y estado.
 * @param {number} numero
 * @returns {Promise<{ ok: boolean, items?: Array, total?: number, estado?: string, tipo?: string, error?: string }>}
 */
export const obtenerPedidoMesa = (numero) =>
  apiPedidos.obtenerResumen(numero);

/**
 * Marca una mesa libre como ocupada.
 * @param {number} numero
 * @returns {Promise<{ ok: boolean, tipo?: string, error?: string }>}
 */
export const abrirMesa = (numero) =>
  nube ? nube.abrirMesa(numero) : pedirJson(`/api/mesas/${numero}/abrir`, { method: 'POST' });

/**
 * Libera una mesa ocupada. El backend la rechaza (tipo PEDIDO_ACTIVO) si tiene un pedido vigente.
 * @param {number} numero
 * @returns {Promise<{ ok: boolean, tipo?: string, error?: string }>}
 */
export const cerrarMesa = (numero) =>
  nube ? nube.cerrarMesa(numero) : pedirJson(`/api/mesas/${numero}/cerrar`, { method: 'POST' });

/**
 * Agrega una mesa libre. Sin `numero` se crea la siguiente a la más alta que exista.
 * El backend la rechaza si el número no es un entero de 1 a 99 (tipo ENTRADA_INVALIDA)
 * o si ya existe (tipo DUPLICADO).
 * @param {number} [numero]
 * @returns {Promise<{ ok: boolean, mesa?: { id: string, numero: number, estado: string }, tipo?: string, error?: string }>}
 */
export const agregarMesa = (numero) =>
  nube
    ? nube.agregarMesa(numero)
    : pedirJson('/api/mesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(numero === undefined ? {} : { numero })
      });

/**
 * Quita una mesa. El backend la rechaza si está ocupada (tipo ESTADO_NO_PERMITIDO),
 * si tiene un pedido vigente (tipo PEDIDO_ACTIVO) o si es la última mesa.
 * @param {number} numero
 * @returns {Promise<{ ok: boolean, mesa?: string, tipo?: string, error?: string }>}
 */
export const quitarMesa = (numero) =>
  nube ? nube.quitarMesa(numero) : pedirJson(`/api/mesas/${numero}`, { method: 'DELETE' });

/**
 * Carta del restaurante.
 * Se rechaza con Error("Error del servidor: <código>") si la respuesta HTTP no es 2xx.
 * @returns {Promise<{ ok: boolean, items?: Array<{ id: number, nombre: string, precioBase: number, disponible: boolean }> }>}
 */
export const obtenerMenu = async () => {
  if (nube) return nube.obtenerMenu();
  const opciones = conCredenciales();
  const res = opciones
    ? await fetch(`${API_URL}/api/menu-items`, opciones)
    : await fetch(`${API_URL}/api/menu-items`);
  if (res.status === 401) {
    const cuerpo = await res.json().catch(() => null);
    if (esSesionPerdida(res.status, cuerpo)) sesionPerdida();
  }
  if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
  return res.json();
};
