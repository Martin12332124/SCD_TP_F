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
