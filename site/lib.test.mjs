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
