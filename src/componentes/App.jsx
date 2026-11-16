import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { validarMesaExistente, validarTraslado } from '../validaciones/validaciones';
import { FLUJO_PEDIDO } from '../utils/flujoPedido';
import { API_URL, obtenerMesas } from '../servicios/api';
import MapaMesas from './MapaMesas';
import DetalleMesa from './DetalleMesa';
import TomaPedido from './TomaPedido';
import AdminMesas from './AdminMesas';
import Encabezado from './Encabezado';
import UltimaActualizacion from './UltimaActualizacion';

// Conexión socket.io al backend (la URL viene de servicios/api.js)
const socket = io(API_URL);

function App() {
  const [conectado, setConectado] = useState(false);
  // Estado para mostrar el último pedido actualizado que llega del backend
  const [ultimoPedido, setUltimoPedido] = useState({ mesa: 'Ninguna', estado: 'Sin Pedidos' });
  // Rechazo del último cambio de estado del pedido (validación del frontend o del backend)
  const [errorValidacion, setErrorValidacion] = useState('');

  // NUEVO: Estado para el contador de tiempo en segundos
  const [segundos, setSegundos] = useState(0);

  // NUEVO: Estado para el estado de las mesas en tiempo real
  const [mesas, setMesas] = useState([]);

  // US-05: resultado del último traslado, que se muestra en el panel de la mesa
  const [mensajeTraslado, setMensajeTraslado] = useState('');

  // US-08: mesa seleccionada para mostrar su panel lateral. Se guarda solo el id y la mesa
  // se toma de la lista: así el panel siempre muestra el estado más reciente (CA3).
  const [idSeleccionada, setIdSeleccionada] = useState(null);
  const mesaSeleccionada = mesas.find((m) => m.id === idSeleccionada) ?? null;

  // Vista "Tomar pedido" (Paso 1): mesa para la que se está tomando el pedido
  // null = vista cerrada; objeto mesa = vista abierta para esa mesa
  const [mesaTomandoPedido, setMesaTomandoPedido] = useState(null);

  // Referencia estable: TomaPedido la usa como dependencia de su efecto de socket
  // Se incrementa cada vez que cambia el contenido de algún pedido (para refrescar el resumen)
  const [versionPedidos, setVersionPedidos] = useState(0);

  const cerrarTomaPedido = useCallback(() => setMesaTomandoPedido(null), []);

  // Pantalla "Configurar mesas" (agregar y quitar mesas), separada de la operación diaria
  const [configurandoMesas, setConfigurandoMesas] = useState(false);

  useEffect(() => {
    socket.on('connect', () => setConectado(true));
    socket.on('disconnect', () => setConectado(false));

    // Escuchar cuando la cocina o el backend actualizan un pedido
    socket.on('cambio_estado_pedido', (datos) => {
      // datos esperados: { mesa: 'Mesa 5', estado: 'En Cocina 🍳' }
      setUltimoPedido({ mesa: datos.mesa, estado: datos.estado });
      setSegundos(0); // NUEVO: Resetea el reloj a 0 con cada cambio de estado
      // El mapa muestra en qué va el pedido de cada mesa. El backend no reenvía
      // 'estado_mesas' en cada cambio de estado del pedido, así que se actualiza aquí.
      setMesas((prev) =>
        prev.map((m) => (m.id === datos.mesa ? { ...m, estadoPedido: datos.estado } : m))
      );
      // La cuenta del panel abierto se vuelve a cargar con el pedido actualizado
      setVersionPedidos((v) => v + 1);
    });

    // NUEVO: escuchar el evento de estado de mesas que ya emite el backend
    // US-08 CA3: reflejar cambios en tiempo real también en la mesa seleccionada
    socket.on('estado_mesas', (datos) => {
      setMesas(datos);
      // Si la mesa seleccionada ya no existe (la quitaron), su panel se cierra
      setIdSeleccionada((prev) => (datos.some((m) => m.id === prev) ? prev : null));
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


  // Pide al backend pasar el pedido de una mesa a un estado, desde el panel de esa mesa.
  const actualizarPedido = (valorMesa, nuevoEstado) => {
    setErrorValidacion(''); // Limpiar errores previos

    // 1. VALIDACIÓN DEFENSIVA: la mesa es un número válido y existe
    //    (la cantidad de mesas es configurable, ya no basta con "entero mayor a 0")
    const resultadoMesa = validarMesaExistente(valorMesa, mesas);
    if (!resultadoMesa.esValido) {
      setErrorValidacion(
        resultadoMesa.mensajeError ||
          '⚠️ Por favor, ingresa un número de mesa válido (mayor a 0) antes de enviar.'
      );
      return; // Frena el envío por socket
    }

    // 2. VALIDACIÓN: Lista estricta de estados permitidos en el restaurante
    if (!FLUJO_PEDIDO.includes(nuevoEstado)) {
      setErrorValidacion('⚠️ Estado de pedido no reconocido.');
      return; // Frena el envío por socket
    }

    // 3. Envío seguro al backend si pasa las validaciones
    console.log(`Enviando actualización válida para Mesa ${resultadoMesa.numero}: ${nuevoEstado}`);
    socket.emit('actualizar_pedido', { mesa: `Mesa ${resultadoMesa.numero}`, estado: nuevoEstado });
  };

  // US-05: traslada el pedido de una mesa a otra, desde el panel de la mesa de origen.
  // Mismas validaciones defensivas que antes (números válidos, mesas distintas) más que
  // ambas mesas existan; el resto (origen con pedido, destino libre) lo valida el backend.
  const enviarTraslado = (origen, destino) => {
    setMensajeTraslado(''); // Limpiar mensajes previos
    const resultado = validarTraslado(origen, destino, mesas);
    if (!resultado.esValido) {
      setMensajeTraslado(resultado.mensajeError);
      return;
    }
    console.log(`Enviando traslado: Mesa ${resultado.origen} → Mesa ${resultado.destino}`);
    socket.emit('trasladar_pedido', { origen: resultado.origen, destino: resultado.destino });
  };

  return (
    <div style={estilos.app}>
      <Encabezado
        conectado={conectado}
        onConfigurarMesas={() => {
          setIdSeleccionada(null); // cierra el panel de la mesa, si estaba abierto
          setConfigurandoMesas(true);
        }}
      />

      <main style={estilos.contenido}>
        <UltimaActualizacion ultimoPedido={ultimoPedido} segundos={segundos} />

        {/* Alerta de validación o de rechazo del backend. Con el panel de una mesa abierto,
            el aviso se muestra dentro del panel (que tapa esta zona). */}
        {errorValidacion && !mesaSeleccionada && (
          <div role="alert" style={{ ...estilos.aviso, ...estilos.avisoError }}>
            {errorValidacion}
          </div>
        )}

        {/* US-08: plano de sala; al tocar una mesa se abre su panel con todas sus acciones */}
        <section style={estilos.tarjeta}>
          <MapaMesas
            mesas={mesas}
            mesaSeleccionada={mesaSeleccionada}
            onSeleccionar={(m) => {
              setIdSeleccionada(m.id);
              // los avisos anteriores no pertenecen a esta mesa
              setErrorValidacion('');
              setMensajeTraslado('');
            }}
          />
        </section>

        {/* US-08 CA5 / US-09: Panel lateral deslizable con el detalle de la mesa seleccionada */}
        <DetalleMesa
          mesa={mesaSeleccionada}
          conectado={conectado}
          versionPedidos={versionPedidos}
          errorPedido={errorValidacion}
          onCerrar={() => setIdSeleccionada(null)}
          onTomarPedido={(m) => setMesaTomandoPedido(m)}
          onCambiarEstado={actualizarPedido}
          mesas={mesas}
          onTrasladar={enviarTraslado}
          mensajeTraslado={mensajeTraslado}
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

        {configurandoMesas && (
          <AdminMesas
            mesas={mesas}
            conectado={conectado}
            onCerrar={() => setConfigurandoMesas(false)}
          />
        )}
      </main>
    </div>
  );
}
// ── Estilos en línea: leen los tokens de index.css (modo claro y oscuro) ─────
const estilos = {
  app: {
    minHeight: '100svh',
    display: 'flex',
    flexDirection: 'column'
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
  aviso: {
    padding: '12px 16px',
    borderRadius: 'var(--radio-m)',
    borderStyle: 'solid',
    borderWidth: '2px',
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: 1.5
  },
  avisoError: {
    background: 'var(--color-peligro-suave)',
    color: 'var(--color-peligro-texto)',
    borderColor: 'var(--color-peligro)'
  },
  tarjeta: {
    background: 'var(--color-superficie)',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: 'var(--color-borde)',
    borderRadius: 'var(--radio-l)',
    boxShadow: 'var(--sombra-1)',
    padding: '24px'
  }
};

export default App;
