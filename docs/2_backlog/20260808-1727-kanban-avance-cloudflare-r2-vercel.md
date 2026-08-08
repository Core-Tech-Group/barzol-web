# Kanban — Perfil Vercel + Cloudflare R2

> **Fecha:** 2026-08-08 · **Rama:** `main` · **Alcance:** migración de hosting a Vercel y puesta en marcha de Cloudflare R2 para contenido multimedia.

## Resumen del avance

Se cambió el destino de despliegue de Cloudflare Pages a **Vercel** y se construyó el módulo de storage sobre **Cloudflare R2**, con subida directa navegador → R2 mediante URL prefirmada. Durante la revisión apareció un **bug de producción preexistente** en la lectura de variables de entorno que habría hecho fallar el sitio entero en cada request; está corregido y verificado en el bundle compilado (ver `BZ-04`).

Verificaciones ejecutadas: `astro check` (0 errores, 78 archivos), `npm run build` con el adaptador de Vercel, prueba de humo contra el bucket R2 real (firma → PUT → HEAD → DELETE, incluido el rechazo 403 al subir un tamaño distinto al firmado) y prueba de integración del endpoint contra el middleware (401 sin sesión).

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

### BZ-01 · Migrar el adaptador a Vercel 🔴
Reemplazado `@astrojs/cloudflare` por `@astrojs/vercel` en `astro.config.mjs`. Eliminados `wrangler.jsonc`, la carpeta `.wrangler/`, la dependencia `wrangler` y el script `generate-types` (que corría `wrangler types`). Añadido `npm run check` en su lugar. `tsconfig.json` ya no incluye `worker-configuration.d.ts`, que nadie va a generar. `.gitignore` cambia `.wrangler/` por `.vercel/`.

**Verificado:** `npm run build` → `adapter: @astrojs/vercel`, salida en `.vercel/output/`, build completo en ~4s.

### BZ-02 · Módulo de storage R2 🔴
Cuatro archivos nuevos en `src/shared/lib/storage/`, uno por responsabilidad, ninguno supera las 80 líneas:

| Archivo | Responsabilidad |
|---|---|
| `r2Config.ts` | Resuelve y cachea las 5 variables `BARZOL_R2_*`; deriva el endpoint S3 del account ID |
| `r2Client.ts` | Instancia perezosa de `S3Client` con `region: 'auto'` (obligatorio en R2) |
| `mediaKey.ts` | Funciones puras: sanea el nombre de archivo y arma la clave del objeto |
| `r2Presign.ts` | Firma la subida y construye la URL pública |

La resolución de configuración es **perezosa a propósito**: un `throw` en el cuerpo del módulo tumbaría cualquier página que lo alcance por la cadena de imports, aunque no use R2.

**Verificado contra el bucket real `barzol-web`:** firma OK → `PUT` 200 → `HEAD` devuelve 12 bytes/`text/plain` → `DELETE` OK. El objeto de prueba se borró; el bucket quedó vacío.

### BZ-03 · Endpoint `POST /api/media/firma` 🔴
Devuelve `{ key, uploadUrl, publicUrl, expiresIn }` con TTL de 300s. Valida con Zod (`mediaSchema.ts`) antes de tocar R2 y formatea los errores con `zodError.ts`, reutilizable por el resto de endpoints.

Decisiones de seguridad, todas verificadas:

- `ContentType` y `ContentLength` van **dentro del comando firmado**. R2 devolvió **403** al intentar subir 500 bytes con una firma de 12. Sin esto el límite de tamaño sería decorativo.
- Allow-list de MIME (`jpeg`, `png`, `webp`, `avif`, `mp4`, `webm`). **`image/svg+xml` excluido**: servido desde el dominio público del bucket es un XSS almacenado.
- Carpeta como enum cerrado; el nombre de archivo descarta componentes de ruta — `../../etc/passwd` → `passwd`.
- Clave con UUID por delante: en R2 un `PUT` sobre una clave existente sobrescribe sin avisar.
- El error crudo se registra en servidor y al cliente le llega texto genérico.

**Verificado:** `POST` sin sesión → `401 {"success":false,"message":"No autenticado."}` (lo corta el middleware); límites y saneo probados caso por caso.

### BZ-04 · Corregir la lectura de variables de entorno 🔴
**Bug preexistente, no introducido por esta migración.** `db/client.ts` y `authClient.ts` leían con `import.meta.env.BARZOL_*`. Vite sustituye esos accesos por su valor **de build time**; como las variables no existían entonces, quedó `undefined` fijo y el compilador plegó el `if (!url) throw` en un `throw` incondicional, eliminando `createClient` como código muerto. El chunk compilado era literalmente:

```js
import "@supabase/supabase-js";
throw new Error("Faltan BARZOL_SUPABASE_URL / ...");
export { supabase as t };
```

