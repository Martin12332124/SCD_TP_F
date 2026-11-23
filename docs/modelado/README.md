# Modelado del sistema (Entrega 3)

Cuatro diagramas UML del sistema POS + KDS tal como está construido en la rama final: servidor local (repo `SCD_TP_B`) y SPA (repo `SCD_TP_F`), con la réplica en Supabase, el inicio de sesión y el despliegue de la SPA en Netlify. Cada diagrama se versiona con su fuente editable (`.drawio`) y una imagen exportada. Las notas de lectura de cada uno están en este archivo.

| # | Diagrama | Qué responde | Imagen | Fuente editable |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Casos de uso** | Quién usa el sistema (incluido Supabase) y qué puede hacer | [`1-casos-de-uso.jpeg`](./1-casos-de-uso.jpeg) | [`1-casos-de-uso.drawio`](./1-casos-de-uso.drawio) |
| 2 | **Clases** | Qué conceptos del dominio existen y cómo se relacionan | [`2-clases.png`](./2-clases.png) | [`2-clases.drawio`](./2-clases.drawio) |
| 3 | **Secuencia** | Cómo se resuelve *Confirmar pedido*, mensaje por mensaje | [`3-secuencia.svg`](./3-secuencia.svg) | [`3-secuencia.drawio`](./3-secuencia.drawio) |
| 4 | **Componentes** | En qué piezas se divide el sistema y qué interfaces las conectan | [`4-componentes.jpeg`](./4-componentes.jpeg) | [`4-componentes.drawio`](./4-componentes.drawio) |


## Nota de lectura general

Los cuatro son un solo modelo y se pueden recorrer siguiendo un mismo concepto, **el pedido**: 
* En **casos de uso** es *Confirmar pedido* (con *Validar ítems* incluido y *Agregar nueva ronda* como extensión).
* En **clases** es `Pedido`, compuesto de `LineaDePedido` y colgado de una `Mesa`.
* En **secuencia** es el recorrido de *Confirmar pedido* por `PedidoService`.
* En **componentes** vive en *Dominio* y se guarda en *SQLite*. 

Los actores de casos de uso aparecen como líneas de vida (Mesero, Cocina, Supabase) o como componentes externos (Supabase, y los tres roles agrupados como actor externo).

## Notas de lectura por diagrama
 
### 1. Casos de uso

![Diagrama de casos de uso](./1-casos-de-uso.jpeg)

El diagrama muestra tres actores humanos y un sistema externo. Mesero y Cocina comparten cuatro casos de uso (ver mapa de mesas, consultar pedido de mesa, iniciar sesión y, con distinto alcance, los relacionados con el pedido) porque ambos necesitan ver el estado del salón en tiempo real; los casos privativos del Mesero son los que inician cambios (abrir, cerrar, trasladar, confirmar), mientras que el único privativo de Cocina es actualizar el estado del pedido. Administrador no opera en el servicio: solo configura el sistema, de ahí que sus dos casos de uso (agregar/quitar mesas y gestionar ítems del menú) no se superpongan con los operativos. Supabase aparece como actor con el estereotipo «sistema externo» porque interactúa con el sistema desde afuera igual que un actor humano, pero no inicia sesión: se autentica con sus propias credenciales de servicio, por eso queda fuera de la precondición de sesión. La autenticación con API key del gateway no aparece como caso de uso porque ninguna persona la busca como objetivo: es un control técnico transparente al usuario. *Confirmar pedido* incluye siempre *Validar ítems* porque la validación no tiene sentido fuera de ese contexto: el sistema no permite enviar a cocina un pedido vacío, con cantidades fuera de rango o con ítems agotados. *Agregar nueva ronda* extiende *Confirmar pedido* y no es un caso de uso separado porque el flujo de entrada es idéntico (el mesero selecciona ítems y confirma); lo que cambia es que el sistema detecta que la mesa ya tiene un pedido en cocina y acumula los ítems en lugar de iniciar uno nuevo. *Sincronizar con la nube* incluye siempre los dos sub-casos porque ambas direcciones ocurren en cada ciclo: primero se aplican las órdenes pendientes del buzón y luego se sube el estado completo; nunca se hace solo una de las dos.


