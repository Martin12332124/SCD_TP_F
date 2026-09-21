# Actividades de clase

## Actividad 24 agosto, trabajo con claude

Resultado:

<img width="772" height="780" alt="Captura de pantalla 2026-08-24 a la(s) 10 00 38 a m" src="https://github.com/user-attachments/assets/2835311e-c2b6-4109-b0bf-855207ff19c5" />

Respuesta claude:
## Paso 1: Alcance y arquitectura general

Antes de entrar en el detalle, conviene fijar la arquitectura de fondo, porque todo lo demás (automatización, monitoreo, reducción de errores) se apoya en ella. Voy a asumir que el sistema se despliega en varios puntos a la vez —tablets para meseros, pantallas fijas en cocina, un dashboard de administración— y que todos comparten un mismo backend central. Si la idea es otra (por ejemplo, todo corriendo solo en local sin servidor central), dime y ajusto.

La arquitectura tendría estas piezas:

- **Capa de captura**: app de mesero (tablet/celular) y, opcionalmente, autopedido por QR en la mesa.
- **Backend/API central**: valida pedidos, aplica reglas de negocio, gestiona el estado de cada orden y dispara los temporizadores.
- **Capa en tiempo real**: un canal de eventos (WebSockets o similar) que empuja cada cambio de estado instantáneamente a todas las pantallas conectadas, sin que nadie tenga que refrescar nada.
- **KDS**: pantallas en cocina, una por estación (parrilla, fría, postres, etc.) o una general.
- **Módulo de monitoreo**: agrega los tiempos de cada pedido y expone métricas y alertas.
- **Base de datos**: pedidos, menú, mesas, estaciones, historial de tiempos.

## Paso 2: El flujo del pedido (el corazón del sistema)

Todo lo que pediste —automatizar al mesero, reducir errores, medir tiempos— pasa por el ciclo de vida de un pedido. Este es el eje sobre el que se diseña todo lo demás:Cada transición de este flujo es un punto donde el sistema puede automatizar, validar o medir. Vamos por partes.

## Paso 3: Automatizar al mesero, no reemplazarlo

La idea no es eliminar al mesero, sino sacarle el trabajo mecánico y propenso a error:

- **Toma de pedido guiada**: menú digital con modificadores predefinidos (sin cebolla, término medio, etc.) en vez de campos de texto libre — elimina la ambigüedad que hoy se resuelve "a mano" en cocina.
- **Validación en el momento**: si un plato no tiene stock de un ingrediente clave, el sistema lo bloquea antes de que el mesero lo ofrezca.
- **Enrutamiento automático**: el pedido se separa solo por estación (parrilla, bar, postres) sin que el mesero tenga que decidir a quién avisar.
- **Autopedido opcional (QR en mesa)**: reduce aún más la intervención humana en la captura, y libera al mesero para atención en sala.
- **Cálculo automático de cuenta**, división de mesa, y notificación automática cuando el pedido está listo para servir (así el mesero no tiene que estar preguntando en cocina).

## Paso 4: KDS y reducción de errores de cocina

- Pantallas por estación, no una sola pantalla genérica — cada cocinero ve solo lo suyo.
- Cada ítem con su tiempo de preparación estimado y un cronómetro visible; cambio de color cuando se acerca o supera el umbral.
- Modificadores y alergias resaltados visualmente (no como texto perdido entre otros datos).
- Confirmación explícita de "listo" por ítem y por pedido completo — esto genera trazabilidad: quién preparó, cuándo, y si hubo reimpresión o reclamo.
- Historial de reimpresiones/anulaciones por estación, útil para detectar patrones de error recurrentes (por ejemplo, una estación que sistemáticamente se atrasa o repite el mismo error).

## Paso 5: Monitoreo del tiempo de espera

Esto se construye sobre el mismo flujo del diagrama: cada transición de estado queda con timestamp. Con eso puedes calcular:

- Tiempo de captura → cocina, cocina → listo, listo → entregado (para saber si el cuello de botella está en cocina o en el mesero).
- Tiempo promedio por plato y por estación, para detectar quién se está atrasando.
- Alertas configurables (ej. "alertar si un pedido lleva más de 15 min en preparación").
- Dashboard con vista en vivo (pedidos activos y su tiempo transcurrido) y vista histórica (tendencias por día/turno).

## Paso 6: Patrones de diseño y stack sugerido

Ya que trabajas con patrones de diseño en Java (como en SIRPM), varios calzan naturalmente acá:

- **State**: el ciclo de vida del pedido (tomado → validado → en preparación → listo → entregado) es un caso de libro para este patrón.
- **Observer/pub-sub**: para la actualización en tiempo real hacia KDS y dashboard sin acoplar el backend a cada pantalla.
- **Strategy**: para reglas de precio, descuentos o promociones que puedan variar sin tocar el core.
- **Factory**: para la creación de pedidos según canal de origen (mesero, autopedido, delivery).

Como stack, dado tu manejo de Java y Android, una combinación razonable sería:

- **Backend**: Java + Spring Boot (API REST + WebSockets para el canal en tiempo real).
- **App de mesero**: Android nativo (o Kotlin), aprovechando lo que ya conoces.
- **KDS y dashboard**: aplicación web (React), ya que van en pantallas fijas/TV en cocina y admin.
- **Base de datos**: PostgreSQL (relacional, fuerte en integridad para pedidos y transacciones).

## Paso 7: Plan de desarrollo por fases

1. **MVP**: captura de pedido básica (app mesero), envío a una sola pantalla KDS, estados manuales (sin automatización todavía).
2. **Iteración 1**: validaciones automáticas, enrutamiento por estación, cronómetros y alertas de tiempo.
3. **Iteración 2**: autopedido QR, dashboard de métricas históricas, reglas de negocio más avanzadas (Strategy para precios/promos).
4. **Iteración 3**: analítica más fina (detección de cuellos de botella recurrentes, reportes por turno/estación).

Si quieres, puedo profundizar en el modelo de datos (entidades y relaciones), en el diseño de la máquina de estados del pedido, o armar un mockup de cómo se vería la pantalla del KDS.

---

Preguntas y respuestas de la actividad:
1)¿Cuánto tardaron en acordar antes de enviar?
R= El tiempo total dispuesto, los 10 minutos discutiendo y describiendoe el prompt

2)¿El resultado fue el esperado? ¿Qué cambiarían?
R= Fue el esperado, a pesar de haber olvidado solicitar ciertas cosas en específico, pero fue bastante completo coincidiendo con lo que esperabamos, cambiaríamos ciertos detalles para pedirle que fuera más descriptivo y ordenado.

3)¿Cómo se sintió no poder corregir?
R= Fue frustrante y angustiante cuando enviamos el prompt,y notamos que habíamos olvidado algo, fue mucha presión y los errores no se pueden corregir, por lo que no había más que hacer después de enviarlo.

## Respuesta tarea de fundamentos de ingieneria

**Historia de usuario**
como estudiante quiero reservar libros mas fácil
para poder obtenerlos de manera mas coordinada y eficaz. dado la alta demanda de estos mismos se dificulta el proceso de adquisición. con un sistema de reserva entonces se mitigaría el problema.

**Actividad parte 1**

| Área del Proceso | Grado | Evidencia que lo Respalda |
| :--- | :---: | :--- |
| **Gestión de Requisitos** | P | Existen historias de usuario, aunque solo algunas cuentan con criterios de aceptación definidos. |
| **Planificación del Proyecto** | L | Se tiene planificada la duración de los sprints; sin embargo, no se utilizan los datos históricos del sprint anterior para iniciar el nuevo. |
| **Gestión de la Configuración** | F | No existe un estándar o consistencia en los comentarios del código/repositorio, lo que dificulta la legibilidad para terceros. |
| **Verificacion** | F | No existen registros de las pruebas que se realizaron |

¿En que nivel de madurez ubicarias al equipo Aurora?
Respuesta: Ubicariamos el nivel de madurez del equipo entre 2 y 3 ya que no hay una organizacion clara y no se realizan los registros adecuados, sin embargo han llegado a realizar pruebas de cada demo.

**Actividad parte 2**

| Campo | Accion 1 | Accion 2 |
| :--- | :---: | :--- |
| **Brecha** | Ausencia de registros sobre lo que se probo en cada prueba manual | No existe una convencion de mensaje ni etiquetas de version |
| **Accion** | Establecer que cada prueba manual deba tener un registro o respaldo sobre lo que se probo y como se probo | Definir el formato que debe tener cada version |
| **Responsable y plazo** | QA, con plazo inmediato desde que se realice una prueba manual | El lider, con plazo de 2 dias |
| **Evidencia esperada** | Un documento relativo a cada prueba manual | El formato a seguir esta explicito en el README |
| **Indicador** | Existencia de trazabilidad en el area de testeo | Disminucion del 100% de versiones que no respeten el formato establecido |