Ese bundle falla en **cada request** aunque Vercel tenga las variables perfectamente cargadas, porque Astro solo expone al bundle las variables con prefijo `PUBLIC_`.

**Solución:** nuevo `src/shared/lib/env/serverEnv.ts` como única vía de lectura. Consulta `import.meta.env` y `process.env` (esta última es la que refleja el valor en runtime en Vercel), y reporta de una sola vez todas las variables que faltan en lugar de fallar en la primera. Elimina además la duplicación del par leer-y-lanzar que estaba copiado en los dos archivos.

**Verificado:** el chunk recompilado conserva `createClient(env.BARZOL_SUPABASE_URL, ...)` y resuelve en runtime; arrancando el servidor con las variables sólo en `process.env`, el sitio levanta y el middleware responde correctamente.

### BZ-05 · Documentación 🟠
`ARCHITECTURE.md`: tabla de stack (hosting → Vercel), nueva sección **Variables de entorno** con la regla de `serverEnv`, nueva sección **Storage de multimedia**, árbol de carpetas actualizado, 2 riesgos nuevos y 6 entradas en el changelog de decisiones. `README.md`: sección de despliegue y tabla de scripts. `.env.example`: reescrito con el origen de cada valor.

---

## 🚧 POR HACER — bloqueantes del despliegue

### BZ-06 · Rotar las credenciales de R2 🔴
El token de API, el Access Key ID y el Secret Access Key se compartieron en una captura de pantalla por un canal de chat. Deben considerarse comprometidos.

**Pasos:** Cloudflare → R2 → Manage API tokens → borrar `barzol-web-token` → crear uno nuevo con permiso *Object Read & Write* acotado al bucket `barzol-web` → actualizar `.env` local y las variables de Vercel.
**Criterio de aceptación:** el token viejo devuelve 403 y la prueba de humo pasa con el nuevo.

### BZ-07 · Completar credenciales de Supabase en `.env` 🔴
`BARZOL_SUPABASE_URL` y `BARZOL_SUPABASE_ANON_KEY` están vacías, así que **el sitio no arranca en local**. Es la única razón por la que no se pudo probar el flujo completo de subida autenticado de punta a punta.

**Origen:** Supabase → Project Settings → API.
**Criterio de aceptación:** `npm run dev` sirve `/` con datos reales y `/admin/login` deja iniciar sesión.
**Bloquea:** BZ-09, BZ-11.

### BZ-08 · Habilitar el acceso público del bucket 🔴
`BARZOL_R2_PUBLIC_URL` está vacía. Sin ella, `buildPublicUrl()` genera URLs mal formadas y las imágenes no se ven aunque la subida funcione. El endpoint S3 **no** sirve para lectura pública: sólo acepta peticiones firmadas.

**Pasos:** R2 → `barzol-web` → Settings → Public Development URL (subdominio `*.r2.dev`), o conectar un dominio propio tipo `media.barzol.com` (preferible para producción: `r2.dev` tiene límites de tasa y no se recomienda para tráfico real).
**Criterio de aceptación:** un objeto subido se abre en el navegador desde `BARZOL_R2_PUBLIC_URL/<key>`.

### BZ-09 · Configurar CORS del bucket R2 🔴
**Sin esto la subida desde el navegador no funciona, por más que la firma sea válida.** El `PUT` prefirmado es una petición cross-origin: R2 debe declarar explícitamente qué orígenes pueden hacerla. La prueba de humo pasó porque corrió desde Node, que no aplica CORS — el navegador sí.

Política a aplicar (R2 → `barzol-web` → Settings → CORS Policy), con los orígenes reales una vez exista el proyecto de Vercel:

