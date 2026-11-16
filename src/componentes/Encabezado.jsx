// src/componentes/Encabezado.jsx
// Encabezado de la pantalla principal: identidad del local, estado de la conexión
// con el backend y selector de tema.
//
// Props:
//   conectado {boolean} - true si el socket está conectado al backend

import SelectorTema from './SelectorTema';

function Encabezado({ conectado }) {
  return (
    <header style={estilos.encabezado}>
      <div style={estilos.encabezadoInterior}>
        <div style={estilos.marca}>
          <span aria-hidden="true" style={estilos.logo}>
            🍽️
          </span>
          <div>
            <p style={estilos.marcaEtiqueta}>Sala · Cocina · Caja</p>
            <h1 style={estilos.titulo}>Monitor de Pedidos en Tiempo Real</h1>
          </div>
        </div>

        <div style={estilos.accionesEncabezado}>
          <span
            role="status"
            title="Control de conexión con el servidor"
            style={{
              ...estilos.conexion,
              borderColor: conectado ? 'rgba(181, 196, 74, 0.55)' : 'rgba(255, 107, 74, 0.6)'
            }}
          >
            <span
              aria-hidden="true"
              style={{
                ...estilos.puntoConexion,
                background: conectado ? '#b5c44a' : '#ff6b4a',
                animation: conectado ? 'pulso 2s ease-in-out infinite' : 'none'
              }}
            />
            {conectado ? 'Sistema Conectado ✔' : 'Servidor Desconectado ✖'}
          </span>

          <SelectorTema />
        </div>
      </div>
    </header>
  );
}

// ── Estilos en línea: leen los tokens de index.css (modo claro y oscuro) ─────
const estilos = {
  encabezado: {
    background: 'var(--fondo-encabezado)',
    color: 'var(--color-encabezado-texto)',
    borderBottom: '3px solid var(--color-azafran)',
    boxShadow: 'var(--sombra-2)'
  },
  encabezadoInterior: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '18px clamp(16px, 4vw, 40px)',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px'
  },
  marca: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  logo: {
    display: 'grid',
    placeItems: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'var(--color-azafran)',
    boxShadow: 'inset 0 0 0 3px rgba(90, 30, 8, 0.25)',
    fontSize: '24px',
    flexShrink: 0
  },
  marcaEtiqueta: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'var(--color-azafran)'
  },
  titulo: {
    margin: '2px 0 0',
    fontSize: 'clamp(20px, 3vw, 26px)',
    color: 'var(--color-encabezado-texto)'
  },
  conexion: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 14px',
    borderRadius: '999px',
    border: '1px solid',
    background: 'rgba(244, 236, 227, 0.08)',
    fontSize: '13px',
    fontWeight: 600,
    whiteSpace: 'nowrap'
  },
  accionesEncabezado: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px'
  },
  puntoConexion: {
    width: '9px',
    height: '9px',
    borderRadius: '50%'
  }
};

export default Encabezado;
