# Kanban — Cloudflare Pages + R2 (evaluación de Vercel descartada)

> **Fecha:** 2026-08-08 · **Rama:** `main` · **Alcance:** puesta en marcha de Cloudflare R2 para contenido multimedia, manteniendo Cloudflare Pages como hosting.

## Resumen del avance

Se conectó **Cloudflare R2** por *binding nativo* para el contenido multimedia, con subida a través del worker. Durante el proceso se evaluó y luego se **descartó** migrar el hosting a Vercel; la sección [Decisión revertida](#decisión-revertida-vercel) documenta por qué y qué quedó de esa exploración.

Apareció además un **bug de producción preexistente** en la lectura de variables de entorno que habría hecho fallar el sitio entero en cada request. Está corregido y verificado en el bundle compilado (`BZ-04`).

**Verificaciones ejecutadas:** `npm run build` con `@astrojs/cloudflare`, escritura real contra el bucket R2 simulado en local (`put` → `get` → `delete`), 8 casos de validación del schema de subida, y prueba de rutas con datos reales de Supabase (11 rutas, `/admin` redirigiendo a login).

---

## Decisión revertida: Vercel

Se llegó a migrar el proyecto entero a Vercel (`@astrojs/vercel`, subida por URL prefirmada con el SDK de AWS, `wrangler.jsonc` eliminado) y quedó funcionando y verificado contra el bucket real. **Se revirtió por decisión de arquitectura:** repartir hosting y storage entre dos proveedores obliga a piezas que con un solo ecosistema no existen.

| Aspecto | Vercel + R2 (descartado) | Cloudflare Pages + R2 (actual) |
|---|---|---|
| Acceso a R2 | API S3 con Access Key + Secret | Binding `MEDIA`, sin credenciales |
| Credenciales que rotar | 3 (token, access key, secret) | **ninguna** |
| CORS del bucket | Obligatorio | No aplica — mismo origen |
| Firma de peticiones | SigV4 con SDK de AWS | No aplica |
| Dependencias extra | `@aws-sdk/client-s3`, `s3-request-presigner` | ninguna |
| Límite de subida | ~4.5 MB de cuerpo → forzaba prefirmadas | 100 MB (plan Free) |

El trabajo descartado quedó en la rama `feat/perfil-vercel-r2` por si alguna vez se reevalúa. **No debe fusionarse.**

Lo que **sí sobrevivió** de esa exploración, porque el problema era independiente del hosting: el hallazgo del bug de variables de entorno (`BZ-04`), el saneo de nombres de archivo, la allow-list de MIME y el formateo de errores de Zod.

---

## Leyenda

| Prioridad | Significado |
|---|---|
| 🔴 P0 | Bloquea el despliegue o hay riesgo de seguridad |
| 🟠 P1 | Necesario para que la funcionalidad sirva de verdad |
| 🟡 P2 | Deuda técnica con impacto real |
| ⚪ P3 | Mejora, sin urgencia |

---

## ✅ HECHO — en esta sesión

### BZ-01 · Confirmar Cloudflare Pages como hosting 🔴
Se mantiene `@astrojs/cloudflare` y `wrangler.jsonc`. Se añadió el script `npm run check` (`astro check`), que no existía.

**Verificado:** `npm run build` → `adapter: @astrojs/cloudflare`, build completo en ~3s.

### BZ-02 · Binding de R2 y módulo de storage 🔴
`wrangler.jsonc` declara el bucket:

```jsonc
"r2_buckets": [{ "binding": "MEDIA", "bucket_name": "barzol-web" }]
```

Cuatro archivos en `src/shared/lib/storage/`, uno por responsabilidad, ninguno supera las 60 líneas:

| Archivo | Responsabilidad |
|---|---|
| `r2Bucket.ts` | Devuelve el binding `MEDIA`; error accionable si falta |
| `mediaKey.ts` | Funciones puras: sanea el nombre y arma la clave del objeto |
| `mediaUrl.ts` | Clave → URL pública de lectura |
| `mediaStorage.ts` | Escribe en R2 pasando el cuerpo como stream |

`npm run generate-types` regeneró `worker-configuration.d.ts`, donde `MEDIA` ya aparece tipado como `R2Bucket`. Ese archivo **se versiona**: `tsconfig.json` lo incluye, y sin él `npm run check` falla en un clon nuevo.

**Verificado contra el bucket simulado en local:** `put` con stream OK → `get` devuelve 12 bytes con `contentType=image/png` → `delete` OK y el objeto deja de existir. El saneo convirtió `Prueba Ñandú (1).PNG` en `prueba-nandu-1.png`.

### BZ-03 · Endpoint `POST /api/media` 🔴
Recibe el archivo como cuerpo crudo, con `carpeta` y `nombre` en query string y el tipo/tamaño en cabeceras. Devuelve `{ key, publicUrl, contentType, size }`. Valida con Zod (`mediaSchema.ts`) y formatea los errores con `zodError.ts`, reutilizable por el resto de endpoints.

Decisiones de seguridad y robustez, todas verificadas caso por caso:

| Caso | Resultado |
|---|---|
| Imagen válida / video válido | Aceptados |
| `image/svg+xml` | Rechazado — XSS almacenado si se sirve desde el bucket |
| Imagen > 10 MB | `tamanoBytes: supera el máximo de 10 MB para image/png` |
| Video > 100 MB | `tamanoBytes: supera el máximo de 100 MB para video/mp4` |
| `carpeta=../secretos` | Rechazado — enum cerrado |
| Sin cabeceras | Rechazado, con el detalle de los 4 campos |
| `image/png; charset=utf-8` | **Aceptado** tras corregirlo (ver abajo) |

El cuerpo viaja como `ReadableStream` hasta R2, sin materializarse: `request.formData()` lo bufferizaría y un worker tiene 128 MB.

**Corrección durante la propia verificación:** la primera versión rechazaba `image/png; charset=utf-8`. La cabecera `Content-Type` admite parámetros de forma perfectamente legítima, así que se añadió `normalizeContentType()` para quedarse sólo con el tipo antes de validar.

**Verificado:** `POST` sin sesión → `401 {"success":false,"message":"No autenticado."}` (lo corta el middleware).

### BZ-04 · Corregir la lectura de variables de entorno 🔴
**Bug preexistente, independiente del hosting.** `db/client.ts` y `authClient.ts` leían con `import.meta.env.BARZOL_*`. Vite sustituye esos accesos por su valor **de build time**; como las variables de Cloudflare son invisibles en ese momento, quedó `undefined` fijo y el compilador plegó el `if (!url) throw` en un `throw` incondicional, eliminando `createClient` como código muerto. El chunk compilado era literalmente:

```js
import "@supabase/supabase-js";
throw new Error("Faltan BARZOL_SUPABASE_URL / ...");
export { supabase as t };
```

Ese bundle falla en **cada request** aunque las variables estén perfectamente cargadas en la plataforma.

**Solución:** nuevo `src/shared/lib/env/serverEnv.ts` como única vía de lectura, tomando los valores del objeto `env` de `cloudflare:workers` — la fuente real en runtime. Reporta de una sola vez todas las variables que faltan en lugar de fallar en la primera, y elimina la duplicación del par leer-y-lanzar que estaba copiado en dos archivos.

**Verificado:** el chunk recompilado conserva `requireServerEnv([...])` y el `createClient`; el `import { env } from "cloudflare:workers"` sobrevive en el bundle. En dev, `/api/productos` y `/api/categorias` devuelven datos reales de Supabase.

### BZ-05 · Cliente de Supabase perezoso 🔴
Consecuencia obligada del punto anterior: en workerd el entorno **no existe mientras se evalúan los módulos**, sólo dentro de una petición. Crear el cliente en el cuerpo del módulo reventaba al arrancar el worker.

`db/client.ts` pasa de `export const supabase = createClient(...)` a `getSupabase()` con instancia cacheada. Se actualizaron los 5 services (`productos`, `categorias`, `galeria`, `home`, `configuracion`). Esto estaba fichado como deuda técnica a futuro; el cambio de plataforma lo volvió bloqueante.

**Verificado:** 11 rutas responden — `/`, `/galeria`, `/servicios`, `/nosotros`, `/busqueda`, `/catalogo/soportes-de-celular`, `/admin/login` y las 3 de API en 200; `/admin` en 302 hacia el login.

### BZ-06 · Documentación 🟠
`ARCHITECTURE.md`: nueva sección **Un solo ecosistema** con la justificación del binding, nueva sección **Variables de entorno**, nueva sección **Storage de multimedia**, árbol de carpetas actualizado, 2 riesgos nuevos y 7 entradas en el changelog de decisiones (incluida la reversión de Vercel). `README.md`: sección de despliegue y scripts. `.env.example`: reescrito — ya no pide credenciales de R2, porque el binding no las usa.

---

## 🚧 POR HACER — bloqueantes

### BZ-07 · Revocar el token de API de R2 🔴
El token, el Access Key ID y el Secret Access Key se compartieron en una captura por un canal de chat y deben considerarse comprometidos.

Con el binding nativo **la aplicación ya no usa credenciales de R2**, así que no hace falta reemplazarlo: se revoca y punto.

**Pasos:** Cloudflare → R2 → Manage API tokens → borrar `barzol-web-token`.
**Criterio de aceptación:** el token ya no aparece en la lista y el sitio sigue funcionando (no lo usaba).

### BZ-08 · Habilitar el acceso público del bucket 🔴
`BARZOL_R2_PUBLIC_URL` está vacía. Sin ella, `buildPublicUrl()` lanza `MissingEnvError` y no hay forma de mostrar las imágenes aunque la subida funcione. El binding sirve para escribir, no para publicar.

**Pasos:** R2 → `barzol-web` → Settings → Public Development URL (subdominio `*.r2.dev`), o conectar un dominio propio tipo `media.barzol.com` — preferible para producción, porque `r2.dev` tiene límites de tasa y no está pensado para tráfico real.
**Criterio de aceptación:** un objeto subido se abre en el navegador desde `BARZOL_R2_PUBLIC_URL/<key>`.
**Bloquea:** BZ-10.

### BZ-09 · Enlazar el bucket en el proyecto de Cloudflare 🔴
El binding está declarado en `wrangler.jsonc`, pero el proyecto de Pages también necesita el enlace en su propia configuración para producción, junto con las variables de entorno de `.env.example`.

**Criterio de aceptación:** deploy verde y `POST /api/media` funcionando en el dominio de producción, no sólo en local.

---

## 📋 POR HACER — funcionalidad

### BZ-10 · Conectar el panel admin al flujo de subida 🟠
Hoy el módulo existe pero **ningún componente lo usa**: `ProductsAdmin.tsx`, `GalleryAdmin.tsx` e `InicioAdmin.tsx` siguen manejando imágenes como data-URL en estado local.

Falta el cliente que haga el `POST` y devuelva la `publicUrl`. Debe vivir en **un solo archivo** compartido por las tres islas — p. ej. `src/admin/shared/useSubidaMedia.ts` — con estados de progreso, error y cancelación. No replicar la lógica en cada componente.

**Nota de alcance:** los tres componentes superan las 1000 líneas y quedaron fuera por indicación explícita. El hook nuevo va aparte; el cableado dentro de cada isla es trabajo posterior.
**Depende de:** BZ-08.

### BZ-11 · Borrado de multimedia y limpieza de huérfanos 🟠
No hay forma de borrar un objeto desde la aplicación. Al reemplazar la foto de un producto, la anterior queda en el bucket para siempre.

Falta `borrarMedia(key)` en `mediaStorage.ts` y el endpoint `DELETE /api/media`. Conviene guardar la `key` además de la `publicUrl` en Supabase: derivar una de otra manipulando strings es frágil si cambia el dominio público. Con el binding, el borrado es una sola llamada — la pieza que falta es el cableado y la decisión de esquema.

### BZ-12 · Validar con Zod el resto de endpoints — y arreglar `npm run check` 🟠
`productos`, `categorias` y `galeria` hacen `await request.json()` y pasan el body crudo al service.

**Esto ahora rompe el chequeo de tipos:** con los tipos de Cloudflare cargados, `request.json()` devuelve `unknown` en vez de `any`, así que `npm run check` reporta **8 errores** en 6 archivos (`api/productos/*`, `api/categorias/*`, `api/galeria/index.ts`, `api/auth/login.ts` y `LoginView.astro`). Son errores preexistentes que estaban ocultos, no una regresión: `astro build` sigue pasando porque no hace typecheck.

La solución correcta es validar con Zod, no castear — un `as` silenciaría al compilador dejando intacto el problema real de entrada sin validar. `zodError.ts` ya está listo para reutilizar; falta un schema por entidad en `shared/lib/validation/`.

### BZ-13 · Implementar las escrituras de los services 🟠
`createProducto`, `updateProducto`, `deleteProducto`, `createCategoria`, `updateCategoria`, `deleteCategoria`, `addGaleriaItem` y `updateConfiguracion` siguen lanzando `Not implemented`. El panel admin no persiste nada: `POST /api/productos` devuelve 500. Las lecturas sí funcionan contra Supabase.

---

## 🧹 POR HACER — deuda técnica

### BZ-14 · Centralizar errores y dejar de filtrar mensajes internos 🟡
`shared/lib/errors/apiError.ts` no existe, pese a estar en ARCHITECTURE.md. Peor: los endpoints responden `errorResponse((error as Error).message)`, que devuelve al cliente el mensaje crudo de Supabase — exactamente lo que el documento prohíbe. `/api/media` ya sigue el patrón correcto y sirve de referencia.

### BZ-15 · `baseUrl` deprecado en `tsconfig.json` ⚪
TypeScript 6 lo marca como deprecado y deja de funcionar en 7.0. Los alias `@/*`, `@landing/*`, `@admin/*`, `@shared/*` deberían pasar a rutas relativas a `paths` sin `baseUrl`. Preexistente.

### BZ-16 · Vulnerabilidades de npm ⚪
`npm audit` reporta 9 (1 moderada, 8 altas). Revisar cuáles afectan a producción antes de correr `npm audit fix`, que puede subir versiones mayores.

### BZ-17 · Mover `Pagination.astro` a `landing/shared/` ⚪
La usan `BusquedaView` y `CatalogoView`; por la regla de oro de ARCHITECTURE.md corresponde a `shared/` de la zona. Ya está anotado como pendiente en el propio documento.

### BZ-18 · Vista de Configuración del admin ⚪
La tarjeta "Configuración" del dashboard apunta a `href: '#'`. Existen `configuracionService` y `configuracionMapper`, pero no hay vista ni ruta.

### BZ-19 · Datos estructurados y SEO ⚪
Faltan `Product` JSON-LD en ficha, `BreadcrumbList` en categoría y `Organization` en home, además de canonical y Open Graph por página. Para un catálogo comercial es requisito funcional, no adorno.

### BZ-20 · Arranque lento del servidor de desarrollo ⚪
`npm run dev` tarda ~31s en levantar workerd y el CLI de Astro corta a los 30s, así que **el primer intento suele fallar** con `Dev server failed to start within 30s`. El segundo funciona. Conviene documentarlo o buscar si el adaptador admite subir ese tope.

---

## Mapa de dependencias

```
BZ-07 (revocar token) ─── independiente, hacer YA
BZ-08 (URL pública) ──┬── BZ-10 (subida en admin) ─── BZ-11 (borrado)
BZ-09 (enlazar en CF) ┘
BZ-12 (validación + typecheck) ─── BZ-13 (escrituras) ─── BZ-14 (errores)
```

**Orden sugerido:** BZ-07 → BZ-08 → BZ-09 → BZ-10 → BZ-12 → BZ-13 → BZ-11 → BZ-14.
