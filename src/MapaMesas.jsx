// src/MapaMesas.jsx
// Componente de solo lectura que muestra el estado visual de todas las mesas.
// US-08: CA1 (mostrar mesas), CA2 (distinguir estados), CA3 (reflejar cambios), CA5 (seleccionar).
//
// Props:
//   mesas             {Array}       - Lista de mesas [{ id, numero, estado }]
//   mesaSeleccionada  {object|null} - Mesa actualmente seleccionada
//   onSeleccionar     {Function}    - Callback al hacer clic en una mesa

// US-08 CA2: colores distintivos por estado (los valida MapaMesas.test.jsx)
const COLOR_LIBRE = '#28a745';
const COLOR_OCUPADA = '#dc3545';

function MapaMesas({ mesas, mesaSeleccionada, onSeleccionar }) {
  const ocupadas = mesas.filter((m) => m.estado === 'ocupada').length;
  const libres = mesas.length - ocupadas;

  return (
    <div style={estilos.contenedor}>
      {/* Cabecera con título y leyenda de estados */}
      <div style={estilos.cabecera}>
        <div>
          <p style={estilos.etiqueta}>Sala</p>
          <h3 style={estilos.titulo}>Estado de mesas</h3>
        </div>

        {mesas.length > 0 && (
          <div style={estilos.leyenda}>
            <span style={estilos.itemLeyenda}>
              <span style={{ ...estilos.punto, background: COLOR_LIBRE }} />
              {libres} {libres === 1 ? 'libre' : 'libres'}
            </span>
            <span style={estilos.itemLeyenda}>
              <span style={{ ...estilos.punto, background: COLOR_OCUPADA }} />
              {ocupadas} {ocupadas === 1 ? 'ocupada' : 'ocupadas'}
            </span>
          </div>
        )}
      </div>

      {/* US-08 CA1: mostrar todas las mesas registradas */}
      {mesas.length === 0 && <p style={estilos.vacio}>Sin mesas registradas.</p>}

      <div style={estilos.grilla}>
        {mesas.map((m) => {
          const estaOcupada = m.estado === 'ocupada';
          const estaSeleccionada = mesaSeleccionada?.id === m.id;

          return (
            // US-08 CA5: el mesero puede seleccionar una mesa haciendo clic
            <button
              key={m.id}
              id={`mesa-${m.numero}`}
              onClick={() => onSeleccionar(m)}
              title={`Mesa ${m.numero} — ${estaOcupada ? 'Ocupada' : 'Libre'}`}
              aria-pressed={estaSeleccionada}
              style={{
                ...estilos.tarjeta,
                // US-08 CA2: color distintivo según estado
                backgroundColor: estaOcupada ? COLOR_OCUPADA : COLOR_LIBRE,
                // Resaltar la mesa seleccionada con un anillo azafrán
                boxShadow: estaSeleccionada
                  ? '0 0 0 3px var(--color-superficie), 0 0 0 6px var(--color-azafran), var(--sombra-2)'
                  : 'var(--sombra-1)',
                transform: estaSeleccionada ? 'scale(1.08)' : 'scale(1)'
              }}
            >
              <span aria-hidden="true" style={estilos.icono}>
                {estaOcupada ? '🍷' : '🪑'}
              </span>
              <span style={estilos.numero}>Mesa {m.numero}</span>
              {/* US-08 CA2: etiqueta de estado explícita */}
              <span style={estilos.estado}>{estaOcupada ? 'Ocupada' : 'Libre'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Estilos en línea: leen los tokens de index.css (modo claro y oscuro) ─────
const estilos = {
  contenedor: {
    textAlign: 'left'
  },
  cabecera: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '20px'
  },
  etiqueta: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--color-acento-texto)',
    marginBottom: '4px'
  },
  titulo: {
    margin: 0,
    fontSize: '20px'
  },
  leyenda: {
    display: 'flex',
    gap: '14px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-texto-suave)'
  },
  itemLeyenda: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  punto: {
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },
  vacio: {
    padding: '32px 16px',
    textAlign: 'center',
    color: 'var(--color-texto-tenue)',
    fontStyle: 'italic',
    border: '1px dashed var(--color-borde)',
    borderRadius: 'var(--radio-m)'
  },
  grilla: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))',
    gap: '14px'
  },
  tarjeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    minHeight: '108px',
    padding: '12px 8px',
    borderRadius: 'var(--radio-m)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    // Brillo sutil sobre el color de estado, sin cambiar el backgroundColor
    backgroundImage: 'linear-gradient(160deg, rgba(255, 255, 255, 0.16), rgba(0, 0, 0, 0.14))',
    cursor: 'pointer',
    color: 'white',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
  },
  icono: {
    fontSize: '20px',
    lineHeight: 1
  },
  // Texto grande y en negrita: legible sobre el verde y el rojo de estado
  numero: {
    fontFamily: 'var(--fuente-titulo)',
    fontWeight: 700,
    fontSize: '19px',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)'
  },
  estado: {
    padding: '2px 10px',
    borderRadius: '999px',
    background: 'rgba(0, 0, 0, 0.24)',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase'
  }
};

export default MapaMesas;
