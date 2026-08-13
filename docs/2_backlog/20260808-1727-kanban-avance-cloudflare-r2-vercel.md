# Scrumban — Despliegue en Cloudflare (Workers + R2)

> **Creado:** 2026-08-08 · **Última actualización:** 2026-08-13 (2ª revisión) · **Rama:** `main`
> **Alcance:** puesta en producción del sitio sobre Cloudflare y del contenido multimedia sobre R2.

## Estado del despliegue — 2026-08-13, 2ª revisión

Se corrigió el valor de `BARZOL_SUPABASE_URL`, se volvió a desplegar (verde, `Version ID: 8ce7074c`) **y el sitio sigue en 500**. La causa es otra, y es la más incómoda posible: **el propio despliegue borra las variables**.

Sondeo a producción justo después de ese despliegue:

```
GET /api/productos
{"success":false,"data":null,"message":"Faltan variables de entorno:
 BARZOL_SUPABASE_URL, BARZOL_SUPABASE_ANON_KEY. ..."}
```

Ya no dice que el valor sea inválido: dice que **no están**. Y estaban — la captura del panel las mostraba cargadas. Lo que las eliminó fue `npx wrangler deploy`, que es exactamente lo que corre el pipeline de Cloudflare en cada push. Lo documenta el propio esquema de configuración de wrangler (`node_modules/wrangler/config-schema.json`, propiedad `keep_vars`):

> *By default, the Wrangler configuration file is the source of truth for your environment configuration, like a terraform file. If you change your vars in the dashboard, wrangler will override/delete them on its next deploy.*

Como `wrangler.jsonc` no declara ningún bloque `vars`, cada despliegue dejaba el worker sin ninguna variable. El ciclo era: cargarlas a mano → el sitio anda → cualquier push las borra → 500. Los **Secrets** no se ven afectados; sólo las *Variables* de texto plano.

**Corregido en este commit** con `"keep_vars": true` en `wrangler.jsonc` — ver `BZ-34`. Falta la parte manual: volver a cargar las dos variables y redesplegar.

Esto explica también por qué el diagnóstico venía costando tanto: dos caídas distintas, con dos causas distintas, y en ambas el log de despliegue terminó en `✨ Success!`. Por eso esta sesión suma rastreo propio — ver `BZ-35` y `BZ-36`.

## Estado del despliegue — 2026-08-13, 1ª revisión

**El despliegue no falló.** El log del 2026-08-12 termina en `✨ Success! Build completed.`: build verde, `wrangler deploy` correcto, 22 assets subidos y los 4 bindings adjuntos, incluido `env.MEDIA (barzol-web)`. Lo que falla es el **runtime**: el sitio devuelve 500 y muestra la página "Algo salió mal".

Eso ya es un avance respecto del 2026-08-11 — antes el 500 salía con cuerpo vacío; ahora aparece la página de error de `BZ-22`, que es exactamente lo que se construyó para este caso.

**Causa identificada — el valor de `BARZOL_SUPABASE_URL` está mal pegado.** En el panel de Cloudflare figura como enlace de markdown en vez de URL en crudo:

```
valor cargado:  [https://rnfcccnesxunjtpwahce.supabase.co](https://rnfcccnesxunjtpwahce.supabase.co)
valor correcto:  https://rnfcccnesxunjtpwahce.supabase.co
```

Ese valor no llega nunca a Supabase: `@supabase/supabase-js` lo valida al construir el cliente y aborta con `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.` (verificado en `node_modules/@supabase/supabase-js/dist/index.cjs:372`). La excepción sube sin capturar y Astro responde 500 → `500.astro`.

Encaja con todo lo observado: `getSupabase()` se llama en el render de la home y en el middleware, así que **todas** las rutas con datos caen, y `R2_ENDPOINT` muestra los mismos corchetes — se pegaron ambas desde un documento renderizado, no desde texto plano.

Ver `BZ-31` (bloqueante), `BZ-32` (variables R2 residuales, riesgo de seguridad) y `BZ-33` (ya cerrada: el mismo error ahora se nombra solo).

> **Precisión importante:** esto no es Cloudflare **Pages**. El log muestra `npx wrangler deploy` y el dominio `*.workers.dev`: es un **Worker con assets estáticos**, el sucesor de Pages. Importa porque cambia dónde se cargan las variables en el panel.

