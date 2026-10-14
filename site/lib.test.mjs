// site/lib.test.mjs — pruebas de las funciones puras (node --test)
import test from 'node:test';
import assert from 'node:assert/strict';
import { parsearFrontMatter } from './lib.mjs';

// --- front matter ---
test('parsearFrontMatter separa datos y cuerpo, ignora comentarios y comillas', () => {
  const md = `---
titulo: "Prompt de arte"
slug: prompt-arte
tipo: guia            # guia | herramienta
url: https://ejemplo.com/x#seccion
boton:
---
Texto **libre**.

Segundo párrafo.`;
  const { datos, cuerpo } = parsearFrontMatter(md);
  assert.deepEqual(datos, { titulo: 'Prompt de arte', slug: 'prompt-arte', tipo: 'guia', url: 'https://ejemplo.com/x#seccion' });
  assert.equal(cuerpo, 'Texto **libre**.\n\nSegundo párrafo.');
});

test('parsearFrontMatter sin bloque --- devuelve datos vacíos', () => {
  assert.deepEqual(parsearFrontMatter('solo texto'), { datos: {}, cuerpo: 'solo texto' });
});

test('parsearFrontMatter conserva # dentro de un valor', () => {
  const { datos } = parsearFrontMatter('---\ntitulo: Guía #1 de color\n---\n');
  assert.equal(datos.titulo, 'Guía #1 de color');
});

// site/lib.test.mjs — añadir al final
import { validarRecurso, validarSlugsUnicos } from './lib.mjs';

const valido = {
  titulo: 'Prompt de dirección de arte', slug: 'prompt-arte', tipo: 'guia', descripcion: 'Una línea.',
  fecha: '2026-10-12', archivo: 'archivos/prompt.pdf',
};

// --- validación ---
test('validarRecurso acepta una ficha completa', () => {
  assert.deepEqual(validarRecurso(valido, { carpeta: 'prompt-arte', existeArchivo: () => true }), []);
});

test('validarRecurso: sin front matter', () => {
  assert.deepEqual(validarRecurso({}), ['no tiene front matter (bloque entre --- al inicio)']);
});

test('validarRecurso: campos obligatorios', () => {
  const e = validarRecurso({ slug: 'x' });
  assert.ok(e.includes('falta titulo'));
  assert.ok(e.includes('falta descripcion'));
  assert.ok(e.includes('fecha inválida: usa AAAA-MM-DD'));
  assert.ok(e.some((m) => m.startsWith('tipo "" inválido')));
});

test('validarRecurso: slug en minúsculas y guiones, igual a la carpeta', () => {
  assert.ok(validarRecurso({ ...valido, slug: 'Prompt_Arte' }).some((m) => m.includes('inválido')));
  assert.ok(validarRecurso({ ...valido, slug: 'prompt-arte-' }).some((m) => m.includes('inválido')));
  assert.ok(validarRecurso(valido, { carpeta: 'otra' }).some((m) => m.includes('no coincide con la carpeta')));
});

test('validarRecurso: tipo de la lista cerrada', () => {
  assert.ok(validarRecurso({ ...valido, tipo: 'pdf' }).some((m) => m.startsWith('tipo "pdf" inválido')));
});

test('validarRecurso: fecha con formato y existente', () => {
  assert.ok(validarRecurso({ ...valido, fecha: '12/10/2026' }).includes('fecha inválida: usa AAAA-MM-DD'));
  assert.ok(validarRecurso({ ...valido, fecha: '2026-13-45' }).includes('fecha inválida: usa AAAA-MM-DD'));
});

test('validarRecurso: exactamente uno de archivo o url', () => {
  const { archivo, ...sinArchivo } = valido;
  assert.ok(validarRecurso(sinArchivo).includes('debe tener exactamente uno de archivo o url'));
  assert.ok(validarRecurso({ ...valido, url: 'https://x.y' }).includes('debe tener exactamente uno de archivo o url'));
});

test('validarRecurso: el archivo debe existir dentro de archivos/', () => {
  assert.ok(validarRecurso(valido, { existeArchivo: () => false }).includes('no existe el archivo archivos/prompt.pdf'));
  assert.ok(validarRecurso({ ...valido, archivo: 'prompt.pdf' }).includes('archivo debe estar dentro de archivos/'));
});

test('validarRecurso: url y video deben ser URLs completas', () => {
  const { archivo, ...sinArchivo } = valido;
  assert.ok(validarRecurso({ ...sinArchivo, url: 'ejemplo.com' }).includes('url debe empezar con https://'));
  assert.ok(validarRecurso({ ...valido, video: 'instagram.com/reel/1' }).includes('video debe ser una URL completa'));
});

test('validarSlugsUnicos detecta repetidos', () => {
  const e = validarSlugsUnicos([{ slug: 'a', carpeta: 'a' }, { slug: 'b', carpeta: 'b' }, { slug: 'a', carpeta: 'a2' }]);
  assert.deepEqual(e, ['slug "a" repetido en recursos/a y recursos/a2']);
});

// site/lib.test.mjs — añadir al final
import { markdownAHtml, escaparHtml } from './lib.mjs';

// --- markdown ---
test('markdownAHtml: párrafos, encabezados, listas, links y negritas', () => {
  const md = `# Para qué sirve

Un párrafo con **negrita** y un [link](https://ejemplo.com/?a=1&b=2)
que sigue en la línea siguiente.

- uno
- dos

1. primero
2. segundo

## Créditos`;
  assert.equal(markdownAHtml(md), [
    '<h2>Para qué sirve</h2>',
    '<p>Un párrafo con <strong>negrita</strong> y un <a href="https://ejemplo.com/?a=1&amp;b=2">link</a> que sigue en la línea siguiente.</p>',
    '<ul><li>uno</li><li>dos</li></ul>',
    '<ol><li>primero</li><li>segundo</li></ol>',
    '<h3>Créditos</h3>',
  ].join('\n'));
});

