import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// Conexión directa a tu servidor Backend (Puerto 3000)
const socket = io('http://localhost:3000');

function App() {
  const [conectado, setConectado] = useState(false);
  const [estadoTrafico, setEstadoTrafico] = useState('Normal');

  useEffect(() => {
    // Detectar cuando nos conectamos al backend
    socket.on('connect', () => {
      setConectado(true);
    });

    // Detectar cuando nos desconectamos
    socket.on('disconnect', () => {
      setConectado(false);
    });

    // Escuchar actualizaciones de congestión enviadas por el servidor
    socket.on('cambio_congestion', (datos) => {
      setEstadoTrafico(datos.nivel);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('cambio_congestion');
    };
  }, []);

  // Función para simular el envío de un reporte de congestión vial
  const reportarCongestion = (nivel) => {
    socket.emit('actualizar_congestion', { nivel });
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
      <h1>🚦 Monitor de Congestión Vehicular</h1>
      
      <div style={{ margin: '20px 0' }}>
        <span>Estado del Servidor: </span>
        <strong style={{ color: conectado ? 'green' : 'red' }}>
          {conectado ? 'Conectado ✔' : 'Desconectado ✖'}
        </strong>
      </div>

      <div style={{ 
        padding: '20px', 
        background: '#f0f0f0', 
        borderRadius: '8px', 
        fontSize: '24px', 
        margin: '20px auto', 
        maxWidth: '300px' 
      }}>
        Tráfico Actual: <strong>{estadoTrafico}</strong>
      </div>

      <h3>Simular Reporte Vial:</h3>
      <button onClick={() => reportarCongestion('Alto 🔴')} style={{ margin: '5px', padding: '10px' }}>Tráfico Alto</button>
      <button onClick={() => reportarCongestion('Medio 🟡')} style={{ margin: '5px', padding: '10px' }}>Tráfico Medio</button>
      <button onClick={() => reportarCongestion('Bajo 🟢')} style={{ margin: '5px', padding: '10px' }}>Tráfico Bajo</button>
    </div>
  );
}

export default App;
