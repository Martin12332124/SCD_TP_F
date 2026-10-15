# Proceso de refinamiento de historias de usuario con Clarita Review

**Proyecto:** Sistema POS + KDS  | **Asignatura:** ISF225 Fundamentos de Ingeniería de Software | **Entregable 2**

## 1. Resumen

Las historias de usuario del proyecto se refinaron utilizando la herramienta de revisión asistida por IA Clarita Review. A partir de 10 historias iniciales, con criterios de aceptación breves y sin Definition of Done, se obtuvo un conjunto de 13 historias con criterios más específicos y verificables, y una Definition of Done (DoD) para el proyecto.

- **Chat con Clarita Review (evidencia del proceso):** https://chatgpt.com/share/6ad0f50d-29dc-83e9-91c4-792a26ead5aa
- **Historias iniciales:** ver Anexo A.
- **Historias refinadas y DoD:** ver Anexo B.

## 2. Cómo se hizo

1. **Contexto.** Se le explicó a Clarita qué es el sistema y quiénes lo usan. Luego, ella construyó a través de preguntas el modelo verbal de la solución para que las historias fueran coherentes.
2. **Revisión una por una.** Cada historia se entregó con sus criterios iniciales. Clarita evaluó su calidad con los criterios INVEST, señaló ambigüedades y propuso criterios de aceptación en formato Dado/Cuando/Entonces.
3. **Visión de conjunto.** Con las diez revisadas, Clarita detectó relaciones entre historias y tres decisiones que afectaban a varias: estados de los pedidos, estados de las mesas y cálculo de precios con variantes.
4. **Versión mejorada y DoD.** Con esas decisiones acordadas, se reescribieron las historias y se creó la Definition of Done.
5. **Nuevas historias.** El equipo decidió que algunos aspectos de la historias podían dividirse. Se separaron tres nuevas (US-11, US-12 y US-13), que también se revisaron con Clarita y se ajustaron con su feedback.
6. **Revisión del equipo.** El equipo contrastó las propuestas con el modelo del sistema y decidió realizar ajustes tanto a las historias como la DoD. La herramienta se usó como apoyo, y las decisiones finales las tomó el equipo.

## 3. Cómo mejoraron las historias

- **Criterios verificables:** los criterios pasaron de describir solo el caso esperado a cubrir errores, validaciones, valores límite y reglas de negocio, todos en formato Dado/Cuando/Entonces.
- **Historias más pequeñas:** las que reunían varias responsabilidades se dividieron, por ejemplo la anulación de pedidos, la gestión de cuentas y el cálculo del importe.
- **Términos definidos:** frases vagas como "se actualiza" o "desaparece" se reemplazaron por comportamientos concretos, por ejemplo que un pedido entregado sale de las listas pero se conserva en el historial.
- **Coherencia entre historias:** se unificaron los estados de pedidos y mesas, la terminología (mesero en lugar de camarero o mozo) y la relación entre mesa y cuenta.
- **Definition of Done:** el proyecto no tenía una. Se creó una lista de verificación que incluye pruebas, validaciones, revisión por otro integrante y el flujo de trabajo en GitHub.

## 4. Resumen por historia

| Historia | Criterios antes -> después | Principal mejora |
| --- | --- | --- |
| US-01 Selector de variantes | 2 -> 6 | Variantes obligatorias, cancelar selección y precio con recargo |
| US-02 Detalles del pedido | 2 -> 5 | Notas asociadas al producto y alergias destacadas |
| US-03 Notas a productos | 2 -> 6 | Notas vacías, largo máximo y marca de alergia |
| US-04 Disponibilidad | 2 -> 5 | Bloqueo de productos agotados y cambio solo por administrador |
| US-05 Transferir cuenta | 2 -> 5 | Destino libre y transferencia sin cambios parciales |
| US-06 Estado del pedido | 3 -> 6 | Transiciones válidas y rechazo de las no permitidas |
| US-07 Precio del producto | 2 -> 4 | Rango de precio válido y producto inexistente |
| US-08 Estado de mesas | 2 -> 5 | Consistencia con las cuentas e identificación de la mesa |
| US-09 Abrir y liberar mesa | 2 -> 5 | Mesa distinta de cuenta y no liberar con actividad |
| US-10 Retirar pedidos entregados | 2 -> 4 | Entrega registrada y historial conservado |
| US-11 Anular pedido *(nueva)* | - -> 5 | Anulación con confirmación y validación del estado |
| US-12 Abrir y cerrar cuenta *(nueva)* | - -> 9 | Ciclo de vida de la cuenta y reglas de cierre |
| US-13 Calcular importe *(nueva)* | - -> 7 | Precio unitario, subtotal, total y precio aplicado |

