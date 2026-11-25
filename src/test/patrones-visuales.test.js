// @vitest-environment node
// Vigila que no vuelvan los patrones visuales que el equipo decidió no usar:
// - etiquetas chicas en mayúsculas con espaciado entre letras,
// - botones o etiquetas con forma de píldora (radio 999px),
// - puntitos de color con texto (🟢/🔴 o círculos con radio 50%),
// - texto muy chico (menos de 14px) o con el gris tenue que casi se pierde con el fondo,
// - etiquetas numeradas tipo 01/02/03,
// - emojis como íconos decorativos (se usan íconos SVG propios: shared/components/Icono.jsx).
//   Los estados que llegan del backend ('En Cocina 🍳') y los avisos ✅/⚠️ son datos y
//   mensajes, no decoración: se muestran con su etiqueta o se mantienen por contrato.
// Revisa el código de los componentes, así que es un control aproximado: la revisión
// visual en el navegador (tema claro y oscuro) sigue siendo necesaria.
import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const carpetas = [
  new URL('../componentes/', import.meta.url),
  new URL('../modules/pedidos/components/', import.meta.url),
  new URL('../shared/components/', import.meta.url)
];
const archivos = carpetas.flatMap((carpeta) =>
  readdirSync(carpeta)
    .filter((f) => f.endsWith('.jsx') && !f.includes('.test.'))
    .map((archivo) => ({ archivo, ruta: new URL(archivo, carpeta) }))
);
const componentes = archivos.map(({ archivo }) => archivo);
const fuente = Object.fromEntries(
  archivos.map(({ archivo, ruta }) => [archivo, readFileSync(ruta, 'utf8')])
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

/** El código sin comentarios: los comentarios pueden citar estados con emoji. */
const sinComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// Emojis que se usaban como íconos decorativos y se reemplazaron por SVG
const EMOJIS_DECORATIVOS = /🍽️|📝|🍳|🍷|🪑|⚙️|🔄|🛒|⏳|⏱️|🌙|☀️|✔|✖|🛎️/;

describe.each(componentes)('patrones visuales: %s', (archivo) => {
  test('no usa emojis como íconos decorativos', () => {
    // Se ignoran los textos de estado del backend ('Recibido 📝', etc.), que son datos
    const codigo = sinComentarios(fuente[archivo]).replace(
      /'(Recibido 📝|En Cocina 🍳|Listo 🍽️)'/g,
      ''
    );
    expect(codigo).not.toMatch(EMOJIS_DECORATIVOS);
  });

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
      'RielComandas.jsx',
      'Icono.jsx',
      'AvancePedido.jsx',
      'TrasladoMesa.jsx',
      'AdminMesas.jsx'
    ])
  );
});
