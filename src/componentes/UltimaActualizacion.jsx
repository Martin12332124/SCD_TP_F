// src/componentes/UltimaActualizacion.jsx
// Franja con el último pedido que cambió de estado y el tiempo que lleva en ese estado.
// El estado se muestra en un bloque con el mismo color que usa esa mesa en el plano.
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
    : estilos.estadoNeutro;
  const alerta = segundos > 900; // más de 15 minutos en el mismo estado

  return (
    <section
      aria-live="polite"
      aria-label="Último cambio"
      style={{
        ...estilos.franja,
        borderLeftColor: visual ? `var(--mesa-${visual.clave})` : 'var(--color-borde)'
      }}
    >
      <div style={estilos.texto}>
        <h2 style={estilos.titulo}>Último cambio</h2>
        <div style={estilos.ultimoPedido}>
          <span style={estilos.ultimaMesa}>{ultimoPedido.mesa}</span>
          <span aria-hidden="true" style={estilos.flecha}>
            →
          </span>
          <span id="ultimo-estado" style={{ ...estilos.estado, ...tono }}>
            {ultimoPedido.estado}
          </span>
        </div>
      </div>

      {/* Cronómetro del estado actual */}
      {ultimoPedido.estado !== 'Sin Pedidos' && (
        <span
          title="Tiempo en el estado actual"
          style={{
            ...estilos.contador,
            background: alerta ? 'var(--color-peligro-suave)' : 'var(--color-superficie-alt)',
            color: alerta ? 'var(--color-peligro-texto)' : 'var(--color-acento-texto)',
            borderColor: alerta ? 'var(--color-peligro)' : 'var(--color-azafran)'
          }}
        >
          ⏱️ {formatearTiempo(segundos)}
        </span>
      )}
    </section>
  );
}

// ── Estilos en línea: leen los tokens de index.css (modo claro y oscuro) ─────
const estilos = {
  franja: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px 24px',
    padding: '16px 22px',
    background: 'var(--color-superficie)',
    border: '1px solid var(--color-borde)',
    borderLeft: '10px solid',
    borderRadius: 'var(--radio-l)',
    boxShadow: 'var(--sombra-1)'
  },
  texto: {
    flex: '1 1 260px',
    minWidth: 0
  },
  titulo: {
    margin: '0 0 6px',
    fontSize: '18px',
    color: 'var(--color-texto)'
  },
  ultimoPedido: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px'
  },
  ultimaMesa: {
    fontFamily: 'var(--fuente-titulo)',
    fontSize: '30px',
    fontWeight: 700,
    color: 'var(--color-texto)'
  },
  flecha: {
    color: 'var(--color-texto)',
    fontSize: '24px'
  },
  // Bloque rectangular con el color sólido del estado
  estado: {
    display: 'inline-block',
    padding: '6px 14px',
    borderRadius: 'var(--radio-s)',
    fontSize: '20px',
    fontWeight: 700
  },
  estadoNeutro: {
    background: 'var(--color-superficie-alt)',
    color: 'var(--color-texto)',
    border: '2px solid var(--color-borde)'
  },
  contador: {
    padding: '10px 16px',
    borderRadius: 'var(--radio-m)',
    border: '2px solid',
    fontFamily: 'var(--fuente-mono)',
    fontSize: '22px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums'
  }
};

export default UltimaActualizacion;
