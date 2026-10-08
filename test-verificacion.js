import assert from 'node:assert';
import { io } from 'socket.io-client';
import { validarNumeroMesa } from './src/validaciones.js';

console.log('========================================================');
console.log(' EJECUTANDO PRUEBAS DE CONSTRUCCIÓN PARA LA VERIFICACIÓN');
console.log(' Operación: Validación del número de mesa (Frontend + Backend)');
console.log('========================================================\n');

// ----------------------------------------------------------------------
// PARTE 1: Pruebas unitarias de la función de frontera `validarNumeroMesa`
// ----------------------------------------------------------------------
console.log('--- 1. Pruebas Unitarias de Validación Defensiva ---');

// Caso Válido 1: Entrada 5 (número)
{
  const res = validarNumeroMesa(5);
  assert.strictEqual(res.esValido, true, 'El valor 5 debe ser válido');
  assert.strictEqual(res.numero, 5, 'El número retornado debe ser 5');
  assert.strictEqual(res.mensajeError, null, 'No debe haber mensaje de error');
  console.log('  ✔ Caso válido (5 numérico): superado');
}

// Caso Válido 2: Entrada "5" (string proveniente de input HTML)
{
  const res = validarNumeroMesa('5');
  assert.strictEqual(res.esValido, true, 'El string "5" debe ser válido');
  assert.strictEqual(res.numero, 5, 'El número parseado debe ser 5');
  assert.strictEqual(res.mensajeError, null, 'No debe haber mensaje de error');
  console.log('  ✔ Caso válido ("5" texto): superado');
}

// Caso Válido 3: Entrada "1" (límite inferior válido)
{
  const res = validarNumeroMesa('1');
  assert.strictEqual(res.esValido, true, 'El string "1" debe ser válido');
  assert.strictEqual(res.numero, 1, 'El número parseado debe ser 1');
  assert.strictEqual(res.mensajeError, null, 'No debe haber mensaje de error');
  console.log('  ✔ Caso válido ("1" límite inferior): superado');
}

// Caso Inválido 1: Entrada 0 / "0" (límite superior inválido)
{
  const res = validarNumeroMesa('0');
  assert.strictEqual(res.esValido, false, 'El string "0" debe ser inválido');
  assert.strictEqual(res.numero, null, 'El número debe ser null');
  assert.strictEqual(
    res.mensajeError,
    '⚠️ El número de mesa debe ser mayor a 0.',
    'Mensaje esperado para 0'
  );
  console.log('  ✔ Caso inválido 1 ("0"): rechazado defensivamente con mensaje explicativo');
}

// Caso Inválido 2: Entrada -1 / "-1" (número negativo)
{
  const res = validarNumeroMesa('-1');
  assert.strictEqual(res.esValido, false, 'El string "-1" debe ser inválido');
  assert.strictEqual(res.numero, null, 'El número debe ser null');
  assert.strictEqual(
    res.mensajeError,
    '⚠️ El número de mesa debe ser mayor a 0.',
    'Mensaje esperado para -1'
  );
  console.log('  ✔ Caso inválido 2 ("-1"): rechazado defensivamente con mensaje explicativo');
}

// Casos adicionales de robustez: -5, no numérico, decimal, vacío
{
  const resNeg = validarNumeroMesa('-5');
  assert.strictEqual(resNeg.esValido, false);
  assert.strictEqual(resNeg.mensajeError, '⚠️ El número de mesa debe ser mayor a 0.');

  const resAlfa = validarNumeroMesa('abc');
  assert.strictEqual(resAlfa.esValido, false);
  assert.strictEqual(resAlfa.mensajeError, '⚠️ El número de mesa debe ser un valor numérico.');

  const resDec = validarNumeroMesa('2.5');
  assert.strictEqual(resDec.esValido, false);
  assert.strictEqual(resDec.mensajeError, '⚠️ El número de mesa debe ser un número entero.');

  const resVacio = validarNumeroMesa('');
  assert.strictEqual(resVacio.esValido, false);
  assert.strictEqual(
    resVacio.mensajeError,
    '⚠️ Por favor, ingresa un número de mesa válido (mayor a 0).'
  );

  console.log('  ✔ Casos adicionales de robustez ("-5", "abc", "2.5", ""): superados');
}

// ----------------------------------------------------------------------
// PARTE 2: Simulación del flujo de estado del componente Frontend
// ----------------------------------------------------------------------
console.log('\n--- 2. Simulación de Estado y Eventos del Frontend ---');

