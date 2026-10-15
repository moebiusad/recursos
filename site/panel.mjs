// site/panel.mjs — panel de publicaciones de Alfredo (perfil "Alfredo" de Upload-Post).
// Lee el historial y lo programado de Upload-Post y escribe dist/panel/index.html + dist/panel/datos.json.
// Fuente de verdad: Upload-Post. Sin UPLOAD_POST_API_KEY no se genera el panel (el sitio sigue igual).
// Uso: node site/panel.mjs [raiz]   (lo llama build.mjs; también sirve solo)
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { renderPanel, agruparPorDia } from './panel-lib.mjs';

const API = 'https://api.upload-post.com/api';
const PERFIL = process.env.PANEL_PERFIL || 'Alfredo';
const TZ = 'America/Mexico_City';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = process.argv[2] ? resolve(process.argv[2]) : dirname(aqui);
const dist = join(raiz, 'dist', 'panel');

function llave() {
  if (process.env.UPLOAD_POST_API_KEY) return process.env.UPLOAD_POST_API_KEY;
  for (const f of [join(raiz, '.env'), '/Volumes/western/CLAUDECODE/Metal/config/.env']) {
    if (!existsSync(f)) continue;
    const l = readFileSync(f, 'utf8').split('\n').find((x) => x.startsWith('UPLOAD_POST_API_KEY='));
    if (l) return l.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');
  }
  return null;
}

async function api(ruta, key) {
  const r = await fetch(`${API}${ruta}`, { headers: { Authorization: `Apikey ${key}` } });
  if (!r.ok) throw new Error(`${ruta}: HTTP ${r.status}`);
  return r.json();
}

async function historial(key, desde) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const d = await api(`/uploadposts/history?limit=100&page=${page}`, key);
    const h = d.result?.history || d.history || [];
    out.push(...h.filter((x) => x.profile_username === PERFIL));
    const masViejo = h[h.length - 1]?.upload_timestamp || '';
    if (!h.length || masViejo < desde) break;
  }
  return out;
}

async function programados(key) {
  const d = await api('/uploadposts/schedule', key);
  const lista = d.result?.scheduled_posts || d.scheduled_posts || [];
  return lista.filter((p) => p.profile_username === PERFIL);
}

const key = llave();
if (!key) {
  console.log('panel: sin UPLOAD_POST_API_KEY, no se genera');
  process.exit(0);
}
const hoy = new Date();
const desde = new Date(hoy.getTime() - 21 * 86400e3).toISOString();
const [hist, prog] = await Promise.all([historial(key, desde), programados(key)]);
const datos = agruparPorDia(hist, prog, { tz: TZ, hoy, semanasAtras: 2, semanasAdelante: 1 });
mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, 'index.html'), renderPanel(datos, { generado: hoy, tz: TZ }));
writeFileSync(join(dist, 'datos.json'), JSON.stringify(datos, null, 1) + '\n');
console.log(`OK panel: ${hist.length} publicaciones, ${prog.length} programadas → ${dist}`);
