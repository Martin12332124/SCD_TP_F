# Interfaz Visual (Frontend)

Este proyecto es una prueba de  interfaz gráfica de usuario (Frontend) para el monitor de tráfico en tiempo real. Está construido con React, Vite y se conecta mediante Sockets al servidor central.

A continuación, tienes las instrucciones exactas y masticadas para descargar, instalar y ejecutar esta pantalla en cualquier computadora.

---

## REQUISITOS PREVIOS

Para que esta pantalla funcione, la computadora externa necesita cumplir con dos condiciones:
1. Tener **Node.js** instalado (versión LTS recomendada).
2. Tener el servidor **Backend (`SCD_TP_B`) ya encendido y corriendo** en el puerto 3000 de la misma PC o en red.

---

## PASO A PASO PARA INSTALAR LA PANTALLA

Sigue estos pasos en orden estricto sin saltarte ninguno:

### Paso 1: Abrir la Terminal
* En **Windows**: Presiona la tecla `Windows`, escribe **PowerShell** y ábrelo.
* En **Mac**: Presiona `Cmd + Espacio`, escribe **Terminal** y ábrela.

### Paso 2: Ir a la carpeta de descargas
Múevete a la carpeta donde quieras clonar el proyecto (por ejemplo, Descargas):
```bash
cd Downloads
```

### Paso 3: Descargar el código del Frontend
Copia, pega este comando en tu terminal y presiona `Enter`:
```bash
git clone https://github.com/Martin12332124/SCD_TP_F.git
```
*(Esto creará la carpeta llamada `SCD_TP_F` en tus descargas).*

### Paso 4: Entrar a la carpeta descargada
```bash
cd SCD_TP_F
```

### Paso 5: Instalar los paquetes del diseño
Ejecuta el siguiente comando para descargar de internet todas las herramientas visuales y de conexión necesarias:
```bash
npm install
```
*Espera un momento a que se complete la barra de carga. Sabrás que terminó cuando la terminal te permita escribir comandos otra vez.*

---

## CÓMO ENCENDER LA INTERFAZ VISUAL

Una vez instalado todo, pon a correr la pantalla con este comando:
```bash
npm run dev
```

### ¿Cómo abrir la aplicación?
Al ejecutar el comando, Vite te mostrará una dirección local en la terminal. 
1. Abre tu navegador web (Google Chrome, Edge, etc.).
2. En la barra de direcciones de arriba, escribe exactamente:
   `http://localhost:5173`
3. Presiona `Enter`.

---

## CÓMO USAR LA SIMULACIÓN
Una vez que entres a la página web:
* **Indicador de Servidor:** Si el Backend está encendido, verás un letrero verde que dice **"Conectado ✔"**. Si el Backend está apagado, dirá **"Desconectado ✖"** en rojo.

* **Botones Interactivos:** Presiona los botones de **Tomar Pedido**, **Empezar Cocina** o **Pedido Listo**. Cada vez que hagas clic en uno, la pantalla le enviará la orden en tiempo real al servidor para actualizar el estado del pedido en el restaurante.


---

## CÓMO APAGAR LA PANTALLA
Cuando quieras cerrar el entorno de desarrollo:
1. Ve a la terminal donde ejecutaste el comando.
2. Presiona las teclas **`Ctrl + C`** al mismo tiempo.
3. Si te pregunta *"¿Desea terminar el trabajo por lotes (S/N)?"*, escribe **`S`** y presiona `Enter`.


--------------------------------------------------------

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
