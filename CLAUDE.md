# Proyecto: recursos · recursos.ialfredo.com.mx

Lee `README.md` para el formato de una ficha (`recursos/<slug>/recurso.md`) y cómo se publica (push a main → GitHub Pages).

> **Coordinación iAlfredo (desde 2026-10-11):** al empezar una sesión lee `/Volumes/western/CLAUDECODE/ialfredo-central/COORDINACION.md` y `REGISTRO-RECURSOS.md`. Ahí está qué recursos existen, su palabra clave y en qué estado van. Al terminar, actualiza tu columna del registro y una línea en la bitácora. La guía de marca es `ialfredo-central/GUIA-DE-ESTILO.md`.

## Qué hacer en cada sesión
- Para cada recurso del registro en estado `listo` sin ficha: crear `recursos/<slug>/recurso.md` con `url:` = link de Gumroad (el correo se captura ahí), `tipo` según el registro, descripción de una línea en tono de marca; `npm test` y `node site/build.mjs` antes del push; pedir el ok de Alfredo antes de hacer push; después anotar la URL de la ficha en el registro.
- Borrar la ficha `ejemplo-herramienta` al publicar el primer recurso real.
