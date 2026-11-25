# Historial de cambios — SCD_TP_F (Frontend)

## [v3.0.0] — 2026-11-24 (Hito 3)

### Refactorización y modularización
- **Intervención 1 (PR #81):** Centralización de la URL del backend y de las llamadas `fetch` en `src/servicios/api.js` (usado por `App.jsx`, `DetalleMesa.jsx`, `TomaPedido.jsx` y `scripts/probar-api.mjs`).
- **Intervención 2 (PR #80):** Consolidación de `formatearPrecio` y `formatearTiempo` en `src/utils/formato.js` con pruebas unitarias en `src/utils/formato.test.js`.
- **Modularización (PR #82):** Reorganización de `src/` en `componentes/`, `servicios/`, `utils/`, `validaciones/` y `test/`, con regla explícita de dependencias.
- **Componente reutilizable (PR #83):** Contrato documentado de `src/servicios/api.js` y verificación por otro integrante mediante `scripts/probar-api.mjs`.

### Documentación y cierre
- Completado `docs/guia-unidad-3.md` con el árbol "antes" de `src/`, el diagrama de secuencia del flujo revisado (confirmar pedido), la verificación de `npm audit fix` en el backend y el estado de la deuda técnica.
- Agregada sección **"Cómo extender el sistema"** en `README.md` (nuevos componentes, utilidades, operaciones REST y cambio de modo local/nube).
- Verificación completa: `npm run lint`, `npm run build`, `npm run test:ci` (**26 archivos, 611/611 pruebas aprobadas**, cobertura global **98,28 % sentencias / 95,73 % ramas / 99,14 % funciones / 98,86 % líneas**) y `npm run test:integracion` contra `SCD_TP_B` local.

## [v0.1.0-alpha] — 2026-11-01 (Hito 2)
- Interfaz POS + KDS en React 19 + Vite, mapa de mesas, riel de comandas, toma de pedido, traslado entre mesas, administración de mesas, autenticación y modo nube con Supabase.

