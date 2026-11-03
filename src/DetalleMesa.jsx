// src/DetalleMesa.jsx
// Panel lateral deslizable que muestra el detalle de la mesa seleccionada.
// US-08 CA5: mostrar número, estado y cuenta abierta al seleccionar una mesa.
// US-09:     botones para abrir (marcar ocupada) o liberar (marcar libre) la mesa.
//
// Props:
//   mesa              {object|null} - Mesa seleccionada { id, numero, estado } o null
//   conectado         {boolean}     - Estado de conexión con el backend
//   onCerrar          {Function}    - Callback para cerrar el panel
//   onTomarPedido     {Function}    - Callback para abrir la vista "Tomar pedido" con la mesa
//   versionPedidos    {number}      - Cambia cuando se actualiza algún pedido (refresca el resumen)

import { useState, useEffect } from 'react';

const BASE_URL = 'http://localhost:3000';

function DetalleMesa({ mesa, conectado, onCerrar, onTomarPedido, versionPedidos = 0 }) {
  const estaOcupada = mesa?.estado === 'ocupada';

  // US-09: estado local para mostrar el resultado de abrir/liberar
  const [mensajeAccion, setMensajeAccion] = useState('');
  const [cargando, setCargando] = useState(false);

  // Resumen de lo pedido por la mesa (ítems acumulados y total)
  const [resumen, setResumen] = useState(null);
  const [errorResumen, setErrorResumen] = useState('');
  const numeroMesa = mesa?.numero;
  const estadoMesa = mesa?.estado;

  // Carga el resumen al seleccionar la mesa y cada vez que cambia un pedido o el estado de la mesa
  useEffect(() => {
    if (numeroMesa === undefined) return undefined;
    let cancelado = false;
    fetch(`${BASE_URL}/api/mesas/${numeroMesa}/pedido`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelado) return;
        if (data.ok) {
          setResumen(data);
          setErrorResumen('');
        } else {
          setErrorResumen(data.error || 'No se pudo cargar el resumen del pedido.');
        }
      })
      .catch(() => {
        if (!cancelado) setErrorResumen('Error de red al cargar el resumen del pedido.');
      });
    return () => {
      cancelado = true;
    };
  }, [numeroMesa, estadoMesa, versionPedidos]);

  const formatearPrecio = (precio) =>
    precio.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });

  // ── US-09 CA1: Marcar una mesa libre como ocupada ───────────────────────────
  const abrirMesa = async () => {
    setMensajeAccion('');
    setCargando(true);
    try {
      const res = await fetch(`${BASE_URL}/api/mesas/${mesa.numero}/abrir`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.ok) {
        // CA5: el cambio se refleja vía socket 'estado_mesas' desde el backend;
        // solo mostramos confirmación local
        setMensajeAccion('✅ Mesa marcada como Ocupada.');
      } else {
        // CA1 implica: si ya estaba ocupada el backend retorna ESTADO_NO_PERMITIDO
        setMensajeAccion(`⚠️ [${data.tipo}] ${data.error}`);
      }
    } catch {
      setMensajeAccion('⚠️ Error de red al intentar abrir la mesa.');
    } finally {
      setCargando(false);
    }
  };

  // ── US-09 CA4: Liberar una mesa ocupada (sin actividad) ─────────────────────
  const liberarMesa = async () => {
    setMensajeAccion('');
    setCargando(true);
    try {
      const res = await fetch(`${BASE_URL}/api/mesas/${mesa.numero}/cerrar`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.ok) {
        setMensajeAccion('✅ Mesa liberada correctamente.');
      } else {
        // CA3: si hay pedido activo, el backend devuelve tipo PEDIDO_ACTIVO con el motivo
        setMensajeAccion(`⚠️ [${data.tipo}] ${data.error}`);
      }
    } catch {
      setMensajeAccion('⚠️ Error de red al intentar liberar la mesa.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      {/* Overlay semitransparente: clic fuera cierra el panel */}
      <div
        id="detalle-mesa-overlay"
        onClick={onCerrar}
        style={{
          ...estilos.overlay,
          opacity: mesa ? 1 : 0,
          pointerEvents: mesa ? 'auto' : 'none'
        }}
      />

      {/* Panel lateral deslizable */}
      <div
        id="detalle-mesa-panel"
        style={{
          ...estilos.panel,
          transform: mesa ? 'translateX(0)' : 'translateX(105%)'
        }}
      >
        {mesa && (
          <>
            {/* Cabecera del panel */}
            <div style={estilos.cabecera}>
              <h2 style={estilos.titulo}>Mesa {mesa.numero}</h2>
              <button
                id="btn-cerrar-panel"
                onClick={onCerrar}
                title="Cerrar panel"
                style={estilos.btnCerrar}
              >
                ✕
              </button>
            </div>

            {/* US-08 CA2: estado de la mesa con color distintivo */}
            <div
              style={{
                ...estilos.badgeEstado,
                background: estaOcupada ? '#dc3545' : '#28a745'
              }}
            >
              {estaOcupada ? '🔴 Ocupada' : '🟢 Libre'}
            </div>

            {/* US-09: resultado de la última acción (abrir/liberar) */}
            {mensajeAccion && (
              <div
                id="mensaje-accion-mesa"
                style={{
                  ...estilos.mensajeAccion,
                  backgroundColor: mensajeAccion.startsWith('✅') ? '#e6ffe6' : '#ffe6e6',
                  color: mensajeAccion.startsWith('✅') ? '#155724' : '#721c24',
                  border: `1px solid ${mensajeAccion.startsWith('✅') ? '#c3e6cb' : '#f5c6cb'}`
                }}
              >
                {mensajeAccion}
              </div>
            )}

            {/* US-09: acciones de apertura/liberación de mesa */}
            <div style={estilos.seccion}>
              <h4 style={estilos.subtitulo}>⚙️ Acciones</h4>

              {/* CA1: botón Abrir mesa — solo visible si está libre */}
              {!estaOcupada && (
                <button
                  id={`btn-abrir-mesa-${mesa.numero}`}
                  onClick={abrirMesa}
                  disabled={!conectado || cargando}
                  style={{
                    ...estilos.btnAccion,
                    backgroundColor: conectado && !cargando ? '#28a745' : '#aaa'
                  }}
                >
                  {cargando ? 'Procesando...' : '🟢 Abrir mesa'}
                </button>
              )}

              {/* CA4: botón Liberar mesa — solo visible si está ocupada */}
              {/* CA3: el backend impide liberar si hay pedido activo (respuesta con error) */}
              {estaOcupada && (
                <button
                  id={`btn-liberar-mesa-${mesa.numero}`}
                  onClick={liberarMesa}
                  disabled={!conectado || cargando}
                  style={{
                    ...estilos.btnAccion,
                    backgroundColor: conectado && !cargando ? '#dc3545' : '#aaa'
                  }}
                >
                  {cargando ? 'Procesando...' : '🔴 Liberar mesa'}
                </button>
              )}

              {/* Botón "Tomar pedido" — visible solo si la mesa está ocupada */}
              {estaOcupada && (
                <button
                  id={`btn-tomar-pedido-${mesa.numero}`}
                  onClick={() => {
                    onCerrar(); // cierra el panel lateral
                    onTomarPedido(mesa); // abre la vista de toma de pedido
                  }}
                  disabled={!conectado}
                  style={{
                    ...estilos.btnAccion,
                    backgroundColor: conectado ? '#007bff' : '#aaa',
                    marginTop: '8px'
                  }}
                >
                  📝 Tomar pedido
                </button>
              )}

              {/* CA2: aclaración explícita: abrir la mesa no crea una cuenta */}
              <p style={{ ...estilos.textoInfo, marginTop: '16px', fontStyle: 'italic' }}>
                Nota: abrir la mesa no crea una cuenta. La cuenta se gestiona por separado (US-12).
              </p>
            </div>

            {/* US-08 CA5: cuenta abierta si la tiene */}
            <div style={estilos.seccion}>
              <h4 style={estilos.subtitulo}>📋 Cuenta</h4>
              {errorResumen && <p style={{ color: '#721c24' }}>⚠️ {errorResumen}</p>}
              {estaOcupada && resumen && resumen.items.length > 0 ? (
                <div id="resumen-pedido">
                  <p style={estilos.textoInfo}>
                    <strong>Estado del pedido:</strong> {resumen.estado}
                  </p>
                  <ul style={{ listStyle: 'none', margin: '12px 0', padding: 0 }}>
                    {resumen.items.map((i) => (
                      <li
                        key={i.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '8px',
                          fontSize: '14px',
                          color: '#333',
                          padding: '10px 0',
                          borderBottom: '1px solid #f0f0f0'
                        }}
                      >
                        <span>
                          {i.cantidad} × {i.nombre}
                        </span>
                        <span>{formatearPrecio(i.precioBase * i.cantidad)}</span>
                      </li>
                    ))}
                  </ul>
                  <p
                    id="resumen-total"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 'bold',
                      color: '#28a745',
                      margin: '14px 0 0',
                      paddingTop: '10px',
                      borderTop: '2px solid #e0e0e0',
                      fontSize: '16px'
                    }}
                  >
                    <span>Total acumulado</span>
                    <span>{formatearPrecio(resumen.total)}</span>
                  </p>
                </div>
              ) : estaOcupada ? (
                <p style={estilos.textoInfo}>Aún no se ha pedido nada en esta mesa.</p>
              ) : (
                <p style={{ color: '#888', fontStyle: 'italic' }}>Sin cuenta abierta.</p>
              )}
            </div>

            {/* Información general */}
            <div style={estilos.seccion}>
              <h4 style={estilos.subtitulo}>ℹ️ Información</h4>
              <p style={estilos.textoInfo}>
                <strong>ID interno:</strong> {mesa.id}
              </p>
              <p style={estilos.textoInfo}>
                <strong>Estado:</strong> {estaOcupada ? 'Ocupada' : 'Libre'}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Estilos en línea (consistente con el estilo actual del proyecto) ────────
const estilos = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    zIndex: 100,
    transition: 'opacity 0.25s ease'
  },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '300px',
    height: '100vh',
    background: '#fff',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.2)',
    zIndex: 101,
    padding: '24px',
    boxSizing: 'border-box',
    transition: 'transform 0.3s ease',
    overflowY: 'auto',
    fontFamily: 'Arial, sans-serif',
    color: '#333',
    lineHeight: 1.6,
    letterSpacing: 'normal',
    textAlign: 'left'
  },
  cabecera: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  titulo: {
    margin: 0,
    fontSize: '22px',
    color: '#222',
    letterSpacing: 'normal'
  },
  btnCerrar: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#666',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  badgeEstado: {
    display: 'inline-block',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px',
    padding: '6px 14px',
    borderRadius: '20px',
    marginBottom: '16px'
  },
  mensajeAccion: {
    padding: '10px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 'bold',
    marginBottom: '16px',
    lineHeight: 1.5
  },
  seccion: {
    borderTop: '1px solid #eee',
    paddingTop: '18px',
    marginBottom: '20px'
  },
  subtitulo: {
    margin: '0 0 12px 0',
    fontSize: '15px',
    color: '#333'
  },
  btnAccion: {
    width: '100%',
    padding: '10px',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '8px'
  },
  textoInfo: {
    margin: '8px 0',
    fontSize: '14px',
    lineHeight: 1.6,
    color: '#555'
  }
};

export default DetalleMesa;
