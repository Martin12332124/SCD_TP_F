// src/servicios/nube.js
// Adaptador del modo nube (VITE_MODO=nube): misma forma que la API REST y que el socket
// del servidor local, pero sobre Supabase. Solo lo usa api.js; los componentes no lo ven.
//
// Regla del sistema híbrido: el servidor local es la autoridad.
//   - Leer: de las tablas espejo que el local mantiene en Supabase.
//   - Escribir: nunca directo. Cada acción se deja como una orden en `ordenes_pendientes`;
//     el local la aplica con sus reglas y el cambio vuelve por Realtime a las tablas espejo.
//   Nada queda en cola: una orden aplicada horas después genera conflictos. Por eso:
//     1. Antes de insertar, se mira si el local está conectado (misma regla del aviso: última
//        sincronización de hace menos de 75 s). Si no, no se inserta nada y se responde
//        { ok: false, tipo: 'LOCAL_DESCONECTADO' } con el motivo para el usuario.
//     2. Si se insertó, se espera hasta ESPERA_RESULTADO_MS el resultado del local (aplicada o
//        rechazada) y se devuelve SU respuesta, igual que en modo local. Si no llega, se
//        responde { ok: false, tipo: 'LOCAL_SIN_RESPUESTA' }: "no se aplicó".
//   Esa frase es verdad porque el servidor local rechaza (ORDEN_VENCIDA) toda orden que lleve
//   más de VENCIMIENTO_ORDEN_MS en el buzón (SCD_TP_B/src/presentacion/ordenes-nube.js), y
//   ese plazo es menor que la espera de aquí.
//
// Sesión: Supabase Auth. El formulario pide "usuario"; aquí se convierte en el correo
// "usuario@sistema.local", que es como se crean los usuarios en el panel de Supabase.

import {
  localConectado,
  mensajeLocalDesconectado,
  MENSAJE_LOCAL_SIN_RESPUESTA
} from '../utils/conexionLocal';
import { TIPO_LOCAL_DESCONECTADO, TIPO_LOCAL_SIN_RESPUESTA } from '../utils/rechazo';

/** Agrupa avisos seguidos: una subida del local cambia varias tablas a la vez. */
const ESPERA_RECARGA_MS = 150;

const SIN_CONEXION = 'SIN_CONEXION';

/** Dominio ficticio de los correos de Supabase Auth: "ana" → "ana@sistema.local". */
export const DOMINIO_USUARIOS = 'sistema.local';

/**
 * Cuánto se espera la respuesta del local a una orden, y cada cuánto se pregunta.
 * INVARIANTE con el backend: VENCIMIENTO_ORDEN_MS (10 s, SCD_TP_B/src/presentacion/
 * ordenes-nube.js) debe ser MENOR que ESPERA_RESULTADO_MS, con margen. Si el local solo aplica
 * órdenes de menos de 10 s y la web espera 15 s, cuando la web dice "no se aplicó" el local ya
 * no puede aplicarla. Si cambias uno de los dos, cambia el otro.
 */
export const ESPERA_RESULTADO_MS = 15000;
const INTERVALO_RESULTADO_MS = 1000;

/** "  Ana " → "ana@sistema.local". Misma normalización que el backend (usuario.service.js). */
export const correoDeUsuario = (usuario) =>
  `${String(usuario ?? '')
    .trim()
    .toLowerCase()}@${DOMINIO_USUARIOS}`;

/** "ana@sistema.local" → "ana" (para mostrar en el encabezado). */
const usuarioDeCorreo = (correo) => String(correo ?? '').split('@')[0];

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Lee las mesas con el estado de su pedido, con la misma forma que GET /api/mesas
 * (campos estadoPedido y pedidoDesde que agrega MesasConEstadoPedido en el backend).
 */
async function leerMesas(supabase) {
  const [mesas, pedidos] = await Promise.all([
    supabase.from('mesas').select('id, numero, estado').order('numero'),
    supabase.from('pedidos').select('mesa_id, estado, estado_desde')
  ]);
  const error = mesas.error || pedidos.error;
  if (error) return { ok: false, tipo: SIN_CONEXION, error: error.message };

  const porMesa = new Map(pedidos.data.map((p) => [p.mesa_id, p]));
  return {
    ok: true,
    mesas: mesas.data.map((m) => {
      const pedido = porMesa.get(m.id);
      return {
        ...m,
        estadoPedido: pedido ? pedido.estado : null,
        pedidoDesde: (pedido && pedido.estado_desde) || null
      };
    })
  };
}

