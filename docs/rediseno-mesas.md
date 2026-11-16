# Rediseño: todo dentro de la mesa, mesas configurables y plano de sala

Rama `feat/rediseno-mesas`, creada desde `dev` en `313b8ee`. Necesita la rama
`feat/administrar-mesas` del backend (`SCD_TP_B`), documentada en su
`docs/administracion-mesas.md`.

## 1. Resumen

- **Todo lo de la mesa, dentro de la mesa.** Se eliminaron las tarjetas "Panel de control" y
  "Traslado de mesa" de la columna lateral. Avanzar el pedido y trasladarlo se hace ahora desde el
  panel de cada mesa, sin escribir números de mesa a mano.
- **Mesas configurables.** Una pantalla aparte, "Configurar mesas", permite agregar y quitar mesas.
  El cambio llega a todas las tablets conectadas.
- **Plano de sala.** El mapa dibuja cada mesa vista desde arriba (tablero y sillas) y distingue
  cinco estados: libre, ocupada, pedido tomado, en cocina y pedido listo.
- **Rediseño visual** pensado para tablets y la pantalla de cocina: zonas táctiles grandes, más
  color y sin los patrones que el equipo decidió no usar (sección 5).

## 2. Antes y después

| Funcionalidad | Antes | Después |
| --- | --- | --- |
| Encabezado: título, conexión, tema | Etiqueta "Sala · Cocina · Caja"; conexión con puntito de color | Sin etiqueta; conexión como bloque de color con texto; botón "Configurar mesas" |
| Último cambio y cronómetro (alerta a 15 min, tope 99:59) | Recuadro con etiqueta en mayúsculas y estado en píldora | Franja "Último cambio": a la izquierda el color sólido del estado con "Mesa 5 → En Cocina 🍳" en grande; a la derecha el cronómetro en grande |
| Mapa de mesas (ver, seleccionar, resaltar, conteo) | Grilla verde/rojo, solo libre u ocupada | Plano de sala con 5 estados (color + ícono + texto); resumen "10 mesas: 6 libres, 4 ocupadas, 1 en cocina…" |
| "Tomar Pedido 📝" (pedido vacío en Recibido) | Botón del panel de control, con número escrito | Panel de la mesa: "Registrar pedido sin productos" |
| "Empezar Cocina 🍳" | Botón del panel de control | Panel de la mesa: "Enviar a cocina" (solo si el pedido está Recibido) |
| "Pedido Listo 🍽️" | Botón del panel de control (liberaba la mesa) | Panel de la mesa: "Marcar pedido listo" (la mesa sigue ocupada hasta liberarla) |
| Validación del número de mesa | Al escribir en el campo | Antes de emitir, con `validarMesaExistente` (el campo ya no existe) |
| Traslado | Tarjeta con dos campos de número | Panel de la mesa de origen: se toca la mesa de destino (las ocupadas, deshabilitadas) |
| Validaciones y mensajes del traslado | En `App.jsx` | `validarTraslado`; mismos mensajes, visibles en el panel aunque el origen quede libre |
| Abrir y liberar mesa (US-09) con sus mensajes | Panel de la mesa | Igual |
| "Tomar pedido" (carta) | Panel, solo con la mesa ocupada | Panel, también con la mesa libre (el backend la abre al confirmar); con pedido se llama "Agregar productos" |
| Cuenta (ítems y total) | Panel, con el estado del pedido dentro del ticket | Panel; el estado pasa a la barra de progreso |
| Sección "Información" (ID interno y estado) | Panel | **Quitada** (repetía el título y el estado) |
| Nota "abrir la mesa no crea una cuenta (US-12)" | Texto chico y gris en cursiva | Mismo texto, legible |
| Toma de pedido: carta, agotados, carrito, 1–99, confirmar | Chip "✅ Disponible / 🚫 Agotado" | Igual sin el chip: el botón dice "Agotado"; botones de cantidad de 44 px |
| Agregar y quitar mesas | No existía | Pantalla "Configurar mesas" |

## 3. Archivos creados, modificados y eliminados

### Creados

