// src/TomaPedido.jsx
// Vista de toma de pedido — Paso 1: lista de productos de solo lectura.
//
// Muestra todos los ítems del menú obtenidos de GET /api/menu-items.
// No incluye carrito, notas ni envío al backend (eso viene en pasos siguientes).
//
// Props:
//   mesa      {object} - Mesa seleccionada { id, numero, estado }
//   onCerrar  {Function} - Callback para cerrar la vista y volver al mapa

import { useState, useEffect } from 'react';

const BASE_URL = 'http://localhost:3000';

function TomaPedido({ mesa, onCerrar }) {
  // Lista de ítems del menú cargados desde el backend
  const [items, setItems] = useState([]);
  // cargando empieza en true: la petición se lanza al montar, antes de cualquier render
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

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
          setError('No se pudo cargar el menú. Intentá de nuevo.');
        }
      })
      .catch(() => {
        setError('Error de red al cargar el menú. Verificá que el servidor esté activo.');
      })
      .finally(() => {
        setCargando(false);
      });
  }, []);

  // Formatea un número como precio en CLP: 8500 → "$8.500"
  const formatearPrecio = (precio) =>
    precio.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });

  return (
    // Pantalla completa sobre el resto de la UI
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

      {/* Cuerpo principal: lista de productos */}
      <div style={estilos.cuerpo}>
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
            <p style={estilos.conteo}>{items.length} producto{items.length !== 1 ? 's' : ''} disponible{items.length !== 1 ? 's' : ''}</p>
            <div style={estilos.grilla}>
              {items.map((item) => (
                <div
                  key={item.id}
                  id={`producto-${item.id}`}
                  style={estilos.tarjeta}
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
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pie: nota informativa sobre los próximos pasos */}
      <div style={estilos.pie}>
        <p style={estilos.notaPie}>
          💡 Próximamente: seleccionar productos, ver el total y confirmar el pedido.
        </p>
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
    overflowY: 'auto'
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
    color: '#333'
  },
  subtitulo: {
    margin: '4px 0 0 0',
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
  cuerpo: {
    flex: 1,
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
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
    color: '#888',
    fontSize: '13px',
    marginBottom: '16px'
  },
  grilla: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px'
  },
  tarjeta: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '8px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
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
  pie: {
    background: '#fff',
    borderTop: '1px solid #e0e0e0',
    padding: '12px 24px',
    textAlign: 'center'
  },
  notaPie: {
    margin: 0,
    color: '#888',
    fontSize: '13px'
  }
};

export default TomaPedido;
