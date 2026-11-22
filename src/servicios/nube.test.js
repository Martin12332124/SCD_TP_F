// Pruebas del adaptador del modo nube (src/servicios/nube.js).
// Supabase se reemplaza por un doble en memoria: sin red. Se verifica que las respuestas
// tengan la misma forma que las del backend local y que las acciones se conviertan en órdenes.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { crearApiNube, crearConexionNube, correoDeUsuario } from './nube.js';

/**
 * Doble de Supabase: tablas en memoria, buzón de órdenes, Auth y un canal Realtime controlable.
 * `local` simula el servidor del restaurante: si se define, procesa cada orden al llegar
 * (devuelve { estado, resultado }); si es null, la orden queda pendiente (local sin internet).
 */
function supabaseFalso(tablas = {}) {
  const ordenes = [];
  const errores = {}; // tabla → mensaje, para simular fallas
  const canal = { escuchas: [], alEstado: null };
  canal.on = (tipo, filtro, fn) => {
    canal.escuchas.push({ tabla: filtro.table, fn });
    return canal;
  };
  canal.subscribe = (fn) => {
    canal.alEstado = fn;
    return canal;
  };

  const doble = {
    ordenes,
    tablas,
    errores,
    canal,
    local: null,
    from: (tabla) => consulta(tabla),
    channel: () => canal,
    removeChannel: vi.fn(),
    auth: {
      signInWithPassword: vi.fn(),
      getSession: vi.fn(async () => ({ data: { session: null } })),
      signOut: vi.fn(async () => ({ error: null })),
      onAuthStateChange: vi.fn()
    },
    /** Simula un cambio en una tabla espejo que llega por Realtime. */
    cambio: (tabla) => canal.escuchas.filter((e) => e.tabla === tabla).forEach((e) => e.fn({}))
  };

  function consulta(tabla) {
    let filas = [...(tabla === 'ordenes_pendientes' ? ordenes : tablas[tabla] || [])];
    let unica = false;
    const q = {
      select: () => q,
      eq: (col, valor) => {
        filas = filas.filter((f) => f[col] === valor);
        return q;
      },
      order: (col) => {
        filas.sort((a, b) => (a[col] > b[col] ? 1 : -1));
        return q;
      },
      maybeSingle: () => {
        unica = true;
        return q;
      },
      // insert(...).select('id').single(): devuelve el id asignado por la base.
      insert: (fila) => ({
        select: () => ({
          single: async () => {
            if (errores[tabla]) return { data: null, error: { message: errores[tabla] } };
            const orden = { id: ordenes.length + 1, ...fila, estado: 'pendiente', resultado: null };
            ordenes.push(orden);
            if (doble.local) Object.assign(orden, doble.local(orden));
            return { data: { id: orden.id }, error: null };
          }
        })
      }),
      then: (resolver) => {
        if (errores[tabla]) return resolver({ data: null, error: { message: errores[tabla] } });
        return resolver({ data: unica ? (filas[0] ?? null) : filas, error: null });
      }
    };
    return q;
  }

  return doble;
}

/** Tiempos cortos para los tests: el local tiene 30 ms para responder. */
const RAPIDO = { esperaMaximaMs: 30, intervaloMs: 10 };

/** Solo tipo y payload de las órdenes enviadas (lo que la web puede escribir). */
const enviadas = (supabase) => supabase.ordenes.map(({ tipo, payload }) => ({ tipo, payload }));

/** Un local que aplica todo y responde como el servicio de dominio. */
const localQueAplica = (resultado) => () => ({ estado: 'aplicada', resultado });

