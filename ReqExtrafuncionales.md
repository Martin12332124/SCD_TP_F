# Catálogo de Requisitos Extrafuncionales

## Sistema de Pedidos para Restaurante (POS + KDS)

Clasificación según ISO/IEC 25010 y tipo de restricción.

---

## Cómo leer este catálogo

Los requisitos funcionales dicen **qué** hace el sistema y están registrados como historias de
usuario (GitHub Issues). Este documento recoge los requisitos **extrafuncionales**: con qué
calidad debe hacerlo y bajo qué restricciones se construye.

Cada requisito se escribe como un **escenario de calidad medible**, con un estímulo (qué ocurre),
una respuesta (qué debe hacer el sistema) y una medida verificable. Ningún requisito de este
catálogo queda sin un número o un criterio objetivo de aceptación: un requisito de calidad sin
número no se puede verificar, y lo que no se verifica no se cumple.

**Tipo** (columna obligatoria del template de la asignatura):

| Tipo | Qué agrupa |
|------|------------|
| Calidad de servicio | Metas de calidad del producto, clasificadas por característica ISO/IEC 25010. Se indica la característica entre paréntesis. |
| Restricción técnica | Decisiones tecnológicas impuestas al equipo, que acotan el espacio de soluciones. |
| Restricción de proyecto | Límites de equipo, plazo, presupuesto y organización del trabajo. |
| Otros no funcionales | Requisitos que no encajan en las categorías anteriores (idioma, formatos, evolución futura). |

**Prioridad**: Alta, Media o Baja. Los REF de prioridad **Alta** quedan explícitamente abordados
en las decisiones de diseño arquitectónico de `Arquitectura.md`.

**Abreviaturas de característica ISO/IEC 25010**: Adec. (adecuación funcional), Efic. (eficiencia
de desempeño), Compat. (compatibilidad), Usab. (usabilidad), Fiab. (fiabilidad), Seg. (seguridad),
Mant. (mantenibilidad), Port. (portabilidad).

---

## 1. Adecuación funcional

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-01 | Calidad de servicio (Adec.) | Cuando se registra la venta de un platillo, el sistema descuenta del inventario las cantidades exactas de cada ingrediente definidas en su receta (gramos, centímetros cúbicos, mililitros o unidades). | Diferencia 0 entre el consumo teórico de la receta y el descuento aplicado, verificado sobre 20 ventas de prueba que cubran las cuatro unidades de medida. | Alta |
| REF-02 | Calidad de servicio (Adec.) | Al cerrar una mesa, el sistema calcula el total, la división de la cuenta entre N comensales y la sugerencia de propina sin error de redondeo. | 0 diferencias en 30 casos de prueba, incluidos totales no divisibles; montos redondeados al peso chileno y la suma de las partes igual al total. | Media |
| REF-03 | Calidad de servicio (Adec.) | El sistema implementa exactamente los estados del pedido definidos como regla de dominio y rechaza cualquier transición no permitida, venga del POS o del KDS. | 100% de las transiciones inválidas rechazadas con mensaje explícito y sin cambio de estado, verificado con la matriz completa de pares origen-destino. | Media |

## 2. Eficiencia de desempeño

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-04 | Calidad de servicio (Efic.) | Cuando el mesero envía una comanda desde el POS, esta aparece en el KDS sin intervención del cocinero. | Latencia extremo a extremo dentro de la LAN menor a 1 segundo en el percentil 95, medida con 50 envíos consecutivos. | Alta |
| REF-05 | Calidad de servicio (Efic.) | Cuando un pedido cambia de estado, el cambio se propaga a todas las pantallas conectadas (POS del mesero y KDS) sin refresco manual ni recarga de página. | Actualización visible en menos de 1 segundo en el percentil 95, en todos los clientes conectados; 0 pantallas que requieran recarga manual. | Alta |
| REF-06 | Calidad de servicio (Efic.) | Los cronómetros de cocina que gatillan las alertas de retraso (15 minutos) y crítica (20 minutos) se mantienen precisos aunque haya varios pedidos en curso. | Desviación máxima de ± 2 segundos respecto del reloj del servidor, medida con 20 pedidos simultáneos a los 20 minutos de ejecución. | Media |
| REF-07 | Calidad de servicio (Efic.) | En hora punta, el sistema opera con varias mesas y pedidos en curso sin degradación perceptible. | 10 mesas abiertas y 20 pedidos activos en simultáneo manteniendo los umbrales de REF-04 y REF-05; tiempo de respuesta de las pantallas menor a 2 segundos en el percentil 95. | Media |
| REF-08 | Calidad de servicio (Efic.) | El servidor local corre en el equipo disponible en el restaurante, no en hardware dedicado de servidor. | Operación estable en un equipo de 4 GB de RAM y CPU de dos núcleos, con uso de memoria del proceso servidor menor a 512 MB bajo la carga de REF-07. | Baja |

