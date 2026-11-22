// src/servicios/nube.js
// Adaptador del modo nube (VITE_MODO=nube): misma forma que la API REST y que el socket
// del servidor local, pero sobre Supabase. Solo lo usa api.js; los componentes no lo ven.
//
// Regla del sistema híbrido: el servidor local es la autoridad.
//   - Leer: de las tablas espejo que el local mantiene en Supabase.
//   - Escribir: nunca directo. Cada acción se deja como una orden en `ordenes_pendientes`;
//     el local la aplica con sus reglas y el cambio vuelve por Realtime a las tablas espejo.
//   Después de enviar una orden se espera unos segundos su resultado: si el local la aplica
//   o la rechaza, se devuelve SU respuesta (la misma forma que en modo local). Si el local
//   no responde a tiempo (por ejemplo, está sin internet), se responde ok con
//   `pendiente: true`: la orden quedó en cola y se aplicará cuando el local vuelva.
//   No se responde error en ese caso, para que nadie la reenvíe y quede duplicada.
//
// Sesión: Supabase Auth. El formulario pide "usuario"; aquí se convierte en el correo
// "usuario@sistema.local", que es como se crean los usuarios en el panel de Supabase.

/** Agrupa avisos seguidos: una subida del local cambia varias tablas a la vez. */
const ESPERA_RECARGA_MS = 150;

const SIN_CONEXION = 'SIN_CONEXION';

/** Dominio ficticio de los correos de Supabase Auth: "ana" → "ana@sistema.local". */
export const DOMINIO_USUARIOS = 'sistema.local';

/** Cuánto se espera la respuesta del local a una orden, y cada cuánto se pregunta. */
const ESPERA_RESULTADO_MS = 8000;
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
   * Espera a que el local procese la orden. Devuelve el resultado del servicio de dominio
   * (aplicada o rechazada) o null si no llegó a tiempo.
   */
  async function esperarResultado(id) {
    for (let esperado = 0; esperado < esperaMaximaMs; esperado += intervaloMs) {
      await esperar(intervaloMs);
      const { data, error } = await supabase
        .from('ordenes_pendientes')
        .select('estado, resultado')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) return null;
      if (data.estado !== 'pendiente') {
        return data.resultado ?? { ok: data.estado === 'aplicada' };
      }
    }
    return null;
  }

  /**
   * Deja una orden en el buzón (solo tipo y payload: el resto lo pone la base) y espera
   * la respuesta del local. Ver el comentario del inicio del archivo.
   */
  async function enviarOrden(tipo, payload) {
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
    const resultado = await esperarResultado(data.id);
    return resultado ?? { ok: true, pendiente: true };
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

    /**
     * Hora de la última subida exitosa del local (fila única de estado_sincronizacion).
     * `ultima` es un texto ISO, o null si el local nunca ha sincronizado.
     */
    async obtenerUltimaSincronizacion() {
      const { data, error } = await supabase
        .from('estado_sincronizacion')
        .select('ultima_sincronizacion')
        .maybeSingle();
      if (error) return { ok: false, tipo: SIN_CONEXION, error: error.message };
      return { ok: true, ultima: data?.ultima_sincronizacion ?? null };
    },

    abrirMesa: (numero) => enviarOrden('abrir_mesa', { numero }),
    cerrarMesa: (numero) => enviarOrden('cerrar_mesa', { numero }),
    async quitarMesa(numero) {
      const r = await enviarOrden('quitar_mesa', { numero });
      return r.pendiente ? { ...r, mesa: `Mesa ${numero}` } : r;
    },

    /**
     * Sin número, el local elegiría "la siguiente a la más alta". Aquí se calcula con el
     * espejo y se envía explícito, para poder responder qué mesa se pidió agregar.
     */
    async agregarMesa(numero) {
      let elegido = numero;
      if (elegido === undefined) {
        const actuales = await leerMesas(supabase);
        if (!actuales.ok) return actuales;
        elegido = Math.max(0, ...actuales.mesas.map((m) => m.numero)) + 1;
      }
      const resultado = await enviarOrden('agregar_mesa', { numero: elegido });
      if (!resultado.pendiente) return resultado;
      return { ...resultado, mesa: { id: `Mesa ${elegido}`, numero: elegido, estado: 'libre' } };
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
      enviar: (d) => api.enviarOrden('confirmar_pedido', d),
      exito: (d) => ({ mesa: d.mesa })
    },
    actualizar_pedido: {
      respuesta: 'respuesta_pedido',
      enviar: (d) => api.enviarOrden('actualizar_estado', d),
      exito: (d) => ({ mesa: d.mesa, estado: d.estado })
    },
    trasladar_pedido: {
      respuesta: 'respuesta_traslado',
      enviar: (d) => api.enviarOrden('trasladar_pedido', d),
      exito: (d) => ({
        origen: `Mesa ${d.origen}`,
        destino: `Mesa ${d.destino}`,
        estado: 'orden en cola: el local no responde todavía'
      })
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
      const r = await accion.enviar(datos);
      // Si el local respondió, se reenvía su respuesta tal cual (igual que en modo local).
      // Si quedó pendiente, se completan los datos que la vista muestra.
      avisar(accion.respuesta, r.pendiente ? { ...r, ...accion.exito(datos) } : r);
    },
    /** Deja de escuchar. Mismo nombre que en socket.io, para cerrar ambas igual al salir. */
    disconnect() {
      clearTimeout(espera);
      supabase.removeChannel(canal);
    }
  };
}
