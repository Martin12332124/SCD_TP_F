# Despliegue

El sistema se puede poner en marcha de dos maneras con el mismo código. Lo que cambia son variables de entorno, no el programa.

| | Modo local (producto real) | Modo nube (demostración y escalamiento) |
|---|---|---|
| Dónde corre | El PC de la comanda, en el restaurante | Netlify (la SPA) y Supabase (datos y sesión) |
| Quién tiene la autoridad | El servidor local (`SCD_TP_B`) | Ninguno: la SPA lee la réplica y deja órdenes |
| Base de datos | SQLite en `data/restaurante.db` | Postgres de Supabase (copia) |
| Sesión | `POST /api/auth/login` (JWT) | Supabase Auth |
| Necesita internet | No | Sí |
| URL | `http://<IP del PC>:5173` en la red del local | https://scd-tp-pos-kds.netlify.app |

Los diagramas del sistema están en [modelado/](modelado/README.md) (componentes: [4-componentes.md](modelado/4-componentes.md)).

## 1. Modo local (offline)

Un solo PC hace de servidor; el resto de los dispositivos se conectan a él por la red local.

**Backend (`SCD_TP_B`)**
1. Instalar Node.js 22 o superior (`npm start` usa `--env-file-if-exists`, que pide Node 22.9+).
2. Clonar el repo y, dentro de `SCD_TP_B`, ejecutar `npm ci`.
3. Copiar `.env.example` como `.env` y completar:
   - `JWT_SECRET`: mínimo 32 caracteres (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). Sin él el servidor no arranca.
   - `USUARIOS_INICIALES`: `usuario:contraseña,usuario2:contraseña2` (contraseña de 8 o más caracteres). Solo se usa en el primer arranque, con la tabla `usuarios` vacía.
   - `SUPABASE_URL` y `SUPABASE_SECRET_KEY`: opcionales. Si faltan, el sistema es 100 % local.
4. Ejecutar `npm start` (no `node index.js`: solo `npm start` lee el `.env`). Debe mostrar `Servidor Restaurante corriendo en el puerto 3000`. La base se crea sola en `data/restaurante.db` (o en `DB_PATH`).

**Frontend (`SCD_TP_F`)**
1. `npm ci`.
2. Copiar `.env.example` como `.env` con `VITE_MODO=local` y `VITE_API_URL=http://<IP del PC servidor>:3000` (para el mismo PC, `http://localhost:3000`).
3. `npm run dev` y abrir `http://localhost:5173`. Para abrirlo desde otro dispositivo de la red, `npm run dev -- --host` y usar la IP del PC.
4. Iniciar sesión con alguno de los usuarios de `USUARIOS_INICIALES`.

## 2. Modo nube

La nube no tiene backend propio: Supabase guarda la réplica y el buzón de órdenes, y Netlify entrega la SPA.

**Supabase (una vez)**
1. Crear el proyecto (`scd-tp-pos-kds`, región ca-central-1).
2. SQL Editor → pegar `SCD_TP_B/supabase/esquema.sql` completo → Run. Se puede repetir sin perder datos. Crea las tablas espejo, `ordenes_pendientes`, la función `sincronizar_estado`, los `GRANT` explícitos (el proyecto tiene desactivado "Grant API access automatically"), las políticas RLS y las suscripciones Realtime.
3. Authentication → Users → **Add user** con el correo `usuario@sistema.local`, su contraseña y **Auto Confirm User** marcado (el formulario pide "usuario" y lo convierte a ese correo).
4. Copiar de Project Settings → API la URL y la llave *publishable* (para la SPA) y la llave *secret* (solo para el `.env` del servidor local).

