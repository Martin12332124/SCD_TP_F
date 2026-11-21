// src/componentes/Login.jsx
// Pantalla de inicio de sesión. Es la misma en modo local y en modo nube: quien decide
// contra qué se valida (servidor del restaurante o Supabase Auth) es servicios/api.js.
// Sin roles: cualquier usuario con sesión usa el POS y el riel de comandas.
//
// Props:
//   onEntrar {Function} - (usuario, contrasena) => Promise<{ ok, error? }>
//   aviso    {string}   - Mensaje previo, por ejemplo "Tu sesión terminó..." (opcional)

import { useState } from 'react';
import Icono from './Icono';

function Login({ onEntrar, aviso = '' }) {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    if (!usuario.trim() || !contrasena) {
      setError('Ingresa usuario y contraseña.');
      return;
    }
    setError('');
    setEnviando(true);
    try {
      const r = await onEntrar(usuario, contrasena);
      if (!r.ok) {
        setError(r.error || 'No se pudo iniciar sesión.');
        setContrasena('');
      }
    } catch {
      setError('No se pudo contactar el servidor. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  // Si el login funciona, este componente se desmonta (Sesion muestra la app); por eso
  // setEnviando(false) en finally solo importa cuando falla.
  return (
    <div style={estilos.pagina}>
      <header style={estilos.encabezado}>
        <span style={estilos.logo}>
          <Icono nombre="campana" tamano={28} />
        </span>
        <div>
          <span style={estilos.nombre}>Comanda</span>
          <p style={estilos.lema}>Monitor de Pedidos en Tiempo Real</p>
        </div>
      </header>

      <main style={estilos.contenido}>
        <form onSubmit={enviar} style={estilos.tarjeta} aria-labelledby="titulo-login" noValidate>
          <h1 id="titulo-login" style={estilos.titulo}>
            <Icono nombre="candado" tamano={24} />
            Iniciar sesión
          </h1>

          {(error || aviso) && (
            <div role="alert" style={estilos.aviso}>
              {error || aviso}
            </div>
          )}

          <label htmlFor="input-usuario" style={estilos.rotulo}>
            Usuario
          </label>
          <input
            id="input-usuario"
            name="usuario"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            disabled={enviando}
            style={estilos.campo}
          />

          <label htmlFor="input-contrasena" style={estilos.rotulo}>
            Contraseña
          </label>
          <input
            id="input-contrasena"
            name="contrasena"
            type="password"
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            disabled={enviando}
            style={estilos.campo}
          />

          <button type="submit" disabled={enviando} style={estilos.boton}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </main>
    </div>
  );
}

// ── Estilos en línea: leen los tokens de index.css (modo claro y oscuro) ─────
const estilos = {
  pagina: {
    minHeight: '100svh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--color-fondo)'
  },
  encabezado: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px clamp(16px, 4vw, 40px)',
    background: 'var(--fondo-encabezado)',
    color: 'var(--color-encabezado-texto)'
  },
  logo: {
    display: 'grid',
    placeItems: 'center',
    width: '52px',
    height: '52px',
    borderRadius: 'var(--radio-m)',
    background: 'var(--laton)',
    color: 'var(--pizarra)',
    flexShrink: 0
  },
  nombre: {
    display: 'block',
    fontFamily: 'var(--fuente-titulo)',
    fontSize: '26px',
    fontWeight: 700,
    lineHeight: 1,
    color: 'var(--laton)'
  },
  lema: {
    margin: '4px 0 0',
    fontSize: '17px',
    fontWeight: 600
  },
  contenido: {
    flex: 1,
    display: 'grid',
    placeItems: 'center',
    padding: 'clamp(16px, 4vw, 32px)'
  },
  tarjeta: {
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--color-superficie)',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: 'var(--color-borde)',
    borderRadius: 'var(--radio-l)',
    boxShadow: 'var(--sombra-1)',
    padding: '24px'
  },
  titulo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '0 0 18px',
    fontFamily: 'var(--fuente-titulo)',
    fontSize: '26px',
    color: 'var(--color-texto)'
  },
  aviso: {
    padding: '12px 16px',
    marginBottom: '18px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderRadius: 'var(--radio-m)',
    fontSize: '16px',
    fontWeight: 600,
    background: 'var(--color-peligro-suave)',
    color: 'var(--color-peligro-texto)',
    borderColor: 'var(--color-peligro)'
  },
  rotulo: {
    marginBottom: '8px',
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-texto)'
  },
  campo: {
    minHeight: 'var(--toque)',
    marginBottom: '16px',
    padding: '10px 14px',
    fontSize: '19px',
    color: 'var(--color-texto)',
    background: 'var(--color-fondo)',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: 'var(--color-texto-suave)',
    borderRadius: 'var(--radio-m)'
  },
  boton: {
    minHeight: 'var(--toque)',
    marginTop: '4px',
    padding: '12px 18px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderRadius: 'var(--radio-m)',
    fontSize: '17px',
    fontWeight: 700,
    cursor: 'pointer',
    background: 'var(--color-primario)',
    color: 'var(--color-sobre-primario)',
    borderColor: 'var(--color-primario)'
  }
};

export default Login;
