// Pruebas de la API key (x-api-key) del modo local en src/servicios/api.js: la llave viaja en
// toda petición al servidor, también en el login y en el handshake del socket; un 401 por
// llave mala no cierra la sesión; en modo nube no se usa. fetch, socket.io y Supabase son dobles.
// La llave de las pruebas es un texto inventado, no una llave real.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

const dobles = vi.hoisted(() => ({
  io: vi.fn(() => ({ tipo: 'socket.io' })),
  createClient: vi.fn()
}));
vi.mock('socket.io-client', () => ({ io: dobles.io }));
vi.mock('@supabase/supabase-js', () => ({ createClient: dobles.createClient }));

const LLAVE = 'llave-de-prueba-no-real';
const TOKEN = 'token-de-prueba';

function responder(cuerpo, { status = 200 } = {}) {
  const fetchFalso = vi.fn(async () => ({ ok: status < 400, status, json: async () => cuerpo }));
  vi.stubGlobal('fetch', fetchFalso);
  return fetchFalso;
}

async function importarApi(variables = {}) {
  vi.resetModules();
  for (const [nombre, valor] of Object.entries(variables)) vi.stubEnv(nombre, valor);
  return import('./api.js');
}

beforeEach(() => {
  localStorage.clear();
  dobles.io.mockClear();
  dobles.createClient.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('api: API key del modo local', () => {
  test('el login envía x-api-key (todavía no hay token)', async () => {
    const api = await importarApi({ VITE_API_KEY: LLAVE });
    const fetchFalso = responder({ ok: true, token: TOKEN, usuario: 'ana' });
    await api.iniciarSesion('ana', 'clave-1');
    expect(fetchFalso).toHaveBeenCalledWith('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': LLAVE },
      body: JSON.stringify({ usuario: 'ana', contrasena: 'clave-1' })
    });
  });

  test('sin sesión, las peticiones llevan solo la llave', async () => {
    const api = await importarApi({ VITE_API_KEY: LLAVE });
    const fetchFalso = responder({ ok: true, mesas: [], items: [] });
    await api.obtenerMesas();
    await api.obtenerMenu();
    expect(fetchFalso).toHaveBeenNthCalledWith(1, 'http://localhost:3000/api/mesas', {
      headers: { 'x-api-key': LLAVE }
    });
    expect(fetchFalso).toHaveBeenNthCalledWith(2, 'http://localhost:3000/api/menu-items', {
      headers: { 'x-api-key': LLAVE }
    });
  });

  test('con sesión, cada petición lleva la llave y el token; agregarMesa conserva Content-Type', async () => {
    const api = await importarApi({ VITE_API_KEY: LLAVE });
    localStorage.setItem(api.CLAVE_SESION, JSON.stringify({ token: TOKEN, usuario: 'ana' }));
    const fetchFalso = responder({ ok: true });
    await api.abrirMesa(1);
    await api.agregarMesa(5);
    expect(fetchFalso.mock.calls[0][1]).toEqual({
      method: 'POST',
      headers: { 'x-api-key': LLAVE, Authorization: `Bearer ${TOKEN}` }
    });
    expect(fetchFalso.mock.calls[1][1].headers).toEqual({
      'Content-Type': 'application/json',
      'x-api-key': LLAVE,
      Authorization: `Bearer ${TOKEN}`
    });
  });

  test('el socket envía la llave y el token en el handshake', async () => {
    const api = await importarApi({ VITE_API_KEY: LLAVE });
    localStorage.setItem(api.CLAVE_SESION, JSON.stringify({ token: TOKEN, usuario: 'ana' }));
    api.conectarTiempoReal();
    expect(dobles.io).toHaveBeenCalledWith('http://localhost:3000', {
      auth: { token: TOKEN, apiKey: LLAVE }
    });
  });

  test('sin import.meta.env (Node a secas) la llave se lee de process.env.VITE_API_KEY', async () => {
    vi.stubEnv('VITE_API_KEY', '');
    process.env.VITE_API_KEY = LLAVE; // lo que haría `VITE_API_KEY=... node scripts/probar-api.mjs`
    try {
      const api = await importarApi();
      const fetchFalso = responder({ ok: true, mesas: [] });
      await api.obtenerMesas();
      expect(fetchFalso).toHaveBeenCalledWith('http://localhost:3000/api/mesas', {
        headers: { 'x-api-key': LLAVE }
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  test('sin VITE_API_KEY no se envía ninguna cabecera x-api-key', async () => {
    const api = await importarApi();
    const fetchFalso = responder({ ok: true, mesas: [] });
    await api.obtenerMesas();
    expect(fetchFalso).toHaveBeenCalledWith('http://localhost:3000/api/mesas');
  });

  test('un 401 por API_KEY_INVALIDA NO cierra la sesión (es configuración, no sesión)', async () => {
    const api = await importarApi({ VITE_API_KEY: LLAVE });
    localStorage.setItem(api.CLAVE_SESION, JSON.stringify({ token: TOKEN, usuario: 'ana' }));
    const alPerder = vi.fn();
    api.alPerderSesion(alPerder);
    const malaLlave = { ok: false, tipo: api.API_KEY_INVALIDA, error: 'Llave inválida' };
    responder(malaLlave, { status: 401 });

    expect(await api.obtenerMesas()).toEqual(malaLlave);
    await expect(api.obtenerMenu()).rejects.toThrow('Error del servidor: 401');
    expect(alPerder).not.toHaveBeenCalled();
    expect(await api.obtenerSesion()).toEqual({ usuario: 'ana' });
  });

  test('un 401 NO_AUTORIZADO sí cierra la sesión aunque haya llave', async () => {
    const api = await importarApi({ VITE_API_KEY: LLAVE });
    localStorage.setItem(api.CLAVE_SESION, JSON.stringify({ token: TOKEN, usuario: 'ana' }));
    const alPerder = vi.fn();
    api.alPerderSesion(alPerder);
    responder({ ok: false, tipo: 'NO_AUTORIZADO' }, { status: 401 });
    await api.obtenerMesas();
    expect(alPerder).toHaveBeenCalledTimes(1);
  });

  test('un 429 llega a la pantalla como { ok: false, tipo: DEMASIADAS_PETICIONES } y no cierra la sesión', async () => {
    const api = await importarApi({ VITE_API_KEY: LLAVE });
    localStorage.setItem(api.CLAVE_SESION, JSON.stringify({ token: TOKEN, usuario: 'ana' }));
    const alPerder = vi.fn();
    api.alPerderSesion(alPerder);
    const limite = { ok: false, tipo: 'DEMASIADAS_PETICIONES', error: 'Espera un momento' };
    responder(limite, { status: 429 });
    expect(await api.obtenerMesas()).toEqual(limite);
    expect(alPerder).not.toHaveBeenCalled();
  });

  test('un 401 sin cuerpo JSON en obtenerMenu igual cierra la sesión', async () => {
    const api = await importarApi({ VITE_API_KEY: LLAVE });
    localStorage.setItem(api.CLAVE_SESION, JSON.stringify({ token: TOKEN, usuario: 'ana' }));
    const alPerder = vi.fn();
    api.alPerderSesion(alPerder);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => {
          throw new SyntaxError('no es JSON');
        }
      }))
    );
    await expect(api.obtenerMenu()).rejects.toThrow('Error del servidor: 401');
    expect(alPerder).toHaveBeenCalledTimes(1);
  });

  test('en modo nube la llave del servidor local no se usa: el gateway es el de Supabase', async () => {
    dobles.createClient.mockReturnValue({
      auth: {
        getSession: vi.fn(async () => ({ data: { session: null } })),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
      }
    });
    const api = await importarApi({
      VITE_MODO: 'nube',
      VITE_API_KEY: LLAVE,
      VITE_SUPABASE_URL: 'https://ejemplo.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_ejemplo'
    });
    expect(api.MODO).toBe('nube');
    // createClient recibe solo la llave publishable (supabase-js la envía como cabecera apikey).
    expect(dobles.createClient).toHaveBeenCalledWith(
      'https://ejemplo.supabase.co',
      'sb_publishable_ejemplo'
    );
    expect(JSON.stringify(dobles.createClient.mock.calls)).not.toContain(LLAVE);
  });
});
