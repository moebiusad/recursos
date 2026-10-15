// site/panel-lib.mjs — lógica pura del panel de publicaciones (sin I/O), con tests en panel-lib.test.mjs.
import { escaparHtml } from './lib.mjs';

const DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const REDES = { instagram: 'IG', tiktok: 'TT', x: 'X', threads: 'Th', youtube: 'YT', facebook: 'FB' };

// Fecha/hora local (tz) de un instante ISO → { fecha: 'AAAA-MM-DD', hora: 'HH:MM' }
export function local(iso, tz) {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` };
}

// Palabra clave del CTA ("Comenta DISEÑO 👇 …" → "DISEÑO"), si la hay.
export function palabraClave(texto) {
  const m = /comenta\s+([A-ZÁÉÍÓÚÑ]{3,})/i.exec(texto || '');
  return m ? m[1].toUpperCase() : null;
}

// Título corto: primera línea sin el CTA, o la primera línea.
export function tituloCorto(texto) {
  const lineas = String(texto || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const sinCta = lineas.find((l) => !/^comenta\s/i.test(l) && !/link de mi perfil|link está en mi perfil/i.test(l)) || lineas[0] || '(sin texto)';
  if (/^hecho con @capcutapp/i.test(sinCta)) return 'CapCut';
  if (/^video creado con @capcutapp/i.test(sinCta)) return 'CapCut';
  return sinCta.length > 90 ? sinCta.slice(0, 87) + '…' : sinCta;
}

// Publicaciones (history) → un item por job (todas sus redes juntas).
export function agruparPublicados(history, tz) {
  // Clave: el job, pero si el mismo texto salió en varios jobs con menos de 10 min de diferencia
  // (Upload-Post a veces parte un post por red), se juntan en una sola tarjeta.
  const porJob = new Map();
  const clave = (h) => {
    const t = (h.post_caption || h.post_title || '').slice(0, 60);
    const min = Math.floor(new Date(h.upload_timestamp).getTime() / 600000);
    for (const it of porJob.values()) if (it.textoClave === t && Math.abs(it.min - min) <= 1) return it.job;
    return h.job_id || h.request_id || h.post_url;
  };
  for (const h of history) {
    const k = clave(h);
    if (!porJob.has(k)) porJob.set(k, { tipo: 'publicado', job: k, texto: h.post_caption || h.post_title || '', textoClave: (h.post_caption || h.post_title || '').slice(0, 60), min: Math.floor(new Date(h.upload_timestamp).getTime() / 600000), redes: {}, ts: h.upload_timestamp });
    const it = porJob.get(k);
    if (!it.redes[h.platform] || h.success) it.redes[h.platform] = { ok: Boolean(h.success), url: h.post_url || null, error: h.error_message || null };
    if (h.upload_timestamp < it.ts) it.ts = h.upload_timestamp;
  }
  return [...porJob.values()].map(({ textoClave, min, ...it }) => {
    const { fecha, hora } = local(it.ts, tz);
    return { ...it, fecha, hora, titulo: tituloCorto(it.texto), palabra: palabraClave(it.texto), fallos: Object.entries(it.redes).filter(([, r]) => !r.ok).map(([p]) => p) };
  });
}

// Programados (schedule) → items con fecha/hora local.
export function agruparProgramados(scheduled, tz) {
  return scheduled.map((p) => {
    const texto = p.title || p.caption || '';
    const str = p.original_scheduled_str || p.scheduled_date || '';
    let fecha, hora;
    if (p.original_scheduled_str) { [fecha, hora] = [str.slice(0, 10), str.slice(11, 16)]; }
    else ({ fecha, hora } = local(str.endsWith('Z') ? str : str + 'Z', tz));
    return { tipo: 'programado', job: p.job_id, texto, fecha, hora, titulo: tituloCorto(texto), palabra: palabraClave(texto),
      redes: Object.fromEntries((p.platforms || []).map((x) => [x, { ok: null, url: null }])), portada: Boolean(p.has_cover), fallos: [] };
  });
}

function lunesDe(fechaISO) {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7; // lunes = 0
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt;
}
const iso = (dt) => dt.toISOString().slice(0, 10);

export function agruparPorDia(history, scheduled, { tz, hoy, semanasAtras = 2, semanasAdelante = 1 }) {
  const items = [...agruparPublicados(history, tz), ...agruparProgramados(scheduled, tz)].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const hoyLocal = local(hoy.toISOString(), tz).fecha;
  const ini = lunesDe(hoyLocal); ini.setUTCDate(ini.getUTCDate() - 7 * semanasAtras);
  const semanas = [];
  for (let s = 0; s < semanasAtras + 1 + semanasAdelante; s++) {
    const dias = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(ini); dt.setUTCDate(ini.getUTCDate() + 7 * s + d);
      const f = iso(dt);
      dias.push({ fecha: f, hoy: f === hoyLocal, pasado: f < hoyLocal, items: items.filter((i) => i.fecha === f) });
    }
    semanas.push({ desde: dias[0].fecha, hasta: dias[6].fecha, dias });
  }
  const vacios = semanas.flatMap((w) => w.dias).filter((d) => d.pasado && !d.items.length).map((d) => d.fecha);
  return { hoy: hoyLocal, semanas, vacios, totalPublicados: items.filter((i) => i.tipo === 'publicado').length, totalProgramados: items.filter((i) => i.tipo === 'programado').length };
}

function etiquetaDia(fecha) {
  const [y, m, d] = fecha.split('-').map(Number);
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return `${DIAS[dow]} ${d} ${MESES[m - 1]}`;
}

function tarjeta(it) {
  const redes = Object.entries(it.redes).map(([p, r]) => {
    const cls = r.ok === false ? 'red mal' : r.ok ? 'red ok' : 'red prog';
    const t = escaparHtml(REDES[p] || p);
    return r.url ? `<a class="${cls}" href="${escaparHtml(r.url)}" target="_blank" rel="noopener" title="${escaparHtml(r.error || p)}">${t}</a>` : `<span class="${cls}" title="${escaparHtml(r.error || p)}">${t}</span>`;
  }).join('');
  const palabra = it.palabra ? `<b class="palabra">${escaparHtml(it.palabra)}</b>` : '';
  const aviso = it.fallos.length ? `<i class="aviso">falló en ${it.fallos.join(', ')}</i>` : '';
  const portada = it.tipo === 'programado' && !it.portada ? '<i class="aviso">sin portada</i>' : '';
  return `<article class="item ${it.tipo}"><time>${escaparHtml(it.hora)}</time>${palabra}<p>${escaparHtml(it.titulo)}</p><div class="redes">${redes}</div>${aviso}${portada}</article>`;
}

export function renderPanel(datos, { generado, tz }) {
  const gen = local(generado.toISOString(), tz);
  const semanas = datos.semanas.map((w) => `<section class="semana"><h2>${escaparHtml(etiquetaDia(w.desde))} → ${escaparHtml(etiquetaDia(w.hasta))}</h2><div class="dias">${w.dias.map((d) => {
    const cls = ['dia', d.hoy ? 'hoy' : '', d.pasado && !d.items.length ? 'vacio' : '', !d.pasado && !d.hoy && !d.items.length ? 'libre' : ''].filter(Boolean).join(' ');
    const cuerpo = d.items.length ? d.items.map(tarjeta).join('') : `<p class="nada">${d.pasado ? 'sin publicación' : d.hoy ? 'nada hoy (aún)' : 'libre'}</p>`;
    return `<div class="${cls}"><h3>${escaparHtml(etiquetaDia(d.fecha))}${d.hoy ? ' · hoy' : ''}</h3>${cuerpo}</div>`;
  }).join('')}</div></section>`).join('');
  const vacios = datos.vacios.length ? `<p class="resumen alerta">${datos.vacios.length} día(s) sin publicación en las últimas semanas: ${datos.vacios.map(etiquetaDia).map(escaparHtml).join(' · ')}</p>` : '<p class="resumen">Sin huecos en las últimas semanas 👏</p>';
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Panel · publicaciones de iAlfredo</title><meta name="color-scheme" content="dark"><meta name="theme-color" content="#0a0807">
<style>
:root{--bg:#0a0807;--card:#16120f;--borde:rgba(255,196,0,.18);--texto:#ece6dc;--apagado:#a39c92;--y:#FFC91F;--crema:#F5EFE2;--rojo:#e5484d;--verde:#5ad38a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--texto);font:15px/1.45 -apple-system,Montserrat,Arial,sans-serif;padding:1rem}
header{display:flex;flex-wrap:wrap;align-items:baseline;gap:.5rem 1rem;margin-bottom:.75rem}h1{font-size:1.4rem;margin:0}h1 b{color:var(--y)}
.meta{color:var(--apagado);font-size:.85rem}.resumen{margin:.25rem 0 1rem;padding:.6rem .9rem;border:1px solid var(--borde);border-radius:10px;font-size:.9rem}.alerta{border-color:var(--rojo)}
.leyenda{display:flex;gap:.8rem;flex-wrap:wrap;font-size:.8rem;color:var(--apagado);margin-bottom:1rem}.leyenda i{display:inline-block;width:.8em;height:.8em;border-radius:3px;margin-right:.3em;vertical-align:-1px}
.semana{margin-bottom:1.25rem}.semana h2{font-size:.9rem;color:var(--apagado);font-weight:600;margin:0 0 .5rem;text-transform:uppercase;letter-spacing:.06em}
.dias{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:.5rem}@media(max-width:900px){.dias{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:480px){.dias{grid-template-columns:1fr}}
.dia{background:var(--card);border:1px solid var(--borde);border-radius:12px;padding:.6rem;min-height:7rem}.dia h3{font-size:.85rem;margin:0 0 .5rem;color:var(--crema)}
.dia.hoy{border-color:var(--y);box-shadow:0 0 0 2px rgba(255,201,31,.25)}.dia.vacio{background:#1b1413;border-color:rgba(229,72,77,.5)}.dia.vacio .nada{color:var(--rojo)}.dia.libre{border-style:dashed;opacity:.8}
.nada{color:var(--apagado);font-size:.85rem;margin:0}
.item{border-radius:9px;padding:.5rem .6rem;margin-bottom:.45rem;background:#201b17;border-left:4px solid var(--crema)}.item.programado{border-left-color:var(--y);background:#221c0e}
.item time{font-size:.75rem;color:var(--apagado);margin-right:.4rem}.item p{margin:.2rem 0 .35rem;font-size:.85rem;line-height:1.3}
.palabra{font-size:.7rem;background:var(--y);color:#0a0807;padding:1px 6px;border-radius:4px;letter-spacing:.04em}
.redes{display:flex;gap:.3rem;flex-wrap:wrap}.red{font-size:.7rem;font-weight:700;padding:1px 6px;border-radius:4px;text-decoration:none;border:1px solid var(--borde);color:var(--texto)}
.red.ok{border-color:var(--verde);color:var(--verde)}.red.mal{border-color:var(--rojo);color:var(--rojo)}.red.prog{border-color:var(--y);color:var(--y)}
.aviso{display:block;font-size:.72rem;color:var(--rojo);margin-top:.3rem;font-style:normal}
footer{color:var(--apagado);font-size:.8rem;margin-top:1.5rem}footer a{color:var(--texto)}
</style></head><body>
<header><h1>Panel de <b>publicaciones</b></h1><span class="meta">perfil Alfredo · hoy ${escaparHtml(etiquetaDia(datos.hoy))} · actualizado ${escaparHtml(gen.fecha)} ${escaparHtml(gen.hora)} (${escaparHtml(tz)})</span></header>
${vacios}
<div class="leyenda"><span><i style="background:var(--crema)"></i>publicado</span><span><i style="background:var(--y)"></i>programado</span><span><i style="background:var(--rojo)"></i>día sin publicación / fallo</span><span><b class="palabra">PALABRA</b> = campaña de recurso</span></div>
${semanas}
<footer>Fuente: Upload-Post (historial + programados). Se regenera con cada publicación del sitio y cada hora. <a href="/">← recursos</a></footer>
</body></html>
`;
}
