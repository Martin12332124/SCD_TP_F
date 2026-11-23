import { describe, test, expect } from 'vitest';
import {
  UMBRAL_CONEXION_MS,
  localConectado,
  horaCorta,
  desdeLas,
  mensajeLocalDesconectado,
  MENSAJE_LOCAL_SIN_RESPUESTA
} from './conexionLocal';

const AHORA = new Date('2026-11-22T15:00:00').getTime();
const hace = (s) => new Date(AHORA - s * 1000).toISOString();

describe('conexionLocal', () => {
  test('el umbral es de 75 s', () => {
    expect(UMBRAL_CONEXION_MS).toBe(75000);
  });

  test('conectado solo si la última sincronización tiene menos de 75 s', () => {
    expect(localConectado(hace(0), AHORA)).toBe(true);
    expect(localConectado(hace(74), AHORA)).toBe(true);
    expect(localConectado(hace(75), AHORA)).toBe(false);
    expect(localConectado(hace(3600), AHORA)).toBe(false);
  });

  test('nunca sincronizó o la hora es ilegible → desconectado', () => {
    expect(localConectado(null, AHORA)).toBe(false);
    expect(localConectado(undefined, AHORA)).toBe(false);
    expect(localConectado('no-es-una-fecha', AHORA)).toBe(false);
  });

  test('sin hora de referencia usa la del navegador', () => {
    expect(localConectado(new Date().toISOString())).toBe(true);
  });

  test('horaCorta y desdeLas dan HH:MM en 24 horas', () => {
    expect(horaCorta('2026-11-22T09:05:00')).toBe('09:05');
    expect(desdeLas('2026-11-22T09:05:00')).toBe(' (desde las 09:05)');
    expect(desdeLas(null)).toBe('');
    expect(desdeLas('basura')).toBe('');
  });

  test('mensaje exacto de rechazo con y sin hora conocida', () => {
    expect(mensajeLocalDesconectado('2026-11-22T14:30:00')).toBe(
      'No se pudo hacer el cambio: el sistema del restaurante no está conectado (desde las 14:30). ' +
        'Inténtalo cuando vuelva a estar conectado.'
    );
    expect(mensajeLocalDesconectado(null)).toBe(
      'No se pudo hacer el cambio: el sistema del restaurante no está conectado. ' +
        'Inténtalo cuando vuelva a estar conectado.'
    );
  });

  test('mensaje exacto de falta de respuesta', () => {
    expect(MENSAJE_LOCAL_SIN_RESPUESTA).toBe(
      'El sistema del restaurante no respondió a tiempo. El cambio no se aplicó.'
    );
  });
});
