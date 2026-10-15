// site/build.mjs — lee recursos/*/recurso.md y escribe dist/. Solo I/O; la lógica vive en lib.mjs.
// Uso: node site/build.mjs [raiz]   (raiz = carpeta con recursos/ y CNAME; por defecto la del repo)
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { parsearFrontMatter, validarRecurso, validarSlugsUnicos, generarIndice, renderIndex, renderRecurso, render404 } from './lib.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = process.argv[2] ? resolve(process.argv[2]) : dirname(aqui);
const dirRecursos = join(raiz, 'recursos');
const dist = join(raiz, 'dist');
const plantilla = join(aqui, 'plantilla');

const carpetas = existsSync(dirRecursos)
  ? readdirSync(dirRecursos, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
  : [];
const recursos = [];
const errores = [];
for (const carpeta of carpetas) {
  const ruta = join(dirRecursos, carpeta, 'recurso.md');
  if (!existsSync(ruta)) { errores.push(`recursos/${carpeta}: falta recurso.md`); continue; }
  const { datos, cuerpo } = parsearFrontMatter(readFileSync(ruta, 'utf8'));
  const existeArchivo = (a) => existsSync(join(dirRecursos, carpeta, a));
  for (const e of validarRecurso(datos, { carpeta, existeArchivo })) errores.push(`recursos/${carpeta}/recurso.md: ${e}`);
  recursos.push({ ...datos, cuerpo, carpeta });
}
errores.push(...validarSlugsUnicos(recursos));
if (errores.length) {
  console.error(`El build falló: ${errores.length} problema(s) en las fichas. Corrige y vuelve a correr.\n` + errores.map((e) => ` - ${e}`).join('\n'));
  process.exit(1);
}

const base = readFileSync(join(plantilla, 'base.html'), 'utf8');
const hayLogo = existsSync(join(plantilla, 'logo.svg'));
const opciones = { logo: hayLogo ? '<img class="logo" src="/logo.svg" alt="" width="28" height="28">' : '' };

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, 'index.html'), renderIndex(recursos, base, opciones));
writeFileSync(join(dist, '404.html'), render404(base, opciones));
writeFileSync(join(dist, 'recursos.json'), JSON.stringify(generarIndice(recursos), null, 2) + '\n');
for (const r of recursos) {
  const carpetaDist = join(dist, 'r', r.slug);
  mkdirSync(carpetaDist, { recursive: true });
  writeFileSync(join(carpetaDist, 'index.html'), renderRecurso(r, base, opciones));
  const archivos = join(dirRecursos, r.carpeta, 'archivos');
  if (existsSync(archivos)) cpSync(archivos, join(carpetaDist, 'archivos'), { recursive: true });
}
copyFileSync(join(plantilla, 'estilos.css'), join(dist, 'estilos.css'));
if (hayLogo) copyFileSync(join(plantilla, 'logo.svg'), join(dist, 'logo.svg'));
if (existsSync(join(raiz, 'CNAME'))) copyFileSync(join(raiz, 'CNAME'), join(dist, 'CNAME'));
writeFileSync(join(dist, '.nojekyll'), '');
console.log(`OK: ${recursos.length} recurso(s) en ${dist}`);
// Panel privado de publicaciones (dist/panel/): se genera aparte y nunca rompe el sitio si falla.
try {
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, [join(aqui, 'panel.mjs'), raiz], { stdio: 'inherit' });
} catch (e) {
  console.error('panel: no se generó (' + (e.message || e) + ')');
}
