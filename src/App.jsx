import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { validarNumeroMesa } from './validaciones';
import MapaMesas from './MapaMesas';
import DetalleMesa from './DetalleMesa';
import TomaPedido from './TomaPedido';
import SelectorTema from './SelectorTema';

// Conexión directa al servidor Backend (Puerto 3000)
const socket = io('http://localhost:3000');

/** Esquinas cóncavas con rombos ornamentales (proporción 1:1 fija, no se deforman al redimensionar). */
function MarcoOrnamental({ fondo = 'var(--color-superficie)' }) {
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
      <path d="M 0 10 A 10 10 0 0 0 10 0" stroke="var(--color-borde-suave)" strokeWidth="1" />
      <polygon points="3.5,1 6,3.5 3.5,6 1,3.5" fill="var(--color-borde)" />
    </svg>
  );

  return (
    <div aria-hidden="true" style={estilos.marcoInterior}>
      {esquina(0, { top: '-1px', left: '-1px' })}
      {esquina(90, { top: '-1px', right: '-1px' })}
      {esquina(180, { bottom: '-1px', right: '-1px' })}
      {esquina(270, { bottom: '-1px', left: '-1px' })}
    </div>
  );
}

function App() {
  const [conectado, setConectado] = useState(false);
  // Estado para capturar la mesa seleccionada en el formulario
  const [mesa, setMesa] = useState('');
  // Estado para mostrar el último pedido actualizado que llega del backend
  const [ultimoPedido, setUltimoPedido] = useState({ mesa: 'Ninguna', estado: 'Sin Pedidos' });
  // Estado para capturar errores de validación en pantalla
  const [errorValidacion, setErrorValidacion] = useState('');

  // Estado para el contador de tiempo en segundos
  const [segundos, setSegundos] = useState(0);

  // Estado para el estado de las mesas en tiempo real
  const [mesas, setMesas] = useState([]);

  // Operación 3 (US-05): estados para el traslado de mesa
  const [mesaOrigen, setMesaOrigen] = useState('');
  const [mesaDestino, setMesaDestino] = useState('');
  const [mensajeTraslado, setMensajeTraslado] = useState('');

  // US-08: mesa seleccionada para mostrar el panel lateral de detalle
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);

  // Vista "Tomar pedido" (Paso 1): mesa para la que se está tomando el pedido
  const [mesaTomandoPedido, setMesaTomandoPedido] = useState(null);

  // Se incrementa cada vez que cambia el contenido de algún pedido (para refrescar el resumen)
  const [versionPedidos, setVersionPedidos] = useState(0);

  const cerrarTomaPedido = useCallback(() => setMesaTomandoPedido(null), []);

  useEffect(() => {
    socket.on('connect', () => setConectado(true));
    socket.on('disconnect', () => setConectado(false));

    socket.on('cambio_estado_pedido', (datos) => {
      setUltimoPedido({ mesa: datos.mesa, estado: datos.estado });
      setSegundos(0);
    });

    socket.on('estado_mesas', (datos) => {
      setMesas(datos);
      setMesaSeleccionada((prev) => {
        if (!prev) return null;
        const actualizada = datos.find((m) => m.id === prev.id);
        return actualizada ?? null;
      });
    });

    socket.on('pedido_items_actualizado', () => setVersionPedidos((v) => v + 1));

    socket.on('respuesta_pedido', (resultado) => {
      if (!resultado.ok) {
        setErrorValidacion(
          `⚠️ [${resultado.tipo}] ${resultado.error}` +
            (resultado.esperado ? ` — Esperado: ${resultado.esperado}` : '')
        );
      }
    });

    socket.on('respuesta_traslado', (resultado) => {
      if (resultado.ok) {
        setMensajeTraslado(
          `✅ Pedido trasladado: ${resultado.origen} → ${resultado.destino} (${resultado.estado})`
        );
        setMesaOrigen('');
        setMesaDestino('');
      } else {
        setMensajeTraslado(
          `⚠️ [${resultado.tipo}] ${resultado.error}` +
            (resultado.esperado ? ` — Esperado: ${resultado.esperado}` : '')
        );
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('cambio_estado_pedido');
      socket.off('estado_mesas');
      socket.off('pedido_items_actualizado');
      socket.off('respuesta_pedido');
      socket.off('respuesta_traslado');
    };
  }, []);

  // US-08: carga inicial de mesas vía REST para no depender solo del socket
  useEffect(() => {
    fetch('http://localhost:3000/api/mesas')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setMesas(data.mesas);
      })
      .catch(() => {
        console.warn('[US-08] No se pudo cargar las mesas por REST; se usará el socket.');
      });
  }, []);

  // Control del avance del tiempo y límite de desbordamiento
  useEffect(() => {
    const pedidoActivo =
      ultimoPedido.estado !== 'Sin Pedidos' && ultimoPedido.estado !== 'Listo 🍽️';
    let intervalo = null;

    if (conectado && pedidoActivo) {
      intervalo = setInterval(() => {
        setSegundos((tiempoPrevio) => {
          if (tiempoPrevio >= 5999) {
            clearInterval(intervalo);
            return 5999;
          }
          return tiempoPrevio + 1;
        });
      }, 1000);
    }

    return () => clearInterval(intervalo);
  }, [conectado, ultimoPedido.estado]);

  const formatearTiempo = (totSegundos) => {
    const minutos = Math.floor(totSegundos / 60);
    const segundosRestantes = totSegundos % 60;
    return `${minutos.toString().padStart(2, '0')}:${segundosRestantes.toString().padStart(2, '0')}`;
  };

  const manejarCambioMesa = (valor) => {
    setMesa(valor);
    if (valor.trim() === '') {
      setErrorValidacion('');
      return;
    }
    const resultado = validarNumeroMesa(valor);
    if (!resultado.esValido) {
      setErrorValidacion(resultado.mensajeError);
    } else {
      setErrorValidacion('');
    }
  };

  const actualizarPedido = (nuevoEstado) => {
    setErrorValidacion('');
    const resultadoMesa = validarNumeroMesa(mesa);
    if (!resultadoMesa.esValido) {
      setErrorValidacion(
        resultadoMesa.mensajeError ||
          '⚠️ Por favor, ingresa un número de mesa válido (mayor a 0) antes de enviar.'
      );
      return;
    }

    const ESTADOS_PERMITIDOS = ['Recibido 📝', 'En Cocina 🍳', 'Listo 🍽️'];
    if (!ESTADOS_PERMITIDOS.includes(nuevoEstado)) {
      setErrorValidacion('⚠️ Estado de pedido no reconocido.');
      return;
    }

    console.log(`Enviando actualización válida para Mesa ${resultadoMesa.numero}: ${nuevoEstado}`);
    socket.emit('actualizar_pedido', { mesa: `Mesa ${resultadoMesa.numero}`, estado: nuevoEstado });
  };

  const trasladarPedido = () => {
    setMensajeTraslado('');
    const resOrigen = validarNumeroMesa(mesaOrigen);
    if (!resOrigen.esValido) {
      setMensajeTraslado(
        resOrigen.mensajeError || '⚠️ Mesa origen inválida (debe ser entero mayor a 0).'
      );
      return;
    }

    const resDestino = validarNumeroMesa(mesaDestino);
    if (!resDestino.esValido) {
      setMensajeTraslado(
        resDestino.mensajeError || '⚠️ Mesa destino inválida (debe ser entero mayor a 0).'
      );
      return;
    }

    if (resOrigen.numero === resDestino.numero) {
      setMensajeTraslado('⚠️ [ENTRADA_INVALIDA] origen y destino deben ser mesas distintas.');
      return;
    }

    console.log(`Enviando traslado: Mesa ${resOrigen.numero} → Mesa ${resDestino.numero}`);
    socket.emit('trasladar_pedido', { origen: resOrigen.numero, destino: resDestino.numero });
  };

  const tonoEstado = TONOS_ESTADO[ultimoPedido.estado] ?? TONO_NEUTRO;

  return (
    <div style={estilos.app}>
      {/* Encabezado estilo Haley Park: barra superior de doble marco con puntas (< >) y cabecera de 3 columnas */}
      <header style={estilos.encabezado}>
        <div style={estilos.barraSuperiorContenedor}>
          <div style={estilos.barraMarcoExterior}>
            <div style={estilos.barraMarcoInterior}>
              {/* Punta angular izquierda (<) sin deformación */}
              <svg
                aria-hidden="true"
                viewBox="0 0 16 44"
                preserveAspectRatio="none"
                fill="none"
                style={estilos.puntaIzquierda}
              >
                <polyline
                  points="16,0 1,22 16,44"
                  stroke="var(--color-borde)"
                  strokeWidth="1.15"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {/* Punta angular derecha (>) sin deformación */}
              <svg
                aria-hidden="true"
                viewBox="0 0 16 44"
                preserveAspectRatio="none"
                fill="none"
                style={estilos.puntaDerecha}
              >
                <polyline
                  points="0,0 15,22 0,44"
                  stroke="var(--color-borde)"
                  strokeWidth="1.15"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              <span aria-hidden="true" style={estilos.cruzBarra}>
                ┼
              </span>

              <div style={estilos.accionesEncabezado}>
                <span style={estilos.itemNavActivo}>
                  Salón y comandas
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 72 6"
                    preserveAspectRatio="none"
                    fill="none"
                    style={estilos.ondaSubrayado}
                  >
                    <path
                      d="M1 3.5C5 1 9 6 13 3.5C17 1 21 6 25 3.5C29 1 33 6 37 3.5C41 1 45 6 49 3.5C53 1 57 6 61 3.5C65 1 69 6 71 3.5"
                      stroke="var(--color-azafran)"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>

                <span
                  role="status"
                  title="Control de conexión con el servidor"
                  style={{
                    ...estilos.conexion,
                    borderColor: conectado ? 'var(--color-exito)' : 'var(--color-peligro)'
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      ...estilos.puntoConexion,
                      background: conectado ? 'var(--color-exito)' : 'var(--color-peligro)',
                      animation: conectado ? 'pulso 2s ease-in-out infinite' : 'none'
                    }}
                  />
                  {conectado ? 'Sistema Conectado' : 'Servidor Desconectado'}
                </span>

                <SelectorTema />
              </div>

              <span aria-hidden="true" style={estilos.cruzBarra}>
                ┼
              </span>
            </div>
          </div>
        </div>

        {/* Cabecera monumental de 3 columnas que nunca se solapa al redimensionar */}
        <div className="haley-masthead" style={estilos.masthead}>
          <div className="haley-masthead-side" style={estilos.mastheadIzq}>
            <p style={estilos.marcaEtiqueta}>Sala · Cocina · Caja</p>
          </div>

          <div className="haley-masthead-center">
            <h1 style={estilos.titulo}>Monitor de Pedidos en Tiempo Real</h1>
          </div>

          <div className="haley-masthead-side" style={estilos.mastheadDer}>
            <p style={estilos.subtituloDerecha}>Servicio de salón</p>
          </div>
        </div>
      </header>

      <main style={estilos.contenido}>
        {/* Divisor ornamental horizontal estilo Haley Park */}
        <div aria-hidden="true" style={estilos.divisorEditorial}>
          <span style={estilos.cruzDivisor}>┼</span>
          <div style={estilos.lineaDivisor} />
          <span style={estilos.textoDivisor}>Actividad reciente y estado de sala</span>
          <div style={estilos.lineaDivisor} />
          <span style={estilos.cruzDivisor}>┼</span>
        </div>

        {/* Recuadro central de última actualización con marco de esquinas cóncavas y rombos */}
        <section style={estilos.destacado} aria-live="polite">
          <MarcoOrnamental />
          <div style={estilos.destacadoTexto}>
            <p style={estilos.etiqueta}>Última actualización</p>
            <div style={estilos.ultimoPedido}>
              <span style={estilos.ultimaMesa}>{ultimoPedido.mesa}</span>
              <span aria-hidden="true" style={estilos.flecha}>
                →
              </span>
              <span
                style={{
                  ...estilos.pildoraEstado,
                  background: tonoEstado.fondo,
                  color: tonoEstado.texto,
                  borderColor: tonoEstado.borde
                }}
              >
                {ultimoPedido.estado}
              </span>
            </div>
          </div>

          {ultimoPedido.estado !== 'Sin Pedidos' && (
            <span
              title="Tiempo en el estado actual"
              style={{
                ...estilos.contador,
                background:
                  segundos > 900 ? 'var(--color-peligro-suave)' : 'var(--color-superficie-alt)',
                color: segundos > 900 ? 'var(--color-peligro-texto)' : 'var(--color-acento-texto)',
                borderColor: segundos > 900 ? 'var(--color-peligro)' : 'var(--color-azafran)'
              }}
            >
              ⏱️ {formatearTiempo(segundos)}
            </span>
          )}
        </section>

        {/* Alerta de validación del Frontend */}
        {errorValidacion && (
          <div role="alert" style={{ ...estilos.aviso, ...estilos.avisoError }}>
            {errorValidacion}
          </div>
        )}

        <div style={estilos.columnas}>
          {/* US-08: Mapa interactivo de mesas */}
          <section style={{ ...estilos.tarjeta, ...estilos.columnaPrincipal }}>
            <MarcoOrnamental />
            <div style={estilos.contenidoTarjeta}>
              <MapaMesas
                mesas={mesas}
                mesaSeleccionada={mesaSeleccionada}
                onSeleccionar={(m) => setMesaSeleccionada(m)}
              />
            </div>
          </section>

          <aside style={estilos.columnaLateral}>
            {/* Panel de control de estados */}
            <section style={estilos.tarjeta}>
              <MarcoOrnamental />
              <div style={estilos.contenidoTarjeta}>
                <p style={estilos.etiqueta}>Mozo · Cocina</p>
                <h3 style={estilos.tituloTarjeta}>Panel de control</h3>

                <label htmlFor="input-mesa" style={estilos.rotulo}>
                  Número de mesa
                </label>
                <input
                  id="input-mesa"
                  type="number"
                  step="1"
                  placeholder="Ej: 5"
                  value={mesa}
                  onChange={(e) => manejarCambioMesa(e.target.value)}
                  disabled={!conectado}
                  style={estilos.campo}
                />

                <p style={{ ...estilos.rotulo, marginTop: '18px' }}>Cambiar estado a</p>
                <div style={estilos.grupoEstados}>
                  <button
                    disabled={!conectado}
                    onClick={() => actualizarPedido('Recibido 📝')}
                    style={{ ...estilos.botonEstado, borderLeftColor: 'var(--color-azafran)' }}
                  >
                    Tomar Pedido 📝
                  </button>
                  <button
                    disabled={!conectado}
                    onClick={() => actualizarPedido('En Cocina 🍳')}
                    style={{ ...estilos.botonEstado, borderLeftColor: 'var(--color-acento)' }}
                  >
                    Empezar Cocina 🍳
                  </button>
                  <button
                    disabled={!conectado}
                    onClick={() => actualizarPedido('Listo 🍽️')}
                    style={{ ...estilos.botonEstado, borderLeftColor: 'var(--color-exito)' }}
                  >
                    Pedido Listo 🍽️
                  </button>
                </div>
              </div>
            </section>

            {/* Operación 3 (US-05): Traslado de Mesa */}
            <section style={estilos.tarjeta}>
              <MarcoOrnamental />
              <div style={estilos.contenidoTarjeta}>
                <p style={estilos.etiqueta}>Sala</p>
                <h3 style={estilos.tituloTarjeta}>Traslado de mesa</h3>

                {mensajeTraslado && (
                  <div
                    role="status"
                    style={{
                      ...estilos.aviso,
                      marginBottom: '14px',
                      ...(mensajeTraslado.startsWith('✅')
                        ? estilos.avisoExito
                        : estilos.avisoError)
                    }}
                  >
                    {mensajeTraslado}
                  </div>
                )}

                <div style={estilos.filaCampos}>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="input-mesa-origen" style={estilos.rotulo}>
                      Mesa origen
                    </label>
                    <input
                      id="input-mesa-origen"
                      type="number"
                      step="1"
                      placeholder="Ej: 2"
                      value={mesaOrigen}
                      onChange={(e) => {
                        setMesaOrigen(e.target.value);
                        setMensajeTraslado('');
                      }}
                      disabled={!conectado}
                      style={estilos.campo}
                    />
                  </div>
                  <span aria-hidden="true" style={estilos.flechaTraslado}>
                    ⇄
                  </span>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="input-mesa-destino" style={estilos.rotulo}>
                      Mesa destino
                    </label>
                    <input
                      id="input-mesa-destino"
                      type="number"
                      step="1"
                      placeholder="Ej: 6"
                      value={mesaDestino}
                      onChange={(e) => {
                        setMesaDestino(e.target.value);
                        setMensajeTraslado('');
                      }}
                      disabled={!conectado}
                      style={estilos.campo}
                    />
                  </div>
                </div>

                <button
                  disabled={!conectado}
                  onClick={trasladarPedido}
                  style={estilos.botonPrimario}
                >
                  Trasladar Mesa
                </button>
              </div>
            </section>
          </aside>
        </div>

        {/* Panel lateral deslizable con el detalle de la mesa seleccionada */}
        <DetalleMesa
          mesa={mesaSeleccionada}
          conectado={conectado}
          versionPedidos={versionPedidos}
          onCerrar={() => setMesaSeleccionada(null)}
          onTomarPedido={(m) => setMesaTomandoPedido(m)}
        />

        {/* Vista "Tomar pedido" */}
        {mesaTomandoPedido && (
          <TomaPedido
            mesa={mesaTomandoPedido}
            socket={socket}
            conectado={conectado}
            onCerrar={cerrarTomaPedido}
          />
        )}
      </main>

      {/* Ilustración arquitectónica de arcos góticos y rosetones en SVG estático (0ms CPU) */}
      <div aria-hidden="true" style={estilos.contenedorArcos}>
        <svg
          viewBox="0 0 1400 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMax slice"
          style={estilos.svgArcos}
        >
          <defs>
            <g id="cathedral-arch">
              <path
                d="M 0 320 C 10 180, 75 85, 160 20 C 245 85, 310 180, 320 320"
                strokeWidth="1.25"
              />
              <path
                d="M 12 320 C 22 190, 82 98, 160 35 C 238 98, 298 190, 308 320"
                strokeWidth="0.85"
              />
              <path
                d="M 18 320 C 25 240, 55 190, 90 160 C 125 190, 155 240, 160 320"
                strokeWidth="0.95"
              />
              <path
                d="M 160 320 C 165 240, 195 190, 230 160 C 265 190, 295 240, 302 320"
                strokeWidth="0.95"
              />
              <circle cx="160" cy="115" r="42" strokeWidth="1.15" />
              <circle cx="160" cy="115" r="35" strokeWidth="0.75" />
              <circle cx="160" cy="115" r="16" strokeWidth="0.85" />
              <line x1="160" y1="73" x2="160" y2="157" strokeWidth="0.7" />
              <line x1="118" y1="115" x2="202" y2="115" strokeWidth="0.7" />
              <line x1="130" y1="85" x2="190" y2="145" strokeWidth="0.7" />
              <line x1="190" y1="85" x2="130" y2="145" strokeWidth="0.7" />
            </g>
          </defs>
          <use href="#cathedral-arch" x="30" y="45" />
          <use href="#cathedral-arch" x="260" y="45" />
          <g transform="translate(480, -30) scale(1.35)">
            <use href="#cathedral-arch" x="0" y="0" />
          </g>
          <use href="#cathedral-arch" x="820" y="45" />
          <use href="#cathedral-arch" x="1050" y="45" />
        </svg>
      </div>
    </div>
  );
}