---

## Tablero

| ID | Tarea | Estado | Prio |
|---|---|---|---|
| BZ-01 | Confirmar Cloudflare como hosting | ✅ Hecho | 🔴 |
| BZ-02 | Binding de R2 y módulo de storage | ✅ Hecho | 🔴 |
| BZ-03 | Endpoint `POST /api/media` | ✅ Hecho | 🔴 |
| BZ-04 | Corregir lectura de variables de entorno | ✅ Hecho | 🔴 |
| BZ-05 | Cliente de Supabase perezoso | ✅ Hecho | 🔴 |
| BZ-06 | Documentación de arquitectura | ✅ Hecho | 🟠 |
| BZ-07 | Revocar el token de API de R2 | ⬜ Pendiente | 🔴 |
| BZ-08 | Habilitar acceso público del bucket | ✅ Hecho | 🔴 |
| BZ-09 | Enlazar el bucket en el proyecto | ✅ Hecho | 🔴 |
| BZ-10 | Conectar el panel admin a la subida | ⬜ Pendiente | 🟠 |
| BZ-11 | Borrado de multimedia y huérfanos | ⬜ Pendiente | 🟠 |
| BZ-12 | Validar endpoints con Zod | ✅ Hecho | 🟠 |
| BZ-13 | Implementar escrituras de los services | ✅ Hecho | 🟠 |
| BZ-14 | Dejar de filtrar mensajes internos | ⬜ Pendiente | 🔴 ↑ |
| BZ-15 | `baseUrl` deprecado en tsconfig | ⬜ Pendiente | ⚪ |
| BZ-16 | Vulnerabilidades de npm | ⬜ Pendiente | ⚪ |
| BZ-17 | Mover `Pagination.astro` | ⬜ Pendiente | ⚪ |
| BZ-18 | Vista de Configuración del admin | ✅ Hecho | ⚪ |
| BZ-19 | Datos estructurados y SEO | ⬜ Pendiente | ⚪ |
| BZ-20 | Arranque lento del servidor de dev | ⬜ Pendiente | ⚪ |
| BZ-21 | Diagnóstico del 500 en producción | ✅ Hecho | 🔴 |
| BZ-22 | Página de error 500 | ✅ Hecho | 🟠 |
| BZ-23 | Cargar las variables en el Worker | ✅ Hecho (con valor mal pegado → BZ-31) | 🔴 |
| BZ-24 | Verificación post-deploy | ⬜ Pendiente | 🔴 |
| BZ-25 | Probar la subida a R2 en producción | ⬜ Pendiente | 🟠 |
| BZ-26 | Separar variables de secretos | ⬜ Pendiente | 🟠 |
| BZ-27 | Dominio propio para el sitio | ⬜ Pendiente | 🟡 |
| BZ-28 | Dominio propio para el bucket | ⬜ Pendiente | 🟡 |
| BZ-29 | Runbook de observabilidad | ⬜ Pendiente | 🟡 |
| BZ-30 | `npm run preview` roto en Windows | ⬜ Pendiente | 🟡 |
| BZ-31 | Corregir el valor de `BARZOL_SUPABASE_URL` | ✅ Hecho | 🔴 |
| BZ-32 | Borrar las variables `R2_*` residuales del panel | ⬜ Pendiente | 🔴 |
| BZ-33 | Validar las variables `*_URL` al leerlas | ✅ Hecho | 🟠 |
| BZ-34 | **`wrangler deploy` borra las variables del panel** | 🔶 Código hecho, falta recargarlas | 🔴 |
| BZ-35 | Endpoint `GET /api/diagnostico` | ✅ Hecho | 🔴 |
| BZ-36 | Rastreo de errores en los logs del worker | ✅ Hecho | 🟠 |
| BZ-37 | Proteger o retirar `/api/diagnostico` | ⬜ Pendiente | 🟡 |

**Progreso:** 19 de 37 hechas. Bloqueante activo: **BZ-34** (y `BZ-32` + `BZ-07`, de seguridad).

`BZ-31` quedó cerrada: el valor con corchetes ya se corrigió. Lo que quedó abierto es que el despliegue borra lo que se corrija.

| Prioridad | Significado |
|---|---|
| 🔴 P0 | Bloquea el despliegue o hay riesgo de seguridad |
| 🟠 P1 | Necesario para que la funcionalidad sirva de verdad |
| 🟡 P2 | Deuda técnica con impacto real |
| ⚪ P3 | Mejora, sin urgencia |

