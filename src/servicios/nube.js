// src/servicios/nube.js
// Adaptador del modo nube (VITE_MODO=nube): misma forma que la API REST y que el socket
// del servidor local, pero sobre Supabase. Solo lo usa api.js; los componentes no lo ven.
//
// Regla del sistema híbrido: el servidor local es la autoridad.
//   - Leer: de las tablas espejo que el local mantiene en Supabase.
//   - Escribir: nunca directo. Cada acción se deja como una orden en `ordenes_pendientes`;
//     el local la aplica con sus reglas y el cambio vuelve por Realtime a las tablas espejo.
//   Por eso una acción respondida aquí con ok: true significa "orden enviada", no "aplicada":
//   la respuesta lleva `pendiente: true`.

/** Agrupa avisos seguidos: una subida del local cambia varias tablas a la vez. */
const ESPERA_RECARGA_MS = 150;

const SIN_CONEXION = 'SIN_CONEXION';

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
 */
export function crearApiNube(supabase) {
  /** Deja una orden en el buzón. Solo se envían tipo y payload: el resto lo pone la base. */
  async function enviarOrden(tipo, payload) {
    const { error } = await supabase.from('ordenes_pendientes').insert({ tipo, payload });
    if (error) {
      return {
        ok: false,
        tipo: SIN_CONEXION,
        error: `No se pudo enviar la orden a la nube: ${error.message}`
      };
    }
    return { ok: true, pendiente: true };
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

    abrirMesa: (numero) => enviarOrden('abrir_mesa', { numero }),
    cerrarMesa: (numero) => enviarOrden('cerrar_mesa', { numero }),
    quitarMesa: async (numero) => ({
      ...(await enviarOrden('quitar_mesa', { numero })),
      mesa: `Mesa ${numero}`
    }),

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
      if (!resultado.ok) return resultado;
      return { ...resultado, mesa: { id: `Mesa ${elegido}`, numero: elegido, estado: 'libre' } };
    },

    enviarOrden
  };
  return api;
}

/**
 * Conexión en tiempo real del modo nube con la misma interfaz que un socket de socket.io
 * (on, off, emit) y los mismos eventos, para que App y TomaPedido no cambien:
 *   - 'connect' / 'disconnect': estado del canal de Supabase Realtime.
 *   - 'estado_mesas': mesas con su pedido, al conectar y cada vez que cambia el espejo.
 *   - 'pedido_items_actualizado': cambió algún pedido o sus ítems.
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
  const cambioDePedido = () => {
    avisar('pedido_items_actualizado', {});
    recargarMesas();
  };

  const canal = supabase
    .channel('espejo-restaurante')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, recargarMesas)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, cambioDePedido)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, cambioDePedido)
    .subscribe((estado) => {
      if (estado === 'SUBSCRIBED') {
        avisar('connect');
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
        estado: 'orden enviada al local'
      })
    }
  };

  return {
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
      avisar(accion.respuesta, r.ok ? { ...r, ...accion.exito(datos) } : r);
    },
    /** Deja de escuchar (no lo usa App, que vive mientras la página esté abierta). */
    cerrar() {
      clearTimeout(espera);
      supabase.removeChannel(canal);
    }
  };
}
