// scripts/probar-api.mjs
// Uso del componente reutilizable src/servicios/api.js desde otro archivo del proyecto.
// Requiere el backend encendido (en SCD_TP_B: npm start).
// Ejecutar desde la carpeta SCD_TP_F con: node scripts/probar-api.mjs
import { obtenerMesas, obtenerMenu, cerrarMesa } from '../src/servicios/api.js';

const { mesas } = await obtenerMesas();
console.log('Mesas cargadas:', mesas.length);

const { items } = await obtenerMenu();
console.log('Productos en la carta:', items.map((i) => i.nombre).join(', '));

const respuesta = await cerrarMesa(1);
console.log('Cerrar mesa 1 (libre):', respuesta.ok, respuesta.tipo);
