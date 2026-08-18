# Scrumban — Despliegue local en Orange Pi 5 Max + Cloudflare Zero Trust

> **Creado:** 2026-08-18 · **Última actualización:** 2026-08-18 (1ª revisión) · **Rama:** `orangepi_feature` (parte de `main`)
> **Alcance:** levantar el sitio completo —web, base de datos, autenticación y multimedia— sobre la Orange Pi 5 Max, dentro de Docker, y publicarlo por un túnel de Cloudflare Zero Trust para que el cliente pueda verlo funcionando.

## Por qué existe esta rama

El despliegue sobre Cloudflare (Workers + R2 + Supabase gestionado) quedó bloqueado en `BZ-49` del [kanban anterior](20260808-1727-kanban-avance-cloudflare-r2-vercel.md): el worker desplegado nunca recibe `BARZOL_SUPABASE_ANON_KEY`, así que ninguna página que consulte datos responde. El diagnóstico está cerrado y documentado, pero **la solución depende de una decisión de cuenta/plataforma que no es técnica**, y el cliente necesita ver el sistema andando antes de eso.

Esta rama no reemplaza ese trabajo ni lo revierte: **agrega un segundo objetivo de despliegue**. El mismo código fuente compila para Cloudflare (como hasta ahora) o para Node dentro de Docker, según una variable de build. Nada de lo que ya funciona en `main` se toca.

## Estado — 2026-08-18, 1ª revisión

**Punto de partida verificado en la máquina:**

| Dato | Valor |
|---|---|
| Arquitectura | `aarch64` (ARM64) — toda imagen usada debe ser multi-arch |
| RAM | 15 GiB total, ~13 GiB disponibles |
| Docker | 29.7.2, utilizable sin `sudo` |
| Compose | v2.40.2, **como binario `docker-compose`**, no como plugin (`docker compose` no existe acá) |
| Node del anfitrión | v18.19.1 — por debajo del `>=22.12.0` que pide `package.json`; por eso el build va dentro del contenedor |
| `cloudflared` | 2026.3.0 instalado en `/usr/local/bin` |

**Puertos ya ocupados por otros proyectos de la máquina** (`cognix`, `oftalmoplus`, `ecommerce-lentes`): `22`, `80`, `111`, `3005`, `5201`, `5555`, `6380`, `8080`, `8085`, `8091`, `9993`, `11434`, `27018`. Ver `OP-18` para el bloque reservado a este proyecto.

## Resultado — 2026-08-18, verificado en la máquina

**El sistema está arriba y probado de punta a punta.** Todo lo de abajo se comprobó contra el despliegue real, no contra la intención del código.

| Comprobación | Resultado |
|---|---|
| Los seis contenedores | `healthy` |
| `GET /api/diagnostico` | `ok: true`; las tres variables presentes, sin problemas de formato; Supabase responde |
| Home, galería, servicios, nosotros, búsqueda | HTTP 200, con datos reales renderizados (16 productos, precios, 7 categorías en el menú) |
| `/catalogo/trompeta` y `/producto/soporte-de-celular-trompeta-5000` | HTTP 200 |
| `/admin` sin sesión | 302 → `/admin/login` |
| `POST /api/auth/login` con el usuario creado | 200, cookie `sb-supabase-auth-token` establecida |
| `POST /api/categorias` **con** sesión | **201** — la RLS `admin write` y `auth.uid()` funcionan (ver `OP-31`) |
| `POST /api/categorias` **sin** sesión | 401 |
| `POST /api/media` (subida real) | 201, archivo escrito en el volumen |
| La imagen subida, por `/media/...` | 200, `Content-Type: image/png` |
| Lectura anónima de PostgREST | 200 — el visitante lee el catálogo, no puede escribir |

Estado de los datos: 20 categorías, 16 productos, 16 fotos, 6 ítems de galería, 1 administrador. Los datos de prueba que se crearon para verificar la escritura se borraron después.

**Sin regresión en el objetivo de Cloudflare**, comprobado en un contenedor limpio con Node 22:

```
npm run build   (sin DEPLOY_TARGET)  →  adapter: @astrojs/cloudflare  ·  Complete!
npm run check                        →  105 archivos · 0 errores · 0 avisos
```

> **Nota sobre el anfitrión:** el `npm run build` de la Orange Pi falla, pero por una causa anterior a esta rama — la máquina tiene Node v18.19.1 y el proyecto exige `>=22.12.0`, así que su `node_modules` quedó sin los binarios nativos de rolldown. No afecta al despliegue: la compilación ocurre dentro del contenedor, con Node 22. Si se quiere compilar a mano en esta máquina, hay que subir Node y reinstalar dependencias.

## Decisión central: qué motor de datos se levanta en local

El pedido dejaba elegir entre FastAPI o Astro contra MariaDB. **Se descartaron los dos**, y conviene dejar escrito por qué, porque a primera vista ambos parecen más simples:

