// src/componentes/UltimaActualizacion.jsx
// Franja con el último pedido que cambió de estado y el tiempo que lleva en ese estado.
// La parte izquierda toma el color sólido del estado (el mismo que la mesa en el plano)
// y la derecha muestra el cronómetro en grande.
//
// Props:
//   ultimoPedido {{ mesa: string, estado: string }} - Última mesa y estado recibidos del backend
//   segundos     {number} - Segundos transcurridos desde ese cambio (lo cuenta App)

import { formatearTiempo } from '../utils/formato';
import { estadoVisualPedido } from '../utils/estadoMesa';

function UltimaActualizacion({ ultimoPedido, segundos }) {
  // null cuando todavía no hay pedidos ("Sin Pedidos"): se usa el tono neutro
  const visual = estadoVisualPedido(ultimoPedido.estado);
  const tono = visual
    ? { background: `var(--mesa-${visual.clave})`, color: `var(--mesa-${visual.clave}-texto)` }
    : { background: 'var(--color-superficie-alt)', color: 'var(--color-texto)' };
  const alerta = segundos > 900; // más de 15 minutos en el mismo estado
  const hayPedido = ultimoPedido.estado !== 'Sin Pedidos';

  return (
    <section aria-live="polite" aria-label="Último cambio" style={estilos.franja}>
      <div id="ultimo-estado" style={{ ...estilos.estado, ...tono }}>
        <h2 style={estilos.titulo}>Último cambio</h2>
        <p style={estilos.linea}>
          <span>{ultimoPedido.mesa}</span>
          <span aria-hidden="true"> → </span>
          <span>{ultimoPedido.estado}</span>
        </p>
      </div>

      {/* Cronómetro del estado actual: texto grande, rojo pasados 15 minutos */}
      {hayPedido && (
        <div
          style={{
            ...estilos.reloj,
            background: alerta ? 'var(--color-peligro-suave)' : 'var(--color-superficie)'
          }}
        >
          <span
            title="Tiempo en el estado actual"
            style={{
              ...estilos.contador,
              color: alerta ? 'var(--color-peligro-texto)' : 'var(--color-acento-texto)'
            }}
          >
            ⏱️ {formatearTiempo(segundos)}
          </span>
        </div>
      )}
    </section>
  );
}

// ── Estilos en línea: leen los tokens de index.css (modo claro y oscuro) ─────
const estilos = {
  franja: {
    display: 'flex',
    flexWrap: 'wrap',
    overflow: 'hidden',
    borderRadius: 'var(--radio-l)',
    boxShadow: 'var(--sombra-1)'
  },
  estado: {
    flex: '1 1 300px',
    minWidth: 0,
    padding: '14px 22px'
  },
  titulo: {
    margin: '0 0 2px',
    fontSize: '18px',
    color: 'inherit'
  },
  linea: {
    fontFamily: 'var(--fuente-titulo)',
    fontSize: 'clamp(24px, 3.4vw, 32px)',
    fontWeight: 700,
    lineHeight: 1.2
  },
  reloj: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 1 220px',
    padding: '14px 22px'
  },
  contador: {
    fontFamily: 'var(--fuente-mono)',
    fontSize: '32px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums'
  }
};

export default UltimaActualizacion;
