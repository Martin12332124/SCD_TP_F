// src/DetalleMesa.jsx
// Panel lateral deslizable que muestra el detalle de la mesa seleccionada.
// US-08 CA5: "cuando el mesero seleccione una mesa, entonces verá su número
//             o nombre y su cuenta abierta, si la tiene."
//
// Props:
//   mesa      {object|null} - Mesa seleccionada { id, numero, estado } o null
//   onCerrar  {Function}    - Callback para cerrar el panel

function DetalleMesa({ mesa, onCerrar }) {
  const estaOcupada = mesa?.estado === 'ocupada';

  return (
    <>
      {/* Overlay semitransparente: clic fuera cierra el panel */}
      <div
        id="detalle-mesa-overlay"
        onClick={onCerrar}
        style={{
          ...estilos.overlay,
          // El panel se anima con opacity al aparecer/desaparecer
          opacity: mesa ? 1 : 0,
          pointerEvents: mesa ? 'auto' : 'none'
        }}
      />

      {/* Panel lateral deslizable */}
      <div
        id="detalle-mesa-panel"
        style={{
          ...estilos.panel,
          // Deslizamiento: visible si hay mesa seleccionada
          transform: mesa ? 'translateX(0)' : 'translateX(105%)'
        }}
      >
        {mesa && (
          <>
            {/* Cabecera del panel */}
            <div style={estilos.cabecera}>
              <h2 style={estilos.titulo}>Mesa {mesa.numero}</h2>
              <button
                id="btn-cerrar-panel"
                onClick={onCerrar}
                title="Cerrar panel"
                style={estilos.btnCerrar}
              >
                ✕
              </button>
            </div>

            {/* US-08 CA2: estado de la mesa con color distintivo */}
            <div
              style={{
                ...estilos.badgeEstado,
                background: estaOcupada ? '#dc3545' : '#28a745'
              }}
            >
              {estaOcupada ? '🔴 Ocupada' : '🟢 Libre'}
            </div>

            {/* US-08 CA5: cuenta abierta si la tiene */}
            <div style={estilos.seccion}>
              <h4 style={estilos.subtitulo}>📋 Cuenta</h4>
              {estaOcupada ? (
                <p style={estilos.textoInfo}>
                  Esta mesa tiene actividad. Para gestionar pedidos,
                  próximamente disponible en US-12.
                </p>
              ) : (
                <p style={{ color: '#888', fontStyle: 'italic' }}>
                  Sin cuenta abierta.
                </p>
              )}
            </div>

            {/* Información general */}
            <div style={estilos.seccion}>
              <h4 style={estilos.subtitulo}>ℹ️ Información</h4>
              <p style={estilos.textoInfo}>
                <strong>ID interno:</strong> {mesa.id}
              </p>
              <p style={estilos.textoInfo}>
                <strong>Estado:</strong>{' '}
                {estaOcupada ? 'Ocupada' : 'Libre'}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Estilos en línea (consistente con el estilo actual del proyecto) ────────
const estilos = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    zIndex: 100,
    transition: 'opacity 0.25s ease'
  },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '300px',
    height: '100vh',
    background: '#fff',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.2)',
    zIndex: 101,
    padding: '24px',
    boxSizing: 'border-box',
    transition: 'transform 0.3s ease',
    overflowY: 'auto',
    fontFamily: 'Arial, sans-serif'
  },
  cabecera: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  titulo: {
    margin: 0,
    fontSize: '22px'
  },
  btnCerrar: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#666',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  badgeEstado: {
    display: 'inline-block',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px',
    padding: '6px 14px',
    borderRadius: '20px',
    marginBottom: '20px'
  },
  seccion: {
    borderTop: '1px solid #eee',
    paddingTop: '16px',
    marginBottom: '16px'
  },
  subtitulo: {
    margin: '0 0 8px 0',
    fontSize: '15px',
    color: '#333'
  },
  textoInfo: {
    margin: '4px 0',
    fontSize: '14px',
    color: '#555'
  }
};

export default DetalleMesa;
