// src/TomaPedido.jsx
// Vista de toma de pedido — Paso 4: confirmar el pedido y enviarlo al backend por socket.
//
// Muestra todos los ítems del menú obtenidos de GET /api/menu-items.
// Permite agregar/quitar ítems en un carrito local con subtotales y total en CLP.
// Los productos agotados muestran la etiqueta "Agotado" y no se pueden agregar.
// Al confirmar emite 'confirmar_pedido' { mesa: "Mesa N", items } (queda directo En Cocina) y
// espera la 'respuesta_pedido' del backend: si es ok cierra la vista; si no, muestra el error.
// No incluye notas por ítem (US-03).
//
// Props:
//   mesa      {object}   - Mesa seleccionada { id, numero, estado }
//   onCerrar  {Function} - Callback para cerrar la vista y volver al mapa
//   socket    {object}   - Conexión socket.io compartida con App
//   conectado {boolean}  - true si el socket está conectado al backend

import { useState, useEffect } from 'react';
import { validarCantidad } from './validaciones';

const BASE_URL = 'http://localhost:3000';

/** Marco de esquinas cóncavas y rombos en proporción 1:1 fija (sin deformación al redimensionar). */
function MarcoConcavoRombos({ activo = false, fondo = 'var(--color-superficie)' }) {
  const colorTrazo = activo ? 'var(--color-azafran)' : 'var(--color-borde)';
  const colorInterior = activo ? 'var(--color-borde)' : 'var(--color-borde-suave)';

  const esquina = (rotacion, pos) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 14 14"
      fill="none"
      style={{
        position: 'absolute',
        width: '14px',
        height: '14px',
        pointerEvents: 'none',
        transform: `rotate(${rotacion}deg)`,
        ...pos
      }}
    >
      <rect x="0" y="0" width="10" height="10" fill={fondo} />
      <path d="M 0 10 A 10 10 0 0 0 10 0" stroke={colorInterior} strokeWidth="1" />
      <polygon points="3.5,1 6,3.5 3.5,6 1,3.5" fill={colorTrazo} />
    </svg>
  );

  return (
    <div
      aria-hidden="true"
      style={{
        ...estilos.marcoInterior,
        borderColor: colorInterior
      }}
    >
      {esquina(0, { top: '-1px', left: '-1px' })}
      {esquina(90, { top: '-1px', right: '-1px' })}
      {esquina(180, { bottom: '-1px', right: '-1px' })}
      {esquina(270, { bottom: '-1px', left: '-1px' })}
    </div>
  );
}

