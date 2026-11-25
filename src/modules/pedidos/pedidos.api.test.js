import { describe, expect, test, vi } from 'vitest';
import { crearApiPedidos } from './pedidos.api.js';

describe('API del módulo pedidos', () => {
  test('consulta el resumen de una mesa por REST en modo local', async () => {
    const pedirJson = vi.fn().mockResolvedValue({ ok: true, mesa: 'Mesa 4' });
    const api = crearApiPedidos({ pedirJson, nube: null });

    await expect(api.obtenerResumen(4)).resolves.toEqual({ ok: true, mesa: 'Mesa 4' });
    expect(pedirJson).toHaveBeenCalledWith('/api/mesas/4/pedido');
  });

  test('delega la consulta al cliente de nube cuando está configurado', async () => {
    const nube = { obtenerPedidoMesa: vi.fn().mockResolvedValue({ ok: true, mesa: 'Mesa 2' }) };
    const pedirJson = vi.fn();
    const api = crearApiPedidos({ pedirJson, nube });

    await expect(api.obtenerResumen(2)).resolves.toEqual({ ok: true, mesa: 'Mesa 2' });
    expect(nube.obtenerPedidoMesa).toHaveBeenCalledWith(2);
    expect(pedirJson).not.toHaveBeenCalled();
  });
});