## 3. Compatibilidad

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-09 | Calidad de servicio (Compat.) | Al finalizar la jornada, el administrador exporta el cierre de ventas en un formato que la contabilidad del restaurante pueda abrir sin transformación manual. | Exportación en CSV (UTF-8, separador punto y coma) y JSON; el archivo abre correctamente en planilla de cálculo y contiene fecha, mesa, ítems, cantidades y totales. | Media |
| REF-10 | Calidad de servicio (Compat.) | El sistema convive en la red Wi-Fi del restaurante con el resto de los dispositivos del local, sin requerir una red dedicada. | Consumo en régimen menor a 64 kbps por dispositivo conectado; el servidor escucha en puertos no privilegiados (mayores a 1024) y no exige cambios en la configuración del router. | Baja |

## 4. Usabilidad

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-11 | Calidad de servicio (Usab.) | El cocinero lee la comanda en el KDS desde su puesto de trabajo, sin acercarse a la pantalla y en un ambiente con vapor, ruido visual y prisa. | Texto del cuerpo de la comanda de al menos 24 px y número de mesa de al menos 48 px; razón de contraste mínima de 4,5:1 (WCAG 2.1 AA); lectura correcta a 2 metros de distancia validada con 3 usuarios. | Alta |
| REF-12 | Calidad de servicio (Usab.) | El paso de validación obligatorio con el cliente, previo al envío de la comanda, no debe volver lenta la toma de pedidos. | Como máximo 10 segundos adicionales y 2 toques por comanda respecto del flujo sin validación, medido en 10 tomas de pedido cronometradas. | Media |
| REF-13 | Calidad de servicio (Usab.) | El mesero y el cocinero distinguen el estado de una mesa (Libre u Ocupada) y el estado de un pedido sin leer texto y sin depender de la percepción del color. | Cada estado se codifica con color más un ícono o forma redundante; contraste mínimo de 3:1 entre estados adyacentes; identificación correcta por parte de un usuario con simulación de daltonismo (deuteranopía y protanopía). | Media |
| REF-14 | Calidad de servicio (Usab.) | Un trabajador nuevo del restaurante opera el sistema tras una capacitación breve, sin manual. | Capacitación de 30 minutos como máximo para el mesero y 15 minutos para el cocinero; 8 de cada 10 usuarios completan la tarea principal de su rol sin ayuda externa. | Media |
| REF-15 | Calidad de servicio (Usab.) | Agregar a la comanda un ítem del menú que no requiere modificadores es una operación directa. | 3 toques como máximo desde la pantalla de la mesa hasta el ítem agregado a la comanda. | Media |

## 5. Fiabilidad

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-16 | Restricción técnica | La operación núcleo (toma de pedidos, envío de comandas, KDS y cierre de mesa) funciona íntegramente sobre la red local del restaurante, sin depender de un enlace a Internet. | Prueba de desconexión del enlace WAN durante 60 minutos de operación simulada: 0 interrupciones y 0 funcionalidades núcleo degradadas. | Alta |
| REF-17 | Calidad de servicio (Fiab.) | Si el servidor local se cae o se reinicia durante el servicio, al volver no se pierde ninguna comanda ya confirmada. | Persistencia transaccional en disco en el momento de confirmar la comanda; 0 comandas confirmadas perdidas y 0 duplicadas tras 10 cortes abruptos de energía simulados; servicio disponible nuevamente en 60 segundos como máximo. | Alta |
| REF-18 | Calidad de servicio (Fiab.) | El sistema está disponible durante todo el horario de atención del restaurante. | Disponibilidad mínima de 99,5% del horario operativo, equivalente a 1,8 horas de indisponibilidad acumulada al mes sobre una base de 360 horas de servicio. | Media |
| REF-19 | Calidad de servicio (Fiab.) | Si una tablet o pantalla pierde momentáneamente la conexión Wi-Fi dentro del local, al recuperarla vuelve a mostrar el estado real sin que el usuario tenga que recargar. | Reconexión automática y estado completo restaurado en 5 segundos como máximo tras cortes de hasta 30 segundos; 0 comandas duplicadas y 0 cambios de estado perdidos en 10 repeticiones. | Media |

