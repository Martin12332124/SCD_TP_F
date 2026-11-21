// Pruebas de la sesión del modo local en src/servicios/api.js: login contra el backend,
// token en localStorage, cabecera Authorization, 401 → vuelve al login, token en el socket.
// fetch y socket.io se reemplazan por dobles. Cada prueba recarga api.js (estado limpio).
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

const dobles = vi.hoisted(() => ({ io: vi.fn(() => ({ tipo: 'socket.io' })) }));
vi.mock('socket.io-client', () => ({ io: dobles.io }));

const TOKEN = 'token-de-prueba';

function responder(cuerpo, { status = 200 } = {}) {
  const fetchFalso = vi.fn(async () => ({ ok: status < 400, status, json: async () => cuerpo }));
  vi.stubGlobal('fetch', fetchFalso);
  return fetchFalso;
}

async function importarApi() {
  vi.resetModules();
  return import('./api.js');
}

beforeEach(() => {
  localStorage.clear();
  dobles.io.mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api: inicio de sesión local', () => {
  test('iniciarSesion llama a /api/auth/login y guarda el token en localStorage', async () => {
    const api = await importarApi();
    const fetchFalso = responder({ ok: true, token: TOKEN, usuario: 'ana' });

    expect(await api.iniciarSesion('ana', 'clave-1')).toEqual({ ok: true, usuario: 'ana' });

    expect(fetchFalso).toHaveBeenCalledWith('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: 'ana', contrasena: 'clave-1' })
    });
    expect(JSON.parse(localStorage.getItem(api.CLAVE_SESION))).toEqual({
      token: TOKEN,
      usuario: 'ana'
    });
    expect(await api.obtenerSesion()).toEqual({ usuario: 'ana' });
  });

  test('con credenciales malas devuelve el error del backend y no guarda nada', async () => {
    const api = await importarApi();
    const error = {
      ok: false,
      tipo: 'CREDENCIALES_INVALIDAS',
      error: 'Usuario o contraseña incorrectos.'
    };
    responder(error, { status: 401 });
    expect(await api.iniciarSesion('ana', 'mala')).toEqual(error);
    expect(await api.obtenerSesion()).toBeNull();
  });

  test('si el servidor no responde, avisa SIN_CONEXION', async () => {
    const api = await importarApi();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch')))
    );
    expect(await api.iniciarSesion('ana', 'clave-1')).toMatchObject({
      ok: false,
      tipo: 'SIN_CONEXION'
    });
  });

  test('cerrarSesion borra el token', async () => {
    const api = await importarApi();
    localStorage.setItem(api.CLAVE_SESION, JSON.stringify({ token: TOKEN, usuario: 'ana' }));
    await api.cerrarSesion();
    expect(localStorage.getItem(api.CLAVE_SESION)).toBeNull();
    expect(await api.obtenerSesion()).toBeNull();
  });
});

describe('api: peticiones con sesión', () => {
  test('con sesión, cada petición lleva Authorization: Bearer <token>', async () => {
    const api = await importarApi();
    localStorage.setItem(api.CLAVE_SESION, JSON.stringify({ token: TOKEN, usuario: 'ana' }));
    const fetchFalso = responder({ ok: true, mesas: [], items: [] });

    await api.obtenerMesas();
    await api.abrirMesa(1);
    await api.obtenerMenu();

    expect(fetchFalso).toHaveBeenNthCalledWith(1, 'http://localhost:3000/api/mesas', {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    expect(fetchFalso).toHaveBeenNthCalledWith(2, 'http://localhost:3000/api/mesas/1/abrir', {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    expect(fetchFalso).toHaveBeenNthCalledWith(3, 'http://localhost:3000/api/menu-items', {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
  });

  test('agregarMesa conserva Content-Type y suma Authorization', async () => {
    const api = await importarApi();
    localStorage.setItem(api.CLAVE_SESION, JSON.stringify({ token: TOKEN, usuario: 'ana' }));
    const fetchFalso = responder({ ok: true });
    await api.agregarMesa(5);
    expect(fetchFalso.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`
    });
  });

  test('un 401 borra el token y avisa para volver al login (también en obtenerMenu)', async () => {
    const api = await importarApi();
    localStorage.setItem(api.CLAVE_SESION, JSON.stringify({ token: TOKEN, usuario: 'ana' }));
    const alPerder = vi.fn();
    const dejar = api.alPerderSesion(alPerder);
    responder({ ok: false, tipo: 'NO_AUTORIZADO', error: 'Sesión vencida' }, { status: 401 });

    expect(await api.obtenerMesas()).toMatchObject({ tipo: 'NO_AUTORIZADO' });
    expect(alPerder).toHaveBeenCalledTimes(1);
    expect(await api.obtenerSesion()).toBeNull();

    await expect(api.obtenerMenu()).rejects.toThrow('Error del servidor: 401');
    expect(alPerder).toHaveBeenCalledTimes(2);

    dejar();
    await api.obtenerMesas();
    expect(alPerder).toHaveBeenCalledTimes(2); // ya no escucha
  });

  test('un 401 sin nadie escuchando no falla', async () => {
    const api = await importarApi();
    responder({ ok: false }, { status: 401 });
    await expect(api.obtenerMesas()).resolves.toEqual({ ok: false });
  });

  test('el socket se conecta con el token en el handshake', async () => {
    const api = await importarApi();
    localStorage.setItem(api.CLAVE_SESION, JSON.stringify({ token: TOKEN, usuario: 'ana' }));
    api.conectarTiempoReal();
    expect(dobles.io).toHaveBeenCalledWith('http://localhost:3000', { auth: { token: TOKEN } });
  });

  test('sin localStorage disponible la sesión dura mientras la pestaña esté abierta', async () => {
    const api = await importarApi();
    const original = globalThis.localStorage;
    const roto = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      }
    };
    vi.stubGlobal('localStorage', roto);
    responder({ ok: true, token: TOKEN, usuario: 'ana' });
    await api.iniciarSesion('ana', 'clave-1');
    expect(await api.obtenerSesion()).toEqual({ usuario: 'ana' });
    await api.cerrarSesion();
    expect(await api.obtenerSesion()).toBeNull();
    vi.stubGlobal('localStorage', original);
  });
});
