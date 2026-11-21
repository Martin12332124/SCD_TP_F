// Pruebas de la selección de modo en src/servicios/api.js.
// api.js decide el modo al importarse, así que cada prueba fija las variables VITE_*
// y vuelve a importar el módulo. Supabase y socket.io se reemplazan por dobles.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

const dobles = vi.hoisted(() => ({
  createClient: vi.fn(),
  io: vi.fn(() => ({ tipo: 'socket.io' }))
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: dobles.createClient }));
vi.mock('socket.io-client', () => ({ io: dobles.io }));

/** Supabase mínimo: cada tabla responde vacía y los insert funcionan. */
function supabaseVacio() {
  const q = {
    select: () => q,
    eq: () => q,
    order: () => q,
    maybeSingle: () => q,
    insert: async () => ({ error: null }),
    then: (resolver) => resolver({ data: [], error: null })
  };
  const canal = { on: () => canal, subscribe: () => canal };
  return { from: vi.fn(() => q), channel: () => canal, removeChannel: () => {} };
}

async function importarApi(variables) {
  vi.resetModules();
  for (const [nombre, valor] of Object.entries(variables)) vi.stubEnv(nombre, valor);
  return import('./api.js');
}

beforeEach(() => {
  dobles.createClient.mockReset();
  dobles.io.mockClear();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('api: modo local (por defecto)', () => {
  test('sin VITE_MODO usa el backend local y no crea cliente de Supabase', async () => {
    const api = await importarApi({});
    expect(api.MODO).toBe('local');
    expect(api.conectarTiempoReal()).toEqual({ tipo: 'socket.io' });
    expect(dobles.io).toHaveBeenCalledWith('http://localhost:3000');
    expect(dobles.createClient).not.toHaveBeenCalled();
  });

  test('un valor distinto de "nube" también es modo local', async () => {
    expect((await importarApi({ VITE_MODO: 'Nube ' })).MODO).toBe('local');
  });
});

describe('api: modo nube', () => {
  const NUBE = {
    VITE_MODO: 'nube',
    VITE_SUPABASE_URL: 'https://ejemplo.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'llave-publica-de-prueba'
  };

  test('crea el cliente con la URL y la llave publishable', async () => {
    dobles.createClient.mockReturnValue(supabaseVacio());
    const api = await importarApi(NUBE);
    expect(api.MODO).toBe('nube');
    expect(dobles.createClient).toHaveBeenCalledWith(
      'https://ejemplo.supabase.co',
      'llave-publica-de-prueba'
    );
  });

  test('todas las operaciones van a Supabase, ninguna al backend local', async () => {
    const supabase = supabaseVacio();
    dobles.createClient.mockReturnValue(supabase);
    const fetchFalso = vi.fn();
    vi.stubGlobal('fetch', fetchFalso);
    const api = await importarApi(NUBE);

    expect(await api.obtenerMesas()).toEqual({ ok: true, mesas: [] });
    expect(await api.obtenerPedidoMesa(1)).toMatchObject({ ok: true, mesa: 'Mesa 1' });
    expect(await api.obtenerMenu()).toEqual({ ok: true, items: [] });
    expect(await api.abrirMesa(1)).toEqual({ ok: true, pendiente: true });
    expect(await api.cerrarMesa(1)).toEqual({ ok: true, pendiente: true });
    expect((await api.agregarMesa(4)).mesa.numero).toBe(4);
    expect((await api.quitarMesa(4)).mesa).toBe('Mesa 4');

    const conexion = api.conectarTiempoReal();
    expect(typeof conexion.on).toBe('function');
    expect(typeof conexion.emit).toBe('function');

    expect(fetchFalso).not.toHaveBeenCalled();
    expect(dobles.io).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  test('sin URL o sin llave, falla al cargar con un mensaje claro', async () => {
    await expect(importarApi({ VITE_MODO: 'nube', VITE_SUPABASE_URL: '' })).rejects.toThrow(
      'faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY'
    );
  });
});