El código de datos de este proyecto no es una capa fina sobre SQL. Son cuatro *services* (`productoService`, `categoriaService`, `galeriaService`, `configuracionService`), sus *mappers*, el middleware de sesión y `authClient.ts`, todos escritos contra el cliente de Supabase. Encima, `supabase/schema.sql` es PostgreSQL con tipos `ENUM`, secuencias, `timestamptz`, triggers y **diez políticas de RLS** que son hoy la única autorización real de las escrituras. Cambiar a MariaDB o a FastAPI significa reescribir esa capa entera y quedarse sin RLS — exactamente la clase de regresión que el pedido prohíbe, y sobre la parte del sistema que el cliente va a tocar.

**Lo que se levanta en cambio es la API de Supabase, no el producto Supabase:** PostgreSQL + PostgREST (`/rest/v1`) + GoTrue (`/auth/v1`) detrás de un proxy que los une bajo una sola URL (nginx al principio, Traefik desde `OP-36`). Son las tres piezas —y las únicas— que `@supabase/supabase-js` y `@supabase/ssr` consumen. Para la aplicación es indistinguible del servicio gestionado: **cero líneas de los services, mappers, middleware o RLS cambian.** Ver `OP-03`.

## Tablero

Leyenda de estado: ✅ Hecho · 🔶 En curso · ⬜ Pendiente · ⚫ Anulada
Prioridad: 🔴 Bloqueante · 🟠 Alta · 🟡 Media · ⚪ Baja

### Épica A — Preparar el repositorio

| ID | Tarea | Estado | Prio |
|---|---|---|---|
| OP-01 | Crear la rama `orangepi_feature` desde `main` | ✅ Hecho | 🔴 |
| OP-02 | Este documento scrumban | ✅ Hecho | 🔴 |

### Épica B — Decisiones de arquitectura

| ID | Tarea | Estado | Prio |
|---|---|---|---|
| OP-03 | **Decidir el motor de datos local** — PostgreSQL + PostgREST + GoTrue | ✅ Hecho | 🔴 |
| OP-04 | **Doble objetivo de despliegue sin bifurcar el código** — `cloudflare` \| `node` | ✅ Hecho | 🔴 |

### Épica C — Desacoplar el código del runtime de Cloudflare

Sólo dos archivos del proyecto importan `cloudflare:workers`, así que el desacople es quirúrgico y no toca ninguna vista ni service.

| ID | Tarea | Estado | Prio |
|---|---|---|---|
| OP-05 | Fuente de entorno intercambiable — `envSource.cloudflare.ts` / `envSource.node.ts` | ✅ Hecho | 🔴 |
| OP-06 | Driver de multimedia intercambiable — bucket R2 / disco local | ✅ Hecho | 🔴 |
| OP-07 | Adaptador dual en `astro.config.mjs` + dependencia `@astrojs/node` | ✅ Hecho | 🔴 |
| OP-08 | Servir `/media` con la misma forma de URL que R2 | ✅ Hecho (rehecho en `OP-36`) | 🟠 |

### Épica D — Base de datos y autenticación en local

| ID | Tarea | Estado | Prio |
|---|---|---|---|
| OP-09 | Contenedor PostgreSQL con los roles y el secreto JWT que esperan PostgREST y GoTrue | ✅ Hecho | 🔴 |
| OP-10 | GoTrue como `/auth/v1` — login del admin | ✅ Hecho | 🔴 |
| OP-11 | PostgREST como `/rest/v1` — datos del catálogo | ✅ Hecho | 🔴 |
| OP-12 | Gateway que une ambos bajo `BARZOL_SUPABASE_URL` | ✅ Hecho (nginx → Traefik en `OP-36`) | 🔴 |
| OP-13 | Aplicar `supabase/schema.sql` (con RLS) sobre la base local | ✅ Hecho | 🔴 |
| OP-14 | Generar el seed SQL desde `supabase/seed-data/*.json` | ✅ Hecho | 🟠 |
| OP-15 | Alta del usuario admin (`auth.users` + `admin_profile`) | ✅ Hecho | 🔴 |
| OP-31 | **`auth.uid()` peleada entre GoTrue y PostgREST** | ✅ Hecho | 🔴 |
| OP-32 | Healthcheck de PostgREST sin `curl` ni `wget` en la imagen | ✅ Hecho | 🟠 |
| OP-33 | Sondeos rotos por `localhost` → `::1` | ✅ Hecho | 🟠 |
| OP-34 | Que `/api/diagnostico` no liste el entorno entero del contenedor | ✅ Hecho | 🟠 |

### Épica E — Dockerización

| ID | Tarea | Estado | Prio |
|---|---|---|---|
| OP-16 | Dockerfile del sitio — multi-stage sobre `node:22-alpine` | ✅ Hecho | 🔴 |
| OP-17 | `docker-compose.yml` con red interna propia | ✅ Hecho | 🔴 |
| OP-18 | Reservar un bloque de puertos libre y no chocar con los proyectos ya desplegados | ✅ Hecho | 🔴 |
| OP-19 | Healthchecks y orden de arranque (`depends_on: service_healthy`) | ✅ Hecho | 🟠 |

### Épica F — Cloudflare Zero Trust

