// src/componentes/UltimaActualizacion.jsx
// Recuadro con el último pedido que cambió de estado y el tiempo que lleva en ese estado.
//
// Props:
//   ultimoPedido {{ mesa: string, estado: string }} - Última mesa y estado recibidos del backend
//   segundos     {number} - Segundos transcurridos desde ese cambio (lo cuenta App)

import { formatearTiempo } from '../utils/formato';

function UltimaActualizacion({ ultimoPedido, segundos }) {
  const tonoEstado = TONOS_ESTADO[ultimoPedido.estado] ?? TONO_NEUTRO;

  return (
    <section style={estilos.destacado} aria-live="polite">
      <span aria-hidden="true" style={estilos.iconoDestacado}>
        🛎️
      </span>
      <div style={estilos.destacadoTexto}>
        <p style={estilos.etiqueta}>Última actualización</p>
        <div style={estilos.ultimoPedido}>
          <span style={estilos.ultimaMesa}>{ultimoPedido.mesa}</span>
          <span aria-hidden="true" style={estilos.flecha}>
            →
          </span>
          <span
            style={{
              ...estilos.pildoraEstado,
              background: tonoEstado.fondo,
              color: tonoEstado.texto,
              borderColor: tonoEstado.borde
            }}
          >
            {ultimoPedido.estado}
          </span>
        </div>
      </div>

      {/* Visualización del contador compacto */}
      {ultimoPedido.estado !== 'Sin Pedidos' && (
        <span
          title="Tiempo en el estado actual"
          style={{
            ...estilos.contador,
            background:
              segundos > 900 ? 'var(--color-peligro-suave)' : 'var(--color-superficie-alt)',
            color: segundos > 900 ? 'var(--color-peligro-texto)' : 'var(--color-acento-texto)',
            borderColor: segundos > 900 ? 'var(--color-peligro)' : 'var(--color-azafran)'
          }}
        >
          ⏱️ {formatearTiempo(segundos)}
        </span>
      )}
    </section>
  );
}

// Colores de la píldora de "Última actualización" según el estado del pedido
const TONOS_ESTADO = {
  'Recibido 📝': {
    fondo: 'var(--color-superficie-alt)',
    texto: 'var(--color-acento-texto)',
    borde: 'var(--color-azafran)'
  },
  'En Cocina 🍳': {
    fondo: 'var(--color-primario-suave)',
    texto: 'var(--color-primario-texto)',
    borde: 'var(--color-acento)'
  },
  'Listo 🍽️': {
    fondo: 'var(--color-exito-suave)',
    texto: 'var(--color-exito-texto)',
    borde: 'var(--color-exito)'
  }
};
const TONO_NEUTRO = {
  fondo: 'var(--color-superficie-alt)',
  texto: 'var(--color-texto-suave)',
  borde: 'var(--color-borde)'
};

// ── Estilos en línea: leen los tokens de index.css (modo claro y oscuro) ─────
const estilos = {
  destacado: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '18px',
    padding: '20px 24px',
    background: 'var(--color-superficie)',
    border: '1px solid var(--color-borde)',
    borderLeft: '5px solid var(--color-azafran)',
    borderRadius: 'var(--radio-l)',
    boxShadow: 'var(--sombra-1)'
  },
  iconoDestacado: {
    display: 'grid',
    placeItems: 'center',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'var(--color-superficie-alt)',
    fontSize: '26px',
    flexShrink: 0
  },
  destacadoTexto: {
    flex: '1 1 220px',
    minWidth: 0
  },
  etiqueta: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--color-acento-texto)',
    marginBottom: '4px'
  },
  ultimoPedido: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px'
  },
  ultimaMesa: {
    fontFamily: 'var(--fuente-titulo)',
    fontSize: '26px',
    fontWeight: 600,
    color: 'var(--color-texto)'
  },
  flecha: {
    color: 'var(--color-texto-tenue)',
    fontSize: '20px'
  },
  pildoraEstado: {
    display: 'inline-block',
    padding: '4px 14px',
    borderRadius: '999px',
    border: '1px solid',
    fontSize: '14px',
    fontWeight: 700
  },
  contador: {
    padding: '8px 14px',
    borderRadius: '999px',
    border: '1px solid',
    fontFamily: 'var(--fuente-mono)',
    fontSize: '15px',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums'
  }
};

export default UltimaActualizacion;
