import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// Conexión directa al servidor Backend (Puerto 3000)
const socket = io('http://localhost:3000');

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

  useEffect(() => {
    socket.on('connect', () => setConectado(true));
    socket.on('disconnect', () => setConectado(false));

    // Escuchar cuando la cocina o el backend actualizan un pedido
    socket.on('cambio_estado_pedido', (datos) => {
      // datos esperados: { mesa: 'Mesa 5', estado: 'En Cocina 🍳' }
      setUltimoPedido({ mesa: datos.mesa, estado: datos.estado });
      setSegundos(0); // NUEVO: Resetea el reloj a 0 con cada cambio de estado
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('cambio_estado_pedido');
    };
  }, []);

  // NUEVO: useEffect encargado de controlar el avance del tiempo y el límite de desbordamiento
  useEffect(() => {
    // El tiempo solo corre si el pedido no está "Listo" ni "Sin Pedidos"
    const pedidoActivo = ultimoPedido.estado !== 'Sin Pedidos' && ultimoPedido.estado !== 'Listo 🍽️';
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

  // NUEVO: Función auxiliar para dar formato visual MM:SS de forma compacta
  const formatearTiempo = (totSegundos) => {
    const minutos = Math.floor(totSegundos / 60);
    const segundosRestantes = totSegundos % 60;
    return `${minutos.toString().padStart(2, '0')}:${segundosRestantes.toString().padStart(2, '0')}`;
  };

  // Función para manejar el cambio en el input de la mesa de forma controlada
  const manejarCambioMesa = (valor) => {
    // Si el usuario borra el input, permitimos el string vacío
    if (valor === '') {
      setMesa('');
      return;
    }

    // Convertir a número entero
    const numero = parseInt(valor, 10);

    // Solo actualiza el estado si es un número válido mayor estricto que 0
    if (!isNaN(numero) && numero > 0) {
      setMesa(numero.toString());
    }
  };

  // Función para simular el envío o actualización de un pedido
  const actualizarPedido = (nuevoEstado) => {
    setErrorValidacion(''); // Limpiar errores previos

    // 1. VALIDACIÓN: Verificar que se haya ingresado una mesa válida
    if (!mesa || mesa.trim() === '' || parseInt(mesa, 10) <= 0) {
      setErrorValidacion('⚠️ Por favor, ingresa un número de mesa válido (mayor a 0) antes de enviar.');
      return; // Frena el envío por socket
    }

    // 2. VALIDACIÓN: Lista estricta de estados permitidos en el restaurante
    const ESTADOS_PERMITIDOS = ['Recibido 📝', 'En Cocina 🍳', 'Listo 🍽️'];
    if (!ESTADOS_PERMITIDOS.includes(nuevoEstado)) {
      setErrorValidacion('⚠️ Estado de pedido no reconocido.');
      return; // Frena el envío por socket
    }

    // 3. Envío seguro al backend si pasa las validaciones
    console.log(`Enviando actualización válida para Mesa ${mesa}: ${nuevoEstado}`);
    socket.emit('actualizar_pedido', { mesa: `Mesa ${mesa}`, estado: nuevoEstado });
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
      <h1>🍔 Monitor de Pedidos en Tiempo Real</h1>

      <div style={{ margin: '20px 0' }}>
        <span>Control de Conexión: </span>
        <strong style={{ color: conectado ? 'green' : 'red' }}>
          {conectado ? 'Sistema Conectado ✔' : 'Servidor Desconectado ✖'}
        </strong>
      </div>

      {/* Pantalla central que muestra el último movimiento con el contador compacto integrado */}
      <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd', margin: '20px 0' }}>
        <p style={{ margin: '5px 0', color: '#666' }}>Última Actualización:</p>
        <div style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
          <span>{ultimoPedido.mesa} ➡️ <span style={{ color: '#007bff' }}>{ultimoPedido.estado}</span></span>
          
          {/* Visualización del contador compacto */}
          {ultimoPedido.estado !== 'Sin Pedidos' && (
            <span style={{ 
              fontSize: '13px', 
              padding: '2px 6px', 
              borderRadius: '12px', 
              background: segundos > 900 ? '#ffe6e6' : '#e6f7ff', 
              color: segundos > 900 ? 'red' : '#007bff',
              fontFamily: 'monospace',
              border: `1px solid ${segundos > 900 ? 'red' : '#007bff'}`
            }}>
              ⏱️ {formatearTiempo(segundos)}
            </span>
          )}
        </div>
      </div>

      {/* Alerta de validación del Frontend */}
      {errorValidacion && (
        <div style={{ color: 'red', fontWeight: 'bold', marginBottom: '15px', backgroundColor: '#ffe6e6', padding: '10px', borderRadius: '5px' }}>
          {errorValidacion}
        </div>
      )}

      {/* Formulario de Simulación */}
      <div style={{ backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '8px' }}>
        <h3>Panel de Control del Mozo / Cocina</h3>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Número de Mesa:</label>
          <input 
            type="number" 
            min="1"
            step="1"
            placeholder="Ej: 5" 
            value={mesa} 
            onChange={(e) => manejarCambioMesa(e.target.value)} 
            disabled={!conectado} 
            style={{ padding: '8px', width: '80px', textAlign: 'center', fontSize: '16px' }} 
          />
        </div>

        <p style={{ marginBottom: '5px', fontWeight: 'bold' }}>Cambiar Estado a:</p>
        {/* Los botones se deshabilitan automáticamente si el servidor cae */}
        <button disabled={!conectado} onClick={() => actualizarPedido('Recibido 📝')} style={btnStyle}>Tomar Pedido 📝</button>
        <button disabled={!conectado} onClick={() => actualizarPedido('En Cocina 🍳')} style={btnStyle}>Empezar Cocina 🍳</button>
        <button disabled={!conectado} onClick={() => actualizarPedido('Listo 🍽️')} style={btnStyle}>Pedido Listo 🍽️</button>
      </div>
    </div>
  );
}

// Estilo simple para los botones
const btnStyle = { margin: '5px', padding: '10px 15px', fontSize: '14px', cursor: 'pointer' };

export default App;