| ID | Tarea | Estado | Prio |
|---|---|---|---|
| OP-20 | Proxy de borde como **único** ingreso del sistema | ✅ Hecho (nginx → Traefik en `OP-36`) | 🔴 |
| OP-21 | Servicio `cloudflared` por token, en perfil opcional de compose | ✅ Hecho | 🔴 |
| OP-35 | Liberar espacio en disco de Docker | ✅ Hecho | 🔴 |
| OP-36 | **Reemplazar nginx por Traefik** | ✅ Hecho y verificado | 🔴 |
| OP-37 | **Túnel con nombre desplegado y conectado** | 🔶 Conectado; falta el hostname en el panel | 🔴 |
| OP-38 | Panel de Traefik en el entrypoint interno | ✅ Hecho | 🟡 |
| OP-39 | **Publicar por Quick Tunnel (sin dominio propio)** | ✅ Hecho y verificado | 🔴 |
| OP-40 | **El landing no renderiza NINGUNA imagen** | ⬜ Pendiente — fuera del alcance de esta rama | 🔴 |
| OP-22 | Cabeceras de proxy y URL pública coherente detrás del túnel | ✅ Hecho | 🟠 |
| OP-23 | Documentar cómo proteger `/admin` con una política de Zero Trust | ⬜ Pendiente | 🟡 |

### Épica G — Automatización del despliegue

| ID | Tarea | Estado | Prio |
|---|---|---|---|
| OP-24 | `scripts/desplegar-local.sh` — orquestador de una sola invocación | ✅ Hecho | 🔴 |
| OP-25 | Librería `scripts/lib/*.sh` para no duplicar lógica entre scripts | ✅ Hecho | 🟠 |
| OP-26 | Generación de las claves JWT (`anon`, `service_role`) al primer arranque | ✅ Hecho | 🔴 |

### Épica H — Verificación y documentación

| ID | Tarea | Estado | Prio |
|---|---|---|---|
| OP-27 | Ejecutar el despliegue de verdad y dejar el stack arriba | ✅ Hecho y verificado | 🔴 |
| OP-28 | Humo: home, catálogo, ficha, login del admin y subida de imagen | ✅ Hecho y verificado | 🔴 |
| OP-29 | Reflejar el segundo objetivo de despliegue en `ARCHITECTURE.md` | ✅ Hecho | 🟠 |
| OP-30 | Riesgos abiertos y trabajo deliberadamente fuera de alcance | ✅ Hecho | 🟠 |

## Fichas

### OP-03 · Motor de datos local — PostgreSQL + PostgREST + GoTrue 🔴

**Decisión.** Se levanta la *API* de Supabase con sus componentes de código abierto, no un motor distinto.

| Pieza | Imagen | Rol |
|---|---|---|
| `db` | `postgres:16-alpine` | El mismo PostgreSQL contra el que está escrito `schema.sql`, RLS incluida |
| `rest` | `postgrest/postgrest` | Traduce `/rest/v1/...` a SQL — es lo que `.from('product').select()` invoca por debajo |
| `auth` | `supabase/gotrue` | Emite y valida los JWT de `signInWithPassword`; es el `/auth/v1` que usa `@supabase/ssr` |
| `proxy` | `traefik:v3.4` | Publica ambos bajo una URL única, que es lo que vale `BARZOL_SUPABASE_URL` (ver `OP-36`) |

**Consecuencia buscada:** `src/shared/lib/**` no se toca. Los cuatro services, los mappers, el middleware, `authClient.ts` y las diez políticas RLS siguen siendo los mismos archivos que corren en Cloudflare.

**Lo que cuesta:** cuatro contenedores en vez de uno, y las claves JWT hay que generarlas (`OP-26`) en lugar de copiarlas de un panel.

**Alternativas descartadas:** FastAPI y MariaDB obligaban a reescribir la capa de datos entera, perder RLS —hoy la única autorización real de las escrituras— y portar un schema con `ENUM`, secuencias y triggers. Más trabajo, más superficie de regresión y ningún beneficio para una demo.

### OP-04 · Doble objetivo de despliegue sin bifurcar el código 🔴

**Problema.** Bajo Docker el sitio corre sobre Node, no sobre `workerd`. Dos archivos importan `cloudflare:workers`, que en un build de Node no existe y rompe la compilación.

**Descartado:** un `if (esNode)` dentro de `serverEnv.ts`. El `import` de `cloudflare:workers` es estático y falla al resolverse, antes de que ninguna condición llegue a evaluarse.

**Decisión.** La selección se hace en el build, con un alias de Vite. `astro.config.mjs` lee `DEPLOY_TARGET` (`cloudflare` por defecto, `node` para Docker) y resuelve dos alias a una implementación o a la otra:

| Alias | `DEPLOY_TARGET=cloudflare` | `DEPLOY_TARGET=node` |
|---|---|---|
| `@shared/lib/env/envSource` | `envSource.cloudflare.ts` | `envSource.node.ts` |
| `@shared/lib/storage/mediaDriver` | `mediaDriver.cloudflare.ts` | `mediaDriver.node.ts` |
| adaptador | `@astrojs/cloudflare` | `@astrojs/node` |

