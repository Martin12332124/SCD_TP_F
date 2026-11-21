// Pruebas del adaptador del modo nube (src/servicios/nube.js).
// Supabase se reemplaza por un doble en memoria: sin red. Se verifica que las respuestas
// tengan la misma forma que las del backend local y que las acciones se conviertan en órdenes.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { crearApiNube, crearConexionNube } from './nube.js';

/** Doble de Supabase: tablas en memoria, buzón de órdenes y un canal Realtime controlable. */
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

  function consulta(tabla) {
    let filas = [...(tablas[tabla] || [])];
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
      insert: async (fila) => {
        if (errores[tabla]) return { error: { message: errores[tabla] } };
        ordenes.push(fila);
        return { error: null };
      },
      then: (resolver) => {
        if (errores[tabla]) return resolver({ data: null, error: { message: errores[tabla] } });
        return resolver({ data: unica ? (filas[0] ?? null) : filas, error: null });
      }
    };
    return q;
  }

  return {
    ordenes,
    errores,
    canal,
    from: (tabla) => consulta(tabla),
    channel: () => canal,
    removeChannel: vi.fn(),
    /** Simula un cambio en una tabla espejo que llega por Realtime. */
    cambio: (tabla) => canal.escuchas.filter((e) => e.tabla === tabla).forEach((e) => e.fn({}))
  };
}

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

describe('crearApiNube: las acciones se envían como órdenes al buzón', () => {
  test('abrir, cerrar y quitar mesa dejan su orden y responden pendiente', async () => {
    const supabase = supabaseFalso(TABLAS);
    const api = crearApiNube(supabase);

    expect(await api.abrirMesa(1)).toEqual({ ok: true, pendiente: true });
    expect(await api.cerrarMesa(2)).toEqual({ ok: true, pendiente: true });
    expect(await api.quitarMesa(1)).toEqual({ ok: true, pendiente: true, mesa: 'Mesa 1' });

    expect(supabase.ordenes).toEqual([
      { tipo: 'abrir_mesa', payload: { numero: 1 } },
      { tipo: 'cerrar_mesa', payload: { numero: 2 } },
      { tipo: 'quitar_mesa', payload: { numero: 1 } }
    ]);
  });

  test('agregarMesa sin número pide la siguiente a la más alta del espejo', async () => {
    const supabase = supabaseFalso(TABLAS);
    const api = crearApiNube(supabase);
    expect(await api.agregarMesa()).toEqual({
      ok: true,
      pendiente: true,
      mesa: { id: 'Mesa 3', numero: 3, estado: 'libre' }
    });
    expect(await api.agregarMesa(12)).toMatchObject({ mesa: { numero: 12 } });
    expect(supabase.ordenes).toEqual([
      { tipo: 'agregar_mesa', payload: { numero: 3 } },
      { tipo: 'agregar_mesa', payload: { numero: 12 } }
    ]);
  });

  test('agregarMesa sin mesas en el espejo pide la mesa 1', async () => {
    const supabase = supabaseFalso({ mesas: [], pedidos: [] });
    expect((await crearApiNube(supabase).agregarMesa()).mesa.numero).toBe(1);
  });

  test('si la orden no llega a la nube, responde SIN_CONEXION', async () => {
    const supabase = supabaseFalso(TABLAS);
    supabase.errores.ordenes_pendientes = 'Failed to fetch';
    const api = crearApiNube(supabase);
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
    expect(await crearApiNube(supabase).agregarMesa()).toMatchObject({ ok: false });
    expect(supabase.ordenes).toEqual([]);
  });
});

describe('crearConexionNube: interfaz de socket sobre Supabase Realtime', () => {
  let supabase;
  let conexion;
  beforeEach(() => {
    vi.useFakeTimers();
    supabase = supabaseFalso(TABLAS);
    conexion = crearConexionNube(supabase, crearApiNube(supabase));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

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

  test('confirmar_pedido y actualizar_pedido se envían como órdenes y responden por respuesta_pedido', async () => {
    const respuesta = vi.fn();
    conexion.on('respuesta_pedido', respuesta);

    await conexion.emit('confirmar_pedido', { mesa: 'Mesa 1', items: [{ id: 1, cantidad: 2 }] });
    await conexion.emit('actualizar_pedido', { mesa: 'Mesa 2', estado: 'Listo 🍽️' });

    expect(supabase.ordenes).toEqual([
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

  test('trasladar_pedido responde por respuesta_traslado con las mesas en formato "Mesa N"', async () => {
    const respuesta = vi.fn();
    conexion.on('respuesta_traslado', respuesta);
    await conexion.emit('trasladar_pedido', { origen: 2, destino: 1 });
    expect(supabase.ordenes).toEqual([
      { tipo: 'trasladar_pedido', payload: { origen: 2, destino: 1 } }
    ]);
    expect(respuesta).toHaveBeenCalledWith({
      ok: true,
      pendiente: true,
      origen: 'Mesa 2',
      destino: 'Mesa 1',
      estado: 'orden enviada al local'
    });
  });

  test('si la orden no se puede enviar, la respuesta es el error', async () => {
    const respuesta = vi.fn();
    conexion.on('respuesta_pedido', respuesta);
    supabase.errores.ordenes_pendientes = 'Failed to fetch';
    await conexion.emit('confirmar_pedido', { mesa: 'Mesa 1', items: [] });
    expect(respuesta).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, tipo: 'SIN_CONEXION' })
    );
  });

  test('un evento desconocido se ignora', async () => {
    await conexion.emit('otro_evento', {});
    expect(supabase.ordenes).toEqual([]);
  });

  test('off quita una escucha concreta o todas las del evento; cerrar libera el canal', () => {
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

    conexion.cerrar();
    expect(supabase.removeChannel).toHaveBeenCalledWith(supabase.canal);
  });
});
