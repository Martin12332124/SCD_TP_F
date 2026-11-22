# Sistema de Pedidos para Restaurante (POS + KDS)

## Descripción del sistema

El Sistema de Pedidos para Restaurante (POS + KDS) coordina la toma de pedidos en el salón con su preparación en cocina. El mesero gestiona las mesas y confirma pedidos desde el POS; cocina los recibe y actualiza su estado en el KDS. El sistema es híbrido: el servidor local con SQLite es la autoridad y sigue funcionando sin internet; cuando está conectado, sincroniza una réplica con Supabase para que la web pública pueda consultar el estado y enviar órdenes al servidor local.

Los usuarios inician sesión para acceder al sistema. No hay permisos diferenciados por rol; las acciones disponibles corresponden a las funciones implementadas de mesas y pedidos.

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

<!-- TODO: reemplazar por las rutas reales una vez subidas las imágenes -->

| Mockup | Historia de usuario relacionada |
|--------|----------------------------------|
| `docs/mockups/us-01.png` | US-01 |
| `docs/mockups/us-02.png` | US-02 |
| `docs/mockups/us-03.png` | US-03 |
| `docs/mockups/us-04.png` | US-04 |
| `docs/mockups/us-05.png` | US-05 |
| `docs/mockups/us-06.png` | US-06 |
| `docs/mockups/us-07.png` | US-07 |
| `docs/mockups/us-08.png` | US-08 |
| `docs/mockups/us-09.png` | US-09 |
| `docs/mockups/us-10.png` | US-10 |

## Diseño Arquitectónico

Ver: [Arquitectura.md](./Arquitectura.md) — estilo, diagrama, descomposición modular y decisiones de diseño (ADR).

## Modelado y despliegue

- **Modelado (Entrega 3):** [docs/modelado/](docs/modelado/README.md) — diagramas de casos de uso, clases, secuencia y componentes del sistema final, con su nota de lectura.
- **Despliegue:** [docs/despliegue.md](docs/despliegue.md) — arquitectura híbrida, operación local sin internet, modo nube (Netlify + Supabase) y plan de escalamiento. Sitio público: https://scd-tp-pos-kds.netlify.app

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

Este repositorio contiene la interfaz React + Vite. En modo local se conecta al backend por REST y Socket.IO; en la web pública usa Supabase para leer la réplica y enviar órdenes al servidor del restaurante.

Para el uso habitual en la nube, abre el [sitio público](https://scd-tp-pos-kds.netlify.app) e inicia sesión. El encargado debe mantener encendido y conectado a Supabase el servidor del restaurante. Si la franja amarilla indica que el sistema del restaurante no está conectado, avísale; desde la web no hay que instalar ni ejecutar `localhost`.

---

### PARA EL EQUIPO

Se requiere al nuestro equipo la implementación de un formato el código después de terminar de modificarlo
```bash
npm run format
```

### Cómo ejecutar
``` bash 
npm ci
npm run dev               # http://localhost:5173 (requiere el backend en :3000)
npm run lint
npm run build
npm run test:coverage
```

### REQUISITOS PREVIOS

Los pasos siguientes son para ejecutar y desarrollar el frontend en modo local. Para el uso de la web pública no necesitas Node.js ni levantar el backend en tu computadora.

---

### PASO A PASO PARA EJECUTAR EN MODO LOCAL

Sigue estos pasos en orden estricto sin saltarte ninguno:

#### Paso 1: Abrir la Terminal
* En **Windows**: Presiona la tecla `Windows`, escribe **PowerShell** y ábrelo.
* En **Mac**: Presiona `Cmd + Espacio`, escribe **Terminal** y ábrela.

#### Paso 2: Ir a la carpeta de descargas
Múevete a la carpeta donde quieras clonar el proyecto (por ejemplo, Descargas):
```bash
cd Downloads
```

#### Paso 3: Descargar el código del Frontend
Copia, pega este comando en tu terminal y presiona `Enter`:
```bash
git clone https://github.com/Martin12332124/SCD_TP_F.git
```
*(Esto creará la carpeta llamada `SCD_TP_F` en tus descargas).*

#### Paso 4: Entrar a la carpeta descargada
```bash
cd SCD_TP_F
```

#### Paso 5: Instalar los paquetes del diseño
Ejecuta el siguiente comando para descargar de internet todas las herramientas visuales y de conexión necesarias:
```bash
npm install
```
*Espera un momento a que se complete la barra de carga. Sabrás que terminó cuando la terminal te permita escribir comandos otra vez.*

Configura `.env.local` con `VITE_MODO=local`, `VITE_API_URL` y `VITE_API_KEY`. La API key debe coincidir con una de las configuradas en `API_KEYS` en el backend. Consulta [docs/despliegue.md](docs/despliegue.md) para los valores y los pasos del servidor.

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

---

### CÓMO USAR LA INTERFAZ
Una vez que entres a la página web:
* **Indicadores de conexión:** en modo local, el encabezado muestra si el backend está conectado. En modo nube, el encabezado indica la conexión con Supabase y la franja amarilla indica si el servidor del restaurante sincronizó recientemente. Si no está conectado, puedes consultar los últimos datos, pero no hacer cambios.

* **Comandas:** bajo el encabezado cuelga un ticket por cada pedido en curso, con su tiempo. Pasados 15 minutos el ticket se pone ámbar y pasados 20, rojo ("Atrasado"). Tocar un ticket abre su mesa.

* **Sala:** cada mesa del plano muestra su estado con color, ícono y texto: libre, ocupada, pedido tomado, en cocina o pedido listo.

* **Todo dentro de la mesa:** toca una mesa para abrir su panel. Ahí puedes abrirla o liberarla, tomar el pedido (carta), avanzarlo con un solo botón (**Enviar a cocina** → **Marcar pedido listo**), ver la cuenta y trasladar el pedido tocando la mesa de destino.

* **Configurar mesas:** el botón del encabezado abre una pantalla aparte para agregar mesas (la siguiente o con un número elegido) y quitar mesas libres, con confirmación.

Detalles del rediseño: [docs/rediseno-mesas.md](docs/rediseno-mesas.md).


---

### CÓMO APAGAR LA PANTALLA
Cuando quieras cerrar el entorno de desarrollo:
1. Ve a la terminal donde ejecutaste el comando.
2. Presiona las teclas **`Ctrl + C`** al mismo tiempo.
3. Si te pregunta *"¿Desea terminar el trabajo por lotes (S/N)?"*, escribe **`S`** y presiona `Enter`.

Actividades de clase previas: ver [docs/actividades-clase.md](./docs/actividades-clase.md).
