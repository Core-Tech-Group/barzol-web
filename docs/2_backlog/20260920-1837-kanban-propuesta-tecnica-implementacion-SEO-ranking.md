# Scrumban — SEO Esencial y estrellas administrables

> **Creado:** 2026-09-20 · **Estado:** código publicado; SQL remoto aplicado; Search Console y pruebas visuales en seguimiento
> **Fuente comercial vigente:** propuesta resumida del 19-09-2026, adjunta en la conversación: **Plan A · Ahorro = SEO Esencial (S/ 250) + estrellas administrables (S/ 200), total S/ 450**.  
> **Antecedente técnico, no alcance aprobado:** [propuesta extensa](../1_inbox/20260919-2310-propuesta-tecnica-implementacion-SEO-likes-productos.md).  
> **Contratos del repositorio:** [arquitectura](../../ARCHITECTURE.md), [constitución SDD](../../.sdd/CONSTITUTION.md), [ciclo SDD](../../.sdd/README.md).

## Decisión de alcance

La captura comercial más reciente reemplaza para esta entrega los módulos de la propuesta extensa. El resultado esperado es: sitemap, `robots.txt`, URL canónica, vinculación con Search Console y revisión de títulos/descripciones; promedio y cantidad de estrellas definidos por un administrador y visibles en tarjetas y ficha. El usuario autorizó expresamente commit y push; después confirmó la aplicación del SQL remoto.

