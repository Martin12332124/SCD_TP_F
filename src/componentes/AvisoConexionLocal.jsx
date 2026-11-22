// src/componentes/AvisoConexionLocal.jsx
// Solo modo nube. Franja fija arriba de la app que dice si el servidor del restaurante
// está conectado (criterio compartido con nube.js: ../utils/conexionLocal.js).
// Se reevalúa cada 15 s aunque no llegue ningún aviso (un local caído no avisa nada).
// Los botones siguen habilitados con el local desconectado: cada cambio se rechaza al
// intentarlo, con un mensaje claro (nada queda en cola).
//
// Props:
//   ultima {string|null|undefined} - Hora ISO de la última sincronización; null = nunca;
//                                    undefined = todavía no se sabe (no se muestra nada)

import { useState, useEffect } from 'react';
import Icono from './Icono';
import { localConectado, horaDeUltima } from '../utils/conexionLocal';

export const REEVALUAR_MS = 15000;

function AvisoConexionLocal({ ultima }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), REEVALUAR_MS);
    return () => clearInterval(id);
  }, []);

  if (ultima === undefined) return null;

  const conectado = localConectado(ultima, ahora);

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
              horaDeUltima(ultima) ? ` desde las ${horaDeUltima(ultima)}` : ''
            }. Puedes ver los últimos datos, pero no se pueden hacer cambios hasta que se conecte.`}
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
