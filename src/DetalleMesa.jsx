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
import { formatearPrecio } from './utils/formato';
import {
  obtenerPedidoMesa,
  abrirMesa as abrirMesaApi,
  cerrarMesa as cerrarMesaApi
} from './servicios/api';

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
    obtenerPedidoMesa(numeroMesa)
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


  // ── US-09 CA1: Marcar una mesa libre como ocupada ───────────────────────────
  const abrirMesa = async () => {
    setMensajeAccion('');
    setCargando(true);
    try {
      const data = await abrirMesaApi(mesa.numero);
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
      const data = await cerrarMesaApi(mesa.numero);
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

  const exito = mensajeAccion.startsWith('✅');

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
        role="dialog"
        aria-label={mesa ? `Detalle de la mesa ${mesa.numero}` : undefined}
        aria-hidden={!mesa}
        style={{
          ...estilos.panel,
          transform: mesa ? 'translateX(0)' : 'translateX(105%)'
        }}
      >
        {mesa && (
          <>
            {/* Cabecera del panel */}
            <div style={estilos.cabecera}>
              <div>
                <p style={estilos.etiqueta}>Detalle de mesa</p>
                <h2 style={estilos.titulo}>Mesa {mesa.numero}</h2>
              </div>
              <button
                id="btn-cerrar-panel"
                onClick={onCerrar}
                title="Cerrar panel"
                aria-label="Cerrar panel"
                style={estilos.btnCerrar}
              >
                ✕
              </button>
            </div>

            {/* US-08 CA2: estado de la mesa con color distintivo */}
            <div
              style={{
                ...estilos.badgeEstado,
                ...(estaOcupada ? estilos.tonoPeligro : estilos.tonoExito)
              }}
            >
              {estaOcupada ? '🔴 Ocupada' : '🟢 Libre'}
            </div>

            {/* US-09: resultado de la última acción (abrir/liberar) */}
            {mensajeAccion && (
              <div
                id="mensaje-accion-mesa"
                role="status"
                style={{
                  ...estilos.mensajeAccion,
                  ...(exito ? estilos.tonoExito : estilos.tonoPeligro)
                }}
              >
                {mensajeAccion}
              </div>
            )}

            {/* US-09: acciones de apertura/liberación de mesa */}
            <div style={estilos.seccion}>
              <h4 style={estilos.subtitulo}>Acciones</h4>

              {/* CA1: botón Abrir mesa — solo visible si está libre */}
              {!estaOcupada && (
                <button
                  id={`btn-abrir-mesa-${mesa.numero}`}
                  onClick={abrirMesa}
                  disabled={!conectado || cargando}
                  style={{ ...estilos.btnAccion, ...estilos.tonoExito }}
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
                  style={{ ...estilos.btnAccion, ...estilos.tonoPeligro }}
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
                  style={{ ...estilos.btnAccion, ...estilos.btnPrimario }}
                >
                  📝 Tomar pedido
                </button>
              )}

              {/* CA2: aclaración explícita: abrir la mesa no crea una cuenta */}
              <p style={estilos.nota}>
                Nota: abrir la mesa no crea una cuenta. La cuenta se gestiona por separado (US-12).
              </p>
            </div>

            {/* US-08 CA5: cuenta abierta si la tiene */}
            <div style={estilos.seccion}>
              <h4 style={estilos.subtitulo}>Cuenta</h4>
              {errorResumen && (
                <p style={{ ...estilos.mensajeAccion, ...estilos.tonoPeligro }}>
                  ⚠️ {errorResumen}
                </p>
              )}
              {estaOcupada && resumen && resumen.items.length > 0 ? (
                <div id="resumen-pedido" style={estilos.ticket}>
                  <p style={estilos.filaTicket}>
                    <span style={estilos.textoSuave}>Estado del pedido</span>
                    <span style={estilos.pildora}>{resumen.estado}</span>
                  </p>
                  <ul style={estilos.listaTicket}>
                    {resumen.items.map((i) => (
                      <li key={i.id} style={estilos.itemTicket}>
                        <span>
                          {i.cantidad} × {i.nombre}
                        </span>
                        <span style={estilos.importe}>
                          {formatearPrecio(i.precioBase * i.cantidad)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p id="resumen-total" style={estilos.total}>
                    <span>Total acumulado</span>
                    <span style={estilos.importe}>{formatearPrecio(resumen.total)}</span>
                  </p>
                </div>
              ) : estaOcupada ? (
                <p style={estilos.vacio}>Aún no se ha pedido nada en esta mesa.</p>
              ) : (
                <p style={estilos.vacio}>Sin cuenta abierta.</p>
              )}
            </div>

            {/* Información general */}
            <div style={estilos.seccion}>
              <h4 style={estilos.subtitulo}>Información</h4>
              <p style={estilos.filaInfo}>
                <span style={estilos.textoSuave}>ID interno</span> <strong>{mesa.id}</strong>
              </p>
              <p style={estilos.filaInfo}>
                <span style={estilos.textoSuave}>Estado</span>{' '}
                <strong>{estaOcupada ? 'Ocupada' : 'Libre'}</strong>
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Estilos en línea: leen los tokens de index.css (modo claro y oscuro) ─────
const estilos = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--velo)',
    backdropFilter: 'blur(2px)',
    zIndex: 100,
    transition: 'opacity 0.25s ease'
  },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: 'min(380px, 100vw)',
    height: '100vh',
    background: 'var(--color-superficie)',
    borderLeft: '4px solid var(--color-azafran)',
    boxShadow: 'var(--sombra-panel)',
    zIndex: 101,
    padding: '28px 24px',
    transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
    overflowY: 'auto',
    color: 'var(--color-texto)',
    lineHeight: 1.6,
    textAlign: 'left'
  },
  cabecera: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  etiqueta: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--color-acento-texto)'
  },
  titulo: {
    margin: '2px 0 0',
    fontSize: '30px'
  },
  btnCerrar: {
    display: 'grid',
    placeItems: 'center',
    width: '36px',
    height: '36px',
    background: 'var(--color-superficie-alt)',
    border: '1px solid var(--color-borde)',
    borderRadius: '50%',
    fontSize: '15px',
    cursor: 'pointer',
    color: 'var(--color-texto-suave)',
    padding: 0
  },
  badgeEstado: {
    display: 'inline-block',
    fontWeight: 700,
    fontSize: '14px',
    padding: '5px 14px',
    borderRadius: '999px',
    border: '1px solid',
    marginBottom: '20px'
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
  mensajeAccion: {
    padding: '10px 14px',
    borderRadius: 'var(--radio-m)',
    border: '1px solid',
    fontSize: '13px',
    fontWeight: 600,
    margin: '0 0 16px',
    lineHeight: 1.5
  },
  seccion: {
    borderTop: '1px solid var(--color-borde)',
    paddingTop: '18px',
    marginBottom: '20px'
  },
  subtitulo: {
    margin: '0 0 12px 0',
    fontFamily: 'var(--fuente-texto)',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--color-texto-suave)'
  },
  btnAccion: {
    display: 'block',
    width: '100%',
    padding: '12px',
    border: '1px solid',
    borderRadius: 'var(--radio-m)',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '10px'
  },
  btnPrimario: {
    background: 'var(--color-primario)',
    color: 'var(--color-sobre-primario)',
    borderColor: 'var(--color-primario)'
  },
  nota: {
    marginTop: '8px',
    fontSize: '13px',
    fontStyle: 'italic',
    color: 'var(--color-texto-tenue)'
  },
  // La cuenta se presenta como un ticket de restaurante
  ticket: {
    background: 'var(--color-superficie-alt)',
    border: '1px solid var(--color-borde)',
    borderRadius: 'var(--radio-m)',
    padding: '14px 16px'
  },
  filaTicket: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px'
  },
  pildora: {
    padding: '2px 10px',
    borderRadius: '999px',
    background: 'var(--color-primario-suave)',
    color: 'var(--color-primario-texto)',
    fontWeight: 700
  },
  listaTicket: {
    listStyle: 'none',
    margin: '12px 0',
    padding: 0
  },
  itemTicket: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    fontSize: '14px',
    padding: '8px 0',
    borderBottom: '1px dashed var(--color-borde)'
  },
  importe: {
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap'
  },
  total: {
    display: 'flex',
    justifyContent: 'space-between',
    fontFamily: 'var(--fuente-titulo)',
    fontWeight: 700,
    fontSize: '18px',
    color: 'var(--color-primario-texto)',
    margin: '4px 0 0',
    paddingTop: '10px',
    borderTop: '2px solid var(--color-borde)'
  },
  vacio: {
    fontSize: '14px',
    fontStyle: 'italic',
    color: 'var(--color-texto-tenue)'
  },
  textoSuave: {
    color: 'var(--color-texto-suave)'
  },
  filaInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    margin: '6px 0',
    fontSize: '14px'
  }
};

export default DetalleMesa;