## 6. Seguridad

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-20 | Calidad de servicio (Seg.) | Toda acción sobre datos del negocio (abrir mesa, enviar comanda, cambiar estado, ajustar inventario, cerrar cuenta) requiere una sesión autenticada. | 100% de los endpoints y eventos de tiempo real rechazan la solicitud sin credencial válida; la sesión expira a las 12 horas o al cierre de turno, lo que ocurra primero. | Alta |
| REF-21 | Calidad de servicio (Seg.) | Cada usuario solo accede a las funciones de su rol: mesero, cocinero, jefe de cocina o administrador. | 100% de los intentos de ejecutar una acción fuera del rol son rechazados y registrados; autenticación mediante PIN de 4 a 6 dígitos por empleado, con bloqueo de 5 minutos tras 5 intentos fallidos. | Alta |
| REF-22 | Calidad de servicio (Seg.) | El sistema no procesa pagos con tarjeta ni se integra con pasarelas de pago, por lo que no aplica el cumplimiento PCI-DSS; aun así protege las credenciales y los datos de ventas. | 0 datos de medios de pago almacenados; credenciales guardadas con función de hash con sal y factor de costo mínimo 10; respaldo diario del archivo de datos en almacenamiento del local. | Media |
| REF-23 | Calidad de servicio (Seg.) | Las acciones críticas (anulación de pedido y ajuste manual de inventario) quedan registradas para poder auditarlas después. | 100% de esas acciones registran usuario, marca de tiempo y detalle de la operación; el registro es consultable solo por el administrador y se conserva 12 meses como mínimo. | Media |

## 7. Mantenibilidad

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-24 | Calidad de servicio (Mant.) | El administrador incorpora un platillo nuevo con su receta, o un ingrediente nuevo, sin que el equipo de desarrollo intervenga. | 0 cambios en el esquema de datos y 0 despliegues de código; la operación se completa en 5 minutos como máximo desde la interfaz de administración. | Alta |
| REF-25 | Calidad de servicio (Mant.) | El contrato entre el servidor y los clientes POS y KDS está documentado, de modo que ambos frentes se desarrollen en paralelo sin bloquearse. | 100% de los endpoints REST y de los eventos de tiempo real documentados (nombre, dirección, carga útil y errores); la documentación se actualiza en el mismo pull request que modifica el contrato. | Alta |
| REF-26 | Restricción de proyecto | Todo cambio en cualquiera de los dos repositorios entra revisado y con estilo homogéneo. | 0 errores del analizador estático y del formateador en la rama por defecto; 100% de los cambios integrados mediante pull request desde una rama propia, con al menos una revisión de otro integrante. | Media |
| REF-27 | Calidad de servicio (Mant.) | El restaurante ajusta los umbrales de alerta de cocina (hoy 15 y 20 minutos) según su propia operación. | Umbrales parametrizables por configuración, sin recompilar ni modificar código; el cambio toma efecto en 1 minuto como máximo sin reiniciar los clientes. | Media |

## 8. Portabilidad

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-28 | Restricción técnica | El POS funciona en los dispositivos móviles que ya usa el personal de salón, sean Android o iOS, en tablet o smartphone. | Pruebas superadas en Android 10 o superior e iOS 15 o superior, en al menos un dispositivo de cada sistema operativo. | Alta |
| REF-29 | Calidad de servicio (Port.) | El KDS se ve correctamente tanto en la pantalla táctil industrial de la cocina como en una tablet o un celular de respaldo. | Diseño adaptable verificado en 3 resoluciones: 1920×1080 (pantalla táctil), 1280×800 (tablet) y 390×844 (celular), sin desplazamiento horizontal ni texto cortado. | Alta |
| REF-30 | Calidad de servicio (Port.) | El restaurante instala el servidor local en su propio equipo siguiendo el instructivo del repositorio, sin apoyo de un administrador de sistemas. | Instalación completa y verificada en 30 minutos como máximo sobre Windows 10 o superior y sobre Linux, siguiendo únicamente el `README.md`. | Media |

## 9. Restricciones técnicas

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-31 | Restricción técnica | El sistema se construye sobre la base tecnológica ya establecida por el equipo: servidor en Node.js con Express y comunicación de tiempo real con Socket.IO; clientes POS y KDS en React con Vite. | 100% del código de los dos repositorios sobre ese stack; cualquier incorporación de una tecnología distinta requiere una decisión de diseño documentada en `Arquitectura.md`. | Media |
| REF-32 | Restricción técnica | El POS y el KDS se distribuyen como aplicación web servida desde el servidor local, sin pasar por tiendas de aplicaciones. | Actualización de los clientes disponible en todos los dispositivos con solo recargar, en 1 minuto como máximo desde el despliegue y sin reinstalar nada en cada equipo. | Media |

