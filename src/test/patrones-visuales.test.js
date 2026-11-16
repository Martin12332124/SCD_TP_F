// @vitest-environment node
// Vigila que no vuelvan los patrones visuales que el equipo decidió no usar:
// - etiquetas chicas en mayúsculas con espaciado entre letras,
// - botones o etiquetas con forma de píldora (radio 999px),
// - puntitos de color con texto (🟢/🔴 o círculos con radio 50%),
// - texto muy chico (menos de 14px) o con el gris tenue que casi se pierde con el fondo,
// - etiquetas numeradas tipo 01/02/03.
// Revisa el código de los componentes, así que es un control aproximado: la revisión
// visual en el navegador (tema claro y oscuro) sigue siendo necesaria.
import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const carpeta = new URL('../componentes/', import.meta.url);
const componentes = readdirSync(carpeta).filter((f) => f.endsWith('.jsx') && !f.includes('.test.'));
const fuente = Object.fromEntries(
  componentes.map((f) => [f, readFileSync(new URL(f, carpeta), 'utf8')])
);

const PROHIBIDOS = [
  ['mayúsculas forzadas', /textTransform:\s*'uppercase'/],
  ['espaciado entre letras', /letterSpacing/],
  ['forma de píldora', /999px/],
  ['círculo (puntito de estado)', /borderRadius:\s*'50%'/],
  ['puntito de color en el texto', /🟢|🔴|🟡|⚪/],
  ['gris tenue que se pierde con el fondo', /--color-texto-tenue/],
  ['etiqueta numerada tipo 01/02', />\s*0[1-9]\s*</]
];

describe.each(componentes)('patrones visuales: %s', (archivo) => {
  test.each(PROHIBIDOS)('no usa %s', (_nombre, patron) => {
    expect(fuente[archivo]).not.toMatch(patron);
  });

  test('no usa textos de menos de 14px', () => {
    const tamanos = [...fuente[archivo].matchAll(/fontSize:\s*'(\d+)px'/g)].map((m) =>
      Number(m[1])
    );
    expect(tamanos.filter((t) => t < 14)).toEqual([]);
  });
});

test('se revisaron todos los componentes', () => {
  expect(componentes).toEqual(
    expect.arrayContaining([
      'App.jsx',
      'MapaMesas.jsx',
      'DetalleMesa.jsx',
      'TomaPedido.jsx',
      'SelectorTema.jsx',
      'Encabezado.jsx',
      'UltimaActualizacion.jsx',
      'AvancePedido.jsx',
      'TrasladoMesa.jsx',
      'AdminMesas.jsx'
    ])
  );
});