function TomaPedido({ mesa, onCerrar, socket, conectado }) {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Estructura: { [itemId]: { item, cantidad } }
  const [carrito, setCarrito] = useState({});

  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [errorCantidad, setErrorCantidad] = useState('');

  useEffect(() => {
    const alResponder = (resultado) => {
      setEnviando(false);
      if (resultado.ok) {
        onCerrar();
      } else {
        setErrorEnvio(
          `⚠️ ${resultado.error}` + (resultado.esperado ? ` (Esperado: ${resultado.esperado})` : '')
        );
      }
    };
    socket.on('respuesta_pedido', alResponder);
    return () => socket.off('respuesta_pedido', alResponder);
  }, [socket, onCerrar]);

  useEffect(() => {
    fetch(`${BASE_URL}/api/menu-items`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.ok) {
          setItems(data.items);
        } else {
          setError('No se pudo cargar el menú. Intenta de nuevo.');
        }
      })
      .catch(() => {
        setError('Error de red al cargar el menú. Verifica que el servidor esté activo.');
      })
      .finally(() => {
        setCargando(false);
      });
  }, []);

  const formatearPrecio = (precio) =>
    precio.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });

  const confirmarPedido = () => {
    if (enviando || !conectado) return;
    setErrorEnvio('');
    const invalida = entradasCarrito.find(({ cantidad }) => !validarCantidad(cantidad).esValido);
    if (invalida) {
      setErrorEnvio(validarCantidad(invalida.cantidad).mensajeError);
      return;
    }
    setEnviando(true);
    socket.emit('confirmar_pedido', {
      mesa: mesa.id,
      items: entradasCarrito.map(({ item, cantidad }) => ({ id: item.id, cantidad }))
    });
  };

  const agregarAlCarrito = (item) => {
    if (!item.disponible) return;
    const siguiente = (carrito[item.id]?.cantidad ?? 0) + 1;
    const validacion = validarCantidad(siguiente);
    if (!validacion.esValido) {
      setErrorCantidad(validacion.mensajeError);
      return;
    }
    setErrorCantidad('');
    setCarrito((prev) => {
      const entrada = prev[item.id];
      return {
        ...prev,
        [item.id]: {
          item,
          cantidad: entrada ? entrada.cantidad + 1 : 1
        }
      };
    });
  };

  const incrementarCantidad = (itemId) => {
    const validacion = validarCantidad(carrito[itemId].cantidad + 1);
    if (!validacion.esValido) {
      setErrorCantidad(validacion.mensajeError);
      return;
    }
    setErrorCantidad('');
    setCarrito((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], cantidad: prev[itemId].cantidad + 1 }
    }));
  };

  const decrementarCantidad = (itemId) => {
    setCarrito((prev) => {
      const entrada = prev[itemId];
      if (!entrada) return prev;
      if (entrada.cantidad <= 1) {
        const { [itemId]: _, ...resto } = prev;
        return resto;
      }
      return { ...prev, [itemId]: { ...entrada, cantidad: entrada.cantidad - 1 } };
    });
  };

  const quitarDelCarrito = (itemId) => {
    setCarrito((prev) => {
      const { [itemId]: _, ...resto } = prev;
      return resto;
    });
  };

  const entradasCarrito = Object.values(carrito);

  const totalCarrito = entradasCarrito.reduce(
    (acc, { item, cantidad }) => acc + item.precioBase * cantidad,
    0
  );

  const carritoVacio = entradasCarrito.length === 0;
  const disponibles = items.filter((i) => i.disponible).length;

  return (
    <div
      style={estilos.overlay}
      role="dialog"
      aria-label={`Tomar pedido para la mesa ${mesa.numero}`}
    >
      {/* Encabezado ornamental con identificación de mesa y botón de cierre */}
      <div style={estilos.encabezado}>
        <div style={estilos.barraMarcoExterior}>
          <div style={estilos.encabezadoInterior}>
            <span aria-hidden="true" style={estilos.cruzBarra}>
              ┼
            </span>
            <div style={estilos.identidad}>
              <h2 style={estilos.titulo}>Tomar pedido</h2>
              <p style={estilos.subtitulo}>Mesa {mesa.numero}</p>
            </div>
            <button
              id="btn-cerrar-toma-pedido"
              onClick={onCerrar}
              title="Volver al mapa de mesas"
              style={estilos.btnCerrar}
            >
              ✕ Cerrar
            </button>
            <span aria-hidden="true" style={estilos.cruzBarra}>
              ┼
            </span>
          </div>
        </div>
      </div>

      {/* Cuerpo principal: columna de productos + panel de carrito */}
      <div style={estilos.cuerpo}>
        {/* ── Columna izquierda: lista de productos ─────────────────────── */}
        <div style={estilos.columnaProductos}>
          {cargando && <p style={estilos.mensaje}>Cargando menú...</p>}

          {!cargando && error && (
            <div role="alert" style={estilos.errorBox}>
              <p>{error}</p>
            </div>
          )}

          {!cargando && !error && items.length === 0 && (
            <p style={estilos.mensaje}>
              El menú no tiene ítems registrados. Un administrador puede agregarlos desde la API.
            </p>
          )}

          {!cargando && !error && items.length > 0 && (
            <>
              <div style={estilos.cabeceraMenu}>
                <h3 style={estilos.tituloMenu}>Carta</h3>
                <p style={estilos.conteo}>
                  {items.length} producto{items.length !== 1 ? 's' : ''} en el menú ({disponibles}{' '}
                  disponible{disponibles !== 1 ? 's' : ''})
                </p>
              </div>
              <div style={estilos.grilla}>
                {items.map((item) => {
                  const enCarrito = Boolean(carrito[item.id]);
                  return (
                    <div
                      key={item.id}
                      id={`producto-${item.id}`}
                      style={{
                        ...estilos.tarjeta,
                        ...(enCarrito ? estilos.tarjetaEnCarrito : {}),
                        ...(item.disponible ? {} : estilos.tarjetaAgotada)
                      }}
                    >
                      <MarcoConcavoRombos activo={enCarrito} />

                      <p style={estilos.nombreProducto}>{item.nombre}</p>

                      <p style={estilos.precio}>{formatearPrecio(item.precioBase)}</p>

                      <span
                        style={{
                          ...estilos.badge,
                          ...(item.disponible ? estilos.tonoExito : estilos.tonoPeligro)
                        }}
                      >
                        {item.disponible ? '✅ Disponible' : '🚫 Agotado'}
                      </span>

                      <button
                        id={`btn-agregar-${item.id}`}
                        onClick={() => agregarAlCarrito(item)}
                        disabled={!item.disponible}
                        style={{
                          ...estilos.btnAgregar,
                          ...(item.disponible ? {} : estilos.btnAgregarDeshabilitado)
                        }}
                        title={
                          item.disponible
                            ? `Agregar ${item.nombre} al pedido`
                            : `${item.nombre} está agotado`
                        }
                      >
                        {item.disponible ? '+ Agregar' : 'Agotado'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Panel lateral derecho: carrito con esquinas cóncavas y rombos ── */}
        <div style={estilos.panelCarrito}>
          <MarcoConcavoRombos />
          <div style={estilos.contenidoCarrito}>
            <h3 style={estilos.tituloCarrito}>Pedido</h3>

            {carritoVacio ? (
              <p style={estilos.carritoVacio}>
                Selecciona productos del menú para armar el pedido.
              </p>
            ) : (
              <>
                <ul style={estilos.listaCarrito}>
                  {entradasCarrito.map(({ item, cantidad }) => (
                    <li key={item.id} id={`carrito-item-${item.id}`} style={estilos.itemCarrito}>
                      <div style={estilos.itemInfo}>
                        <span style={estilos.itemNombre}>{item.nombre}</span>
                        <span style={estilos.itemSubtotal}>
                          {formatearPrecio(item.precioBase * cantidad)}
                        </span>
                      </div>

                      <div style={estilos.controlesQty}>
                        <div style={estilos.selectorQty}>
                          <button
                            id={`btn-decrementar-${item.id}`}
                            onClick={() => decrementarCantidad(item.id)}
                            style={estilos.btnQty}
                            title="Reducir cantidad"
                            aria-label={`Reducir cantidad de ${item.nombre}`}
                          >
                            −
                          </button>
                          <span id={`cantidad-${item.id}`} style={estilos.cantidad}>
                            {cantidad}
                          </span>
                          <button
                            id={`btn-incrementar-${item.id}`}
                            onClick={() => incrementarCantidad(item.id)}
                            style={estilos.btnQty}
                            title="Aumentar cantidad"
                            aria-label={`Aumentar cantidad de ${item.nombre}`}
                          >
                            +
                          </button>
                        </div>
                        <button
                          id={`btn-quitar-${item.id}`}
                          onClick={() => quitarDelCarrito(item.id)}
                          style={estilos.btnQuitar}
                          title={`Quitar ${item.nombre} del pedido`}
                          aria-label={`Quitar ${item.nombre} del pedido`}
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div style={estilos.totalBox}>
                  <span style={estilos.totalLabel}>Total:</span>
                  <span id="total-carrito" style={estilos.totalValor}>
                    {formatearPrecio(totalCarrito)}
                  </span>
                </div>

                {errorCantidad && (
                  <div id="error-cantidad" role="alert" style={estilos.errorEnvio}>
                    {errorCantidad}
                  </div>
                )}

                {errorEnvio && (
                  <div id="error-envio" role="alert" style={estilos.errorEnvio}>
                    {errorEnvio}
                  </div>
                )}
                <button
                  id="btn-confirmar-pedido"
                  onClick={confirmarPedido}
                  disabled={enviando || !conectado}
                  style={{
                    ...estilos.btnConfirmar,
                    ...(enviando || !conectado ? estilos.btnConfirmarDeshabilitado : {})
                  }}
                >
                  {enviando ? 'Enviando...' : 'Confirmar pedido'}
                </button>
                {!conectado && <p style={estilos.notaConfirmar}>Sin conexión con el servidor.</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Estilos en línea: usan propiedades no-shorthand de borde para evitar warnings en re-render ──
const estilos = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'var(--color-fondo)',
    backgroundImage: "url('/noise-texture.png'), var(--gradiente-lienzo)",
    backgroundRepeat: 'repeat, no-repeat',
    backgroundSize: '160px 160px, 100% 100%',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    color: 'var(--color-texto)',
    lineHeight: 1.6,
    textAlign: 'left'
  },
  encabezado: {
    maxWidth: '1280px',
    width: '100%',
    margin: '0 auto',
    padding: '16px clamp(16px, 4vw, 40px) 0',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  barraMarcoExterior: {
    padding: '4px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--color-borde-suave)',
    background: 'var(--color-superficie)',
    boxShadow: 'var(--sombra-1)'
  },
  encabezadoInterior: {
    padding: '10px clamp(16px, 3vw, 32px)',
    borderTop: '1px solid var(--color-borde)',
    borderBottom: '1px solid var(--color-borde)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px'
  },
  cruzBarra: {
    fontSize: '12px',
    color: 'var(--color-texto-suave)',
    userSelect: 'none',
    flexShrink: 0
  },
  identidad: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: '14px'
  },
  titulo: {
    margin: 0,
    fontSize: 'clamp(22px, 3vw, 28px)',
    fontWeight: 400,
    color: 'var(--color-texto)'
  },
  subtitulo: {
    padding: '2px 12px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--color-borde)',
    background: 'var(--color-superficie-alt)',
    color: 'var(--color-texto)',
    fontSize: '15px',
    fontStyle: 'italic'
  },
  btnCerrar: {
    padding: '6px 16px',
    background: 'var(--color-superficie-alt)',
    color: 'var(--color-texto)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--color-borde)',
    fontSize: '15px',
    fontStyle: 'italic',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  cuerpo: {
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
    padding: 'clamp(16px, 3vw, 32px) clamp(16px, 4vw, 40px)',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: '24px'
  },
  columnaProductos: {
    flex: '3 1 480px',
    minWidth: 0
  },
  mensaje: {
    textAlign: 'center',
    color: 'var(--color-texto-suave)',
    fontStyle: 'italic',
    fontSize: '17px',
    marginTop: '40px'
  },
  errorBox: {
    background: 'var(--color-peligro-suave)',
    color: 'var(--color-peligro-texto)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--color-peligro)',
    padding: '16px',
    textAlign: 'center',
    marginTop: '24px'
  },
  cabeceraMenu: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '18px',
    paddingBottom: '10px',
    borderBottom: '1px solid var(--color-borde-suave)'
  },
  tituloMenu: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 400
  },
  conteo: {
    color: 'var(--color-texto-suave)',
    fontStyle: 'italic',
    fontSize: '15px'
  },
  grilla: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '18px'
  },
  marcoInterior: {
    position: 'absolute',
    inset: '6px',
    borderWidth: '1px',
    borderStyle: 'solid',
    pointerEvents: 'none'
  },
  tarjeta: {
    position: 'relative',
    background: 'var(--color-superficie)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--color-borde)',
    padding: '22px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '10px',
    boxShadow: 'var(--sombra-1)',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
  },
  tarjetaEnCarrito: {
    borderColor: 'var(--color-azafran)',
    boxShadow: '0 0 0 2px var(--color-azafran), var(--sombra-2)'
  },
  tarjetaAgotada: {
    opacity: 0.7
  },
  nombreProducto: {
    position: 'relative',
    zIndex: 2,
    margin: 0,
    fontFamily: 'var(--fuente-titulo)',
    fontWeight: 400,
    fontSize: '20px',
    lineHeight: 1.25
  },
  precio: {
    position: 'relative',
    zIndex: 2,
    margin: 0,
    fontSize: '18px',
    fontStyle: 'italic',
    color: 'var(--color-primario-texto)',
    fontVariantNumeric: 'tabular-nums'
  },
  badge: {
    position: 'relative',
    zIndex: 2,
    fontSize: '13px',
    fontStyle: 'italic',
    padding: '2px 10px',
    borderWidth: '1px',
    borderStyle: 'solid'
  },
  tonoExito: {
    background: 'var(--color-exito-suave)',
    color: 'var(--color-exito-texto)',
    borderColor: 'var(--color-exito)'
  },
  tonoPeligro: {
    background: 'var(--color-peligro-suave)',
    color: 'var(--color-peligro-texto)',
    borderColor: 'var(--color-peligro)'
  },
  btnAgregar: {
    position: 'relative',
    zIndex: 2,
    marginTop: 'auto',
    padding: '9px 14px',
    background: 'var(--color-primario)',
    color: 'var(--color-sobre-primario)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--color-borde)',
    fontSize: '15px',
    cursor: 'pointer',
    width: '100%'
  },
  btnAgregarDeshabilitado: {
    background: 'var(--color-superficie-alt)',
    color: 'var(--color-texto-tenue)',
    cursor: 'not-allowed'
  },
  panelCarrito: {
    position: 'sticky',
    top: '100px',
    flex: '1 1 300px',
    background: 'var(--color-superficie)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--color-borde)',
    boxShadow: 'var(--sombra-2)',
    padding: '24px 22px',
    display: 'flex',
    flexDirection: 'column'
  },
  contenidoCarrito: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column'
  },
  tituloCarrito: {
    margin: '0 0 16px 0',
    fontSize: '24px',
    fontWeight: 400
  },
  carritoVacio: {
    color: 'var(--color-texto-tenue)',
    fontSize: '15px',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '24px 8px',
    borderWidth: '1px',
    borderStyle: 'dashed',
    borderColor: 'var(--color-borde)'
  },
  listaCarrito: {
    listStyle: 'none',
    margin: 0,
    padding: 0
  },
  itemCarrito: {
    borderBottom: '1px dashed var(--color-borde-suave)',
    paddingBottom: '14px',
    marginBottom: '14px'
  },
  itemInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
    gap: '8px'
  },
  itemNombre: {
    fontSize: '16px',
    flex: 1
  },
  itemSubtotal: {
    fontSize: '16px',
    fontStyle: 'italic',
    color: 'var(--color-primario-texto)',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums'
  },
  controlesQty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px'
  },
  selectorQty: {
    display: 'inline-flex',
    alignItems: 'center',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--color-borde)',
    background: 'var(--color-superficie-alt)',
    padding: '2px'
  },
  btnQty: {
    width: '28px',
    height: '28px',
    borderWidth: 0,
    background: 'var(--color-superficie)',
    color: 'var(--color-texto)',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    padding: 0
  },
  cantidad: {
    minWidth: '32px',
    textAlign: 'center',
    fontSize: '15px',
    fontVariantNumeric: 'tabular-nums'
  },
  btnQuitar: {
    width: '28px',
    height: '28px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--color-borde)',
    background: 'transparent',
    color: 'var(--color-peligro-texto)',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0
  },
  totalBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTop: '1px solid var(--color-borde)',
    paddingTop: '12px',
    marginTop: '4px'
  },
  totalLabel: {
    fontFamily: 'var(--fuente-titulo)',
    fontStyle: 'italic',
    fontSize: '20px'
  },
  totalValor: {
    fontFamily: 'var(--fuente-titulo)',
    fontSize: '26px',
    color: 'var(--color-primario-texto)',
    fontVariantNumeric: 'tabular-nums'
  },
  errorEnvio: {
    marginTop: '12px',
    padding: '10px 12px',
    lineHeight: 1.5,
    background: 'var(--color-peligro-suave)',
    color: 'var(--color-peligro-texto)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--color-peligro)',
    fontSize: '14px'
  },
  btnConfirmar: {
    marginTop: '16px',
    padding: '13px',
    background: 'var(--color-primario)',
    color: 'var(--color-sobre-primario)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--color-borde)',
    fontSize: '16px',
    cursor: 'pointer',
    width: '100%'
  },
  btnConfirmarDeshabilitado: {
    background: 'var(--color-superficie-alt)',
    color: 'var(--color-texto-tenue)',
    cursor: 'not-allowed'
  },
  notaConfirmar: {
    marginTop: '12px',
    fontSize: '13px',
    color: 'var(--color-texto-tenue)',
    fontStyle: 'italic',
    textAlign: 'center'
  }
};

export default TomaPedido;
