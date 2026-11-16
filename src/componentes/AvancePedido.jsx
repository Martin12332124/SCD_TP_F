// src/componentes/AvancePedido.jsx
// Bloque "Pedido" del panel de una mesa ocupada: muestra en qué paso va el pedido
// (Recibido → En cocina → Listo) y ofrece un solo botón grande con el siguiente paso válido.
//
// Por qué un solo botón y no tres: el backend solo acepta avanzar un paso a la vez. Mostrar
// los tres con dos deshabilitados agrega ruido y más riesgo de tocar el equivocado en una
// tablet; la barra de progreso ya enseña el orden completo y dónde va el pedido.
//
// Props:
//   estadoPedido    {string|null} - Estado vigente del pedido, o null si la mesa no tiene pedido
//   conectado       {boolean}     - Sin conexión, los botones se deshabilitan
//   onCambiarEstado {Function}    - (estado) => void. Pide al backend pasar el pedido a ese estado
//   onTomarPedido   {Function}    - () => void. Abre la carta para tomar o agregar productos

import {
  FLUJO_PEDIDO,
  ESTADO_RECIBIDO,
  ESTADO_EN_COCINA,
  ESTADO_LISTO,
  siguienteEstado
} from '../utils/flujoPedido';
import { estadoVisualPedido } from '../utils/estadoMesa';

/** Nombre corto de cada paso en la barra de progreso. */
const PASOS = [
  { estado: ESTADO_RECIBIDO, etiqueta: 'Recibido' },
  { estado: ESTADO_EN_COCINA, etiqueta: 'En cocina' },
  { estado: ESTADO_LISTO, etiqueta: 'Listo' }
];

/** Texto del botón que lleva el pedido a cada estado. */
const ACCION_HACIA = {
  [ESTADO_EN_COCINA]: '🍳 Enviar a cocina',
  [ESTADO_LISTO]: '🍽️ Marcar pedido listo'
};

function AvancePedido({ estadoPedido, conectado, onCambiarEstado, onTomarPedido }) {
  const sinPedido = !estadoPedido;
  const posicion = FLUJO_PEDIDO.indexOf(estadoPedido); // -1: sin pedido o estado desconocido
  const siguiente = siguienteEstado(estadoPedido);
  const visualSiguiente = estadoVisualPedido(siguiente);

  return (
    <div id="avance-pedido">
      {/* Barra de progreso: los pasos cumplidos y el actual van rellenos con su color */}
      <ol aria-label="Progreso del pedido" style={estilos.pasos}>
        {PASOS.map((paso, i) => {
          const situacion = i < posicion ? 'hecho' : i === posicion ? 'actual' : 'pendiente';
          const visual = estadoVisualPedido(paso.estado);
          return (
            <li
              key={paso.estado}
              data-paso={situacion}
              aria-current={situacion === 'actual' ? 'step' : undefined}
              style={{
                ...estilos.paso,
                ...(situacion === 'pendiente'
                  ? estilos.pasoPendiente
                  : {
                      background: `var(--mesa-${visual.clave})`,
                      color: `var(--mesa-${visual.clave}-texto)`
                    }),
                ...(situacion === 'actual' ? estilos.pasoActual : {})
              }}
            >
              {paso.etiqueta}
            </li>
          );
        })}
      </ol>

      {/* Sin pedido: el siguiente paso es tomarlo */}
      {sinPedido && (
        <>
          <button
            id="btn-tomar-pedido"
            onClick={onTomarPedido}
            disabled={!conectado}
            style={{ ...estilos.boton, ...estilos.botonPrimario }}
          >
            📝 Tomar pedido
          </button>
          <button
            id="btn-registrar-sin-productos"
            onClick={() => onCambiarEstado(ESTADO_RECIBIDO)}
            disabled={!conectado}
            style={{ ...estilos.boton, ...estilos.botonSecundario }}
          >
            Registrar pedido sin productos
          </button>
        </>
      )}

      {/* Con pedido en curso: un solo botón con el siguiente paso válido */}
      {!sinPedido && siguiente && (
        <button
          id="btn-avanzar-pedido"
          data-estado-siguiente={siguiente}
          onClick={() => onCambiarEstado(siguiente)}
          disabled={!conectado}
          style={{
            ...estilos.boton,
            background: `var(--mesa-${visualSiguiente.clave})`,
            color: `var(--mesa-${visualSiguiente.clave}-texto)`,
            borderColor: 'transparent'
          }}
        >
          {ACCION_HACIA[siguiente]}
        </button>
      )}

      {/* Pedido listo: no hay siguiente paso; se libera la mesa o se pide otra ronda */}
      {estadoPedido === ESTADO_LISTO && (
        <p id="pedido-listo-ayuda" style={estilos.ayuda}>
          El pedido está listo. La mesa sigue ocupada hasta que la liberes; también puedes agregar
          productos para otra ronda.
        </p>
      )}

      {/* Estado que este frontend no conoce: se muestra tal cual, sin ofrecer un paso */}
      {!sinPedido && posicion === -1 && (
        <p style={estilos.ayuda}>Estado del pedido: {estadoPedido}</p>
      )}

      {!sinPedido && (
        <button
          id="btn-agregar-productos"
          onClick={onTomarPedido}
          disabled={!conectado}
          style={{ ...estilos.boton, ...estilos.botonSecundario }}
        >
          Agregar productos
        </button>
      )}
    </div>
  );
}

// ── Estilos en línea: leen los tokens de index.css (modo claro y oscuro) ─────
const estilos = {
  // Barra continua dividida en tres segmentos: los cumplidos y el actual se rellenan
  // con el color de su estado; los pendientes quedan con el fondo de la barra.
  pasos: {
    display: 'flex',
    listStyle: 'none',
    margin: '0 0 14px',
    padding: 0,
    borderRadius: 'var(--radio-s)',
    overflow: 'hidden',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: 'var(--color-texto-suave)'
  },
  paso: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '46px',
    padding: '6px 4px',
    fontSize: '16px',
    fontWeight: 700,
    textAlign: 'center'
  },
  pasoPendiente: {
    background: 'var(--color-superficie)',
    color: 'var(--color-texto)'
  },
  // El paso en el que está el pedido se marca con un subrayado grueso
  pasoActual: {
    boxShadow: 'inset 0 -6px 0 var(--color-texto)'
  },
  boton: {
    display: 'block',
    width: '100%',
    minHeight: 'var(--toque)',
    padding: '12px 14px',
    marginBottom: '10px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderRadius: 'var(--radio-m)',
    fontSize: '17px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  botonPrimario: {
    background: 'var(--color-primario)',
    color: 'var(--color-sobre-primario)',
    borderColor: 'var(--color-primario)'
  },
  botonSecundario: {
    background: 'var(--color-superficie)',
    color: 'var(--color-texto)',
    borderColor: 'var(--color-texto-suave)'
  },
  ayuda: {
    margin: '0 0 12px',
    fontSize: '16px',
    color: 'var(--color-texto)'
  }
};

export default AvancePedido;
