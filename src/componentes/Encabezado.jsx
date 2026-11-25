// src/componentes/Encabezado.jsx
// Encabezado de la pantalla principal: identidad del local, estado de la conexión
// con el backend, selector de tema y acceso a "Configurar mesas".
// Comparte la pizarra con el riel de comandas que va justo debajo: juntos forman
// el "pase" de la cocina, de donde cuelgan las comandas.
//
// Props:
//   conectado         {boolean}  - true si el socket está conectado al backend
//   onConfigurarMesas {Function} - Abre la pantalla para agregar y quitar mesas
//   usuario           {string}   - Usuario con sesión (opcional)
//   onCerrarSesion    {Function} - Si viene, se muestra el botón "Cerrar sesión"

import SelectorTema from './SelectorTema';
import Icono from '../shared/components/Icono.jsx';

function Encabezado({ conectado, onConfigurarMesas, usuario, onCerrarSesion }) {
  return (
    <header style={estilos.encabezado}>
      <div style={estilos.encabezadoInterior}>
        <div style={estilos.marca}>
          <span style={estilos.logo}>
            <Icono nombre="campana" tamano={28} />
          </span>
          <div>
            <span style={estilos.nombre}>Comanda</span>
            <h1 style={estilos.titulo}>Monitor de Pedidos en Tiempo Real</h1>
          </div>
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
            <Icono nombre={conectado ? 'conectado' : 'desconectado'} tamano={20} />
            {conectado ? 'Sistema Conectado' : 'Servidor Desconectado'}
          </span>

          <SelectorTema />

          <button
            id="btn-configurar-mesas"
            type="button"
            onClick={onConfigurarMesas}
            style={estilos.botonConfigurar}
          >
            <Icono nombre="ajustes" tamano={20} />
            Configurar mesas
          </button>

          {onCerrarSesion && (
            <button
              id="btn-cerrar-sesion"
              type="button"
              onClick={onCerrarSesion}
              title={usuario ? `Sesión de ${usuario}` : undefined}
              style={estilos.botonConfigurar}
            >
              <Icono nombre="salir" tamano={20} />
              {usuario ? `Cerrar sesión (${usuario})` : 'Cerrar sesión'}
            </button>
          )}
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
    borderBottom: '1px solid rgba(243, 238, 228, 0.12)'
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
    width: '52px',
    height: '52px',
    borderRadius: 'var(--radio-m)',
    background: 'var(--laton)',
    color: 'var(--pizarra)',
    flexShrink: 0
  },
  // Nombre del sistema, en la tipografía de la marca
  nombre: {
    display: 'block',
    fontFamily: 'var(--fuente-titulo)',
    fontSize: '26px',
    fontWeight: 700,
    lineHeight: 1,
    color: 'var(--laton)'
  },
  titulo: {
    margin: '4px 0 0',
    fontFamily: 'var(--fuente-texto)',
    fontSize: '17px',
    fontWeight: 600,
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
    gap: '8px',
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
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
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