/**
 * Crea las operaciones del modo nube sobre un cliente de Supabase ya creado.
 * @param {object} supabase - Cliente de @supabase/supabase-js (o un doble en los tests)
 * @param {object} [opciones]
 * @param {number} [opciones.esperaMaximaMs=8000] - cuánto esperar el resultado de una orden
 * @param {number} [opciones.intervaloMs=1000] - cada cuánto consultarlo
 */
export function crearApiNube(
  supabase,
  { esperaMaximaMs = ESPERA_RESULTADO_MS, intervaloMs = INTERVALO_RESULTADO_MS } = {}
) {
  /**
   * Hora de la última subida exitosa del local (fila única de estado_sincronizacion).
   * `ultima` es un texto ISO, o null si el local nunca ha sincronizado.
   */
  async function leerUltimaSincronizacion() {
    const { data, error } = await supabase
      .from('estado_sincronizacion')
      .select('ultima_sincronizacion')
      .maybeSingle();
    if (error) return { ok: false, tipo: SIN_CONEXION, error: error.message };
    return { ok: true, ultima: data?.ultima_sincronizacion ?? null };
  }

  /**
   * Espera a que el local procese la orden. Devuelve el resultado del servicio de dominio
   * (aplicada o rechazada), o null si no llegó dentro de la espera máxima.
   *
   * Un fallo al consultar NO termina la espera: puede ser un tropiezo de red de un segundo y
   * el local quizá aplique la orden un instante después. Declarar "no se aplicó" antes del
   * plazo sería falso. Si hasta la última consulta falla, no se puede saber qué pasó: se
   * devuelve `sinVerificar` y el que llama no afirma que "no se aplicó".
   */
  async function esperarResultado(id) {
    let ultimaFallo = false;
    for (let esperado = 0; esperado < esperaMaximaMs; esperado += intervaloMs) {
      await esperar(intervaloMs);
      const { data, error } = await supabase
        .from('ordenes_pendientes')
        .select('estado, resultado')
        .eq('id', id)
        .maybeSingle();
      ultimaFallo = Boolean(error) || !data;
      if (ultimaFallo) continue;
      if (data.estado !== 'pendiente') {
        return { resultado: data.resultado ?? { ok: data.estado === 'aplicada' } };
      }
    }
    return { resultado: null, sinVerificar: ultimaFallo };
  }

  /**
   * Envía una orden al local y espera su respuesta. Nunca deja una orden "en cola":
   *   - local desconectado → no inserta nada (LOCAL_DESCONECTADO);
   *   - sin respuesta a tiempo → LOCAL_SIN_RESPUESTA ("el cambio no se aplicó");
   *   - respuesta del local → esa misma respuesta (aplicada o rechazada con su motivo).
   * Es el único punto por el que pasan todas las acciones que escriben (ver el inicio del
   * archivo).
   */
  async function enviarOrden(tipo, payload) {
    // Lectura fresca en cada acción (no el estado de la pantalla, que puede estar viejo).
    const conexion = await leerUltimaSincronizacion();
    if (!conexion.ok) {
      return {
        ok: false,
        tipo: SIN_CONEXION,
        error: `No se pudo comprobar la conexión con el sistema del restaurante: ${conexion.error}`
      };
    }
    if (!localConectado(conexion.ultima)) {
      return {
        ok: false,
        tipo: TIPO_LOCAL_DESCONECTADO,
        error: mensajeLocalDesconectado(conexion.ultima)
      };
    }

    // Solo tipo y payload: el resto lo pone la base (permiso por columna en esquema.sql).
    const { data, error } = await supabase
      .from('ordenes_pendientes')
      .insert({ tipo, payload })
      .select('id')
      .single();
    if (error) {
      return {
        ok: false,
        tipo: SIN_CONEXION,
        error: `No se pudo enviar la orden a la nube: ${error.message}`
      };
    }
    const { resultado, sinVerificar } = await esperarResultado(data.id);
    if (resultado) return resultado;
    if (sinVerificar) {
      return {
        ok: false,
        tipo: SIN_CONEXION,
        error:
          'No se pudo confirmar si el cambio se aplicó porque se perdió la conexión con la nube. ' +
          'Revisa el estado de la mesa antes de repetirlo.'
      };
    }
    return { ok: false, tipo: TIPO_LOCAL_SIN_RESPUESTA, error: MENSAJE_LOCAL_SIN_RESPUESTA };
  }

  const api = {
    obtenerMesas: () => leerMesas(supabase),

    /** Misma forma que GET /api/mesas/:numero/pedido. */
    async obtenerPedidoMesa(numero) {
      const mesa = `Mesa ${numero}`;
      const [pedido, items] = await Promise.all([
        supabase.from('pedidos').select('estado').eq('mesa_id', mesa).maybeSingle(),
        supabase
          .from('pedido_items')
          .select('item_id, nombre, precio_base, cantidad')
          .eq('mesa_id', mesa)
          .order('posicion')
      ]);
      const error = pedido.error || items.error;
      if (error) return { ok: false, tipo: SIN_CONEXION, error: error.message };

      const lista = items.data.map((i) => ({
        id: i.item_id,
        nombre: i.nombre,
        precioBase: i.precio_base,
        cantidad: i.cantidad
      }));
      return {
        ok: true,
        mesa,
        estado: pedido.data ? pedido.data.estado : null,
        items: lista,
        total: lista.reduce((suma, i) => suma + i.precioBase * i.cantidad, 0)
      };
    },

    /** Misma forma que GET /api/menu-items; se rechaza si falla, igual que en modo local. */
    async obtenerMenu() {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, nombre, precio_base, disponible')
        .order('id');
      if (error) throw new Error(`Error de la nube: ${error.message}`);
      return {
        ok: true,
        items: data.map((i) => ({
          id: i.id,
          nombre: i.nombre,
          precioBase: i.precio_base,
          disponible: i.disponible
        }))
      };
    },

    obtenerUltimaSincronizacion: leerUltimaSincronizacion,

    abrirMesa: (numero) => enviarOrden('abrir_mesa', { numero }),
    cerrarMesa: (numero) => enviarOrden('cerrar_mesa', { numero }),
    quitarMesa: (numero) => enviarOrden('quitar_mesa', { numero }),

    /**
     * Sin número, el local elegiría "la siguiente a la más alta". Aquí se calcula con el
     * espejo y se envía explícito (el local responde con la mesa creada).
     */
    async agregarMesa(numero) {
      let elegido = numero;
      if (elegido === undefined) {
        const actuales = await leerMesas(supabase);
        if (!actuales.ok) return actuales;
        elegido = Math.max(0, ...actuales.mesas.map((m) => m.numero)) + 1;
      }
      return enviarOrden('agregar_mesa', { numero: elegido });
    },

    enviarOrden,

    // ── Sesión (Supabase Auth). supabase-js guarda la sesión en localStorage y la renueva
    //    sola: aquí no se copia el token a ningún otro lado. ──

    /** @returns {Promise<{ ok: true, usuario: string } | { ok: false, tipo: string, error: string }>} */
    async iniciarSesion(usuario, contrasena) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: correoDeUsuario(usuario),
        password: contrasena
      });
      if (error?.code === 'email_not_confirmed') {
        return {
          ok: false,
          tipo: 'CREDENCIALES_INVALIDAS',
          error: 'El usuario no está confirmado en Supabase (marcar "Auto Confirm User").'
        };
      }
      if (error) {
        // 400 = credenciales incorrectas; sin status = falló la red.
        return error.status === 400
          ? {
              ok: false,
              tipo: 'CREDENCIALES_INVALIDAS',
              error: 'Usuario o contraseña incorrectos.'
            }
          : {
              ok: false,
              tipo: SIN_CONEXION,
              error: `No se pudo contactar la nube: ${error.message}`
            };
      }
      return { ok: true, usuario: usuarioDeCorreo(data.user.email) };
    },

    /** Sesión guardada (de una visita anterior) o null. */
    async obtenerSesion() {
      const { data } = await supabase.auth.getSession();
      const correo = data?.session?.user?.email;
      return correo ? { usuario: usuarioDeCorreo(correo) } : null;
    },

    async cerrarSesion() {
      await supabase.auth.signOut();
    },

    /**
     * Avisa cuando Supabase da la sesión por terminada (no se pudo renovar, o se cerró en
     * otra pestaña). Devuelve la función para dejar de escuchar.
     */
    alPerderSesion(fn) {
      const { data } = supabase.auth.onAuthStateChange((evento) => {
        if (evento === 'SIGNED_OUT') fn();
      });
      return () => data.subscription.unsubscribe();
    }
  };
  return api;
}

