// site/lib.mjs — funciones puras del generador. Sin dependencias. build.mjs hace el I/O.

export const SITIO = 'https://recursos.ialfredo.com.mx';
export const INSTAGRAM = 'https://www.instagram.com/_ialfredo_/';
export const TIPOS = ['guia', 'herramienta', 'video', 'proyecto', 'preset', 'n8n'];
export const ETIQUETAS = { guia: 'Guía', herramienta: 'Herramienta', video: 'Video', proyecto: 'Proyecto', preset: 'Preset', n8n: 'Flujo n8n' };
export const BOTONES = { guia: 'Descargar guía', herramienta: 'Abrir herramienta', video: 'Ver video', proyecto: 'Descargar proyecto', preset: 'Descargar preset', n8n: 'Descargar flujo' };

export function parsearFrontMatter(texto) {
  const t = String(texto ?? '').replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(t);
  if (!m) return { datos: {}, cuerpo: t.trim() };
  const datos = {};
  for (const linea of m[1].split('\n')) {
    const par = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(linea);
    if (!par) continue;
    let valor = par[2].replace(/\s+#\s.*$/, '').trim();
    if (/^(["']).*\1$/.test(valor)) valor = valor.slice(1, -1);
    if (valor !== '') datos[par[1]] = valor;
  }
  return { datos, cuerpo: m[2].trim() };
}

const esUrl = (v) => /^https?:\/\/\S+$/.test(v);

export function validarRecurso(datos, { carpeta, existeArchivo } = {}) {
  const e = [];
  const d = datos ?? {};
  if (Object.keys(d).length === 0) return ['no tiene front matter (bloque entre --- al inicio)'];
  if (!d.titulo) e.push('falta titulo');
  if (!d.slug) e.push('falta slug');
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug)) e.push(`slug "${d.slug}" inválido: solo minúsculas, números y guiones`);
  else if (carpeta && carpeta !== d.slug) e.push(`slug "${d.slug}" no coincide con la carpeta "${carpeta}"`);
  if (!TIPOS.includes(d.tipo)) e.push(`tipo "${d.tipo ?? ''}" inválido: usa ${TIPOS.join(' | ')}`);
  if (!d.descripcion) e.push('falta descripcion');
  if (!d.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(d.fecha) || Number.isNaN(Date.parse(d.fecha))) e.push('fecha inválida: usa AAAA-MM-DD');
  if (Boolean(d.archivo) === Boolean(d.url)) e.push('debe tener exactamente uno de archivo o url');
  if (d.archivo) {
    if (!d.archivo.startsWith('archivos/')) e.push('archivo debe estar dentro de archivos/');
    else if (existeArchivo && !existeArchivo(d.archivo)) e.push(`no existe el archivo ${d.archivo}`);
  }
  if (d.url && !esUrl(d.url)) e.push('url debe empezar con https://');
  if (d.video && !esUrl(d.video)) e.push('video debe ser una URL completa');
  return e;
}

export function validarSlugsUnicos(recursos) {
  const vistos = new Map();
  const e = [];
  for (const r of recursos) {
    if (vistos.has(r.slug)) e.push(`slug "${r.slug}" repetido en recursos/${vistos.get(r.slug)} y recursos/${r.carpeta}`);
    else vistos.set(r.slug, r.carpeta);
  }
  return e;
}
