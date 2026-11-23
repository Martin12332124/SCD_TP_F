// Pruebas de Sesion.jsx: login ↔ app, la conexión en tiempo real se abre después del login
// y se cierra al salir, y una sesión vencida (401 o socket rechazado) vuelve al login.
// servicios/api se reemplaza por un doble: sin red ni backend.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = vi.hoisted(() => {
  /** Conexión falsa con interfaz de socket que guarda sus escuchas. */
  function crearConexion() {
    const escuchas = {};
    return {
      escuchas,
      on: (evento, fn) => {
        escuchas[evento] = fn;
      },
      off: (evento) => {
        delete escuchas[evento];
      },
      emit: () => {},
      disconnect: vi.fn()
    };
  }
  return {
    crearConexion,
    conexiones: [],
    alPerder: null,
    iniciarSesion: null,
    obtenerSesion: null,
    cerrarSesion: null
  };
});

vi.mock('../servicios/api', () => ({
  SOCKET_NO_AUTORIZADO: 'NO_AUTORIZADO',
  iniciarSesion: (...a) => api.iniciarSesion(...a),
  obtenerSesion: () => api.obtenerSesion(),
  cerrarSesion: () => api.cerrarSesion(),
  alPerderSesion: (fn) => {
    api.alPerder = fn;
    return () => {
      api.alPerder = null;
    };
  },
  conectarTiempoReal: () => {
    const c = api.crearConexion();
    api.conexiones.push(c);
    return c;
  },
  obtenerMesas: async () => ({ ok: true, mesas: [] }),
  obtenerMenu: async () => ({ ok: true, items: [] }),
  obtenerPedidoMesa: async () => ({ ok: true, items: [], total: 0 })
}));

import Sesion from './Sesion';

beforeEach(() => {
  api.conexiones = [];
  api.alPerder = null;
  api.iniciarSesion = vi.fn(async () => ({ ok: true, usuario: 'ana' }));
  api.obtenerSesion = vi.fn(async () => null);
  api.cerrarSesion = vi.fn(async () => {});
});

async function entrarComo(usuario) {
  await userEvent.type(await screen.findByLabelText('Usuario'), usuario);
  await userEvent.type(screen.getByLabelText('Contraseña'), 'clave-1');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('Sesion', () => {
  test('sin sesión guardada muestra el login y no abre ninguna conexión', async () => {
    render(<Sesion />);
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(api.conexiones).toHaveLength(0);
  });

  test('al iniciar sesión abre la conexión y muestra la app con el usuario', async () => {
    render(<Sesion />);
    await entrarComo('ana');
    expect(api.iniciarSesion).toHaveBeenCalledWith('ana', 'clave-1');
    expect(
      await screen.findByRole('button', { name: /Cerrar sesión \(ana\)/ })
    ).toBeInTheDocument();
    expect(api.conexiones).toHaveLength(1);
  });

  test('con credenciales malas se queda en el login', async () => {
    api.iniciarSesion = vi.fn(async () => ({
      ok: false,
      error: 'Usuario o contraseña incorrectos.'
    }));
    render(<Sesion />);
    await entrarComo('ana');
    expect(await screen.findByRole('alert')).toHaveTextContent('incorrectos');
    expect(api.conexiones).toHaveLength(0);
  });

  test('con una sesión guardada entra directo', async () => {
    api.obtenerSesion = vi.fn(async () => ({ usuario: 'cocina' }));
    render(<Sesion />);
    expect(
      await screen.findByRole('button', { name: /Cerrar sesión \(cocina\)/ })
    ).toBeInTheDocument();
    expect(api.conexiones).toHaveLength(1);
  });

  test('si no se puede leer la sesión guardada, muestra el login', async () => {
    api.obtenerSesion = vi.fn(async () => {
      throw new Error('sin storage');
    });
    render(<Sesion />);
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  test('Cerrar sesión cierra la sesión, desconecta y vuelve al login', async () => {
    render(<Sesion />);
    await entrarComo('ana');
    await userEvent.click(await screen.findByRole('button', { name: /Cerrar sesión/ }));
    expect(api.cerrarSesion).toHaveBeenCalled();
    expect(api.conexiones[0].disconnect).toHaveBeenCalled();
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('cerrar sesión en la nube (SIGNED_OUT llega antes de terminar) no muestra "sesión terminó"', async () => {
    // supabase.auth.signOut() avisa SIGNED_OUT a alPerderSesion antes de resolver.
    api.cerrarSesion = vi.fn(async () => {
      api.alPerder();
    });
    render(<Sesion />);
    await entrarComo('ana');
    await userEvent.click(await screen.findByRole('button', { name: /Cerrar sesión/ }));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(api.conexiones[0].disconnect).toHaveBeenCalledTimes(1);
  });

  test('un 401 de la API (alPerderSesion) vuelve al login con aviso', async () => {
    render(<Sesion />);
    await entrarComo('ana');
    await screen.findByRole('button', { name: /Cerrar sesión/ });
    act(() => api.alPerder());
    expect(await screen.findByRole('alert')).toHaveTextContent('Tu sesión terminó');
    expect(api.conexiones[0].disconnect).toHaveBeenCalled();
  });

  test('si el servidor rechaza el socket por token, vuelve al login', async () => {
    render(<Sesion />);
    await entrarComo('ana');
    await screen.findByRole('button', { name: /Cerrar sesión/ });
    const conexion = api.conexiones[0];

    // Otro error de conexión (servidor apagado) no cierra la sesión.
    act(() => conexion.escuchas.connect_error(new Error('xhr poll error')));
    expect(screen.getByRole('button', { name: /Cerrar sesión/ })).toBeInTheDocument();

    act(() => conexion.escuchas.connect_error(new Error('NO_AUTORIZADO')));
    expect(await screen.findByRole('alert')).toHaveTextContent('Tu sesión terminó');
  });

  test('al desmontar se cierra la conexión abierta', async () => {
    const { unmount } = render(<Sesion />);
    await entrarComo('ana');
    await screen.findByRole('button', { name: /Cerrar sesión/ });
    unmount();
    expect(api.conexiones[0].disconnect).toHaveBeenCalled();
  });
});
