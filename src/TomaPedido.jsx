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

  // Formatea un número como precio en CLP: 8500 → "$8.500"
  const formatearPrecio = (precio) =>
    precio.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });

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

  return (
    // Pantalla completa sobre el resto de la UI, dividida en dos columnas
    <div style={estilos.overlay}>
      {/* Encabezado con identificación de mesa y botón de cierre */}
      <div style={estilos.encabezado}>
        <div>
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

      {/* Cuerpo principal: columna de productos + panel de carrito */}
      <div style={estilos.cuerpo}>

        {/* ── Columna izquierda: lista de productos ─────────────────────── */}
        <div style={estilos.columnaProductos}>

          {/* Estado de carga */}
          {cargando && (
            <p style={estilos.mensaje}>⏳ Cargando menú...</p>
          )}

                    {/* Error al cargar */}
                    {!cargando && error && (
                      <div style={estilos.errorBox}>
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
            <p style={estilos.conteo}>{items.length} producto{items.length !== 1 ? 's' : ''} en el menú ({items.filter((i) => i.disponible).length} disponible{items.filter((i) => i.disponible).length !== 1 ? 's' : ''})</p>
            <div style={estilos.grilla}>
              {items.map((item) => {
                const enCarrito = carrito[item.id];
                return (
                  <div
                    key={item.id}
                    id={`producto-${item.id}`}
                    style={{
                      ...estilos.tarjeta,
                      border: enCarrito
                        ? '2px solid #007bff'
                        : '1px solid #e0e0e0'
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
                          background: item.disponible ? '#d4edda' : '#f8d7da',
                          color: item.disponible ? '#155724' : '#721c24'
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
            <p style={estilos.carritoVacio}>
              Selecciona productos del menú para armar el pedido.
            </p>
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
                      <button
                        id={`btn-decrementar-${item.id}`}
                        onClick={() => decrementarCantidad(item.id)}
                        style={estilos.btnQty}
                        title="Reducir cantidad"
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
                      >
                        +
                      </button>
                      <button
                        id={`btn-quitar-${item.id}`}
                        onClick={() => quitarDelCarrito(item.id)}
                        style={estilos.btnQuitar}
                        title={`Quitar ${item.nombre} del pedido`}
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
                <div id="error-cantidad" style={estilos.errorEnvio}>{errorCantidad}</div>
              )}

              {/* Paso 4: confirmar pedido */}
              {errorEnvio && (
                <div id="error-envio" style={estilos.errorEnvio}>{errorEnvio}</div>
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
              {!conectado && (
                <p style={estilos.notaConfirmar}>Sin conexión con el servidor.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Estilos en línea (consistente con el estilo del proyecto) ────────────────
const estilos = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: '#f5f5f5',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Arial, sans-serif',
    overflowY: 'auto',
    color: '#333',
    lineHeight: 1.6,
    letterSpacing: 'normal'
  },
  encabezado: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#fff',
    borderBottom: '2px solid #e0e0e0',
    padding: '16px 24px',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  titulo: {
    margin: 0,
    fontSize: '22px',
    color: '#333',
    letterSpacing: 'normal'
  },
  subtitulo: {
    margin: '6px 0 0 0',
    fontSize: '14px',
    color: '#666'
  },
  btnCerrar: {
    padding: '8px 16px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  // Cuerpo dividido en dos columnas: productos | carrito
  cuerpo: {
    flex: 1,
    display: 'flex',
    gap: '0',
    overflow: 'hidden',
    height: '100%'
  },
  // ── Columna de productos
  columnaProductos: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
    boxSizing: 'border-box'
  },
  mensaje: {
    textAlign: 'center',
    color: '#666',
    fontSize: '16px',
    marginTop: '40px'
  },
  errorBox: {
    background: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: '6px',
    padding: '16px',
    textAlign: 'center',
    marginTop: '24px'
  },
  conteo: {
    color: '#777',
    fontSize: '14px',
    marginBottom: '20px'
  },
  grilla: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '20px'
  },
  tarjeta: {
    background: '#fff',
    borderRadius: '10px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '12px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
    transition: 'border 0.15s ease'
  },
  nombreProducto: {
    margin: 0,
    fontWeight: 'bold',
    fontSize: '15px',
    color: '#333'
  },
  precio: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#007bff'
  },
  badge: {
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '3px 8px',
    borderRadius: '12px'
  },
    btnAgregar: {
      marginTop: '4px',
      padding: '6px 14px',
      background: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: 'bold',
      cursor: 'pointer',
      width: '100%'
    },
    btnAgregarDeshabilitado: {
      background: '#ccc',
      color: '#777',
      cursor: 'not-allowed'
    },
    // ── Panel carrito
    panelCarrito: {
      width: '300px',
      minWidth: '260px',
      background: '#fff',
    borderLeft: '2px solid #e0e0e0',
      padding: '24px 16px',
      overflowY: 'auto',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column'
    },
      tituloCarrito: {
        margin: '0 0 16px 0',
        fontSize: '18px',
        color: '#333'
      },
      carritoVacio: {
        color: '#aaa',
        fontSize: '14px',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: '24px'
      },
      listaCarrito: {
        listStyle: 'none',
        margin: 0,
    padding: 0,
        flex: 1
      },
      itemCarrito: {
        borderBottom: '1px solid #f0f0f0',
        paddingBottom: '16px',
        marginBottom: '16px'
      },
      itemInfo: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '10px',
        gap: '8px'
      },
      itemNombre: {
        fontSize: '13px',
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: '8px'
      },
      itemSubtotal: {
        fontSize: '13px',
        fontWeight: 'bold',
        color: '#007bff',
        whiteSpace: 'nowrap'
      },
      controlesQty: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      },
      btnQty: {
        width: '28px',
        height: '28px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        background: '#f8f8f8',
        color: '#333',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        padding: 0
      },
      cantidad: {
        minWidth: '24px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '15px',
        color: '#333'
      },
      btnQuitar: {
        marginLeft: '4px',
        width: '24px',
        height: '24px',
        border: 'none',
        borderRadius: '50%',
        background: '#f8d7da',
        color: '#721c24',
        fontSize: '12px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0
      },
      totalBox: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '2px solid #e0e0e0',
        paddingTop: '12px',
        marginTop: '8px'
      },
      totalLabel: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#333'
      },
      totalValor: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#28a745'
      },
      errorEnvio: {
        marginTop: '12px',
        padding: '10px 12px',
        lineHeight: 1.5,
        background: '#f8d7da',
        color: '#721c24',
        borderRadius: '6px',
        fontSize: '13px'
      },
      btnConfirmar: {
        marginTop: '16px',
        padding: '12px',
        background: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: 'bold',
        cursor: 'pointer',
        width: '100%'
      },
      btnConfirmarDeshabilitado: {
        background: '#ccc',
        color: '#777',
        cursor: 'not-allowed'
      },
      notaConfirmar: {
        marginTop: '16px',
        fontSize: '12px',
        color: '#aaa',
        fontStyle: 'italic',
        textAlign: 'center'
      }
    };

    export default TomaPedido;
