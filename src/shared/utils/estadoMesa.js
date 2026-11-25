// Estado visual de una mesa: combina si está libre u ocupada con el estado de su pedido.
// Un solo lugar define, para cada estado, su texto, su ícono y la clave de sus colores.
// Los colores viven en index.css como --mesa-<clave> (fondo) y --mesa-<clave>-texto.

import { ESTADO_RECIBIDO, ESTADO_EN_COCINA, ESTADO_LISTO } from './estadosPedido.js';

/**
 * Los cinco estados que puede mostrar una mesa. El ícono acompaña al color,
 * para no depender solo del color (REF-05).
 */
export const ESTADOS_MESA = {
  libre: { clave: 'libre', etiqueta: 'Libre', icono: 'silla' },
  ocupada: { clave: 'ocupada', etiqueta: 'Ocupada', icono: 'personas' },
  recibido: { clave: 'recibido', etiqueta: 'Pedido tomado', icono: 'libreta' },
  cocina: { clave: 'cocina', etiqueta: 'En cocina', icono: 'olla' },
  listo: { clave: 'listo', etiqueta: 'Pedido listo', icono: 'campana' }
};

const CLAVE_POR_PEDIDO = {
  [ESTADO_RECIBIDO]: 'recibido',
  [ESTADO_EN_COCINA]: 'cocina',
  [ESTADO_LISTO]: 'listo'
};

/**
 * Estado visual que corresponde a un estado de pedido.
 * @param {string|null|undefined} estadoPedido
 * @returns {{ clave: string, etiqueta: string, icono: string } | null}
 */
export function estadoVisualPedido(estadoPedido) {
  const clave = CLAVE_POR_PEDIDO[estadoPedido];
  return clave ? ESTADOS_MESA[clave] : null;
}

/**
 * Estado visual de una mesa { estado, estadoPedido? }.
 * Si el backend no envía estadoPedido, una mesa ocupada se muestra "Ocupada".
 */
export function estadoVisualMesa(mesa) {
  if (!mesa || mesa.estado !== 'ocupada') return ESTADOS_MESA.libre;
  return estadoVisualPedido(mesa.estadoPedido) ?? ESTADOS_MESA.ocupada;
}

/**
 * Cuenta las mesas por estado visual. `ocupada` cuenta todas las no libres.
 * @returns {{ libre: number, ocupada: number, recibido: number, cocina: number, listo: number }}
 */
export function contarEstados(mesas) {
  const conteo = { libre: 0, ocupada: 0, recibido: 0, cocina: 0, listo: 0 };
  for (const mesa of mesas) {
    const { clave } = estadoVisualMesa(mesa);
    if (clave === 'libre') {
      conteo.libre += 1;
    } else {
      conteo.ocupada += 1;
      if (clave !== 'ocupada') conteo[clave] += 1;
    }
  }
  return conteo;
}
