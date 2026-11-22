# Modelado del sistema (Entrega 3)

Cuatro diagramas UML del sistema POS + KDS tal como está construido en la rama final: servidor local (repo `SCD_TP_B`) y SPA (repo `SCD_TP_F`), con la réplica en Supabase, el inicio de sesión y el despliegue de la SPA en Netlify. Los diagramas son bloques Mermaid dentro de cada `diagrama`.

| # | Diagrama | Qué responde | Archivo |
| :--- | :--- | :--- | :--- |
| 1 | **Casos de uso** | Quién usa el sistema (incluido Supabase) y qué puede hacer | `1-casos-de-uso` |
| 2 | **Clases** | Qué conceptos del dominio existen y cómo se relacionan | `2-clases` |
| 3 | **Secuencia** | Cómo se resuelve Confirmar pedido, mensaje por mensaje | `3-secuencia` |
| 4 | **Componentes** | En qué piezas se divide el sistema y qué interfaces las conectan | `4-componentes` |


## Nota de lectura general

Los cuatro son un solo modelo y se pueden recorrer siguiendo un mismo concepto, **el pedido**: 
* En **casos de uso** es *Confirmar pedido* (con *Validar ítems* incluido y *Agregar nueva ronda* como extensión).
* En **clases** es `Pedido`, compuesto de `ItemPedido` y colgado de una `Mesa`.
* En **secuencia** es el recorrido de *Confirmar pedido* por `PedidoService`.
* En **componentes** vive en *Dominio* y se guarda en *SQLite*. 

Los actores de casos de uso aparecen como líneas de vida (Mesero, Cocina, Supabase) o como componentes externos (Supabase, y los tres roles agrupados como actor externo).

## Decisiones que atraviesan los cuatro diagramas

* **El servidor local es la autoridad:** las reglas se ejecutan solo en Dominio; Supabase es una copia y un buzón de órdenes, no un segundo sistema con reglas propias.
* **El sistema funciona sin internet:** Supabase y Netlify son externos y opcionales; sin ellos el sistema es el mismo.
* **Sin roles:** Mesero, Cocina y Administrador son uso previsto. Lo único que se exige es sesión iniciada.
* **Dos capas de acceso:** el API gateway del servidor local identifica a la aplicación con una API key (`x-api-key`) y el inicio de sesión identifica al usuario con un JWT. Aparece como componente *Gateway* con la interfaz *API pública* (diagrama 4); no es un caso de uso porque ninguna persona lo busca como objetivo (ver nota del diagrama 1).
* **Solo lo que existe en el código:** no se modelan pagos, ventas ni inventario, porque no están implementados.

---

### Verificación y alcance
* Los nombres de clases, servicios, eventos y mensajes se verificaron contra el código de la rama `dev` de ambos repos (backend `c500e9d`, frontend `ba97e78`, que incluyen el login, el API gateway y la sincronización con Supabase). En esa versión pasan las pruebas: **backend 435 (17 suites)** y **frontend 611 (26 archivos)**.
* **Limitaciones declaradas:** las interfaces JavaScript son contratos por convención de métodos y no están declaradas formalmente; `OrdenPendiente` y `OrdenAplicada` son clases conceptuales (filas de tablas), no clases del código; los diagramas son Mermaid, que no tiene notación UML de bola y enchufe, por eso los componentes usan círculos con la convención explicada en el diagrama 4.