### 2. Clases
 
![Diagrama de clases](./2-clases.png)

El diagrama muestra solo lo que el sistema guarda hoy, para poder compararlo con el código. Por eso no aparecen Venta, Categoria ni Receta, que estaban en el diseño original. Un Pedido está compuesto por sus LineaDePedido: una línea no tiene sentido sin su pedido, no se comparte con otros y se borra junto con él. Una Mesa tiene como máximo un Pedido en curso, porque el sistema no guarda historial. Cada LineaDePedido guarda una copia del nombre y del precio del producto, no un enlace al menú, así los pedidos ya tomados no cambian si después se sube un precio. Por eso la relación con MenuItem es una dependencia. estadoPedido y pedidoDesde no se guardan en la mesa: se calculan al leerla a partir de su pedido (por eso llevan /), así hay un solo lugar donde cambian y no pueden quedar desfasados. OrdenPendiente vive en Supabase y OrdenAplicada en SQLite, y comparten id para no aplicar dos veces una orden si se corta internet a mitad del proceso. OrdenPendiente depende de Mesa porque cada orden trae una mesa en su contenido; la multiplicidad es 0..1 porque agregar una mesa puede pedirse sin número. Usuario no se relaciona con Pedido porque el pedido no guarda quién lo tomó.
 
### 3. Secuencia

![Secuencia: Confirmar pedido](./3-secuencia.svg)

**Qué se modeló y por qué.** Elegimos el caso de uso *Confirmar pedido* en modo nube
porque es el recorrido más largo del sistema: cruza la SPA, Supabase y el servidor
local, y es donde se ve la decisión de arquitectura más importante: la web no
escribe el pedido, solo deja una orden, y el servidor local sigue siendo la única
autoridad sobre las reglas. Por eso `PedidoService` valida los ítems una sola vez
y la orden rechazada queda registrada con su motivo en vez de perderse.
Si el local lleva 75 s o más sin sincronizar, la SPA rechaza el cambio y no inserta
nada: así no queda una cola de órdenes antiguas que se apliquen horas después. Como
el local rechaza las órdenes con 10 s o más de espera y la SPA espera 15 s,
"el cambio no se aplicó" es siempre verdad. Los eventos de Socket.IO se retienen
hasta el COMMIT para que la cocina nunca reciba el aviso de un pedido que no
existe, y la subida a Supabase es asíncrona para que el POS local no espere a la nube.
 
### 4. Componentes
[INSERTAR NOTA DE LECTURA]

## Decisiones que atraviesan los cuatro diagramas

* **El servidor local es la autoridad:** las reglas se ejecutan solo en Dominio.Supabase es una copia y un buzón de órdenes, no un segundo sistema con reglas propias.
* **El sistema funciona sin internet:** Supabase y Netlify son externos y opcionales, sin ellos el sistema es el mismo.
* **Sin roles:** Mesero, Cocina y Administrador son uso previsto. Lo único que se exige es sesión iniciada.
* **Dos capas de acceso:** el API gateway del servidor local identifica a la aplicación con una API key (`x-api-key`) y el inicio de sesión identifica al usuario con un JWT. Aparece como componente *Gateway* con la interfaz *API pública* (diagrama 4), no es un caso de uso porque ninguna persona lo busca como objetivo (ver nota del diagrama 1).
* **Solo lo que existe en el código:** no se modelan pagos, ventas ni inventario, porque no están implementados.

---

### Verificación y alcance
* Los nombres de clases, servicios, eventos y mensajes se verificaron contra el código de la rama `dev` de ambos repos (backend `c500e9d`, frontend `ba97e78`, que incluyen el login, el API gateway y la sincronización con Supabase). En esa versión pasan las pruebas: **backend 435 (17 suites)** y **frontend 611 (26 archivos)**.
* **Limitaciones declaradas:** las interfaces JavaScript son contratos por convención de métodos y no están declaradas formalmente; `OrdenPendiente` y `OrdenAplicada` son clases conceptuales (filas de tablas), no clases del código; en el diagrama de componentes la notación de interfaces es una convención propia (bola = interfaz que el componente provee, anillo = interfaz que requiere), explicada en su leyenda.
