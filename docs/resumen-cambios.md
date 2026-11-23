# Resumen de cambios de esta etapa

Una página para el equipo y la presentación. El detalle está en los documentos enlazados; aquí no se repite.

## Qué se hizo

| Pieza | En una frase | Detalle |
| --- | --- | --- |
| **Sistema híbrido** | El servidor local (SQLite) es la autoridad y funciona sin internet; sube una copia a Supabase y aplica las órdenes que la web deja en un buzón. | [sincronizacion-nube.md](https://github.com/Martin12332124/SCD_TP_B/blob/main/docs/sincronizacion-nube.md) |
| **Login** | Nada se lee ni se escribe sin sesión: JWT en local, Supabase Auth en la nube. Sin roles. | [inicio-de-sesion.md](https://github.com/Martin12332124/SCD_TP_B/blob/main/docs/inicio-de-sesion.md) |
| **API gateway** | Puerta del servidor local: API key por aplicación (`x-api-key`), límite de peticiones y registro de accesos. | [api-gateway.md](https://github.com/Martin12332124/SCD_TP_B/blob/main/docs/api-gateway.md) |
| **Despliegue** | SPA en Netlify (modo nube) + Supabase; el producto real sigue siendo local. | [despliegue.md](despliegue.md) |
| **Modelado** | Los 4 diagramas UML de la Entrega 3 (pendiente: los sube el equipo). | [modelado/](modelado/README.md) |

## Cómo se usa

**Arrancar el local** (el PC de la comanda)
1. Backend, en `SCD_TP_B`: copiar `.env.example` como `.env` y completar `JWT_SECRET`, `USUARIOS_INICIALES` y `API_KEYS` (más `SUPABASE_URL` y `SUPABASE_SECRET_KEY` si se quiere la nube). Luego `npm start`.
2. Frontend, en `SCD_TP_F`: `.env` con `VITE_MODO=local`, `VITE_API_URL` y `VITE_API_KEY` (una de las de `API_KEYS`). Luego `npm run dev`.
3. Abrir `http://localhost:5173` y **entrar** con un usuario de `USUARIOS_INICIALES`.

**Demo del corte de internet** (paso a paso con detalle en [sincronizacion-nube.md §5.4](https://github.com/Martin12332124/SCD_TP_B/blob/main/docs/sincronizacion-nube.md))
1. Con el POS abierto en el PC servidor, apagar el Wi-Fi. Seguir tomando pedidos: todo funciona.
2. Pasados 75 s, abrir la web pública (modo nube): la franja dice que el sistema del restaurante no está conectado. Los botones siguen activos, pero al usarlos el cambio se rechaza ("No se pudo hacer el cambio: ... Inténtalo cuando vuelva a estar conectado") y no se inserta ninguna orden: nada queda en cola.
3. Volver a encender el Wi-Fi: en 30 s como máximo Supabase se pone al día (consola: `[SYNC] Conexión con Supabase restablecida.`) y la web vuelve a aceptar cambios. Si una orden llegara al buzón y esperara 10 s o más, el local la rechaza (`ORDEN_VENCIDA`) en vez de aplicarla.

**Demo del gateway:** `curl` sin `x-api-key` → `401 API_KEY_INVALIDA`; con llave y token → `200`; seis logins con contraseña mala seguidos → `429`. Cada petición aparece en la consola del servidor con el nombre de la llave ([comandos](https://github.com/Martin12332124/SCD_TP_B/blob/main/docs/api-gateway.md#4-cómo-probarlo-con-curl)).

**Sitio en modo nube:** https://scd-tp-pos-kds.netlify.app

## Qué cambió, por rama

| Rama | Repos | Contenido |
| --- | --- | --- |
| `feat/sincronizacion-nube` | B y F | `sincronizacion/` (`Sincronizador`, `cliente-supabase`), `ordenes-nube.js`, `supabase/esquema.sql`; en F, `nube.js`, modo `VITE_MODO` en `api.js`, `netlify.toml`. |
| `feat/login` | B y F | `usuario.service.js`, `usuarios-sqlite.js`, `seguridad/`, `auth.router.js`, `autenticacion.js`; en F, `Login.jsx`, `Sesion.jsx`, token en `api.js`. |
| `docs/modelado` | F y B | F: `docs/despliegue.md`. En ambos, el README enlaza a despliegue y a `docs/modelado/`, donde el equipo deja los 4 diagramas de la Entrega 3. |
| `feat/api-gateway` | B y F | B: `presentacion/gateway.js`, `app.js`, `index.js`, `docs/api-gateway.md`, `test/gateway.test.js`; órdenes que vencen (`ORDEN_VENCIDA`, función `ordenes_pendientes_con_edad` en `esquema.sql`). F: `x-api-key` en `api.js` y en el socket, `scripts/ci-frontend.js`, este documento; en modo nube, rechazo de cambios con el local desconectado (`utils/conexionLocal.js`, `nube.js`; reemplaza al estado "pendiente"). |

Variables nuevas del gateway: `API_KEYS` (backend, obligatoria) y `VITE_API_KEY` (frontend, solo modo local). Ninguna lleva valor en el repo: los `.env` están ignorados por git y los `.env.example` solo traen los nombres.

## 6 puntos para explicarlo oralmente

1. **El servidor local manda.** Las reglas del dominio corren solo ahí; Supabase es una copia y un buzón. Si internet falla, el restaurante no se entera.
2. **Misma aplicación, dos modos.** Cambian variables de entorno (`VITE_MODO`), no el código; `api.js` es el único punto de acceso, así que las pantallas no saben cuál se usa.
3. **La nube no escribe datos directamente.** La web deja una orden en el buzón y el local la aplica con los mismos servicios que REST y Socket.IO: las reglas existen en un solo lugar.
4. **Dos preguntas distintas en cada petición.** *¿Qué aplicación eres?* (API key) y *¿qué usuario eres?* (JWT). Se verifican por separado y las dos son obligatorias.
5. **Una llave en una SPA es visible, y está bien.** No protege datos: identifica a la aplicación, permite limitarla (600 por minuto) y revocarla sin tocar código. El login se limita a 5 intentos fallidos por minuto por IP.
6. **Gateway propio y el de Supabase conviven.** El propio protege el servidor local y funciona sin internet; el de Supabase (`apikey` + RLS) protege la nube. Para varias sucursales, el siguiente paso es subir solo los cambios con una tabla *outbox* ([despliegue.md §4](despliegue.md)).