Cada implementación es un archivo corto detrás de la misma interfaz. **La lógica no se duplica:** toda la validación de variables, los mensajes de error y el diagnóstico siguen viviendo una sola vez en `serverEnv.ts`; lo intercambiable es únicamente de *dónde salen los valores crudos*. Igual con el multimedia: el nombrado de claves, la sanitización y el armado de la URL pública quedan compartidos, y sólo cambia *dónde se escriben los bytes*.

**Verificación de que no hay regresión:** `DEPLOY_TARGET` sin definir compila exactamente como hoy, con el adaptador de Cloudflare y el binding R2.

### OP-35 · Liberar espacio en disco de Docker 🔴

La máquina estaba al 92% con 9,6 GiB libres, y este proyecto convive con otros tres (`cognix`, `oftalmoplus`, `ecommerce-lentes`) que llevan meses reconstruyendo imágenes.

| Qué se borró | Recuperado |
|---|---|
| 134 imágenes colgadas (`<none>`, sin ningún contenedor asociado) | 2,9 GB |
| Caché de compilación sin usar (943 entradas) | 45,5 GB |
| **Total** | **48,4 GB** |

Disco: **92% → 46% de uso**, de 9,6 a 62 GiB libres.

**No se tocó nada de los otros proyectos.** `docker image prune` sin `-a` sólo elimina imágenes sin etiqueta y sin contenedor: ninguna imagen etiquetada, ningún contenedor (ni siquiera los dos detenidos hace cuatro meses) y ningún volumen se vieron afectados. Los volúmenes figuran con 0 B recuperables, así que ahí no había nada que ganar de todos modos.

El grueso estaba en la caché de compilación, no en las imágenes — vale tenerlo presente: `docker system df` la reporta aparte y es fácil pasarla por alto.

### OP-36 · Reemplazar nginx por Traefik 🔴

Dos contenedores de nginx (`edge` y `supabase`) pasaron a ser **un solo Traefik**.

**Lo que no se pudo trasladar, y cómo se resolvió.** Traefik no tiene proveedor de ficheros: **no sirve archivos estáticos**. El `location /media/` que leía el volumen no tiene equivalente. La entrega pasó a la aplicación, en `pages/media/[...ruta].ts`, usando el mismo driver intercambiable que ya usaba la escritura — así que sigue habiendo una sola implementación por objetivo y ninguna lógica duplicada. Bajo Cloudflare el driver devuelve `null` y la ruta responde 404, que es lo que hacía antes de existir.

Salió ganando: la ruta añade dos cabeceras que nginx no ponía, `X-Content-Type-Options: nosniff` y una `Content-Security-Policy` con `sandbox`, que neutralizan un SVG malicioso servido desde nuestro propio dominio — el riesgo por el que `mediaSchema.ts` no acepta SVG en las subidas, y que las imágenes de relleno del catálogo de prueba reintroducían por la puerta de atrás.

**Dos decisiones que conviene no revertir sin pensarlo:**

1. **Proveedor de archivo, no de Docker.** Es el modo idiomático de Traefik descubrir servicios por etiquetas, pero exige montarle el socket del demonio de Docker, que equivale a acceso de root al anfitrión. Acá los destinos son tres contenedores fijos: no hay nada que descubrir y no vale la pena pagar ese precio.
2. **El entrypoint interno va en el puerto 80 y el público en el 8080**, al revés de lo intuitivo. `@supabase/ssr` deriva el nombre de la cookie de sesión del host de `BARZOL_SUPABASE_URL`; con puerto explícito saldría `sb-supabase:8000-auth-token` y los dos puntos no son válidos en el nombre de una cookie.

**El aislamiento mejoró.** Antes eran dos contenedores distintos; ahora es uno con dos entrypoints, y la separación se comprobó:

| Petición | Puerto público (8110) | Puerto interno (8111) |
|---|---|---|
| `/rest/v1/product` | **404** | 200 |
| `/auth/v1/health` | **404** | 200 |

La separación es por **entrypoint**, no por reglas de `Host`: aunque alguien falsee la cabecera a través del túnel, en el puerto público no existe ningún router que atienda esas rutas. Una cabecera se falsea; un router que no existe, no.

Verificado tras el cambio: páginas 200, login 200 con la cookie `sb-supabase-auth-token`, escritura con sesión 201 (RLS intacta), subida de imagen y lectura de vuelta por `/media` con `Content-Type: image/png`, y compresión gzip activa.

### OP-37 · Túnel desplegado y conectado 🔴

El contenedor `barzol-tunnel` quedó configurado con el token cargado en `docker/.env` (ignorado por git — el token **no** queda versionado). Está **detenido** mientras dure la prueba con Quick Tunnel (`OP-39`), para que no haya dos rutas activas a la vez; se vuelve a levantar con `./scripts/desplegar-local.sh` en cuanto haya dominio propio.

```
Starting tunnel tunnelID=fa6a4320-3e5c-4ae6-b1a0-11369c69d935
Registered tunnel connection  ×4   (lim02, scl04, lim02, scl03)
CONNECTIVITY PRE-CHECKS: SUMMARY: Environment is healthy
/ready → {"status":200,"readyConnections":4}
```

