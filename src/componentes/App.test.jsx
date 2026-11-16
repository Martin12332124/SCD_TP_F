// Pruebas de App: validación defensiva en la frontera, eventos de socket,
// mapa de mesas (US-08) y traslado de mesa (US-05).
// socket.io-client y fetch se sustituyen por dobles: no se usa red ni backend real.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, within } from '@testing-library/react';
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

  test('cambio_estado_pedido actualiza el estado de esa mesa en el mapa', async () => {
    await renderizarConectado();
    expect(screen.getByTitle('Mesa 2 — Ocupada')).toBeInTheDocument();
    await servidor('cambio_estado_pedido', { mesa: 'Mesa 2', estado: 'En Cocina 🍳' });
    expect(screen.getByTitle('Mesa 2 — En cocina')).toHaveAttribute('data-estado', 'cocina');
    await servidor('cambio_estado_pedido', { mesa: 'Mesa 2', estado: 'Listo 🍽️' });
    expect(screen.getByTitle('Mesa 2 — Pedido listo')).toBeInTheDocument();
    // Las demás mesas no cambian
    expect(screen.getByTitle('Mesa 1 — Libre')).toBeInTheDocument();
  });

  test('estado_mesas trae el estado del pedido y reemplaza lo que había', async () => {
    await renderizarConectado();
    await servidor('estado_mesas', [
      { id: 'Mesa 1', numero: 1, estado: 'ocupada', estadoPedido: 'Recibido 📝' },
      { id: 'Mesa 2', numero: 2, estado: 'libre', estadoPedido: null }
    ]);
    expect(screen.getByTitle('Mesa 1 — Pedido tomado')).toBeInTheDocument();
    expect(screen.getByTitle('Mesa 2 — Libre')).toBeInTheDocument();
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
    expect(document.getElementById('estado-mesa')).toHaveTextContent('Libre');
    await servidor('estado_mesas', [{ id: 'Mesa 1', numero: 1, estado: 'ocupada' }, mesasBase[1]]);
    expect(document.getElementById('estado-mesa')).toHaveTextContent('Ocupada');
  });

  test('si la mesa seleccionada desaparece de estado_mesas, el panel se cierra', async () => {
    await renderizarConectado();
    await userEvent.click(screen.getByTitle(/Mesa 1/));
    expect(screen.getByRole('dialog', { name: 'Detalle de la mesa 1' })).toBeInTheDocument();
    await servidor('estado_mesas', [mesasBase[1]]);
    expect(document.getElementById('detalle-mesa-panel')).toBeEmptyDOMElement();
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

describe('App: avanzar el pedido desde el panel de la mesa', () => {
  const abrirPanel = async (numero) => {
    await userEvent.click(screen.getByTitle(new RegExp(`Mesa ${numero} —`)));
    return screen.getByRole('dialog', { name: `Detalle de la mesa ${numero}` });
  };

  test('registrar el pedido emite actualizar_pedido con la mesa del panel', async () => {
    await renderizarConectado();
    await abrirPanel(2);
    await userEvent.click(screen.getByRole('button', { name: 'Registrar pedido sin productos' }));
    expect(socket.emitirMock).toHaveBeenCalledWith('actualizar_pedido', {
      mesa: 'Mesa 2',
      estado: 'Recibido 📝'
    });
  });

  test('al llegar cambio_estado_pedido el panel abierto ofrece el paso siguiente', async () => {
    await renderizarConectado();
    await abrirPanel(2);
    expect(screen.queryByRole('button', { name: /Enviar a cocina/ })).not.toBeInTheDocument();

    await servidor('cambio_estado_pedido', { mesa: 'Mesa 2', estado: 'Recibido 📝' });
    await userEvent.click(screen.getByRole('button', { name: /Enviar a cocina/ }));
    expect(socket.emitirMock).toHaveBeenLastCalledWith('actualizar_pedido', {
      mesa: 'Mesa 2',
      estado: 'En Cocina 🍳'
    });

    await servidor('cambio_estado_pedido', { mesa: 'Mesa 2', estado: 'En Cocina 🍳' });
    await userEvent.click(screen.getByRole('button', { name: /Marcar pedido listo/ }));
    expect(socket.emitirMock).toHaveBeenLastCalledWith('actualizar_pedido', {
      mesa: 'Mesa 2',
      estado: 'Listo 🍽️'
    });
  });

  test('un rechazo del backend se muestra dentro del panel abierto, una sola vez', async () => {
    await renderizarConectado();
    const panel = await abrirPanel(2);
    await servidor('respuesta_pedido', {
      ok: false,
      tipo: 'ESTADO_NO_PERMITIDO',
      error: 'Transición no permitida: En Cocina 🍳 → En Cocina 🍳',
      esperado: 'Listo 🍽️'
    });
    expect(within(panel).getByRole('alert')).toHaveTextContent(
      /ESTADO_NO_PERMITIDO.*Transición no permitida.*Esperado: Listo/
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  test('al abrir el panel de otra mesa no aparece el aviso de la anterior', async () => {
    await renderizarConectado();
    await abrirPanel(2);
    await servidor('respuesta_pedido', { ok: false, tipo: 'ESTADO_NO_PERMITIDO', error: 'no' });
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    await abrirPanel(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('sin conexión las acciones del panel quedan deshabilitadas', async () => {
    await renderizarConectado();
    await abrirPanel(2);
    await servidor('disconnect');
    expect(screen.getByRole('button', { name: 'Registrar pedido sin productos' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Liberar mesa' })).toBeDisabled();
  });
});

describe('App: trasladar desde el panel de la mesa (US-05)', () => {
  const mesasConPedido = [
    { id: 'Mesa 1', numero: 1, estado: 'libre', estadoPedido: null },
    { id: 'Mesa 2', numero: 2, estado: 'ocupada', estadoPedido: 'En Cocina 🍳' },
    { id: 'Mesa 3', numero: 3, estado: 'libre', estadoPedido: null }
  ];

  async function abrirPanelMesa2() {
    await renderizarConectado();
    await servidor('estado_mesas', mesasConPedido);
    await userEvent.click(screen.getByTitle(/Mesa 2 —/));
  }

  test('elegir el destino y trasladar emite trasladar_pedido con números', async () => {
    await abrirPanelMesa2();
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    await userEvent.click(screen.getByRole('button', { name: /Trasladar a Mesa 3/ }));
    expect(socket.emitirMock).toHaveBeenCalledWith('trasladar_pedido', { origen: 2, destino: 3 });
  });

  test('si el destino desaparece antes de confirmar, no se emite y se avisa', async () => {
    await abrirPanelMesa2();
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    // Otra tablet quita la mesa 3: el destino ya no se ofrece y no se puede trasladar
    await servidor('estado_mesas', mesasConPedido.slice(0, 2));
    expect(screen.getByRole('button', { name: /Trasladar pedido/ })).toBeDisabled();
    expect(socket.emitirMock).not.toHaveBeenCalledWith('trasladar_pedido', expect.anything());
  });

  test('el resultado sigue visible cuando la mesa de origen queda libre', async () => {
    await abrirPanelMesa2();
    await servidor('respuesta_traslado', {
      ok: true,
      origen: 'Mesa 2',
      destino: 'Mesa 3',
      estado: 'En Cocina 🍳'
    });
    // El backend avisa el nuevo estado: la mesa 2 queda libre y la 3 ocupada
    await servidor('estado_mesas', [
      mesasConPedido[0],
      { ...mesasConPedido[1], estado: 'libre', estadoPedido: null },
      { ...mesasConPedido[2], estado: 'ocupada', estadoPedido: 'En Cocina 🍳' }
    ]);
    expect(document.getElementById('estado-mesa')).toHaveTextContent('Libre');
    expect(document.getElementById('mensaje-traslado')).toHaveTextContent(
      '✅ Pedido trasladado: Mesa 2 → Mesa 3 (En Cocina 🍳)'
    );
  });

  test('un rechazo del backend se muestra en el panel con tipo, motivo y lo esperado', async () => {
    await abrirPanelMesa2();
    await servidor('respuesta_traslado', {
      ok: false,
      tipo: 'ESTADO_NO_PERMITIDO',
      error: 'La mesa 3 no está disponible para recibir el traslado.',
      esperado: 'Mesa de destino en estado "libre"'
    });
    expect(document.getElementById('mensaje-traslado')).toHaveTextContent(
      /ESTADO_NO_PERMITIDO.*no está disponible.*Esperado: Mesa de destino/
    );
  });

  test('al abrir otra mesa no aparece el resultado del traslado anterior', async () => {
    await abrirPanelMesa2();
    await servidor('respuesta_traslado', { ok: false, tipo: 'X', error: 'fallo' });
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    await userEvent.click(screen.getByTitle(/Mesa 1 —/));
    expect(document.getElementById('mensaje-traslado')).not.toBeInTheDocument();
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

describe('App: interfaz visual (#77)', () => {
  test('el encabezado reúne título, indicador de conexión y selector de tema', async () => {
    await renderizarConectado();
    const encabezado = screen.getByRole('banner');
    expect(
      within(encabezado).getByRole('heading', { level: 1, name: /Monitor de Pedidos/ })
    ).toBeInTheDocument();
    expect(within(encabezado).getByRole('status')).toHaveTextContent('Sistema Conectado');
    expect(within(encabezado).getByRole('button', { name: /Modo (claro|oscuro)/ })).toBeVisible();
  });

  test('los campos se identifican por su rótulo', async () => {
    await renderizarConectado();
    expect(screen.getByLabelText('Número de mesa')).toBe(document.getElementById('input-mesa'));
    expect(screen.getByLabelText('Mesa origen')).toBe(document.getElementById('input-mesa-origen'));
    expect(screen.getByLabelText('Mesa destino')).toBe(
      document.getElementById('input-mesa-destino')
    );
  });

  test('sin pedidos la píldora usa el tono neutro y no hay contador', async () => {
    await renderizarConectado();
    expect(screen.getByText('Sin Pedidos').style.borderColor).toBe('var(--color-borde)');
    expect(screen.queryByText(/⏱️/)).not.toBeInTheDocument();
  });

  test.each([
    ['Recibido 📝', 'var(--color-azafran)'],
    ['En Cocina 🍳', 'var(--color-acento)'],
    ['Listo 🍽️', 'var(--color-exito)']
  ])('la píldora del estado "%s" usa su color propio', async (estado, borde) => {
    await renderizarConectado();
    await servidor('cambio_estado_pedido', { mesa: 'Mesa 4', estado });
    expect(screen.getByText(estado).style.borderColor).toBe(borde);
  });

  test('un error de validación se anuncia como alerta', async () => {
    await renderizarConectado();
    fireEvent.change(document.getElementById('input-mesa'), { target: { value: '-1' } });
    expect(screen.getByRole('alert')).toHaveTextContent('⚠️');
  });

  test('el resultado del traslado se anuncia con tono de éxito', async () => {
    await renderizarConectado();
    await servidor('respuesta_traslado', {
      ok: true,
      origen: 'Mesa 2',
      destino: 'Mesa 6',
      estado: 'En Cocina 🍳'
    });
    const aviso = screen.getByText(/Pedido trasladado/);
    expect(aviso).toHaveAttribute('role', 'status');
    expect(aviso.style.borderColor).toBe('var(--color-exito)');
  });
});

describe('App: contador del pedido activo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Conecta, recibe un pedido en cocina y deja correr el reloj `segundos` segundos. */
  async function pedidoEnCocinaDurante(segundos) {
    render(<App />);
    await servidor('connect');
    await servidor('cambio_estado_pedido', { mesa: 'Mesa 4', estado: 'En Cocina 🍳' });
    act(() => vi.advanceTimersByTime(segundos * 1000));
    return screen.getByText(/⏱️/);
  }

  test('antes de 15 minutos el contador usa el tono normal', async () => {
    const contador = await pedidoEnCocinaDurante(900);
    expect(contador).toHaveTextContent('⏱️ 15:00');
    expect(contador.style.color).toBe('var(--color-acento-texto)');
  });

  test('pasados 15 minutos el contador cambia al tono de alerta', async () => {
    const contador = await pedidoEnCocinaDurante(901);
    expect(contador).toHaveTextContent('⏱️ 15:01');
    expect(contador.style.color).toBe('var(--color-peligro-texto)');
  });

  test('el contador se detiene en 99:59 para no desbordar', async () => {
    const contador = await pedidoEnCocinaDurante(6100);
    expect(contador).toHaveTextContent('⏱️ 99:59');
  });
});