---

## ✅ Cerradas en esta sesión (2026-08-13)

### BZ-35 · Endpoint `GET /api/diagnostico` 🔴
Dos caídas seguidas, dos causas distintas, y en las dos el log de despliegue terminó en `✨ Success! Build completed.`. Ese log responde "¿se subió el código?"; la pregunta cuando el sitio falla es "¿qué configuración recibe el worker al atender una petición?", y no había forma de responderla sin sondear rutas a ciegas.

`src/pages/api/diagnostico.ts` la responde de una: qué variables llegaron, con qué forma, qué bindings ve el worker y si Supabase contesta de verdad —hace una consulta real, `head: true`, contra `category`—. El campo `pistas` traduce todo eso a la acción concreta: reconoce los corchetes de markdown, la variable ausente, la barra final y la consulta rechazada por RLS.

**Dos reglas lo hacen seguro de dejar expuesto:**

1. **Nunca devuelve el valor de una variable** — sólo `presente`, `longitud` y qué problemas tiene. El valor no sale de `serverEnv.ts`: la inspección vive ahí y devuelve booleanos. Un diagnóstico que filtra la clave que diagnostica no sirve de nada.
2. **De los errores devuelve el nombre y el código, nunca el mensaje.** El mensaje puede nombrar tablas y va al log.

Responde `200` siempre, incluso cuando todo falla: un 500 acá se confundiría con el 500 que se está diagnosticando.

**Verificado de punta a punta contra el servidor de desarrollo**, no sólo compilado:

| Escenario | Resultado |
|---|---|
| Configuración correcta | `ok: true`, los 4 bindings en `true`, Supabase responde |
| `BARZOL_SUPABASE_URL` con corchetes (el valor real del panel) | `problemas: ["corchetes-de-markdown", "no-es-url-http"]`, `supabase.motivo: "InvalidEnvError"` y la pista nombrando el enlace de markdown |
| `BARZOL_R2_PUBLIC_URL` ausente | `presente: false` y la pista con la ruta del panel |

En ninguna respuesta apareció un solo carácter de ningún valor. El `.env` se restauró al terminar.

### BZ-36 · Rastreo de errores en los logs del worker 🟠
Hasta ahora una excepción subía muda hasta `500.astro`: producción mostraba "Algo salió mal" y no quedaba registro en ningún lado. `observability.enabled` estaba en `true` desde el principio, pero nadie escribía nada.

`shared/lib/errors/logServerError.ts` es ahora el único punto de escritura de errores del servidor, y el middleware lo llama antes de relanzar. Emite una línea de JSON por error con `contexto`, `ruta`, `metodo`, nombre, código y stack — una línea por error para que dos peticiones simultáneas no entrelacen sus stacks, y formato estable para poder filtrar por `contexto` en el visor de Cloudflare.

Nunca incluye valores de variables, cuerpos, cookies ni cabeceras: puede haber tokens en los cuatro. Es la contracara de la regla de `apiResponse` —detalle al log, mensaje genérico al cliente— y el primer ladrillo del `shared/lib/errors/apiError.ts` que `ARCHITECTURE.md` viene pidiendo para `BZ-14`.

**Límite conocido y documentado:** con streaming activado, un error lanzado mientras el cuerpo de la página ya está viajando no pasa por el middleware. Por eso el rastreo no depende sólo de este borde — `BZ-35` responde sin necesidad de provocar el error.

El runbook para leer todo esto quedó en `docs/3_recursos/20260813-1730-runbook-diagnostico-produccion.md`, escrito para resolverlo sin abrir el código. Cubre buena parte de lo que pedía `BZ-29`.

### BZ-33 · Validar las variables `*_URL` al leerlas 🟠
Este 500 costó una sesión entera de diagnóstico por un motivo evitable: el error que veía el desarrollador (`Invalid supabaseUrl`) **no nombraba la variable**, y la página sólo decía "Algo salió mal". El valor estaba cargado, así que `MissingEnvError` —que sí nombra— nunca se disparaba.