/**
 * Conexión en tiempo real del modo nube con la misma interfaz que un socket de socket.io
 * (on, off, emit) y los mismos eventos, para que App y TomaPedido no cambien:
 *   - 'connect' / 'disconnect': estado del canal de Supabase Realtime.
 *   - 'estado_mesas': mesas con su pedido, al conectar y cada vez que cambia el espejo.
 *   - 'pedido_items_actualizado': cambió algún pedido o sus ítems.
 *   - 'estado_sincronizacion': hora (ISO o null) de la última sincronización del local,
 *     al conectar y cada vez que el local la actualiza.
 *   - emit('confirmar_pedido' | 'actualizar_pedido' | 'trasladar_pedido') → orden en el buzón,
 *     respondida por 'respuesta_pedido' o 'respuesta_traslado'.
 *
 * @param {object} supabase
 * @param {ReturnType<typeof crearApiNube>} api
 */
export function crearConexionNube(supabase, api) {
  const escuchas = {};
  const avisar = (evento, datos) => (escuchas[evento] || []).slice().forEach((fn) => fn(datos));

  let espera = null;
  const recargarMesas = () => {
    clearTimeout(espera);
    espera = setTimeout(async () => {
      const r = await api.obtenerMesas();
      if (r.ok) avisar('estado_mesas', r.mesas);
    }, ESPERA_RECARGA_MS);
  };
  const recargarSincronizacion = async () => {
    const r = await api.obtenerUltimaSincronizacion();
    if (r.ok) avisar('estado_sincronizacion', r.ultima);
  };
  const cambioDePedido = () => {
    avisar('pedido_items_actualizado', {});
    recargarMesas();
  };

  const canal = supabase
    .channel('espejo-restaurante')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, recargarMesas)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, cambioDePedido)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, cambioDePedido)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'estado_sincronizacion' },
      recargarSincronizacion
    )
    .subscribe((estado) => {
      if (estado === 'SUBSCRIBED') {
        avisar('connect');
        recargarSincronizacion();
        recargarMesas(); // igual que el backend: al conectar se envía el estado de las mesas
      } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') {
        avisar('disconnect');
      }
    });

  /** Acciones que en modo local van por Socket.IO, traducidas a órdenes. */
  const ACCIONES = {
    confirmar_pedido: {
      respuesta: 'respuesta_pedido',
      enviar: (d) => api.enviarOrden('confirmar_pedido', d)
    },
    actualizar_pedido: {
      respuesta: 'respuesta_pedido',
      enviar: (d) => api.enviarOrden('actualizar_estado', d)
    },
    trasladar_pedido: {
      respuesta: 'respuesta_traslado',
      enviar: (d) => api.enviarOrden('trasladar_pedido', d)
    }
  };

  return {
    /** Distingue esta conexión de Socket.IO: solo en modo nube existe el aviso del local. */
    modo: 'nube',
    on(evento, fn) {
      escuchas[evento] = [...(escuchas[evento] || []), fn];
    },
    off(evento, fn) {
      if (!fn) delete escuchas[evento];
      else escuchas[evento] = (escuchas[evento] || []).filter((f) => f !== fn);
    },
    async emit(evento, datos) {
      const accion = ACCIONES[evento];
      if (!accion) return;
      // La respuesta (del local, o el rechazo por desconexión o falta de respuesta) se
      // reenvía tal cual, con la misma forma que en modo local.
      avisar(accion.respuesta, await accion.enviar(datos));
    },
    /** Deja de escuchar. Mismo nombre que en socket.io, para cerrar ambas igual al salir. */
    disconnect() {
      clearTimeout(espera);
      supabase.removeChannel(canal);
    }
  };
}
