// src/componentes/Icono.jsx
// Íconos de línea propios (SVG en el código, sin depender de internet ni de emojis).
// Toman el color del texto que los rodea (currentColor), así sirven igual en tema claro
// y oscuro y sobre cualquier color de estado.
//
// Props:
//   nombre {string} - Uno de los nombres de TRAZOS (ej. 'olla', 'reloj')
//   tamano {number} - Ancho y alto en px (24 por defecto)
//   titulo {string} - Texto para lectores de pantalla. Sin título, el ícono es decorativo.

const TRAZOS = {
  // Estados de mesa
  // Silla de frente: respaldo, asiento y patas
  silla: (
    <>
      <rect x="7" y="3" width="10" height="7" rx="1.5" />
      <path d="M8 10v3M16 10v3" />
      <path d="M5 13h14" />
      <path d="M7 13v8M17 13v8" />
    </>
  ),
  personas: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 14.4A5 5 0 0 1 21 19" />
    </>
  ),
  libreta: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  olla: (
    <>
      <path d="M4 11h16v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" />
      <path d="M2 11h20" />
      <path d="M9 3.5c0 1.5 1 1.5 1 3M14 3.5c0 1.5 1 1.5 1 3" />
    </>
  ),
  campana: (
    <>
      <path d="M5 17a7 7 0 0 1 14 0" />
      <path d="M3 17h18" />
      <path d="M12 10V8M10 8h4" />
      <path d="M5 20h14" />
    </>
  ),
  // Acciones e interfaz
  reloj: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2" />
      <path d="M10 2h4" />
    </>
  ),
  ajustes: (
    <>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  cerrar: <path d="M6 6l12 12M18 6L6 18" />,
  trasladar: (
    <>
      <path d="M4 8h15M15 4l4 4-4 4" />
      <path d="M20 16H5M9 12l-4 4 4 4" />
    </>
  ),
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  luna: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  conectado: <path d="M5 12.5l4.5 4.5L19 7" />,
  desconectado: (
    <>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4M12 17v.5" />
    </>
  ),
  carrito: (
    <>
      <path d="M3 4h2l2.4 11h11L21 8H6.2" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </>
  )
};

function Icono({ nombre, tamano = 24, titulo }) {
  const trazo = TRAZOS[nombre];
  if (!trazo) return null;
  return (
    <svg
      data-icono={nombre}
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      focusable="false"
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}
    >
      {trazo}
    </svg>
  );
}

export default Icono;
