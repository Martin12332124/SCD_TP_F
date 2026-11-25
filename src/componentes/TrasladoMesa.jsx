// src/componentes/TrasladoMesa.jsx
// Bloque "Trasladar pedido" del panel de una mesa (US-05): el destino se elige tocando
// una de las otras mesas, sin escribir números. Solo se pueden elegir mesas libres;
// las ocupadas aparecen deshabilitadas para que se vea por qué no se ofrecen.
//
// Props:
//   mesaOrigen  {object}   - Mesa del panel { id, numero, estado }
//   mesas       {Array}    - Todas las mesas [{ id, numero, estado }]
//   conectado   {boolean}  - Sin conexión, nada se puede elegir ni enviar
//   onTrasladar {Function} - (origen, destino) => void, con los números de mesa

import { useState } from 'react';
import Icono from '../shared/components/Icono.jsx';

function TrasladoMesa({ mesaOrigen, mesas, conectado, onTrasladar }) {
  // Destino elegido. Se guarda con la mesa de origen para no arrastrarlo a otro panel.
  const [eleccion, setEleccion] = useState({ origenId: null, destino: null });
  const otras = mesas.filter((m) => m.id !== mesaOrigen.id);
  const destinoElegido = eleccion.origenId === mesaOrigen.id ? eleccion.destino : null;
  // Si el destino elegido se ocupó o desapareció mientras tanto, se descarta
  const destino = otras.find((m) => m.numero === destinoElegido && m.estado === 'libre') ?? null;
  const hayLibres = otras.some((m) => m.estado === 'libre');

  return (
    <div id="traslado-mesa">
      {!hayLibres && <p style={estilos.texto}>No hay otra mesa libre para recibir el pedido.</p>}

      {hayLibres && (
        <>
          <p id="traslado-ayuda" style={estilos.texto}>
            Elige la mesa de destino:
          </p>
          <div role="group" aria-labelledby="traslado-ayuda" style={estilos.grilla}>
            {otras.map((m) => {
              const libre = m.estado === 'libre';
              const elegida = destino?.numero === m.numero;
              return (
                <button
                  key={m.id}
                  id={`destino-${m.numero}`}
                  onClick={() => setEleccion({ origenId: mesaOrigen.id, destino: m.numero })}
                  disabled={!conectado || !libre}
                  aria-pressed={elegida}
                  title={libre ? `Mesa ${m.numero} — libre` : `Mesa ${m.numero} — ocupada`}
                  style={{
                    ...estilos.destino,
                    ...(elegida ? estilos.destinoElegido : {})
                  }}
                >
                  {m.numero}
                </button>
              );
            })}
          </div>
        </>
      )}

      <button
        id="btn-trasladar"
        onClick={() => onTrasladar(mesaOrigen.numero, destino.numero)}
        disabled={!conectado || !destino}
        style={estilos.botonTrasladar}
      >
        <Icono nombre="trasladar" tamano={22} />{' '}
        {destino ? `Trasladar a Mesa ${destino.numero}` : 'Trasladar pedido'}
      </button>
    </div>
  );
}

// ── Estilos en línea: leen los tokens de index.css (modo claro y oscuro) ─────
const estilos = {
  texto: {
    margin: '0 0 10px',
    fontSize: '16px',
    color: 'var(--color-texto)'
  },
  grilla: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(var(--toque), 1fr))',
    gap: '8px',
    marginBottom: '12px'
  },
  destino: {
    minHeight: 'var(--toque)',
    padding: '6px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: 'var(--color-texto-suave)',
    borderRadius: 'var(--radio-s)',
    background: 'var(--color-superficie)',
    color: 'var(--color-texto)',
    fontSize: '19px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  // La mesa elegida toma el color de "libre" con borde grueso
  destinoElegido: {
    background: 'var(--mesa-libre)',
    color: 'var(--mesa-libre-texto)',
    borderColor: 'var(--color-texto)',
    borderWidth: '3px'
  },
  botonTrasladar: {
    display: 'block',
    width: '100%',
    minHeight: 'var(--toque)',
    padding: '12px 14px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: 'var(--color-primario)',
    borderRadius: 'var(--radio-m)',
    background: 'var(--color-primario)',
    color: 'var(--color-sobre-primario)',
    fontSize: '17px',
    fontWeight: 700,
    cursor: 'pointer'
  }
};

export default TrasladoMesa;
