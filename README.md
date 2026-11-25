# Sistema de Pedidos para Restaurante (POS + KDS)

> **Repositorio frontend (`SCD_TP_F`).** El servidor está en el repositorio backend: [SCD_TP_B](https://github.com/Martin12332124/SCD_TP_B).
 
## Enlaces
 
- **Sitio desplegado (modo nube):** https://scd-tp-pos-kds.netlify.app
- **Hito 3 — Entrega local `v3.0.0`:** [docs/guia-unidad-3.md](docs/guia-unidad-3.md) · [CHANGELOG.md](CHANGELOG.md). La revisión independiente y la publicación del paquete siguen pendientes.
- **Modelado (Entrega 3):** [docs/modelado/](docs/modelado/README.md): casos de uso, clases, secuencia y componentes, con su nota de lectura.
- **Despliegue:** [docs/despliegue.md](docs/despliegue.md): modo local (offline) y modo nube (Netlify + Supabase), paso a paso, y plan de escalamiento a varias sucursales.

## Descripción del sistema

El Sistema de Pedidos para Restaurante (POS + KDS) resuelve el problema de coordinación entre la toma de pedidos en el salón y su preparación en cocina. En muchos restaurantes ese proceso depende de comandas en papel o de sistemas que no se actualizan en tiempo real, lo que provoca pedidos traspapelados, platos que se preparan mal o que llegan tarde a la mesa. El sistema conecta un Punto de Venta (POS), donde el mesero toma la comanda, con una Pantalla de Cocina (KDS), donde el personal de cocina la recibe y actualiza su estado a medida que avanza la preparación, todo sincronizado en tiempo real dentro de la red local del restaurante.
 
Un elemento central del diseño es el paso de validación obligatoria de la comanda con el cliente antes de enviarla a cocina: el mesero confirma cada ítem y cantidad con el comensal antes de que el pedido salga hacia la cocina, para eliminar el error humano en el origen del proceso en vez de corregirlo después, cuando ya es más costoso hacerlo.

### Alcance actual
 
El sistema está pensado para tres usos: Mesero, Cocinero y Administrador. Hoy solo exige iniciar sesión: **no distingue permisos por rol**. Incluye mapa de mesas en tiempo real, apertura, liberación y traslado de mesas, toma de pedidos (con nuevas rondas), seguimiento de comandas en cocina, administración de mesas, inicio de sesión, API gateway y sincronización opcional con la nube (Supabase).
 
**No incluye:** pagos, cuentas, inventario, ventas, variantes ni notas por producto, ni anulación de pedidos. La gestión de la carta (crear, editar y marcar productos como agotados) solo está disponible por API, sin pantalla.

## Historias de Usuario

Todas las historias están registradas como GitHub Issues en el repositorio frontend.

| ID | Nombre | Issue |
|----|--------|-------|
| US-01 | Selector de variantes-bebida | #22 |
| US-02 | Descripción compacta del pedido | #23 |
| US-03 | Agregacion de notas a los pedidos | #24 |
| US-04 | Disponibilidad en los menus | #32 |
| US-05 | Posibilidad de cambio de clientes-mesas | #33 |
| US-06 | Actualización de pedidos en la cocina | #25 |
| US-07 | Registrar precio al crear o editar | #26 |
| US-08 | Ver mapa de mesas | #27 |
| US-09 | Abrir o cerrar una mesa | #28 |
| US-10 | Limpieza al servir un pedido | #30 |

## Requisitos Extrafuncionales

Ver: [ReqExtrafuncionales.md](./ReqExtrafuncionales.md) — 16 requisitos clasificados, 5 de prioridad Alta.

## Entidades del Dominio

Ver: [DominioEntidades.md](./DominioEntidades.md) — 10 entidades, diagrama ER y máquina de estados del Pedido.

## Mockups

| Mockup | Historia de usuario relacionada |
|--------|----------------------------------|
| [docs/mockups/us-01.png](docs/mockups/us-01.png) | US-01 |
| [docs/mockups/us-02.png](docs/mockups/us-02.png) | US-02 |
| [docs/mockups/us-03.png](docs/mockups/us-03.png) | US-03 |
| [docs/mockups/us-04.png](docs/mockups/us-04.png) | US-04 |
| [docs/mockups/us-05.png](docs/mockups/us-05.png) | US-05 |
| [docs/mockups/us-06.png](docs/mockups/us-06.png) | US-06 |
| [docs/mockups/us-07.png](docs/mockups/us-07.png) | US-07 |
| [docs/mockups/us-08.png](docs/mockups/us-08.png) | US-08 |
| [docs/mockups/us-09.png](docs/mockups/us-09.png) | US-09 |
| [docs/mockups/us-10.png](docs/mockups/us-10.png) | US-10 |


## Diseño Arquitectónico

Ver: [Arquitectura.md](./Arquitectura.md) — estilo, diagrama, descomposición modular y decisiones de diseño (ADR).

## Responsabilidades del Equipo

### Entregable 1

| Integrante          | Rol                                | Ítems de la rúbrica a cargo                                |
| ------------------- | ---------------------------------- | ---------------------------------------------------------- |
| Martín Saldívar     | Desarrollador                      | 2.1 Diseño Arquitectónico                                  |
| Martín Carvallo     | Desarrollador y Historias          | 1.1 Historias de Usuario, 2.4 Entidades del dominio        |
| Claudia Medina      | Diseñadora y concepto del sistema. | 2.3 Mockups, 2.2 Diagrama de Arquitectura                  |
| Francisca Hernández | Historias y Análisis de requisitos | 1.1 Historias de Usuario                                   |
| Diego Urbano        | Coordinador                        | 1.2 Requisitos Extrafuncionales, 2.1 Diseño Arquitectónico |

### Entregable 2

| Integrante          | Rol                                          | Ítems de la rúbrica a cargo                                                |
| ------------------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| Francisca Hernández | Analista de Requisitos (Refinamiento con IA) | 1.1 Mejora de Historias de Usuario con Clarita Review                      |
| Claudia Medina      | Gestión de Requisitos y Control de Cambios   | 1.1 Mejora de Historias de Usuario con Clarita Review (cambios realizados) |
| Martín Carvallo     | Desarrollador Backend (APIs)                 | 2.1 Desarrollo de una HU en backend (APIs)                                 |
| Diego Urbano        | Coordinador y Desarrollador Backend (APIs)   | 2.1 Desarrollo de una HU en backend (APIs)                                 |
| Martín Saldívar     | Ingeniero de Pruebas / QA (Thunder Client)   | 4.1 Casos de prueba para las APIs (Thunder Client)                         |

## Instalación y ejecución

Este proyecto es la interfaz gráfica de usuario (Frontend) del Sistema de Pedidos para Restaurante (POS + KDS). Está construido con React y Vite, y se conecta al servidor backend mediante REST y Socket.io (modo local) o a Supabase (modo nube).
 
A continuación están las instrucciones para descargar, instalar y ejecutar esta pantalla en cualquier computadora. Para probar el sistema sin instalar nada, usa el [sitio desplegado](https://scd-tp-pos-kds.netlify.app).


---
## Hito 2 — Funcionalidades evaluadas

| # | Funcionalidad | Historia | Backend (SCD_TP_B) | Frontend (SCD_TP_F) | Pruebas |
|---|---|---|---|---|---|
| 1 | Abrir y liberar mesa | US-09 | `src/dominio/mesa-estado.service.js`, `src/presentacion/mesas.router.js` | `src/componentes/DetalleMesa.jsx` | `test/mesa-estado.service.test.js`, `test/api.test.js` |
| 2 | Mapa de mesas en tiempo real | US-08 | `GET /api/mesas`, evento `estado_mesas` en `src/app.js` | `src/componentes/MapaMesas.jsx`, `src/componentes/App.jsx` | `test/api.test.js`, `test/socket.test.js` |
| 3 | Traslado de pedido entre mesas | US-05 | `src/dominio/mesa.service.js`, evento `trasladar_pedido` | panel de la mesa: `src/componentes/TrasladoMesa.jsx` | `test/mesa.service.test.js`, `test/socket.test.js` |
| 4 | Precio base de productos (crear/editar) | US-07 | `src/dominio/menu-item.service.js`, `src/presentacion/menu-items.router.js` | — | `test/menu-item.service.test.js`, `test/api.test.js` |
| 5 | Toma de pedido, confirmación y disponibilidad | US-04 (parcial) | `src/modules/pedidos/pedido.service.js` (`confirmarPedido`), `PATCH /api/menu-items/:id` | `src/modules/pedidos/components/TomaPedido.jsx` | `test/pedido.service.test.js`, `test/socket.test.js` |

### Cómo ejecutar
``` bash 
npm ci
npm run dev               # http://localhost:5173 (requiere el backend en :3000)
npm run lint
npm run build
npm run test:coverage
```

### REQUISITOS PREVIOS

Para que esta pantalla funcione, la computadora externa necesita cumplir con estas condiciones:
1. Tener **Node.js 22 LTS** (o superior compatible) y **npm** instalados.
2. Tener el servidor **Backend (`SCD_TP_B`) ya encendido y corriendo** en el puerto 3000, de la misma PC o en red.
3. Un **usuario y una API key** del backend: el usuario sale de `USUARIOS_INICIALES` y la llave de `API_KEYS`, ambos en el `.env` del backend.
El modo nube (sin backend local) se explica en [docs/despliegue.md](docs/despliegue.md).

> **Entrega local `v3.0.0`:** esta candidata integra los cambios aprobados por el equipo en ambos repositorios. La etiqueta identifica los commits incluidos en el ZIP de entrega; la revisión independiente y la publicación del paquete en un enlace accesible siguen pendientes.

### Problemas frecuentes

- **"Desconectado ✖" o error de red en el login:** verifica que el backend esté encendido en `VITE_API_URL` (por defecto `http://localhost:3000`).
- **Error `API_KEY_INVALIDA`:** la variable `VITE_API_KEY` del `.env` del frontend no coincide con ninguna llave configurada en `API_KEYS` del backend.
- **Falla `npm run build` o `npm run dev` por dependencias:** ejecuta `npm ci` para reinstalar exactamente las versiones de `package-lock.json`.

---

### PASO A PASO PARA INSTALAR LA PANTALLA

Sigue estos pasos en orden estricto sin saltarte ninguno:

#### Paso 1: Abrir la terminal
 
- En **Windows**: presiona la tecla `Windows`, escribe **PowerShell** y ábrelo.
- En **Mac**: presiona `Cmd + Espacio`, escribe **Terminal** y ábrela.
#### Paso 2: Ir a la carpeta de descargas
 
Muévete a la carpeta donde quieras clonar el proyecto (por ejemplo, Descargas):
 
```bash
cd Downloads
```
 
#### Paso 3: Descargar el código del frontend
 
Copia y pega este comando en tu terminal y presiona `Enter`:
 
```bash
git clone https://github.com/Martin12332124/SCD_TP_F.git
```
 
_(Esto creará la carpeta `SCD_TP_F` en tus descargas.)_
 
#### Paso 4: Entrar a la carpeta descargada
 
```bash
cd SCD_TP_F
```
 
#### Paso 5: Instalar los paquetes
 
Ejecuta el siguiente comando para descargar las herramientas visuales y de conexión necesarias:
 
```bash
npm ci
```
 
_Espera a que termine: sabrás que acabó cuando la terminal te permita escribir comandos otra vez._
 
#### Paso 6: Configurar el archivo `.env`
 
Copia `.env.example` como `.env` y completa, para el modo local:
 
```text
VITE_MODO=local
VITE_API_URL=http://localhost:3000
VITE_API_KEY=<una de las llaves de API_KEYS del backend>
```
 
Si el backend está en otro computador de la red, usa su dirección en `VITE_API_URL` (por ejemplo `http://192.168.1.20:3000`). Detalles en [docs/despliegue.md](docs/despliegue.md).
 
---

### PARA EL EQUIPO

Se requiere al nuestro equipo la implementación de un formato el código después de terminar de modificarlo
```bash
npm run format
```

---

### CÓMO ENCENDER LA INTERFAZ VISUAL

Una vez instalado todo, pon a correr la pantalla con este comando:
```bash
npm run dev
```

#### ¿Cómo abrir la aplicación?
Al ejecutar el comando, Vite te mostrará una dirección local en la terminal. 
1. Abre tu navegador web (Google Chrome, Edge, etc.).
2. En la barra de direcciones de arriba, escribe exactamente:
   `http://localhost:5173`
3. Presiona `Enter`.
4. Inicia sesión con un usuario del backend.

---

### CÓMO USAR LA SIMULACIÓN
Una vez que entres a la página web:
- **Inicio de sesión:** al abrir la aplicación se pide usuario y contraseña. Sin sesión iniciada no se muestra el sistema.
- **Indicador de servidor:** si el backend está encendido, verás un letrero verde que dice **"Conectado ✔"**. Si está apagado, dirá **"Desconectado ✖"** en rojo.
- **Comandas:** bajo el encabezado cuelga un ticket por cada pedido en curso, con su tiempo. Pasados 15 minutos el ticket se pone ámbar y pasados 20, rojo ("Atrasado"). Tocar un ticket abre su mesa.
- **Sala:** cada mesa del plano muestra su estado con color, ícono y texto: libre, ocupada, pedido tomado, en cocina o pedido listo.
- **Todo dentro de la mesa:** toca una mesa para abrir su panel. Ahí puedes abrirla o liberarla, tomar el pedido (carta), avanzarlo con un solo botón (**Enviar a cocina** → **Marcar pedido listo**), ver la cuenta y trasladar el pedido tocando la mesa de destino.
- **Configurar mesas:** el botón del encabezado abre una pantalla aparte para agregar mesas (la siguiente o con un número elegido) y quitar mesas libres, con confirmación.

Detalles del rediseño: [docs/rediseno-mesas.md](docs/rediseno-mesas.md).

---

### CÓMO APAGAR LA PANTALLA
Cuando quieras cerrar el entorno de desarrollo:
1. Ve a la terminal donde ejecutaste el comando.
2. Presiona las teclas **`Ctrl + C`** al mismo tiempo.
3. Si te pregunta *"¿Desea terminar el trabajo por lotes (S/N)?"*, escribe **`S`** y presiona `Enter`.

Actividades de clase previas: ver [docs/actividades-clase.md](./docs/actividades-clase.md).

---

## Cómo extender el sistema

Esta sección explica dónde tocar el código para las extensiones más comunes.

### Agregar un componente nuevo

1. Si pertenece a una funcionalidad, crear `src/modules/mi-funcionalidad/components/MiComponente.jsx` con `export default MiComponente`; colocar junto a él su prueba.
2. Si el componente se comparte entre funcionalidades, ubicarlo en `src/shared/components/`.
3. Escribir la prueba con `@testing-library/react`.
   - Mockear `socket.io-client` y `fetch` con `vi.mock` si el componente los necesita (ver `App.test.jsx` como ejemplo).
4. Exportar la interfaz pública del módulo en `src/modules/mi-funcionalidad/index.js` e importarla desde `App.jsx` o desde otro módulo consumidor.

### Agregar una función de utilidad

1. Crear la utilidad dentro de `src/modules/mi-funcionalidad/` si sus reglas son propias de esa funcionalidad, o en `src/utils/` / `src/shared/` si realmente es común.
2. Escribir pruebas con casos válidos, límites y errores junto al módulo.
3. Importarla desde la interfaz pública del módulo o desde los consumidores que correspondan.

**Regla de dependencias:** los módulos pueden consumir servicios compartidos (`servicios/`, `validaciones/`, `utils/` y `shared/`), pero las piezas compartidas no deben importar componentes o lógica privada de un módulo.

### Agregar una operación al cliente REST

En `src/servicios/api.js`, al final del archivo, exportar la nueva función siguiendo el patrón existente:

```js
/**
 * Descripción de la operación.
 * @param {number} id
 * @returns {Promise<{ ok: boolean, … }>}
 */
export const miOperacion = (id) =>
  nube ? nube.miOperacion(id) : pedirJson(`/api/mi-ruta/${id}`, { method: 'POST' });
```

Luego agregar el test correspondiente en `src/servicios/api.test.js`.

### Cambiar el modo local ↔ nube

Solo se necesita el archivo `.env`:
- **Modo local:** `VITE_MODO=local`, `VITE_API_URL=http://…`, `VITE_API_KEY=…`
- **Modo nube:** `VITE_MODO=nube`, `VITE_SUPABASE_URL=…`, `VITE_SUPABASE_PUBLISHABLE_KEY=…`

Ver [docs/despliegue.md](docs/despliegue.md) para los pasos completos.
