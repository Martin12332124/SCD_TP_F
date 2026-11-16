// src/componentes/RielComandas.jsx
// Riel de comandas: como el riel metálico del pase de una cocina, muestra un ticket de
// papel por cada pedido en curso, del más antiguo al más nuevo. Cada ticket lleva la mesa,
// el estado del pedido y su propio temporizador.
//
// El temporizador cuenta el tiempo en el estado actual. Pasados 15 minutos el ticket entero
// se pone ámbar y pasados 20 minutos, rojo con la palabra "Atrasado" (REF-04): el cambio es
// de todo el ticket, para contar los atrasados de un vistazo desde lejos.
//
// Las comandas se calculan a partir de la lista de mesas (estadoPedido y pedidoDesde), así
// que un traslado mueve el ticket a la mesa nueva sin lógica aparte.
//
// Props:
//   mesas         {Array}    - Mesas [{ id, numero, estado, estadoPedido?, pedidoDesde? }]
//   ahora         {number}   - Hora actual en ms (la actualiza App cada segundo)
//   onSeleccionar {Function} - (mesa) => void. Abre el panel de la mesa del ticket

import Icono from './Icono';
import { estadoVisualPedido } from '../utils/estadoMesa';
import { formatearTiempo } from '../utils/formato';
import { comandasActivas, segundosDesde, urgencia } from '../utils/tiempoComanda';

const TEXTO_URGENCIA = {
  atencion: 'Más de 15 min',
  atrasado: 'Atrasado'
};

