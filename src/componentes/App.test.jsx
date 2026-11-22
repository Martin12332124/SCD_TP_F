// Pruebas de App: validación defensiva en la frontera, eventos de socket,
// mapa de mesas (US-08) y traslado de mesa (US-05).
// socket.io-client y fetch se sustituyen por dobles: no se usa red ni backend real.
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
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
  render(<App socket={socket} />);
  await servidor('connect');
  await screen.findByText('Mesa 1');
}

describe('App: aviso de conexión con el restaurante (solo modo nube)', () => {
  afterEach(() => {
    delete socket.modo;
  });

  test('en modo local no hay aviso, aunque llegue el evento', async () => {
    await renderizarConectado();
    await servidor('estado_sincronizacion', new Date().toISOString());
    expect(document.getElementById('aviso-conexion-local')).toBeNull();
  });

  test('en modo nube se actualiza con cada estado_sincronizacion', async () => {
    socket.modo = 'nube';
    await renderizarConectado();
    expect(document.getElementById('aviso-conexion-local')).toBeNull(); // aún no se sabe
    await servidor('estado_sincronizacion', new Date().toISOString());
    expect(document.getElementById('aviso-conexion-local')).toHaveTextContent(
      'Conectado al sistema del restaurante'
    );
    await servidor('estado_sincronizacion', new Date(Date.now() - 10 * 60000).toISOString());
    expect(document.getElementById('aviso-conexion-local')).toHaveTextContent(
      /no está conectado desde las \d\d:\d\d/
    );
  });

  test('orden pendiente sin panel abierto: aviso neutral en la pantalla principal', async () => {
    await renderizarConectado();
    await servidor('respuesta_pedido', { ok: true, pendiente: true, mesa: 'Mesa 1' });
    expect(
      screen.getByText('Orden enviada. Se aplicará cuando el sistema del restaurante se conecte.')
    ).toHaveAttribute('role', 'status');
  });
});