`shared/lib/env/serverEnv.ts` ahora aplica una convención del proyecto: **toda variable cuyo nombre termina en `_URL` debe ser una URL absoluta http(s)**, y se valida en `readServerEnv()`, es decir en el único punto por el que pasan todas. Si no lo es, lanza `InvalidEnvError` nombrando la variable y explicando la causa más probable — corchetes de markdown, comillas o espacios pegados junto al valor.

Cubre las tres de una vez (`BARZOL_SUPABASE_URL`, `BARZOL_R2_PUBLIC_URL` y cualquiera futura) sin tocar ningún llamador.

**El mensaje no incluye el valor recibido, a propósito.** Mientras `BZ-14` siga abierto estos errores pueden llegar al cliente público, y una URL de servicio con token en el query string sería una fuga peor que el nombre de la variable.

**Verificado:** `npm run check` en 0 errores sobre 95 archivos y `npm run build` verde. La regla se probó contra el valor real del panel (rechazado), el valor correcto (aceptado), un valor entre comillas (rechazado) y un dominio sin esquema (rechazado). `npm run preview` sigue sin poder correr en Windows — ver `BZ-30`.

---

## ✅ Cerradas en la sesión anterior (2026-08-11)

### BZ-21 · Diagnóstico del 500 en producción 🔴
Se descartaron las hipótesis por orden de coste antes de tocar código:

1. **Reproducción local del worker compilado** — `wrangler dev` sobre `dist/server/wrangler.json` **crashea workerd en Windows** (`std::terminate() called with no exception`). Descartada como vía de diagnóstico; queda fichada como `BZ-30`.
2. **`wrangler tail` contra producción** — requiere `wrangler login`, que abre navegador. No se ejecutó.
3. **Sondeo directo de rutas de producción** — la que dio la respuesta. Las páginas devuelven 500 con cuerpo vacío (la excepción sube sin página de error), pero `/api/productos` tiene `try/catch` y devolvió el mensaje completo, identificando las dos variables ausentes.

**Conclusión:** el despliegue está bien y el código está bien; falta configuración en el panel. Ver `BZ-23`.

**Efecto lateral valioso:** el diagnóstico fue posible porque `MissingEnvError` nombra las variables que faltan en vez de fallar con un genérico. Ese diseño se pagó solo. **Pero también expuso `BZ-14`**: ese mensaje llegó al cliente público, que es justo lo que ARCHITECTURE.md prohíbe.

### BZ-22 · Página de error 500 🟠
Nuevo `src/pages/500.astro`. Antes, cualquier error no capturado devolvía **500 con cuerpo vacío** — exactamente lo que se vio en producción: una pantalla en blanco del navegador, sin ninguna pista para el visitante ni para quien depura.

Decisiones:

- **No usa `PublicLayout`, y no debe usarlo nunca.** Ese layout monta `Header`, que lee categorías desde Supabase. Si el error es que falta configuración o que la base no responde, el layout volvería a fallar y se regresaría al 500 vacío. La página es autónoma: sin datos, sin islas, sin red.
- **No muestra el detalle técnico.** Puede contener nombres de variables o mensajes internos; queda en los logs del worker (observabilidad ya activada en `wrangler.jsonc`).
- Sin colores ni tipografías propias: usa los tokens y no repite lo que `tokens.css` ya fija en `body`.

**Verificado:** renderiza con status 500, título correcto y sin rastro de Header ni de consultas a Supabase. Las rutas normales siguen en 200 (`/`, `/nosotros`, `/admin/login`).

---

## ✅ Cerradas desde la última revisión

Trabajo hecho fuera de esta sesión, verificado ahora contra el código real:

### BZ-08 · Acceso público del bucket ✅
`BARZOL_R2_PUBLIC_URL` apunta a `https://pub-12c5101b37f34f829bbea3f12287ee9e.r2.dev`.
**Verificado:** un objeto inexistente devuelve un 404 legítimo de Cloudflare, no un fallo de DNS — el subdominio público está activo. Falta cargar esa variable en producción (`BZ-23`) y, más adelante, pasar a dominio propio (`BZ-28`).

### BZ-09 · Bucket enlazado al proyecto ✅
El log de despliegue lo confirma: `env.MEDIA (barzol-web) → R2 Bucket`, junto a `SESSION`, `IMAGES` y `ASSETS`.

