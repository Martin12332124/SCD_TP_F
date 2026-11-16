// Pruebas de AvancePedido: barra de progreso del pedido y botón con el siguiente paso válido.
import { describe, test, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AvancePedido from './AvancePedido';

function renderizar(estadoPedido, props = {}) {
  const onCambiarEstado = vi.fn();
  const onTomarPedido = vi.fn();
  render(
    <AvancePedido
      estadoPedido={estadoPedido}
      conectado
      onCambiarEstado={onCambiarEstado}
      onTomarPedido={onTomarPedido}
      {...props}
    />
  );
  return { onCambiarEstado, onTomarPedido };
}

/** Situación de cada paso de la barra, en orden: 'hecho', 'actual' o 'pendiente'. */
const situaciones = () =>
  within(screen.getByRole('list', { name: 'Progreso del pedido' }))
    .getAllByRole('listitem')
    .map((paso) => paso.getAttribute('data-paso'));

describe('AvancePedido: barra de progreso', () => {
  test.each([
    [null, ['pendiente', 'pendiente', 'pendiente']],
    ['Recibido 📝', ['actual', 'pendiente', 'pendiente']],
    ['En Cocina 🍳', ['hecho', 'actual', 'pendiente']],
    ['Listo 🍽️', ['hecho', 'hecho', 'actual']]
  ])('con el pedido en %j los pasos quedan %j', (estado, esperado) => {
    renderizar(estado);
    expect(situaciones()).toEqual(esperado);
  });

  test('muestra los tres pasos con su nombre, sin numerarlos', () => {
    renderizar('Recibido 📝');
    const barra = screen.getByRole('list', { name: 'Progreso del pedido' });
    expect(barra).toHaveTextContent('RecibidoEn cocinaListo');
    expect(barra).not.toHaveTextContent(/\d/);
  });

  test('el paso actual se anuncia con aria-current y lleva el color de su estado', () => {
    renderizar('En Cocina 🍳');
    const actual = screen.getByText('En cocina');
    expect(actual).toHaveAttribute('aria-current', 'step');
    expect(actual.style.background).toBe('var(--mesa-cocina)');
    expect(screen.getByText('Listo')).not.toHaveAttribute('aria-current');
  });
});

describe('AvancePedido: siguiente paso válido', () => {
  test('sin pedido: "Tomar pedido" es la acción principal y abre la carta', async () => {
    const { onTomarPedido, onCambiarEstado } = renderizar(null);
    const boton = screen.getByRole('button', { name: /Tomar pedido/ });
    expect(boton.style.background).toBe('var(--color-primario)');
    await userEvent.click(boton);
    expect(onTomarPedido).toHaveBeenCalledTimes(1);
    expect(onCambiarEstado).not.toHaveBeenCalled();
  });

  test('sin pedido: "Registrar pedido sin productos" pide el estado Recibido', async () => {
    const { onCambiarEstado } = renderizar(null);
    await userEvent.click(screen.getByRole('button', { name: 'Registrar pedido sin productos' }));
    expect(onCambiarEstado).toHaveBeenCalledWith('Recibido 📝');
  });

  test('pedido Recibido: el único avance ofrecido es "Enviar a cocina"', async () => {
    const { onCambiarEstado } = renderizar('Recibido 📝');
    await userEvent.click(screen.getByRole('button', { name: /Enviar a cocina/ }));
    expect(onCambiarEstado).toHaveBeenCalledWith('En Cocina 🍳');
    // No se ofrece saltarse un paso ni volver a tomar el pedido
    expect(screen.queryByRole('button', { name: /Marcar pedido listo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tomar pedido/ })).not.toBeInTheDocument();
  });

  test('pedido En Cocina: el único avance ofrecido es "Marcar pedido listo"', async () => {
    const { onCambiarEstado } = renderizar('En Cocina 🍳');
    const boton = screen.getByRole('button', { name: /Marcar pedido listo/ });
    expect(boton.style.background).toBe('var(--mesa-listo)');
    await userEvent.click(boton);
    expect(onCambiarEstado).toHaveBeenCalledWith('Listo 🍽️');
    expect(screen.queryByRole('button', { name: /Enviar a cocina/ })).not.toBeInTheDocument();
  });

  test('pedido Listo: no hay botón de avance y explica qué se puede hacer', () => {
    renderizar('Listo 🍽️');
    expect(document.getElementById('btn-avanzar-pedido')).not.toBeInTheDocument();
    expect(screen.getByText(/La mesa sigue ocupada hasta que la liberes/)).toBeInTheDocument();
  });

  test.each(['Recibido 📝', 'En Cocina 🍳', 'Listo 🍽️'])(
    'con el pedido en %j se pueden agregar productos (abre la carta)',
    async (estado) => {
      const { onTomarPedido } = renderizar(estado);
      await userEvent.click(screen.getByRole('button', { name: 'Agregar productos' }));
      expect(onTomarPedido).toHaveBeenCalledTimes(1);
    }
  );

  test('un estado desconocido se muestra tal cual y no ofrece un avance', () => {
    renderizar('En Espera');
    expect(screen.getByText('Estado del pedido: En Espera')).toBeInTheDocument();
    expect(document.getElementById('btn-avanzar-pedido')).not.toBeInTheDocument();
    expect(situaciones()).toEqual(['pendiente', 'pendiente', 'pendiente']);
  });
});

describe('AvancePedido: sin conexión y zonas táctiles', () => {
  test.each([null, 'Recibido 📝', 'Listo 🍽️'])(
    'sin conexión todos los botones quedan deshabilitados (pedido %j)',
    (estado) => {
      renderizar(estado, { conectado: false });
      const botones = screen.getAllByRole('button');
      expect(botones.length).toBeGreaterThan(0);
      botones.forEach((boton) => expect(boton).toBeDisabled());
    }
  );

  test('los botones usan el alto mínimo táctil del tema', () => {
    renderizar('Recibido 📝');
    screen
      .getAllByRole('button')
      .forEach((boton) => expect(boton.style.minHeight).toBe('var(--toque)'));
  });
});
