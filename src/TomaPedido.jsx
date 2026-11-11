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
//   mesa      {object} - Mesa seleccionada { id, numero, estado }
//   onCerrar  {Function} - Callback para cerrar la vista y volver al mapa
//   socket    {object}   - Conexión socket.io compartida con App
//   conectado {boolean}  - true si el socket está conectado al backend

import { useState, useEffect } from 'react';
import { validarCantidad } from './validaciones';
import { formatearPrecio } from './utils/formato';

const BASE_URL = 'http://localhost:3000';

function TomaPedido({ mesa, onCerrar, socket, conectado }) {
  // Lista de ítems del menú cargados desde el backend
  const [items, setItems] = useState([]);
  // cargando empieza en true: la petición se lanza al montar, antes de cualquier render
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // ── Paso 2: estado del carrito ────────────────────────────────────────────────
  // Estructura: { [itemId]: { item, cantidad } }
  // Usamos un objeto indexado por id para O(1) en lecturas/actualizaciones.
  const [carrito, setCarrito] = useState({});

  // ── Paso 4: estado del envío ──────────────────────────────────────────────────
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  // Error de validación de cantidad (entero de 1 a 99 por producto)
  const [errorCantidad, setErrorCantidad] = useState('');

  // Escucha la respuesta del backend mientras la vista está montada.
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

  // Carga los ítems del menú al montar el componente.
  // No se llama setState en el cuerpo del efecto; los cambios de estado
  // ocurren únicamente dentro de los callbacks de la promesa (.then / .catch / .finally).
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


  // ── Paso 2: lógica del carrito ────────────────────────────────────────────────

  /** Paso 4: envía el pedido al backend. El resultado llega por 'respuesta_pedido'. */
  const confirmarPedido = () => {
    if (enviando || !conectado) return;
    setErrorEnvio('');
    // Segunda barrera: ninguna cantidad inválida llega al backend
    const invalida = entradasCarrito.find(({ cantidad }) => !validarCantidad(cantidad).esValido);
    if (invalida) {
      setErrorEnvio(validarCantidad(invalida.cantidad).mensajeError);
      return;
    }
    setEnviando(true);
    // Atajo: el backend registra el pedido y lo envía directo a cocina
    // Se envían solo id y cantidad: el backend toma nombre y precio del menú
    socket.emit('confirmar_pedido', {
      mesa: mesa.id,
      items: entradasCarrito.map(({ item, cantidad }) => ({ id: item.id, cantidad }))
    });
  };

  /** Agrega un ítem al carrito; si ya existe, incrementa su cantidad. */
  const agregarAlCarrito = (item) => {
    // Paso 3 (US-04 CA2): un producto agotado no se puede agregar
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

  /** Incrementa la cantidad de un ítem ya en el carrito. */
  const incrementarCantidad = (itemId) => {
    // US-13 CA3: no se permite superar el máximo por producto
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

  /** Decrementa la cantidad; si llega a 0, elimina el ítem del carrito. */
  const decrementarCantidad = (itemId) => {
    setCarrito((prev) => {
      const entrada = prev[itemId];
      if (!entrada) return prev;
      if (entrada.cantidad <= 1) {
        // quitar el ítem del carrito
        const { [itemId]: _, ...resto } = prev;
        return resto;
      }
      return { ...prev, [itemId]: { ...entrada, cantidad: entrada.cantidad - 1 } };
    });
  };

  /** Elimina completamente un ítem del carrito. */
  const quitarDelCarrito = (itemId) => {
    setCarrito((prev) => {
      const { [itemId]: _, ...resto } = prev;
      return resto;
    });
  };

  // Entradas del carrito como array para renderizar el panel
  const entradasCarrito = Object.values(carrito);

  // Total del carrito en pesos CLP
  const totalCarrito = entradasCarrito.reduce(
    (acc, { item, cantidad }) => acc + item.precioBase * cantidad,
    0
  );

  const carritoVacio = entradasCarrito.length === 0;

  const disponibles = items.filter((i) => i.disponible).length;

  return (
    // Pantalla completa sobre el resto de la UI, dividida en dos columnas
    <div
      style={estilos.overlay}
      role="dialog"
      aria-label={`Tomar pedido para la mesa ${mesa.numero}`}
    >
      {/* Encabezado con identificación de mesa y botón de cierre */}
      <div style={estilos.encabezado}>
        <div style={estilos.encabezadoInterior}>
          <div style={estilos.identidad}>
            <h2 style={estilos.titulo}>📝 Tomar pedido</h2>
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
        </div>
      </div>

      {/* Cuerpo principal: columna de productos + panel de carrito */}
      <div style={estilos.cuerpo}>
        {/* ── Columna izquierda: lista de productos ─────────────────────── */}
        <div style={estilos.columnaProductos}>
          {/* Estado de carga */}
          {cargando && <p style={estilos.mensaje}>⏳ Cargando menú...</p>}

          {/* Error al cargar */}
          {!cargando && error && (
            <div role="alert" style={estilos.errorBox}>
              <p>{error}</p>
            </div>
          )}

          {/* Menú vacío */}
          {!cargando && !error && items.length === 0 && (
            <p style={estilos.mensaje}>
              El menú no tiene ítems registrados. Un administrador puede agregarlos desde la API.
            </p>
          )}

          {/* Grilla de tarjetas de productos */}
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
                  const enCarrito = carrito[item.id];
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
                      {/* Nombre del producto */}
                      <p style={estilos.nombreProducto}>{item.nombre}</p>

                      {/* Precio base */}
                      <p style={estilos.precio}>{formatearPrecio(item.precioBase)}</p>

                      {/* Indicador de disponibilidad — base para US-04 (Paso 3) */}
                      <span
                        style={{
                          ...estilos.badge,
                          ...(item.disponible ? estilos.tonoExito : estilos.tonoPeligro)
                        }}
                      >
                        {item.disponible ? '✅ Disponible' : '🚫 Agotado'}
                      </span>

                      {/* Paso 2: botón "+ Agregar" */}
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

        {/* ── Panel lateral derecho: carrito ────────────────────────────── */}
        <div style={estilos.panelCarrito}>
          <h3 style={estilos.tituloCarrito}>🛒 Pedido</h3>

          {carritoVacio ? (
            <p style={estilos.carritoVacio}>Selecciona productos del menú para armar el pedido.</p>
          ) : (
            <>
              {/* Lista de ítems en el carrito */}
              <ul style={estilos.listaCarrito}>
                {entradasCarrito.map(({ item, cantidad }) => (
                  <li key={item.id} id={`carrito-item-${item.id}`} style={estilos.itemCarrito}>
                    {/* Nombre e información */}
                    <div style={estilos.itemInfo}>
                      <span style={estilos.itemNombre}>{item.nombre}</span>
                      <span style={estilos.itemSubtotal}>
                        {formatearPrecio(item.precioBase * cantidad)}
                      </span>
                    </div>

                    {/* Controles de cantidad */}
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

              {/* Separador y total */}
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

              {/* Paso 4: confirmar pedido */}
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
                {enviando ? 'Enviando...' : '✅ Confirmar pedido'}
              </button>
              {!conectado && <p style={estilos.notaConfirmar}>Sin conexión con el servidor.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Estilos en línea: leen los tokens de index.css (modo claro y oscuro) ─────
const estilos = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--color-fondo)',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    color: 'var(--color-texto)',
    lineHeight: 1.6,
    textAlign: 'left'
  },
  encabezado: {
    background: 'var(--fondo-encabezado)',
    borderBottom: '3px solid var(--color-azafran)',
    boxShadow: 'var(--sombra-2)',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  encabezadoInterior: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '16px clamp(16px, 4vw, 40px)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px'
  },
  identidad: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '12px'
  },
  titulo: {
    margin: 0,
    fontSize: 'clamp(20px, 3vw, 24px)',
    color: 'var(--color-encabezado-texto)'
  },
  subtitulo: {
    padding: '3px 12px',
    borderRadius: '999px',
    background: 'var(--color-azafran)',
    color: '#2b1a12',
    fontSize: '13px',
    fontWeight: 700
  },
  btnCerrar: {
    padding: '8px 16px',
    background: 'rgba(244, 236, 227, 0.1)',
    color: 'var(--color-encabezado-texto)',
    border: '1px solid rgba(244, 236, 227, 0.3)',
    borderRadius: '999px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 600,
    whiteSpace: 'nowrap'
  },
  // Cuerpo en dos columnas que se apilan solas en pantallas angostas (flex-wrap)
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
  // ── Columna de productos
  columnaProductos: {
    flex: '3 1 480px',
    minWidth: 0
  },
  mensaje: {
    textAlign: 'center',
    color: 'var(--color-texto-suave)',
    fontSize: '16px',
    marginTop: '40px'
  },
  errorBox: {
    background: 'var(--color-peligro-suave)',
    color: 'var(--color-peligro-texto)',
    border: '1px solid var(--color-peligro)',
    borderRadius: 'var(--radio-m)',
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
    marginBottom: '18px'
  },
  tituloMenu: {
    margin: 0,
    fontSize: '24px'
  },
  conteo: {
    color: 'var(--color-texto-suave)',
    fontSize: '14px'
  },
  grilla: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
    gap: '18px'
  },
  tarjeta: {
    background: 'var(--color-superficie)',
    border: '1px solid var(--color-borde)',
    borderRadius: 'var(--radio-l)',
    padding: '20px',
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
    margin: 0,
    fontFamily: 'var(--fuente-titulo)',
    fontWeight: 600,
    fontSize: '17px',
    lineHeight: 1.3
  },
  precio: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--color-primario-texto)',
    fontVariantNumeric: 'tabular-nums'
  },
  badge: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 10px',
    borderRadius: '999px',
    border: '1px solid'
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
    marginTop: 'auto',
    padding: '9px 14px',
    background: 'var(--color-primario)',
    color: 'var(--color-sobre-primario)',
    border: 'none',
    borderRadius: 'var(--radio-m)',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%'
  },
  btnAgregarDeshabilitado: {
    background: 'var(--color-superficie-alt)',
    color: 'var(--color-texto-tenue)',
    cursor: 'not-allowed'
  },
  // ── Panel carrito: tarjeta fija al hacer scroll en pantallas anchas
  panelCarrito: {
    flex: '1 1 300px',
    position: 'sticky',
    top: '100px',
    background: 'var(--color-superficie)',
    border: '1px solid var(--color-borde)',
    borderTop: '4px solid var(--color-azafran)',
    borderRadius: 'var(--radio-l)',
    boxShadow: 'var(--sombra-2)',
    padding: '22px 20px',
    display: 'flex',
    flexDirection: 'column'
  },
  tituloCarrito: {
    margin: '0 0 16px 0',
    fontSize: '22px'
  },
  carritoVacio: {
    color: 'var(--color-texto-tenue)',
    fontSize: '14px',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '24px 8px',
    border: '1px dashed var(--color-borde)',
    borderRadius: 'var(--radio-m)'
  },
  listaCarrito: {
    listStyle: 'none',
    margin: 0,
    padding: 0
  },
  itemCarrito: {
    borderBottom: '1px dashed var(--color-borde)',
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
    fontSize: '14px',
    fontWeight: 600,
    flex: 1
  },
  itemSubtotal: {
    fontSize: '14px',
    fontWeight: 700,
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
    border: '1px solid var(--color-borde)',
    borderRadius: '999px',
    background: 'var(--color-superficie-alt)',
    padding: '2px'
  },
  btnQty: {
    width: '30px',
    height: '30px',
    border: 'none',
    borderRadius: '50%',
    background: 'var(--color-superficie)',
    color: 'var(--color-texto)',
    fontSize: '16px',
    fontWeight: 700,
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
    fontWeight: 700,
    fontSize: '15px',
    fontVariantNumeric: 'tabular-nums'
  },
  btnQuitar: {
    width: '30px',
    height: '30px',
    border: '1px solid var(--color-borde)',
    borderRadius: '50%',
    background: 'transparent',
    color: 'var(--color-peligro-texto)',
    fontSize: '12px',
    fontWeight: 700,
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
    borderTop: '2px solid var(--color-borde)',
    paddingTop: '12px',
    marginTop: '4px'
  },
  totalLabel: {
    fontFamily: 'var(--fuente-titulo)',
    fontSize: '18px',
    fontWeight: 600
  },
  totalValor: {
    fontFamily: 'var(--fuente-titulo)',
    fontSize: '26px',
    fontWeight: 700,
    color: 'var(--color-primario-texto)',
    fontVariantNumeric: 'tabular-nums'
  },
  errorEnvio: {
    marginTop: '12px',
    padding: '10px 12px',
    lineHeight: 1.5,
    background: 'var(--color-peligro-suave)',
    color: 'var(--color-peligro-texto)',
    border: '1px solid var(--color-peligro)',
    borderRadius: 'var(--radio-m)',
    fontSize: '13px'
  },
  btnConfirmar: {
    marginTop: '16px',
    padding: '14px',
    background: 'var(--color-primario)',
    color: 'var(--color-sobre-primario)',
    border: 'none',
    borderRadius: 'var(--radio-m)',
    boxShadow: '0 2px 0 rgba(90, 30, 8, 0.25)',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%'
  },
  btnConfirmarDeshabilitado: {
    background: 'var(--color-superficie-alt)',
    color: 'var(--color-texto-tenue)',
    boxShadow: 'none',
    cursor: 'not-allowed'
  },
  notaConfirmar: {
    marginTop: '12px',
    fontSize: '12px',
    color: 'var(--color-texto-tenue)',
    fontStyle: 'italic',
    textAlign: 'center'
  }
};

export default TomaPedido;
