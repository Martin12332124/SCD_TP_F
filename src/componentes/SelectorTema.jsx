// src/SelectorTema.jsx
// Botón del encabezado para alternar entre modo claro y modo oscuro.
// El tema inicial respeta la última elección guardada; si no hay, sigue la preferencia del sistema.
// La elección se aplica como data-theme en <html>, que index.css usa para cambiar los tokens.

import { useState, useEffect } from 'react';

const CLAVE_TEMA = 'monitor-pedidos:tema';

/** Lee el tema guardado o, si no existe, el que prefiere el sistema operativo. */
function leerTemaInicial() {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === 'claro' || guardado === 'oscuro') return guardado;
  } catch {
    // Almacenamiento bloqueado (modo privado): se usa la preferencia del sistema
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
}

function SelectorTema() {
  const [tema, setTema] = useState(leerTemaInicial);
  const esOscuro = tema === 'oscuro';

  // Refleja el tema en <html> para que las variables CSS cambien en toda la app
  useEffect(() => {
    document.documentElement.dataset.theme = esOscuro ? 'dark' : 'light';
  }, [esOscuro]);

  const alternarTema = () => {
    const siguiente = esOscuro ? 'claro' : 'oscuro';
    setTema(siguiente);
    try {
      localStorage.setItem(CLAVE_TEMA, siguiente);
    } catch {
      // Si no se puede guardar, el cambio igual aplica durante la sesión
    }
  };

  return (
    <button
      id="btn-tema"
      type="button"
      onClick={alternarTema}
      aria-pressed={esOscuro}
      title={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      style={estilos.boton}
    >
      <span aria-hidden="true" style={estilos.icono}>
        {esOscuro ? '☀️' : '🌙'}
      </span>
      {esOscuro ? 'Modo claro' : 'Modo oscuro'}
    </button>
  );
}

// ── Estilos en línea: pensados para ir sobre el encabezado chocolate ─────────
const estilos = {
  boton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 14px',
    borderRadius: '999px',
    border: '1px solid rgba(244, 236, 227, 0.3)',
    background: 'rgba(244, 236, 227, 0.08)',
    color: 'var(--color-encabezado-texto)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  icono: {
    fontSize: '15px',
    lineHeight: 1
  }
};

export default SelectorTema;
