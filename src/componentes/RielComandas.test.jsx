// Pruebas del riel de comandas: un ticket por pedido en curso, con su propio temporizador.
import { describe, test, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RielComandas from './RielComandas';

const AHORA = Date.parse('2026-11-16T12:30:00.000Z');
const hace = (minutos, segundos = 0) =>
  new Date(AHORA - (minutos * 60 + segundos) * 1000).toISOString();

const mesas = [
  { id: 'Mesa 1', numero: 1, estado: 'libre', estadoPedido: null, pedidoDesde: null },
  { id: 'Mesa 2', numero: 2, estado: 'ocupada', estadoPedido: null, pedidoDesde: null },
  {
    id: 'Mesa 3',
    numero: 3,
    estado: 'ocupada',
    estadoPedido: 'En Cocina 🍳',
    pedidoDesde: hace(4)
  },
  {
    id: 'Mesa 6',
    numero: 6,
    estado: 'ocupada',
    estadoPedido: 'Recibido 📝',
    pedidoDesde: hace(21)
  },
  { id: 'Mesa 8', numero: 8, estado: 'ocupada', estadoPedido: 'Listo 🍽️', pedidoDesde: hace(16) }
];

function renderizar(lista = mesas) {
  const onSeleccionar = vi.fn();
  render(<RielComandas mesas={lista} ahora={AHORA} onSeleccionar={onSeleccionar} />);
  return { onSeleccionar };
}

const tickets = () =>
  within(screen.getByRole('region', { name: 'Comandas en curso' }))
    .queryAllByRole('button')
    .map((b) => b.id);

describe('RielComandas: todas las comandas en curso', () => {
  test('muestra un ticket por cada mesa con pedido, del más antiguo al más nuevo', () => {
    renderizar();
    expect(tickets()).toEqual(['comanda-6', 'comanda-8', 'comanda-3']);
  });

  test('las mesas libres u ocupadas sin pedido no tienen comanda', () => {
    renderizar();
    expect(document.getElementById('comanda-1')).not.toBeInTheDocument();
    expect(document.getElementById('comanda-2')).not.toBeInTheDocument();
  });

  test('cada ticket lleva su mesa, su estado y su propio tiempo', () => {
    renderizar();
    const t3 = document.getElementById('comanda-3');
    expect(t3).toHaveTextContent('Mesa 3');
    expect(t3).toHaveTextContent('En cocina');
    expect(t3.querySelector('[data-tiempo]')).toHaveTextContent('04:00');
    expect(document.getElementById('comanda-6').querySelector('[data-tiempo]')).toHaveTextContent(
      '21:00'
    );
  });

  test('el resumen cuenta las comandas y las atrasadas', () => {
    renderizar();
    expect(document.getElementById('resumen-comandas')).toHaveTextContent('3 en curso, 1 atrasada');
  });

  test('sin comandas lo explica', () => {
    renderizar(mesas.slice(0, 2));
    expect(document.getElementById('resumen-comandas')).toHaveTextContent('Sin comandas en curso');
    expect(tickets()).toEqual([]);
  });
});

describe('RielComandas: urgencia por tiempo (REF-04)', () => {
  test.each([
    ['comanda-3', 'normal', 'var(--papel)'],
    ['comanda-8', 'atencion', 'var(--papel-atencion)'],
    ['comanda-6', 'atrasado', 'var(--papel-atraso)']
  ])('%s queda en nivel "%s" y cambia el color de todo el ticket', (id, nivel, fondo) => {
    renderizar();
    const ticket = document.getElementById(id);
    expect(ticket).toHaveAttribute('data-urgencia', nivel);
    expect(ticket.style.background).toBe(fondo);
  });

  test('el nivel también se dice con texto, no solo con color', () => {
    renderizar();
    expect(document.getElementById('comanda-8')).toHaveTextContent('Más de 15 min');
    expect(document.getElementById('comanda-6')).toHaveTextContent('Atrasado');
  });

  test('una comanda sin hora conocida muestra --:-- y queda normal', () => {
    renderizar([{ ...mesas[2], pedidoDesde: null }]);
    const ticket = document.getElementById('comanda-3');
    expect(ticket.querySelector('[data-tiempo]')).toHaveTextContent('--:--');
    expect(ticket).toHaveAttribute('data-urgencia', 'normal');
  });
});

describe('RielComandas: interacción', () => {
  test('tocar un ticket abre la mesa', async () => {
    const { onSeleccionar } = renderizar();
    await userEvent.click(document.getElementById('comanda-8'));
    expect(onSeleccionar).toHaveBeenCalledWith(mesas[4]);
  });

  test('el estado del ticket usa el color de la mesa y un ícono (no un emoji)', () => {
    renderizar();
    const ticket = document.getElementById('comanda-3');
    expect(ticket).toHaveAttribute('data-estado', 'cocina');
    expect(ticket.querySelector('svg[data-icono="olla"]')).toBeInTheDocument();
  });
});