const TABLAS = {
  mesas: [
    { id: 'Mesa 2', numero: 2, estado: 'ocupada' },
    { id: 'Mesa 1', numero: 1, estado: 'libre' }
  ],
  pedidos: [{ mesa_id: 'Mesa 2', estado: 'En Cocina 🍳', estado_desde: '2026-11-21T15:00:00Z' }],
  pedido_items: [
    {
      mesa_id: 'Mesa 2',
      posicion: 1,
      item_id: 2,
      nombre: 'Coca-Cola',
      precio_base: 2000,
      cantidad: 3
    },
    { mesa_id: 'Mesa 2', posicion: 0, item_id: 1, nombre: 'Pizza', precio_base: 8500, cantidad: 2 }
  ],
  menu_items: [
    { id: 2, nombre: 'Coca-Cola', precio_base: 2000, disponible: false },
    { id: 1, nombre: 'Pizza', precio_base: 8500, disponible: true }
  ]
};

describe('crearApiNube: lecturas con la misma forma que la API REST', () => {
  test('obtenerMesas une mesas y pedidos, ordenadas por número', async () => {
    const api = crearApiNube(supabaseFalso(TABLAS));
    expect(await api.obtenerMesas()).toEqual({
      ok: true,
      mesas: [
        { id: 'Mesa 1', numero: 1, estado: 'libre', estadoPedido: null, pedidoDesde: null },
        {
          id: 'Mesa 2',
          numero: 2,
          estado: 'ocupada',
          estadoPedido: 'En Cocina 🍳',
          pedidoDesde: '2026-11-21T15:00:00Z'
        }
      ]
    });
  });

  test('obtenerPedidoMesa devuelve ítems en orden, con nombres del dominio y total', async () => {
    const api = crearApiNube(supabaseFalso(TABLAS));
    expect(await api.obtenerPedidoMesa(2)).toEqual({
      ok: true,
      mesa: 'Mesa 2',
      estado: 'En Cocina 🍳',
      items: [
        { id: 1, nombre: 'Pizza', precioBase: 8500, cantidad: 2 },
        { id: 2, nombre: 'Coca-Cola', precioBase: 2000, cantidad: 3 }
      ],
      total: 23000
    });
  });

  test('obtenerPedidoMesa de una mesa sin pedido: estado null, sin ítems, total 0', async () => {
    const api = crearApiNube(supabaseFalso(TABLAS));
    expect(await api.obtenerPedidoMesa(1)).toEqual({
      ok: true,
      mesa: 'Mesa 1',
      estado: null,
      items: [],
      total: 0
    });
  });

  test('obtenerMenu convierte precio_base a precioBase', async () => {
    const api = crearApiNube(supabaseFalso(TABLAS));
    expect(await api.obtenerMenu()).toEqual({
      ok: true,
      items: [
        { id: 1, nombre: 'Pizza', precioBase: 8500, disponible: true },
        { id: 2, nombre: 'Coca-Cola', precioBase: 2000, disponible: false }
      ]
    });
  });

  test('si la nube falla, las lecturas responden ok:false (y obtenerMenu se rechaza)', async () => {
    const supabase = supabaseFalso(TABLAS);
    supabase.errores.pedidos = 'sin red';
    supabase.errores.menu_items = 'sin red';
    const api = crearApiNube(supabase);
    expect(await api.obtenerMesas()).toEqual({ ok: false, tipo: 'SIN_CONEXION', error: 'sin red' });
    expect(await api.obtenerPedidoMesa(2)).toMatchObject({ ok: false, tipo: 'SIN_CONEXION' });
    await expect(api.obtenerMenu()).rejects.toThrow('Error de la nube: sin red');
  });
});

describe('crearApiNube: última sincronización del local', () => {
  test('devuelve la hora de la fila única de estado_sincronizacion', async () => {
    const supabase = supabaseFalso({
      estado_sincronizacion: [{ id: 1, ultima_sincronizacion: '2026-11-22T10:00:00Z' }]
    });
    expect(await crearApiNube(supabase, RAPIDO).obtenerUltimaSincronizacion()).toEqual({
      ok: true,
      ultima: '2026-11-22T10:00:00Z'
    });
  });

  test('sin fila (el local nunca sincronizó) devuelve null', async () => {
    const api = crearApiNube(supabaseFalso({}), RAPIDO);
    expect(await api.obtenerUltimaSincronizacion()).toEqual({ ok: true, ultima: null });
  });

  test('si la nube falla, devuelve un error de conexión', async () => {
    const supabase = supabaseFalso({});
    supabase.errores.estado_sincronizacion = 'sin red';
    expect(await crearApiNube(supabase, RAPIDO).obtenerUltimaSincronizacion()).toEqual({
      ok: false,
      tipo: 'SIN_CONEXION',
      error: 'sin red'
    });
  });
});