| Archivo | Motivo |
| --- | --- |
| `src/componentes/Encabezado.jsx` | Sale de `App.jsx`: título, conexión, tema y "Configurar mesas". |
| `src/componentes/UltimaActualizacion.jsx` | Sale de `App.jsx`: la franja del último cambio con su cronómetro. |
| `src/componentes/AvancePedido.jsx` | Barra de progreso del pedido y botón con el siguiente paso válido. |
| `src/componentes/TrasladoMesa.jsx` | Elegir el destino tocando una mesa y trasladar. |
| `src/componentes/AdminMesas.jsx` | Pantalla "Configurar mesas". |
| `src/utils/flujoPedido.js` | Estados del pedido en orden y `siguienteEstado`. |
| `src/utils/estadoMesa.js` | Estado visual de una mesa (texto, ícono y color) según su pedido. |
| `src/test/colores-estado.test.js` | Calcula el contraste de cada color de estado en ambos temas. |
| `src/test/patrones-visuales.test.js` | Vigila que no vuelvan los patrones visuales prohibidos. |
| Tests de cada componente nuevo y de las utilidades | Ver sección 6. |
| `docs/rediseno-mesas.md` | Este documento. |

### Modificados

| Archivo | Cambio y motivo |
| --- | --- |
| `src/componentes/App.jsx` | Sin las dos tarjetas ni sus campos; queda como contenedor (socket, estado, validaciones antes de emitir). Pasa de 746 a ~300 líneas. Actualiza `estadoPedido` de cada mesa con `cambio_estado_pedido`. |
| `src/componentes/MapaMesas.jsx` | Plano de sala con 5 estados. |
| `src/componentes/DetalleMesa.jsx` | Panel con todas las acciones de la mesa; franja de estado; sin "Información". |
| `src/componentes/TomaPedido.jsx`, `SelectorTema.jsx` | Solo lo visual. |
| `src/validaciones/validaciones.js` | Nuevos `validarMesaExistente`, `validarTraslado` y `validarNumeroMesaNueva`. **`validarNumeroMesa` no cambió** (el script de integración del CI, `test-verificacion.js`, comprueba sus mensajes exactos). |
| `src/servicios/api.js` | `agregarMesa` y `quitarMesa`. |
| `src/index.css` | Colores por estado (`--mesa-*`), piso del plano, tamaño táctil (`--toque`), verde más vivo; se quita la animación del puntito de conexión. |
| `README.md` | "Cómo usar" y la fila de traslado de la tabla del Hito 2. |

### Eliminados

Ningún archivo. Sí se eliminó código: las tarjetas "Panel de control" y "Traslado de mesa" de
`App.jsx`, con sus campos y funciones (`manejarCambioMesa` y el `trasladarPedido` basado en campos).

## 4. Endpoints y eventos que usa el frontend

Ningún evento ni respuesta existente cambió de forma. Lo nuevo:

```js
// servicios/api.js
agregarMesa()     // POST /api/mesas  {}             → { ok, mesa: { id, numero, estado } }
agregarMesa(20)   // POST /api/mesas  { numero: 20 } → { ok, mesa } | { ok: false, tipo: 'DUPLICADO', error }
quitarMesa(7)     // DELETE /api/mesas/7             → { ok, mesa: 'Mesa 7' } | { ok: false, tipo, error }
```

- Cada mesa de `GET /api/mesas` y de `estado_mesas` trae `estadoPedido` (`"En Cocina 🍳"`, etc.,
  o `null`). Si el backend es anterior y no lo envía, una mesa ocupada se muestra "Ocupada".
- Al llegar `cambio_estado_pedido`, `App` actualiza el `estadoPedido` de esa mesa (el backend no
  reenvía `estado_mesas` en cada cambio de estado del pedido) y recarga la cuenta del panel abierto.
- `actualizar_pedido` y `trasladar_pedido` se emiten igual que antes, con `"Mesa N"` y números.

## 5. Decisiones de diseño y su porqué

**Un solo botón con el siguiente paso.** El backend solo acepta avanzar un paso a la vez. Con los
tres botones (y dos deshabilitados) hay más ruido y más riesgo de tocar el equivocado en una
tablet, y un botón deshabilitado no explica por qué. La barra de progreso muestra el orden
completo y dónde va el pedido.

**Unificación de los dos "Tomar pedido".** El del panel de control (`actualizar_pedido` con
Recibido) creaba un pedido vacío; el del detalle (`confirmar_pedido` desde la carta) crea el pedido
con productos y lo manda a cocina. Se solapaban en "crear el pedido". Ahora "Tomar pedido" es
siempre la carta, y el pedido vacío queda como acción secundaria con un nombre que no se confunde:
"Registrar pedido sin productos".

