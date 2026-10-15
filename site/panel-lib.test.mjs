import test from 'node:test';
import assert from 'node:assert/strict';
import { local, palabraClave, tituloCorto, agruparPublicados, agruparProgramados, agruparPorDia, renderPanel } from './panel-lib.mjs';

const TZ = 'America/Mexico_City';

test('local convierte UTC a hora de CDMX', () => {
  assert.deepEqual(local('2026-10-14T19:14:50Z', TZ), { fecha: '2026-10-14', hora: '13:14' });
  assert.deepEqual(local('2026-10-15T05:30:00Z', TZ), { fecha: '2026-10-14', hora: '23:30' });
});

test('palabraClave y tituloCorto', () => {
  assert.equal(palabraClave('Comenta DISEÑO 👇 y te mando mi lista'), 'DISEÑO');
  assert.equal(palabraClave('Hecho con @capcutapp'), null);
  assert.equal(tituloCorto('Comenta REA 👇 y te paso el paso a paso.\n\nVes algo genial en una app\n\n🤖 Video hecho con IA'), 'Ves algo genial en una app');
  assert.equal(tituloCorto(''), '(sin texto)');
});

test('agruparPublicados junta las redes de un mismo job y marca fallos', () => {
  const h = [
    { job_id: 'j1', platform: 'instagram', success: true, post_url: 'https://ig/1', upload_timestamp: '2026-10-14T19:14:52Z', post_caption: 'Comenta DISEÑO 👇\n\nTu IA no diseña mal' },
    { job_id: 'j1', platform: 'x', success: false, error_message: 'spend cap', upload_timestamp: '2026-10-14T19:14:20Z', post_caption: 'Comenta DISEÑO 👇\n\nTu IA no diseña mal' },
  ];
  const [it] = agruparPublicados(h, TZ);
  assert.equal(it.tipo, 'publicado'); assert.equal(it.fecha, '2026-10-14'); assert.equal(it.hora, '13:14');
  assert.equal(it.palabra, 'DISEÑO'); assert.deepEqual(it.fallos, ['x']); assert.equal(it.redes.instagram.url, 'https://ig/1');
});

test('agruparProgramados usa la hora local original y detecta portada', () => {
  const [it] = agruparProgramados([{ job_id: 'p1', original_scheduled_str: '2026-10-16T08:00:00', platforms: ['tiktok', 'instagram'], has_cover: true, title: 'Comenta STACK 👇\n\nPagas cinco suscripciones' }], TZ);
  assert.equal(it.fecha, '2026-10-16'); assert.equal(it.hora, '08:00'); assert.equal(it.portada, true); assert.equal(it.palabra, 'STACK');
  assert.deepEqual(Object.keys(it.redes), ['tiktok', 'instagram']);
});

test('agruparPorDia arma semanas de lunes a domingo, marca hoy y los días vacíos pasados', () => {
  const hoy = new Date('2026-10-14T21:00:00Z'); // mié 14 oct 15:00 CDMX
  const d = agruparPorDia([{ job_id: 'j1', platform: 'instagram', success: true, upload_timestamp: '2026-10-14T19:14:52Z', post_caption: 'x' }], [], { tz: TZ, hoy, semanasAtras: 1, semanasAdelante: 1 });
  assert.equal(d.hoy, '2026-10-14');
  assert.equal(d.semanas.length, 3);
  assert.equal(d.semanas[0].desde, '2026-10-05'); assert.equal(d.semanas[1].desde, '2026-10-12'); assert.equal(d.semanas[2].desde, '2026-10-19');
  const hoyDia = d.semanas[1].dias.find((x) => x.hoy); assert.equal(hoyDia.items.length, 1);
  assert.ok(d.vacios.includes('2026-10-13')); assert.ok(!d.vacios.includes('2026-10-14')); assert.ok(!d.vacios.includes('2026-10-15'));
});

test('renderPanel escapa y muestra lo esencial', () => {
  const hoy = new Date('2026-10-14T21:00:00Z');
  const d = agruparPorDia([{ job_id: 'j1', platform: 'instagram', success: true, upload_timestamp: '2026-10-14T19:14:52Z', post_caption: '<b>hola</b>' }], [], { tz: TZ, hoy, semanasAtras: 0, semanasAdelante: 0 });
  const html = renderPanel(d, { generado: hoy, tz: TZ });
  assert.ok(html.includes('&lt;b&gt;hola&lt;/b&gt;')); assert.ok(!html.includes('<b>hola</b>'));
  assert.ok(html.includes('noindex')); assert.ok(html.includes('· hoy'));
});
