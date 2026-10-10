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