## 10. Restricciones de proyecto

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-33 | Restricción de proyecto | El sistema lo desarrolla un equipo de 5 integrantes con dedicación parcial, dentro de un semestre académico y con fecha de cierre fija para cada entregable. | Alcance ajustado a 5 personas y al plazo del curso; Entregable 1 cerrado el 12/09/2026, sin commits posteriores a la hora de cierre. | Alta |
| REF-34 | Restricción de proyecto | Por indicación del docente, el frontend y el backend viven en repositorios GitHub separados, y aun así el diseño debe leerse como un solo sistema. | `ReqExtrafuncionales.md`, `DominioEntidades.md` y `Arquitectura.md` idénticos en ambos repositorios; el `README.md` de cada repositorio enlaza al otro. | Media |
| REF-35 | Restricción de proyecto | El restaurante no incurre en costos recurrentes de infraestructura para operar el sistema. | 0 servicios de nube de pago y 0 licencias comerciales; toda la operación sobre el equipo local y los dispositivos que el restaurante ya tiene. | Alta |

## 11. Evolución y otros requisitos no funcionales

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-36 | Otros no funcionales | Toda la interfaz y los mensajes del sistema están en español de Chile y usan los formatos locales del negocio. | 100% de los textos visibles en español; montos en pesos chilenos sin decimales y con separador de miles; fechas en formato dd/mm/aaaa y horas en formato de 24 horas; terminología única del negocio (mesero, comanda, mesa, cuenta), sin sinónimos alternados. | Baja |
| REF-37 | Otros no funcionales | En una fase posterior, la cocina podrá dividir el KDS por estaciones de preparación (por ejemplo, barra y cocina caliente) sin rediseñar el sistema. | La clasificación de cada ítem por categoría de preparación queda desacoplada del envío de eventos en tiempo real; habilitar una segunda estación no requiere modificar el módulo de comandas. | Baja |
| REF-38 | Otros no funcionales | El sistema acompaña el crecimiento del restaurante en número de mesas y tamaño del menú. | Hasta 40 mesas y 300 ítems de menú manteniendo los umbrales de REF-04, REF-05 y REF-07. | Baja |

---

## Resumen del catálogo

| Tipo | Cantidad | IDs |
|------|----------|-----|
| Calidad de servicio | 27 | REF-01 a REF-15, REF-17 a REF-25, REF-27, REF-29, REF-30 |
| Restricción técnica | 4 | REF-16, REF-28, REF-31, REF-32 |
| Restricción de proyecto | 4 | REF-26, REF-33, REF-34, REF-35 |
| Otros no funcionales | 3 | REF-36, REF-37, REF-38 |
| **Total** | **38** | |

| Prioridad | Cantidad | IDs |
|-----------|----------|-----|
| Alta | 14 | REF-01, REF-04, REF-05, REF-11, REF-16, REF-17, REF-20, REF-21, REF-24, REF-25, REF-28, REF-29, REF-33, REF-35 |
| Media | 19 | REF-02, REF-03, REF-06, REF-07, REF-09, REF-12, REF-13, REF-14, REF-15, REF-18, REF-19, REF-22, REF-23, REF-26, REF-27, REF-30, REF-31, REF-32, REF-34 |
| Baja | 5 | REF-08, REF-10, REF-36, REF-37, REF-38 |
| **Total** | **38** | |

Los 14 REF de prioridad Alta quedan abordados uno a uno en la tabla de justificación del estilo
arquitectónico de `Arquitectura.md`. Los REF de prioridad Media y Baja se abordan en las decisiones
de diseño cuando corresponde, pero no comprometen la arquitectura.

## Compromisos asumidos (trade-offs)

Subir una característica de calidad suele bajar otra; estas son las tensiones que el equipo
reconoce y el punto de equilibrio elegido:

- **Seguridad frente a usabilidad (REF-21 frente a REF-14 y REF-15)**: se opta por PIN corto por
  empleado en vez de usuario y contraseña larga, porque el personal opera con las manos ocupadas y
  a ritmo alto. Se acepta una credencial más débil a cambio de un acceso de pocos segundos.
- **Prevención del error humano frente a rapidez (REF-12 frente a REF-04)**: el paso de validación
  obligatorio agrega fricción deliberada a la toma de pedidos. Es el corazón del proyecto, así que
  se acepta el costo y se acota a 10 segundos por comanda.
- **Fiabilidad local frente a alcance funcional (REF-16 y REF-35)**: operar solo en la red local
  del restaurante hace al sistema inmune a las caídas del enlace a Internet, pero deja fuera
  cualquier función que dependa de servicios externos, como pasarelas de pago o pedidos en línea.
- **Simplicidad frente a escalabilidad (REF-33 frente a REF-38)**: el tamaño del equipo y el plazo
  del curso empujan hacia una solución simple de construir y desplegar. Se prioriza terminar un
  sistema coherente para un restaurante por sobre soportar una cadena de locales.