describe('crearApiNube: las acciones se envían como órdenes y esperan al local', () => {
  test('si el local aplica la orden, se devuelve su respuesta tal cual', async () => {
    const supabase = supabaseFalso(TABLAS);
    supabase.local = localQueAplica({ ok: true, mesa: 'Mesa 1', estado: 'ocupada' });
    const api = crearApiNube(supabase, RAPIDO);

    expect(await api.abrirMesa(1)).toEqual({ ok: true, mesa: 'Mesa 1', estado: 'ocupada' });
    expect(supabase.ordenes[0]).toMatchObject({ estado: 'aplicada' });
    expect(enviadas(supabase)).toEqual([{ tipo: 'abrir_mesa', payload: { numero: 1 } }]);
  });

  test('si el local la rechaza, se devuelve el motivo del dominio', async () => {
    const supabase = supabaseFalso(TABLAS);
    const rechazo = {
      ok: false,
      tipo: 'ESTADO_NO_PERMITIDO',
      error: 'La mesa 2 ya está ocupada. No se puede abrir dos veces.'
    };
    supabase.local = () => ({ estado: 'rechazada', resultado: rechazo });
    expect(await crearApiNube(supabase, RAPIDO).abrirMesa(2)).toEqual(rechazo);
  });

  test('una orden procesada sin resultado guardado responde según su estado', async () => {
    const supabase = supabaseFalso(TABLAS);
    supabase.local = () => ({ estado: 'rechazada', resultado: null });
    expect(await crearApiNube(supabase, RAPIDO).cerrarMesa(2)).toEqual({ ok: false });
  });

  test('si el local no responde a tiempo, queda pendiente (ok, para no reenviarla)', async () => {
    const supabase = supabaseFalso(TABLAS);
    const api = crearApiNube(supabase, RAPIDO);

    expect(await api.abrirMesa(1)).toEqual({ ok: true, pendiente: true });
    expect(await api.cerrarMesa(2)).toEqual({ ok: true, pendiente: true });
    expect(await api.quitarMesa(1)).toEqual({ ok: true, pendiente: true, mesa: 'Mesa 1' });
    expect(enviadas(supabase)).toEqual([
      { tipo: 'abrir_mesa', payload: { numero: 1 } },
      { tipo: 'cerrar_mesa', payload: { numero: 2 } },
      { tipo: 'quitar_mesa', payload: { numero: 1 } }
    ]);
  });

  test('si no se puede consultar el resultado, también queda pendiente', async () => {
    const supabase = supabaseFalso(TABLAS);
    const api = crearApiNube(supabase, RAPIDO);
    const espera = api.abrirMesa(1);
    supabase.errores.ordenes_pendientes = 'sin red'; // la inserción ya pasó; la consulta falla
    expect(await espera).toEqual({ ok: true, pendiente: true });
  });

  test('quitarMesa respondida por el local no se modifica', async () => {
    const supabase = supabaseFalso(TABLAS);
    supabase.local = localQueAplica({ ok: true, mesa: 'Mesa 1' });
    expect(await crearApiNube(supabase, RAPIDO).quitarMesa(1)).toEqual({
      ok: true,
      mesa: 'Mesa 1'
    });
  });

  test('agregarMesa sin número pide la siguiente a la más alta del espejo', async () => {
    const supabase = supabaseFalso(TABLAS);
    const api = crearApiNube(supabase, RAPIDO);
    expect(await api.agregarMesa()).toEqual({
      ok: true,
      pendiente: true,
      mesa: { id: 'Mesa 3', numero: 3, estado: 'libre' }
    });
    supabase.local = localQueAplica({
      ok: true,
      mesa: { id: 'Mesa 12', numero: 12, estado: 'libre' }
    });
    expect(await api.agregarMesa(12)).toEqual({
      ok: true,
      mesa: { id: 'Mesa 12', numero: 12, estado: 'libre' }
    });
    expect(enviadas(supabase)).toEqual([
      { tipo: 'agregar_mesa', payload: { numero: 3 } },
      { tipo: 'agregar_mesa', payload: { numero: 12 } }
    ]);
  });

  test('agregarMesa sin mesas en el espejo pide la mesa 1', async () => {
    const supabase = supabaseFalso({ mesas: [], pedidos: [] });
    expect((await crearApiNube(supabase, RAPIDO).agregarMesa()).mesa.numero).toBe(1);
  });

  test('si la orden no llega a la nube, responde SIN_CONEXION', async () => {
    const supabase = supabaseFalso(TABLAS);
    supabase.errores.ordenes_pendientes = 'Failed to fetch';
    const api = crearApiNube(supabase, RAPIDO);
    expect(await api.abrirMesa(1)).toEqual({
      ok: false,
      tipo: 'SIN_CONEXION',
      error: 'No se pudo enviar la orden a la nube: Failed to fetch'
    });
    expect((await api.agregarMesa(5)).ok).toBe(false);
  });

  test('agregarMesa sin número y sin poder leer el espejo no envía nada', async () => {
    const supabase = supabaseFalso(TABLAS);
    supabase.errores.mesas = 'sin red';
    expect(await crearApiNube(supabase, RAPIDO).agregarMesa()).toMatchObject({ ok: false });
    expect(supabase.ordenes).toEqual([]);
  });
});