// Colores de la píldora de "Última actualización" según el estado del pedido
const TONOS_ESTADO = {
  'Recibido 📝': {
    fondo: 'var(--color-superficie-alt)',
    texto: 'var(--color-acento-texto)',
    borde: 'var(--color-azafran)'
  },
  'En Cocina 🍳': {
    fondo: 'var(--color-primario-suave)',
    texto: 'var(--color-primario-texto)',
    borde: 'var(--color-acento)'
  },
  'Listo 🍽️': {
    fondo: 'var(--color-exito-suave)',
    texto: 'var(--color-exito-texto)',
    borde: 'var(--color-exito)'
  }
};
const TONO_NEUTRO = {
  fondo: 'var(--color-superficie-alt)',
  texto: 'var(--color-texto-suave)',
  borde: 'var(--color-borde)'
};

const estilos = {
  app: {
    minHeight: '100svh',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflowX: 'hidden'
  },
  encabezado: {
    position: 'relative',
    zIndex: 10,
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    padding: '16px clamp(16px, 4vw, 40px) 0'
  },
  barraSuperiorContenedor: {
    width: '100%'
  },
  barraMarcoExterior: {
    padding: '4px',
    border: '1px solid var(--color-borde-suave)',
    background: 'rgba(38, 17, 8, 0.08)'
  },
  barraMarcoInterior: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '9px clamp(20px, 3vw, 36px)',
    borderTop: '1px solid var(--color-borde)',
    borderBottom: '1px solid var(--color-borde)'
  },
  puntaIzquierda: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '16px',
    height: '100%',
    pointerEvents: 'none'
  },
  puntaDerecha: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '16px',
    height: '100%',
    pointerEvents: 'none'
  },
  cruzBarra: {
    fontSize: '12px',
    color: 'var(--color-texto-suave)',
    userSelect: 'none',
    flexShrink: 0
  },
  accionesEncabezado: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-around',
    flex: 1,
    gap: '12px 24px'
  },
  itemNavActivo: {
    position: 'relative',
    fontFamily: 'var(--fuente-titulo)',
    fontSize: '17px',
    color: 'var(--color-texto)',
    paddingBottom: '2px'
  },
  ondaSubrayado: {
    position: 'absolute',
    left: 0,
    bottom: '-5px',
    width: '100%',
    height: '6px',
    pointerEvents: 'none'
  },
  conexion: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 12px',
    border: '1px solid',
    background: 'var(--color-superficie)',
    fontSize: '14px',
    fontStyle: 'italic',
    whiteSpace: 'nowrap'
  },
  puntoConexion: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  masthead: {
    padding: '28px 0 8px'
  },
  mastheadIzq: {
    textAlign: 'left'
  },
  mastheadDer: {
    textAlign: 'right'
  },
  marcaEtiqueta: {
    fontSize: '18px',
    fontStyle: 'italic',
    color: 'var(--color-texto-suave)'
  },
  subtituloDerecha: {
    fontSize: '18px',
    fontStyle: 'italic',
    color: 'var(--color-texto-suave)'
  },
  titulo: {
    margin: 0,
    fontSize: 'clamp(28px, 4.2vw, 48px)',
    fontWeight: 400,
    letterSpacing: '-0.02em',
    color: 'var(--color-texto)'
  },
  contenido: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '12px clamp(16px, 4vw, 40px) 64px',
    display: 'flex',
    flexDirection: 'column',
    gap: '22px'
  },
  divisorEditorial: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    margin: '4px 0'
  },
  cruzDivisor: {
    fontSize: '12px',
    color: 'var(--color-texto-suave)',
    flexShrink: 0
  },
  lineaDivisor: {
    flex: 1,
    borderTop: '1px solid var(--color-borde-suave)'
  },
  textoDivisor: {
    fontFamily: 'var(--fuente-titulo)',
    fontStyle: 'italic',
    fontSize: 'clamp(17px, 2.2vw, 22px)',
    color: 'var(--color-texto-suave)',
    padding: '0 8px',
    textAlign: 'center'
  },
  marcoInterior: {
    position: 'absolute',
    inset: '6px',
    border: '1px solid var(--color-borde-suave)',
    pointerEvents: 'none',
    zIndex: 1
  },
  destacado: {
    position: 'relative',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '20px 26px',
    background: 'var(--color-superficie)',
    border: '1px solid var(--color-borde)',
    boxShadow: 'var(--sombra-1)'
  },
  destacadoTexto: {
    position: 'relative',
    zIndex: 2,
    flex: '1 1 220px',
    minWidth: 0
  },
  etiqueta: {
    fontSize: '14px',
    fontStyle: 'italic',
    color: 'var(--color-texto-suave)',
    marginBottom: '4px'
  },
  ultimoPedido: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: '10px'
  },
  ultimaMesa: {
    fontFamily: 'var(--fuente-titulo)',
    fontSize: '28px',
    fontWeight: 400,
    color: 'var(--color-texto)'
  },
  flecha: {
    color: 'var(--color-texto-tenue)',
    fontSize: '18px'
  },
  pildoraEstado: {
    display: 'inline-block',
    padding: '3px 14px',
    border: '1px solid',
    fontSize: '15px',
    fontStyle: 'italic'
  },
  contador: {
    position: 'relative',
    zIndex: 2,
    padding: '6px 14px',
    border: '1px solid',
    fontFamily: 'var(--fuente-mono)',
    fontSize: '16px',
    fontVariantNumeric: 'tabular-nums'
  },
  aviso: {
    padding: '12px 16px',
    border: '1px solid',
    fontSize: '15px',
    lineHeight: 1.5
  },
  avisoError: {
    background: 'var(--color-peligro-suave)',
    color: 'var(--color-peligro-texto)',
    borderColor: 'var(--color-peligro)'
  },
  avisoExito: {
    background: 'var(--color-exito-suave)',
    color: 'var(--color-exito-texto)',
    borderColor: 'var(--color-exito)'
  },
  columnas: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: '24px'
  },
  columnaPrincipal: {
    flex: '2 1 480px',
    minWidth: 0
  },
  columnaLateral: {
    flex: '1 1 320px',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  tarjeta: {
    position: 'relative',
    background: 'var(--color-superficie)',
    border: '1px solid var(--color-borde)',
    boxShadow: 'var(--sombra-1)',
    padding: '26px'
  },
  contenidoTarjeta: {
    position: 'relative',
    zIndex: 2
  },
  tituloTarjeta: {
    margin: '0 0 16px',
    fontSize: '24px',
    fontWeight: 400
  },
  rotulo: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontStyle: 'italic',
    color: 'var(--color-texto-suave)'
  },
  campo: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '16px',
    color: 'var(--color-texto)',
    background: 'var(--color-fondo)',
    border: '1px solid var(--color-borde)'
  },
  grupoEstados: {
    display: 'grid',
    gap: '10px'
  },
  botonEstado: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '11px 16px',
    fontSize: '16px',
    textAlign: 'left',
    color: 'var(--color-texto)',
    background: 'var(--color-superficie-alt)',
    borderTop: '1px solid var(--color-borde)',
    borderRight: '1px solid var(--color-borde)',
    borderBottom: '1px solid var(--color-borde)',
    borderLeft: '4px solid',
    cursor: 'pointer'
  },
  filaCampos: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
    marginBottom: '16px'
  },
  flechaTraslado: {
    paddingBottom: '10px',
    fontSize: '18px',
    color: 'var(--color-texto-tenue)'
  },
  botonPrimario: {
    width: '100%',
    padding: '12px 18px',
    fontSize: '16px',
    color: 'var(--color-sobre-primario)',
    background: 'var(--color-primario)',
    border: '1px solid var(--color-borde)',
    cursor: 'pointer'
  },
  contenedorArcos: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '300px',
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 1,
    overflow: 'hidden'
  },
  svgArcos: {
    width: '100%',
    height: '100%',
    stroke: 'var(--color-arcos)'
  }
};

export default App;
