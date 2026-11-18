// Pruebas de TrasladoMesa (US-05): elegir el destino tocando una mesa y trasladar.
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrasladoMesa from './TrasladoMesa';

const mesas = [
  { id: 'Mesa 1', numero: 1, estado: 'ocupada' },
  { id: 'Mesa 2', numero: 2, estado: 'libre' },
  { id: 'Mesa 3', numero: 3, estado: 'ocupada' },
  { id: 'Mesa 6', numero: 6, estado: 'libre' }
];

function renderizar(props = {}) {
  const onTrasladar = vi.fn();
  const utils = render(
    <TrasladoMesa
      mesaOrigen={mesas[0]}
      mesas={mesas}
      conectado
      onTrasladar={onTrasladar}
      {...props}
    />
  );
  return { onTrasladar, ...utils };
}

describe('TrasladoMesa: lista de destinos', () => {
  test('ofrece todas las demás mesas, no la de origen', () => {
    renderizar();
    expect(document.getElementById('destino-1')).not.toBeInTheDocument();
    ['2', '3', '6'].forEach((n) =>
      expect(screen.getByRole('button', { name: n })).toBeInTheDocument()
    );
  });

  test('las mesas ocupadas aparecen deshabilitadas y las libres habilitadas', () => {
    renderizar();
    expect(screen.getByRole('button', { name: '3' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '2' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '6' })).toBeEnabled();
  });

  test('sin destino elegido el botón Trasladar está deshabilitado', () => {
    renderizar();
    expect(screen.getByRole('button', { name: /Trasladar pedido/ })).toBeDisabled();
  });

  test('si no hay ninguna otra mesa libre lo explica', () => {
    renderizar({ mesas: [mesas[0], mesas[2]] });
    expect(screen.getByText('No hay otra mesa libre para recibir el pedido.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Trasladar pedido/ })).toBeDisabled();
  });

  test('los destinos son zonas táctiles del tamaño mínimo del tema', () => {
    renderizar();
    expect(screen.getByRole('button', { name: '2' }).style.minHeight).toBe('var(--toque)');
  });
});

describe('TrasladoMesa: elegir y trasladar', () => {
  test('al elegir un destino se marca y el botón dice a qué mesa va', async () => {
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: '6' }));
    expect(screen.getByRole('button', { name: '6' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /Trasladar a Mesa 6/ })).toBeEnabled();
  });

  test('trasladar envía los números de origen y destino', async () => {
    const { onTrasladar } = renderizar();
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    await userEvent.click(screen.getByRole('button', { name: /Trasladar a Mesa 2/ }));
    expect(onTrasladar).toHaveBeenCalledWith(1, 2);
  });

  test('si el destino elegido se ocupa antes de confirmar, se descarta', async () => {
    const { onTrasladar, rerender } = renderizar();
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    const ocupadas = mesas.map((m) => (m.numero === 2 ? { ...m, estado: 'ocupada' } : m));
    rerender(
      <TrasladoMesa mesaOrigen={mesas[0]} mesas={ocupadas} conectado onTrasladar={onTrasladar} />
    );
    expect(screen.getByRole('button', { name: /Trasladar pedido/ })).toBeDisabled();
  });

  test('el destino elegido no pasa al panel de otra mesa de origen', async () => {
    const { onTrasladar, rerender } = renderizar();
    await userEvent.click(screen.getByRole('button', { name: '6' }));
    rerender(
      <TrasladoMesa mesaOrigen={mesas[2]} mesas={mesas} conectado onTrasladar={onTrasladar} />
    );
    expect(screen.getByRole('button', { name: /Trasladar pedido/ })).toBeDisabled();
  });

  test('sin conexión no se puede elegir ni trasladar', () => {
    renderizar({ conectado: false });
    screen.getAllByRole('button').forEach((boton) => expect(boton).toBeDisabled());
  });
});