```json
[
  {
    "AllowedOrigins": ["https://barzol.com", "https://barzol-web.vercel.app", "http://localhost:4321"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

**Criterio de aceptación:** subida desde el panel admin en local sin error de CORS en consola.
**Depende de:** BZ-10 (para conocer el dominio definitivo).

### BZ-10 · Crear el proyecto en Vercel y cargar las variables 🔴
Importar el repositorio, framework preset **Astro**, y cargar las 7 variables de `.env.example` en Project Settings → Environment Variables (Production y Preview).

**Ojo:** las variables deben existir **antes** del primer build. Un build sin ellas ya no produce un bundle roto (BZ-04 lo corrigió), pero sí falla en runtime con `MissingEnvError`, que es el comportamiento correcto y deseado.
**Criterio de aceptación:** deploy verde, `/` y `/admin/login` responden 200 en el dominio de Vercel.

---

## 📋 POR HACER — funcionalidad

### BZ-11 · Conectar el panel admin al flujo de subida 🟠
Hoy el módulo de R2 existe pero **ningún componente lo usa**: `ProductsAdmin.tsx`, `GalleryAdmin.tsx` e `InicioAdmin.tsx` siguen manejando imágenes como data-URL en estado local. Falta el cliente que pida firma, haga el `PUT` y devuelva la `publicUrl`.

Debe vivir en **un solo archivo** compartido por las tres islas — p. ej. `src/admin/shared/useSubidaMedia.ts` — con estados de progreso, error y cancelación. No replicar la lógica de subida en cada componente.

**Nota de alcance:** los tres componentes superan las 1000 líneas y quedaron fuera de esta sesión por indicación explícita. El hook nuevo va aparte; el cableado dentro de cada isla es trabajo posterior.
**Depende de:** BZ-07, BZ-09.

### BZ-12 · Borrado de multimedia y limpieza de huérfanos 🟠
No hay forma de borrar un objeto de R2. Al reemplazar la foto de un producto, la anterior queda en el bucket para siempre.

Falta `deleteMediaObject(key)` en `r2Presign.ts` (o un `r2Delete.ts` hermano) y el endpoint `DELETE /api/media/[key]`. Conviene guardar la `key` además de la `publicUrl` en Supabase: derivar una de otra por manipulación de strings es frágil si cambia el dominio público.

### BZ-13 · Implementar las escrituras de los services 🟠
`createProducto`, `updateProducto`, `deleteProducto`, `createCategoria`, `updateCategoria`, `deleteCategoria`, `addGaleriaItem` y `updateConfiguracion` siguen lanzando `Not implemented`. El panel admin no persiste nada: `POST /api/productos` devuelve 500. Las lecturas sí funcionan contra Supabase.

### BZ-14 · Validar con Zod el resto de endpoints 🟠
`productos`, `categorias` y `galeria` hacen `await request.json()` y pasan el body crudo al service. Zod ya está instalado y `zodError.ts` listo para reutilizar; falta un schema por entidad en `shared/lib/validation/`.

---

## 🧹 POR HACER — deuda técnica

### BZ-15 · Centralizar errores y dejar de filtrar mensajes internos 🟡
`shared/lib/errors/apiError.ts` no existe, pese a estar en ARCHITECTURE.md. Peor: los endpoints responden `errorResponse((error as Error).message)`, que devuelve al cliente el mensaje crudo de Supabase — exactamente lo que el documento prohíbe. `/api/media/firma` ya sigue el patrón correcto y sirve de referencia.

### BZ-16 · Hacer perezoso el cliente de Supabase 🟡
`db/client.ts` resuelve el entorno en el cuerpo del módulo, así que una variable faltante tumba **todas** las páginas, incluidas las que no consultan la base. Conviene un `getSupabase()` perezoso, como `getR2Config()`. Toca los 5 services, por eso quedó fuera de esta sesión.

### BZ-17 · `baseUrl` deprecado en `tsconfig.json` ⚪
TypeScript 6 marca `baseUrl` como deprecado y deja de funcionar en 7.0. Los alias `@/*`, `@landing/*`, `@admin/*`, `@shared/*` deberían pasar a rutas relativas a `paths` sin `baseUrl`. Preexistente.

### BZ-18 · Vulnerabilidades de npm ⚪
`npm audit` reporta 7 (1 moderada, 6 altas) tras la migración — bajó de 9 al quitar `wrangler`. Revisar cuáles afectan a producción antes de correr `npm audit fix`, que puede subir versiones mayores.

### BZ-19 · Mover `Pagination.astro` a `landing/shared/` ⚪
La usan `BusquedaView` y `CatalogoView`; por la regla de oro de ARCHITECTURE.md corresponde a `shared/` de la zona. Ya está anotado como pendiente en el propio documento.

### BZ-20 · Vista de Configuración del admin ⚪
La tarjeta "Configuración" del dashboard apunta a `href: '#'`. Existen `configuracionService` y `configuracionMapper`, pero no hay vista ni ruta.

### BZ-21 · Datos estructurados y SEO ⚪
Faltan `Product` JSON-LD en ficha, `BreadcrumbList` en categoría y `Organization` en home, además de canonical y Open Graph por página. Para un catálogo comercial es requisito funcional, no adorno.

---

## Mapa de dependencias

```
BZ-06 (rotar credenciales) ─── independiente, hacer YA
BZ-07 (Supabase .env) ──┬── BZ-11 (subida en admin) ──── BZ-12 (borrado)
BZ-08 (URL pública) ────┤
BZ-10 (proyecto Vercel) ─── BZ-09 (CORS) ──┘
BZ-13 (escrituras) ─── BZ-14 (validación) ─── BZ-15 (errores)
```

**Orden sugerido:** BZ-06 → BZ-07 → BZ-08 → BZ-10 → BZ-09 → BZ-11 → BZ-13 → BZ-12 → BZ-14 → BZ-15.