**Falta un paso que sólo se puede dar desde el panel.** Cloudflare no le ha enviado a `cloudflared` ninguna regla de enrutado — el registro no tiene una sola línea de configuración de ingreso —, lo que significa que **el túnel no tiene todavía un Public Hostname asignado**. Está conectado y esperando, pero no hay ninguna URL que lo alcance.

Para terminarlo:

1. Zero Trust → **Networks → Tunnels** → el túnel `fa6a4320-…` → pestaña **Public Hostname** → *Add a public hostname*.
2. Elegir el subdominio y, en **Service**, poner tipo `HTTP` y URL **`proxy:8080`** — el nombre del contenedor, no `localhost`: el conector corre dentro de la misma red de Docker.
3. Poner ese mismo hostname (con `https://`, sin barra final) en `BARZOL_PUBLIC_URL` de `docker/.env`.
4. `./scripts/desplegar-local.sh` para que el sitio tome la URL nueva.

El paso 3 no es opcional ni cosmético: de ahí sale la URL que se escribe **dentro de la base** en cada imagen que se suba. Conviene fijarlo antes de que el cliente cargue contenido real (ver `OP-30`, riesgo 1).

### OP-38 · Panel de Traefik en el entrypoint interno 🟡

Se activó el panel de Traefik para poder ver, sin leer archivos, a qué contenedor resuelve cada router.

**No se usó `api.insecure: true`**, que es la forma que sale en todos los tutoriales: esa opción publica el panel en un entrypoint propio y sin control de acceso. Acá lo expone un router explícito atado al **entrypoint interno**, que sólo escucha en `127.0.0.1` del anfitrión — por el túnel es inalcanzable. Importa porque el panel enumera la topología completa del despliegue: cada servicio, cada destino interno y su estado.

Disponible en `http://127.0.0.1:8111/dashboard/`. La salida que confirma el enrutado al contenedor de Astro:

```
  sitio@file    [enabled]  entryPoints=['publica']
      rule    : PathPrefix(`/`)
      service : sitio        ->  http://web:4321   (serverStatus: UP)
```

`passHostHeader: true` en ese servicio es lo que hace que el hostname público llegue intacto a Astro, que es de donde salen las URL absolutas y las redirecciones.

**Un detalle que costó un minuto entender:** `traefik.yml` es configuración **estática** y no se recarga sola. El archivo dinámico (`enrutado.yml`) sí — se recargó al guardarlo y el router `panel` apareció al instante, pero fallando con `error="api is not enabled"`, porque el bloque `api` del archivo estático todavía no estaba cargado. Hace falta reiniciar el contenedor tras tocar `traefik.yml`; con `enrutado.yml`, no.

### OP-39 · Publicar por Quick Tunnel (sin dominio propio) 🔴

Mientras no haya dominio propio, el túnel con nombre de `OP-37` no puede tener un Public Hostname. La alternativa es un **Quick Tunnel**: Cloudflare inventa un hostname `*.trycloudflare.com` y lo enruta sin configurar nada en el panel.

**El error que hay que evitar de entrada.** El comando de la documentación es `cloudflared tunnel --url http://localhost:8080`, y en ESTA máquina eso apunta al proyecto equivocado: el puerto 8080 del anfitrión lo tiene `cognix-traefik`. Un Quick Tunnel lanzado así publica el **panel de Traefik de cognix**, no este sitio — que es exactamente lo que pasó en la primera prueba.

Hay dos números en juego y conviene no confundirlos:

| | Puerto | Qué es |
|---|---|---|
| Anfitrión | `8110` | Publicación del entrypoint público de Barzol |
| Anfitrión | `8080` | **Traefik de `cognix`** — otro proyecto |
| Dentro de la red `barzol-local` | `proxy:8080` | Entrypoint público de Barzol |

Por eso el túnel de prueba **corre como contenedor dentro de la red `barzol-local`** y apunta a `http://proxy:8080`, no a un puerto del anfitrión: así no depende de qué otro proyecto ocupe qué puerto, y no hace falta publicar ningún puerto nuevo.

**Lo que el script resuelve y a mano se rompe.** El hostname cambia en cada arranque del túnel, y la URL pública queda escrita **dentro de la base** en cada imagen subida. Sin reescribirlas, el catálogo aparece con todas las fotos rotas apenas se republica. `scripts/tunel-rapido.sh` encadena los pasos en el orden que importa:

1. Levanta el sistema si hace falta y espera a que el proxy esté sano.
2. Apaga el túnel con nombre, para que no queden dos rutas activas y no haya duda de cuál sirve lo que se ve.
3. Arranca el Quick Tunnel **desde cero** (un contenedor reutilizado seguiría anunciando el hostname anterior en su registro) y lee del log la URL asignada.
4. **Reescribe las URLs de las cuatro columnas** que guardan multimedia (`product_photo.url`, `gallery_item.image_url`, `home_hero_image.image_url`, `home_item.image_url`) — antes de recrear el sitio, no después, para que no haya una ventana con las fotos rotas.
5. Fija `BARZOL_PUBLIC_URL` y recrea el contenedor del sitio.
6. Verifica desde Internet la home **y una imagen** — la imagen es lo que delata si el paso 4 funcionó.

