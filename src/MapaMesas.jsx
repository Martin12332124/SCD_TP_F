// src/MapaMesas.jsx
// Componente de solo lectura que muestra el estado visual de todas las mesas.
// US-08: CA1 (mostrar mesas), CA2 (distinguir estados), CA3 (reflejar cambios), CA5 (seleccionar).
//
// Props:
//   mesas             {Array}       - Lista de mesas [{ id, numero, estado }]
//   mesaSeleccionada  {object|null} - Mesa actualmente seleccionada
//   onSeleccionar     {Function}    - Callback al hacer clic en una mesa

// US-08 CA2: colores distintivos por estado dentro de la paleta Café & Beige
const COLOR_LIBRE = '#fdfaf5';
const COLOR_OCUPADA = '#e5c2a3';

/** Esquinas cóncavas y rombos en proporción 1:1 fija (no se deforman al redimensionar la ventana). */
function BordesConcavosRombos({ activa, ocupada }) {
  const colorTrazo = activa ? 'var(--color-azafran)' : 'var(--color-borde)';
  const colorInterior = activa || ocupada ? 'var(--color-borde)' : 'var(--color-borde-suave)';
  const fondoEsquina = ocupada ? 'var(--color-mesa-ocupada)' : 'var(--color-mesa-libre)';

  const esquina = (rotacion, pos) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 14 14"
      fill="none"
      style={{
        position: 'absolute',
        width: '14px',
        height: '14px',
        pointerEvents: 'none',
        transform: `rotate(${rotacion}deg)`,
        ...pos
      }}
    >
      <rect x="0" y="0" width="10" height="10" fill={fondoEsquina} />
      <path d="M 0 10 A 10 10 0 0 0 10 0" stroke={colorInterior} strokeWidth="1" />
      <polygon points="3.5,1 6,3.5 3.5,6 1,3.5" fill={colorTrazo} />
    </svg>
  );

  return (
    <div
      aria-hidden="true"
      style={{
        ...estilos.marcoInterior,
        borderColor: colorInterior
      }}
    >
      {esquina(0, { top: '-1px', left: '-1px' })}
      {esquina(90, { top: '-1px', right: '-1px' })}
      {esquina(180, { bottom: '-1px', right: '-1px' })}
      {esquina(270, { bottom: '-1px', left: '-1px' })}
    </div>
  );
}

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
              <span
                aria-hidden="true"
                style={{
                  ...estilos.punto,
                  background: COLOR_LIBRE,
                  border: '1.5px solid var(--color-borde)'
                }}
              />
              {libres} {libres === 1 ? 'libre' : 'libres'}
            </span>
            <span style={estilos.itemLeyenda}>
              <span
                aria-hidden="true"
                style={{
                  ...estilos.romboLeyenda,
                  background: 'var(--color-borde)',
                  border: '1px solid var(--color-borde)'
                }}
              />
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
              className="tarjeta-mesa"
              data-ocupada={estaOcupada}
              onClick={() => onSeleccionar(m)}
              title={`Mesa ${m.numero} — ${estaOcupada ? 'Ocupada' : 'Libre'}`}
              aria-pressed={estaSeleccionada}
              style={{
                ...estilos.tarjeta,
                // US-08 CA2: color distintivo según estado que destaca claramente del fondo
                backgroundColor: estaOcupada ? COLOR_OCUPADA : COLOR_LIBRE,
                borderColor: estaSeleccionada ? 'var(--color-azafran)' : 'var(--color-borde)',
                // Resaltar la mesa seleccionada con un anillo azafrán/caramelo
                boxShadow: estaSeleccionada
                  ? '0 0 0 2px var(--color-superficie), 0 0 0 4px var(--color-azafran), var(--sombra-2)'
                  : 'var(--sombra-1)',
                transform: estaSeleccionada ? 'scale(1.08)' : 'scale(1)'
              }}
            >
              <BordesConcavosRombos activa={estaSeleccionada} ocupada={estaOcupada} />

              <span style={estilos.numero}>Mesa {m.numero}</span>

              {estaSeleccionada && (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 60 6"
                  fill="none"
                  style={estilos.ondaSeleccion}
                >
                  <path
                    d="M1 3C5 0.5 9 5.5 13 3C17 0.5 21 5.5 25 3C29 0.5 33 5.5 37 3C41 0.5 45 5.5 49 3C53 0.5 57 5.5 59 3"
                    stroke="var(--color-azafran)"
                    strokeWidth="1.35"
                  />
                </svg>
              )}

              {/* US-08 CA2 y REF-05: pastilla con símbolo geométrico redundante (◆ vs ○) para daltonismo */}
              <span
                style={{
                  ...estilos.insigniaEstado,
                  background: estaOcupada ? '#36190c' : 'transparent',
                  color: estaOcupada ? '#fdfaf5' : 'var(--color-texto-suave)',
                  borderColor: estaOcupada ? '#36190c' : 'var(--color-borde-suave)'
                }}
              >
                <span aria-hidden="true" style={estilos.simboloEstado}>
                  {estaOcupada ? '◆' : '○'}
                </span>
                <span style={estilos.estado}>{estaOcupada ? 'Ocupada' : 'Libre'}</span>
              </span>
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
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--color-borde-suave)'
  },
  etiqueta: {
    fontSize: '14px',
    fontStyle: 'italic',
    color: 'var(--color-texto-suave)',
    marginBottom: '2px'
  },
  titulo: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 400
  },
  leyenda: {
    display: 'flex',
    gap: '16px',
    fontSize: '15px',
    fontStyle: 'italic',
    color: 'var(--color-texto-suave)'
  },
  itemLeyenda: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  punto: {
    width: '9px',
    height: '9px',
    borderRadius: '50%'
  },
  romboLeyenda: {
    width: '8px',
    height: '8px',
    transform: 'rotate(45deg)'
  },
  vacio: {
    padding: '32px 16px',
    textAlign: 'center',
    color: 'var(--color-texto-tenue)',
    fontStyle: 'italic',
    border: '1px dashed var(--color-borde)'
  },
  grilla: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
    gap: '18px'
  },
  tarjeta: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    minHeight: '122px',
    padding: '18px 14px',
    borderWidth: '1px',
    borderStyle: 'solid',
    cursor: 'pointer',
    color: 'var(--color-texto)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
  },
  marcoInterior: {
    position: 'absolute',
    inset: '6px',
    borderWidth: '1px',
    borderStyle: 'solid',
    pointerEvents: 'none'
  },
  numero: {
    position: 'relative',
    zIndex: 2,
    fontFamily: 'var(--fuente-titulo)',
    fontWeight: 400,
    fontSize: '24px',
    letterSpacing: '-0.01em',
    color: 'var(--color-texto)'
  },
  ondaSeleccion: {
    position: 'relative',
    zIndex: 2,
    width: '56px',
    height: '6px',
    marginTop: '1px'
  },
  insigniaEstado: {
    position: 'relative',
    zIndex: 2,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '2px 10px',
    marginTop: '3px',
    borderWidth: '1px',
    borderStyle: 'solid'
  },
  simboloEstado: {
    fontSize: '10px',
    fontStyle: 'normal',
    lineHeight: 1
  },
  estado: {
    fontSize: '14px',
    fontStyle: 'italic',
    lineHeight: 1.2
  }
};

export default MapaMesas;
