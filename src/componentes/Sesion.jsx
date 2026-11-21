// src/componentes/Sesion.jsx
// Raíz de la interfaz: muestra el login o la app según haya sesión.
//
// También es dueña de la conexión en tiempo real (Socket.IO o Supabase Realtime):
// la abre recién después de iniciar sesión (el servidor rechaza sockets sin token) y la
// cierra al salir, para que la siguiente sesión parta con una conexión nueva.
// La conexión se crea en callbacks (al entrar o al recuperar la sesión guardada), no
// durante el render: así no quedan conexiones repetidas.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  iniciarSesion,
  obtenerSesion,
  cerrarSesion,
  alPerderSesion,
  conectarTiempoReal
} from '../servicios/api';
import Login from './Login';
import App from './App';

const AVISO_VENCIDA = 'Tu sesión terminó. Vuelve a iniciar sesión.';

function Sesion() {
  // cargando: todavía se está revisando si hay una sesión guardada
  const [estado, setEstado] = useState({
    cargando: true,
    usuario: null,
    conexion: null,
    aviso: ''
  });
  const conexionActual = useRef(null);

  const abrir = useCallback((usuario) => {
    const conexion = conectarTiempoReal();
    conexionActual.current = conexion;
    setEstado({ cargando: false, usuario, conexion, aviso: '' });
  }, []);

  const terminar = useCallback((aviso) => {
    if (conexionActual.current) conexionActual.current.disconnect();
    conexionActual.current = null;
    setEstado({ cargando: false, usuario: null, conexion: null, aviso });
  }, []);

  // Al abrir la página: ¿quedó una sesión de la visita anterior?
  useEffect(() => {
    let vigente = true;
    obtenerSesion()
      .then((sesion) => {
        if (!vigente) return;
        if (sesion) abrir(sesion.usuario);
        else setEstado((e) => ({ ...e, cargando: false }));
      })
      .catch(() => {
        if (vigente) setEstado((e) => ({ ...e, cargando: false }));
      });
    return () => {
      vigente = false;
    };
  }, [abrir]);

  // Un 401 de la API o la sesión de Supabase perdida → de vuelta al login.
  const sesionVencida = useCallback(() => terminar(AVISO_VENCIDA), [terminar]);
  useEffect(() => alPerderSesion(sesionVencida), [sesionVencida]);

  // Al desmontar (solo en tests o recarga) se cierra la conexión abierta.
  useEffect(
    () => () => {
      if (conexionActual.current) conexionActual.current.disconnect();
    },
    []
  );

  const entrar = async (usuario, contrasena) => {
    const r = await iniciarSesion(usuario, contrasena);
    if (r.ok) abrir(r.usuario);
    return r;
  };

  const salir = async () => {
    await cerrarSesion();
    terminar('');
  };

  if (estado.cargando) return null;
  if (!estado.usuario) return <Login onEntrar={entrar} aviso={estado.aviso} />;
  return (
    <App
      socket={estado.conexion}
      usuario={estado.usuario}
      onCerrarSesion={salir}
      onSesionVencida={sesionVencida}
    />
  );
}

export default Sesion;