**Destino del traslado tocando una mesa**, no escribiendo el número: no hay que recordar números,
las mesas ocupadas aparecen deshabilitadas y se ve al instante qué destinos son posibles. Se
mantienen las validaciones de antes (`validarTraslado`) y el backend sigue validando lo suyo.

**Administración separada.** "Configurar mesas" se abre desde el encabezado y tapa la sala, para
que no se mezcle con la operación diaria. Quitar una mesa pide un segundo toque ("¿Quitar la mesa
7?" → "Sí, quitar"), y una mesa ocupada no se puede quitar. No hay roles (fuera de alcance).

**Colores de estado.** Cada estado tiene color, ícono y texto propios (REF-05: no depender solo
del color). Contraste del texto sobre su fondo, calculado por `colores-estado.test.js` (mínimo 4.5):

| Estado | Ícono | Tema claro (fondo / texto) | Tema oscuro (fondo / texto) |
| --- | --- | --- | --- |
| Libre | 🪑 | `#16834a` / `#ffffff` (4.8) | `#34c277` / `#062414` (7.2) |
| Ocupada (sin pedido) | 🍷 | `#c9302a` / `#ffffff` (5.3) | `#f0584a` / `#2a0703` (5.5) |
| Pedido tomado | 📝 | `#7446d6` / `#ffffff` (5.9) | `#a283f2` / `#1b0b45` (6.0) |
| En cocina | 🍳 | `#f5a300` / `#2b1a00` (8.1) | `#ffb829` / `#2b1a00` (9.7) |
| Pedido listo | 🍽️ | `#1b6fcc` / `#ffffff` (5.0) | `#56a5f5` / `#04213f` (6.3) |

Los mismos colores se usan en el plano, en la franja del panel, en la barra de progreso y en
"Último cambio", así un estado se reconoce igual en toda la pantalla.

**Patrones que se quitaron** (y que `patrones-visuales.test.js` vigila en el código):
- Las etiquetas chicas en mayúsculas con espaciado: "Mozo · Cocina", "Sala", "Acciones",
  "Cuenta", "Información", "Sala · Cocina · Caja" y "Última actualización".
- El puntito de color del indicador de conexión, y los 🟢/🔴 del estado de la mesa.
- Las píldoras y chips: estado del último pedido, cronómetro, selector de tema, "Mesa N" en la
  toma de pedido, "Disponible/Agotado" y el selector de cantidad.
- El texto chico y gris tenue (mínimo 14 px, sin `--color-texto-tenue`).

El test revisa el código fuente, así que es un control aproximado. Por eso además se revisó la
interfaz en Chrome, en tema claro y oscuro, con ventanas de unos 830 y 1660 px de ancho. Esa
revisión encontró dos cosas que el test no ve, ya corregidas: el estado de "Último cambio" y los
pasos de la barra de progreso seguían siendo cajitas de color con texto.

**Zonas táctiles.** Los botones de la sala, el panel de la mesa, la toma de pedido y
"Configurar mesas" miden al menos 52 px de alto (`--toque`); las mesas del plano, al menos
128 × 128 px; los botones del encabezado y los de cantidad, 44 px.

## 6. Resultados de los tests

Ejecutado con `npm run test:coverage` (el mismo que usa el CI) y `npm run lint`, en Node v26.7.0.

| | Línea base (`dev`, `313b8ee`) | Final (`feat/rediseno-mesas`) |
| --- | --- | --- |
| Archivos de test | 8 pasan | 15 pasan |
| Tests | 163 / 163 | 406 / 406 |
| Statements | 97.55 % (319/327) | 97.64 % (457/468) |
| Branches | 94.40 % (253/268) | 95.59 % (369/386) |
| Functions | 98.85 % (86/87) | 98.48 % (130/132) |
| Lines | 98.32 % (294/299) | 98.09 % (412/420) |
| Umbrales (85/85/80/75) | cumplen | cumplen |
| `npm run lint` / `npm run build` | sin problemas | sin problemas |

**Tests existentes que cambiaron** (30 casos, todos porque la interfaz que probaban se movió o se
quitó a propósito):

| Archivo | Tests | Motivo |
| --- | --- | --- |
| `MapaMesas.test.jsx` | "CA2: distingue Libre de Ocupada…" | Comprobaba colores fijos en `rgb`; ahora las variables del tema. |
| `DetalleMesa.test.jsx` | "sin mesa seleccionada…" | Buscaba la palabra "Acciones", que ya no existe: habría pasado sin probar nada. |
| `DetalleMesa.test.jsx` | "mesa libre: muestra…", "el estado usa tono oliva…" | Buscaban 🟢/🔴 (puntito con texto) y el borde del chip; ahora la franja de estado. |
| `DetalleMesa.test.jsx` | "mesa ocupada con pedido…", "la cuenta se muestra como ticket…" | El estado del pedido salió del ticket a la barra de progreso. |
| `App.test.jsx` | "CA3: estado_mesas actualiza…", "si la mesa seleccionada desaparece…" | Buscaban 🟢/🔴 en el panel. |
| `App.test.jsx` | "arranca desconectada y deshabilita el formulario" | El campo de número ya no existe; ahora comprueba las acciones del panel. |
| `App.test.jsx` | Bloque "validación defensiva del número de mesa" (6) | Probaban el campo eliminado. Los mismos valores inválidos están en `validaciones.test.js`; la emisión, desde el panel. |
| `App.test.jsx` | Bloque "traslado de mesa" (7) | Probaban los campos de origen y destino. Reemplazados por "trasladar desde el panel de la mesa" y los casos de `validarTraslado`. |
| `App.test.jsx` | "los campos se identifican por su rótulo" | Ya no hay campos. Reemplazado por "la pantalla principal no tiene campos para escribir números de mesa". |
| `App.test.jsx` | "un error de validación se anuncia como alerta", "el resultado del traslado…" | El aviso ya no viene de escribir un número; el resultado del traslado se ve en el panel. |
| `App.test.jsx` | "sin pedidos la píldora…", "la píldora del estado…" (3) | Comprobaban la píldora; ahora el bloque con el color de la mesa. |
| `TomaPedido.test.jsx` | "un producto agotado se etiqueta…" | Buscaba el chip "🚫 Agotado"; ahora lo dice el botón. |

**Verificación en el navegador** (Chrome, contra el backend nuevo en el puerto 3100 con una base
temporal):
- Se vieron los cinco estados en el plano, en tema claro y oscuro.
- Se recorrió el flujo completo: Recibido → En cocina → Listo, trasladar el pedido listo, liberar
  la mesa, quitar la Mesa 10 con confirmación y agregar la Mesa 20 eligiendo el número.
- Al reiniciar el backend, las mesas siguieron como quedaron.
- La consola quedó sin errores. Primero apareció un aviso de React por mezclar `border` con
  `borderColor`, y se corrigió en el commit `bfbaa8f`.

## 7. Commits

| Hash | Mensaje |
| --- | --- |
| `f4bfb06` | feat(api): operaciones para agregar y quitar mesas |
| `c88e16b` | feat(validaciones): validar mesa existente y reglas del traslado |
| `677cb22` | style(tema): colores por estado de mesa y tamaños táctiles |
| `6776115` | refactor(app): separar Encabezado y UltimaActualizacion |
| `07b0996` | feat(mapa): plano de sala con el estado del pedido |
| `972146a` | feat(mesa): avanzar el pedido desde el panel de la mesa |
| `8efa0d5` | feat(mesa): trasladar el pedido eligiendo el destino de una lista |
| `5471f67` | feat(app): quitar las tarjetas de panel de control y traslado |
| `ab7d5d5` | feat(mesas): pantalla para agregar y quitar mesas |
| `e7e9460` | style: quitar etiquetas, píldoras y chips de toda la interfaz |
| `bfbaa8f` | fix(estilos): no mezclar border con borderColor o borderWidth |
| `706d2fc` | style: franja de último cambio y barra de progreso sin cajitas de texto |

Más la documentación: `bc26174` (docs: documentar el rediseño de mesas) y el commit que la
actualiza con la revisión final.

`bfbaa8f` y `706d2fc` no estaban en la lista del plan: salieron de la revisión en el navegador (un aviso
de React en la consola y los dos elementos con forma de cajita).

## 8. Puntos frágiles y pendientes

- **Orden de integración:** primero el backend (`feat/administrar-mesas`), después este frontend.
  Con el backend anterior el frontend funciona, pero el plano muestra solo libre u ocupada y
  "Configurar mesas" falla con error de red o 404.
- **La rama `fix/panel-control-mesa-seleccionada` queda obsoleta:** arreglaba el panel de control,
  que esta rama elimina. Conviene cerrarla sin integrar.
- **Plano por número, no por posición real.** Las mesas se ordenan por número en una grilla. Un
  plano con la ubicación real de cada mesa necesitaría guardar coordenadas en el backend.
- **Validación defensiva inalcanzable desde la interfaz.** `App` sigue validando la mesa y el
  estado antes de emitir, pero como el panel solo ofrece mesas y pasos válidos, esas ramas no se
  pueden alcanzar con clics. Se mantienen como defensa y están cubiertas por
  `validaciones.test.js`.
- **No se probó en tablets reales** (Android/iOS, REF-14); se revisó en Chrome a ~830 y ~1000 px.
  "En cocina" usa texto oscuro sobre ámbar (contraste 8.1): conviene confirmar en la pantalla de
  cocina real que se distingue bien de "Libre" y "Pedido listo" a 2 metros (REF-05).
- **Script de integración del CI (`test-verificacion.js`):** no se modificó. Se corrió a mano
  contra el backend nuevo (puerto 3101, base temporal) y pasó completo. No se usó
  `npm run test:integracion` porque levanta el backend en el puerto 3000, donde estaba el servidor
  de desarrollo.
- **`docs/guia-unidad-3.md`** describe los módulos como estaban al entregar esa guía (por ejemplo,
  `App.jsx` como consumidor de `validarNumeroMesa`). No se tocó porque es una entrega anterior.
- **Límite de 99 mesas duplicado:** está en `NUMERO_MESA_MAXIMO` del backend y del frontend; si
  se cambia, hay que cambiarlo en los dos.
- **Barra de progreso:** quedó como barra continua con el nombre de cada paso dentro. Si se
  prefiere aún más simple (solo colores, sin texto), es un ajuste de estilos en `AvancePedido.jsx`.
- **Formato:** `App.jsx`, `TomaPedido.jsx` y algunos tests ya no seguían Prettier antes de esta
  tarea; no se reformatearon para no mezclar cambios ajenos en el diff.

## 9. Segunda iteración: riel de comandas e identidad visual

Commits `9eddc98` (riel) y `67818b1` (identidad). Requiere el commit `1c52921` del backend.

### Qué se corrigió

- **Bug del traslado:** la franja "Último cambio" guardaba la mesa del último evento
  `cambio_estado_pedido`. Un traslado no emite ese evento, así que seguía diciendo "Mesa 3"
  después de mover el pedido a la Mesa 6.
- **Solo un pedido visible:** la franja mostraba un único pedido, aunque hubiera varios en curso.

### Qué la reemplaza: el riel de comandas

Bajo el encabezado, como el riel del pase de una cocina, cuelga un **ticket de papel por cada
pedido en curso**, del más antiguo al más nuevo. Cada ticket muestra su mesa, el estado (franja con
el color e ícono de la mesa) y su propio temporizador. Tocar un ticket abre el panel de esa mesa.

- **Las comandas salen de la lista de mesas** (`estadoPedido` y `pedidoDesde`), no de un evento
  suelto. Al trasladar, el backend envía `estado_mesas` y el ticket pasa a la mesa nueva con el
  mismo tiempo.
- **El tiempo viene del backend** (`pedidoDesde`), así sobrevive a recargas y todas las tablets ven
  lo mismo. Un solo reloj en `App` avanza cada segundo mientras haya comandas.
- **Urgencia (REF-04):** pasados 15 minutos en el mismo estado, **todo el ticket** se pone ámbar
  ("Más de 15 min"). Pasados 20, se pone rojo ("Atrasado"). Cambiar el ticket entero, y no un
  indicador chico, permite contar los atrasados de un vistazo desde lejos. El nivel se dice también
  con texto, no solo con color.

### Identidad visual: "pase de cocina"

Se investigaron guías de pantallas de cocina (KDS) y de identidad de restaurantes (fuentes al
final). Las decisiones:

| Elemento | Decisión | Por qué |
| --- | --- | --- |
| Encabezado y riel | Pizarra `#1f2723` con barra de latón `#d4ae5c` | Forman el "pase" del que cuelgan las comandas; contraste texto 13.2, latón 7.3 |
| Tickets | Papel `#fffaf0` con borde inferior dentado y pinza | Se leen como comandas impresas; el papel es claro también en tema oscuro |
| Alertas | Papel ámbar `#ffd66b` (10.4) y rojo `#b3261e` con blanco (6.5) | Cambio de todo el ticket a los 15 y 20 min |
| Marca | "Comanda" en **Fraunces**, con ícono de campana | Una sola tipografía de carácter, usada poco: serif cálida de carta de bistró |
| Texto | **Barlow** | Grotesca inspirada en señalética, legible a distancia; evita la típica Inter/system-ui |
| Temporizadores | **Barlow Condensed** con cifras tabulares | Números grandes que no "bailan" al cambiar cada segundo |
| Íconos | SVG propios (`Icono.jsx`) en lugar de emojis | Mismo trazo en todas las pantallas, toman el color del texto y no dependen del sistema operativo |

Las tipografías se instalan con `@fontsource` (licencia OFL) y Vite las empaqueta con la app:
**no se descargan de internet**, como exige REF-08. Los avisos `✅`/`⚠️` se mantienen porque son
parte del contrato con los tests y el script de integración. Los estados del backend
(`'En Cocina 🍳'`) son datos, y la interfaz muestra su etiqueta ("En cocina").

### Resultados

| | Antes de la iteración | Después |
| --- | --- | --- |
| Tests | 406 | **462** (17 archivos) |
| Statements / Branches / Funcs / Lines | 97.64 / 95.59 / 98.48 / 98.09 % | 97.6 / 94.89 / 98.62 / 98.2 % |
| Lint / build | OK | OK |

Tests que cambiaron porque probaban la franja eliminada:
- **Contador (3 tests):** ahora cada comanda tiene su temporizador, con el caso nuevo de 20 minutos.
- **"cambio_estado_pedido actualiza el último pedido…":** ahora comprueba la comanda en el riel.
- **Franja "Último cambio" (4 tests de esta rama):** ahora prueban el riel.
- **"Tomar pedido abre la vista…":** buscaba el emoji 📝.

Tests nuevos:
- `RielComandas.test.jsx` y `tiempoComanda.test.js`.
- En `App.test.jsx`: varias comandas a la vez, el traslado que mueve la comanda con el mismo
  tiempo, tocar una comanda y la comanda que sale al liberar la mesa.
- En `patrones-visuales.test.js`: una regla contra los emojis decorativos.

Verificado en Chrome:
- Cuatro comandas con edades distintas (normal, más de 15 minutos y atrasada).
- El traslado Mesa 3 → Mesa 6: el ticket cambió de mesa y el tiempo siguió (24:06 → 24:08).
- Tema claro a 1660 px, tema oscuro a 820 px sin scroll horizontal, y consola sin errores.

### Puntos frágiles

- **Relojes distintos:** el tiempo se calcula con la hora de la tablet menos la hora del servidor.
  Si los relojes no están sincronizados, se corre esa diferencia (nunca muestra negativos).
- **Pedidos anteriores a la columna nueva:** muestran `--:--` hasta su próximo cambio de estado.
- **Muchas comandas:** el riel se desliza horizontalmente con el dedo. No se probó en una tablet
  real con 20 o más comandas.

### Fuentes consultadas

- [Toast: Kitchen display system overview](https://doc.toasttab.com/doc/platformguide/platformKDSOverview.html):
  color del ticket según su antigüedad.
- [Epson TrueOrder KDS: order timers](https://files.support.epson.com/pdf/pos/kds/111-56-qum-013_r3.40_trueorder_kds_order_timers-quick_user_manual.pdf):
  el encabezado del ticket cambia de color por intervalos.
- [VP0: Restaurant kitchen display system UI](https://vp0.com/blogs/restaurant-kitchen-display-system-kds-ui/):
  texto grande, zonas táctiles grandes y cambio de color de todo el ticket.
- [TouchBistro: Using the KDS](https://cdn.touchbistro.com/help/articles/using-the-kds):
  verde, amarillo y rojo según el tiempo.
- [Lovart: brand kit para restaurante y café](https://www.lovart.ai/es/blog/brand-kit-restaurant-cafe-lovart):
  una sola tipografía de carácter para la marca.
