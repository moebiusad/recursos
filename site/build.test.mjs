// site/build.test.mjs — prueba de punta a punta del generador sobre una carpeta temporal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const build = join(dirname(fileURLToPath(import.meta.url)), 'build.mjs');

function fixture(fichas) {
  const raiz = mkdtempSync(join(tmpdir(), 'recursos-'));
  writeFileSync(join(raiz, 'CNAME'), 'recursos.ialfredo.com.mx\n');
  for (const [carpeta, md, archivos = {}] of fichas) {
    mkdirSync(join(raiz, 'recursos', carpeta, 'archivos'), { recursive: true });
    writeFileSync(join(raiz, 'recursos', carpeta, 'recurso.md'), md);
    for (const [nombre, contenido] of Object.entries(archivos)) writeFileSync(join(raiz, 'recursos', carpeta, 'archivos', nombre), contenido);
  }
  return raiz;
}

const fichaGuia = `---
titulo: Guía de prueba
slug: guia-prueba
tipo: guia
descripcion: Una guía.
fecha: 2026-10-01
archivo: archivos/guia.pdf
---
Cuerpo de la **guía**.`;

const fichaUrl = `---
titulo: Herramienta de prueba
slug: herramienta-prueba
tipo: herramienta
descripcion: Un link.
fecha: 2026-10-02
url: https://ejemplo.com/
---`;

test('build genera index, fichas, archivos, 404, recursos.json, CNAME y .nojekyll', () => {
  const raiz = fixture([['guia-prueba', fichaGuia, { 'guia.pdf': 'PDF' }], ['herramienta-prueba', fichaUrl]]);
  const salida = execFileSync(process.execPath, [build, raiz], { encoding: 'utf8' });
  assert.match(salida, /OK: 2 recurso\(s\)/);
  const dist = join(raiz, 'dist');
  for (const f of ['index.html', '404.html', 'recursos.json', 'CNAME', '.nojekyll', 'estilos.css', 'r/guia-prueba/index.html', 'r/guia-prueba/archivos/guia.pdf', 'r/herramienta-prueba/index.html']) {
    assert.ok(existsSync(join(dist, f)), `falta dist/${f}`);
  }
  const indice = JSON.parse(readFileSync(join(dist, 'recursos.json'), 'utf8'));
  assert.deepEqual(indice.map((r) => r.slug), ['herramienta-prueba', 'guia-prueba']);
  assert.equal(indice[1].descarga, 'https://recursos.ialfredo.com.mx/r/guia-prueba/archivos/guia.pdf');
  assert.ok(readFileSync(join(dist, 'r/guia-prueba/index.html'), 'utf8').includes('<strong>guía</strong>'));
  assert.equal(readFileSync(join(dist, 'CNAME'), 'utf8').trim(), 'recursos.ialfredo.com.mx');
  rmSync(raiz, { recursive: true, force: true });
});

test('build sale con código 1 y mensaje claro si una ficha es inválida', () => {
  const raiz = fixture([['mala', fichaGuia.replace('tipo: guia', 'tipo: pdf')]]);
  const r = spawnSync(process.execPath, [build, raiz], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /El build falló/);
  assert.match(r.stderr, /recursos\/mala\/recurso\.md: tipo "pdf" inválido/);
  assert.match(r.stderr, /no coincide con la carpeta "mala"/);
  assert.match(r.stderr, /no existe el archivo archivos\/guia\.pdf/);
  assert.ok(!existsSync(join(raiz, 'dist')), 'no debe escribir dist/ si hay errores');
  rmSync(raiz, { recursive: true, force: true });
});

test('build sin recursos produce una portada vacía válida', () => {
  const raiz = fixture([]);
  mkdirSync(join(raiz, 'recursos'));
  execFileSync(process.execPath, [build, raiz]);
  assert.ok(readFileSync(join(raiz, 'dist/index.html'), 'utf8').includes('Pronto habrá recursos aquí.'));
  assert.equal(readFileSync(join(raiz, 'dist/recursos.json'), 'utf8'), '[]\n');
  rmSync(raiz, { recursive: true, force: true });
});
