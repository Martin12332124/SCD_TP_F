// Pruebas de App: validación defensiva en la frontera, eventos de socket,
// mapa de mesas (US-08) y traslado de mesa (US-05).
// socket.io-client y fetch se sustituyen por dobles: no se usa red ni backend real.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// vi.hoisted: el doble debe existir antes de que App.jsx cree su conexión al importarse.
const socket = vi.hoisted(() => {
  const escuchas = {};
  return {
    escuchas,
    emit: (...args) => socket.emitirMock(...args),
    emitirMock: () => {},
    on: (evento, fn) => {
      escuchas[evento] = fn;
    },
    off: (evento) => {
      delete escuchas[evento];
    }
  };
});

vi.mock('socket.io-client', () => ({ io: () => socket }));

import App from './App';

const mesasBase = [
  { id: 'Mesa 1', numero: 1, estado: 'libre' },
  { id: 'Mesa 2', numero: 2, estado: 'ocupada' }
];

/** Dispara un evento del servidor dentro de act() para que React procese el estado. */
const servidor = (evento, datos) => act(() => socket.escuchas[evento](datos));

beforeEach(() => {
  socket.emitirMock = vi.fn();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ json: async () => ({ ok: true, mesas: mesasBase, items: [], total: 0 }) }))
  );
});

async function renderizarConectado() {
  render(<App />);
  await servidor('connect');
  await screen.findByText('Mesa 1');
}

describe('App: conexión', () => {
  test('arranca desconectada y deshabilita el formulario', () => {
    render(<App />);
    expect(screen.getByText(/Servidor Desconectado/)).toBeInTheDocument();
    expect(document.getElementById('input-mesa')).toBeDisabled();
  });

  test('connect/disconnect actualizan el indicador', async () => {
    render(<App />);
    await servidor('connect');
    expect(screen.getByText(/Sistema Conectado/)).toBeInTheDocument();
    await servidor('disconnect');
    expect(screen.getByText(/Servidor Desconectado/)).toBeInTheDocument();
  });
});

describe('App: validación defensiva del número de mesa', () => {
  test.each(['-1', '0', '1.5'])(
    'un valor inválido "%s" muestra error y conserva el campo',
    async (valor) => {
      await renderizarConectado();
      const input = document.getElementById('input-mesa');
      fireEvent.change(input, { target: { value: valor } });
      expect(screen.getByText(/⚠️/)).toBeInTheDocument();
      expect(input).toHaveValue(Number(valor));
    }
  );

  test('corregir a un valor válido limpia el error; vaciar también', async () => {
    await renderizarConectado();
    const input = document.getElementById('input-mesa');
    fireEvent.change(input, { target: { value: '-1' } });
    fireEvent.change(input, { target: { value: '5' } });
    expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: '-1' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument();
  });

  test('enviar un estado con mesa inválida NO emite por socket', async () => {
    await renderizarConectado();
    await userEvent.click(screen.getByText(/Tomar Pedido 📝/));
    expect(screen.getByText(/⚠️/)).toBeInTheDocument();
    expect(socket.emitirMock).not.toHaveBeenCalled();
  });

  test('con mesa válida emite actualizar_pedido con formato "Mesa N"', async () => {
    await renderizarConectado();
    fireEvent.change(document.getElementById('input-mesa'), { target: { value: '5' } });
    await userEvent.click(screen.getByText(/Empezar Cocina/));
    expect(socket.emitirMock).toHaveBeenCalledWith('actualizar_pedido', {
      mesa: 'Mesa 5',
      estado: 'En Cocina 🍳'
    });
  });
});

