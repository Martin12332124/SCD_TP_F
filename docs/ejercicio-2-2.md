# Ejercicio 2.2 — Contratos, Aserciones, Programación Defensiva y Dependencias Explícitas

## Ficha de operación 1

| Elemento | Registro del equipo |
|---|---|
| **Funcionalidad y operación** | **Funcionalidad o necesidad:** Actualización de pedidos en la cocina (US-06): el mesero o el cocinero cambia el estado del pedido de una mesa. |
| | **Clase, módulo y firma o ruta:** `SCD_TP_B · src/dominio/pedido.service.js` → `PedidoService.actualizarEstado({ mesa, estado })`; evento Socket.io `"actualizar_pedido"` (`src/app.js`). Cliente: `actualizarPedido()` en `SCD_TP_F/src/App.jsx`. |
| **Propósito** | **Resultado observable que obtiene quien usa esta operación:** Cambia el estado de una mesa (Recibido → En Cocina → Listo) y todas las pantallas conectadas lo ven al instante; si el cambio no es válido, recibe un mensaje que dice qué se esperaba. |
| **Precondiciones** | 1. `datos` es un objeto con `mesa` de formato `"Mesa N"` (N entero positivo) y `estado` igual a `Recibido 📝`, `En Cocina 🍳` o `Listo 🍽️`. |
| | 2. La mesa N existe y la transición es válida desde el estado actual del pedido de esa mesa: sin pedido → Recibido → En Cocina → Listo → (nuevo) Recibido. |
| **Postcondiciones** | 1. El pedido de esa mesa queda en el estado pedido; si es Recibido, la mesa queda "ocupada". Si es Listo, el pedido vigente se elimina y la mesa queda "libre". |
| | 2. Todos los clientes reciben una vez `"cambio_estado_pedido"` `{ mesa, estado }` (y `"estado_mesas"` si se ocupó o liberó una mesa); quien llamó recibe `{ ok: true, mesa, estado }`. |
| **Invariante** | **Regla que debe seguir siendo verdadera después de la operación:** Una mesa ocupada tiene exactamente un pedido vigente y todo pedido vigente está sobre una mesa ocupada (`verificarConsistenciaMesasPedidos`, `src/dominio/consistencia.js`). |
| **Validación defensiva** | **Entrada inválida 1:** `{ mesa: "Mesa ", estado: "Recibido 📝" }` → **Respuesta:** `ENTRADA_INVALIDA` — `"mesa no tiene un formato válido"`, esperado: `"Mesa N"` con N entero positivo. |
| | **Entrada inválida 2:** `{ mesa: "Mesa 3", estado: "Listo 🍽️" }` con la mesa en Recibido → **Respuesta:** `ESTADO_NO_PERMITIDO` — `"Transición no permitida: Recibido → Listo"`, esperado: `En Cocina 🍳`. |
| | **Extra:** `{ mesa: 5 }` (número) → `ENTRADA_INVALIDA`; antes lanzaba `TypeError` y tumbaba el servidor. |
| **Dependencia explícita** | **Colaborador y forma en que se inyecta (constructor, parámetro o interfaz):** `pedidos` y `mesas` (repositorios) y `notificador` (Gateway de Tiempo Real), por constructor: `new PedidoService({ pedidos, mesas, notificador })`. En producción: repositorios en memoria y `SocketNotificador`. Para verificar: `NotificadorEspia` (guarda los eventos), `PedidosQueFallan` o `NotificadorCaido` (`test/doubles.js`). |
| **Evidencia de ejecución** | **Caso válido y dos inválidos ejecutados.** Archivo, comando o pantalla: SCD_TP_B: `npm run evidencia` (salida guardada en `docs/evidencia-ejercicio-2-2.txt`) y `npm test` (`test/pedido.service.test.js`, `test/integracion.test.js`; **27 pruebas correctas**). |

---

## Ficha de operación 2