---

## Anexo A — Historias de usuario iniciales


### US-01: Selector de variantes-bebida
**Épica:** Selección de variantes
**Descripción:**
Como camarero,
quiero seleccionar una bebida base para que el sistema despliegue automáticamente sus variantes disponibles,
para poder registrar el pedido exacto del cliente de forma rápida.
#### Criterios de aceptación
- Dado que el camarero selecciona una bebida base en el menú digital, cuando esta bebida tiene opciones múltiples, entonces el sistema despliega automáticamente una lista con las variantes disponibles (ej. tamaño, sabor).
- Dado que el sistema muestra las variantes de una bebida, cuando el camarero selecciona una opción específica, entonces el sistema actualiza el subtotal del producto según el precio de esa variante.
---
### US-02: Descripción compacta del pedido
**Épica:** Visualización de detalles del pedido
**Descripción:**
Como cocinero,
quiero poder ver los detalles y notas de cada pedido,
para saber rápidamente si el cliente tiene alguna alergia o restricción con algún ingrediente.
#### Criterios de aceptación
- Dado que el cocinero está visualizando la lista de pedidos en la pantalla de cocina, cuando llega un nuevo pedido que incluye notas o modificaciones, entonces el sistema muestra la descripción detallada de esas notas junto a los platillos correspondientes.
- Dado que un pedido contiene una nota específica sobre una alergia indicada por el cliente, cuando este se despliega en la pantalla de cocina, entonces el sistema resalta esa alerta de forma visual y prioritaria (ej. con un color distintivo o ícono de advertencia).
---
### US-03: Agregación de notas a los pedidos
**Épica:** Personalización de pedidos
**Descripción:**
Como camarero,
quiero agregar notas específicas a los productos de un pedido,
para comunicar a la cocina las preferencias o restricciones del cliente.
#### Criterios de aceptación
- Dado que el camarero selecciona un producto en el carrito de compras, cuando decide agregar una personalización, entonces el sistema habilita un campo de texto para ingresar las especificaciones.
- Dado que se ingresó una nota en un producto, cuando el camarero guarda los cambios, entonces el sistema vincula la nota exclusivamente a ese ítem y la muestra en el resumen del carrito antes de confirmar la orden.
---
### US-04: Disponibilidad en los menús
**Épica:** Menú y Disponibilidad
**Descripción:**
Como mesero,
quiero visualizar rápidamente si un producto está agotado en el menú digital,
para evitar ofrecer o tomar órdenes de platillos que ya no se pueden preparar en cocina.
#### Criterios de aceptación
- Dado que un producto se queda sin inventario o se marca como no disponible, cuando el mesero consulta el menú, entonces el ítem aparece deshabilitado visualmente con una etiqueta de "Agotado".
- Dado que un producto tiene estado "Agotado", cuando el mesero intenta agregarlo a un pedido activo, entonces el sistema bloquea la acción y muestra una alerta indicando que no se puede ordenar.
---
### US-05: Posibilidad de cambio de clientes-mesas
**Épica:** Reasignación de clientes
**Descripción:**
Como mesero,
quiero transferir la cuenta y los pedidos activos de una mesa a otra,
para mantener un registro correcto de los consumos si los clientes solicitan cambiar de lugar.
#### Criterios de aceptación
- Dado que una mesa de origen tiene una cuenta abierta, cuando el mesero selecciona "Mover cuenta" y elige una mesa de destino que esté libre, entonces todos los artículos consumidos y pendientes se trasladan a la nueva mesa.
- Dado que se completa la transferencia de los pedidos, cuando el sistema actualiza la vista general, entonces la mesa original cambia su estado a "Libre" y la mesa de destino cambia a "Ocupada".
---
### US-06: Actualización de pedidos en la cocina
**Descripción:**
Como cocinero,
quiero cambiar el estado de los pedidos,
para que el mozo y el sistema sepan en que estado esta la preparación.
#### Criterios de aceptación
- Dado que un pedido está en espera, cuando el cocinero lo marca como "en cocina", entonces el estado del pedido cambia correctamente.
- Dado que un pedido está en cocina, cuando el cocinero lo marca como "Listo" o "Servido", entonces el estado del pedido cambia correctamente.
- Dado que el estado del pedido cambió, cuando se guarda el cambio, entonces el sistema actualiza su información visual.
---
### US-07: Registrar precio al crear o editar
**Descripción:**
Como administrador del local,
quiero ingresar el precio de un platillo al crearlo o editarlo del menú,
para que el sistema pueda calcular correctamente el total de cada pedido.
#### Criterios de aceptación
- Dado que se está creando un nuevo ítem del menú, cuando se completa el formulario sin un precio o con un precio negativo, entonces el sistema rechaza la creación y muestra un mensaje de error.
- Dado que se está creando un nuevo ítem del menú con un precio válido, cuando se confirma la creación, entonces el ítem se guarda con ese precio y queda disponible para ser pedido.
---
### US-08: Ver mapa de mesas
**Épica:** Gestión de mesas
**Descripción:**
Como camarero,
quiero ver el estado de cada mesa,
para saber de un vistazo que mesa esta libre u ocupada.
#### Criterios de aceptación
- Dado que el camarero abre el sistema, cuando la pantalla carga, entonces se muestran todas las mesas con un identificador visual "Libre" u "Ocupado".
- Dado que el mapa ya esta abierto, cuando el estado de una mesa cambia, entonces este cambio se refleja en el sistema.
---
### US-09: Abrir o cerrar una mesa
**Épica:** Gestión de pedidos
**Descripción:**
como mesero,
quiero cambiar el estado de un mesa entre "Libre" y "Ocupada",
para mostrar cuando llegan o se retiran clientes.
#### Criterios de aceptación
- Dado que una mesa esta en estado "Libre", cuando se le asigna un pedido, entonces la mesa cambia de estado a "Ocupada".
- Dado que una mesa esta en estado "Ocupada", cuando se cierra su cuenta, entonces la mesa cambia de estado a "Libre".
---
### US-10: Limpieza al servir un pedido
**Épica:** Pedidos en cocina
**Definición:**
Como cocinero,
quiero que un pedido ya servido desaparezca o deje de mostrarse junto los demás pedidos,
para mantener la pantalla limpia y poder enfocarse en lo pendiente.
#### Criterios de aceptación
- Dado que un pedido es visible en pantalla de el cocinero, cuando su estado cambia a "servido", entonces desaparece de la pantalla de los pedidos pendientes
- Dado que un pedido esta visible en la pantalla de un mesero, cuando su estado cambia a "servido", entonces desparece de la pantalla de los pedidos pendientes.

