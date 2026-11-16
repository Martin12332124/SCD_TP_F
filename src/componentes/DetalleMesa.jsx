// src/componentes/DetalleMesa.jsx
// Panel lateral deslizable de una mesa: todo lo que se hace con la mesa está aquí.
// US-08 CA5: número, estado y cuenta abierta al seleccionar una mesa.
// US-09:     abrir (marcar ocupada) o liberar (marcar libre) la mesa.
// Además:    avanzar el pedido de la mesa (Recibido → En cocina → Listo).
//
// Props:
//   mesa            {object|null} - Mesa seleccionada { id, numero, estado, estadoPedido? } o null
//   conectado       {boolean}     - Estado de conexión con el backend
//   onCerrar        {Function}    - Cierra el panel
//   onTomarPedido   {Function}    - (mesa) => void. Abre la vista "Tomar pedido" para la mesa
//   onCambiarEstado {Function}    - (numeroMesa, estado) => void. Pide avanzar el pedido
//   errorPedido     {string}      - Rechazo del último cambio de estado (validación o backend)
//   versionPedidos  {number}      - Cambia cuando se actualiza algún pedido (refresca la cuenta)
//   mesas           {Array}       - Todas las mesas (para elegir el destino de un traslado)
//   onTrasladar     {Function}    - (origen, destino) => void. Pide trasladar el pedido (US-05)
//   mensajeTraslado {string}      - Resultado del último traslado (éxito o rechazo)

import { useState, useEffect } from 'react';
import { formatearPrecio } from '../utils/formato';
import { estadoVisualMesa } from '../utils/estadoMesa';
import { ESTADO_LISTO } from '../utils/flujoPedido';
import {
  obtenerPedidoMesa,
  abrirMesa as abrirMesaApi,
  cerrarMesa as cerrarMesaApi
} from '../servicios/api';
import AvancePedido from './AvancePedido';
import Icono from './Icono';
import TrasladoMesa from './TrasladoMesa';

