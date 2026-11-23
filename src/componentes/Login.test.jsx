// Pruebas de la pantalla de inicio de sesión (Login.jsx). La validación contra el backend
// o Supabase la hace api.js; aquí onEntrar es un doble.
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';

async function escribir(usuario, contrasena) {
  if (usuario) await userEvent.type(screen.getByLabelText('Usuario'), usuario);
  if (contrasena) await userEvent.type(screen.getByLabelText('Contraseña'), contrasena);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('Login', () => {
  test('envía usuario y contraseña a onEntrar', async () => {
    const onEntrar = vi.fn(async () => ({ ok: true }));
    render(<Login onEntrar={onEntrar} />);
    await escribir('ana', 'clave-1');
    expect(onEntrar).toHaveBeenCalledWith('ana', 'clave-1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('la contraseña no se ve en pantalla', () => {
    render(<Login onEntrar={vi.fn()} />);
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
  });

  test('sin usuario o sin contraseña avisa y no envía nada', async () => {
    const onEntrar = vi.fn();
    render(<Login onEntrar={onEntrar} />);
    await escribir('', '');
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresa usuario y contraseña.');
    await escribir('   ', 'x');
    expect(onEntrar).not.toHaveBeenCalled();
  });

  test('si el login falla muestra el motivo y borra la contraseña', async () => {
    const onEntrar = vi.fn(async () => ({
      ok: false,
      error: 'Usuario o contraseña incorrectos.'
    }));
    render(<Login onEntrar={onEntrar} />);
    await escribir('ana', 'mala');
    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos.');
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
    expect(screen.getByLabelText('Usuario')).toHaveValue('ana');
  });

  test('un fallo sin mensaje o una excepción muestran un texto genérico', async () => {
    const onEntrar = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockRejectedValueOnce(new Error());
    render(<Login onEntrar={onEntrar} />);
    await escribir('ana', 'x');
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo iniciar sesión.');
    await escribir('', 'x');
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo contactar el servidor');
  });

  test('mientras envía deshabilita el botón y no envía dos veces', async () => {
    let terminar;
    const onEntrar = vi.fn(() => new Promise((r) => (terminar = r)));
    render(<Login onEntrar={onEntrar} />);
    await escribir('ana', 'clave-1');
    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled();
    terminar({ ok: true });
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeEnabled();
    expect(onEntrar).toHaveBeenCalledTimes(1);
  });

  test('muestra el aviso recibido (por ejemplo, sesión vencida)', () => {
    render(<Login onEntrar={vi.fn()} aviso="Tu sesión terminó. Vuelve a iniciar sesión." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Tu sesión terminó');
  });
});
