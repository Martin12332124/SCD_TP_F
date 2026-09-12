# Catálogo de Requisitos Extrafuncionales

## Sistema de Pedidos para Restaurante (POS + KDS)

Clasificación según ISO/IEC 25010 y tipo de restricción.

---

## Cómo leer este catálogo

Los requisitos funcionales dicen **qué** hace el sistema y están registrados como historias de
usuario (GitHub Issues). Este documento recoge los requisitos **extrafuncionales**: con qué
calidad debe hacerlo y bajo qué restricciones se construye.

Cada requisito se escribe como un **escenario de calidad medible**, con un estímulo (qué ocurre),
una respuesta (qué debe hacer el sistema) y una medida verificable. El catálogo es deliberadamente
corto: prioriza los requisitos que de verdad condicionan el diseño y que el equipo puede defender
uno por uno, en vez de una lista exhaustiva de baja utilidad para un proyecto de este tamaño.

**Tipo** (columna obligatoria del template de la asignatura):

| Tipo | Qué agrupa |
|------|------------|
| Calidad de servicio | Metas de calidad del producto, clasificadas por característica ISO/IEC 25010. Se indica la característica entre paréntesis. |
| Restricción técnica | Decisiones tecnológicas impuestas al equipo, que acotan el espacio de soluciones. |
| Restricción de proyecto | Límites de equipo, plazo, presupuesto y organización del trabajo. |
| Otros no funcionales | Requisitos que no encajan en las categorías anteriores. |

**Prioridad**: Alta, Media o Baja. Los REF de prioridad **Alta** quedan explícitamente abordados
en las decisiones de diseño arquitectónico de `Arquitectura.md`.

**Abreviaturas de característica ISO/IEC 25010**: Adec. (adecuación funcional), Efic. (eficiencia
de desempeño), Usab. (usabilidad), Fiab. (fiabilidad), Seg. (seguridad), Mant. (mantenibilidad),
Port. (portabilidad).

---

## 1. Adecuación funcional

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-01 | Calidad de servicio (Adec.) | Al registrarse la venta de un platillo, el sistema descuenta del inventario las cantidades exactas de ingredientes según su receta; al cerrar una mesa, calcula el total, la división de la cuenta y la propina sugerida sin error. | 0 diferencias entre lo esperado y lo calculado en 20 casos de prueba que cubran ambos escenarios (venta con receta y cierre de cuenta dividida entre varios comensales). | Media |
| REF-02 | Calidad de servicio (Adec.) | El sistema aplica exactamente los estados definidos para el pedido (Espera, En Cocina, Servido, Anulado, Cerrado) y rechaza cualquier transición no permitida. | 100% de las transiciones inválidas rechazadas, verificado con la matriz completa de pares origen-destino. | Media |

## 2. Eficiencia de desempeño

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-03 | Calidad de servicio (Efic.) | El envío de una comanda desde el POS y cualquier cambio de estado del pedido se reflejan en todas las pantallas conectadas (POS y KDS) sin recarga manual. | Latencia menor a 1 segundo dentro de la LAN, medida con 20 envíos consecutivos; 0 pantallas que requieran recarga manual. | Alta |
| REF-04 | Calidad de servicio (Efic.) | Los cronómetros de cocina (alertas a los 15 y 20 minutos) se mantienen precisos y el sistema no se degrada con varias mesas y pedidos simultáneos, corriendo en el equipo modesto disponible en el restaurante. | Desviación máxima de ± 2 segundos en el cronómetro; tiempos de respuesta estables con 10 mesas y 20 pedidos activos en simultáneo. | Media |

## 3. Usabilidad

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-05 | Calidad de servicio (Usab.) | El cocinero lee la comanda en el KDS desde su puesto de trabajo, con vapor, ruido visual y prisa, y distingue el estado de una mesa o de un pedido sin depender solo del color. | Texto legible a 2 metros de distancia, validado con un usuario; cada estado codificado con color más un ícono o forma redundante. | Alta |
| REF-06 | Calidad de servicio (Usab.) | Un trabajador nuevo aprende a usar el sistema con una capacitación breve, y agregar al pedido un ítem simple es una operación directa. | Capacitación de 30 minutos como máximo; 3 toques como máximo para agregar un ítem sin modificadores. | Media |
| REF-07 | Calidad de servicio (Usab.) | El paso de validación obligatoria de la comanda con el cliente, antes de enviarla a cocina, no vuelve lenta la toma del pedido. | 10 segundos adicionales como máximo por comanda, respecto de un flujo sin validación. | Media |

## 4. Fiabilidad

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-08 | Restricción técnica | La operación núcleo (toma de pedidos, comandas, KDS) funciona íntegramente sobre la red local del restaurante, sin depender de un enlace a Internet. | Prueba de desconexión del enlace WAN durante 60 minutos de operación simulada: 0 interrupciones y 0 funcionalidades núcleo degradadas. | Alta |
| REF-09 | Calidad de servicio (Fiab.) | Si el servidor local se cae o se reinicia durante el servicio, al volver ninguna comanda ya confirmada se pierde ni se duplica. | 0 comandas perdidas o duplicadas en 5 cortes simulados; servicio disponible de nuevo en 60 segundos como máximo. | Alta |
| REF-10 | Calidad de servicio (Fiab.) | El sistema está disponible durante todo el horario de atención, y una tablet que pierde momentáneamente la conexión Wi-Fi se recupera sola al volver, sin perder información. | Disponibilidad mínima de 99% del horario operativo; reconexión automática en 5 segundos como máximo tras cortes de hasta 30 segundos, sin comandas duplicadas. | Media |

