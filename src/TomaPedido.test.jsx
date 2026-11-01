// Pruebas de TomaPedido (US-04): carrito local, disponibilidad y confirmación.
// El menú se sustituye por un fetch simulado y el socket por un doble con emit/on/off.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TomaPedido from './TomaPedido';

const mesa = { id: 'Mesa 3', numero: 3, estado: 'ocupada' };

const menu = [
  { id: 1, nombre: 'Pizza Margarita', precioBase: 8500, disponible: true },
  { id: 2, nombre: 'Coca-Cola 500 ml', precioBase: 2000, disponible: true },
  { id: 3, nombre: 'Ensalada César', precioBase: 6500, disponible: false }
];

/** Doble de socket.io: guarda los listeners para poder dispararlos desde la prueba. */
function crearSocketFalso() {
  const escuchas = {};
  return {
    emit: vi.fn(),
    on: vi.fn((evento, fn) => {
      escuchas[evento] = fn;
    }),
    off: vi.fn((evento) => {
      delete escuchas[evento];
    }),
    disparar: (evento, datos) => escuchas[evento]?.(datos)
  };
}

function simularMenu(respuesta) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      if (respuesta instanceof Error) throw respuesta;
      return { ok: respuesta.httpOk ?? true, status: respuesta.status ?? 200, json: async () => respuesta };
    })
  );
}

async function renderizar({ conectado = true } = {}) {
  const socket = crearSocketFalso();
  const onCerrar = vi.fn();
  render(<TomaPedido mesa={mesa} socket={socket} conectado={conectado} onCerrar={onCerrar} />);
  return { socket, onCerrar };
}

const agregar = (id) => userEvent.click(document.getElementById(`btn-agregar-${id}`));

beforeEach(() => {
  simularMenu({ ok: true, items: menu });
});

describe('TomaPedido: carga del menú', () => {
  test('muestra "Cargando" y luego los productos con conteo', async () => {
    await renderizar();
    expect(screen.getByText(/Cargando menú/)).toBeInTheDocument();
    expect(await screen.findByText('Pizza Margarita')).toBeInTheDocument();
    expect(screen.getByText(/3 productos en el menú \(2 disponibles\)/)).toBeInTheDocument();
  });

  test('menú vacío muestra el aviso correspondiente', async () => {
    simularMenu({ ok: true, items: [] });
    await renderizar();
    expect(await screen.findByText(/no tiene ítems registrados/)).toBeInTheDocument();
  });

  test('si el backend responde ok:false muestra el error de carga', async () => {
    simularMenu({ ok: false });
    await renderizar();
    expect(await screen.findByText(/No se pudo cargar el menú/)).toBeInTheDocument();
  });

  test('si el servidor responde error HTTP muestra error de red', async () => {
    simularMenu({ httpOk: false, status: 500 });
    await renderizar();
    expect(await screen.findByText(/Error de red al cargar el menú/)).toBeInTheDocument();
  });

  test('si falla la red muestra el error de red', async () => {
    simularMenu(new Error('sin red'));
    await renderizar();
    expect(await screen.findByText(/Error de red al cargar el menú/)).toBeInTheDocument();
  });

  test('el botón Cerrar llama a onCerrar', async () => {
    const { onCerrar } = await renderizar();
    await userEvent.click(screen.getByText(/Cerrar/));
    expect(onCerrar).toHaveBeenCalled();
  });
});

describe('TomaPedido: disponibilidad (US-04 CA1-CA3)', () => {
  test('un producto agotado se etiqueta "Agotado" y su botón está deshabilitado', async () => {
    await renderizar();
    await screen.findByText('Ensalada César');
    expect(screen.getByText(/🚫 Agotado/)).toBeInTheDocument();
    expect(document.getElementById('btn-agregar-3')).toBeDisabled();
  });

  test('un producto agotado no se puede agregar al pedido', async () => {
    await renderizar();
    await screen.findByText('Ensalada César');
    await agregar(3);
    expect(screen.getByText(/Selecciona productos del menú/)).toBeInTheDocument();
  });

  test('un producto disponible se agrega al carrito', async () => {
    await renderizar();
    await screen.findByText('Pizza Margarita');
    await agregar(1);
    expect(document.getElementById('carrito-item-1')).toBeInTheDocument();
    expect(document.getElementById('cantidad-1')).toHaveTextContent('1');
  });
});