describe('App: eventos del servidor', () => {
  test('cambio_estado_pedido actualiza el último pedido y muestra el contador', async () => {
    await renderizarConectado();
    await servidor('cambio_estado_pedido', { mesa: 'Mesa 4', estado: 'Recibido 📝' });
    expect(screen.getByText(/Mesa 4/, { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText(/⏱️ 00:00/)).toBeInTheDocument();
  });

  test('respuesta_pedido con error muestra tipo, motivo y lo esperado', async () => {
    await renderizarConectado();
    await servidor('respuesta_pedido', {
      ok: false,
      tipo: 'ENTRADA_INVALIDA',
      error: 'mesa no válida',
      esperado: 'Mesa N'
    });
    expect(
      screen.getByText(/ENTRADA_INVALIDA.*mesa no válida.*Esperado: Mesa N/)
    ).toBeInTheDocument();
  });

  test('respuesta_pedido ok no muestra error', async () => {
    await renderizarConectado();
    await servidor('respuesta_pedido', { ok: true });
    expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument();
  });

  test('pedido_items_actualizado no rompe la vista (refresca resúmenes)', async () => {
    await renderizarConectado();
    await servidor('pedido_items_actualizado');
    expect(screen.getByText('Mesa 1')).toBeInTheDocument();
  });
});

describe('App: mapa de mesas (US-08)', () => {
  test('carga inicial por REST muestra las mesas', async () => {
    await renderizarConectado();
    expect(screen.getByTitle(/Mesa 2/)).toBeInTheDocument();
  });

  test('si falla el REST inicial, el evento estado_mesas completa la carga', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('sin red');
      })
    );
    render(<App />);
    await servidor('estado_mesas', mesasBase);
    expect(await screen.findByText('Mesa 1')).toBeInTheDocument();
  });

  test('CA3: estado_mesas actualiza la mesa seleccionada abierta en el panel', async () => {
    await renderizarConectado();
    await userEvent.click(screen.getByTitle(/Mesa 1/));
    expect(await screen.findByText(/🟢 Libre/)).toBeInTheDocument();
    await servidor('estado_mesas', [{ id: 'Mesa 1', numero: 1, estado: 'ocupada' }, mesasBase[1]]);
    expect(await screen.findByText(/🔴 Ocupada/)).toBeInTheDocument();
  });

  test('si la mesa seleccionada desaparece de estado_mesas, el panel se cierra', async () => {
    await renderizarConectado();
    await userEvent.click(screen.getByTitle(/Mesa 1/));
    await screen.findByText(/🟢 Libre/);
    await servidor('estado_mesas', [mesasBase[1]]);
    expect(screen.queryByText(/🟢 Libre/)).not.toBeInTheDocument();
  });

  test('"Tomar pedido" abre la vista de toma de pedido de la mesa ocupada', async () => {
    await renderizarConectado();
    await userEvent.click(screen.getByTitle(/Mesa 2/));
    await userEvent.click(await screen.findByText(/📝 Tomar pedido/));
    expect(await screen.findByText('Mesa 2', { selector: 'p' })).toBeInTheDocument();
    await userEvent.click(screen.getByText(/✕ Cerrar/));
    expect(screen.queryByText(/Tomar pedido$/)).not.toBeInTheDocument();
  });
});

describe('App: traslado de mesa (US-05)', () => {
  const rellenar = (origen, destino) => {
    fireEvent.change(document.getElementById('input-mesa-origen'), { target: { value: origen } });
    fireEvent.change(document.getElementById('input-mesa-destino'), { target: { value: destino } });
  };
  const trasladar = () => userEvent.click(screen.getByText(/Trasladar Mesa/));

  test('traslado válido emite trasladar_pedido con números', async () => {
    await renderizarConectado();
    rellenar('2', '6');
    await trasladar();
    expect(socket.emitirMock).toHaveBeenCalledWith('trasladar_pedido', { origen: 2, destino: 6 });
  });

  test.each([
    ['0', '3', /mayor a 0/],
    ['2', '-1', /mayor a 0/],
    ['', '3', /válido/],
    ['4', '4', /distintas/]
  ])('origen "%s" y destino "%s" se rechazan sin emitir', async (o, d, mensaje) => {
    await renderizarConectado();
    rellenar(o, d);
    await trasladar();
    expect(screen.getByText(mensaje)).toBeInTheDocument();
    expect(socket.emitirMock).not.toHaveBeenCalled();
  });

  test('respuesta_traslado ok muestra confirmación y limpia los campos', async () => {
    await renderizarConectado();
    rellenar('2', '6');
    await servidor('respuesta_traslado', {
      ok: true,
      origen: 'Mesa 2',
      destino: 'Mesa 6',
      estado: 'En Cocina 🍳'
    });
    expect(screen.getByText(/Pedido trasladado: Mesa 2 → Mesa 6/)).toBeInTheDocument();
    expect(document.getElementById('input-mesa-origen')).toHaveValue(null);
  });

  test('respuesta_traslado con error muestra tipo y motivo', async () => {
    await renderizarConectado();
    await servidor('respuesta_traslado', {
      ok: false,
      tipo: 'DESTINO_OCUPADO',
      error: 'La mesa destino no está libre',
      esperado: 'mesa libre'
    });
    expect(screen.getByText(/DESTINO_OCUPADO.*no está libre.*mesa libre/)).toBeInTheDocument();
  });
});