**Fuera de esta entrega:** formulario público, enlaces únicos, tokens, reseñas y comentarios, moderación, distintivo «comprador verificado», favoritos/corazones, JSON-LD `Product`/`AggregateRating`, SEO e-commerce o local, analítica de WhatsApp y promesas de posición o estrellas en Google. El nombre histórico `SEO-ranking` del archivo no implica garantía de ranking. Los valores manuales no se presentan a Google como reseñas de compradores. [Google pide que los datos estructurados de valoraciones representen la información real mostrada y no garantiza resultados enriquecidos](https://developers.google.com/search/docs/appearance/structured-data/review-snippet).

## Línea de base comprobada · 20-09-2026

| Área | Evidencia | Consecuencia para el plan |
| :--- | :--- | :--- |
| Despliegue | `astro.config.mjs` usa `output: 'server'` + `@astrojs/cloudflare`; `wrangler.jsonc` apunta a **Workers con assets**, Supabase y R2. | No planificar Pages, D1 ni cambios de bindings. |
| SEO actual | `PublicLayout.astro` ya emite título, descripción y Open Graph; `og:url` usa el origen del request, pero falta `<link rel="canonical">`. Producción responde 200 en `/robots.txt` (contenido generado por Cloudflare) y 404 en `/sitemap.xml`. | Completar lo existente; comprobar cómo Cloudflare sirve `robots.txt` antes de reemplazarlo. |
| URLs públicas | Producto: `/producto/[slugCode]`, identidad por `code` numérico; `productoUrl()` genera el enlace. Categorías: `/catalogo/[categoria]`; búsqueda y filtros usan query string. | Reutilizar la misma lógica de URL. Sitemap solo para recursos públicos vigentes; evitar duplicados por slugs antiguos y parámetros. |
| Datos | `product` carece de rating; `Product`, `productoMapper`, `productoService` y `ProductosView` concentran el flujo. `ProductsAdmin.tsx` tiene **1428 líneas**. | Modelo mínimo en `product`; el control nuevo se aisló en `CalificacionesAdmin.tsx` para no ampliar el editor heredado. |
| Seguridad | Middleware protege páginas `/admin/**` y escrituras `/api/**`; la lectura pública del catálogo filtra `published` + `is_active`. `GET /api/productos` usa `getProductos()` y no es fuente segura para sitemap público. | Endpoint de rating con sesión/RLS; sitemap con consulta pública filtrada, sin exponer borradores. |
| Calidad local | Node 24.21.0 en Orange Pi 5 Max ARM64. Se ejecutó `npm ci --include=optional` para reponer bindings nativos de `node_modules` sin cambiar el lockfile. Tras implementar: `npm run typecheck`, 237/237 pruebas Node, `npm run build` y `npm run sdd:trace` pasan. Astro `dev`/preview y tests Workers no pueden iniciar `workerd`: TCMalloc falla al reservar un mapa virtual de 1 GiB en ARM64. | El build valida compilación; la inspección SSR de producción y el CI en x86 (`0c216d5`, Gates 1/2 verdes) completan la verificación runtime disponible. No presentar el debug local como ejecutado. |
| Deuda de tamaño | También superan 500 líneas `InicioAdmin.tsx` (895) y `CategoriesAdmin.tsx` (732). | Dividir en tareas acotadas, sin mezclar su conducta con SEO/rating. Todo archivo nuevo o modificado debe quedar por debajo de 500 líneas. |

Los cambios previos del usuario en `.gemini/skills/barzol-web-architect.md` y `.agents/` quedan fuera del commit de esta función. La propuesta extensa se incluye como antecedente del tablero.

## Flujo y política del tablero

**Estados:** `Por hacer` → `En curso` → `En revisión` → `Hecho`; `Bloqueado` exige causa concreta. **WIP:** máximo una tarea de cambio de datos/contrato y una de UI/SEO al mismo tiempo. Cada cierre registra evidencia de prueba y archivos tocados.

**Flujo ejecutado:** SPEC-006/007/008 → PLAN → pruebas RED → código GREEN → VERIFY (`typecheck`, Node, build y trazabilidad). La solicitud actual autorizó explícitamente avanzar por el flujo SDD y publicar por push. La migración SQL se aplicó el 21-09 y una lectura remota confirmó ambas columnas. Las comprobaciones manuales autenticadas siguen pendientes.

## Cola priorizada

| ID | Tarea y contrato de salida | Depende | Estado |
| :--- | :--- | :--- | :--- |
| **BZ-97** | Inventariar repo/producción, fijar alcance Plan A, preparar dependencias de Orange Pi y registrar línea de base. | — | **Hecho** |
| **BZ-98** | Especificar SEO Esencial en SPEC-006: URLs indexables, sitemap paginado/filtrado, canónicas, robots, metadatos, fallos de Supabase y noindex donde corresponda. Derivar PLAN y pruebas antes de tocar código. | BZ-97 | **Hecho** · SPEC, PLAN y tests RED |
| **BZ-99** | Especificar estrellas administrables en SPEC-007: procedencia de datos, rango y precisión, estado sin valoración, edición autorizada, exposición pública, accesibilidad y ausencia de reseñas falsas. Derivar PLAN y pruebas. | BZ-97 | **Hecho** · SPEC, PLAN y tests RED |
| **BZ-100** | Acordar ejecución reproducible de pruebas workerd para ARM64/CI; registrar comando, entorno y resultado. Si esta Orange Pi no puede ejecutarlas, exigir CI compatible antes del cierre. | BZ-97 | **Hecho** · TCMalloc local documentado; Gate 2 de CI x86 en `0c216d5` pasó |
| **BZ-101** | Dividir `ProductsAdmin.tsx` por estado, formulario y presentación conservando comportamiento y props. Cada archivo resultante <500 LOC; sin lógica duplicada. | BZ-99 | **Hecho** · SPEC-008, TEST-801/804, pruebas de interacción y gate de tamaño; editor original 488 LOC |
| **BZ-102** | Preparar migración reversible de `product` con `rating_avg` y `rating_count`, `CHECK` y estado vacío coherente; documentar esquema, grants/RLS y rollback. | BZ-99 | **Hecho** · usuario ejecutó SQL en Supabase; lectura remota pública de ambas columnas HTTP 200; escritura autenticada se verifica en BZ-111 |
| **BZ-103** | Extender tipo/mapper/servicio para leer rating desde una sola fuente, sin lectura por tarjeta; preservar filtros de publicado/activo y CRUD. | BZ-102 preparada | **Hecho** · mapper tolera ausencia de columnas, test TEST-706 |
| **BZ-104** | Añadir escritura de rating mediante endpoint dedicado y autenticado, validación Zod, cliente con sesión y RLS existente. | BZ-102, BZ-103 | **En revisión** · tests TEST-702/703/704 y SQL aplicado; escritura con sesión real pendiente |
| **BZ-105** | Incorporar en admin control accesible de promedio/cantidad, guardado y errores sin crecer el editor original ni borrar rating al editar otros campos. | BZ-104 | **En revisión** · al revisar producción el control estaba oculto en un panel plegado; REQ-708 lo mueve al formulario del producto; falta guardado con sesión real |
| **BZ-106** | Crear un único componente SSR de estrellas para tarjeta y ficha; propagar a Home, catálogo, búsqueda y carrusel, con estado vacío honesto. | BZ-103 | **En revisión** · los 26 productos tienen conteo cero; REQ-701 muestra cinco estrellas vacías y «Sin calificaciones»; falta prueba visual con producto valorado |
| **BZ-107** | Implementar `/sitemap.xml` con páginas públicas, categorías activas y productos publicados/activos; consulta paginada y error HTTP ante fallo de DB. | BZ-98 | **Hecho** · TEST-603/604/605; producción: XML válido, 40 URLs únicas, 25 productos |
| **BZ-108** | Configurar `robots.txt` con `Sitemap:` y reglas de rastreo; revisar la respuesta final de Cloudflare. | BZ-98, BZ-107 | **Hecho** · TEST-606 y sonda pública pasan; el archivo propio sustituye la política descriptiva por defecto de Cloudflare, que no tenía preferencias `Content-signal` |
| **BZ-109** | Fijar origen público en Astro y canónicas absolutas; producto con slug vigente, filtros y búsqueda según SPEC, metadatos sin duplicar. | BZ-98 | **Hecho** · TEST-601; canónica de producto y `noindex` de búsqueda/login observados en producción |
| **BZ-112** | Dividir `InicioAdmin.tsx` y `CategoriesAdmin.tsx` en entregas aisladas con pruebas de comportamiento antes/después. | BZ-97 | **Hecho** · SPEC-008, TEST-802/803/804, interacciones y gate de tamaño; originales 391 y 385 LOC |
| **BZ-111** | Gates de cierre: typecheck, Node, Workers compatible, SDD, build, inspección SSR, accesibilidad, sesión/RLS y sondas de producción. | BZ-100 a BZ-109 | **En revisión** · 244 pruebas Node, build, SDD, CI Gates 1/2 y humo en `1fd1eec` verdes; navegador autenticado y RLS real pendientes |
| **BZ-110** | Verificar propiedad en Google Search Console, enviar sitemap y registrar cobertura inicial. | BZ-107 a BZ-109 desplegadas | **Bloqueado** · requiere cuenta Google propietaria: no hay token de verificación ni acceso a Search Console; sin esos datos no se puede comprobar el estado de indexación |
| **BZ-113** | Corregir visibilidad de estrellas y ubicación del editor según revisión del 21-09: estado vacío explícito en Home/tarjetas/ficha y control dentro del formulario. | BZ-105/106 | **En curso** · SPEC-007 enmendada; TEST-701/708 RED→GREEN, 247 pruebas Node |

## Contratos implementados por SPEC-006 y SPEC-007

### SEO

- Fuente única de URL pública: `https://barzol3d.com` configurada en Astro; nunca derivar canónicas del `Host` no confiable. Reusar `productoUrl()` y slug de categoría. `/servicios` ya redirige: no duplicarlo en sitemap.
- Enumerar solo recursos con respuesta pública válida. Excluir `/admin`, `/api`, `/busqueda`, 404/500, borradores/inactivos, categorías desactivadas y variantes de query. Decidir en SPEC el tratamiento de categorías desconocidas que hoy muestran el catálogo general con 200.
- Sitemap XML escapado, UTF-8, respuesta `application/xml`; paginar consultas si exceden el límite por defecto de Supabase y respetar el máximo de [50 000 URLs/50 MB por sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). Sin `lastmod` inventado ni páginas fantasma.
- `robots.txt` actual viene de Cloudflare; verificar la configuración de la cuenta y la respuesta final antes de publicarlo. [Google aclara que `robots.txt` administra rastreo, no garantiza exclusión del índice](https://developers.google.com/search/docs/crawling-indexing/robots/intro). Login/errores/búsqueda requieren regla de indexación adecuada.
- Los títulos y descripciones existentes se revisan por vista, manteniendo OG/WhatsApp y sin prometer puntuación Lighthouse ni posición en buscadores.

### Estrellas

- Un promedio decimal 0–5 y un conteo entero ≥0 por producto, administrados explícitamente; `0` valoraciones equivale a «sin calificación» y muestra estrellas vacías con ese texto, sin afirmar opiniones. El origen se declara en panel y documentación; no se generan votos desde visitantes.
- Columnas mínimas en `product`, con `CHECK` y `DEFAULT` coherentes. Sin tablas de tokens/reseñas ni triggers de agregación de la propuesta antigua. SQL aplicado por el usuario; la lectura pública de ambas columnas devolvió HTTP 200. Comprobar todavía privilegios de escritura y RLS con sesión real.
- Lectura SSR desde el flujo compartido `productoService` → `productoMapper` → `Product`; componente visual único. El admin usa escritura autenticada aislada para que un guardado normal de producto no sobreescriba la puntuación.
- Los números manuales nunca alimentan `AggregateRating`, `Review`, `Product` con rating ni badge «comprador verificado». Solo una fase posterior, con valoraciones reales y SPEC nueva, podría considerar ese marcado.

## Verificación y reversión previstas

1. RED → GREEN verificado para las reglas nuevas. Tras SPEC-008: `npm run typecheck`, `npm run test:node` (244/244), `npm run build` y `npm run sdd:trace` pasan. En `1fd1eec`, GitHub Actions pasó Gates 1/2 y el humo en producción. Los avisos de deuda de otras SPEC en borrador son previos a esta entrega.
2. El usuario ejecutó `supabase/20260920-calificaciones-administrables.sql` en SQL Editor. Una consulta remota con la clave pública devolvió HTTP 200 y ambas columnas. Falta verificar un guardado con sesión administrativa y un producto valorado en la UI.
3. `scripts/smoke.mjs --url https://barzol3d.com --commit 0c216d5`: 9 sondas pasan, 1 aviso por token de diagnóstico no disponible, 0 fallos; el job **Humo en producción** de GitHub Actions también pasó. Sitemap público: XML válido, 40 URLs únicas (25 productos); `robots.txt` anuncia sitemap; Home y ficha emiten canónica; búsqueda y login emiten `noindex`. La respuesta anterior de `/robots.txt` era la [política descriptiva por defecto de Cloudflare](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/), sin preferencias explícitas; el archivo propio la sustituye. Cloudflare solo antepone reglas gestionadas si esa opción está activa. Si el sitemap falla, investigar Supabase y no presentar un 503 como índice correcto.
4. En navegador compatible, completar `tests/manual/SPEC-006-seo-esencial.md` y `tests/manual/SPEC-007-estrellas-administrables.md`: móvil/escritorio, ficha, tarjetas, sesión/RLS, rechazo de valores inválidos y ausencia de rating estructurado. El `workerd` de Orange Pi 5 Max no arranca por TCMalloc; Gate 2 de CI x86 sí pasó.
5. Reversión de código: volver al commit anterior mediante un nuevo commit de reversión y push; las dos columnas aditivas pueden permanecer sin afectar al Worker anterior. No retirar columnas mientras el Worker nuevo las use. BZ-101/112 se cubren con SPEC-008, pruebas de render e interacción y el gate de 500 líneas; la inspección manual autenticada permanece en BZ-111.

## Revisión de producción · 21-09-2026

- **Estrellas:** la consulta pública a `product` devolvió 26 productos, todos con `rating_count = 0`. El código anterior ocultaba `Calificacion.astro` en tarjetas y ficha cuando el conteo era cero; por eso no se veía en Home ni catálogo. El único editor estaba dentro de `<details>` cerrado encima del listado de `/admin/productos`, separado del modal mostrado en las capturas. BZ-113 corrige ambas decisiones de interfaz, sin asignar puntuaciones ficticias.
- **SEO técnico:** `https://barzol3d.com/` y `/sitemap.xml` devolvieron HTTP 200 incluso con agente `Googlebot`; Home entregó `<title>`, descripción y canónica `https://barzol3d.com/`. `robots.txt` anuncia el sitemap. No se encontró token de verificación Google en el repo ni TXT de verificación en el DNS consultado. Esto no demuestra que Google haya indexado la web: falta usar una cuenta propietaria en Search Console para verificar el dominio, enviar `https://barzol3d.com/sitemap.xml`, inspeccionar la URL principal y registrar el motivo de exclusión si lo hubiera. [Google indica que el sitemap ayuda a descubrir URLs, pero no garantiza su indexación](https://developers.google.com/search/help/crawling-index-faq).
- **Pruebas manuales:** el usuario marcó como superados los dos primeros casos de `tests/manual/SPEC-008-editores-admin-modulares.md` (producto e imágenes). Permanecen pendientes las pruebas autenticadas de calificación y las demás del panel.
