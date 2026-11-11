import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { validarNumeroMesa } from './validaciones';
import { formatearTiempo } from './utils/formato';
import { API_URL, obtenerMesas } from './servicios/api';
import MapaMesas from './MapaMesas';
import DetalleMesa from './DetalleMesa';
import TomaPedido from './TomaPedido';
import SelectorTema from './SelectorTema';

// Conexión socket.io al backend (la URL viene de servicios/api.js)
const socket = io(API_URL);

function App() {
  const [conectado, setConectado] = useState(false);
  // Estado para capturar la mesa seleccionada en el formulario
  const [mesa, setMesa] = useState('');
  // Estado para mostrar el último pedido actualizado que llega del backend
  const [ultimoPedido, setUltimoPedido] = useState({ mesa: 'Ninguna', estado: 'Sin Pedidos' });
  // Estado para capturar errores de validación en pantalla
  const [errorValidacion, setErrorValidacion] = useState('');

  // NUEVO: Estado para el contador de tiempo en segundos
  const [segundos, setSegundos] = useState(0);

  // NUEVO: Estado para el estado de las mesas en tiempo real
  const [mesas, setMesas] = useState([]);

  // Operación 3 (US-05): estados para el traslado de mesa
  const [mesaOrigen, setMesaOrigen] = useState('');
  const [mesaDestino, setMesaDestino] = useState('');
  const [mensajeTraslado, setMensajeTraslado] = useState('');

  // US-08: mesa seleccionada para mostrar el panel lateral de detalle
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);

  // Vista "Tomar pedido" (Paso 1): mesa para la que se está tomando el pedido
  // null = vista cerrada; objeto mesa = vista abierta para esa mesa
  const [mesaTomandoPedido, setMesaTomandoPedido] = useState(null);

  // Referencia estable: TomaPedido la usa como dependencia de su efecto de socket
  // Se incrementa cada vez que cambia el contenido de algún pedido (para refrescar el resumen)
  const [versionPedidos, setVersionPedidos] = useState(0);

  const cerrarTomaPedido = useCallback(() => setMesaTomandoPedido(null), []);

  useEffect(() => {
    socket.on('connect', () => setConectado(true));
    socket.on('disconnect', () => setConectado(false));

    // Escuchar cuando la cocina o el backend actualizan un pedido
    socket.on('cambio_estado_pedido', (datos) => {
      // datos esperados: { mesa: 'Mesa 5', estado: 'En Cocina 🍳' }
      setUltimoPedido({ mesa: datos.mesa, estado: datos.estado });
      setSegundos(0); // NUEVO: Resetea el reloj a 0 con cada cambio de estado
    });

    // NUEVO: escuchar el evento de estado de mesas que ya emite el backend
    // US-08 CA3: reflejar cambios en tiempo real también en la mesa seleccionada
    socket.on('estado_mesas', (datos) => {
      setMesas(datos);
      // Sincronizar el estado de la mesa seleccionada si cambió
      setMesaSeleccionada((prev) => {
        if (!prev) return null;
        const actualizada = datos.find((m) => m.id === prev.id);
        return actualizada ?? null;
      });
    });

    socket.on('pedido_items_actualizado', () => setVersionPedidos((v) => v + 1));

    // Escuchar respuesta estructurada del backend (validación defensiva)
    socket.on('respuesta_pedido', (resultado) => {
      if (!resultado.ok) {
        setErrorValidacion(
          `⚠️ [${resultado.tipo}] ${resultado.error}` +
            (resultado.esperado ? ` — Esperado: ${resultado.esperado}` : '')
        );
      }
    });

    // Operación 3 (US-05): escuchar respuesta del traslado de mesa
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
    obtenerMesas()
      .then((data) => {
        if (data.ok) setMesas(data.mesas);
      })
      .catch(() => {
        // Si falla el fetch inicial, el socket completará la carga al conectar
        console.warn('[US-08] No se pudo cargar las mesas por REST; se usará el socket.');
      });
  }, []);

  // NUEVO: useEffect encargado de controlar el avance del tiempo y el límite de desbordamiento
  useEffect(() => {
    // El tiempo solo corre si el pedido no está "Listo" ni "Sin Pedidos"
    const pedidoActivo =
      ultimoPedido.estado !== 'Sin Pedidos' && ultimoPedido.estado !== 'Listo 🍽️';
    let intervalo = null;

    if (conectado && pedidoActivo) {
      intervalo = setInterval(() => {
        setSegundos((tiempoPrevio) => {
          // Límite estricto para evitar desbordamiento visual (99 minutos y 59 segundos = 5999s)
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


  // Función para manejar el cambio en el input de la mesa de forma controlada
  const manejarCambioMesa = (valor) => {
    // 1. Conservar siempre la entrada en el estado para que el campo no se borre silenciosamente
    setMesa(valor);

    // 2. Si el usuario vacía el input, limpiamos los mensajes de error
    if (valor.trim() === '') {
      setErrorValidacion('');
      return;
    }

    // 3. Validación defensiva en la frontera de entrada del componente
    const resultado = validarNumeroMesa(valor);
    if (!resultado.esValido) {
      setErrorValidacion(resultado.mensajeError);
    } else {
      setErrorValidacion('');
    }
  };

  // Función para simular el envío o actualización de un pedido
  const actualizarPedido = (nuevoEstado) => {
    setErrorValidacion(''); // Limpiar errores previos

    // 1. VALIDACIÓN DEFENSIVA: Verificar que se haya ingresado una mesa válida
    const resultadoMesa = validarNumeroMesa(mesa);
    if (!resultadoMesa.esValido) {
      setErrorValidacion(
        resultadoMesa.mensajeError ||
          '⚠️ Por favor, ingresa un número de mesa válido (mayor a 0) antes de enviar.'
      );
      return; // Frena el envío por socket
    }

    // 2. VALIDACIÓN: Lista estricta de estados permitidos en el restaurante
    const ESTADOS_PERMITIDOS = ['Recibido 📝', 'En Cocina 🍳', 'Listo 🍽️'];
    if (!ESTADOS_PERMITIDOS.includes(nuevoEstado)) {
      setErrorValidacion('⚠️ Estado de pedido no reconocido.');
      return; // Frena el envío por socket
    }

    // 3. Envío seguro al backend si pasa las validaciones
    console.log(`Enviando actualización válida para Mesa ${resultadoMesa.numero}: ${nuevoEstado}`);
    socket.emit('actualizar_pedido', { mesa: `Mesa ${resultadoMesa.numero}`, estado: nuevoEstado });
  };

  // Operación 3 (US-05): Traslada el pedido activo de una mesa a otra
  const trasladarPedido = () => {
    setMensajeTraslado(''); // Limpiar mensajes previos

    // 1. VALIDACIÓN DEFENSIVA: verificar mesa origen
    const resOrigen = validarNumeroMesa(mesaOrigen);
    if (!resOrigen.esValido) {
      setMensajeTraslado(
        resOrigen.mensajeError || '⚠️ Mesa origen inválida (debe ser entero mayor a 0).'
      );
      return;
    }

    // 2. VALIDACIÓN DEFENSIVA: verificar mesa destino
    const resDestino = validarNumeroMesa(mesaDestino);
    if (!resDestino.esValido) {
      setMensajeTraslado(
        resDestino.mensajeError || '⚠️ Mesa destino inválida (debe ser entero mayor a 0).'
      );
      return;
    }

    // 3. VALIDACIÓN: origen y destino deben ser distintos (primera barrera cliente)
    if (resOrigen.numero === resDestino.numero) {
      setMensajeTraslado('⚠️ [ENTRADA_INVALIDA] origen y destino deben ser mesas distintas.');
      return;
    }

    // 4. Envío seguro al backend
    console.log(`Enviando traslado: Mesa ${resOrigen.numero} → Mesa ${resDestino.numero}`);
    socket.emit('trasladar_pedido', { origen: resOrigen.numero, destino: resDestino.numero });
  };

  const tonoEstado = TONOS_ESTADO[ultimoPedido.estado] ?? TONO_NEUTRO;

  return (
    <div style={estilos.app}>
      {/* Encabezado: identidad del local e indicador de conexión con el backend */}
      <header style={estilos.encabezado}>
        <div style={estilos.encabezadoInterior}>
          <div style={estilos.marca}>
            <span aria-hidden="true" style={estilos.logo}>
              🍽️
            </span>
            <div>
              <p style={estilos.marcaEtiqueta}>Sala · Cocina · Caja</p>
              <h1 style={estilos.titulo}>Monitor de Pedidos en Tiempo Real</h1>
            </div>
          </div>

          <div style={estilos.accionesEncabezado}>
            <span
              role="status"
              title="Control de conexión con el servidor"
              style={{
                ...estilos.conexion,
                borderColor: conectado ? 'rgba(181, 196, 74, 0.55)' : 'rgba(255, 107, 74, 0.6)'
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  ...estilos.puntoConexion,
                  background: conectado ? '#b5c44a' : '#ff6b4a',
                  animation: conectado ? 'pulso 2s ease-in-out infinite' : 'none'
                }}
              />
              {conectado ? 'Sistema Conectado ✔' : 'Servidor Desconectado ✖'}
            </span>

            <SelectorTema />
          </div>
        </div>
      </header>

      <main style={estilos.contenido}>
        {/* Pantalla central que muestra el último movimiento con el contador compacto integrado */}
        <section style={estilos.destacado} aria-live="polite">
          <span aria-hidden="true" style={estilos.iconoDestacado}>
            🛎️
          </span>
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

          {/* Visualización del contador compacto */}
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
          {/* US-08: Mapa interactivo de mesas con panel lateral de detalle */}
          <section style={{ ...estilos.tarjeta, ...estilos.columnaPrincipal }}>
            <MapaMesas
              mesas={mesas}
              mesaSeleccionada={mesaSeleccionada}
              onSeleccionar={(m) => setMesaSeleccionada(m)}
            />
          </section>

          <aside style={estilos.columnaLateral}>
            {/* Formulario de Simulación */}
            <section style={estilos.tarjeta}>
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
              {/* Los botones se deshabilitan automáticamente si el servidor cae */}
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
            </section>

            {/* Operación 3 (US-05): Traslado de Mesa */}
            <section style={estilos.tarjeta}>
              <p style={estilos.etiqueta}>Sala</p>
              <h3 style={estilos.tituloTarjeta}>Traslado de mesa</h3>

              {/* Banner de resultado del traslado */}
              {mensajeTraslado && (
                <div
                  role="status"
                  style={{
                    ...estilos.aviso,
                    ...(mensajeTraslado.startsWith('✅') ? estilos.avisoExito : estilos.avisoError)
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

              <button disabled={!conectado} onClick={trasladarPedido} style={estilos.botonPrimario}>
                🔄 Trasladar Mesa
              </button>
            </section>
          </aside>
        </div>

        {/* US-08 CA5 / US-09: Panel lateral deslizable con el detalle de la mesa seleccionada */}
        <DetalleMesa
          mesa={mesaSeleccionada}
          conectado={conectado}
          versionPedidos={versionPedidos}
          onCerrar={() => setMesaSeleccionada(null)}
          onTomarPedido={(m) => setMesaTomandoPedido(m)}
        />

        {/* Vista "Tomar pedido" — se muestra encima de todo cuando hay una mesa activa */}
        {mesaTomandoPedido && (
          <TomaPedido
            mesa={mesaTomandoPedido}
            socket={socket}
            conectado={conectado}
            onCerrar={cerrarTomaPedido}
          />
        )}
      </main>
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

// ── Estilos en línea: leen los tokens de index.css (modo claro y oscuro) ─────
const estilos = {
  app: {
    minHeight: '100svh',
    display: 'flex',
    flexDirection: 'column'
  },
  encabezado: {
    background: 'var(--fondo-encabezado)',
    color: 'var(--color-encabezado-texto)',
    borderBottom: '3px solid var(--color-azafran)',
    boxShadow: 'var(--sombra-2)'
  },
  encabezadoInterior: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '18px clamp(16px, 4vw, 40px)',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px'
  },
  marca: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  logo: {
    display: 'grid',
    placeItems: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'var(--color-azafran)',
    boxShadow: 'inset 0 0 0 3px rgba(90, 30, 8, 0.25)',
    fontSize: '24px',
    flexShrink: 0
  },
  marcaEtiqueta: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'var(--color-azafran)'
  },
  titulo: {
    margin: '2px 0 0',
    fontSize: 'clamp(20px, 3vw, 26px)',
    color: 'var(--color-encabezado-texto)'
  },
  conexion: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 14px',
    borderRadius: '999px',
    border: '1px solid',
    background: 'rgba(244, 236, 227, 0.08)',
    fontSize: '13px',
    fontWeight: 600,
    whiteSpace: 'nowrap'
  },
  accionesEncabezado: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px'
  },
  puntoConexion: {
    width: '9px',
    height: '9px',
    borderRadius: '50%'
  },
  // ── Contenido principal
  contenido: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: 'clamp(16px, 4vw, 32px) clamp(16px, 4vw, 40px) 48px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  destacado: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '18px',
    padding: '20px 24px',
    background: 'var(--color-superficie)',
    border: '1px solid var(--color-borde)',
    borderLeft: '5px solid var(--color-azafran)',
    borderRadius: 'var(--radio-l)',
    boxShadow: 'var(--sombra-1)'
  },
  iconoDestacado: {
    display: 'grid',
    placeItems: 'center',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'var(--color-superficie-alt)',
    fontSize: '26px',
    flexShrink: 0
  },
  destacadoTexto: {
    flex: '1 1 220px',
    minWidth: 0
  },
  etiqueta: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--color-acento-texto)',
    marginBottom: '4px'
  },
  ultimoPedido: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px'
  },
  ultimaMesa: {
    fontFamily: 'var(--fuente-titulo)',
    fontSize: '26px',
    fontWeight: 600,
    color: 'var(--color-texto)'
  },
  flecha: {
    color: 'var(--color-texto-tenue)',
    fontSize: '20px'
  },
  pildoraEstado: {
    display: 'inline-block',
    padding: '4px 14px',
    borderRadius: '999px',
    border: '1px solid',
    fontSize: '14px',
    fontWeight: 700
  },
  contador: {
    padding: '8px 14px',
    borderRadius: '999px',
    border: '1px solid',
    fontFamily: 'var(--fuente-mono)',
    fontSize: '15px',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums'
  },
  aviso: {
    padding: '12px 16px',
    borderRadius: 'var(--radio-m)',
    border: '1px solid',
    fontSize: '14px',
    fontWeight: 600,
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
  // Dos columnas que se apilan solas en pantallas angostas (flex-wrap)
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
    background: 'var(--color-superficie)',
    border: '1px solid var(--color-borde)',
    borderRadius: 'var(--radio-l)',
    boxShadow: 'var(--sombra-1)',
    padding: '24px'
  },
  tituloTarjeta: {
    margin: '0 0 18px',
    fontSize: '20px'
  },
  rotulo: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-texto-suave)'
  },
  campo: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '16px',
    color: 'var(--color-texto)',
    background: 'var(--color-fondo)',
    border: '1px solid var(--color-borde)',
    borderRadius: 'var(--radio-s)'
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
    padding: '12px 16px',
    fontSize: '15px',
    fontWeight: 600,
    textAlign: 'left',
    color: 'var(--color-texto)',
    background: 'var(--color-superficie-alt)',
    border: '1px solid var(--color-borde)',
    borderLeft: '5px solid',
    borderRadius: 'var(--radio-m)',
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
    fontSize: '20px',
    color: 'var(--color-texto-tenue)'
  },
  botonPrimario: {
    width: '100%',
    padding: '12px 18px',
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--color-sobre-primario)',
    background: 'var(--color-primario)',
    border: 'none',
    borderRadius: 'var(--radio-m)',
    boxShadow: '0 2px 0 rgba(90, 30, 8, 0.25)',
    cursor: 'pointer'
  }
};

export default App;