describe('crearApiNube: sesión con Supabase Auth', () => {
  test('correoDeUsuario normaliza y agrega el dominio', () => {
    expect(correoDeUsuario('  Ana ')).toBe('ana@sistema.local');
    expect(correoDeUsuario(undefined)).toBe('@sistema.local');
  });

  test('iniciarSesion usa el correo del usuario y devuelve el nombre corto', async () => {
    const supabase = supabaseFalso();
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { email: 'ana@sistema.local' } },
      error: null
    });
    expect(await crearApiNube(supabase).iniciarSesion(' Ana', 'clave-1')).toEqual({
      ok: true,
      usuario: 'ana'
    });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'ana@sistema.local',
      password: 'clave-1'
    });
  });

  test('credenciales malas, usuario sin confirmar y falla de red dan mensajes distintos', async () => {
    const supabase = supabaseFalso();
    const api = crearApiNube(supabase);
    const intentar = async (error) => {
      supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error });
      return api.iniciarSesion('ana', 'x');
    };
    expect(await intentar({ status: 400, code: 'invalid_credentials', message: 'x' })).toEqual({
      ok: false,
      tipo: 'CREDENCIALES_INVALIDAS',
      error: 'Usuario o contraseña incorrectos.'
    });
    expect((await intentar({ status: 400, code: 'email_not_confirmed' })).error).toContain(
      'no está confirmado'
    );
    expect(await intentar({ status: 0, message: 'Failed to fetch' })).toMatchObject({
      ok: false,
      tipo: 'SIN_CONEXION'
    });
  });

  test('obtenerSesion devuelve el usuario de la sesión guardada o null', async () => {
    const supabase = supabaseFalso();
    const api = crearApiNube(supabase);
    expect(await api.obtenerSesion()).toBeNull();
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { email: 'cocina@sistema.local' } } }
    });
    expect(await api.obtenerSesion()).toEqual({ usuario: 'cocina' });
  });

  test('cerrarSesion cierra la sesión de Supabase', async () => {
    const supabase = supabaseFalso();
    await crearApiNube(supabase).cerrarSesion();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  test('alPerderSesion avisa solo en SIGNED_OUT y se puede cancelar', () => {
    const supabase = supabaseFalso();
    const unsubscribe = vi.fn();
    let alCambio;
    supabase.auth.onAuthStateChange.mockImplementation((fn) => {
      alCambio = fn;
      return { data: { subscription: { unsubscribe } } };
    });
    const fn = vi.fn();
    const dejar = crearApiNube(supabase).alPerderSesion(fn);
    alCambio('TOKEN_REFRESHED');
    alCambio('SIGNED_OUT');
    expect(fn).toHaveBeenCalledTimes(1);
    dejar();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe('crearConexionNube: interfaz de socket sobre Supabase Realtime', () => {
  let supabase;
  let conexion;
  beforeEach(() => {
    vi.useFakeTimers();
    supabase = supabaseFalso(TABLAS);
    conexion = crearConexionNube(supabase, crearApiNube(supabase, RAPIDO));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** emit espera al local con temporizadores: se avanzan los relojes falsos. */
  async function emitir(evento, datos) {
    const promesa = conexion.emit(evento, datos);
    await vi.runAllTimersAsync();
    await promesa;
  }

  test('al suscribirse avisa connect y envía estado_mesas; un error avisa disconnect', async () => {
    const connect = vi.fn();
    const disconnect = vi.fn();
    const estadoMesas = vi.fn();
    conexion.on('connect', connect);
    conexion.on('disconnect', disconnect);
    conexion.on('estado_mesas', estadoMesas);

    supabase.canal.alEstado('SUBSCRIBED');
    await vi.runAllTimersAsync();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(estadoMesas).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'Mesa 2', estadoPedido: 'En Cocina 🍳' })
      ])
    );

    supabase.canal.alEstado('CHANNEL_ERROR');
    supabase.canal.alEstado('TIMED_OUT');
    supabase.canal.alEstado('CLOSED');
    supabase.canal.alEstado('JOINING'); // estados intermedios no avisan nada
    expect(disconnect).toHaveBeenCalledTimes(3);
  });

  test('varios cambios seguidos del espejo producen un solo estado_mesas', async () => {
    const estadoMesas = vi.fn();
    const itemsActualizados = vi.fn();
    conexion.on('estado_mesas', estadoMesas);
    conexion.on('pedido_items_actualizado', itemsActualizados);

    supabase.cambio('mesas');
    supabase.cambio('pedidos');
    supabase.cambio('pedido_items');
    await vi.runAllTimersAsync();

    expect(estadoMesas).toHaveBeenCalledTimes(1);
    expect(itemsActualizados).toHaveBeenCalledTimes(2);
  });

  test('si la recarga falla no se envía estado_mesas', async () => {
    const estadoMesas = vi.fn();
    conexion.on('estado_mesas', estadoMesas);
    supabase.errores.mesas = 'sin red';
    supabase.cambio('mesas');
    await vi.runAllTimersAsync();
    expect(estadoMesas).not.toHaveBeenCalled();
  });

  test('con el local respondiendo, respuesta_pedido trae la respuesta real del dominio', async () => {
    const respuesta = vi.fn();
    conexion.on('respuesta_pedido', respuesta);
    const rechazo = { ok: false, tipo: 'ENTRADA_INVALIDA', error: 'Cantidad fuera de rango.' };
    supabase.local = () => ({ estado: 'rechazada', resultado: rechazo });

    await emitir('confirmar_pedido', { mesa: 'Mesa 1', items: [{ id: 1, cantidad: 0 }] });

    expect(respuesta).toHaveBeenCalledWith(rechazo);
  });

  test('sin respuesta del local, confirmar y actualizar responden pendiente con la mesa', async () => {
    const respuesta = vi.fn();
    conexion.on('respuesta_pedido', respuesta);

    await emitir('confirmar_pedido', { mesa: 'Mesa 1', items: [{ id: 1, cantidad: 2 }] });
    await emitir('actualizar_pedido', { mesa: 'Mesa 2', estado: 'Listo 🍽️' });

    expect(enviadas(supabase)).toEqual([
      { tipo: 'confirmar_pedido', payload: { mesa: 'Mesa 1', items: [{ id: 1, cantidad: 2 }] } },
      { tipo: 'actualizar_estado', payload: { mesa: 'Mesa 2', estado: 'Listo 🍽️' } }
    ]);
    expect(respuesta).toHaveBeenNthCalledWith(1, { ok: true, pendiente: true, mesa: 'Mesa 1' });
    expect(respuesta).toHaveBeenNthCalledWith(2, {
      ok: true,
      pendiente: true,
      mesa: 'Mesa 2',
      estado: 'Listo 🍽️'
    });
  });

  test('trasladar_pedido responde por respuesta_traslado (real o pendiente)', async () => {
    const respuesta = vi.fn();
    conexion.on('respuesta_traslado', respuesta);

    await emitir('trasladar_pedido', { origen: 2, destino: 1 });
    expect(respuesta).toHaveBeenLastCalledWith({
      ok: true,
      pendiente: true,
      origen: 'Mesa 2',
      destino: 'Mesa 1',
      estado: 'orden en cola: el local no responde todavía'
    });

    const real = { ok: true, origen: 'Mesa 2', destino: 'Mesa 1', estado: 'En Cocina 🍳' };
    supabase.local = localQueAplica(real);
    await emitir('trasladar_pedido', { origen: 2, destino: 1 });
    expect(respuesta).toHaveBeenLastCalledWith(real);
  });

  test('si la orden no se puede enviar, la respuesta es el error', async () => {
    const respuesta = vi.fn();
    conexion.on('respuesta_pedido', respuesta);
    supabase.errores.ordenes_pendientes = 'Failed to fetch';
    await emitir('confirmar_pedido', { mesa: 'Mesa 1', items: [] });
    expect(respuesta).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, tipo: 'SIN_CONEXION' })
    );
  });

  test('un evento desconocido se ignora', async () => {
    await emitir('otro_evento', {});
    expect(supabase.ordenes).toEqual([]);
  });

  test('off quita una escucha concreta o todas las del evento; disconnect libera el canal', () => {
    const a = vi.fn();
    const b = vi.fn();
    conexion.on('connect', a);
    conexion.on('connect', b);
    conexion.off('connect', a);
    supabase.canal.alEstado('SUBSCRIBED');
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);

    conexion.off('connect');
    conexion.off('nunca_registrado', a);
    supabase.canal.alEstado('SUBSCRIBED');
    expect(b).toHaveBeenCalledTimes(1);

    conexion.disconnect();
    expect(supabase.removeChannel).toHaveBeenCalledWith(supabase.canal);
  });

  test('se identifica como conexión del modo nube', () => {
    expect(conexion.modo).toBe('nube');
  });

  test('estado_sincronizacion: se envía al conectar y cada vez que el local la actualiza', async () => {
    const alAviso = vi.fn();
    conexion.on('estado_sincronizacion', alAviso);
    supabase.canal.alEstado('SUBSCRIBED');
    await vi.runAllTimersAsync();
    expect(alAviso).toHaveBeenLastCalledWith(null); // sin fila todavía

    supabase.tablas.estado_sincronizacion = [
      { id: 1, ultima_sincronizacion: '2026-11-22T10:00:30Z' }
    ];
    supabase.cambio('estado_sincronizacion');
    await vi.runAllTimersAsync();
    expect(alAviso).toHaveBeenLastCalledWith('2026-11-22T10:00:30Z');
  });

  test('si la lectura de la sincronización falla, no se envía nada', async () => {
    const alAviso = vi.fn();
    conexion.on('estado_sincronizacion', alAviso);
    supabase.errores.estado_sincronizacion = 'sin red';
    supabase.cambio('estado_sincronizacion');
    await vi.runAllTimersAsync();
    expect(alAviso).not.toHaveBeenCalled();
  });
});
