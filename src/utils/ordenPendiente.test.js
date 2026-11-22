import { describe, test, expect } from 'vitest';
import { esPendiente, MENSAJE_ORDEN_PENDIENTE } from './ordenPendiente';

describe('ordenPendiente', () => {
  test('mensaje neutral acordado', () => {
    expect(MENSAJE_ORDEN_PENDIENTE).toBe(
      'Orden enviada. Se aplicará cuando el sistema del restaurante se conecte.'
    );
  });
  test('solo { ok: true, pendiente: true } es pendiente', () => {
    expect(esPendiente({ ok: true, pendiente: true })).toBe(true);
    expect(esPendiente({ ok: true })).toBe(false);
    expect(esPendiente({ ok: false, pendiente: true })).toBe(false);
    expect(esPendiente(undefined)).toBe(false);
  });
});
