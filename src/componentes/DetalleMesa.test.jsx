// Pruebas de DetalleMesa (US-08 CA5 y US-09): panel lateral, abrir/liberar y resumen.
// El backend se sustituye por un fetch simulado (sin red).
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DetalleMesa from './DetalleMesa';

const libre = { id: 'Mesa 1', numero: 1, estado: 'libre' };
const ocupada = { id: 'Mesa 2', numero: 2, estado: 'ocupada' };

const resumenConItems = {
  ok: true,
  estado: 'En Cocina 🍳',
  total: 12500,
  items: [
    { id: 1, nombre: 'Pizza Margarita', precioBase: 8500, cantidad: 1 },
    { id: 2, nombre: 'Coca-Cola 500 ml', precioBase: 2000, cantidad: 2 }
  ]
};

/** Simula el backend: `rutas` mapea sufijo de URL -> respuesta JSON (o Error para fallo de red). */
function simularBackend(rutas) {
  const fetchFalso = vi.fn(async (url) => {
    const clave = Object.keys(rutas).find((k) => url.endsWith(k));
    const respuesta = clave ? rutas[clave] : { ok: true, items: [], total: 0, estado: '' };
    if (respuesta instanceof Error) throw respuesta;
    return { json: async () => respuesta };
  });
  vi.stubGlobal('fetch', fetchFalso);
  return fetchFalso;
}

function renderizar(mesa, props = {}) {
  const onCerrar = vi.fn();
  const onTomarPedido = vi.fn();
  render(
    <DetalleMesa
      mesa={mesa}
      conectado
      onCerrar={onCerrar}
      onTomarPedido={onTomarPedido}
      {...props}
    />
  );
  return { onCerrar, onTomarPedido };
}

beforeEach(() => {
  simularBackend({});
});

describe('DetalleMesa: visualización (US-08 CA5)', () => {
  test('sin mesa seleccionada no renderiza contenido del panel', () => {
    renderizar(null);
    expect(document.getElementById('detalle-mesa-panel')).toBeEmptyDOMElement();
  });

  test('mesa libre: muestra número, estado Libre y "Sin cuenta abierta"', () => {
    renderizar(libre);
    expect(screen.getByRole('heading', { name: 'Mesa 1' })).toBeInTheDocument();
    expect(document.getElementById('estado-mesa')).toHaveTextContent('Libre');
    expect(screen.getByText('Sin cuenta abierta.')).toBeInTheDocument();
  });

  test('mesa ocupada con pedido: muestra ítems, estado del pedido y total', async () => {
    simularBackend({ '/api/mesas/2/pedido': resumenConItems });
    renderizar(ocupada);
    expect(await screen.findByText(/Pizza Margarita/)).toBeInTheDocument();
    expect(screen.getByText(/2 × Coca-Cola 500 ml/)).toBeInTheDocument();
    expect(document.getElementById('estado-mesa')).toHaveTextContent('En cocina');
    expect(screen.getByText(/12\.500/)).toBeInTheDocument();
  });

  test('mesa ocupada sin ítems: indica que aún no se pidió nada', async () => {
    renderizar(ocupada);
    expect(await screen.findByText(/Aún no se ha pedido nada/)).toBeInTheDocument();
  });

  test('si el resumen responde error, lo muestra', async () => {
    simularBackend({ '/api/mesas/2/pedido': { ok: false, error: 'Resumen no disponible' } });
    renderizar(ocupada);
    expect(await screen.findByText(/Resumen no disponible/)).toBeInTheDocument();
  });

  test('si falla la red al cargar el resumen, muestra el error de red', async () => {
    simularBackend({ '/api/mesas/2/pedido': new Error('sin red') });
    renderizar(ocupada);
    expect(await screen.findByText(/Error de red al cargar el resumen/)).toBeInTheDocument();
  });

  test('el botón ✕ y el overlay llaman a onCerrar', async () => {
    const { onCerrar } = renderizar(libre);
    await userEvent.click(screen.getByTitle('Cerrar panel'));
    await userEvent.click(document.getElementById('detalle-mesa-overlay'));
    expect(onCerrar).toHaveBeenCalledTimes(2);
  });
});