```bash
./scripts/tunel-rapido.sh            # publicar
./scripts/tunel-rapido.sh --url      # volver a ver la URL vigente
./scripts/tunel-rapido.sh --detener  # bajar sólo el túnel
```

**Límites, que no son menores:** el enlace es público y sin control de acceso —cualquiera con la URL entra, incluido `/admin/login`— y el hostname muere al reiniciar el túnel. Sirve para enseñarle el sistema al cliente en una sesión, no para dejarlo publicado. Para eso está `OP-37` con dominio propio y las políticas de Access de `OP-23`.

### OP-40 · El landing no renderiza ninguna imagen 🔴

**Descubierto al verificar el sitio publicado. No lo causó esta rama y no se arregló acá: es un hueco de `main`.**

El sistema entrega las fotos correctamente de punta a punta —se comprobó cada tramo— y aun así no se ve una sola en el navegador:

| Tramo | Estado |
|---|---|
| Filas en `product_photo`, `gallery_item`, `home_hero_image` | ✅ 26 filas, con la URL del túnel |
| PostgREST devuelve el join `product_photo(url, sort_order)` | ✅ verificado con curl |
| `productoMapper.ts` lo mapea a `fotos: string[]` | ✅ |
| `GET /media/...` sirve el archivo | ✅ 200, `image/svg+xml` |
| **Las vistas lo pintan** | ❌ **no existe** |

La única etiqueta `<img>` de todo `src/landing/` es el logo del `Header.astro`. `ProductCard.astro` ni siquiera acepta una prop de imagen: tiene un icono SVG fijo de marcador de posición en su lugar. Lo mismo en la ficha de producto, la galería y el hero de la home.

Es decir: el dato llega hasta el borde de la vista y ahí se descarta. Por eso el catálogo se ve completo —nombres, precios, categorías, marcas— pero sin una sola foto.

**Por qué no se arregló en esta rama.** El alcance era desplegar, no construir la capa de presentación: sumar imágenes toca `ProductCard`, la ficha, la galería y el hero, con decisiones de diseño (relación de aspecto, recorte, `loading`/`fetchpriority`, `alt` descriptivo, estados de carga y de error) que son trabajo de producto y pertenecen a `main`, no a una rama de infraestructura.

**Por qué importa igual.** Es lo primero que va a notar el cliente en la demostración. Conviene decidirlo antes de enseñarle el sitio: o se construye la vista, o se le presenta explicando que las fotos son el siguiente paso.

### OP-31 · `auth.uid()` peleada entre GoTrue y PostgREST 🔴

Apareció al primer arranque real y vale la pena dejarlo escrito, porque los dos lados del problema fallan de formas que no se parecen entre sí.

**Síntoma 1 — GoTrue en bucle de reinicio.** El contenedor `barzol-auth` moría al arrancar con:

```
running db migrations: error executing migrations/00_init_auth_schema.up.sql
: ERROR: must be owner of function uid (SQLSTATE 42501)
```

**Causa.** La migración inicial de GoTrue **crea ella misma** `auth.uid()` y `auth.role()`. El script de init de PostgreSQL ya las había creado, con dueño `postgres`; GoTrue se conecta como `supabase_auth_admin` y su `create or replace` sobre una función ajena es un error de permisos, no un no-op.

**Síntoma 2 — el que no se ve, y es peor.** Dejar simplemente que GoTrue las cree resuelve el arranque y rompe la autorización en silencio. Su definición es:

```sql
select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
```

Esa es la forma **antigua** de los claims. PostgREST v12 con `db-use-legacy-gucs = false` —como está configurado acá— ya no publica un ajuste por claim: publica el JSON entero en `request.jwt.claims`. Con la definición de GoTrue tal cual, `auth.uid()` devuelve NULL en toda petición y **las diez políticas `admin write` rechazan al admin logueado**, con un 403 que no nombra la causa. El sitio se vería perfecto y el panel no podría guardar nada.

**Solución.** Se invirtió el orden y se separó el archivo:

1. `docker/db/init/00-supabase.sh` — roles, esquema `auth`, permisos. **Ya no define las funciones.**
2. GoTrue arranca y migra, creando su versión.
3. `docker/db/funciones-auth.sql` — las reemplaza, aplicado como `postgres` (superusuario: puede reemplazar funciones ajenas), leyendo **las dos formas** de claims.

Leer ambas formas no es cinturón y tirantes: es lo que hace que una actualización de la imagen de PostgREST *o* de GoTrue no vuelva a apagar la autorización sin avisar. Y el paso 3 se aplica en **cada** despliegue, no una sola vez, porque una imagen nueva de GoTrue volvería a imponer su versión al migrar.

### OP-32 · Healthcheck de PostgREST sin `curl` ni `wget` 🟠

El primer intento sondeaba con `wget --spider`, y el contenedor quedaba eternamente en `health: starting` con `wget: not found` — mientras el servicio, en sus registros, atendía perfectamente. Compose entonces no arrancaba `supabase`, `web` ni `edge`, porque los tres esperan a que este esté sano: **un sondeo mal elegido tumbaba el despliegue entero sin que nada estuviera roto.**

