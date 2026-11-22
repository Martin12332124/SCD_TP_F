// src/componentes/AvisoConexionLocal.jsx
// Solo modo nube. Franja fija arriba de la app que dice si el servidor del restaurante
// está conectado. El local sube su estado a Supabase al menos cada 30 s, así que si la última
// sincronización tiene menos de 75 s (dos periodos y medio) se considera conectado.
// Se reevalúa cada 15 s aunque no llegue ningún aviso (un local caído no avisa nada).
//
// Props:
//   ultima {string|null|undefined} - Hora ISO de la última sincronización; null = nunca;
//                                    undefined = todavía no se sabe (no se muestra nada)

import { useState, useEffect } from 'react';
import Icono from './Icono';

export const UMBRAL_CONEXION_MS = 75000;
export const REEVALUAR_MS = 15000;

/** "HH:MM" en la hora local del navegador. */
const horaCorta = (iso) =>
  new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });

function AvisoConexionLocal({ ultima }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), REEVALUAR_MS);
    return () => clearInterval(id);
  }, []);

  if (ultima === undefined) return null;

  const hora = ultima ? new Date(ultima).getTime() : NaN;
  const conectado = Number.isFinite(hora) && ahora - hora < UMBRAL_CONEXION_MS;

  return (
    <div
      id="aviso-conexion-local"
      role="status"
      data-conectado={conectado}
      style={{ ...estilos.franja, ...(conectado ? estilos.ok : estilos.caido) }}
    >
      <Icono nombre={conectado ? 'conectado' : 'desconectado'} tamano={20} />
      <span>
        {conectado
          ? 'Conectado al sistema del restaurante'
          : `El sistema del restaurante no está conectado${
              Number.isFinite(hora) ? ` desde las ${horaCorta(ultima)}` : ''
            }. Puedes ver los últimos datos, pero los cambios quedarán en espera hasta que se conecte.`}
      </span>
    </div>
  );
}

const estilos = {
  franja: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '10px clamp(16px, 4vw, 40px)',
    fontSize: '16px',
    lineHeight: 1.4,
    textAlign: 'center'
  },
  // Conectado: discreto, verde suave
  ok: {
    background: 'var(--color-exito-suave)',
    color: 'var(--color-exito-texto)',
    fontWeight: 600
  },
  // Desconectado: ámbar sólido y en negrita, claramente distinto
  caido: {
    background: 'var(--mesa-cocina)',
    color: 'var(--mesa-cocina-texto)',
    fontWeight: 700,
    borderBottom: '3px solid var(--color-azafran)'
  }
};

export default AvisoConexionLocal;