function RielComandas({ mesas, ahora, onSeleccionar }) {
  const comandas = comandasActivas(mesas).map((mesa) => {
    const segundos = segundosDesde(mesa.pedidoDesde, ahora);
    return {
      mesa,
      segundos,
      nivel: urgencia(segundos),
      visual: estadoVisualPedido(mesa.estadoPedido)
    };
  });
  const atrasadas = comandas.filter((c) => c.nivel === 'atrasado').length;

  return (
    <section aria-label="Comandas en curso" style={estilos.riel}>
      <div style={estilos.interior}>
        <div style={estilos.cabecera}>
          <h2 style={estilos.titulo}>Comandas</h2>
          <p id="resumen-comandas" style={estilos.resumen}>
            {comandas.length === 0
              ? 'Sin comandas en curso'
              : `${comandas.length} en curso` +
                (atrasadas > 0
                  ? `, ${atrasadas} ${atrasadas === 1 ? 'atrasada' : 'atrasadas'}`
                  : '')}
          </p>
        </div>

        {/* La barra de latón de la que cuelgan los tickets */}
        <div aria-hidden="true" style={estilos.barra} />

        {comandas.length === 0 ? (
          <p style={estilos.vacio}>
            Cuando una mesa tenga un pedido, su comanda aparecerá aquí con su tiempo.
          </p>
        ) : (
          <ol style={estilos.lista}>
            {comandas.map(({ mesa, segundos, nivel, visual }) => {
              const papel = PAPEL[nivel];
              return (
                <li key={mesa.id} style={estilos.item}>
                  <button
                    id={`comanda-${mesa.numero}`}
                    data-estado={visual.clave}
                    data-urgencia={nivel}
                    onClick={() => onSeleccionar(mesa)}
                    title={`Comanda de la mesa ${mesa.numero} — ${visual.etiqueta}`}
                    style={{ ...estilos.ticket, background: papel.fondo, color: papel.texto }}
                  >
                    {/* Pinza que sujeta el ticket a la barra */}
                    <span aria-hidden="true" style={estilos.pinza} />
                    <span
                      style={{
                        ...estilos.estado,
                        background: `var(--mesa-${visual.clave})`,
                        color: `var(--mesa-${visual.clave}-texto)`
                      }}
                    >
                      <Icono nombre={visual.icono} tamano={18} />
                      {visual.etiqueta}
                    </span>
                    <span style={estilos.mesa}>Mesa {mesa.numero}</span>
                    <span
                      data-tiempo
                      title="Tiempo en el estado actual"
                      style={{ ...estilos.tiempo, color: papel.tiempo }}
                    >
                      <Icono nombre="reloj" tamano={22} />
                      {segundos === null ? '--:--' : formatearTiempo(segundos)}
                    </span>
                    {TEXTO_URGENCIA[nivel] && (
                      <span style={estilos.aviso}>{TEXTO_URGENCIA[nivel]}</span>
                    )}
                  </button>
                  {/* Borde inferior dentado, como un ticket cortado */}
                  <span
                    aria-hidden="true"
                    style={{ ...estilos.dientes, '--papel-ticket': papel.fondo }}
                  />
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

/** Color del papel según la urgencia (todo el ticket cambia, no un indicador chico). */
const PAPEL = {
  normal: {
    fondo: 'var(--papel)',
    texto: 'var(--tinta)',
    tiempo: 'var(--tinta)'
  },
  atencion: {
    fondo: 'var(--papel-atencion)',
    texto: 'var(--papel-atencion-texto)',
    tiempo: 'var(--papel-atencion-texto)'
  },
  atrasado: {
    fondo: 'var(--papel-atraso)',
    texto: 'var(--papel-atraso-texto)',
    tiempo: 'var(--papel-atraso-texto)'
  }
};

// ── Estilos en línea: leen los tokens de index.css (modo claro y oscuro) ─────
const estilos = {
  riel: {
    background: 'var(--pizarra)',
    color: 'var(--pizarra-texto)',
    borderBottom: '4px solid var(--laton)'
  },
  interior: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '14px clamp(16px, 4vw, 40px) 18px'
  },
  cabecera: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '4px 16px'
  },
  titulo: {
    margin: 0,
    fontSize: '24px',
    color: 'var(--pizarra-texto)'
  },
  resumen: {
    fontFamily: 'var(--fuente-condensada)',
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--laton)'
  },
  barra: {
    height: '8px',
    margin: '10px 0 0',
    borderRadius: '2px',
    background: 'linear-gradient(180deg, #f1dca4 0%, var(--laton) 45%, #8a6a2a 100%)',
    boxShadow: '0 2px 3px rgba(0, 0, 0, 0.45)'
  },
  vacio: {
    padding: '18px 4px 4px',
    fontSize: '17px',
    color: 'var(--pizarra-texto)'
  },
  // Fila horizontal con scroll propio: en una tablet se desliza con el dedo
  lista: {
    display: 'flex',
    gap: '14px',
    listStyle: 'none',
    margin: 0,
    padding: '0 2px 10px',
    overflowX: 'auto'
  },
  item: {
    flex: '0 0 auto',
    display: 'flex',
    flexDirection: 'column'
  },
  ticket: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '8px',
    width: '176px',
    padding: '18px 14px 10px',
    border: 'none',
    borderRadius: '0',
    boxShadow: '0 6px 10px rgba(0, 0, 0, 0.35)',
    textAlign: 'left',
    cursor: 'pointer'
  },
  pinza: {
    position: 'absolute',
    top: '-2px',
    left: '50%',
    width: '46px',
    height: '10px',
    marginLeft: '-23px',
    borderRadius: '0 0 4px 4px',
    background: '#4b4f4c'
  },
  estado: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 8px',
    borderRadius: 'var(--radio-s)',
    fontSize: '16px',
    fontWeight: 700
  },
  mesa: {
    fontFamily: 'var(--fuente-titulo)',
    fontSize: '30px',
    fontWeight: 700,
    lineHeight: 1.05
  },
  tiempo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: 'var(--fuente-condensada)',
    fontSize: '34px',
    fontWeight: 700,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums'
  },
  aviso: {
    fontSize: '16px',
    fontWeight: 700
  },
  // Dientes de sierra con el mismo color del papel del ticket
  dientes: {
    display: 'block',
    height: '9px',
    width: '176px',
    background:
      'linear-gradient(135deg, var(--papel-ticket) 50%, transparent 50%) 0 0 / 12px 12px repeat-x, linear-gradient(225deg, var(--papel-ticket) 50%, transparent 50%) 0 0 / 12px 12px repeat-x'
  }
};

export default RielComandas;