La imagen de PostgREST es de distribución, no de utilidades: no trae `curl`, `wget` ni `nc`. Sí trae `bash`, así que el sondeo usa su redirección `/dev/tcp` para hablar HTTP sin instalar nada dentro del contenedor.

Se aprovechó para sondear lo correcto en vez de lo conveniente: se habilitó `PGRST_ADMIN_SERVER_PORT` y se consulta `/ready`, que comprueba que la conexión a PostgreSQL y la caché de esquema estén cargadas. Un simple "el puerto abre" habría dado verde con la base caída.

### OP-33 · Sondeos rotos por `localhost` → `::1` 🟠

Mismo patrón que `OP-32`, causa distinta y vale la pena anotarlo junto: **el sondeo fallaba, el servicio no**.

`barzol-supabase` quedaba en `health: starting` con `wget: can't connect to remote host: Connection refused`, mientras nginx registraba sus workers arrancados con normalidad. La causa: en estos contenedores `/etc/hosts` mapea `localhost` a `127.0.0.1` **y a `::1`**, `wget` intenta primero la IPv6 y nginx escucha sólo en IPv4.

Se cambiaron los cinco healthchecks a `127.0.0.1`. Es preferible a agregarle `listen [::]:80` a nginx: se corrige el sondeo, que es lo que estaba mal, en vez de ampliar la superficie de escucha de un servicio para conformar a la sonda.

La lección que se repitió dos veces en este despliegue: **con `depends_on: service_healthy`, un healthcheck mal escrito no deja un servicio en amarillo — impide arrancar todo lo que depende de él.** Los dos fallos se veían como "el despliegue se cuelga" y ninguno de los dos era un problema del servicio sondeado.

### OP-34 · Que `/api/diagnostico` no liste el entorno entero del contenedor 🟠

`GET /api/diagnostico` publica los **nombres** de las variables que recibió el servidor (nunca los valores — esa regla no cambia). En Cloudflare esa lista es exactamente la configuración del proyecto. Bajo Node, `process.env` trae además `PATH`, `HOSTNAME`, `NODE_VERSION` y cuanta variable se le agregue al servicio en el futuro — y el endpoint queda accesible desde el túnel público.

`envSource.node.ts` filtra al prefijo `BARZOL_`. No recorta nada que la aplicación use: `serverEnv.ts` sólo se consulta con nombres `BARZOL_*` (es la convención de nombres del proyecto), y `HOST` / `PORT` los lee el adaptador de Node sin pasar por ahí. El diagnóstico cuenta lo mismo en los dos objetivos de despliegue.

### OP-18 · Puertos reservados 🔴

Auditados los contenedores ya desplegados en esta máquina antes de elegir. **Ocupados y por lo tanto evitados:** `22`, `80` y `8080` (traefik de *cognix*), `111`, `3005` (*ecommerce-lentes*), `5201`, `5555`, `6380`, `8085` (*oftalmoplus*), `8091`, `9993`, `11434` (ollama), `27018`.

| Puerto | Servicio | Escucha en | Por qué |
|---|---|---|---|
| `8110` | `edge` (nginx) | **todas las interfaces** | Único ingreso. Es a donde apunta el túnel |
| `8111` | `supabase` (gateway) | `127.0.0.1` | Diagnóstico con `curl` y alta del admin desde el anfitrión |
| `8112` | `db` (PostgreSQL) | `127.0.0.1` | Abrir `psql` sin entrar al contenedor |

`web`, `rest` y `auth` **no publican ningún puerto**: sólo existen dentro de la red `barzol-local`. Los tres son configurables en `docker/.env` (`PUERTO_EDGE`, `PUERTO_GATEWAY`, `PUERTO_DB`), y el script comprueba que estén libres **antes** de construir la imagen — un choque de puertos detectado a mitad del `up` cuesta la compilación entera.

### OP-21 · Túnel de Cloudflare Zero Trust 🔴

El túnel va **por token**, no por archivo de credenciales: toda la configuración vive en el panel y en el disco de la Orange Pi no queda ningún secreto de larga duración salvo el propio token en `docker/.env`.

**Puesta en marcha, una sola vez:**

1. Cloudflare → **Zero Trust → Networks → Tunnels → Create a tunnel** → tipo *Cloudflared*.
2. Copiar el token (la cadena larga del comando `cloudflared service install ...` que muestra la pantalla).
3. Pegarlo en `docker/.env` → `CLOUDFLARE_TUNNEL_TOKEN=`.
4. En la pestaña **Public Hostname** del túnel: elegir el subdominio y apuntar el servicio a **`http://proxy:8080`** — el nombre del contenedor, no `localhost`: el conector corre dentro de la misma red de Docker.
5. Poner ese mismo hostname público en `BARZOL_PUBLIC_URL` de `docker/.env`.
6. `./scripts/desplegar-local.sh` — el script detecta el token y agrega el perfil `tunel`.

Sin token el sistema levanta igual, accesible sólo en la red local: es lo que conviene para la primera prueba.

