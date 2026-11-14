# Guía Unidad 3 — Refactorización, modularización y reutilización

Taller de Programación Avanzada ISF224 · Proyecto POS + KDS

> **Estado:** intervenciones 1, 2 y 3 y modularización terminadas. Queda **PENDIENTE** la parte de Claudia (uso de `api.js` y revisión de socket.io), la prueba "después" y los links de CI.

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

Después de las refactorizaciones se repite el mismo flujo y debe dar el mismo resultado.

---

## 1. Hallazgos e intervenciones

| # | Repo | Problema | Ubicación (antes) | Prioridad | Responsable | Commits / PR |
|---|---|---|---|---|---|---|
| 1 | F | URL del backend escrita a mano en varios archivos | `App.jsx`, `DetalleMesa.jsx`, `TomaPedido.jsx` | Alta | Diego Urbano | [PR #81](https://github.com/Martin12332124/SCD_TP_F/pull/81): `fe935f1`, `ba392a2`, `706ea38`, `0d8bb2f`, `ad23414` |
| 2 | F | Función de formato de precio duplicada | `DetalleMesa.jsx`, `TomaPedido.jsx` | Media | Martín Carvallo | [PR #80](https://github.com/Martin12332124/SCD_TP_F/pull/80): `d632675` (tests), `cbb4f41` |
| 3 | B | Handlers de socket mezclados con la composición de la app y `try/catch` copiado 3 veces | `src/app.js` | Alta | Francisca Hernández | [PR #47](https://github.com/Martin12332124/SCD_TP_B/pull/47): `61bdb5c`, `3e274b4` |
| — | F | Modularización de `src/` | todo `src/` | Obligatoria | Martín Saldívar | `a3a18b5` (PR **PENDIENTE**) |

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
**Ejecutado por otro integrante a partir de esta descripción:** Claudia Medina, con `scripts/probar-api.mjs`. Resultado: **PENDIENTE**.

---

## 4. Revisión de dependencia externa — `socket.io` / `socket.io-client`

| Criterio | Registro |
|---|---|
| **Nombre y versión** | `socket.io@4.8.3` (backend) · `socket.io-client@4.8.3` (frontend). Verificado con `npm ls`. |
| **Funcionalidad** | Comunicación en tiempo real POS ↔ KDS: estado de mesas, confirmación de pedidos, cambios de estado y traslados. Backend: `src/presentacion/socket.handlers.js`, `src/infraestructura/notificador.js`. Frontend: `src/componentes/App.jsx`, `TomaPedido.jsx`. |
| **Ejemplo ejecutable** | `test/socket.test.js` en SCD_TP_B levanta el servidor y conecta un cliente real `socket.io-client`. |
| **Mantenimiento** | La versión 4.8.3 se publicó en diciembre de 2025 ([notas de versión](https://github.com/socketio/socket.io/releases), [docs de instalación](https://socket.io/docs/v4/client-installation/)). |
| **Licencia y condiciones** | MIT (campo `license` del `package.json` instalado). Obligación: conservar el aviso de copyright y la licencia al redistribuir el código de la librería. |
| **Riesgo** | Cambio incompatible: una versión mayor (5.x) podría alterar la API de eventos o la compatibilidad entre cliente y servidor. Probabilidad: baja (el rango `^4.8.3` no instala 5.x). Impacto: alto (sin socket no llegan pedidos a cocina). |
| **Medida de mitigación** | Mantener el rango `^4` en ambos repos, actualizar cliente y servidor juntos y no aceptar una versión mayor sin pasar `test/socket.test.js`. |
| **Cómo se comprueba** | El CI corre `test/socket.test.js` en cada push y PR: si una actualización rompe la conexión o los eventos, el CI falla. Además se revisa `npm audit` antes de cada entrega. |

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

- CI frontend: **PENDIENTE** (link a GitHub Actions del PR)
- CI backend: **PENDIENTE** (link a GitHub Actions del PR)

---

## 7. Deuda técnica pendiente

| Deuda | Motivo para dejarla | Responsable | Condición de revisión |
|---|---|---|---|
| `mesas.router.js` llama a `mesaEstadoService._validarNumero`, un método privado, desde fuera del servicio | Cambiarlo toca el contrato del servicio y sus pruebas; queda fuera del alcance de esta guía | **PENDIENTE** | Al agregar otra ruta que valide número de mesa |
| La tabla `HTTP_STATUS` está repetida en `mesas.router.js` y `menu-items.router.js` | Son tablas distintas (cada una mapea sus propios tipos de error) | **PENDIENTE** | Si aparece un tercer router |
| `App.jsx` (≈745 líneas) y `TomaPedido.jsx` (≈725 líneas) siguen siendo extensos, sobre todo por los estilos en línea | Separar estilos y subcomponentes es un cambio grande que no aporta a las intervenciones elegidas | **PENDIENTE** | Antes de agregar una vista nueva |