## 5. Seguridad

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-11 | Calidad de servicio (Seg.) | Toda acción sobre datos del negocio requiere una sesión autenticada, y cada usuario solo accede a las funciones de su rol (mesero, cocinero, jefe de cocina, administrador). | 100% de las acciones rechazadas sin credencial válida o fuera del rol del usuario; autenticación mediante PIN de 4 a 6 dígitos por empleado. | Alta |
| REF-12 | Calidad de servicio (Seg.) | Como el sistema no procesa pagos con tarjeta ni se integra con pasarelas, no aplica PCI-DSS, pero protege las credenciales y registra las acciones críticas (anulación de pedido, ajuste de inventario) para poder auditarlas. | 0 datos de medios de pago almacenados; credenciales guardadas con hash y sal; cada acción crítica registrada con usuario, fecha/hora y detalle. | Media |

## 6. Mantenibilidad

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-13 | Calidad de servicio (Mant.) | El administrador agrega un platillo o ingrediente nuevo sin que el equipo de desarrollo intervenga, y el contrato entre servidor y clientes (POS/KDS) está documentado para que ambos frentes avancen en paralelo. | Alta de un platillo nuevo sin cambios de código ni despliegue; documentación de endpoints y eventos de tiempo real actualizada en el mismo pull request que los modifica. | Media |

## 7. Portabilidad

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-14 | Calidad de servicio (Port.) | El POS funciona en los dispositivos Android e iOS que ya usa el personal, y el KDS se ve correctamente tanto en la pantalla de cocina como en una tablet o celular de respaldo. | Pruebas superadas en Android 10 o superior e iOS 15 o superior; diseño adaptable verificado en al menos 2 resoluciones distintas. | Media |

## 8. Restricciones de proyecto

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-15 | Restricción de proyecto | El sistema lo desarrolla un equipo de 5 integrantes en un semestre, con fecha de cierre fija por entregable y sin presupuesto para infraestructura paga; por indicación del docente, el frontend y el backend viven en repositorios separados que deben leerse como un solo sistema. | Entregable 1 cerrado el 12/09/2026, sin commits posteriores; 0 servicios de nube pagos ni licencias comerciales; `ReqExtrafuncionales.md`, `DominioEntidades.md` y `Arquitectura.md` idénticos en ambos repositorios. | Media |

## 9. Otros requisitos no funcionales

| ID | Tipo | Requisito (escenario de calidad) | Métrica / Criterio de verificación | Prioridad |
|----|------|----------------------------------|------------------------------------|-----------|
| REF-16 | Otros no funcionales | Toda la interfaz está en español de Chile, con montos en pesos chilenos y formatos de fecha/hora locales. | 100% de los textos visibles en español; montos sin decimales y con separador de miles; fechas en formato dd/mm/aaaa. | Baja |

---

## Resumen del catálogo

| Tipo | Cantidad | IDs |
|------|----------|-----|
| Calidad de servicio | 13 | REF-01 a REF-07, REF-09 a REF-14 |
| Restricción técnica | 1 | REF-08 |
| Restricción de proyecto | 1 | REF-15 |
| Otros no funcionales | 1 | REF-16 |
| **Total** | **16** | |

| Prioridad | Cantidad | IDs |
|-----------|----------|-----|
| Alta | 5 | REF-03, REF-05, REF-08, REF-09, REF-11 |
| Media | 10 | REF-01, REF-02, REF-04, REF-06, REF-07, REF-10, REF-12, REF-13, REF-14, REF-15 |
| Baja | 1 | REF-16 |
| **Total** | **16** | |

Los 5 REF de prioridad Alta (tiempo real, legibilidad del KDS, operación sin Internet en la LAN,
persistencia sin pérdida de datos y seguridad por roles) quedan abordados uno a uno en la tabla de
justificación del estilo arquitectónico de `Arquitectura.md`. Los REF de prioridad Media y Baja se
abordan en las decisiones de diseño cuando corresponde, pero no comprometen la arquitectura.

## Compromisos asumidos (trade-offs)

Subir una característica de calidad suele bajar otra; estas son las tensiones que el equipo
reconoce y el punto de equilibrio elegido:

- **Seguridad frente a usabilidad (REF-11 frente a REF-06)**: se opta por PIN corto por empleado
  en vez de usuario y contraseña larga, porque el personal opera con las manos ocupadas y a ritmo
  alto. Se acepta una credencial más débil a cambio de un acceso de pocos segundos.
- **Prevención del error humano frente a rapidez (REF-07 frente a REF-03)**: el paso de validación
  obligatorio agrega fricción deliberada a la toma de pedidos. Es el corazón del proyecto, así que
  se acepta el costo y se acota a 10 segundos por comanda.
- **Alcance acotado frente a autonomía del restaurante (REF-08 frente a REF-15)**: operar solo en
  la red local del restaurante, sin presupuesto para servicios de nube pagos, hace al sistema
  inmune a las caídas del enlace a Internet, pero deja fuera cualquier función que dependa de
  servicios externos, como pasarelas de pago o sincronización remota.
