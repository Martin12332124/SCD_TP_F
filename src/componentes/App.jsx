import { useState, useEffect, useCallback } from 'react';
import { validarMesaExistente, validarTraslado } from '../validaciones/validaciones';
import { FLUJO_PEDIDO } from '../utils/flujoPedido';
import { obtenerMesas, SOCKET_NO_AUTORIZADO } from '../servicios/api';
import MapaMesas from './MapaMesas';
import DetalleMesa from './DetalleMesa';
import TomaPedido from './TomaPedido';
import AdminMesas from './AdminMesas';
import Encabezado from './Encabezado';
import RielComandas from './RielComandas';
import { comandasActivas } from '../utils/tiempoComanda';

// Props (las entrega Sesion, después del login):
//   socket          {object}   - Conexión en tiempo real: Socket.IO en modo local o Supabase
//                                Realtime en modo nube, ambas con interfaz de socket (on, off, emit)
//   usuario         {string}   - Nombre del usuario con sesión, para el encabezado
//   onCerrarSesion  {Function} - Botón "Cerrar sesión" del encabezado
//   onSesionVencida {Function} - El servidor rechazó el token del socket: volver al login
function App({ socket, usuario, onCerrarSesion, onSesionVencida }) {
  const [conectado, setConectado] = useState(false);
  // Rechazo del último cambio de estado del pedido (validación del frontend o del backend)
  const [errorValidacion, setErrorValidacion] = useState('');

  // NUEVO: Estado para el estado de las mesas en tiempo real
  const [mesas, setMesas] = useState([]);

  // Hora actual en ms, para los temporizadores del riel de comandas
  const [ahora, setAhora] = useState(() => Date.now());

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
    // Token vencido o inválido: el servidor no acepta el socket. Sin esto, la pantalla
    // quedaría en "Servidor Desconectado" sin explicar que hay que volver a entrar.
    socket.on('connect_error', (error) => {
      if (error?.message === SOCKET_NO_AUTORIZADO && onSesionVencida) onSesionVencida();
    });

    // Escuchar cuando la cocina o el backend actualizan un pedido
    socket.on('cambio_estado_pedido', (datos) => {
      // datos esperados: { mesa: 'Mesa 5', estado: 'En Cocina 🍳' }
      // El mapa y el riel de comandas muestran en qué va el pedido de cada mesa y desde
      // cuándo. El backend no reenvía 'estado_mesas' en cada cambio de estado del pedido,
      // así que se actualiza aquí: el cambio acaba de ocurrir, su tiempo parte en 00:00.
      const ahoraIso = new Date().toISOString();
      setMesas((prev) =>
        prev.map((m) =>
          m.id === datos.mesa ? { ...m, estadoPedido: datos.estado, pedidoDesde: ahoraIso } : m
        )
      );
      setAhora(Date.now());
      // La cuenta del panel abierto se vuelve a cargar con el pedido actualizado
      setVersionPedidos((v) => v + 1);
    });

    // NUEVO: escuchar el evento de estado de mesas que ya emite el backend
    // US-08 CA3: reflejar cambios en tiempo real también en la mesa seleccionada
    socket.on('estado_mesas', (datos) => {
      setMesas(datos);
      setAhora(Date.now()); // los tiempos de las comandas se calculan con la hora actual
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
      socket.off('connect_error');
      socket.off('cambio_estado_pedido');
      socket.off('estado_mesas');
      socket.off('pedido_items_actualizado');
      socket.off('respuesta_pedido');
      socket.off('respuesta_traslado');
    };
  }, [socket, onSesionVencida]);

  // US-08: carga inicial de mesas vía REST para no depender solo del socket
  useEffect(() => {
    obtenerMesas()
      .then((data) => {
        if (data.ok) {
          setMesas(data.mesas);
          setAhora(Date.now());
        }
      })
      .catch(() => {
        // Si falla el fetch inicial, el socket completará la carga al conectar
        console.warn('[US-08] No se pudo cargar las mesas por REST; se usará el socket.');
      });
  }, []);

  // Abre el panel de una mesa (desde el plano o desde su comanda en el riel)
  const abrirMesa = (m) => {
    setIdSeleccionada(m.id);
    // los avisos anteriores no pertenecen a esta mesa
    setErrorValidacion('');
    setMensajeTraslado('');
  };

  // Temporizadores de las comandas: un solo reloj para todas, que avanza cada segundo
  // mientras haya alguna comanda en curso (cada ticket calcula su tiempo con `ahora`).
  const hayComandas = comandasActivas(mesas).length > 0;
  useEffect(() => {
    if (!hayComandas) return undefined;
    const intervalo = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [hayComandas]);

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
        usuario={usuario}
        onCerrarSesion={onCerrarSesion}
        onConfigurarMesas={() => {
          setIdSeleccionada(null); // cierra el panel de la mesa, si estaba abierto
          setConfigurandoMesas(true);
        }}
      />

      {/* Riel de comandas: un ticket por cada pedido en curso, con su temporizador */}
      <RielComandas mesas={mesas} ahora={ahora} onSeleccionar={(m) => abrirMesa(m)} />

      <main style={estilos.contenido}>

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
            onSeleccionar={(m) => abrirMesa(m)}
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