{
  // Estado simulado del componente
  let estadoMesa = '';
  let estadoError = '';

  const simularManejarCambioMesa = (valor) => {
    // 1. Conservar siempre la entrada en el estado (evita borrado silencioso)
    estadoMesa = valor;

    if (valor.trim() === '') {
      estadoError = '';
      return;
    }

    const resultado = validarNumeroMesa(valor);
    if (!resultado.esValido) {
      estadoError = resultado.mensajeError;
    } else {
      estadoError = '';
    }
  };

  // Simular ingreso de "0":
  simularManejarCambioMesa('0');
  assert.strictEqual(estadoMesa, '0', 'El campo NO debe borrarse silenciosamente; debe conservar "0"');
  assert.strictEqual(estadoError, '⚠️ El número de mesa debe ser mayor a 0.');
  console.log('  ✔ Flujo de input con "0": campo retiene "0" y muestra error visible');

  // Simular ingreso de "-1":
  simularManejarCambioMesa('-1');
  assert.strictEqual(estadoMesa, '-1', 'El campo NO debe borrarse silenciosamente; debe conservar "-1"');
  assert.strictEqual(estadoError, '⚠️ El número de mesa debe ser mayor a 0.');
  console.log('  ✔ Flujo de input con "-1": campo retiene "-1" y muestra error visible');

  // Simular corrección a "5":
  simularManejarCambioMesa('5');
  assert.strictEqual(estadoMesa, '5');
  assert.strictEqual(estadoError, '', 'El error debe limpiarse con valor válido');
  console.log('  ✔ Flujo de corrección a "5": campo contiene "5" y error limpiado');
}

// ----------------------------------------------------------------------
// PARTE 3: Pruebas de integración en tiempo real con Socket.io (Backend)
// ----------------------------------------------------------------------
console.log('\n--- 3. Pruebas de Integración con el Servidor Backend (Socket.io) ---');

async function testBackendIntegration() {
  const socket = io('http://localhost:3000', {
    transports: ['websocket'],
    reconnection: false,
    autoConnect: false
  });

  let mesaPrueba = 'Mesa 8';
  socket.on('estado_mesas', (listaMesas) => {
    if (Array.isArray(listaMesas)) {
      const libre = listaMesas.find((m) => m.estado === 'libre');
      if (libre) {
        mesaPrueba = libre.id;
      }
    }
  });

  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
    socket.connect();
  });
  await new Promise((r) => setTimeout(r, 100));
  console.log('  ✔ Conectado exitosamente al servidor Socket.io en puerto 3000');

  // Test B1: Intento de actualizar pedido con mesa válida (ej. mesaPrueba)
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout esperando cambio_estado_pedido')), 3000);
    let cambioRecibido = false;
    let respuestaRecibida = false;

    const comprobar = () => {
      if (cambioRecibido && respuestaRecibida) {
        clearTimeout(timeout);
        console.log(`  ✔ Backend procesó y emitió pedido válido: ${mesaPrueba} -> Recibido 📝`);
        resolve();
      }
    };

    socket.once('cambio_estado_pedido', (datos) => {
      try {
        assert.strictEqual(datos.mesa, mesaPrueba);
        assert.strictEqual(datos.estado, 'Recibido 📝');
        cambioRecibido = true;
        comprobar();
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });

    socket.once('respuesta_pedido', (res) => {
      try {
        assert.strictEqual(res.ok, true);
        respuestaRecibida = true;
        comprobar();
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });

    socket.emit('actualizar_pedido', { mesa: mesaPrueba, estado: 'Recibido 📝' });
  });

  // Test B2: Intento de actualizar pedido con mesa inválida "Mesa 0" (debe ser rechazado por el backend)
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout esperando rechazo de Mesa 0')), 3000);

    // Si por error emitiera cambio_estado_pedido, la prueba debe fallar
    const listenerInvalido = () => {
      clearTimeout(timeout);
      reject(new Error('FALLO: El backend aceptó una mesa 0 como válida'));
    };
    socket.once('cambio_estado_pedido', listenerInvalido);

    socket.once('respuesta_pedido', (errData) => {
      clearTimeout(timeout);
      socket.off('cambio_estado_pedido', listenerInvalido);
      try {
        assert.strictEqual(errData.ok, false);
        assert.strictEqual(errData.tipo, 'ENTRADA_INVALIDA');
        console.log(`  ✔ Backend rechazó Mesa 0 y notificó respuesta_pedido: [${errData.tipo}] ${errData.error}`);
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    socket.emit('actualizar_pedido', { mesa: 'Mesa 0', estado: 'Recibido 📝' });
  });

  // Test B3: Intento de actualizar pedido con mesa inválida "Mesa -1" (debe ser rechazado por el backend)
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout esperando rechazo de Mesa -1')), 3000);

    const listenerInvalido = () => {
      clearTimeout(timeout);
      reject(new Error('FALLO: El backend aceptó una mesa -1 como válida'));
    };
    socket.once('cambio_estado_pedido', listenerInvalido);

    socket.once('respuesta_pedido', (errData) => {
      clearTimeout(timeout);
      socket.off('cambio_estado_pedido', listenerInvalido);
      try {
        assert.strictEqual(errData.ok, false);
        assert.strictEqual(errData.tipo, 'ENTRADA_INVALIDA');
        console.log(`  ✔ Backend rechazó Mesa -1 y notificó respuesta_pedido: [${errData.tipo}] ${errData.error}`);
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    socket.emit('actualizar_pedido', { mesa: 'Mesa -1', estado: 'Recibido 📝' });
  });

  socket.disconnect();
  console.log('\n========================================================');
  console.log(' TODAS LAS PRUEBAS DE VERIFICACIÓN PASARON EXITOSAMENTE ');
  console.log('========================================================\n');
}

testBackendIntegration().catch((err) => {
  console.error('❌ Error durante la verificación:', err);
  process.exit(1);
});
