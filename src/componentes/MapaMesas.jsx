// src/componentes/MapaMesas.jsx
// Plano de sala: cada mesa se dibuja vista desde arriba (tablero con sus sillas) y muestra
// su número y su estado. El estado se distingue por color, ícono y texto a la vez (REF-05).
// US-08: CA1 (mostrar mesas), CA2 (distinguir estados), CA3 (reflejar cambios), CA5 (seleccionar).
//
// Props:
//   mesas             {Array}       - Lista de mesas [{ id, numero, estado, estadoPedido? }]
//   mesaSeleccionada  {object|null} - Mesa actualmente seleccionada
//   onSeleccionar     {Function}    - Callback al tocar una mesa

import { estadoVisualMesa, contarEstados } from '../shared/utils/estadoMesa.js';
import Icono from '../shared/components/Icono.jsx';

const plural = (cantidad, singular, pluralizado) => (cantidad === 1 ? singular : pluralizado);

function MapaMesas({ mesas, mesaSeleccionada, onSeleccionar }) {
  const conteo = contarEstados(mesas);

  return (
    <div style={estilos.contenedor}>
      {/* Cabecera: título y resumen en una frase */}
      <div style={estilos.cabecera}>
        <h2 style={estilos.titulo}>Sala</h2>

        {mesas.length > 0 && (
          <p id="resumen-sala" style={estilos.resumen}>
            <span>
              {mesas.length} {plural(mesas.length, 'mesa', 'mesas')}
            </span>
            {': '}
            <span>
              {conteo.libre} {plural(conteo.libre, 'libre', 'libres')}
            </span>
            {', '}
            <span>
              {conteo.ocupada} {plural(conteo.ocupada, 'ocupada', 'ocupadas')}
            </span>
            {conteo.cocina > 0 && (
              <>
                {', '}
                <span>{conteo.cocina} en cocina</span>
              </>
            )}
            {conteo.listo > 0 && (
              <>
                {', '}
                <span>{conteo.listo} con pedido listo</span>
              </>
            )}
          </p>
        )}
      </div>

      {/* US-08 CA1: mostrar todas las mesas registradas */}
      {mesas.length === 0 && <p style={estilos.vacio}>Sin mesas registradas.</p>}

      {mesas.length > 0 && (
        <div style={estilos.plano}>
          {mesas.map((m) => {
            const visual = estadoVisualMesa(m);
            const estaSeleccionada = mesaSeleccionada?.id === m.id;

            return (
              // US-08 CA5: el mesero selecciona una mesa tocándola
              <button
                key={m.id}
                id={`mesa-${m.numero}`}
                data-estado={visual.clave}
                onClick={() => onSeleccionar(m)}
                title={`Mesa ${m.numero} — ${visual.etiqueta}`}
                aria-pressed={estaSeleccionada}
                style={{
                  ...estilos.mesa,
                  // US-08 CA2: color distintivo según estado (variables de index.css)
                  backgroundColor: `var(--mesa-${visual.clave})`,
                  color: `var(--mesa-${visual.clave}-texto)`,
                  // Resaltar la mesa seleccionada con un anillo azafrán
                  boxShadow: estaSeleccionada
                    ? '0 0 0 3px var(--color-superficie), 0 0 0 6px var(--color-azafran), var(--sombra-2)'
                    : 'var(--sombra-1)',
                  transform: estaSeleccionada ? 'scale(1.08)' : 'scale(1)'
                }}
              >
                {SILLAS.map((posicion, i) => (
                  <span key={i} aria-hidden="true" style={{ ...estilos.silla, ...posicion }} />
                ))}
                <span style={estilos.icono}>
                  <Icono nombre={visual.icono} tamano={28} />
                </span>
                <span style={estilos.numero}>Mesa {m.numero}</span>
                {/* US-08 CA2: estado explícito en texto, no solo color */}
                <span style={estilos.estado}>{visual.etiqueta}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Cuatro sillas alrededor del tablero: arriba, abajo, izquierda y derecha
const SILLAS = [
  { top: '-13px', left: '26%', width: '48%', height: '9px' },
  { bottom: '-13px', left: '26%', width: '48%', height: '9px' },
  { left: '-13px', top: '26%', height: '48%', width: '9px' },
  { right: '-13px', top: '26%', height: '48%', width: '9px' }
];

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
    gap: '8px 20px',
    marginBottom: '18px'
  },
  titulo: {
    margin: 0,
    fontSize: '26px'
  },
  resumen: {
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--color-texto)'
  },
  vacio: {
    padding: '32px 16px',
    textAlign: 'center',
    fontSize: '17px',
    color: 'var(--color-texto-suave)',
    border: '2px dashed var(--color-borde)',
    borderRadius: 'var(--radio-m)'
  },
  // El piso de la sala: una cuadrícula tenue sobre la que se reparten las mesas
  plano: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))',
    gap: '40px 34px',
    padding: '30px 28px',
    borderRadius: 'var(--radio-m)',
    border: '1px solid var(--color-borde)',
    backgroundColor: 'var(--piso)',
    backgroundImage:
      'linear-gradient(var(--piso-linea) 1px, transparent 1px), linear-gradient(90deg, var(--piso-linea) 1px, transparent 1px)',
    backgroundSize: '34px 34px'
  },
  // El tablero de la mesa: zona táctil amplia (mínimo 128 × 128 px)
  mesa: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    minHeight: '128px',
    padding: '10px 6px',
    borderRadius: 'var(--radio-m)',
    border: '2px solid rgba(0, 0, 0, 0.22)',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
  },
  silla: {
    position: 'absolute',
    borderRadius: '5px',
    background: 'var(--mesa-silla)'
  },
  icono: {
    fontSize: '26px',
    lineHeight: 1.1
  },
  numero: {
    fontFamily: 'var(--fuente-titulo)',
    fontWeight: 700,
    fontSize: '24px',
    lineHeight: 1.15
  },
  estado: {
    fontSize: '15px',
    fontWeight: 700,
    lineHeight: 1.2
  }
};

export default MapaMesas;