| Elemento | Registro del equipo |
|---|---|
| **Funcionalidad y operación** | **Funcionalidad o necesidad:** Ingreso, validación defensiva y control del número de mesa en el Panel de Control del Mozo / Cocina (captura interactiva en frontend y segunda barrera en backend).<br>**Módulos y firmas:**<br>• Frontend (Validador frontera): `SCD_TP_F · src/validaciones.js` → `validarNumeroMesa(valor: string \| number): { esValido: boolean, numero: number \| null, mensajeError: string \| null }`<br>• Frontend (Manejador de evento): `SCD_TP_F · src/App.jsx` → `manejarCambioMesa(valor: string): void`<br>• Frontend (Despacho seguro): `SCD_TP_F · src/App.jsx` → `actualizarPedido(nuevoEstado: string): void`<br>• Backend (Segunda barrera defensiva): `SCD_TP_B · src/dominio/pedido.service.js` → `PedidoService.actualizarEstado(datos)` |
| **Propósito** | **Resultado observable que obtiene quien usa esta operación:** Al escribir en el campo de número de mesa, el usuario observa el valor ingresado sin que el cuadro se borre silenciosamente. Si introduce un valor menor o igual a 0 (ej. `0` o `-1`), el sistema rechaza la entrada de forma controlada mostrando inmediatamente un mensaje de error visible (`⚠️ El número de mesa debe ser mayor a 0.`) y bloquea cualquier intento de enviar el pedido al backend. |
| **Precondiciones** | 1. El componente `App` se encuentra montado y el campo de entrada `Número de Mesa` (`#input-mesa`) está disponible para interactuar.<br>2. La función de validación defensiva recibe una entrada externa `valor` (string o number) suministrada mediante el evento `onChange` del input o desde el estado del componente antes del despacho. |
| **Postcondiciones** | 1. **Caso válido:** Si `valor` es un entero estrictamente mayor a 0 (ej. `5` o `1`), el estado `mesa` almacena el valor ingresado, el mensaje de error `errorValidacion` se limpia (`""`) y el botón de actualización queda habilitado para emitir el pedido al backend vía Socket.io con el formato `'Mesa ' + numero`.<br>2. **Caso inválido:** Si `valor` es menor o igual a 0 (ej. `0` o `-1`) o no es un entero positivo, el estado `mesa` retiene la entrada tipiada (el campo NO se borra silenciosamente), el estado `errorValidacion` despliega el mensaje explicativo (`⚠️ El número de mesa debe ser mayor a 0.`), y `actualizarPedido` bloquea estrictamente la emisión hacia el backend. |
| **Invariante** | **Regla del sistema:** *El sistema nunca procesa, comunica ni registra como válido ningún pedido cuyo número de mesa sea menor o igual a 0 (`mesa > 0` siempre).*<br>Se garantiza en la frontera mediante validación defensiva y se comprueba internamente con aserto (`console.assert(Number.isInteger(num) && num > 0, 'Invariante violada: el número de mesa validado debe ser un entero positivo');`). |
| **Validación defensiva** | • **Entrada inválida 1:** `0` (o `"0"`) → **Respuesta:** `esValido: false`, el input conserva `"0"`, la interfaz despliega en el banner de alerta: `⚠️ El número de mesa debe ser mayor a 0.` y no se emite ninguna actualización al backend.<br>• **Entrada inválida 2:** `-1` (o `"-1"`) → **Respuesta:** `esValido: false`, el input conserva `"-1"`, la interfaz despliega en el banner de alerta: `⚠️ El número de mesa debe ser mayor a 0.` y no se emite ninguna actualización al backend.<br>• **Entradas adicionales:** `"-5"` (menor a 0), `"abc"` (no numérico), `"2.5"` (no entero), `""` (vacío al enviar) → Rechazados defensivamente con mensajes descriptivos acordes a la regla infringida. |
| **Dependencia explícita** | **Colaborador y forma en que se inyecta:**<br>• En el frontend: `validarNumeroMesa` se inyecta como módulo colaborativo importado en `src/App.jsx`, separando la regla de negocio del componente visual. A nivel de comunicación, `actualizarPedido` colabora con la instancia del cliente Socket.io (`socket`), la cual escucha `respuesta_pedido`.<br>• En el backend: La conexión del cliente se inyecta por parámetro `(socket)` en el callback de conexión en `src/app.js`, delegando la validación defensiva a `PedidoService` inyectado por constructor. |
| **Evidencia de ejecución** | **Caso válido y dos inválidos ejecutados.** Archivo, comando o pantalla: `SCD_TP_F`: `npm test` (`test-verificacion.js`, unitario + simulación de estado frontend + integración en tiempo real con Socket.io contra `PedidoService`). Ver sección [Evidencia de Ejecución Operación 2](#3-salida-de-npm-test-en-scd_tp_f-operación-2-validación-número-de-mesa). |

---

## Ficha de operación 3

> ⚠️ **Pendiente** — A completar por otro compañero del equipo.

| Elemento | Registro del equipo |
|---|---|
| **Funcionalidad y operación** | Funcionalidad o necesidad: _____ |
| | Clase, módulo y firma o ruta: _____ |
| **Propósito** | Resultado observable que obtiene quien usa esta operación: _____ |
| **Precondiciones** | 1. _____ |
| | 2. _____ |
| **Postcondiciones** | 1. _____ |
| | 2. _____ |
| **Invariante** | Regla que debe seguir siendo verdadera después de la operación: _____ |
| **Validación defensiva** | Entrada inválida 1: _____ → Respuesta: _____ |
| | Entrada inválida 2: _____ → Respuesta: _____ |
| **Dependencia explícita** | Colaborador y forma en que se inyecta: _____ |
| **Evidencia de ejecución** | Caso válido y dos inválidos ejecutados: _____ |

---

## Registro de Evidencia de Ejecución

### 1. Salida de `npm run evidencia` en `SCD_TP_B` (Operaciones 1 y 2)

Archivo generado automáticamente: `docs/evidencia-ejercicio-2-2.txt`

```text
===============================================================
  EVIDENCIA - Ejercicio 2.2: Operacion 1 (actualizarEstado)
  PedidoService con dependencias explicitas
===============================================================

--- CASO VALIDO: Ciclo completo Mesa 3 ---
1. Recibido 📝:
   Resultado: {"ok":true,"mesa":"Mesa 3","estado":"Recibido 📝"}
   Mesa 3 estado: ocupada
2. En Cocina 🍳:
   Resultado: {"ok":true,"mesa":"Mesa 3","estado":"En Cocina 🍳"}
3. Listo 🍽️:
   Resultado: {"ok":true,"mesa":"Mesa 3","estado":"Listo 🍽️"}
   Mesa 3 estado: libre
   Pedido vigente: null
   Eventos emitidos: 5

--- CASO INVALIDO 1: mesa con formato incorrecto ---
   Entrada: { mesa: "Mesa ", estado: "Recibido 📝" }
   Resultado: {"ok":false,"tipo":"ENTRADA_INVALIDA","error":"mesa no tiene un formato válido","esperado":"\"Mesa N\" con N entero positivo."}

--- CASO INVALIDO 2: transicion no permitida ---
   Entrada: { mesa: "Mesa 3", estado: "Listo 🍽️" } con mesa en Recibido
   Resultado: {"ok":false,"tipo":"ESTADO_NO_PERMITIDO","error":"Transición no permitida: Recibido 📝 → Listo 🍽️","esperado":"En Cocina 🍳"}

--- CASO EXTRA: mesa como numero (no tumba el servidor) ---
   Entrada: { mesa: 5 }
   Resultado: {"ok":false,"tipo":"ENTRADA_INVALIDA","error":"mesa no tiene un formato válido","esperado":"\"Mesa N\" con N entero positivo."}

===============================================================
  EVIDENCIA - Ejercicio 2.2: Operacion 2 (validacion mesa)
  Segunda barrera defensiva en PedidoService
===============================================================

--- CASO VALIDO: Mesa 5 (positivo) ---
   Entrada: { mesa: "Mesa 5", estado: "Recibido 📝" }
   Resultado: {"ok":true,"mesa":"Mesa 5","estado":"Recibido 📝"}
   Mesa 5 estado: ocupada

--- CASO INVALIDO 1: Mesa 0 (menor o igual a 0) ---
   Entrada: { mesa: "Mesa 0", estado: "Recibido 📝" }
   Resultado: {"ok":false,"tipo":"ENTRADA_INVALIDA","error":"mesa no tiene un formato válido","esperado":"\"Mesa N\" con N entero positivo."}

--- CASO INVALIDO 2: Mesa -1 (negativo) ---
   Entrada: { mesa: "Mesa -1", estado: "Recibido 📝" }
   Resultado: {"ok":false,"tipo":"ENTRADA_INVALIDA","error":"mesa no tiene un formato válido","esperado":"\"Mesa N\" con N entero positivo."}

===============================================================
  Todos los casos ejecutados sin errores no controlados.
===============================================================
```

### 2. Salida de `npm test` en `SCD_TP_B` (Suites backend: Operación 1 + Operación 2)

```text
PASS test/integracion.test.js
  Integración: flujo completo de pedido
    √ ciclo completo: Recibido → En Cocina → Listo para una mesa (12 ms)
    √ múltiples mesas funcionan de forma independiente (3 ms)
    √ después de Listo se puede iniciar un nuevo pedido en la misma mesa (1 ms)
    √ caso inválido extra: mesa como número no tumba el servidor (3 ms)

PASS test/pedido.service.test.js
  PedidoService.actualizarEstado – validación de entrada
    √ rechaza datos nulos (12 ms)
    √ rechaza datos undefined (3 ms)
    √ rechaza mesa vacía: { mesa: "Mesa ", estado: "Recibido 📝" } (2 ms)
    √ rechaza mesa numérica (no string): { mesa: 5 } (2 ms)
    √ rechaza mesa con formato "Mesa 0" (no positivo) (4 ms)
    √ rechaza mesa con letras: "Mesa ABC" (1 ms)
    √ rechaza estado no válido: "Cancelado" (2 ms)
    √ rechaza estado vacío (1 ms)
  PedidoService.actualizarEstado – transiciones de estado
    √ permite: sin pedido → Recibido 📝 (3 ms)
    √ permite: Recibido 📝 → En Cocina 🍳 (3 ms)
    √ permite: En Cocina 🍳 → Listo 🍽️ (3 ms)
    √ permite ciclo completo: Listo → nuevo Recibido (1 ms)
    √ rechaza transición inválida: Recibido → Listo (saltarse cocina) (1 ms)
    √ rechaza transición inválida: sin pedido → En Cocina (1 ms)
    √ rechaza transición inválida: sin pedido → Listo (1 ms)
  PedidoService.actualizarEstado – postcondiciones
    √ al marcar Recibido, la mesa queda ocupada (1 ms)
    √ al marcar Listo, la mesa queda libre y sin pedido (1 ms)
    √ emite "cambio_estado_pedido" al actualizar (1 ms)
    √ emite "estado_mesas" cuando se ocupa o libera una mesa (1 ms)
    √ NO emite nada si la entrada es inválida (2 ms)
  PedidoService – dependencia no disponible
    √ propaga error si el repositorio de pedidos falla al guardar (35 ms)
    √ propaga error si el notificador está caído (4 ms)
    √ lanza error si se construye sin dependencias (4 ms)

PASS test/operacion-2.test.js
  Operación 2 (Ficha 2) – Segunda barrera defensiva de número de mesa (PedidoService)
    Validación defensiva (Casos inválidos de Ficha 2)
      √ Entrada inválida 1: rechaza mesa 0 ("Mesa 0") (9 ms)
      √ Entrada inválida 2: rechaza mesa negativa ("Mesa -1") (1 ms)
      √ Entrada inválida adicional: rechaza mesa no numérica ("Mesa abc") (2 ms)
      √ Entrada inválida adicional: rechaza mesa como número directo sin prefijo ({ mesa: 0 }) (1 ms)
    Postcondiciones (Casos válidos de Ficha 2)
      √ Caso válido: procesa correctamente "Mesa 5" (1 ms)
      √ Caso válido: procesa correctamente límite inferior "Mesa 1" (1 ms)

Test Suites: 3 passed, 3 total
Tests:       33 passed, 33 total
Snapshots:   0 total
Time:        2.19 s
Ran all test suites.
```

### 3. Salida de `npm test` en `SCD_TP_F` (Operación 2 - Validación número de mesa)

```text
> scd-tp-b@0.0.0 test
> node test-verificacion.js

========================================================
 EJECUTANDO PRUEBAS DE CONSTRUCCIÓN PARA LA VERIFICACIÓN
 Operación: Validación del número de mesa (Frontend + Backend)
========================================================

--- 1. Pruebas Unitarias de Validación Defensiva ---
  ✔ Caso válido (5 numérico): superado
  ✔ Caso válido ("5" texto): superado
  ✔ Caso válido ("1" límite inferior): superado
  ✔ Caso inválido 1 ("0"): rechazado defensivamente con mensaje explicativo
  ✔ Caso inválido 2 ("-1"): rechazado defensivamente con mensaje explicativo
  ✔ Casos adicionales de robustez ("-5", "abc", "2.5", ""): superados

--- 2. Simulación de Estado y Eventos del Frontend ---
  ✔ Flujo de input con "0": campo retiene "0" y muestra error visible
  ✔ Flujo de input con "-1": campo retiene "-1" y muestra error visible
  ✔ Flujo de corrección a "5": campo contiene "5" y error limpiado

--- 3. Pruebas de Integración con el Servidor Backend (Socket.io) ---
  ✔ Conectado exitosamente al servidor Socket.io en puerto 3000
  ✔ Backend procesó y emitió pedido válido: Mesa 8 -> Recibido 📝
  ✔ Backend rechazó Mesa 0 y notificó respuesta_pedido: [ENTRADA_INVALIDA] mesa no tiene un formato válido
  ✔ Backend rechazó Mesa -1 y notificó respuesta_pedido: [ENTRADA_INVALIDA] mesa no tiene un formato válido

========================================================
 TODAS LAS PRUEBAS DE VERIFICACIÓN PASARON EXITOSAMENTE 
========================================================
```

---

## Identificación de la dependencia explícita

La dependencia hecha explícita en el sistema comprende dos dimensiones:
- **Operación 1 (Backend - Notificador y Repositorios):**
  - Se inyectan `pedidos`, `mesas` y `notificador` por constructor en `PedidoService`.
  - Permite sustituir `SocketNotificador` por dobles de prueba (`NotificadorEspia`, `NotificadorCaido`).
- **Operación 2 (Frontend - Validador Modular y Socket):**
  - Se desacopla la validación defensiva en el módulo colaborativo `src/validaciones.js` (`validarNumeroMesa`), inyectado en `App.jsx`.
  - La comunicación bidireccional utiliza el colaborador `socket` de Socket.io, recibiendo las respuestas estructuradas emitidas por el backend.

---

## Estructura del Proyecto

### Backend (`SCD_TP_B`)

```text
SCD_TP_B/
├── index.js                          # Punto de arranque del servidor
├── package.json                      # Scripts: start, test, evidencia, format
├── src/
│   ├── app.js                        # Factory de la app e inyección de dependencias
│   ├── dominio/
│   │   ├── pedido.service.js         # Lógica central con contrato y validación defensiva
│   │   └── consistencia.js           # Verificación de invariante mesa <-> pedido
│   └── infraestructura/
│       ├── repositorios.js           # PedidosEnMemoria, MesasEnMemoria
│       └── notificador.js            # SocketNotificador (adaptador Socket.io)
├── test/
│   ├── doubles.js                    # NotificadorEspia, PedidosQueFallan, NotificadorCaido
│   ├── pedido.service.test.js        # 23 tests unitarios (Operación 1)
│   ├── integracion.test.js           # 4 tests de integración
│   └── operacion-2.test.js           # 6 tests unitarios y de contrato (Operación 2)
├── scripts/
│   └── evidencia.js                  # Script de ejecución para evidencia (Operación 1 y 2)
└── docs/
    ├── ejercicio-2-2.md              # Documento oficial con fichas y evidencias
    └── evidencia-ejercicio-2-2.txt   # Registro de consola generado
```

### Frontend (`SCD_TP_F`)

```text
SCD_TP_F/
├── package.json                      # Script test: node test-verificacion.js
├── test-verificacion.js              # Suite de pruebas automatizadas (unitarias + integración)
├── docs/
│   └── ejercicio-2-2.md              # Documentación oficial con Fichas 1 y 2
└── src/
    ├── validaciones.js               # Validador defensivo de número de mesa (Operación 2)
    └── App.jsx                       # Interfaz POS/KDS con captura controlada y escucha de respuesta_pedido
```