**Netlify (despliegue manual, desde `SCD_TP_F`)**
1. El repo trae `netlify.toml`: build `npm run build`, publicar `dist`, Node 22.
2. En el panel del sitio, Site configuration → Environment variables, definir las tres variables:
   - `VITE_MODO` = `nube`
   - `VITE_SUPABASE_URL` = la URL del proyecto
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = la llave `sb_publishable_...`
3. Compilar y publicar con las variables del sitio: `netlify deploy --build --prod`. Vite escribe las `VITE_*` dentro del código al compilar, así que si se compila sin ellas el sitio queda en modo local; cambiarlas en el panel exige volver a desplegar.
4. Abrir https://scd-tp-pos-kds.netlify.app e iniciar sesión con un usuario de Supabase Auth.

**Conectar el servidor local con la nube (opcional)**: poner `SUPABASE_URL` y `SUPABASE_SECRET_KEY` en el `.env` del servidor y reiniciar con `npm start`; debe mostrar `Nube (Supabase): activada`. Sin esto la web muestra la réplica vacía o desactualizada y sus órdenes quedan en espera. Detalle y pruebas de corte de internet: `SCD_TP_B/docs/sincronizacion-nube.md`.

**Qué no se sube**: ninguna llave va al repositorio. La llave secreta vive solo en el `.env` del servidor local; la web usa la publishable, que es pública por diseño y está limitada por los `GRANT` y RLS del esquema.

## 3. Por qué el producto real sigue siendo local/offline

- Regla de negocio: el restaurante tiene que poder tomar pedidos aunque se caiga internet. Una cocina que deja de recibir comandas por un corte del proveedor es peor que no tener sistema.
- Latencia y dependencia: con el servidor en el mismo local, confirmar un pedido es una operación en la red del restaurante; en la nube sería un viaje de ida y vuelta a Canadá y un punto de falla externo.
- Consistencia: las reglas (una mesa, un pedido vigente; cerrar solo con el pedido en Listo) se ejecutan en un solo lugar y con transacciones SQLite. La nube nunca decide: deja órdenes y el local las aplica.
- La nube aporta lo que el local no puede: acceso desde cualquier lugar, una réplica fuera del PC y la demostración de que el equipo sabe desplegar. Si internet falla, el local sigue igual y la nube se pone al día sola (cada 30 s, o al reconectar).

## 4. Plan de escalamiento a varias sucursales

Hoy hay un local y un proyecto de Supabase. Para varias sucursales:

1. **Identificar la sucursal.** Agregar `sucursal_id` a las tablas espejo y a `ordenes_pendientes`, y a la clave primaria de las espejo. Hoy, si dos servidores locales sincronizaran al mismo proyecto, cada subida borraría lo del otro.
2. **Subir solo los cambios (outbox).** En vez de la foto completa, cada transacción local escribe una fila en una tabla `outbox` (tabla, clave, operación, datos), el sincronizador la sube en orden y la marca enviada. Con 10–20 mesas la foto completa cuesta pocos KB; con muchas sucursales y menús grandes no, y el outbox además deja un historial reproducible.
3. **Permisos por sucursal.** Las políticas RLS pasan de "cualquier usuario con sesión" a "usuarios de esa sucursal"; cada local filtra `ordenes_pendientes` por su `sucursal_id` y usa su propia credencial.
4. **Roles.** Hoy cualquier usuario con sesión puede todo; con varias sucursales hace falta separar al personal de cada local de quien administra la cadena.
5. **Vista central.** Una pantalla de solo lectura sobre la réplica para comparar sucursales, sin tocar los servidores locales.
6. **Operación.** Despliegue automático de la SPA desde `main`, una copia periódica de cada `restaurante.db` y monitoreo de `estado_sincronizacion` para detectar un local sin conexión.

Cada paso mantiene la regla central: cada sucursal sigue funcionando sin internet y es la autoridad de sus propios datos.

## Pendientes de este documento
- No se contó con el material de clases sobre despliegue ni con la pauta de la Sumativa 2; este documento describe lo que el sistema hace de verdad y puede reordenarse para seguir la estructura que pida el curso.
