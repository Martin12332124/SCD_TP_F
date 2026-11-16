// src/componentes/Encabezado.jsx
// Encabezado de la pantalla principal: identidad del local, estado de la conexión
// con el backend, selector de tema y acceso a "Configurar mesas".
//
// Props:
//   conectado         {boolean}  - true si el socket está conectado al backend
//   onConfigurarMesas {Function} - Abre la pantalla para agregar y quitar mesas

import SelectorTema from './SelectorTema';

function Encabezado({ conectado, onConfigurarMesas }) {
  return (
    <header style={estilos.encabezado}>
      <div style={estilos.encabezadoInterior}>
        <div style={estilos.marca}>
          <span aria-hidden="true" style={estilos.logo}>
            🍽️
          </span>
          <h1 style={estilos.titulo}>Monitor de Pedidos en Tiempo Real</h1>
        </div>

        <div style={estilos.accionesEncabezado}>
          {/* Conexión: bloque de color sólido con ícono y texto (no un puntito) */}
          <span
            role="status"
            title="Control de conexión con el servidor"
            data-conectado={conectado}
            style={{
              ...estilos.conexion,
              ...(conectado ? estilos.conexionOk : estilos.conexionCaida)
            }}
          >
            {conectado ? 'Sistema Conectado ✔' : 'Servidor Desconectado ✖'}
          </span>

          <SelectorTema />

          <button
            id="btn-configurar-mesas"
            type="button"
            onClick={onConfigurarMesas}
            style={estilos.botonConfigurar}
          >
            ⚙️ Configurar mesas
          </button>
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
    borderBottom: '4px solid var(--color-azafran)',
    boxShadow: 'var(--sombra-2)'
  },
  encabezadoInterior: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '14px clamp(16px, 4vw, 40px)',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px'
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
    borderRadius: 'var(--radio-m)',
    background: 'var(--color-azafran)',
    fontSize: '26px',
    flexShrink: 0
  },
  titulo: {
    margin: 0,
    fontSize: 'clamp(22px, 3vw, 28px)',
    color: 'var(--color-encabezado-texto)'
  },
  accionesEncabezado: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px'
  },
  conexion: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '44px',
    padding: '8px 14px',
    borderRadius: 'var(--radio-m)',
    fontSize: '16px',
    fontWeight: 700,
    whiteSpace: 'nowrap'
  },
  conexionOk: {
    background: 'var(--mesa-libre)',
    color: 'var(--mesa-libre-texto)'
  },
  conexionCaida: {
    background: 'var(--mesa-ocupada)',
    color: 'var(--mesa-ocupada-texto)'
  },
  botonConfigurar: {
    minHeight: '44px',
    padding: '8px 14px',
    border: '2px solid var(--color-encabezado-texto)',
    borderRadius: 'var(--radio-m)',
    background: 'transparent',
    color: 'var(--color-encabezado-texto)',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  }
};

export default Encabezado;
