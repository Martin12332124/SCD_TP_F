# Guía Unidad 3 — Refactorización, modularización y reutilización

Taller de Programación Avanzada ISF224 · Proyecto POS + KDS

> **Estado:** terminado. Las tres intervenciones, la modularización, el uso del componente reutilizable y la revisión de la dependencia están en `dev` (frontend: PR #80, #81, #82 y #83 · backend: PR #47). La prueba "después" da el mismo resultado que la prueba "antes".

Repositorios: [SCD_TP_F (frontend)](https://github.com/Martin12332124/SCD_TP_F) · [SCD_TP_B (backend)](https://github.com/Martin12332124/SCD_TP_B)

---

## 0. Punto de partida (línea base, antes de editar)

| Repo | Base | Tests antes de editar | Cobertura (sentencias / ramas) | Comando |
|---|---|---|---|---|
| SCD_TP_F | `dev`, commit `5dbfac8` | 135/135 OK | 97,5 % / 94,23 % | `npm run test:ci` |
| SCD_TP_B | `dev`, commit `ca85a15` | 141/141 OK | 93,5 % / 83,44 % | `npm run test:ci` |

**Operación revisada por un integrante distinto del autor:** *confirmar pedido* (abrir mesa → tomar pedido → confirmar → ver cuenta → intentar liberar).

| Paso | Esperado | Observado (antes) | Evidencia |
|---|---|---|---|
| Carrito con Pizza Margarita ×2 y Coca-Cola ×1 | Total $19.000 | Pizza $17.000 + Coca-Cola $2.000 = **$19.000** | [antes-1](evidencias/antes-1.jpg) |
| Cuenta de la mesa tras confirmar | Total acumulado $19.000 | Estado "En Cocina 🍳", total acumulado **$19.000** | [antes-2](evidencias/antes-2.jpg) |
| Liberar mesa con pedido activo | Error `PEDIDO_ACTIVO` | `[PEDIDO_ACTIVO] La mesa 3 tiene un pedido activo (estado: "En Cocina 🍳"). Debe servirse antes de cerrar la mesa.` | [antes-3](evidencias/antes-3.jpg) |

Revisó: Claudia Medina, 11-11-2026, en Windows (PowerShell), ramas `dev` de ambos repos.

**Prueba "después"**: el mismo flujo, repetido con todos los PR ya integrados en `dev`.

| Paso | Observado (antes) | Observado (después) | Evidencia | ¿Igual? |
|---|---|---|---|---|
| Carrito | **$19.000** (Pizza $17.000 + Coca-Cola $2.000) | **$19.000** (Pizza $17.000 + Coca-Cola $2.000) | [despues-1](evidencias/despues-1.jpg) | ✅ |
| Cuenta tras confirmar | "En Cocina 🍳", total acumulado **$19.000** | "En Cocina 🍳", total acumulado **$19.000** | [despues-2](evidencias/despues-2.jpg) | ✅ |
| Liberar mesa con pedido activo | `[PEDIDO_ACTIVO] … Debe servirse antes de cerrar la mesa.` | `[PEDIDO_ACTIVO] … Debe servirse antes de cerrar la mesa.` | [despues-3](evidencias/despues-3.jpg) | ✅ |

Revisó: Claudia Medina, 14-11-2026, en macOS, ramas `dev` de ambos repos (frontend `7c72453`, backend `92d55cf`).
**Conclusión:** la refactorización no cambió el comportamiento visible de la operación revisada.

---

## 1. Hallazgos e intervenciones

| # | Repo | Problema | Ubicación (antes) | Prioridad | Responsable | Commits / PR |
|---|---|---|---|---|---|---|
| 1 | F | URL del backend escrita a mano en varios archivos | `App.jsx`, `DetalleMesa.jsx`, `TomaPedido.jsx` | Alta | Diego Urbano | [PR #81](https://github.com/Martin12332124/SCD_TP_F/pull/81): `fe935f1`, `ba392a2`, `706ea38`, `0d8bb2f`, `ad23414` |
| 2 | F | Función de formato de precio duplicada | `DetalleMesa.jsx`, `TomaPedido.jsx` | Media | Martín Carvallo | [PR #80](https://github.com/Martin12332124/SCD_TP_F/pull/80): `d632675` (tests), `cbb4f41` |
| 3 | B | Handlers de socket mezclados con la composición de la app y `try/catch` copiado 3 veces | `src/app.js` | Alta | Francisca Hernández | [PR #47](https://github.com/Martin12332124/SCD_TP_B/pull/47): `61bdb5c`, `3e274b4` |
| — | F | Modularización de `src/` | todo `src/` | Obligatoria | Martín Saldívar | [PR #82](https://github.com/Martin12332124/SCD_TP_F/pull/82): `a3a18b5` |

### Intervención 1 — Cliente API centralizado (frontend)

- **Problema:** `http://localhost:3000` aparecía 4 veces en 3 archivos y cada vista llamaba a `fetch` por su cuenta.
- **Consecuencia:** para usar otro servidor había que editar 3 archivos, y si se olvidaba uno, esa vista fallaba sin un error claro.
- **Solución:** `src/servicios/api.js` lee la URL de `VITE_API_URL` (por defecto `http://localhost:3000`) y expone `obtenerMesas`, `obtenerPedidoMesa`, `abrirMesa`, `cerrarMesa` y `obtenerMenu`. `App`, `DetalleMesa` y `TomaPedido` lo usan, y el socket toma la URL de `API_URL`.
- **Pruebas:** `src/servicios/api.test.js` (contrato: rutas, `ok:false` sin lanzar error, error de red, HTTP 500). Las pruebas de los componentes siguen pasando sin cambios.

### Intervención 2 — Utilidades de formato (frontend)

- **Problema:** `formatearPrecio` estaba definida igual en `DetalleMesa.jsx` y `TomaPedido.jsx`. `formatearTiempo` vivía dentro de `App.jsx`.
- **Consecuencia:** cambiar el formato de moneda requería editar 2 lugares, y ninguna de las dos funciones tenía pruebas propias.
- **Protección previa (commit separado `d632675`):** las pruebas existentes solo verificaban `12.500`, así que perder el `$` no se detectaba. Se agregaron 3 pruebas que fijan el formato exacto (`$8.500`, `$17.000`, `$19.000`, `$12.500`).
- **Solución:** `src/utils/formato.js` con pruebas unitarias en `formato.test.js` (casos normales, límites y entradas inválidas).

### Intervención 3 — Separar los handlers de socket (backend)

- **Problema:** `src/app.js` (186 líneas) componía la app y además atendía los eventos `actualizar_pedido`, `confirmar_pedido`, `trasladar_pedido` y `disconnect`. El bloque `try/catch` que responde `ERROR_INTERNO` estaba copiado 3 veces.
- **Solución en 2 pasos (un cambio por commit):**
  1. `61bdb5c`: mover los eventos tal cual a `src/presentacion/socket.handlers.js` (`registrarHandlersSocket`).
  2. `3e274b4`: unificar el `try/catch` en `responderSeguro(socket, opciones)`.
- **Pruebas:** `test/socket.test.js` e `test/integracion.test.js` pasan sin cambios, y se suma `test/socket.handlers.test.js` (4 casos: éxito, rechazo, excepción, `alExito` opcional).

---

## 2. Organización de los repositorios

### Frontend (SCD_TP_F)

Antes, todos los archivos estaban sueltos en `src/`. Ahora:

```
src/
├── componentes/    Vistas React y sus pruebas: App, MapaMesas, DetalleMesa, TomaPedido, SelectorTema
├── servicios/      Comunicación con el backend: api.js
├── utils/          Funciones puras reutilizables: formato.js
├── validaciones/   Reglas de entrada: validaciones.js
├── test/setup.js   Configuración global de pruebas
├── main.jsx        Punto de entrada
└── index.css
```

Regla de dependencias: `componentes/` usa `servicios/`, `utils/` y `validaciones/`. Estos tres no importan componentes.

### Backend (SCD_TP_B)

| Carpeta | Responsabilidad | Archivos principales |
|---|---|---|
| `src/presentacion/` | Entrada HTTP y socket: traducir peticiones y respuestas | `mesas.router.js`, `menu-items.router.js`, `socket.handlers.js` *(nuevo)* |
| `src/dominio/` | Reglas de negocio e invariantes | `pedido.service.js`, `mesa.service.js`, `mesa-estado.service.js`, `menu-item.service.js`, `consistencia*.js` |
| `src/infraestructura/` | Datos y notificaciones | `repositorios.js`, `notificador.js` |
| `src/app.js` | Composición: crea servicios y monta rutas y socket | — |

---

## 3. Interfaz del componente reutilizable — `src/servicios/api.js`

| Aspecto | Definición |
|---|---|
| **Nombre y propósito** | Cliente REST del backend. Es el único lugar con la URL del servidor y con llamadas a `fetch`. |
| **Entrada y salida** | `obtenerMesas(): Promise<{ ok, mesas: Array<{ id: string, numero: number, estado: string }> }>`<br>`obtenerPedidoMesa(numero: number): Promise<{ ok, items, total: number, estado: string }>`<br>`abrirMesa(numero: number)` / `cerrarMesa(numero: number): Promise<{ ok, tipo?, error? }>`<br>`obtenerMenu(): Promise<{ ok, items: Array<{ id, nombre, precioBase, disponible }> }>` |
| **Errores** | Un `{ ok: false, tipo, error }` del backend se **devuelve** (no lanza error): cada vista decide el mensaje. La promesa se **rechaza** si falla la red. `obtenerMenu` además se rechaza con `Error("Error del servidor: <código>")` si el HTTP no es 2xx. |
| **Configuración** | `VITE_API_URL` en un archivo `.env` (por defecto `http://localhost:3000`). |

**Ejemplo de uso desde otro archivo** (con el backend recién iniciado):

```js
import { obtenerMesas, cerrarMesa } from '../servicios/api';

const { mesas } = await obtenerMesas();
console.log(mesas.length); // 10

const r = await cerrarMesa(1);
console.log(r.ok, r.tipo); // false 'ESTADO_NO_PERMITIDO' (la mesa 1 está libre)
```

**Consumidores:** `App.jsx`, `DetalleMesa.jsx` y `TomaPedido.jsx`, todos con la misma implementación.
**Ejecutado por otro integrante a partir de esta descripción:** Claudia Medina, con [`scripts/probar-api.mjs`](../scripts/probar-api.mjs) ([PR #83](https://github.com/Martin12332124/SCD_TP_F/pull/83), commit `f282fbf`). Con el backend encendido (`npm start` en SCD_TP_B) y `node scripts/probar-api.mjs` en SCD_TP_F, el resultado fue:

```
Mesas cargadas: 10
Productos en la carta: Pizza Margarita, Coca-Cola 500 ml, Ensalada César
Cerrar mesa 1 (libre): false ESTADO_NO_PERMITIDO
```

Coincide con lo que dice el contrato: `obtenerMesas` y `obtenerMenu` devuelven el cuerpo del backend, y `cerrarMesa` devuelve el rechazo (`ok: false`) sin lanzar un error.

---

## 4. Revisión de dependencia externa — `socket.io` / `socket.io-client`

| Criterio | Registro |
|---|---|
| **Nombre y versión** | `socket.io@4.8.3` (backend) · `socket.io-client@4.8.3` (frontend). Verificado con `npm ls`. |
| **Funcionalidad** | Comunicación en tiempo real POS ↔ KDS: estado de mesas, confirmación de pedidos, cambios de estado y traslados. Backend: `src/presentacion/socket.handlers.js`, `src/infraestructura/notificador.js`. Frontend: `src/componentes/App.jsx`, `TomaPedido.jsx`. |
| **Ejemplo ejecutable** | `test/socket.test.js` en SCD_TP_B levanta el servidor y conecta un cliente real `socket.io-client`. |
| **Mantenimiento** | La versión 4.8.3 se publicó en diciembre de 2025 ([notas de versión](https://github.com/socketio/socket.io/releases), [docs de instalación](https://socket.io/docs/v4/client-installation/)). |
| **Licencia y condiciones** | MIT (campo `license` del `package.json` instalado). Obligación: conservar el aviso de copyright y la licencia al redistribuir el código de la librería. |
| **Riesgo** | **Vulnerabilidad conocida.** `npm audit` (14-11-2026) reporta en el backend una vulnerabilidad **alta** en `engine.io@6.6.9`, dependencia interna de `socket.io`: denegación de servicio por diferencia de revisión del protocolo ([GHSA-2gc4-cqfq-p2gv](https://github.com/advisories/GHSA-2gc4-cqfq-p2gv), afecta `>=6.6.0 <6.6.10`). Probabilidad: baja en un entorno de clase, media si se expone a internet. Impacto: alto (si el servidor de socket cae, los pedidos no llegan a cocina). Riesgo secundario: un cambio incompatible en una versión mayor (5.x), mitigado porque el rango `^4.8.3` no la instala. |
| **Medida de mitigación** | Ejecutar `npm audit fix` en SCD_TP_B, que actualiza `engine.io` a 6.6.10 sin salir del rango `^4` de `socket.io` (no requiere `--force`). Mantener el rango `^4` en ambos repos y actualizar cliente y servidor juntos. |
| **Cómo se comprueba** | Después de la actualización: `npm ls engine.io` debe mostrar 6.6.10 o superior, `npm audit` ya no debe listar `engine.io`, y `test/socket.test.js` (que corre en el CI en cada PR) debe seguir pasando. Estado actual: **pendiente de aplicar** (ver sección 7). |

---

## 5. Indicadores antes / después

| Interv. | Indicador | Antes | Después |
|---|---|---|---|
| 1 | Veces que aparece la URL del backend escrita a mano | 4 | 1 (`servicios/api.js`) |
| 1 | Archivos a editar para cambiar de servidor | 3 | 0 (se usa `VITE_API_URL`) |
| 2 | Definiciones de `formatearPrecio` | 2 | 1 |
| 2 | Funciones de formato con prueba unitaria propia | 0 | 2 |
| 3 | Bloques `try/catch` con `ERROR_INTERNO` duplicados | 3 | 1 (`responderSeguro`) |
| 3 | Líneas de `src/app.js` | 186 | 106 |
| — | Pruebas frontend / backend | 135 / 141 | 163 / 145 |

---

## 6. Ejecución, pruebas y CI

```bash
# Backend
cd SCD_TP_B && npm ci && npm start      # http://localhost:3000
npm run lint && npm run test:ci

# Frontend
cd SCD_TP_F && npm ci && npm run dev
npm run lint && npm run build && npm run test:ci
```

Cada PR corre el CI de GitHub Actions (lint, pruebas y cobertura) y requiere una aprobación antes del merge.

| Repo | PR | Checks del CI |
|---|---|---|
| SCD_TP_F | #80 formato | [checks](https://github.com/Martin12332124/SCD_TP_F/pull/80/checks) |
| SCD_TP_F | #81 api.js | [checks](https://github.com/Martin12332124/SCD_TP_F/pull/81/checks) |
| SCD_TP_F | #82 modularización + ficha | [checks](https://github.com/Martin12332124/SCD_TP_F/pull/82/checks) |
| SCD_TP_F | #83 uso de api.js | [checks](https://github.com/Martin12332124/SCD_TP_F/pull/83/checks) |
| SCD_TP_B | #47 handlers de socket | [checks](https://github.com/Martin12332124/SCD_TP_B/pull/47/checks) |
| Ambos | Historial completo | [Actions F](https://github.com/Martin12332124/SCD_TP_F/actions) · [Actions B](https://github.com/Martin12332124/SCD_TP_B/actions) |

Resultado local sobre `dev` final: frontend 163/163 pruebas, cobertura 97,55 % · backend 145/145 pruebas, cobertura 93,45 %.

---

## 7. Deuda técnica pendiente

| Deuda | Motivo para dejarla | Responsable | Condición de revisión |
|---|---|---|---|
| `mesas.router.js` llama a `mesaEstadoService._validarNumero`, un método privado, desde fuera del servicio | Cambiarlo toca el contrato del servicio y sus pruebas; queda fuera del alcance de esta guía | Francisca Hernández | Al agregar otra ruta que valide número de mesa |
| La tabla `HTTP_STATUS` está repetida en `mesas.router.js` y `menu-items.router.js` | Son tablas distintas (cada una mapea sus propios tipos de error) | Francisca Hernández | Si aparece un tercer router |
| `App.jsx` (≈745 líneas) y `TomaPedido.jsx` (≈725 líneas) siguen siendo extensos, sobre todo por los estilos en línea | Separar estilos y subcomponentes es un cambio grande que no aporta a las intervenciones elegidas | Martín Saldívar | Antes de agregar una vista nueva |
| `engine.io@6.6.9` con vulnerabilidad alta (GHSA-2gc4-cqfq-p2gv), y otras 24 alertas de `npm audit` en el backend y 10 en el frontend, todas en dependencias indirectas | Actualizar dependencias es un cambio aparte de la refactorización y debe ir en su propio PR con las pruebas de socket | Francisca Hernández | Antes de la entrega final o de exponer el backend fuera de la red local |