### BZ-12 · Validación con Zod ✅
Existen `productoSchema.ts`, `categoriaSchema.ts`, `galeriaSchema.ts` y `configuracionSchema.ts`, todos reutilizando `zodError.ts`.
**Verificado:** `npm run check` pasa con **0 errores sobre 93 archivos**. Los 8 errores de tipos que reportaba la revisión anterior desaparecieron, y desaparecieron por la vía correcta —validando— y no casteando.

### BZ-13 · Escrituras de los services ✅
**Verificado:** ya no queda ningún `Not implemented` en `src/shared/lib/`. Los endpoints reciben el cliente autenticado desde `locals.supabase`, armado una sola vez por el middleware, lo que evita re-autenticar en cada escritura.

### BZ-18 · Vista de Configuración ✅
`src/admin/configuracion/ConfiguracionView.astro` + `ConfiguracionAdmin.tsx` + ruta `/admin/configuracion`.

---

## 🚧 Bloqueante

### BZ-34 · `wrangler deploy` borra las variables del panel 🔴
**Es lo único que separa al sitio de estar funcionando**, y explica por qué cargarlas a mano "no servía": servía, hasta el siguiente push.

Wrangler trata `wrangler.jsonc` como fuente de verdad al estilo terraform. Sin bloque `vars` ahí, cada `npx wrangler deploy` —lo que corre el pipeline de Cloudflare en cada push— elimina del worker todas las variables cargadas desde el panel.

**Ya corregido en el código:** `"keep_vars": true` en `wrangler.jsonc`.

**Falta la parte manual, en este orden:**

1. Cargar de nuevo `BARZOL_SUPABASE_URL` y `BARZOL_SUPABASE_ANON_KEY` en Cloudflare → Workers & Pages → `barzol-web` → Settings → **Variables and Secrets** (verificar que `BARZOL_R2_PUBLIC_URL` siga ahí).
2. Redesplegar. El `keep_vars` sólo protege a partir del despliegue que lo incluya, así que **este primer redespliegue es el que lo activa**.
3. Abrir `/api/diagnostico` y confirmar `"ok": true`.

> **Alternativa considerada y descartada:** declarar las variables en `wrangler.jsonc`, que las dejaría versionadas y reproducibles. Se descartó porque mete la anon key de Supabase al repositorio. Si más adelante se prefiere ese camino, la decisión es sólo sobre la anon key — `BARZOL_SUPABASE_URL` y `BARZOL_R2_PUBLIC_URL` son públicas y podrían ir al archivo sin discusión.

**Criterio de aceptación:** `/api/diagnostico` responde `ok: true`, `/` responde 200 y sigue respondiendo 200 **después del siguiente push**. Esa segunda parte es la que prueba que el `keep_vars` funcionó.
**Bloquea:** BZ-24, BZ-25.

---

### BZ-31 · Corregir el valor de `BARZOL_SUPABASE_URL` ✅
Cerrada. Queda como referencia de la primera causa del 500 — el valor estaba pegado como enlace de markdown. Al recargar las variables (`BZ-34`) hay que volver a pegarlo en crudo.

**Ruta en el panel:** Cloudflare → Workers & Pages → `barzol-web` → Settings → **Variables and Secrets**. No es la sección de Pages: este proyecto se despliega como Worker con assets.

| Variable | Estado hoy | Acción |
|---|---|---|
| `BARZOL_SUPABASE_URL` | `[https://…](https://…)` — enlace de markdown | **Reemplazar** por `https://rnfcccnesxunjtpwahce.supabase.co`, sin corchetes, sin paréntesis, sin barra final |
| `BARZOL_SUPABASE_ANON_KEY` | Presente | Verificar que el **nombre** termine en `_KEY` (el panel recorta el texto visible) y que el valor no traiga comillas ni espacios |
| `BARZOL_R2_PUBLIC_URL` | `https://pub-12c5101b37f34f829bbea3f12287ee9e.r2.dev` | Correcta, dejar como está |
| `BARZOL_SUPABASE_SERVICE_ROLE_KEY` | Ausente | Bien así — hoy ningún código la lee. Si algún día se usa, va como **Secret** |

Cómo comprobar cada valor sin adivinar: el campo del panel muestra el texto recortado, así que conviene abrirlo y llevar el cursor al final. Un valor correcto empieza en `https://` **y termina en el dominio** — si aparece `](` en cualquier punto, se pegó desde un documento renderizado en vez de texto plano.

