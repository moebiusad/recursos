# recursos

Banco de recursos de [@_ialfredo_](https://www.instagram.com/_ialfredo_/): https://recursos.ialfredo.com.mx

Cada carpeta en `recursos/` es un recurso. Al hacer push a `main`, GitHub Actions corre las pruebas,
genera el sitio con `site/build.mjs` y lo publica en GitHub Pages (1–2 minutos).

## Agregar un recurso

1. Crea `recursos/<slug>/recurso.md` (el `slug` va en minúsculas con guiones y debe ser igual al nombre de la carpeta):

   ```markdown
   ---
   titulo: Prompt de dirección de arte para Magnific
   slug: prompt-magnific-arte
   tipo: guia                 # guia | herramienta | video | proyecto | preset | n8n
   descripcion: Una línea para la portada.
   fecha: 2026-10-12
   archivo: archivos/prompt-magnific.pdf    # o bien  url: https://…  (exactamente uno de los dos)
   boton: Descargar PDF                     # opcional; hay un texto por tipo
   video: https://www.instagram.com/reel/…  # opcional: dónde se regaló
   ---
   Texto libre en Markdown: para qué sirve, cómo usarlo, créditos.
   Soporta párrafos, encabezados (#, ##, ###), listas (- o 1.), [links](https://…) y **negritas**.
   ```

2. Si regalas un archivo pequeño (PDF, preset, flujo de n8n exportado), ponlo en `recursos/<slug>/archivos/`.
3. `git push` a `main`. La URL queda en `https://recursos.ialfredo.com.mx/r/<slug>/`.

Si falta un campo o algo no cuadra, el build falla y dice exactamente qué corregir.

## Archivos grandes (más de 100 MB)

GitHub no acepta archivos tan grandes en el repo. Súbelos como *Release* y enlaza la descarga con `url:`:

```bash
gh release create <slug> ./Proyecto.aep --title "Proyecto de After Effects" --notes "Archivo del recurso <slug>"
# url: https://github.com/moebiusad/recursos/releases/download/<slug>/Proyecto.aep
```

## Desarrollo local

```bash
npm test               # pruebas (node --test)
node site/build.mjs    # genera dist/
npx --yes serve dist   # ver en http://localhost:3000
```

`dist/recursos.json` es el índice que usan las automatizaciones (auto-DM) para resolver links.