describe('TomaPedido: carrito y total', () => {
  test('el carrito vacío muestra el mensaje y no permite confirmar', async () => {
    await renderizar();
    await screen.findByText('Pizza Margarita');
    expect(screen.getByText(/Selecciona productos del menú/)).toBeInTheDocument();
    expect(document.getElementById('btn-confirmar-pedido')).toBeNull();
  });

  test('agregar el mismo producto dos veces incrementa la cantidad', async () => {
    await renderizar();
    await screen.findByText('Pizza Margarita');
    await agregar(1);
    await agregar(1);
    expect(document.getElementById('cantidad-1')).toHaveTextContent('2');
  });

  test('el total suma precio × cantidad de todos los productos', async () => {
    await renderizar();
    await screen.findByText('Pizza Margarita');
    await agregar(1); // 8.500
    await agregar(2); // 2.000
    await userEvent.click(document.getElementById('btn-incrementar-2')); // 2 × 2.000
    expect(document.getElementById('total-carrito')).toHaveTextContent('12.500');
  });

  test('decrementar hasta 0 elimina el ítem del carrito', async () => {
    await renderizar();
    await screen.findByText('Pizza Margarita');
    await agregar(1);
    await userEvent.click(document.getElementById('btn-decrementar-1'));
    expect(document.getElementById('carrito-item-1')).toBeNull();
  });

  test('decrementar con cantidad mayor a 1 solo resta uno', async () => {
    await renderizar();
    await screen.findByText('Pizza Margarita');
    await agregar(1);
    await agregar(1);
    await userEvent.click(document.getElementById('btn-decrementar-1'));
    expect(document.getElementById('cantidad-1')).toHaveTextContent('1');
  });

  test('quitar elimina el ítem completo y el total vuelve al estado vacío', async () => {
    await renderizar();
    await screen.findByText('Pizza Margarita');
    await agregar(1);
    await agregar(1);
    await userEvent.click(document.getElementById('btn-quitar-1'));
    expect(document.getElementById('carrito-item-1')).toBeNull();
    expect(screen.getByText(/Selecciona productos del menú/)).toBeInTheDocument();
  });
});

describe('TomaPedido: confirmación', () => {
  test('confirmar emite confirmar_pedido con mesa e ítems (solo id y cantidad)', async () => {
    const { socket } = await renderizar();
    await screen.findByText('Pizza Margarita');
    await agregar(1);
    await agregar(2);
    await agregar(2);
    await userEvent.click(document.getElementById('btn-confirmar-pedido'));
    expect(socket.emit).toHaveBeenCalledWith('confirmar_pedido', {
      mesa: 'Mesa 3',
      items: [
        { id: 1, cantidad: 1 },
        { id: 2, cantidad: 2 }
      ]
    });
    expect(screen.getByText('Enviando...')).toBeInTheDocument();
  });

  test('una respuesta ok del backend cierra la vista', async () => {
    const { socket, onCerrar } = await renderizar();
    await screen.findByText('Pizza Margarita');
    await agregar(1);
    await userEvent.click(document.getElementById('btn-confirmar-pedido'));
    socket.disparar('respuesta_pedido', { ok: true });
    await vi.waitFor(() => expect(onCerrar).toHaveBeenCalled());
  });

  test('una respuesta con error muestra el motivo y permite reintentar', async () => {
    const { socket, onCerrar } = await renderizar();
    await screen.findByText('Pizza Margarita');
    await agregar(1);
    await userEvent.click(document.getElementById('btn-confirmar-pedido'));
    socket.disparar('respuesta_pedido', { ok: false, error: 'Producto agotado', esperado: 'ítem disponible' });
    expect(await screen.findByText(/Producto agotado \(Esperado: ítem disponible\)/)).toBeInTheDocument();
    expect(onCerrar).not.toHaveBeenCalled();
    expect(document.getElementById('btn-confirmar-pedido')).toBeEnabled();
  });

  test('sin conexión el botón Confirmar está deshabilitado y avisa', async () => {
    const { socket } = await renderizar({ conectado: false });
    await screen.findByText('Pizza Margarita');
    await agregar(1);
    expect(document.getElementById('btn-confirmar-pedido')).toBeDisabled();
    expect(screen.getByText('Sin conexión con el servidor.')).toBeInTheDocument();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  test('al desmontarse deja de escuchar respuesta_pedido', async () => {
    const socket = crearSocketFalso();
    const { unmount } = render(
      <TomaPedido mesa={mesa} socket={socket} conectado onCerrar={() => {}} />
    );
    unmount();
    expect(socket.off).toHaveBeenCalledWith('respuesta_pedido', expect.any(Function));
  });
});
