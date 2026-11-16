// @vitest-environment node
// Comprueba, leyendo index.css, que los colores de cada estado de mesa se leen bien:
// el texto sobre su fondo tiene contraste >= 4.5 (WCAG AA) en el tema claro y en el oscuro,
// y los dos bloques del tema oscuro (preferencia del sistema y elección manual) son iguales.
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ESTADOS_MESA } from '../utils/estadoMesa';

// Se lee el archivo del disco (por eso este test corre en entorno node, no jsdom):
// al importar un .css, Vitest no entrega su contenido.
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');

/** Luminancia relativa de un color #rrggbb (fórmula de WCAG). */
function luminancia(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Variables --mesa-* declaradas dentro de un bloque de CSS. */
function variablesMesa(bloque) {
  const variables = {};
  for (const [, nombre, valor] of bloque.matchAll(/(--mesa-[a-z-]+):\s*(#[0-9a-f]{6})/gi)) {
    variables[nombre] = valor;
  }
  return variables;
}

const inicioOscuroSistema = css.indexOf('@media (prefers-color-scheme: dark)');
const inicioOscuroManual = css.indexOf(":root[data-theme='dark']");

const temas = {
  claro: variablesMesa(css.slice(0, inicioOscuroSistema)),
  'oscuro (sistema)': variablesMesa(css.slice(inicioOscuroSistema, inicioOscuroManual)),
  'oscuro (manual)': variablesMesa(css.slice(inicioOscuroManual))
};

const claves = Object.keys(ESTADOS_MESA);

describe.each(Object.keys(temas))('colores de estado de mesa: tema %s', (tema) => {
  test.each(claves)('"%s" tiene fondo y texto definidos con contraste >= 4.5', (clave) => {
    const fondo = temas[tema][`--mesa-${clave}`];
    const texto = temas[tema][`--mesa-${clave}-texto`];
    expect(fondo).toBeDefined();
    expect(texto).toBeDefined();
    expect(contraste(fondo, texto)).toBeGreaterThanOrEqual(4.5);
  });

  test('cada estado tiene un color de fondo distinto', () => {
    const fondos = claves.map((clave) => temas[tema][`--mesa-${clave}`]);
    expect(new Set(fondos).size).toBe(claves.length);
  });
});

test('los dos bloques del tema oscuro definen los mismos colores', () => {
  expect(temas['oscuro (manual)']).toEqual(temas['oscuro (sistema)']);
});