describe('App: conexión', () => {
  test('arranca desconectada y deshabilita las acciones de la mesa', async () => {
    render(<App socket={socket} />);
    expect(screen.getByText(/Servidor Desconectado/)).toBeInTheDocument();
    await userEvent.click(await screen.findByTitle(/Mesa 2 —/));
    expect(screen.getByRole('button', { name: 'Registrar pedido sin productos' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Liberar mesa' })).toBeDisabled();
  });

  test('connect/disconnect actualizan el indicador', async () => {
    render(<App socket={socket} />);
    await servidor('connect');
    expect(screen.getByText(/Sistema Conectado/)).toBeInTheDocument();
    await servidor('disconnect');
    expect(screen.getByText(/Servidor Desconectado/)).toBeInTheDocument();
  });
});

describe('App: sin escribir números de mesa', () => {
  test('la pantalla principal no tiene campos para escribir números de mesa', async () => {
    await renderizarConectado();
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.queryByText('Panel de control')).not.toBeInTheDocument();
    expect(screen.queryByText('Traslado de mesa')).not.toBeInTheDocument();
  });

  test('el cambio de estado se emite con la mesa del panel en formato "Mesa N"', async () => {
    await renderizarConectado();
    await servidor('estado_mesas', [
      mesasBase[0],
      { ...mesasBase[1], estadoPedido: 'Recibido 📝' }
    ]);
    await userEvent.click(screen.getByTitle(/Mesa 2 —/));
    await userEvent.click(screen.getByRole('button', { name: /Enviar a cocina/ }));
    expect(socket.emitirMock).toHaveBeenCalledWith('actualizar_pedido', {
      mesa: 'Mesa 2',
      estado: 'En Cocina 🍳'
    });
  });
});

describe('App: eventos del servidor', () => {
  test('cambio_estado_pedido pone la comanda de esa mesa en el riel con su tiempo en 00:00', async () => {
    await renderizarConectado();
    await servidor('cambio_estado_pedido', { mesa: 'Mesa 2', estado: 'Recibido 📝' });
    const comanda = document.getElementById('comanda-2');
    expect(comanda).toHaveTextContent('Mesa 2');
    expect(comanda.querySelector('[data-tiempo]')).toHaveTextContent('00:00');
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
    render(<App socket={socket} />);
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
    await userEvent.click(await screen.findByRole('button', { name: /Tomar pedido/ }));
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

  test('traslado pendiente (modo nube): mensaje neutral, no "Pedido trasladado"', async () => {
    await abrirPanelMesa2();
    await servidor('respuesta_traslado', {
      ok: true,
      pendiente: true,
      origen: 'Mesa 2',
      destino: 'Mesa 3',
      estado: 'orden en cola: el local no responde todavía'
    });
    const aviso = document.getElementById('mensaje-traslado');
    expect(aviso).toHaveTextContent(
      'Orden enviada. Se aplicará cuando el sistema del restaurante se conecte.'
    );
    expect(aviso).not.toHaveTextContent('trasladado');
  });

  test('cambio de estado pendiente: el panel muestra el aviso neutral, y un rechazo posterior lo reemplaza', async () => {
    await abrirPanelMesa2();
    await servidor('respuesta_pedido', { ok: true, pendiente: true, mesa: 'Mesa 2' });
    expect(document.getElementById('aviso-orden-pendiente')).toHaveTextContent(
      'Orden enviada. Se aplicará cuando el sistema del restaurante se conecte.'
    );
    expect(document.getElementById('error-pedido-mesa')).toBeNull();
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

describe('App: configurar mesas', () => {
  test('"Configurar mesas" abre la pantalla de administración y "Volver" la cierra', async () => {
    await renderizarConectado();
    await userEvent.click(screen.getByRole('button', { name: /Configurar mesas/ }));
    expect(screen.getByRole('dialog', { name: 'Configurar mesas' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Volver a la sala/ }));
    expect(screen.queryByRole('dialog', { name: 'Configurar mesas' })).not.toBeInTheDocument();
  });

  test('abrir la administración cierra el panel de la mesa', async () => {
    await renderizarConectado();
    await userEvent.click(screen.getByTitle(/Mesa 1 —/));
    await userEvent.click(screen.getByRole('button', { name: /Configurar mesas/ }));
    expect(document.getElementById('detalle-mesa-panel')).toBeEmptyDOMElement();
  });

  test('cuando otra tablet agrega o quita una mesa, la sala y la lista se actualizan', async () => {
    await renderizarConectado();
    await userEvent.click(screen.getByRole('button', { name: /Configurar mesas/ }));
    await servidor('estado_mesas', [
      ...mesasBase,
      { id: 'Mesa 7', numero: 7, estado: 'libre', estadoPedido: null }
    ]);
    expect(document.getElementById('fila-mesa-7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Agregar mesa 8' })).toBeInTheDocument();

    await servidor('estado_mesas', [mesasBase[1]]);
    expect(document.getElementById('fila-mesa-1')).not.toBeInTheDocument();
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

  test('sin pedidos el riel lo dice y no hay temporizadores', async () => {
    await renderizarConectado();
    expect(document.getElementById('resumen-comandas')).toHaveTextContent('Sin comandas en curso');
    expect(document.querySelector('[data-tiempo]')).not.toBeInTheDocument();
  });

  test.each([
    ['Recibido 📝', 'recibido', 'Pedido tomado'],
    ['En Cocina 🍳', 'cocina', 'En cocina'],
    ['Listo 🍽️', 'listo', 'Pedido listo']
  ])(
    'la comanda en "%s" usa el mismo color y nombre que la mesa en el plano',
    async (estado, clave, etiqueta) => {
      await renderizarConectado();
      await servidor('cambio_estado_pedido', { mesa: 'Mesa 2', estado });
      const comanda = document.getElementById('comanda-2');
      expect(comanda).toHaveAttribute('data-estado', clave);
      expect(comanda).toHaveTextContent(etiqueta);
      expect(screen.getByTitle(`Mesa 2 — ${etiqueta}`)).toHaveAttribute('data-estado', clave);
    }
  );

  test('un rechazo del backend sin panel abierto se anuncia como alerta', async () => {
    await renderizarConectado();
    await servidor('respuesta_pedido', { ok: false, tipo: 'ENTRADA_INVALIDA', error: 'mesa' });
    expect(screen.getByRole('alert')).toHaveTextContent('⚠️');
  });

  test('el resultado del traslado se anuncia con tono de éxito', async () => {
    await renderizarConectado();
    await userEvent.click(screen.getByTitle(/Mesa 1 —/));
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

describe('App: riel de comandas con varias mesas', () => {
  const conPedidos = [
    { id: 'Mesa 1', numero: 1, estado: 'libre', estadoPedido: null, pedidoDesde: null },
    {
      id: 'Mesa 3',
      numero: 3,
      estado: 'ocupada',
      estadoPedido: 'En Cocina 🍳',
      pedidoDesde: new Date(Date.now() - 5 * 60 * 1000).toISOString()
    },
    {
      id: 'Mesa 4',
      numero: 4,
      estado: 'ocupada',
      estadoPedido: 'Recibido 📝',
      pedidoDesde: new Date(Date.now() - 60 * 1000).toISOString()
    },
    { id: 'Mesa 6', numero: 6, estado: 'libre', estadoPedido: null, pedidoDesde: null }
  ];

  test('muestra todas las comandas en curso, no solo la última', async () => {
    await renderizarConectado();
    await servidor('estado_mesas', conPedidos);
    expect(document.getElementById('comanda-3')).toBeInTheDocument();
    expect(document.getElementById('comanda-4')).toBeInTheDocument();
    expect(document.getElementById('resumen-comandas')).toHaveTextContent('2 en curso');
  });

  test('al trasladar un pedido, su comanda pasa a la mesa nueva con el mismo tiempo', async () => {
    await renderizarConectado();
    await servidor('estado_mesas', conPedidos);
    const antes = document.getElementById('comanda-3').querySelector('[data-tiempo]').textContent;

    // El backend avisa el traslado 3 → 6 con la lista de mesas actualizada
    await servidor('estado_mesas', [
      conPedidos[0],
      { ...conPedidos[1], estado: 'libre', estadoPedido: null, pedidoDesde: null },
      conPedidos[2],
      { ...conPedidos[1], id: 'Mesa 6', numero: 6 }
    ]);

    expect(document.getElementById('comanda-3')).not.toBeInTheDocument();
    const comanda6 = document.getElementById('comanda-6');
    expect(comanda6).toHaveTextContent('Mesa 6');
    expect(comanda6.querySelector('[data-tiempo]').textContent).toBe(antes);
  });

  test('tocar una comanda abre el panel de esa mesa', async () => {
    await renderizarConectado();
    await servidor('estado_mesas', conPedidos);
    await userEvent.click(document.getElementById('comanda-4'));
    expect(screen.getByRole('dialog', { name: 'Detalle de la mesa 4' })).toBeInTheDocument();
  });

  test('cuando un pedido se cierra (mesa liberada), su comanda sale del riel', async () => {
    await renderizarConectado();
    await servidor('estado_mesas', conPedidos);
    await servidor('estado_mesas', [conPedidos[0], conPedidos[2], conPedidos[3]]);
    expect(document.getElementById('comanda-3')).not.toBeInTheDocument();
    expect(document.getElementById('resumen-comandas')).toHaveTextContent('1 en curso');
  });
});

describe('App: temporizador de cada comanda', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Conecta, recibe un pedido en cocina y deja correr el reloj `segundos` segundos. */
  async function pedidoEnCocinaDurante(segundos) {
    render(<App socket={socket} />);
    await servidor('connect');
    await servidor('estado_mesas', mesasBase);
    await servidor('cambio_estado_pedido', { mesa: 'Mesa 2', estado: 'En Cocina 🍳' });
    act(() => vi.advanceTimersByTime(segundos * 1000));
    return document.getElementById('comanda-2');
  }

  const tiempo = (comanda) => comanda.querySelector('[data-tiempo]');

  test('hasta 15 minutos la comanda queda normal', async () => {
    const comanda = await pedidoEnCocinaDurante(900);
    expect(tiempo(comanda)).toHaveTextContent('15:00');
    expect(comanda).toHaveAttribute('data-urgencia', 'normal');
    expect(comanda.style.background).toBe('var(--papel)');
  });

  test('pasados 15 minutos toda la comanda cambia al tono de atención', async () => {
    const comanda = await pedidoEnCocinaDurante(901);
    expect(tiempo(comanda)).toHaveTextContent('15:01');
    expect(comanda).toHaveAttribute('data-urgencia', 'atencion');
    expect(comanda.style.background).toBe('var(--papel-atencion)');
    expect(comanda).toHaveTextContent('Más de 15 min');
  });

  test('pasados 20 minutos la comanda queda roja y dice "Atrasado"', async () => {
    const comanda = await pedidoEnCocinaDurante(1201);
    expect(comanda).toHaveAttribute('data-urgencia', 'atrasado');
    expect(comanda.style.background).toBe('var(--papel-atraso)');
    expect(comanda).toHaveTextContent('Atrasado');
    expect(document.getElementById('resumen-comandas')).toHaveTextContent('1 en curso, 1 atrasada');
  });

  test('el temporizador se detiene en 99:59 para no desbordar', async () => {
    const comanda = await pedidoEnCocinaDurante(6100);
    expect(tiempo(comanda)).toHaveTextContent('99:59');
  });
});
