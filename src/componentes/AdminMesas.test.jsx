// Pruebas de AdminMesas: agregar y quitar mesas, con confirmación y rechazos del backend.
// El backend se sustituye por un fetch simulado (sin red).
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminMesas from './AdminMesas';

const mesas = [
  { id: 'Mesa 1', numero: 1, estado: 'libre', estadoPedido: null },
  { id: 'Mesa 2', numero: 2, estado: 'ocupada', estadoPedido: 'En Cocina 🍳' },
  { id: 'Mesa 4', numero: 4, estado: 'libre', estadoPedido: null }
];

/** Simula el backend: `respuesta` es el JSON que devuelve (o un Error para fallo de red). */
function simularBackend(respuesta = { ok: true }) {
  const fetchFalso = vi.fn(async () => {
    if (respuesta instanceof Error) throw respuesta;
    return { json: async () => respuesta };
  });
  vi.stubGlobal('fetch', fetchFalso);
  return fetchFalso;
}

function renderizar(props = {}) {
  const onCerrar = vi.fn();
  render(<AdminMesas mesas={mesas} conectado onCerrar={onCerrar} {...props} />);
  return { onCerrar };
}

beforeEach(() => {
  simularBackend();
});

describe('AdminMesas: presentación', () => {
  test('es un diálogo propio, separado de la sala, y dice cuántas mesas hay', () => {
    renderizar();
    expect(screen.getByRole('dialog', { name: 'Configurar mesas' })).toBeInTheDocument();
    expect(screen.getByText(/El restaurante tiene/)).toHaveTextContent(
      'El restaurante tiene 3 mesas'
    );
  });

  test('lista cada mesa con su estado', () => {
    renderizar();
    expect(document.getElementById('fila-mesa-1')).toHaveTextContent('Mesa 1Libre');
    expect(document.getElementById('fila-mesa-2')).toHaveTextContent(
      'En cocina: libérala para quitarla'
    );
  });

  test('"Volver a la sala" llama a onCerrar', async () => {
    const { onCerrar } = renderizar();
    await userEvent.click(screen.getByRole('button', { name: /Volver a la sala/ }));
    expect(onCerrar).toHaveBeenCalled();
  });
});

describe('AdminMesas: agregar', () => {
  test('ofrece agregar la mesa siguiente a la más alta y llama al backend sin número', async () => {
    const fetchFalso = simularBackend({ ok: true, mesa: { id: 'Mesa 5', numero: 5 } });
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: '+ Agregar mesa 5' }));
    expect(fetchFalso).toHaveBeenCalledWith(
      'http://localhost:3000/api/mesas',
      expect.objectContaining({ method: 'POST', body: '{}' })
    );
    expect(await screen.findByRole('status')).toHaveTextContent('✅ Mesa 5 agregada.');
  });

  test('con un número libre (un hueco) lo envía y limpia el campo', async () => {
    const fetchFalso = simularBackend({ ok: true, mesa: { id: 'Mesa 3', numero: 3 } });
    renderizar();
    const campo = screen.getByLabelText(/O elige el número/);
    await userEvent.type(campo, '3');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(fetchFalso).toHaveBeenCalledWith(
      'http://localhost:3000/api/mesas',
      expect.objectContaining({ body: '{"numero":3}' })
    );
    expect(await screen.findByText('✅ Mesa 3 agregada.')).toBeInTheDocument();
    expect(campo).toHaveValue(null);
  });

  test.each([
    ['2', 'La mesa 2 ya existe.'],
    ['100', 'no puede ser mayor a 99'],
    ['0', 'mayor a 0'],
    ['', 'válido']
  ])('el número %j se rechaza antes de llamar al backend', async (valor, mensaje) => {
    const fetchFalso = simularBackend();
    renderizar();
    if (valor) await userEvent.type(screen.getByLabelText(/O elige el número/), valor);
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.getByRole('alert')).toHaveTextContent(mensaje);
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  test('un rechazo del backend se muestra con tipo y motivo', async () => {
    simularBackend({ ok: false, tipo: 'DUPLICADO', error: 'La mesa 5 ya existe.' });
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: '+ Agregar mesa 5' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('[DUPLICADO] La mesa 5 ya existe.');
  });

  test('si falla la red lo avisa', async () => {
    simularBackend(new Error('sin red'));
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: '+ Agregar mesa 5' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Error de red');
  });

  test('con la mesa 99 ya creada no ofrece "la siguiente"', () => {
    renderizar({ mesas: [...mesas, { id: 'Mesa 99', numero: 99, estado: 'libre' }] });
    expect(screen.getByRole('button', { name: 'Ya existe la mesa 99' })).toBeDisabled();
  });
});

describe('AdminMesas: quitar con confirmación', () => {
  test('quitar pide un segundo toque antes de llamar al backend', async () => {
    const fetchFalso = simularBackend({ ok: true, mesa: 'Mesa 4' });
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar la mesa 4' }));
    expect(fetchFalso).not.toHaveBeenCalled();
    const fila = document.getElementById('fila-mesa-4');
    expect(within(fila).getByText('¿Quitar la mesa 4?')).toBeInTheDocument();

    await userEvent.click(within(fila).getByRole('button', { name: 'Sí, quitar' }));
    expect(fetchFalso).toHaveBeenCalledWith('http://localhost:3000/api/mesas/4', {
      method: 'DELETE'
    });
    expect(await screen.findByRole('status')).toHaveTextContent('✅ Mesa 4 quitada.');
  });

  test('"Cancelar" vuelve atrás sin llamar al backend', async () => {
    const fetchFalso = simularBackend();
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar la mesa 1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Quitar la mesa 1' })).toBeInTheDocument();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  test('una mesa ocupada no se puede quitar desde la interfaz', () => {
    renderizar();
    expect(screen.getByRole('button', { name: 'Quitar la mesa 2' })).toBeDisabled();
  });

  test('si el backend rechaza (pedido activo), el motivo se muestra claro', async () => {
    simularBackend({
      ok: false,
      tipo: 'PEDIDO_ACTIVO',
      error: 'La mesa 4 tiene un pedido activo (estado: "Recibido 📝"). No se puede quitar.'
    });
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar la mesa 4' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sí, quitar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '[PEDIDO_ACTIVO] La mesa 4 tiene un pedido activo'
    );
  });
});

describe('AdminMesas: sin conexión y zonas táctiles', () => {
  test('sin conexión no se puede agregar ni quitar', () => {
    renderizar({ conectado: false });
    expect(screen.getByRole('button', { name: '+ Agregar mesa 5' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Quitar la mesa 1' })).toBeDisabled();
  });

  test('los botones usan el alto mínimo táctil del tema', () => {
    renderizar();
    expect(screen.getByRole('button', { name: '+ Agregar mesa 5' }).style.minHeight).toBe(
      'var(--toque)'
    );
    expect(screen.getByRole('button', { name: 'Quitar la mesa 1' }).style.minHeight).toBe(
      'var(--toque)'
    );
  });
});
