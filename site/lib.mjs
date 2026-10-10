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

export function escaparHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function enLinea(texto) {
  return escaparHtml(texto)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (todo, t, href) =>
      /^(https?:\/\/|\/|#|\.\/|[^:]+$)/.test(href) ? `<a href="${href}">${t}</a>` : todo);
}

export function markdownAHtml(md) {
  const bloques = String(md ?? '').replace(/\r\n/g, '\n').trim().split(/\n{2,}/).filter(Boolean);
  return bloques.map((b) => {
    const lineas = b.split('\n');
    const h = /^(#{1,3})\s+(.+)$/.exec(b);
    if (h && lineas.length === 1) { const n = h[1].length + 1; return `<h${n}>${enLinea(h[2])}</h${n}>`; }
    if (lineas.every((l) => /^[-*]\s+/.test(l))) return `<ul>${lineas.map((l) => `<li>${enLinea(l.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`;
    if (lineas.every((l) => /^\d+\.\s+/.test(l))) return `<ol>${lineas.map((l) => `<li>${enLinea(l.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
    return `<p>${enLinea(lineas.join(' '))}</p>`;
  }).join('\n');
}

export const urlRecurso = (slug) => `${SITIO}/r/${slug}/`;

export function urlDescarga(r) {
  if (r.url) return r.url;
  return `${SITIO}/r/${r.slug}/${r.archivo.split('/').map(encodeURIComponent).join('/')}`;
}

export function ordenarPorFecha(recursos) {
  return [...recursos].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.slug.localeCompare(b.slug)));
}

export function generarIndice(recursos) {
  return ordenarPorFecha(recursos).map((r) => ({
    slug: r.slug, titulo: r.titulo, tipo: r.tipo, descripcion: r.descripcion, fecha: r.fecha,
    url: urlRecurso(r.slug), descarga: urlDescarga(r),
  }));
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function formatearFecha(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES[m - 1]} ${a}`;
}

export function aplicarPlantilla(base, vars) {
  return base.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}

const comunes = (opciones) => ({ logo: opciones.logo ?? '', anio: String(opciones.anio ?? new Date().getFullYear()) });

function tarjeta(r) {
  const href = `/r/${r.slug}/`;
  return `<li class="tarjeta" data-tipo="${r.tipo}">
  <span class="tipo">${ETIQUETAS[r.tipo]}</span>
  <h2><a href="${href}">${escaparHtml(r.titulo)}</a></h2>
  <p>${escaparHtml(r.descripcion)}</p>
  <div class="pie"><time datetime="${r.fecha}">${formatearFecha(r.fecha)}</time><a class="boton" href="${href}">Ver recurso</a></div>
</li>`;
}

export function renderIndex(recursos, base, opciones = {}) {
  const lista = ordenarPorFecha(recursos);
  const tipos = TIPOS.filter((t) => lista.some((r) => r.tipo === t));
  const filtros = ['<a href="#todos" class="activo">Todos</a>', ...tipos.map((t) => `<a href="#${t}">${ETIQUETAS[t]}</a>`)].join('\n    ');
  const anclas = ['todos', ...tipos].map((t) => `<span class="ancla" id="${t}"></span>`).join('');
  const contenido = `<section class="intro">
  <h1>Recursos gratis de mis videos</h1>
  <p>Guías, herramientas, proyectos y flujos que regalo en <a href="${INSTAGRAM}">@_ialfredo_</a>. Toma lo que necesites.</p>
</section>
<nav class="filtros" aria-label="Filtrar por tipo">
    ${filtros}
</nav>
${anclas}
${lista.length ? `<ul class="lista">\n${lista.map(tarjeta).join('\n')}\n</ul>` : '<p class="vacio">Pronto habrá recursos aquí.</p>'}
<script>
const marcar = () => { const t = location.hash.slice(1) || 'todos'; document.querySelectorAll('.filtros a').forEach((a) => a.classList.toggle('activo', a.getAttribute('href') === '#' + t)); };
addEventListener('hashchange', marcar); marcar();
</script>`;
  return aplicarPlantilla(base, {
    ...comunes(opciones),
    titulo: 'Recursos · ialfredo',
    descripcion: 'Guías, herramientas, proyectos y flujos gratis que Alfredo regala en sus videos.',
    url: `${SITIO}/`, og_tipo: 'website', contenido,
  });
}

export function renderRecurso(r, base, opciones = {}) {
  const descarga = urlDescarga(r);
  const boton = r.boton || BOTONES[r.tipo];
  const atributos = r.url ? 'target="_blank" rel="noopener"' : 'download';
  const contenido = `<article class="recurso">
  <a class="volver" href="/">← Todos los recursos</a>
  <span class="tipo">${ETIQUETAS[r.tipo]}</span>
  <h1>${escaparHtml(r.titulo)}</h1>
  <p class="meta"><time datetime="${r.fecha}">${formatearFecha(r.fecha)}</time></p>
  <p class="lead">${escaparHtml(r.descripcion)}</p>
  <a class="boton grande" href="${escaparHtml(descarga)}" ${atributos}>${escaparHtml(boton)}</a>
  <div class="cuerpo">${markdownAHtml(r.cuerpo)}</div>
  ${r.video ? `<p class="video">Lo regalé en <a href="${escaparHtml(r.video)}" target="_blank" rel="noopener">este video</a>.</p>` : ''}
</article>
<aside class="sigueme">
  <h2>¿Quieres más?</h2>
  <p>Sígueme en <a href="${INSTAGRAM}">@_ialfredo_</a>: ahí regalo recursos como este cada semana.</p>
  <a class="boton" href="${INSTAGRAM}" target="_blank" rel="noopener">Seguir en Instagram</a>
</aside>`;
  return aplicarPlantilla(base, {
    ...comunes(opciones),
    titulo: `${escaparHtml(r.titulo)} · Recursos de ialfredo`,
    descripcion: escaparHtml(r.descripcion),
    url: urlRecurso(r.slug), og_tipo: 'article', contenido,
  });
}

export function render404(base, opciones = {}) {
  const contenido = `<section class="recurso">
  <h1>Esa página no existe</h1>
  <p class="lead">Quizá el recurso cambió de nombre o el link llegó incompleto.</p>
  <a class="boton grande" href="/">Ir a la portada</a>
</section>`;
  return aplicarPlantilla(base, { ...comunes(opciones), titulo: 'Página no encontrada · Recursos de ialfredo', descripcion: 'Esa página no existe.', url: `${SITIO}/404.html`, og_tipo: 'website', contenido });
}
