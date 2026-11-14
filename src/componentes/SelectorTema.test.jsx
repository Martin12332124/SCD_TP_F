// Pruebas de SelectorTema: tema inicial (guardado o del sistema), alternancia y persistencia.
// matchMedia no existe en jsdom: se sustituye por un doble cuando la prueba lo necesita.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelectorTema from './SelectorTema';

const CLAVE_TEMA = 'monitor-pedidos:tema';

/** Simula la preferencia de color del sistema operativo. */
const preferenciaSistema = (oscuro) => vi.stubGlobal('matchMedia', () => ({ matches: oscuro }));

beforeEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('SelectorTema: tema inicial', () => {
  test('sin elección guardada ni matchMedia arranca en claro', () => {
    render(<SelectorTema />);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('button', { name: /Modo oscuro/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  test('respeta la preferencia oscura del sistema', () => {
    preferenciaSistema(true);
    render(<SelectorTema />);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('button', { name: /Modo claro/ })).toBeInTheDocument();
  });

  test('la elección guardada tiene prioridad sobre el sistema', () => {
    preferenciaSistema(true);
    localStorage.setItem(CLAVE_TEMA, 'claro');
    render(<SelectorTema />);
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  test('ignora valores guardados desconocidos', () => {
    localStorage.setItem(CLAVE_TEMA, 'rosado');
    render(<SelectorTema />);
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

describe('SelectorTema: alternar', () => {
  test('cambia el tema y guarda la elección', async () => {
    render(<SelectorTema />);
    await userEvent.click(screen.getByRole('button', { name: /Modo oscuro/ }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('oscuro');

    await userEvent.click(screen.getByRole('button', { name: /Modo claro/ }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('claro');
  });

  test('sigue funcionando si el almacenamiento está bloqueado', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    render(<SelectorTema />);
    await userEvent.click(screen.getByRole('button', { name: /Modo oscuro/ }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