---

## Anexo B — Historias refinadas y Definition of Done


### US-01 — Selector de variantes de bebida
**Épica:** Selección de variantes
**Historia:** Como mesero, quiero seleccionar una bebida y sus variantes disponibles para registrar el pedido con la presentación y el precio correctos.
#### Criterios de aceptación
1. Mostrar variantes. Dada una bebida con variantes configuradas, cuando el mesero la seleccione, entonces el POS mostrará las variantes disponibles (tamaño, sabor).
2. Seleccionar una variante. Dada una bebida con variantes, cuando el mesero elija una, entonces el pedido reflejará la variante elegida.
3. Mostrar el precio unitario. Dada una variante con recargo, cuando el mesero la seleccione, entonces el POS mostrará el precio unitario según la regla de US-13.
4. Evitar selecciones incompletas. Dada una bebida que requiere variante, cuando el mesero intente agregarla sin elegir, entonces el sistema impedirá agregarla y señalará qué falta.
5. Cancelar la selección. Dado el menú de variantes abierto, cuando el mesero cancele antes de confirmar, entonces el sistema volverá al menú sin agregar nada al pedido.
6. Mantener el detalle. Dada una bebida agregada, cuando el mesero consulte el pedido, entonces verá la bebida y sus variantes seleccionadas.
---
### US-02 — Visualizar detalles y restricciones del pedido
**Épica:** Visualización de detalles del pedido
**Historia:** Como cocinero, quiero consultar los detalles y las notas de cada producto solicitado para preparar los platos respetando las preferencias y restricciones del cliente.
#### Criterios de aceptación
1. Mostrar detalles. Dado un pedido recibido en el KDS, cuando el cocinero lo consulte, entonces verá los productos, sus variantes y sus notas.
2. Asociar las notas. Dado un pedido con notas en uno o varios productos, cuando se muestre en cocina, entonces cada nota aparecerá junto al producto al que corresponde.
3. Destacar alergias. Dada una nota marcada como alergia o restricción (US-03), cuando se muestre en el KDS, entonces aparecerá con ícono de advertencia y color distintivo.
4. Productos sin notas. Dado un producto sin notas, cuando se muestre en cocina, entonces no se mostrará ninguna nota ni espacio vacío para notas.
5. Conservar las notas. Dado un pedido con notas, cuando cambie de estado, entonces las notas seguirán asociadas a su producto.
---
### US-03 — Agregar notas a los productos del pedido
**Épica:** Personalización de pedidos
**Historia:** Como mesero, quiero agregar notas a productos específicos de un pedido para comunicar a cocina las preferencias o restricciones de los clientes.
#### Criterios de aceptación
1. Ingresar y asociar. Dado un producto del pedido, cuando el mesero lo seleccione para editar y guarde una nota de texto, entonces la nota quedará vinculada solo a ese producto.
2. Revisar antes de confirmar. Dado un pedido con notas guardadas, cuando el mesero lo revise antes de confirmarlo, entonces verá cada nota junto a su producto.
3. Editar. Dado un producto con nota, cuando el mesero la edite y guarde antes de confirmar, entonces se mostrará el texto actualizado.
4. Evitar notas vacías. Dada una nota vacía o con solo espacios, cuando el mesero intente guardarla, entonces el sistema no creará la nota y mostrará un aviso.
5. Largo máximo. Dada una nota, cuando tenga entre 1 y 200 caracteres, entonces se guardará; si tiene 201 o más, el sistema mostrará un aviso indicando el límite.
6. Marcar alergia o restricción. Dada una nota, cuando el mesero la marque como "alergia o restricción alimentaria", entonces quedará registrada con esa marca para que se destaque en cocina (US-02).
---
### US-04 — Consultar y gestionar la disponibilidad de productos
**Épica:** Menú y disponibilidad
**Historia:** Como mesero, quiero consultar la disponibilidad de los productos del menú para evitar ofrecer productos que el restaurante no puede servir.
#### Criterios de aceptación
1. Mostrar productos agotados. Dado un producto no disponible, cuando el mesero consulte el menú, entonces aparecerá con la etiqueta "Agotado".
2. Bloquear productos agotados. Dado un producto no disponible, cuando el mesero intente agregarlo a un pedido, entonces el sistema impedirá la operación y mostrará un aviso.
3. Permitir productos disponibles. Dado un producto disponible, cuando el mesero lo seleccione, entonces podrá agregarlo al pedido.
4. Actualizar la disponibilidad. Dado un producto, cuando el administrador cambie su disponibilidad, entonces el POS mostrará el nuevo estado en su siguiente consulta.
5. Restringir el cambio. Dado un usuario con rol distinto de administrador, cuando intente cambiar la disponibilidad, entonces el sistema lo impedirá.
---
### US-05 — Transferir una cuenta entre mesas
**Épica:** Gestión de mesas y cuentas
**Historia:** Como mesero, quiero transferir la cuenta y los pedidos activos de una mesa a otra mesa libre para mantener correctamente asociado el consumo cuando los clientes cambien de lugar.
#### Criterios de aceptación
1. Iniciar la transferencia. Dada una mesa ocupada con cuenta abierta, cuando el mesero elija "Mover cuenta", entonces podrá seleccionar una mesa de destino.
2. Validar el destino. Dada una mesa de destino que no esté `Libre`, cuando el mesero intente seleccionarla, entonces el sistema impedirá la transferencia y explicará el motivo.
3. Transferir todo y conservar detalles. Dada una transferencia válida, cuando el mesero la confirme, entonces la cuenta y todos sus pedidos pasarán a la mesa de destino conservando productos, cantidades, precios, variantes, notas y estados.
4. Actualizar las mesas. Dada una transferencia completada, cuando el sistema actualice la vista, entonces la mesa de destino quedará `Ocupada` y la de origen `Libre`.
5. Evitar transferencias parciales. Dada una transferencia que falle, cuando ocurra el error, entonces la cuenta seguirá completa en la mesa de origen y la operación no se mostrará como completada.
---
### US-06 — Actualizar el estado de preparación del pedido
**Épica:** Seguimiento de pedidos en cocina
**Historia:** Como cocinero, quiero actualizar el estado de preparación de los pedidos para que el equipo de sala conozca su avance y pueda coordinar el servicio.
#### Criterios de aceptación
1. Recibir un pedido. Dado un pedido confirmado por el mesero, cuando llegue al KDS, entonces tendrá el estado `En Espera`.
2. Iniciar preparación. Dado un pedido `En Espera`, cuando el cocinero indique que comienza, entonces el estado cambiará a `En Cocina`.
3. Marcar como listo. Dado un pedido `En Cocina`, cuando el cocinero indique que terminó, entonces el estado cambiará a `Listo`.
4. Reflejar el cambio. Dado un cambio de estado guardado, cuando el POS consulte el pedido, entonces verá el estado actualizado.
5. Rechazar transiciones no permitidas. Dado un pedido, cuando se intente una transición distinta de `En Espera → En Cocina` o `En Cocina → Listo` (saltar un estado, retroceder, o cambiar un pedido `Listo`, `Anulado` o `Cerrado`), entonces el sistema rechazará el cambio, conservará el estado vigente y explicará el motivo.
6. Pedido o estado inválido. Dado un pedido inexistente o un estado desconocido, cuando se solicite el cambio, entonces el sistema lo rechazará sin modificar ningún dato.
---
### US-07 — Registrar y editar el precio base de un producto
**Épica:** Gestión de productos y precios
**Historia:** Como administrador del restaurante, quiero registrar y editar el precio base de cada producto para que el POS calcule correctamente el importe de los pedidos.
#### Criterios de aceptación
1. Registrar un precio válido. Dado que el administrador crea un producto, cuando ingrese un precio entero entre 1 y 1.000.000 CLP y guarde, entonces el producto quedará registrado con ese precio base.
2. Validar el precio. Dado un precio vacío, 0, negativo, con decimales, no numérico o mayor al limite establecido, cuando el administrador intente guardar, entonces el sistema rechazará el dato y mostrará un mensaje que indique la regla incumplida.
3. Editar el precio. Dado un producto existente, cuando el administrador guarde un precio válido, entonces el nuevo precio quedará registrado para las nuevas operaciones.
4. Producto inexistente. Dado un producto que no existe, cuando se intente editar su precio, entonces el sistema responderá que no existe sin crear datos.
---
### US-08 — Visualizar el estado de las mesas
**Épica:** Gestión de mesas
**Historia:** Como mesero, quiero visualizar el estado de las mesas en una vista general para identificar rápidamente cuáles están libres y cuáles ocupadas.
#### Criterios de aceptación
1. Mostrar las mesas. Dado que el mesero abre la vista de mesas, cuando cargue la información, entonces verá todas las mesas registradas.
2. Distinguir estados. Dada una mesa, cuando se muestre en la vista, entonces aparecerá como `Libre` u `Ocupada` según su estado vigente.
3. Reflejar cambios. Dada una mesa cuyo estado cambia, cuando se actualice la vista, entonces se mostrará el nuevo estado.
4. Consistencia con las cuentas. Dada una mesa con cuenta o pedidos activos, cuando se consulte su estado, entonces no aparecerá como `Libre`.
5. Identificar la mesa. Dada la vista general, cuando el mesero seleccione una mesa, entonces verá su número o nombre y su cuenta abierta, si la tiene.
---
### US-09 — Abrir y liberar una mesa
**Épica:** Gestión de mesas
**Historia:** Como mesero, quiero cambiar manualmente el estado de una mesa para indicar cuándo comienza a utilizarse y cuándo queda disponible nuevamente.
#### Criterios de aceptación
1. Marcar como ocupada. Dada una mesa `Libre`, cuando el mesero la marque como ocupada, entonces el sistema guardará el estado `Ocupada`.
2. Mesa no es cuenta. Dada una mesa `Ocupada` sin cuenta, cuando el mesero la consulte, entonces el sistema distinguirá la ocupación de la existencia de una cuenta; marcar la mesa no crea una cuenta (ver US-12).
3. Impedir liberar con actividad. Dada una mesa con cuenta abierta o pedidos activos, cuando el mesero intente marcarla como libre, entonces el sistema rechazará la operación y explicará el motivo.
4. Liberar una mesa disponible. Dada una mesa sin cuentas ni pedidos activos, cuando el mesero la marque como libre, entonces el sistema guardará el estado `Libre`.
5. Reflejar el cambio. Dado un cambio confirmado, cuando el mesero vuelva a consultar las mesas, entonces verá el estado actualizado.
---
### US-10 — Retirar pedidos entregados de las listas de pendientes
**Épica:** Seguimiento y visualización de pedidos
**Historia:** Como cocinero, quiero que los pedidos ya entregados dejen de aparecer en las listas de pendientes para concentrarme en los que aún requieren atención, sin perder el historial del consumo.
#### Criterios de aceptación
1. Pedidos listos sin entregar. Dado un pedido `Listo` que aún no ha sido entregado, cuando se consulte la lista de pendientes, entonces seguirá visible.
2. Registrar la entrega. Dado un pedido `Listo`, cuando el mesero confirme que lo sirvió, entonces el sistema registrará la entrega.
3. Retirar de pendientes. Dado un pedido con entrega registrada, cuando se actualicen las listas del KDS y del POS, entonces el pedido dejará de aparecer en ellas.
4. Conservar estado e historial. Dado un pedido entregado retirado de las listas, cuando un usuario consulte la cuenta o su historial, entonces verá el pedido con sus detalles, su estado `Listo` y el registro de entrega.
---
### US-11 — Anular un pedido
**Épica:** Seguimiento de pedidos en cocina
**Historia:** Como mesero, quiero anular un pedido que aún no está listo para evitar que cocina prepare algo que el cliente ya no quiere.
#### Criterios de aceptación
1. Anular con confirmación. Dado un pedido `En Espera` o `En Cocina`, cuando el mesero solicite anularlo, entonces el sistema pedirá confirmación y, solo al confirmarse, cambiará el estado a `Anulado`.
2. Cancelar la anulación. Dado el aviso de confirmación, cuando el mesero lo cancele, entonces el pedido conservará su estado.
3. Validar el estado al confirmar. Dado un pedido cuyo estado cambió a `Listo` mientras el mesero tenía abierta la confirmación, cuando el mesero confirme, entonces el sistema rechazará la anulación, conservará el estado vigente y explicará el motivo.
4. Impedir anular pedidos que ya no corresponden. Dado un pedido `Listo`, `Cerrado` o `Anulado`, cuando se solicite anularlo, entonces el sistema rechazará la operación y explicará el motivo.
5. Retirar de pendientes sin borrar. Dado un pedido `Anulado`, cuando se actualicen las listas del KDS y del POS, entonces dejará de aparecer en ellas, pero seguirá consultable en el historial de la cuenta con el estado `Anulado`.
Nota: fuera de alcance de esta versión: registrar un motivo de anulación (puede agregarse después para trazabilidad).
---
### US-12 — Abrir y cerrar la cuenta de una mesa
**Épica:** Gestión de mesas y cuentas
**Historia:** Como mesero, quiero abrir y cerrar la cuenta de una mesa para registrar el consumo de los clientes y dar por terminado el servicio.
#### Criterios de aceptación
1. Abrir una cuenta. Dada una mesa `Ocupada` sin cuenta abierta, cuando el mesero inicie una cuenta, entonces el sistema creará una cuenta asociada a esa mesa.
2. Una sola cuenta abierta por mesa. Dada una mesa con cuenta abierta, cuando el mesero intente abrir otra, entonces el sistema lo impedirá.
3. Requerir mesa ocupada. Dada una mesa `Libre`, cuando el mesero intente abrir una cuenta, entonces el sistema pedirá marcarla antes como `Ocupada`.
4. Impedir el cierre prematuro. Dada una cuenta con algún pedido `En Espera`, `En Cocina` o `Listo` sin entrega registrada, cuando el mesero intente cerrarla, entonces el sistema lo impedirá y señalará esos pedidos.
5. Cerrar la cuenta. Dada una cuenta cuyos pedidos están todos entregados o anulados, cuando el mesero confirme el cierre, entonces los pedidos entregados pasarán a `Cerrado`, los anulados conservarán el estado `Anulado` y la cuenta quedará cerrada.
6. Cuenta sin pedidos. Dada una cuenta sin pedidos, cuando el mesero la cierre, entonces quedará cerrada con importe $0.
7. Importe final. Dada una cuenta cerrada, cuando se consulte, entonces mostrará el importe final como la suma de los importes de sus pedidos no anulados, según lo calculado en US-13.
8. Conservar el historial. Dada una cuenta cerrada, cuando un usuario la consulte, entonces verá sus pedidos con productos, cantidades, precios aplicados, estados y notas.
9. La mesa no se libera sola. Dada una cuenta que se cierra, cuando termine el cierre, entonces la mesa seguirá `Ocupada` hasta que el mesero la libere manualmente (US-09).
---
### US-13 — Calcular el importe del pedido
**Épica:** Gestión de productos y precios
**Historia:** Como mesero, quiero que el POS calcule automáticamente el importe de cada producto y del pedido para informar al cliente el total correcto.
#### Criterios de aceptación
1. Precio unitario. Dado un producto con precio base y recargos de variantes o extras, cuando se seleccionen, entonces el precio unitario será el precio base más los recargos aplicables.
2. Subtotal. Dado un producto con cantidad entera entre 1 y 99, cuando el POS calcule el subtotal, entonces será el precio unitario multiplicado por la cantidad.
3. Cantidad inválida. Dada una cantidad que no sea un número entero entre 1 y 99 (0, negativa, con decimales, no numérica o mayor a 99), cuando el mesero intente agregarla, entonces el sistema la rechazará e indicará que debe ser un entero de 1 a 99.
4. Total del pedido. Dado un pedido con productos, cuando el POS calcule el total, entonces será la suma de los subtotales de todos los productos incluidos.
5. Recalcular al modificar. Dado un pedido aún no confirmado, cuando el mesero cambie una cantidad, elimine un producto o cambie una variante, entonces el subtotal y el total se recalcularán de inmediato.
6. Pedido vacío. Dado un pedido sin productos, cuando el POS muestre el total, entonces será $0 y el sistema no permitirá confirmar el pedido.
7. Precio aplicado vs. catálogo. Dado un pedido ya registrado, cuando el administrador modifique después el precio del producto en el catálogo, entonces el pedido existente conservará el precio con que se registró.
Nota: valores enteros en pesos chilenos (CLP), sin decimales ni redondeo. Impuestos, descuentos y propinas quedan fuera de alcance hasta que el equipo los acuerde.
---

### Definition of Done (DoD)
Se aplica a cada historia antes de darla por terminada.
#### Para todas las historias
- Criterios verificados: cada criterio de aceptación se probó y el resultado coincide con lo esperado.
- Validaciones y errores: se probaron entradas inválidas y acciones no permitidas; el sistema responde con un mensaje claro.
- Reglas de negocio: se verificaron los estados, roles y restricciones de la historia.
- Datos consistentes: los cambios se guardan y se reflejan en las vistas relacionadas del POS y del KDS según corresponda.
- Pruebas registradas: hay una lista breve de casos probados y sus resultados.
- Sin defectos bloqueantes: no quedan errores que impidan el flujo principal o corrompan datos.
- Flujo en GitHub: trabajar en una rama separada, Pull Request asociado al issue y merge inicialmente a dev, antes que a main.
- Revisión por pares: otro integrante revisó el Pull Request o probó el resultado.
- Aplicación estable: main compila o inicia correctamente tras el merge.
- Instrucciones actualizadas: la documentación refleja cómo ejecutar y probar la funcionalidad.