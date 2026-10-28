// src/MapaMesas.jsx
// Componente de solo lectura que muestra el estado visual de todas las mesas.
// US-08: CA1 (mostrar mesas), CA2 (distinguir estados), CA3 (reflejar cambios), CA5 (seleccionar).
//
// Props:
//   mesas             {Array}       - Lista de mesas [{ id, numero, estado }]
//   mesaSeleccionada  {object|null} - Mesa actualmente seleccionada
//   onSeleccionar     {Function}    - Callback al hacer clic en una mesa

function MapaMesas({ mesas, mesaSeleccionada, onSeleccionar }) {
  return (
    <div style={estilos.contenedor}>
      <h3 style={estilos.titulo}>🗺️ Estado de Mesas</h3>

      {/* US-08 CA1: mostrar todas las mesas registradas */}
      {mesas.length === 0 && (
        <p style={estilos.vacio}>Sin mesas registradas.</p>
      )}

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
              style={{
                ...estilos.tarjeta,
                // US-08 CA2: color distintivo según estado
                background: estaOcupada ? '#dc3545' : '#28a745',
                // Resaltar la mesa seleccionada
                outline: estaSeleccionada ? '3px solid #fff' : '3px solid transparent',
                boxShadow: estaSeleccionada
                  ? '0 0 0 5px rgba(0,0,0,0.35)'
                  : '0 2px 6px rgba(0,0,0,0.2)',
                transform: estaSeleccionada ? 'scale(1.08)' : 'scale(1)'
              }}
            >
              <span style={estilos.numero}>Mesa {m.numero}</span>
              {/* US-08 CA2: etiqueta de estado explícita */}
              <span style={estilos.etiqueta}>{estaOcupada ? 'Ocupada' : 'Libre'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Estilos en línea (consistente con el estilo actual del proyecto) ────────
const estilos = {
  contenedor: {
    marginTop: '20px'
  },
  titulo: {
    marginBottom: '12px'
  },
  vacio: {
    color: '#888',
    fontStyle: 'italic'
  },
  grilla: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    justifyContent: 'center'
  },
  tarjeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '90px',
    height: '80px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    color: 'white',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease, outline 0.15s ease',
    padding: '8px'
  },
  numero: {
    fontWeight: 'bold',
    fontSize: '14px',
    marginBottom: '4px'
  },
  etiqueta: {
    fontSize: '11px',
    opacity: 0.9
  }
};

export default MapaMesas;