Tras guardarlas hay que **volver a desplegar** para que el Worker las tome. Editar variables no redespliega solo.

**Criterio de aceptación:** `/` responde 200 y `/api/productos` devuelve el catálogo real.
**Bloquea:** BZ-24, BZ-25.

### BZ-32 · Borrar las variables `R2_*` residuales del panel 🔴
El panel tiene tres variables que **ningún código del proyecto lee**: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` y `R2_ENDPOINT` (esta última también con corchetes de markdown). Son restos del intento con Vercel, donde R2 se accedía por API S3 firmada. Con el binding `MEDIA` no hay credenciales que configurar — ver la tabla comparativa en el historial de decisiones.

Dos motivos para borrarlas, no sólo limpieza:

1. **`R2_SECRET_ACCESS_KEY` está como *Variable*, en texto plano y visible en el panel.** Un secreto real guardado donde cualquiera con acceso al panel lo lee de un vistazo.
2. Sugieren que la aplicación usa credenciales de R2, lo que llevaría a rotar en vez de revocar cuando se atienda `BZ-07`.

**Pasos:** borrar las tres variables en Settings → Variables and Secrets, y después revocar el token en R2 → Manage API tokens (`BZ-07`). Nada del código las referencia, así que el borrado no puede romper nada — verificado: no hay ninguna aparición de `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` ni `R2_ENDPOINT` en `src/`.

---

## 📋 Despliegue — siguientes pasos

### BZ-24 · Verificación post-deploy 🔴
Checklist de humo contra el dominio de producción, no sólo la home:

```
/                       200 y muestra productos
/catalogo/<categoria>   200
/producto/<slug>        200
/galeria                200
/api/productos          JSON con datos
/admin                  302 → /admin/login
/admin/login            200 y permite iniciar sesión
/una-ruta-inventada     404 (no 500)
```

El último caso importa: hay `500.astro` pero **no hay `404.astro`**, así que conviene comprobar qué devuelve hoy una ruta inexistente.

### BZ-25 · Probar la subida a R2 en producción 🟠
La escritura en R2 se verificó contra el **bucket simulado en local** (`put`/`get`/`delete`), nunca contra el bucket real desde el worker desplegado. Falta cerrar ese hueco: subir una imagen real y comprobar que se ve desde `BARZOL_R2_PUBLIC_URL`.

**Depende de:** BZ-23, y en la práctica de BZ-10 (sin UI de subida hay que hacerlo con `curl` y una sesión válida).

### BZ-26 · Separar variables de secretos 🟠
Hoy todo iría como *variable* en texto plano, visible en el panel. Conviene decidir la clasificación de una vez:

- `BARZOL_SUPABASE_URL`, `BARZOL_R2_PUBLIC_URL` → variables. Son públicas por naturaleza.
- `BARZOL_SUPABASE_ANON_KEY` → variable. Está pensada para exponerse; la protege RLS.
- `BARZOL_SUPABASE_SERVICE_ROLE_KEY` → **secret, siempre**. Salta RLS. Si algún día se usa, jamás como variable plana.

Conviene además revisar que RLS esté realmente activo en Supabase: toda la seguridad de la anon key depende de eso.

### BZ-27 · Dominio propio para el sitio 🟡
Hoy el sitio vive en `barzol-web.willymichael-cardenas.workers.dev`. ARCHITECTURE.md ya presupuesta el dominio (~S/. 40-70/año) y es el único gasto real del proyecto. Al conectarlo hay que revisar los enlaces absolutos y los canonical.

### BZ-28 · Dominio propio para el bucket 🟡
`pub-*.r2.dev` **no está recomendado para tráfico de producción**: tiene límites de tasa y no es cacheable igual que un dominio propio. Conviene un subdominio tipo `media.barzol.com`.

El cambio es sólo de variable (`BARZOL_R2_PUBLIC_URL`), pero **las URLs ya guardadas en Supabase quedarían apuntando al dominio viejo**. Por eso conviene hacerlo antes de cargar contenido de verdad, o guardar la `key` junto a la URL (ver `BZ-11`) para poder reconstruirlas.

### BZ-29 · Runbook de observabilidad 🟡
`wrangler.jsonc` ya tiene `observability.enabled: true`, pero nadie documentó cómo usarla. Un error en producción hoy se diagnostica a ciegas — este mismo 500 se resolvió sondeando rutas, no leyendo logs.

Documentar: `wrangler login`, `wrangler tail barzol-web` para logs en vivo, y dónde ver las trazas en el panel. Los `console.error` de `/api/media` van ahí.

### BZ-30 · `npm run preview` inutilizable en Windows 🟡
`wrangler dev` sobre el build compilado crashea workerd con `std::terminate() called with no exception`. **No hay forma de probar el bundle de producción en local**, que es justamente lo que habría anticipado este 500 antes de desplegar. `npm run dev` sí funciona, pero no ejerce el mismo código.

Investigar si es el binding de assets, el de R2 o una incompatibilidad de workerd en Windows.

---

## 📋 Funcionalidad pendiente

### BZ-10 · Conectar el panel admin al flujo de subida 🟠
El módulo de R2 existe pero **ningún componente lo usa**: `ProductsAdmin.tsx`, `GalleryAdmin.tsx` e `InicioAdmin.tsx` siguen manejando imágenes como data-URL en estado local.

Falta el cliente que haga el `POST` a `/api/media` y devuelva la `publicUrl`. Debe vivir en **un solo archivo** compartido por las tres islas — p. ej. `src/admin/shared/useSubidaMedia.ts` — con estados de progreso, error y cancelación. No replicar la lógica en cada componente.

**Nota de alcance:** los tres componentes superan las 1000 líneas y quedaron fuera por indicación explícita. El hook nuevo va aparte.

### BZ-11 · Borrado de multimedia y huérfanos 🟠
No hay forma de borrar un objeto desde la aplicación: al reemplazar la foto de un producto, la anterior queda en el bucket para siempre. Falta `borrarMedia(key)` en `mediaStorage.ts` y el endpoint `DELETE /api/media`.

Conviene guardar la `key` además de la `publicUrl` en Supabase — derivar una de otra manipulando strings es frágil, y `BZ-28` (cambio de dominio) lo vuelve directamente peligroso.

---

## 🧹 Deuda técnica

### BZ-14 · Dejar de filtrar mensajes internos 🔴 ↑ *(prioridad elevada)*
**Ya no es teórico: pasó en producción.** Una petición pública a `/api/productos` devolvió el mensaje interno completo, incluidos los nombres de las variables de entorno y la ruta del panel de Cloudflare. Sirvió para diagnosticar, pero es exactamente la fuga que ARCHITECTURE.md prohíbe.

Hay **18 apariciones de `errorResponse((error as Error).message)` en 9 archivos**: `auth/login`, `auth/logout`, `categorias/index`, `categorias/[id]`, `configuracion/index`, `galeria/index`, `galeria/[id]`, `productos/index`, `productos/[id]`.

La solución es el `shared/lib/errors/apiError.ts` que el documento ya exige: registra el error real con `console.error` (visible por observabilidad) y devuelve un texto genérico. `/api/media` ya sigue ese patrón y sirve de referencia.

**No hacerlo con un reemplazo ciego:** algunos de esos mensajes hoy son la única pista de diagnóstico. Hay que mover la información al log en el mismo cambio, no simplemente borrarla.

### BZ-07 · Revocar el token de API de R2 🔴
El token, el Access Key ID y el Secret se compartieron en una captura por chat. Con el binding nativo **la aplicación ya no usa credenciales de R2**, así que no hace falta reemplazarlo: se revoca y punto.
**Pasos:** Cloudflare → R2 → Manage API tokens → borrar `barzol-web-token`.

### BZ-37 · Proteger o retirar `/api/diagnostico` 🟡
El endpoint no filtra valores ni mensajes, pero sí revela **qué está mal configurado**: qué variables faltan y qué bindings no llegaron. Es poca cosa y hoy compensa —es la herramienta con la que se está estabilizando el despliegue—, pero no tiene por qué quedar abierto para siempre.

Cuando el sitio esté estable, decidir entre tres:

- Dejarlo público tal cual. Defendible: no expone nada aprovechable.
- Exigir un token propio (`BARZOL_DIAG_TOKEN`) y devolver 404 si no está definido. Queda apagado por defecto y se enciende cuando hace falta.
- Retirarlo.

**No conviene ponerlo detrás del login del admin:** si lo que falla es la configuración de Supabase, no se puede iniciar sesión, y el diagnóstico quedaría inaccesible justo cuando hace falta. Ese es el motivo de que hoy sea público.

### BZ-15 · `baseUrl` deprecado en `tsconfig.json` ⚪
TypeScript 6 lo marca como deprecado y deja de funcionar en 7.0.

### BZ-16 · Vulnerabilidades de npm ⚪
El log de despliegue reporta 9 (1 moderada, 8 altas). Además, 3 paquetes tienen scripts de instalación sin aprobar (`esbuild`, `sharp`, `workerd`).

### BZ-17 · Mover `Pagination.astro` a `landing/shared/` ⚪
La usan `BusquedaView` y `CatalogoView`.

### BZ-19 · Datos estructurados y SEO ⚪
Faltan `Product` JSON-LD, `BreadcrumbList` y `Organization`, además de canonical y Open Graph. Se vuelve accionable recién con dominio propio (`BZ-27`).

### BZ-20 · Arranque lento del servidor de desarrollo ⚪
`npm run dev` tarda ~31s y el CLI corta a los 30s: **el primer intento falla casi siempre**, el segundo funciona. Se confirmó de nuevo en esta sesión.

---

## Mapa de dependencias

```
BZ-32 (borrar R2_* del panel) ─ BZ-07 (revocar token) ── hacer YA, es seguridad
BZ-14 (fuga de mensajes) ────── independiente, ya ocurrió en producción

