// Pruebas del aviso de conexión con el servidor del restaurante (solo modo nube).
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import AvisoConexionLocal from './AvisoConexionLocal';

const AHORA = new Date('2026-11-22T10:00:00');
const hace = (segundos) => new Date(AHORA.getTime() - segundos * 1000).toISOString();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AHORA);
});
afterEach(() => vi.useRealTimers());

describe('AvisoConexionLocal', () => {
  test('sincronización de hace menos de 75 s: conectado', () => {
    render(<AvisoConexionLocal ultima={hace(74)} />);
    expect(screen.getByRole('status')).toHaveTextContent('Conectado al sistema del restaurante');
    expect(screen.getByRole('status')).toHaveAttribute('data-conectado', 'true');
  });

  test('de hace 75 s o más: desconectado, con la hora y la explicación', () => {
    render(<AvisoConexionLocal ultima={hace(75)} />);
    const aviso = screen.getByRole('status');
    expect(aviso).toHaveAttribute('data-conectado', 'false');
    expect(aviso).toHaveTextContent(
      /^El sistema del restaurante no está conectado desde las \d\d:\d\d\. Puedes ver los últimos datos, pero no se pueden hacer cambios hasta que se conecte\.$/
    );
  });

  test('el estado desconectado se ve distinto del conectado', () => {
    const { rerender } = render(<AvisoConexionLocal ultima={hace(5)} />);
    const colorConectado = screen.getByRole('status').style.background;
    rerender(<AvisoConexionLocal ultima={hace(500)} />);
    expect(screen.getByRole('status').style.background).not.toBe(colorConectado);
  });

  test('nunca sincronizó (null): desconectado, sin inventar una hora', () => {
    render(<AvisoConexionLocal ultima={null} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'El sistema del restaurante no está conectado. Puedes ver'
    );
  });

  test('mientras no se sabe nada (undefined) no muestra nada', () => {
    render(<AvisoConexionLocal ultima={undefined} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('se reevalúa cada 15 s sin necesidad de avisos: pasa a desconectado', () => {
    render(<AvisoConexionLocal ultima={hace(30)} />);
    expect(screen.getByRole('status')).toHaveAttribute('data-conectado', 'true');
    act(() => vi.advanceTimersByTime(30000)); // ya van 60 s
    expect(screen.getByRole('status')).toHaveAttribute('data-conectado', 'true');
    act(() => vi.advanceTimersByTime(15000)); // 75 s
    expect(screen.getByRole('status')).toHaveAttribute('data-conectado', 'false');
  });

  test('una sincronización nueva lo vuelve a conectado', () => {
    const { rerender } = render(<AvisoConexionLocal ultima={hace(300)} />);
    expect(screen.getByRole('status')).toHaveAttribute('data-conectado', 'false');
    rerender(<AvisoConexionLocal ultima={hace(1)} />);
    expect(screen.getByRole('status')).toHaveAttribute('data-conectado', 'true');
  });
});