**Por qué `http://proxy:8080` y no el contenedor del sitio:** el puerto 8080 es el entrypoint público de Traefik. Apuntando el túnel al 80 se entraría por el entrypoint interno, que sólo atiende `/rest/v1` y `/auth/v1` — el sitio devolvería 404 en todas sus rutas.

### OP-22 · Coherencia de la URL pública detrás del túnel 🟠

Tres valores tienen que contar la misma historia, y si uno se desalinea el síntoma no señala la causa:

| Valor | Dónde | Síntoma si está mal |
|---|---|---|
| Hostname público del túnel | Panel de Zero Trust | El sitio no responde |
| `BARZOL_PUBLIC_URL` | `docker/.env` | El sitio carga, las **imágenes** dan 404 |
| Servicio del túnel = `http://proxy:8080` | Panel de Zero Trust | Entrypoint equivocado: el sitio da 404 en todo |

El entrypoint público de Traefik confía en las cabeceras `X-Forwarded-*` que le llegan (`forwardedHeaders.insecure`), porque el único cliente que alcanza ese puerto dentro de la red es `cloudflared` — y es justamente el que sabe el esquema real: la conexión del visitante fue HTTPS aunque este tramo sea HTTP plano. Sin eso, las URL absolutas y las redirecciones que arma Astro saldrían con `http://` detrás del túnel.

### OP-23 · Proteger `/admin` con Zero Trust 🟡

**Pendiente, y deliberadamente separado del despliegue.** Hoy `/admin` está protegido por el middleware de la aplicación (sesión de Supabase Auth), que es la misma protección que tiene en Cloudflare — no hay regresión respecto de producción.

Lo que Zero Trust agrega es una segunda capa **antes** de que la petición llegue a la Orange Pi: Access → Applications → Self-hosted, ruta `midominio.com/admin`, con una política de correos permitidos. Vale la pena si el túnel va a quedar publicado más allá de la demostración; para una demo con el cliente presente, el login del panel alcanza.

### OP-30 · Riesgos abiertos y fuera de alcance 🟠

**1. La URL pública queda escrita dentro de la base.** Cada imagen guarda su URL completa, armada a partir de `BARZOL_PUBLIC_URL`. Si el hostname del túnel cambia **después** de haber subido imágenes, las viejas apuntan al valor anterior. No es un defecto nuevo: es exactamente la misma limitación que ya tiene el despliegue en Cloudflare con el dominio de R2. Se corrige con un `UPDATE` sobre las cuatro columnas que guardan URLs:

```sql
UPDATE product_photo    SET url       = replace(url,       'URL_VIEJA', 'URL_NUEVA');
UPDATE gallery_item     SET image_url = replace(image_url, 'URL_VIEJA', 'URL_NUEVA');
UPDATE home_hero_image  SET image_url = replace(image_url, 'URL_VIEJA', 'URL_NUEVA');
UPDATE home_item        SET image_url = replace(image_url, 'URL_VIEJA', 'URL_NUEVA') WHERE image_url IS NOT NULL;
```

Guardar sólo la clave del objeto y componer la URL al leer sería la solución de fondo, pero toca los cuatro mappers y el panel admin: es un cambio para `main`, no para una rama de demostración.

**2. Disco al 91%.** La máquina tiene ~11 GiB libres y este despliegue consume del orden de 1,5 GiB entre imágenes y volúmenes. Alcanza, pero no hay margen para muchas iteraciones de imágenes viejas: conviene un `docker image prune` cada tanto.

**3. Las imágenes del catálogo son SVG de relleno.** El seed original trae `REEMPLAZAR_URL_IMAGEN` y las columnas son `NOT NULL`. Se generan SVG con el nombre de cada producto para que la demostración se lea como un catálogo; las fotos reales se cargan desde el panel, que es justamente lo que conviene mostrarle al cliente.

**4. Sin copias de seguridad automáticas.** `--borrar-datos` es destructivo y pide confirmación escrita, pero nada respalda el volumen. Para una demo alcanza; si el cliente empieza a cargar contenido real, hace falta un `pg_dump` periódico.

**5. El anfitrión no puede compilar el proyecto.** Node v18.19.1 contra un `>=22.12.0` requerido. No bloquea nada —el build va dentro del contenedor— pero sí impide `npm run dev` y `npm run check` a mano en esta máquina.

**6. Backlog de `main` que esta rama NO resuelve.** Sigue abierto lo que ya estaba: `BZ-07` (revocar el token de API de R2), `BZ-11` (borrado de multimedia huérfano), `BZ-14` (dejar de filtrar mensajes internos al cliente) y `BZ-19` (datos estructurados y SEO). Esta rama no los toca ni los empeora.

**7. El landing no pinta imágenes** — ver `OP-40`. El dato llega hasta la vista y ahí se descarta; es un hueco de `main`, no de esta rama, pero es lo primero que se nota en una demostración.

**8. `BZ-49` sigue siendo el camino a producción.** Este despliegue es un puente, no un reemplazo: la rama está pensada para convivir con `main` y no bloquear la vuelta a Cloudflare cuando se resuelva la entrega de la anon key al worker.
