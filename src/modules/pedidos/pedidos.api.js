/**
 * API específica del módulo de pedidos, construida con el transporte compartido.
 * @param {{ pedirJson: (ruta: string) => Promise<object>, nube: object|null }} deps
 */
export function crearApiPedidos({ pedirJson, nube }) {
  return {
    obtenerResumen(numero) {
      return nube
        ? nube.obtenerPedidoMesa(numero)
        : pedirJson(`/api/mesas/${numero}/pedido`);
    }
  };
}