test('markdownAHtml escapa HTML y no crea links javascript:', () => {
  assert.equal(markdownAHtml('<b>hola</b> [x](javascript:alert(1))'), '<p>&lt;b&gt;hola&lt;/b&gt; [x](javascript:alert(1))</p>');
  assert.equal(markdownAHtml(''), '');
});

test('escaparHtml cubre & < > " \'', () => {
  assert.equal(escaparHtml(`<a href="x">Tom & Jerry's</a>`), '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;');
});

// site/lib.test.mjs — añadir al final
import { generarIndice, ordenarPorFecha } from './lib.mjs';

// --- índice JSON ---
test('generarIndice ordena por fecha descendente y arma URLs absolutas', () => {
  const lista = [
    { ...valido, slug: 'viejo', fecha: '2026-01-01' },
    { ...valido, slug: 'nuevo', fecha: '2026-10-12', archivo: 'archivos/mi guía.pdf' },
    { ...valido, slug: 'externo', fecha: '2026-05-05', archivo: undefined, url: 'https://n8n.io/x' },
  ];
  const idx = generarIndice(lista);
  assert.deepEqual(idx.map((r) => r.slug), ['nuevo', 'externo', 'viejo']);
  assert.deepEqual(Object.keys(idx[0]), ['slug', 'titulo', 'tipo', 'descripcion', 'fecha', 'url', 'descarga']);
  assert.equal(idx[0].url, 'https://recursos.ialfredo.com.mx/r/nuevo/');
  assert.equal(idx[0].descarga, 'https://recursos.ialfredo.com.mx/r/nuevo/archivos/mi%20gu%C3%ADa.pdf');
  assert.equal(idx[1].descarga, 'https://n8n.io/x');
});

test('ordenarPorFecha desempata por slug y no muta la lista', () => {
  const lista = [{ slug: 'b', fecha: '2026-01-01' }, { slug: 'a', fecha: '2026-01-01' }];
  assert.deepEqual(ordenarPorFecha(lista).map((r) => r.slug), ['a', 'b']);
  assert.equal(lista[0].slug, 'b');
});

// site/lib.test.mjs — añadir al final
import { renderIndex, renderRecurso, render404, BOTONES, MIS_LINKS } from './lib.mjs';

const base = '<title>{{titulo}}</title><meta property="og:url" content="{{url}}"><meta property="og:type" content="{{og_tipo}}">{{logo}}<main>{{contenido}}</main>{{anio}}';

// --- render ---
test('renderIndex escapa títulos, pone filtros solo de los tipos presentes y marca data-tipo', () => {
  const html = renderIndex([{ ...valido, titulo: '<script>alert(1)</script>' }, { ...valido, slug: 'flujo', tipo: 'n8n', url: 'https://x.y', archivo: undefined }], base, { anio: 2026 });
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(html.includes('<a href="#guia">Guía</a>'));
  assert.ok(html.includes('<a href="#n8n">Flujo n8n</a>'));
  assert.ok(!html.includes('<a href="#video">'));
  assert.ok(html.includes('data-tipo="n8n"'));
  assert.ok(html.includes('<title>Recursos · ialfredo</title>'));
  assert.ok(html.endsWith('2026'));
});

test('renderIndex sin recursos muestra el estado vacío', () => {
  assert.ok(renderIndex([], base).includes('Pronto habrá recursos aquí.'));
});

test('renderRecurso: OG, botón por tipo, download para archivos, video y bloque de Instagram', () => {
  const html = renderRecurso({ ...valido, cuerpo: 'Hola **mundo**', video: 'https://www.instagram.com/reel/abc/' }, base);
  assert.ok(html.includes('<title>Prompt de dirección de arte · Recursos de ialfredo</title>'));
  assert.ok(html.includes('<meta property="og:url" content="https://recursos.ialfredo.com.mx/r/prompt-arte/">'));
  assert.ok(html.includes('<meta property="og:type" content="article">'));
  assert.ok(html.includes(`href="https://recursos.ialfredo.com.mx/r/prompt-arte/archivos/prompt.pdf" download>${BOTONES.guia}</a>`));
  assert.ok(html.includes('<p>Hola <strong>mundo</strong></p>'));
  assert.ok(html.includes('href="https://www.instagram.com/reel/abc/"'));
  assert.ok(html.includes('https://www.instagram.com/_ialfredo_/'));
});

test('renderRecurso: url externa abre en pestaña nueva y respeta boton personalizado', () => {
  const html = renderRecurso({ ...valido, archivo: undefined, url: 'https://n8n.io/x', boton: 'Ir a n8n & co' }, base);
  assert.ok(html.includes('href="https://n8n.io/x" target="_blank" rel="noopener">Ir a n8n &amp; co</a>'));
  assert.ok(!html.includes('class="video"'));
});

test('renderRecurso escapa el título en el h1 y en el title', () => {
  const html = renderRecurso({ ...valido, titulo: 'Tom & "Jerry"' }, base);
  assert.ok(html.includes('<h1>Tom &amp; &quot;Jerry&quot;</h1>'));
  assert.ok(html.includes('<title>Tom &amp; &quot;Jerry&quot; · Recursos de ialfredo</title>'));
});

test('render404 enlaza a la portada', () => {
  assert.ok(render404(base).includes('<a class="boton grande" href="/">Ir a la portada</a>'));
});

test('renderIndex muestra los links de las bios (página, Skool y redes)', () => {
  const html = renderIndex([], base);
  for (const [, u] of MIS_LINKS) assert.ok(html.includes(`href="${u}"`), u);
});
