// Pruebas del contrato de src/servicios/api.js. fetch se sustituye por un doble (sin red).
import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  API_URL,
  obtenerMesas,
  obtenerPedidoMesa,
  abrirMesa,
  cerrarMesa,
  obtenerMenu
} from './api.js';

function simularRespuesta(cuerpo, { ok = true, status = 200 } = {}) {
  const fetchFalso = vi.fn(async () => ({ ok, status, json: async () => cuerpo }));
  vi.stubGlobal('fetch', fetchFalso);
  return fetchFalso;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('api: configuración', () => {
  test('usa el backend local por defecto', () => {
    expect(API_URL).toBe('http://localhost:3000');
  });
});

describe('api: operaciones GET', () => {
  test('obtenerMesas llama a /api/mesas y devuelve el cuerpo', async () => {
    const fetchFalso = simularRespuesta({
      ok: true,
      mesas: [{ id: 'Mesa 1', numero: 1, estado: 'libre' }]
    });
    const datos = await obtenerMesas();
    expect(fetchFalso).toHaveBeenCalledWith('http://localhost:3000/api/mesas');
    expect(datos.mesas).toHaveLength(1);
  });

  test('obtenerPedidoMesa arma la ruta con el número de mesa', async () => {
    const fetchFalso = simularRespuesta({ ok: true, items: [], total: 0 });
    await obtenerPedidoMesa(4);
    expect(fetchFalso).toHaveBeenCalledWith('http://localhost:3000/api/mesas/4/pedido');
  });

  test('un ok:false del backend se devuelve sin lanzar error', async () => {
    simularRespuesta(
      { ok: false, tipo: 'NO_ENCONTRADO', error: 'Mesa no existe' },
      { ok: false, status: 404 }
    );
    await expect(obtenerPedidoMesa(99)).resolves.toEqual({
      ok: false,
      tipo: 'NO_ENCONTRADO',
      error: 'Mesa no existe'
    });
  });
});

describe('api: operaciones POST', () => {
  test('abrirMesa hace POST a /abrir', async () => {
    const fetchFalso = simularRespuesta({ ok: true });
    await abrirMesa(1);
    expect(fetchFalso).toHaveBeenCalledWith('http://localhost:3000/api/mesas/1/abrir', {
      method: 'POST'
    });
  });

  test('cerrarMesa hace POST a /cerrar y devuelve PEDIDO_ACTIVO sin lanzar', async () => {
    const fetchFalso = simularRespuesta({
      ok: false,
      tipo: 'PEDIDO_ACTIVO',
      error: 'Tiene pedido'
    });
    const datos = await cerrarMesa(3);
    expect(fetchFalso).toHaveBeenCalledWith('http://localhost:3000/api/mesas/3/cerrar', {
      method: 'POST'
    });
    expect(datos.tipo).toBe('PEDIDO_ACTIVO');
  });
});

describe('api: errores', () => {
  test('si falla la red, la promesa se rechaza', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      })
    );
    await expect(obtenerMesas()).rejects.toThrow('Failed to fetch');
  });

  test('obtenerMenu se rechaza si el HTTP no es 2xx', async () => {
    simularRespuesta({}, { ok: false, status: 500 });
    await expect(obtenerMenu()).rejects.toThrow('Error del servidor: 500');
  });

  test('obtenerMenu devuelve el cuerpo si el HTTP es 2xx', async () => {
    simularRespuesta({ ok: true, items: [{ id: 1 }] });
    await expect(obtenerMenu()).resolves.toEqual({ ok: true, items: [{ id: 1 }] });
  });
});
