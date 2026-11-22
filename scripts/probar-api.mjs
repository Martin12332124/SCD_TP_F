// scripts/probar-api.mjs
// Uso del componente reutilizable src/servicios/api.js desde otro archivo del proyecto.
// Requiere el backend encendido (en SCD_TP_B: npm start) y un usuario del backend.
// Variables de entorno: VITE_API_KEY (una de las API_KEYS del .env del backend), PROBAR_USUARIO y
// PROBAR_CONTRASENA. Con Node a secas la URL del backend es siempre http://localhost:3000.
// Ejecutar desde la carpeta SCD_TP_F con:
//   VITE_API_KEY=<llave> PROBAR_USUARIO=<usuario> PROBAR_CONTRASENA=<contraseña> node scripts/probar-api.mjs
import { iniciarSesion, obtenerMesas, obtenerMenu, cerrarMesa } from '../src/servicios/api.js';

const sesion = await iniciarSesion(process.env.PROBAR_USUARIO, process.env.PROBAR_CONTRASENA);
if (!sesion.ok) {
  console.error('No se pudo iniciar sesión:', sesion.error);
  process.exit(1);
}
console.log('Sesión iniciada como', sesion.usuario);

const { mesas } = await obtenerMesas();
console.log('Mesas cargadas:', mesas.length);

const { items } = await obtenerMenu();
console.log('Productos en la carta:', items.map((i) => i.nombre).join(', '));

const respuesta = await cerrarMesa(1);
console.log('Cerrar mesa 1 (libre):', respuesta.ok, respuesta.tipo);
