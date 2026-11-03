// Pruebas de MapaMesas (US-08): mostrar mesas, distinguir estados y seleccionar.
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MapaMesas from './MapaMesas';

const mesas = [
  { id: 'Mesa 1', numero: 1, estado: 'libre' },
  { id: 'Mesa 2', numero: 2, estado: 'ocupada' }
];

describe('MapaMesas (US-08)', () => {
  test('CA1: muestra todas las mesas recibidas', () => {
    render(<MapaMesas mesas={mesas} mesaSeleccionada={null} onSeleccionar={() => {}} />);
    expect(screen.getByText('Mesa 1')).toBeInTheDocument();
    expect(screen.getByText('Mesa 2')).toBeInTheDocument();
  });

  test('CA2: distingue Libre de Ocupada con etiqueta y color', () => {
    render(<MapaMesas mesas={mesas} mesaSeleccionada={null} onSeleccionar={() => {}} />);
    expect(screen.getByText('Libre')).toBeInTheDocument();
    expect(screen.getByText('Ocupada')).toBeInTheDocument();
    expect(screen.getByTitle(/Mesa 1/)).toHaveStyle({ backgroundColor: 'rgb(40, 167, 69)' });
    expect(screen.getByTitle(/Mesa 2/)).toHaveStyle({ backgroundColor: 'rgb(220, 53, 69)' });
  });

  test('sin mesas muestra el aviso de lista vacía', () => {
    render(<MapaMesas mesas={[]} mesaSeleccionada={null} onSeleccionar={() => {}} />);
    expect(screen.getByText('Sin mesas registradas.')).toBeInTheDocument();
  });

  test('CA5: al hacer clic en una mesa llama a onSeleccionar con esa mesa', async () => {
    const onSeleccionar = vi.fn();
    render(<MapaMesas mesas={mesas} mesaSeleccionada={null} onSeleccionar={onSeleccionar} />);
    await userEvent.click(screen.getByTitle(/Mesa 2/));
    expect(onSeleccionar).toHaveBeenCalledWith(mesas[1]);
  });

  test('resalta la mesa seleccionada', () => {
    render(<MapaMesas mesas={mesas} mesaSeleccionada={mesas[0]} onSeleccionar={() => {}} />);
    expect(screen.getByTitle(/Mesa 1/)).toHaveStyle({ transform: 'scale(1.08)' });
    expect(screen.getByTitle(/Mesa 2/)).toHaveStyle({ transform: 'scale(1)' });
  });
});

describe('MapaMesas: leyenda y accesibilidad (#77)', () => {
  test('la leyenda cuenta mesas libres y ocupadas en singular', () => {
    render(<MapaMesas mesas={mesas} mesaSeleccionada={null} onSeleccionar={() => {}} />);
    expect(screen.getByText('1 libre')).toBeInTheDocument();
    expect(screen.getByText('1 ocupada')).toBeInTheDocument();
  });

  test('la leyenda usa plural cuando corresponde', () => {
    const varias = [...mesas, { id: 'Mesa 3', numero: 3, estado: 'libre' }];
    render(<MapaMesas mesas={varias} mesaSeleccionada={null} onSeleccionar={() => {}} />);
    expect(screen.getByText('2 libres')).toBeInTheDocument();
    expect(screen.getByText('1 ocupada')).toBeInTheDocument();
  });

  test('con todas las mesas libres muestra "0 ocupadas"', () => {
    render(<MapaMesas mesas={[mesas[0]]} mesaSeleccionada={null} onSeleccionar={() => {}} />);
    expect(screen.getByText('0 ocupadas')).toBeInTheDocument();
  });

  test('sin mesas no muestra la leyenda', () => {
    render(<MapaMesas mesas={[]} mesaSeleccionada={null} onSeleccionar={() => {}} />);
    expect(screen.queryByText(/libres?$/)).not.toBeInTheDocument();
  });

  test('la mesa seleccionada se anuncia con aria-pressed', () => {
    render(<MapaMesas mesas={mesas} mesaSeleccionada={mesas[1]} onSeleccionar={() => {}} />);
    expect(screen.getByTitle(/Mesa 2/)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTitle(/Mesa 1/)).toHaveAttribute('aria-pressed', 'false');
  });

  test('la selección usa un anillo y no pisa el outline del foco de teclado', () => {
    render(<MapaMesas mesas={mesas} mesaSeleccionada={mesas[0]} onSeleccionar={() => {}} />);
    const seleccionada = screen.getByTitle(/Mesa 1/);
    expect(seleccionada.style.boxShadow).toContain('var(--color-azafran)');
    expect(seleccionada.style.outline).toBe('');
    expect(screen.getByTitle(/Mesa 2/).style.boxShadow).not.toContain('var(--color-azafran)');
  });
});