function DetalleMesa({
  mesa,
  conectado,
  onCerrar,
  onTomarPedido,
  onCambiarEstado = () => {},
  errorPedido = '',
  versionPedidos = 0,
  mesas = [],
  onTrasladar = () => {},
  mensajeTraslado = ''
}) {
  const estaOcupada = mesa?.estado === 'ocupada';
  const numeroMesa = mesa?.numero;
  const estadoMesa = mesa?.estado;

  // US-09: resultado de abrir/liberar. Se guarda con la mesa a la que pertenece,
  // para que no aparezca al abrir el panel de otra mesa.
  const [accion, setAccion] = useState({ mesaId: null, texto: '' });
  const mensajeAccion = accion.mesaId === mesa?.id ? accion.texto : '';
  const [cargando, setCargando] = useState(false);

  // Cuenta de la mesa (ítems acumulados y total). También se guarda con su número de mesa:
  // al cambiar de mesa no se muestra la cuenta de la anterior mientras carga la nueva.
  const [carga, setCarga] = useState({ numero: null, resumen: null, error: '' });
  const resumen = carga.numero === numeroMesa ? carga.resumen : null;
  const errorResumen = carga.numero === numeroMesa ? carga.error : '';

  // Carga la cuenta al seleccionar la mesa y cada vez que cambia un pedido o el estado de la mesa
  useEffect(() => {
    if (numeroMesa === undefined) return undefined;
    let cancelado = false;
    obtenerPedidoMesa(numeroMesa)
      .then((data) => {
        if (cancelado) return;
        if (data.ok) {
          setCarga({ numero: numeroMesa, resumen: data, error: '' });
        } else {
          setCarga({
            numero: numeroMesa,
            resumen: null,
            error: data.error || 'No se pudo cargar el resumen del pedido.'
          });
        }
      })
      .catch(() => {
        if (!cancelado) {
          setCarga({
            numero: numeroMesa,
            resumen: null,
            error: 'Error de red al cargar el resumen del pedido.'
          });
        }
      });
    return () => {
      cancelado = true;
    };
  }, [numeroMesa, estadoMesa, versionPedidos]);

  // Estado del pedido: lo trae la mesa (se actualiza al instante con los eventos del backend).
  // Si el backend es anterior y no envía ese campo, se usa el de la cuenta.
  const estadoPedido = !estaOcupada
    ? null
    : mesa.estadoPedido !== undefined
      ? mesa.estadoPedido
      : resumen?.estado || null;
  const visual = estadoVisualMesa({ estado: estadoMesa, estadoPedido });

  // ── US-09 CA1: Marcar una mesa libre como ocupada ───────────────────────────
  const abrirMesa = async () => {
    const mesaId = mesa.id;
    setAccion({ mesaId, texto: '' });
    setCargando(true);
    try {
      const data = await abrirMesaApi(mesa.numero);
      if (data.ok) {
        // CA5: el cambio se refleja vía socket 'estado_mesas' desde el backend;
        // solo mostramos confirmación local
        setAccion({ mesaId, texto: '✅ Mesa marcada como Ocupada.' });
      } else {
        // CA1 implica: si ya estaba ocupada el backend retorna ESTADO_NO_PERMITIDO
        setAccion({ mesaId, texto: `⚠️ [${data.tipo}] ${data.error}` });
      }
    } catch {
      setAccion({ mesaId, texto: '⚠️ Error de red al intentar abrir la mesa.' });
    } finally {
      setCargando(false);
    }
  };

  // ── US-09 CA4: Liberar una mesa ocupada (sin pedido en curso) ───────────────
  const liberarMesa = async () => {
    const mesaId = mesa.id;
    setAccion({ mesaId, texto: '' });
    setCargando(true);
    try {
      const data = await cerrarMesaApi(mesa.numero);
      if (data.ok) {
        setAccion({ mesaId, texto: '✅ Mesa liberada correctamente.' });
      } else {
        // CA3: con un pedido en curso, el backend devuelve tipo PEDIDO_ACTIVO con el motivo
        setAccion({ mesaId, texto: `⚠️ [${data.tipo}] ${data.error}` });
      }
    } catch {
      setAccion({ mesaId, texto: '⚠️ Error de red al intentar liberar la mesa.' });
    } finally {
      setCargando(false);
    }
  };

  const tomarPedido = () => {
    onCerrar(); // cierra el panel lateral
    onTomarPedido(mesa); // abre la vista de toma de pedido
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
              <h2 style={estilos.titulo}>Mesa {mesa.numero}</h2>
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

            {/* US-08 CA2: estado de la mesa, con el mismo color, ícono y texto que en el mapa */}
            <div
              id="estado-mesa"
              data-estado={visual.clave}
              style={{
                ...estilos.franjaEstado,
                background: `var(--mesa-${visual.clave})`,
                color: `var(--mesa-${visual.clave}-texto)`
              }}
            >
              <Icono nombre={visual.icono} tamano={26} /> {visual.etiqueta}
            </div>

            {/* US-09: resultado de la última acción (abrir/liberar) */}
            {mensajeAccion && (
              <div
                id="mensaje-accion-mesa"
                role="status"
                style={{
                  ...estilos.aviso,
                  ...(exito ? estilos.tonoExito : estilos.tonoPeligro)
                }}
              >
                {mensajeAccion}
              </div>
            )}

            {/* Rechazo de un cambio de estado del pedido (otra tablet pudo cambiarlo antes) */}
            {errorPedido && (
              <div
                id="error-pedido-mesa"
                role="alert"
                style={{ ...estilos.aviso, ...estilos.tonoPeligro }}
              >
                {errorPedido}
              </div>
            )}

            {/* US-05: resultado del traslado. Se muestra aunque la mesa de origen ya quedó libre */}
            {mensajeTraslado && (
              <div
                id="mensaje-traslado"
                role="status"
                style={{
                  ...estilos.aviso,
                  ...(mensajeTraslado.startsWith('✅') ? estilos.tonoExito : estilos.tonoPeligro)
                }}
              >
                {mensajeTraslado}
              </div>
            )}

            {/* Mesa libre: abrirla, o tomar el pedido directamente (el backend la abre al confirmar) */}
            {!estaOcupada && (
              <div style={estilos.bloque}>
                {/* CA1: botón Abrir mesa — solo visible si está libre */}
                <button
                  id={`btn-abrir-mesa-${mesa.numero}`}
                  onClick={abrirMesa}
                  disabled={!conectado || cargando}
                  style={{ ...estilos.boton, ...estilos.botonAbrir }}
                >
                  {cargando ? 'Procesando...' : 'Abrir mesa'}
                </button>
                <button
                  id={`btn-tomar-pedido-${mesa.numero}`}
                  onClick={tomarPedido}
                  disabled={!conectado}
                  style={{ ...estilos.boton, ...estilos.botonSecundario }}
                >
                  📝 Tomar pedido
                </button>
              </div>
            )}

            {/* Mesa ocupada: en qué va el pedido y el siguiente paso válido */}
            {estaOcupada && (
              <div style={estilos.bloque}>
                <h3 style={estilos.subtitulo}>Pedido</h3>
                <AvancePedido
                  estadoPedido={estadoPedido}
                  conectado={conectado}
                  onCambiarEstado={(estado) => onCambiarEstado(mesa.numero, estado)}
                  onTomarPedido={tomarPedido}
                />
              </div>
            )}

            {/* US-08 CA5: cuenta abierta si la tiene */}
            <div style={estilos.bloque}>
              <h3 style={estilos.subtitulo}>Cuenta</h3>
              {errorResumen && (
                <p style={{ ...estilos.aviso, ...estilos.tonoPeligro }}>⚠️ {errorResumen}</p>
              )}
              {estaOcupada && resumen && resumen.items.length > 0 ? (
                <div id="resumen-pedido" style={estilos.ticket}>
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
                <p style={estilos.texto}>Aún no se ha pedido nada en esta mesa.</p>
              ) : (
                <p style={estilos.texto}>Sin cuenta abierta.</p>
              )}
            </div>

            {/* US-05: trasladar el pedido a otra mesa (solo si la mesa tiene un pedido) */}
            {estaOcupada && (estadoPedido || mesa.estadoPedido === undefined) && (
              <div style={estilos.bloque}>
                <h3 style={estilos.subtitulo}>Trasladar pedido</h3>
                <TrasladoMesa
                  mesaOrigen={mesa}
                  mesas={mesas}
                  conectado={conectado}
                  onTrasladar={onTrasladar}
                />
              </div>
            )}

            {/* US-09 CA4: liberar la mesa. CA3: el backend lo impide si hay un pedido en curso */}
            {estaOcupada && (
              <div style={estilos.bloque}>
                {estadoPedido === ESTADO_LISTO && (
                  <p style={estilos.texto}>Al liberar la mesa se cierra su pedido y su cuenta.</p>
                )}
                <button
                  id={`btn-liberar-mesa-${mesa.numero}`}
                  onClick={liberarMesa}
                  disabled={!conectado || cargando}
                  style={{ ...estilos.boton, ...estilos.botonLiberar }}
                >
                  {cargando ? 'Procesando...' : 'Liberar mesa'}
                </button>
              </div>
            )}

            {/* CA2: aclaración explícita: abrir la mesa no crea una cuenta */}
            <p style={estilos.nota}>
              Nota: abrir la mesa no crea una cuenta. La cuenta se gestiona por separado (US-12).
            </p>
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
    width: 'min(440px, 100vw)',
    height: '100vh',
    background: 'var(--color-superficie)',
    borderLeft: '4px solid var(--color-azafran)',
    boxShadow: 'var(--sombra-panel)',
    zIndex: 101,
    padding: '24px 22px 32px',
    transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
    overflowY: 'auto',
    color: 'var(--color-texto)',
    lineHeight: 1.5,
    textAlign: 'left'
  },
  cabecera: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '14px'
  },
  titulo: {
    margin: 0,
    fontSize: '34px'
  },
  btnCerrar: {
    display: 'grid',
    placeItems: 'center',
    width: 'var(--toque)',
    height: 'var(--toque)',
    flexShrink: 0,
    background: 'var(--color-superficie-alt)',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderColor: 'var(--color-texto-suave)',
    borderRadius: 'var(--radio-m)',
    fontSize: '20px',
    fontWeight: 700,
    cursor: 'pointer',
    color: 'var(--color-texto)',
    padding: 0
  },
  // Franja a todo el ancho con el color sólido del estado
  franjaEstado: {
    padding: '12px 16px',
    marginBottom: '16px',
    borderRadius: 'var(--radio-m)',
    fontSize: '22px',
    fontWeight: 700
  },
  aviso: {
    padding: '12px 14px',
    borderRadius: 'var(--radio-m)',
    borderStyle: 'solid',
    borderWidth: '2px',
    fontSize: '16px',
    fontWeight: 600,
    margin: '0 0 16px',
    lineHeight: 1.45
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
  bloque: {
    borderTop: '2px solid var(--color-borde)',
    paddingTop: '16px',
    marginBottom: '18px'
  },
  subtitulo: {
    margin: '0 0 12px',
    fontSize: '22px'
  },
  boton: {
    display: 'block',
    width: '100%',
    minHeight: 'var(--toque)',
    padding: '12px 14px',
    marginBottom: '10px',
    borderStyle: 'solid',
    borderWidth: '2px',
    borderRadius: 'var(--radio-m)',
    fontSize: '17px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  botonAbrir: {
    background: 'var(--mesa-libre)',
    color: 'var(--mesa-libre-texto)',
    borderColor: 'var(--mesa-libre)'
  },
  botonSecundario: {
    background: 'var(--color-superficie)',
    color: 'var(--color-texto)',
    borderColor: 'var(--color-texto-suave)'
  },
  botonLiberar: {
    background: 'var(--color-superficie)',
    color: 'var(--color-peligro-texto)',
    borderColor: 'var(--color-peligro)'
  },
  texto: {
    margin: '0 0 12px',
    fontSize: '16px',
    color: 'var(--color-texto)'
  },
  nota: {
    fontSize: '16px',
    color: 'var(--color-texto)'
  },
  // La cuenta se presenta como un ticket de restaurante
  ticket: {
    background: 'var(--color-superficie-alt)',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: 'var(--color-borde)',
    borderRadius: 'var(--radio-m)',
    padding: '12px 16px'
  },
  listaTicket: {
    listStyle: 'none',
    margin: '0 0 8px',
    padding: 0
  },
  itemTicket: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    fontSize: '16px',
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
    fontSize: '20px',
    color: 'var(--color-texto)',
    margin: '4px 0 0',
    paddingTop: '10px',
    borderTop: '2px solid var(--color-borde)'
  }
};

export default DetalleMesa;