BZ-34 (recargar variables) ┬── BZ-24 (verificación post-deploy)
                           └── BZ-25 (subida real a R2) ── depende también de BZ-10
BZ-35 (/api/diagnostico) ────── verifica BZ-34 ── se cierra con BZ-37
BZ-10 (subida en admin) ─────── BZ-11 (borrado) ── habilita BZ-28
BZ-27 (dominio sitio) ───────── BZ-19 (SEO)
BZ-28 (dominio bucket) ──────── hacer ANTES de cargar contenido real
```

**Orden sugerido:** BZ-34 → BZ-24 → BZ-32 → BZ-07 → BZ-14 → BZ-37 → BZ-26 → BZ-10 → BZ-25 → BZ-28 → BZ-11 → BZ-27.

Las tres primeras son de panel, no de código: se hacen en una sola visita a Cloudflare y un redespliegue.

---

## Historial de decisiones

### Vercel evaluado y descartado (2026-08-08)
Se llegó a migrar el proyecto entero a Vercel (`@astrojs/vercel`, subida por URL prefirmada con el SDK de AWS, `wrangler.jsonc` eliminado) y quedó funcionando, verificado contra el bucket real. **Se revirtió por decisión de arquitectura:** repartir hosting y storage entre dos proveedores obliga a piezas que con un solo ecosistema no existen.

| Aspecto | Vercel + R2 (descartado) | Cloudflare + R2 (actual) |
|---|---|---|
| Acceso a R2 | API S3 con Access Key + Secret | Binding `MEDIA`, sin credenciales |
| Credenciales que rotar | 3 | **ninguna** |
| CORS del bucket | Obligatorio | No aplica — mismo origen |
| Firma de peticiones | SigV4 con SDK de AWS | No aplica |
| Dependencias extra | `@aws-sdk/client-s3`, `s3-request-presigner` | ninguna |
| Límite de subida | ~4.5 MB → forzaba prefirmadas | 100 MB (plan Free) |

El trabajo descartado quedó en la rama `feat/perfil-vercel-r2`. **No debe fusionarse.**

### El bug de `import.meta.env` (2026-08-08, `BZ-04`)
`db/client.ts` y `authClient.ts` leían las variables con `import.meta.env.BARZOL_*`. Vite sustituye esos accesos por su valor **de build time**; como las variables de Cloudflare son invisibles entonces, quedaba `undefined` fijo y el compilador plegaba el `if (!url) throw` en un `throw` incondicional, eliminando `createClient` como código muerto:

```js
import "@supabase/supabase-js";
throw new Error("Faltan BARZOL_SUPABASE_URL / ...");
export { supabase as t };
```

Ese bundle habría fallado en cada request **aunque las variables estuvieran bien cargadas**. Se corrigió con `shared/lib/env/serverEnv.ts`, que las toma de `cloudflare:workers` en runtime. El 500 de este despliegue es un caso distinto y sano: el código funciona y avisa correctamente de lo que falta.
