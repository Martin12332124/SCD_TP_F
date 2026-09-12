# Sistema de Pedidos para Restaurante (POS + KDS)

## Descripción del sistema

El Sistema de Pedidos para Restaurante (POS + KDS) resuelve el problema de coordinación entre la toma de pedidos en el salón y su preparación en cocina. En muchos restaurantes ese proceso depende de comandas en papel o de sistemas que no se actualizan en tiempo real, lo que provoca pedidos traspapelados, platos que se preparan mal o que llegan tarde a la mesa. El sistema conecta un Punto de Venta (POS), donde el mesero toma la comanda, con una Pantalla de Cocina (KDS), donde el personal de cocina la recibe y actualiza su estado a medida que avanza la preparación, todo sincronizado en tiempo real dentro de la red local del restaurante.

Un elemento central del diseño es el paso de validación obligatoria de la comanda con el cliente antes de enviarla a cocina: el mesero confirma cada ítem, cantidad y modificador con el comensal antes de que el pedido salga hacia la cocina, para eliminar el error humano en el origen del proceso en vez de corregirlo después, cuando ya es más costoso hacerlo.

El sistema sirve a cuatro roles dentro del restaurante: el Mesero, que toma los pedidos, gestiona las mesas y cierra las cuentas; el Cocinero, que recibe y prepara las comandas desde el KDS; el JefeDeCocina, que supervisa la cocina y el inventario de ingredientes; y el Administrador, que gestiona el catálogo de menú, los usuarios del sistema y el registro de ventas del local.

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

## Responsabilidades del Equipo

<!-- TODO: obligatorio completar antes de entregar, afecta la nota individual -->

| Integrante | Rol | Ítems de la rúbrica a cargo |
|------------|-----|------------------------------|
| Martín Saldívar | | |
| Martín Carvallo | | |
| Claudia Medina | | |
| Francisca Hernández | | |
| Diego Urbano | | |

## Instalación y ejecución

Este proyecto es la interfaz gráfica de usuario (Frontend) del Sistema de Pedidos para Restaurante (POS + KDS). Está construido con React, Vite y se conecta mediante Sockets al servidor backend.

A continuación, tienes las instrucciones exactas y masticadas para descargar, instalar y ejecutar esta pantalla en cualquier computadora.

---

### PARA EL EQUIPO

Se requiere al nuestro equipo la implementación de un formato el código después de terminar de modificarlo
```bash
npm run format
```

---

### REQUISITOS PREVIOS

Para que esta pantalla funcione, la computadora externa necesita cumplir con dos condiciones:
1. Tener **Node.js** instalado (versión LTS recomendada).
2. Tener el servidor **Backend (`SCD_TP_B`) ya encendido y corriendo** en el puerto 3000 de la misma PC o en red.

---

### PASO A PASO PARA INSTALAR LA PANTALLA

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

### CÓMO USAR LA SIMULACIÓN
Una vez que entres a la página web:
* **Indicador de Servidor:** Si el Backend está encendido, verás un letrero verde que dice **"Conectado ✔"**. Si el Backend está apagado, dirá **"Desconectado ✖"** en rojo.

* **Botones Interactivos:** Presiona los botones de **Tomar Pedido**, **Empezar Cocina** o **Pedido Listo**. Cada vez que hagas clic en uno, la pantalla le enviará la orden en tiempo real al servidor para actualizar el estado del pedido en el restaurante.


---

### CÓMO APAGAR LA PANTALLA
Cuando quieras cerrar el entorno de desarrollo:
1. Ve a la terminal donde ejecutaste el comando.
2. Presiona las teclas **`Ctrl + C`** al mismo tiempo.
3. Si te pregunta *"¿Desea terminar el trabajo por lotes (S/N)?"*, escribe **`S`** y presiona `Enter`.

Actividades de clase previas: ver [docs/actividades-clase.md](./docs/actividades-clase.md).
