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