describe('DetalleMesa: abrir mesa (US-09 CA1)', () => {
  test('mesa libre muestra "Abrir mesa" y no "Liberar"', () => {
    renderizar(libre);
    expect(screen.getByText(/Abrir mesa/)).toBeInTheDocument();
    expect(screen.queryByText(/Liberar mesa/)).not.toBeInTheDocument();
  });

  test('abrir con éxito llama a POST /abrir y confirma', async () => {
    const fetchFalso = simularBackend({
      '/api/mesas/1/abrir': { ok: true, mesa: 'Mesa 1', estado: 'ocupada' }
    });
    renderizar(libre);
    await userEvent.click(screen.getByText(/Abrir mesa/));
    expect(await screen.findByText(/Mesa marcada como Ocupada/)).toBeInTheDocument();
    expect(fetchFalso).toHaveBeenCalledWith(
      'http://localhost:3000/api/mesas/1/abrir',
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('si el backend rechaza (ESTADO_NO_PERMITIDO) muestra tipo y motivo', async () => {
    simularBackend({
      '/api/mesas/1/abrir': {
        ok: false,
        tipo: 'ESTADO_NO_PERMITIDO',
        error: 'La mesa ya está ocupada'
      }
    });
    renderizar(libre);
    await userEvent.click(screen.getByText(/Abrir mesa/));
    expect(await screen.findByText(/ESTADO_NO_PERMITIDO.*ya está ocupada/)).toBeInTheDocument();
  });

  test('si falla la red al abrir muestra el error de red', async () => {
    simularBackend({ '/api/mesas/1/abrir': new Error('sin red') });
    renderizar(libre);
    await userEvent.click(screen.getByText(/Abrir mesa/));
    expect(await screen.findByText(/Error de red al intentar abrir/)).toBeInTheDocument();
  });

  test('desconectado: el botón Abrir queda deshabilitado', () => {
    renderizar(libre, { conectado: false });
    expect(screen.getByText(/Abrir mesa/)).toBeDisabled();
  });
});

describe('DetalleMesa: liberar mesa (US-09 CA3 y CA4)', () => {
  test('mesa ocupada muestra "Liberar mesa" y "Tomar pedido", no "Abrir"', () => {
    renderizar(ocupada);
    expect(screen.getByText(/Liberar mesa/)).toBeInTheDocument();
    expect(screen.getByText(/Tomar pedido/)).toBeInTheDocument();
    expect(screen.queryByText(/Abrir mesa/)).not.toBeInTheDocument();
  });

  test('CA4: liberar una mesa sin actividad confirma', async () => {
    simularBackend({ '/api/mesas/2/cerrar': { ok: true, mesa: 'Mesa 2', estado: 'libre' } });
    renderizar(ocupada);
    await userEvent.click(screen.getByText(/Liberar mesa/));
    expect(await screen.findByText(/Mesa liberada correctamente/)).toBeInTheDocument();
  });

  test('REGRESIÓN US-09 CA3: con pedido activo muestra PEDIDO_ACTIVO y el motivo', async () => {
    simularBackend({
      '/api/mesas/2/cerrar': {
        ok: false,
        tipo: 'PEDIDO_ACTIVO',
        error: 'No se puede liberar una mesa con pedido activo'
      }
    });
    renderizar(ocupada);
    await userEvent.click(screen.getByText(/Liberar mesa/));
    expect(await screen.findByText(/PEDIDO_ACTIVO.*pedido activo/)).toBeInTheDocument();
  });

  test('si falla la red al liberar muestra el error de red', async () => {
    simularBackend({ '/api/mesas/2/cerrar': new Error('sin red') });
    renderizar(ocupada);
    await userEvent.click(screen.getByText(/Liberar mesa/));
    expect(await screen.findByText(/Error de red al intentar liberar/)).toBeInTheDocument();
  });

  test('"Tomar pedido" cierra el panel y abre la vista de pedido con la mesa', async () => {
    const { onCerrar, onTomarPedido } = renderizar(ocupada);
    await userEvent.click(screen.getByText(/Tomar pedido/));
    await waitFor(() => expect(onTomarPedido).toHaveBeenCalledWith(ocupada));
    expect(onCerrar).toHaveBeenCalled();
  });
});

describe('DetalleMesa: presentación y accesibilidad (#77)', () => {
  test('con mesa seleccionada el panel es un diálogo con nombre', () => {
    renderizar(libre);
    expect(screen.getByRole('dialog', { name: 'Detalle de la mesa 1' })).toBeInTheDocument();
  });

  test('sin mesa el panel queda oculto para lectores de pantalla', () => {
    renderizar(null);
    expect(document.getElementById('detalle-mesa-panel')).toHaveAttribute('aria-hidden', 'true');
  });

  test('el botón de cierre tiene nombre accesible', async () => {
    const { onCerrar } = renderizar(libre);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    expect(onCerrar).toHaveBeenCalled();
  });

  test('la franja de estado usa el color de mesa libre o el de mesa ocupada', () => {
    const { unmount } = render(
      <DetalleMesa mesa={libre} conectado onCerrar={() => {}} onTomarPedido={() => {}} />
    );
    const franjaLibre = document.getElementById('estado-mesa');
    expect(franjaLibre).toHaveAttribute('data-estado', 'libre');
    expect(franjaLibre.style.background).toBe('var(--mesa-libre)');
    unmount();
    renderizar(ocupada);
    const franjaOcupada = document.getElementById('estado-mesa');
    expect(franjaOcupada).toHaveTextContent('Ocupada');
    expect(franjaOcupada.style.background).toBe('var(--mesa-ocupada)');
  });

  test('"Tomar pedido" es la acción principal en mesas ocupadas', () => {
    renderizar(ocupada);
    expect(screen.getByText(/Tomar pedido/).style.background).toBe('var(--color-primario)');
  });

  test('el resultado de abrir la mesa se anuncia con role status', async () => {
    simularBackend({ '/api/mesas/1/abrir': { ok: true } });
    renderizar(libre);
    await userEvent.click(screen.getByText(/Abrir mesa/));
    expect(await screen.findByRole('status')).toHaveTextContent('Mesa marcada como Ocupada');
  });

  test('la cuenta se muestra como ticket con ítems y total; el estado va en el progreso', async () => {
    simularBackend({ '/api/mesas/2/pedido': resumenConItems });
    renderizar(ocupada);
    const ticket = await screen
      .findByText(/Pizza Margarita/)
      .then((el) => el.closest('#resumen-pedido'));
    expect(within(ticket).getAllByRole('listitem')).toHaveLength(2);
    const progreso = screen.getByRole('list', { name: 'Progreso del pedido' });
    expect(within(progreso).getByText('En cocina')).toHaveAttribute('aria-current', 'step');
    const total = document.getElementById('resumen-total');
    expect(total).toHaveTextContent('Total acumulado');
    expect(total).toHaveTextContent(/12\.500/);
  });
});


describe('DetalleMesa: avanzar el pedido desde la mesa', () => {
  const conPedido = (estadoPedido) => ({ ...ocupada, estadoPedido });

  test('pedido Recibido: "Enviar a cocina" pide el cambio para esa mesa', async () => {
    const onCambiarEstado = vi.fn();
    renderizar(conPedido('Recibido 📝'), { onCambiarEstado });
    await userEvent.click(screen.getByRole('button', { name: /Enviar a cocina/ }));
    expect(onCambiarEstado).toHaveBeenCalledWith(2, 'En Cocina 🍳');
  });

  test('pedido En Cocina: "Marcar pedido listo" pide el cambio para esa mesa', async () => {
    const onCambiarEstado = vi.fn();
    renderizar(conPedido('En Cocina 🍳'), { onCambiarEstado });
    await userEvent.click(screen.getByRole('button', { name: /Marcar pedido listo/ }));
    expect(onCambiarEstado).toHaveBeenCalledWith(2, 'Listo 🍽️');
  });

  test('sin pedido: "Registrar pedido sin productos" pide el estado Recibido', async () => {
    const onCambiarEstado = vi.fn();
    renderizar(conPedido(null), { onCambiarEstado });
    await userEvent.click(screen.getByRole('button', { name: 'Registrar pedido sin productos' }));
    expect(onCambiarEstado).toHaveBeenCalledWith(2, 'Recibido 📝');
  });

  test('cuando el estado del pedido cambia con el panel abierto, el botón pasa al paso siguiente', () => {
    // El estado llega en la propia mesa (lo actualiza App con cambio_estado_pedido),
    // así que no depende de volver a cargar la cuenta.
    const props = { conectado: true, onCerrar: () => {}, onTomarPedido: () => {} };
    const { rerender } = render(<DetalleMesa mesa={conPedido('Recibido 📝')} {...props} />);
    expect(screen.getByRole('button', { name: /Enviar a cocina/ })).toBeInTheDocument();

    rerender(<DetalleMesa mesa={conPedido('En Cocina 🍳')} {...props} />);
    expect(screen.queryByRole('button', { name: /Enviar a cocina/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Marcar pedido listo/ })).toBeInTheDocument();
    expect(document.getElementById('estado-mesa')).toHaveAttribute('data-estado', 'cocina');
  });

  test('si la mesa no trae estadoPedido (backend anterior) usa el estado de la cuenta', async () => {
    simularBackend({ '/api/mesas/2/pedido': resumenConItems });
    renderizar(ocupada);
    expect(await screen.findByRole('button', { name: /Marcar pedido listo/ })).toBeInTheDocument();
  });

  test('pedido Listo: la franja lo indica, no hay avance y avisa qué hace liberar la mesa', () => {
    renderizar(conPedido('Listo 🍽️'));
    expect(document.getElementById('estado-mesa')).toHaveTextContent('Pedido listo');
    expect(document.getElementById('btn-avanzar-pedido')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Al liberar la mesa se cierra su pedido y su cuenta/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Liberar mesa' })).toBeEnabled();
  });

  test('un rechazo del cambio de estado se muestra dentro del panel como alerta', () => {
    renderizar(conPedido('En Cocina 🍳'), {
      errorPedido: '⚠️ [ESTADO_NO_PERMITIDO] Transición no permitida'
    });
    const panel = screen.getByRole('dialog', { name: 'Detalle de la mesa 2' });
    expect(within(panel).getByRole('alert')).toHaveTextContent('Transición no permitida');
  });

  test('mesa libre: no muestra el progreso del pedido', () => {
    renderizar(libre);
    expect(screen.queryByRole('list', { name: 'Progreso del pedido' })).not.toBeInTheDocument();
  });

  test('mesa libre: "Tomar pedido" también abre la carta (el backend abre la mesa al confirmar)', async () => {
    const { onCerrar, onTomarPedido } = renderizar(libre);
    await userEvent.click(screen.getByRole('button', { name: /Tomar pedido/ }));
    expect(onTomarPedido).toHaveBeenCalledWith(libre);
    expect(onCerrar).toHaveBeenCalled();
  });
});

describe('DetalleMesa: trasladar el pedido (US-05)', () => {
  const mesas = [
    { id: 'Mesa 1', numero: 1, estado: 'libre', estadoPedido: null },
    { id: 'Mesa 2', numero: 2, estado: 'ocupada', estadoPedido: 'En Cocina 🍳' }
  ];

  test('con pedido muestra el bloque de traslado y traslada a la mesa elegida', async () => {
    const onTrasladar = vi.fn();
    renderizar(mesas[1], { mesas, onTrasladar });
    expect(screen.getByRole('heading', { name: 'Trasladar pedido' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '1' }));
    await userEvent.click(screen.getByRole('button', { name: /Trasladar a Mesa 1/ }));
    expect(onTrasladar).toHaveBeenCalledWith(2, 1);
  });

  test('una mesa ocupada sin pedido no ofrece trasladar (no hay nada que mover)', () => {
    renderizar({ ...mesas[1], estadoPedido: null }, { mesas });
    expect(screen.queryByRole('heading', { name: 'Trasladar pedido' })).not.toBeInTheDocument();
  });

  test('una mesa libre no ofrece trasladar', () => {
    renderizar(mesas[0], { mesas });
    expect(screen.queryByRole('heading', { name: 'Trasladar pedido' })).not.toBeInTheDocument();
  });

  test('el resultado del traslado se muestra aunque la mesa de origen ya quedó libre', () => {
    renderizar(mesas[0], {
      mesas,
      mensajeTraslado: '✅ Pedido trasladado: Mesa 2 → Mesa 1 (En Cocina 🍳)'
    });
    const aviso = document.getElementById('mensaje-traslado');
    expect(aviso).toHaveAttribute('role', 'status');
    expect(aviso).toHaveTextContent('Pedido trasladado: Mesa 2 → Mesa 1');
    expect(aviso.style.borderColor).toBe('var(--color-exito)');
  });

  test('un rechazo del traslado se muestra con tono de error', () => {
    renderizar(mesas[1], { mesas, mensajeTraslado: '⚠️ [ESTADO_NO_PERMITIDO] destino ocupado' });
    expect(document.getElementById('mensaje-traslado').style.borderColor).toBe(
      'var(--color-peligro)'
    );
  });
});

describe('DetalleMesa: los datos de una mesa no se mezclan con los de otra', () => {
  test('el resultado de abrir una mesa no aparece en el panel de otra mesa', async () => {
    simularBackend({ '/api/mesas/1/abrir': { ok: true } });
    const props = { conectado: true, onCerrar: () => {}, onTomarPedido: () => {} };
    const { rerender } = render(<DetalleMesa mesa={libre} {...props} />);
    await userEvent.click(screen.getByText(/Abrir mesa/));
    expect(await screen.findByText(/Mesa marcada como Ocupada/)).toBeInTheDocument();

    rerender(<DetalleMesa mesa={ocupada} {...props} />);
    expect(screen.queryByText(/Mesa marcada como Ocupada/)).not.toBeInTheDocument();
  });

  test('al cambiar de mesa no se muestra la cuenta de la anterior', async () => {
    simularBackend({ '/api/mesas/2/pedido': resumenConItems });
    const props = { conectado: true, onCerrar: () => {}, onTomarPedido: () => {} };
    const { rerender } = render(<DetalleMesa mesa={ocupada} {...props} />);
    await screen.findByText(/Pizza Margarita/);

    rerender(<DetalleMesa mesa={{ id: 'Mesa 3', numero: 3, estado: 'ocupada' }} {...props} />);
    expect(screen.queryByText(/Pizza Margarita/)).not.toBeInTheDocument();
    expect(await screen.findByText(/Aún no se ha pedido nada/)).toBeInTheDocument();
  });

  test('el panel ya no repite el ID interno ni el estado en una sección aparte', () => {
    renderizar(ocupada);
    expect(screen.queryByText('ID interno')).not.toBeInTheDocument();
  });
});

// Guía U3 · Protección previa a la refactorización de formatearPrecio.
describe('DetalleMesa: formato de precios (protección refactor U3)', () => {
  test('subtotales y total de la cuenta usan formato CLP exacto', async () => {
    simularBackend({ '/api/mesas/2/pedido': resumenConItems });
    renderizar(ocupada);
    await screen.findByText(/Pizza Margarita/);
    expect(screen.getByText('$8.500')).toBeInTheDocument(); // 1 × 8.500
    expect(screen.getByText('$4.000')).toBeInTheDocument(); // 2 × 2.000
    expect(document.getElementById('resumen-total')).toHaveTextContent('$12.500');
  });
});
