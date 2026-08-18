# Scrumban — Despliegue en Cloudflare (Workers + R2)

> **Creado:** 2026-08-08 · **Última actualización:** 2026-08-18 (8ª revisión) · **Rama:** `main`
> **Alcance:** puesta en producción del sitio sobre Cloudflare y del contenido multimedia sobre R2.

## Estado del despliegue — 2026-08-18, 8ª revisión

**`BZ-49` resuelto. El sitio está en pie: `supabase.ok: true` y ninguna ruta devuelve 500.**

La causa era más simple —y más difícil de ver desde afuera— de lo que suponían las siete revisiones anteriores. Al autenticarse con `wrangler login` y preguntarle a la API qué secretos tenía el worker, la respuesta fue:

```
$ npx wrangler secret list
[]
```

**El worker no tenía ningún secreto.** Ninguno. No era un nombre cortado ni un valor mal pegado ni un despliegue que lo descartaba: nunca hubo nada que descartar. La subida lo confirmó desde el otro lado, porque wrangler informó `Creating the secret` y no `Updating` — para la API, esa clave no existía hasta ese momento.

Eso reconcilia las dos evidencias que parecían contradecirse: el panel mostraba `BARZOL_SUPABASE_ANON_KEY` con "Value encrypted", y el worker no la recibía. Ambas eran ciertas. Lo guardado en el panel no llegó a *este* worker — el candidato más probable es que se cargara sobre otro recurso de nombre idéntico (el proyecto de Pages `barzol-web` que quedó del intento anterior, que en el panel se ve casi igual que el Worker).

**La lección para el runbook:** el panel confirma que guardó algo, pero no contra qué recurso. `wrangler secret list` sí, y es la única fuente que hay que creerle. Ese comando debería haber sido el primer paso del diagnóstico, no el séptimo.

**Verificado en producción** tras cargar el secreto con `scripts/subir-secretos.mjs` (`BZ-51`):

```json
"clavesRecibidas": ["BARZOL_R2_PUBLIC_URL", "BARZOL_SUPABASE_ANON_KEY", "BARZOL_SUPABASE_URL"],
"bindings":  { "MEDIA": true, "SESSION": true, "IMAGES": true, "ASSETS": true },
"supabase":  { "ok": true, "motivo": null, "codigo": null },
"pistas":    ["Sin problemas detectados: configuración completa y Supabase responde."]
```

Y las rutas reales, que es la prueba que importa:

| Ruta | Respuesta |
|---|---|
| `/` | 200 — lista categorías traídas de Supabase (`clarinete`, `euphonium`, `saxo`) |
| `/galeria`, `/nosotros`, `/servicios`, `/busqueda` | 200 |
| `/catalogo/clarinete`, `/catalogo/euphonium`, `/catalogo/saxo` | 200 — ruta dinámica con consulta real |
| `/admin` | 302 → login, como corresponde |
| ruta inexistente | 404 con la página propia |

Que la home liste categorías reales es lo que cierra el caso: no es sólo que la clave llegó, es que **el sitio está leyendo datos**. El camino B (declarar la clave en `wrangler.jsonc`) queda descartado y no hace falta ninguna decisión de postura: la clave vive como Secret, que era el lugar correcto desde el principio.

**Nota sobre los 404 de `/productos` y `/contacto`:** no son un fallo. Esas rutas no existen en el proyecto; las equivalentes son `/catalogo/[categoria]` y `/servicios`. Se anota para no volver a perseguirlas como si fueran un error.

**Lo único que queda por confirmar es la estabilidad:** que el secreto sobreviva al próximo despliegue. La teoría dice que sí —wrangler no borra secretos, sólo variables, y por eso `BZ-45` quedó anulada— pero después de siete revisiones conviene comprobarlo en vez de suponerlo. Este mismo push es la prueba: al terminar el build de Workers Builds, `clavesRecibidas` debe seguir mostrando las tres. Queda como `BZ-52`.

## Estado del despliegue — 2026-08-15, 7ª revisión

**Diagnóstico cerrado: el secreto no se le está entregando al worker.** No es un problema de nombre, ni de valor mal pegado, ni de código.

`BZ-48` dio la respuesta en la primera consulta:

```json
"build": { "commit": "b2be217" },
"clavesRecibidas": ["BARZOL_R2_PUBLIC_URL", "BARZOL_SUPABASE_URL"]
```

**Sólo dos claves, y ninguna parecida a la que falta.** Eso descarta la hipótesis del nombre cortado —que además vos verificaste en el panel, donde figura completo como `BARZOL_SUPABASE_ANON_KEY`— y descarta también un valor mal pegado: si hubiera llegado con cualquier problema de formato, la clave aparecería igual en la lista.

**El log de despliegue lo confirma desde el otro lado.** Los bindings que recibe el worker:

```
env.SESSION (inherited)                                KV Namespace
env.MEDIA (barzol-web)                                 R2 Bucket
env.IMAGES                                             Images
env.ASSETS                                             Assets
env.BARZOL_SUPABASE_URL  ("https://rnfccc...")         Environment Variable
env.BARZOL_R2_PUBLIC_URL ("https://pub-12c...")        Environment Variable
```

El secreto **no aparece**, ni siquiera marcado como `(inherited)` — que es exactamente como wrangler señala lo que hereda sin declarar, según se ve en `env.SESSION`. Las dos fuentes coinciden: el despliegue no lo incluye.

**Lo que sí quedó demostrado es que `vars` funciona.** Las dos variables declaradas en `wrangler.jsonc` llegan sin fallar, despliegue tras despliegue, sin intervención manual. El mecanismo está probado; el problema está en el otro.

**Hay dos caminos y uno requiere una decisión que no es técnica.** Ver `BZ-49`.

## Estado del despliegue — 2026-08-15, 6ª revisión

**De tres variables ausentes quedó una. `BZ-47` funcionó.**

```json
"build": { "commit": "9ec6b93", "compiladoEn": "2026-08-15T05:32:28.294Z" },
"variables": {
  "BARZOL_SUPABASE_URL":      { "presente": true,  "longitud": 40 },
  "BARZOL_R2_PUBLIC_URL":     { "presente": true,  "longitud": 51 },
  "BARZOL_SUPABASE_ANON_KEY": { "presente": false }
}
```

Las dos declaradas en `wrangler.jsonc` **llegan solas y sin intervención manual**, que era exactamente el objetivo: dejaron de depender del panel y ya no hay despliegue que las borre. El error de producción lo confirma — pasó de nombrar tres variables a nombrar una sola.

**Lo que queda: el secreto no llega al worker.** La captura del panel muestra `BARZOL_SUPABASE_ANON_` con tipo *Secret* y "Value encrypted", así que a simple vista está bien cargado. Pero el worker no lo recibe, y desde afuera hay dos causas indistinguibles:

1. El **nombre** quedó mal escrito o cortado al guardarlo. El panel recorta los nombres largos en pantalla: `BARZOL_SUPABASE_ANON_` y `BARZOL_SUPABASE_ANON_KEY` se ven idénticos.
2. El **valor** no se aplicó al worker desplegado.

Adivinar entre las dos ya costó varias iteraciones, así que en vez de proponer otra prueba a ciegas se agregó al diagnóstico la lista de nombres que el worker realmente recibe (`BZ-48`). En la próxima consulta a `/api/diagnostico` la respuesta señala cuál de las dos es, sin abrir el panel.

**Detalle secundario, ya resuelto por el propio cambio:** las variables `R2_*` residuales de `BZ-32` desaparecieron del panel entre una captura y otra — el despliegue las borró, que es el comportamiento esperado al no estar declaradas en `wrangler.jsonc`. Conviene confirmarlo con `clavesRecibidas`.

## Estado del despliegue — 2026-08-15, 5ª revisión

**Se dejó de depender del panel para las variables.** Tres despliegues seguidos terminaron con las tres variables ausentes; repetir "cargalas a mano" una cuarta vez no era una solución, era un procedimiento frágil.

**Primero, la buena noticia — `BZ-44` funciona en producción:**

```json
"build": { "commit": "086d962", "compiladoEn": "2026-08-15T03:44:35.884Z" }
```

`WORKERS_CI_COMMIT_SHA` se inyecta de verdad en el entorno de Workers Builds, y `compiladoEn` coincide al segundo con la línea `03:44:35` del log de build. La pregunta *"¿qué código está corriendo?"* ya se responde en una petición, y ese commit es exactamente el último de `main`. **El despliegue funciona; lo que faltaba era configuración.**

**El cambio de fondo de esta revisión.** Las variables pasan a repartirse según su naturaleza, en vez de vivir todas en el panel:

| Variable | Antes | Ahora |
|---|---|---|
| `BARZOL_SUPABASE_URL` | Panel (se borraba) | **`wrangler.jsonc` → `vars`** |
| `BARZOL_R2_PUBLIC_URL` | Panel (se borraba) | **`wrangler.jsonc` → `vars`** |
| `BARZOL_SUPABASE_ANON_KEY` | Panel como *Variable* | **Secret** en el panel |

Lo que hace que esto cierre el problema de raíz, y no sea otra mitigación:

- Las dos URLs **no son secretas** —son la URL pública del proyecto de Supabase y el dominio público de las imágenes, ambos ya viajan al navegador— así que versionarlas no expone nada. El despliegue las establece solo: no hay paso manual que recordar ni nada que se pueda borrar.
- La anon key va como **Secret**, y la documentación de Cloudflare es explícita: *"Wrangler will not delete your secrets unless you run `wrangler secret delete`"*. Los secretos son la única categoría inmune al borrado.

**Resultado: ninguna variable queda expuesta al borrado**, y el trabajo manual pasa de "cargar tres variables después de cada despliegue" a "cargar un secreto, una vez".

Ver `BZ-46`. Es la última acción de panel pendiente.

## Estado del despliegue — 2026-08-15, 4ª revisión

**Tres de los cuatro problemas se cerraron. Queda uno, y es una acción de panel de dos minutos.**

El despliegue del `2026-08-14T04:09Z` sí corrió y subió el código nuevo: en la lista de módulos aparecen `chunks/404_…`, `chunks/500_…`, `chunks/ErrorLayout_…`, `chunks/diagnostico_…` y `chunks/logServerError_…`. Verificado además contra producción:

| Comprobación | Resultado | Cierra |
|---|---|---|
| `/api/diagnostico` | **200** (antes 404) | `BZ-38` — los despliegues volvieron |
| Ruta inexistente | `<title>Página no encontrada — Barzol</title>` | `BZ-40` — el 404 propio está en producción |
| Observability | Stack trace completo del `MissingEnvError` | `BZ-36` — el rastreo funciona |
| `keep_vars` en el config del deploy | `"keep_vars":true` presente | `BZ-34` (parte de código) |

**Lo que sigue fallando, y por qué.** El diagnóstico de producción responde:

```json
{ "ok": false,
  "variables": { "BARZOL_SUPABASE_URL": { "presente": false },
                 "BARZOL_SUPABASE_ANON_KEY": { "presente": false },
                 "BARZOL_R2_PUBLIC_URL": { "presente": false } },
  "bindings": { "MEDIA": true, "SESSION": true, "IMAGES": true, "ASSETS": true } }
```

**Ninguna de las tres variables está cargada en el worker** — ni siquiera `BARZOL_R2_PUBLIC_URL`, que antes sí figuraba. Los bindings, en cambio, llegan los cuatro: eso descarta un problema de configuración general y deja el foco en las variables.

**`keep_vars` conserva lo que hay; no repone lo que ya se borró.** El despliegue anterior —el que aún no lo incluía— dejó el panel vacío, y el siguiente, ya con `keep_vars`, preservó fielmente ese vacío. No es que la corrección haya fallado: llegó un despliegue tarde. La acción pendiente es cargar las tres variables **ahora**, con `keep_vars` ya activo, y a partir de ahí sobreviven a los push. Ver `BZ-34`.

**Una comprobación que valía la pena hacer.** El log de deploy dice `Using redirected Wrangler configuration → dist/server/wrangler.json`: wrangler **no lee `wrangler.jsonc`**, sino un archivo que genera el adaptador de Astro. Cabía que `keep_vars` se perdiera en esa traducción, lo que habría invalidado toda la corrección. Se inspeccionó el archivo generado y **`"keep_vars":true` está presente**. La sospecha era razonable y quedó descartada con evidencia.

**Confirmación de identidad del código.** El stack trace de Observability apunta a `chunks/serverEnv_BCEz3PHr.mjs`, exactamente el nombre que figura en el log de build de ese despliegue. Es prueba directa de que el worker corre ese bundle y no uno anterior — la ambigüedad que costó la sesión pasada. Para no depender de cruzar hashes a mano, `BZ-44` agrega el commit al diagnóstico.

**Un detalle del stack que conviene retener:** el error sube desde `renderStreamToStream`, es decir con el streaming ya en curso. Es el borde que `BZ-36` documentó como límite del middleware, y confirma por qué el rastreo no debía depender sólo de ahí.

## Estado del despliegue — 2026-08-14, 3ª revisión

**El worker en producción está corriendo código viejo.** Esto reordena todo el diagnóstico anterior.

Prueba directa contra producción:

```
GET /api/diagnostico   → 404 Not Found
```

Ese endpoint existe en `origin/main` (commit `3908e0e`) — verificado con `git cat-file`. Que devuelva 404 significa que **el worker desplegado no incluye los dos últimos commits**. En cambio `/500` sí responde con la página de error, que llegó en `112af0b`. O sea: producción está parada alrededor de `112af0b`/`394e46c`, y `origin/main` va dos commits más adelante.

**La consecuencia es la que importa:** `keep_vars: true` viaja en `3908e0e`, así que **nunca llegó al worker**. Por eso las variables se siguen borrando pese a estar corregido en el repositorio. Cargarlas a mano y redesplegar no iba a funcionar: el despliegue que las conserva es justamente el que no se está ejecutando.

**Hipótesis principal sobre por qué se detuvieron los despliegues:** el repositorio **se movió a `Core-Tech-Group/barzol-web`**. GitHub redirige los `git push` (por eso los commits llegan), pero una integración de Workers Builds atada al repositorio anterior puede haber dejado de dispararse. Ver `BZ-38`, que es ahora el bloqueante real.

Sondeo completo del día:

| Ruta | Respuesta | Lectura |
|---|---|---|
| `/` | 500 | Sigue sin variables |
| `/api/productos` | `Faltan variables de entorno: BARZOL_SUPABASE_URL, BARZOL_SUPABASE_ANON_KEY` | Confirmado: borradas otra vez |
| `/500` | 500 con la página de error | El commit `112af0b` sí está desplegado |
| `/api/diagnostico` | **404** | El commit `3908e0e` **no** está desplegado |
| ruta inexistente | 404 por defecto de Astro | Resuelto en esta sesión (`BZ-40`) |

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
| BZ-32 | Borrar las variables `R2_*` residuales del panel | ✅ Resuelta por el despliegue | 🔴 |
| BZ-33 | Validar las variables `*_URL` al leerlas | ✅ Hecho | 🟠 |
| BZ-34 | **`wrangler deploy` borra las variables del panel** | 🔶 Código hecho, falta recargarlas | 🔴 |
| BZ-35 | Endpoint `GET /api/diagnostico` | ✅ Hecho | 🔴 |
| BZ-36 | Rastreo de errores en los logs del worker | ✅ Hecho | 🟠 |
| BZ-37 | Proteger o retirar `/api/diagnostico` | ⬜ Pendiente | 🟡 |
| BZ-38 | Los despliegues no se están ejecutando | ✅ Hecho | 🔴 |
| BZ-39 | Actualizar el remoto git a `Core-Tech-Group` | ⬜ Pendiente | 🟠 |
| BZ-40 | Página 404 propia | ✅ Hecho y verificado en prod | 🟠 |
| BZ-41 | Evaluación: ¿migrar a Workers KV? | ✅ Hecho (descartado) | 🟠 |
| BZ-42 | Evaluación: ¿volver a Cloudflare Pages? | ✅ Hecho (descartado) | 🟠 |
| BZ-43 | Caché de catálogo en KV | ⬜ Pendiente | ⚪ |
| BZ-44 | Commit y fecha de build en el diagnóstico | ✅ Hecho y verificado en prod | 🟠 |
| BZ-45 | Verificar que `keep_vars` funciona de verdad | ⚫ Anulada por BZ-46 | 🔴 |
| BZ-46 | **Cargar la anon key como Secret** | 🔶 Cargada, no llega al worker | 🔴 |
| BZ-47 | Variables públicas en `wrangler.jsonc` | ✅ Hecho y verificado en prod | 🔴 |
| BZ-48 | Listar en el diagnóstico las claves recibidas | ✅ Hecho y verificado en prod | 🔴 |
| BZ-49 | **Entregar la anon key al worker** | ✅ Hecho | 🔴 |
| BZ-50 | Verificar que RLS esté activo en Supabase | ⬜ Pendiente | 🔴 |
| BZ-51 | Script para cargar secretos desde `.env` | ✅ Hecho | 🟠 |
| BZ-52 | Confirmar que el secreto sobrevive al despliegue | 🔶 En verificación | 🔴 |

**Progreso:** 32 de 52 hechas. **Sin bloqueantes: el sitio responde y lee datos de Supabase.** Lo que sigue deja de ser "levantar el despliegue" y pasa a ser cerrar seguridad y funcionalidad — `BZ-50` (RLS), `BZ-07` (revocar el token de R2 expuesto), `BZ-14` (dejar de filtrar mensajes internos de error) y `BZ-37` (proteger o retirar `/api/diagnostico`).

`BZ-52` es lo único que queda del hilo del despliegue: comprobar que el secreto sigue ahí después de este push.

`BZ-46` queda absorbida por `BZ-49`. Su título —«está cargada pero no llega»— resultó ser falso en la primera mitad: nunca estuvo cargada en este worker.

`BZ-45` queda anulada: probaba si `keep_vars` conservaba las variables del panel, pero con `BZ-47` las públicas ya no viven ahí y la anon key pasa a ser un secreto, categoría que wrangler no borra. El escenario que iba a verificar dejó de existir.

`BZ-31` quedó cerrada: el valor con corchetes ya se corrigió. Lo que quedó abierto es que el despliegue borra lo que se corrija.

| Prioridad | Significado |
|---|---|
| 🔴 P0 | Bloquea el despliegue o hay riesgo de seguridad |
| 🟠 P1 | Necesario para que la funcionalidad sirva de verdad |
| 🟡 P2 | Deuda técnica con impacto real |
| ⚪ P3 | Mejora, sin urgencia |

---

## ✅ Cerradas en esta sesión (2026-08-15)

### BZ-38 · Los despliegues volvieron a ejecutarse ✅ 🔴
El despliegue del `2026-08-14T04:09Z` corrió y subió el código nuevo. La lista de módulos del log incluye `chunks/404_8h2rJZsd.mjs`, `chunks/500_BK3FtEDX.mjs`, `chunks/ErrorLayout_VD4ephtM.mjs`, `chunks/diagnostico_D6so2-Sx.mjs` y `chunks/logServerError_B0VNaf_6.mjs` — todo lo de los dos commits que faltaban.

**Verificado contra producción:** `/api/diagnostico` responde **200** (antes 404), y una ruta inexistente devuelve la página propia en español en vez del 404 por defecto de Astro.

Queda sin confirmar **por qué** se habían detenido. Si fue el cambio de repositorio a `Core-Tech-Group`, se resolvió solo o alguien reconectó la integración. Conviene igual atender `BZ-39`, que sigue abierto.

### BZ-44 · Commit y fecha de build en el diagnóstico 🟠
La sesión anterior se fue en descubrir que el worker corría código viejo, y el único método disponible fue adivinar por rutas: pedir una que sólo existiera en el código nuevo y ver si daba 404. La primera pregunta ante cualquier fallo —*"¿estoy mirando el código que creo?"*— no tenía respuesta directa.

`/api/diagnostico` ahora abre con:

```json
"build": { "commit": "abc1234", "compiladoEn": "2026-08-15T03:36:23.304Z" }
```

Nuevo `shared/lib/build/buildInfo.ts` (28 líneas). Los valores se congelan en tiempo de compilación desde `astro.config.mjs` vía `vite.define`, y **tiene que ser así**: `WORKERS_CI_COMMIT_SHA` sólo existe en el entorno de build de Cloudflare, no en el runtime del worker, así que leerlo con `serverEnv.ts` devolvería siempre `undefined`. Es la única excepción documentada a la regla de leer configuración por ahí, y por eso vive en su propio archivo en vez de mezclarse con `serverEnv`.

Se contemplan tres orígenes con respaldo: `WORKERS_CI_COMMIT_SHA` (el que usa Workers Builds, [confirmado en la documentación](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)), `CF_PAGES_COMMIT_SHA` y `GITHUB_SHA`. En un build local sin ninguna, informa `"desconocido"` en vez de romper.

**Verificado** levantando el servidor con `WORKERS_CI_COMMIT_SHA=abc1234567890def`: el diagnóstico devolvió `"commit": "abc1234"`, recortado a 7 caracteres. `npm run check` en 0 errores sobre 100 archivos y las 6 rutas de humo sin cambios.

### BZ-36 · El rastreo de errores funciona en producción ✅
No es una tarjeta nueva, pero merece registro: **es la primera vez que un error de producción queda legible**. Observability capturó el stack completo:

```
MissingEnvError: Faltan variables de entorno: BARZOL_SUPABASE_URL, ...
    at requireServerEnv (chunks/serverEnv_BCEz3PHr.mjs:93:34)
    at getSupabase (chunks/client_D0-cckc9.mjs:9:14)
    at getHomeItems (chunks/homeService_DrMjFYGD.mjs:39:32)
    ...
    at async renderStreamToStream
```

Dos lecturas útiles más allá del error en sí:

1. **Confirma qué bundle corre.** `chunks/serverEnv_BCEz3PHr.mjs` es exactamente el nombre que figura en el log de build de ese despliegue. Prueba directa de identidad del código, que es justo lo que faltó la sesión pasada.
2. **El error sube desde `renderStreamToStream`**, con el streaming ya en curso — el borde que `BZ-36` había documentado como límite del middleware. Confirma que el rastreo no debía depender sólo de ahí, y valida haber construido `/api/diagnostico` como vía independiente.

---

## ✅ Cerradas en la sesión anterior (2026-08-14)

### BZ-41 · Evaluación: ¿migrar a Workers KV? — **descartado** 🟠
Se planteó mover el proyecto a Workers KV. **No corresponde, y en parte ya está hecho.**

**KV no es una alternativa de hosting.** Es un almacén clave-valor, no un lugar donde desplegar el sitio; no compite con Workers ni con Pages. La captura del panel muestra el namespace `barzol-web-session`, que **ya está en uso**: lo provisiona automáticamente el adaptador de Astro para las sesiones, y aparece en el log de despliegue como `env.SESSION (inherited) KV Namespace`. Por eso no está declarado en `wrangler.jsonc` — lo inyecta el adaptador.

**KV tampoco puede reemplazar a Supabase.** Es la parte importante de la evaluación:

| Necesidad del catálogo | Supabase | Workers KV |
|---|---|---|
| `where categoria = X order by orden` | Sí | No — sólo `get` por clave exacta |
| Joins (producto + fotos + características) | Sí | No |
| Autenticación del admin | Supabase Auth | No existe |
| RLS por fila | Sí | No |
| Consistencia | Inmediata | **Eventual: hasta 60s o más** entre ubicaciones |

Ese último punto solo ya lo descalifica para el panel: el admin guarda un producto y podría no verlo al recargar. Y las consultas del catálogo son relacionales — `categoriaService` arma un árbol de categorías con subcategorías anidadas, algo que en KV habría que precalcular y reescribir entero en cada cambio.

**KV tampoco reemplaza a R2:** el límite de respuesta es de 25 MB y está pensado para valores chicos y lectura intensiva, no para fotos y video. R2 es el almacén de objetos y no cobra egress.

**Dónde sí serviría, más adelante:** cachear en el borde las consultas de catálogo y categorías para ahorrar viajes a Supabase — que además mitigaría la pausa por inactividad del plan Free. Queda como `BZ-43`, prioridad baja: primero hay que tener el sitio en pie.

**Conclusión:** KV ya cumple su función (sesiones). No hay nada que migrar.

### BZ-42 · Evaluación: ¿volver a Cloudflare Pages? — **descartado** 🟠
La sospecha era que el despliegue "no era óptimo" por usar `wrangler deploy` en vez de Pages. **Es al revés: la configuración actual es la recomendada por Cloudflare, y Pages es el camino heredado.**

La documentación oficial es explícita: *"If you are starting a new project, use Workers instead of Pages... all investment, optimizations, and feature work will be dedicated to improving Workers."* Existe una guía de migración **de Pages hacia Workers**, no en la dirección contraria.

Lo que el proyecto ya tiene y confirma que está del lado correcto:

- `wrangler.jsonc` con bloque `assets` → Workers con assets estáticos, la vía recomendada para sitios con SSR.
- `_headers` generado por el adaptador y soportado nativamente en Workers.
- Bindings de R2, KV e Images adjuntos al mismo worker, sin configuración extra.

Mover a Pages costaría reconfigurar el proyecto entero, perdería el soporte de features nuevas y **no resolvería ninguno de los dos problemas reales** (variables borradas y despliegues detenidos). Lo único que Pages traía "gratis" —que sus variables no se borran al desplegar— ya está resuelto con `keep_vars: true`.

> **Sobre el video** ([enlace](https://www.youtube.com/watch?v=FmzbkWV-SwU)): sólo se pudo recuperar el título, *"How to Deploy Astro on Cloudflare in Minutes (Pages & Workers)"*. YouTube no expone la transcripción por esa vía, así que **el contenido no se revisó** y esta evaluación se basa en la documentación oficial de Cloudflare, no en el video. Si trae algún paso concreto que contradiga esto, vale traerlo y reevaluar.

**Fuentes:**
- [Migrate from Pages to Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- [Static Assets · Workers](https://developers.cloudflare.com/workers/static-assets/)
- [Choosing a data or storage product](https://developers.cloudflare.com/workers/platform/storage-options/)
- [Limits · Workers KV](https://developers.cloudflare.com/kv/platform/limits/)
- [How KV works](https://developers.cloudflare.com/kv/concepts/how-kv-works/)

### BZ-40 · Página 404 propia 🟠
Producción servía el **404 por defecto de Astro**: fondo oscuro, tipografía monoespaciada y texto en inglés, sin ninguna relación con el sitio. Era el punto que `BZ-24` había dejado anotado para verificar, y quedó confirmado.

Nuevo `src/pages/404.astro`. Para no duplicar el marcado con `500.astro`, la parte común se extrajo a **`src/landing/layout/ErrorLayout.astro`**, que recibe título, encabezado, mensaje e icono por props. Las dos páginas quedaron en 13 y 20 líneas.

El layout hereda la regla que sostenía a `500.astro`: **no monta `PublicLayout`**, porque ese lee categorías desde Supabase y volvería a fallar justo cuando la causa del error es la base o la configuración.

Dos diferencias deliberadas entre ambas páginas:

- El 404 usa el azul de marca y el 500 el rojo de peligro: una URL mal escrita no es una falla que deba alarmar.
- El 404 **no ofrece WhatsApp**. Un enlace mal tipeado no amerita empujar al visitante a soporte, sólo devolverlo al catálogo.

**Verificado en el servidor de desarrollo:** una ruta inexistente devuelve **404** con la página propia; `/500` sigue devolviendo 500 con su botón de WhatsApp; ninguna de las dos emite consultas a Supabase. `npm run check` en 0 errores sobre 99 archivos y el resto de rutas sin cambios (`/`, `/nosotros`, `/galeria`, `/admin/login`, `/api/productos`, `/api/diagnostico` en 200).

---

## ✅ Cerradas en la sesión anterior (2026-08-13)

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

## ✅ Cerradas en esta sesión (2026-08-15, 6ª revisión)

### BZ-48 · El diagnóstico lista las claves que recibe el worker 🔴
El panel de Cloudflare recorta los nombres largos en pantalla: `BARZOL_SUPABASE_ANON_KEY` se muestra como `BARZOL_SUPABASE_ANON_`, idéntico a un nombre guardado a medias. Esa ambigüedad hacía imposible distinguir dos causas muy distintas —el valor no se aplicó, o se cargó con el nombre equivocado— y llevaba a probar a ciegas.

`/api/diagnostico` agrega ahora `clavesRecibidas`: los **nombres** de todas las variables de texto que el worker recibió, incluidas las que nadie esperaba. Nunca los valores — la regla del endpoint sigue intacta, verificado con un barrido de la respuesta contra los tres valores reales.

Dos piezas nuevas, cada una en su archivo:

| Archivo | Responsabilidad |
|---|---|
| `shared/lib/env/serverEnv.ts` → `listarClavesEnv()` | Nombres de las entradas de texto del entorno; excluye los bindings, que son objetos |
| `shared/lib/env/nombresParecidos.ts` (46 líneas) | Detecta nombres "casi correctos" comparando sólo nombres |

Cuando una variable esperada falta pero llegó otra parecida, la pista lo dice y **cambia la acción**: corregir el nombre en vez de volver a cargar el valor. Se agregó además una pista específica para la anon key, recordando que debe ser de tipo *Secret* y no *Variable*.

**Verificado con 7 casos** contra la lógica real: nombre cortado, minúsculas, espacio final, sufijo mal escrito y guion faltante se detectan; un conjunto sin parecidos y el caso exacto no producen falsos positivos. En el servidor de desarrollo, `clavesRecibidas` devuelve las cuatro variables por su nombre, `ok: true`, y las rutas de humo sin cambios.

---

## ✅ Cerradas en la sesión anterior (2026-08-15, 5ª revisión)

### BZ-47 · Variables públicas declaradas en `wrangler.jsonc` 🔴
`wrangler.jsonc` gana un bloque `vars` con `BARZOL_SUPABASE_URL` y `BARZOL_R2_PUBLIC_URL`. Ninguna de las dos es secreta: la primera es la URL pública del proyecto de Supabase y la segunda el dominio desde el que se sirven las imágenes al visitante. Las dos ya viajan al navegador en cada visita, así que versionarlas no expone nada nuevo — de hecho ya estaban en `.env.example`, que sí se commitea.

Lo que se gana es que **el despliegue las establece solo**. Desaparece el paso manual y desaparece la posibilidad de que un despliegue las borre, que es lo que venía pasando.

**Verificado:** `dist/server/wrangler.json` —el archivo que wrangler realmente usa, no `wrangler.jsonc`— contiene el bloque `vars` con los dos valores. Ese detalle importaba: ya se había comprobado que el adaptador de Astro reescribe la configuración, y valía confirmar que los `vars` sobreviven a esa traducción igual que `keep_vars`.

`npm run generate-types` regeneró `worker-configuration.d.ts` y las variables ahora aparecen tipadas en `Env`. `npm run check` en 0 errores sobre 100 archivos, y en desarrollo el diagnóstico sigue en `"ok": true` con las tres presentes y las 6 rutas de humo sin cambios.

**Corrección de un defecto propio detectado al verificar:** el respaldo del SHA salía como `"descono"` — el recorte a 7 caracteres se aplicaba también al texto `'desconocido'`, que parecía un hash corrupto. Ahora sólo se recorta cuando hay SHA real.

### BZ-44 · Commit del build, confirmado en producción ✅
Verificado contra el worker desplegado, no sólo en local:

```json
"build": { "commit": "086d962", "compiladoEn": "2026-08-15T03:44:35.884Z" }
```

`WORKERS_CI_COMMIT_SHA` se inyecta realmente en Workers Builds, y la fecha coincide al segundo con la línea `03:44:35` del log. El commit corresponde al último de `main`, lo que confirma que el despliegue automático está al día.

---

## ✅ Cerradas en esta sesión (2026-08-15, 7ª revisión)

### BZ-51 · Script para cargar secretos desde `.env` 🟠
Cargar el secreto a mano por el panel falló repetidamente, y el diagnóstico de `BZ-49` apunta justamente ahí. `scripts/subir-secretos.mjs` (69 líneas) reemplaza ese paso manual.

Decisiones que lo hacen seguro:

- **El valor viaja por stdin al proceso hijo**, nunca como argumento de la línea de comandos: ahí quedaría en el historial del shell y en los logs del sistema.
- **Nunca se imprime.** El script informa el nombre y la cantidad de caracteres, que alcanza para detectar un valor truncado sin revelarlo.
- **Lista blanca explícita** de qué es secreto (`BARZOL_SUPABASE_ANON_KEY`, `BARZOL_SUPABASE_SERVICE_ROLE_KEY`). Las públicas no se tocan: viven en `wrangler.jsonc` → `vars`. Así el reparto documentado en ARCHITECTURE.md queda también expresado en código.
- Omite las que estén ausentes o vacías en `.env` en vez de fallar, para poder correrlo aunque `SERVICE_ROLE_KEY` todavía no se use.

Documentado en el README junto al resto del flujo de despliegue.

---

## 🚧 Bloqueante

### BZ-49 · Entregar la anon key al worker ✅ 🔴
**Resuelto por el camino A.** El worker no tenía ningún secreto cargado: `wrangler secret list` devolvió `[]`, y al subirlo wrangler informó `Creating the secret`, no `Updating`. Lo que mostraba el panel no correspondía a este worker. Ver el estado de la 8ª revisión.

**Cómo se resolvió:**

```bash
npx wrangler login                  # una vez por máquina — abre el navegador
node scripts/subir-secretos.mjs     # lee .env y sube sólo las secretas
npx wrangler secret list            # confirma
```

El script (`BZ-51`) lee el valor de `.env`, lo entrega **por stdin** —nunca por la línea de comandos, donde quedaría en el historial del shell— y no lo imprime: sólo informa cuántos caracteres tenía.

**Verificado:** `/api/diagnostico` devuelve las tres variables presentes y `supabase.ok: true`; la home lista categorías reales traídas de Supabase. Falta sólo confirmar que sobrevive al despliegue (`BZ-52`).

**El camino B queda descartado.** Consistía en declarar la anon key en `wrangler.jsonc` junto a las públicas, y existía sólo por si el despliegue estuviera descartando el secreto — cosa que resultó falsa. La clave se queda como Secret, fuera del repositorio, que era el lugar correcto. Con esto **no hace falta ninguna decisión de postura** del dueño del proyecto, y `BZ-50` (verificar RLS) vuelve a ser lo que era: muy recomendable, pero no una obligación derivada de haber versionado una credencial.

**Lo que hay que recordar de todo esto:** el panel de Cloudflare confirma que guardó, pero no contra qué recurso, y con un proyecto de Pages y un Worker del mismo nombre conviviendo, eso alcanzó para costar siete revisiones. `wrangler secret list` es la única fuente confiable y debe ser el **primer** paso ante una variable que no llega, no el último.

### BZ-52 · Confirmar que el secreto sobrevive al despliegue 🔶 🔴
El secreto se cargó fuera del ciclo de despliegue, así que queda comprobar que un `wrangler deploy` no lo borre — que es exactamente lo que pasó tres veces con las variables del panel (`BZ-34`, `BZ-46`).

La documentación de Cloudflare dice que no ocurre: *"Wrangler will not delete your secrets unless you run `wrangler secret delete`"*. Y el reparto actual lo refuerza: las públicas viven en `wrangler.jsonc` y no dependen de nada manual. Pero después de siete revisiones basadas en lo que debería pasar, corresponde mirarlo.

**Prueba:** este mismo push dispara un build de Workers Builds. Al terminar:

```bash
curl https://barzol-web.willymichael-cardenas.workers.dev/api/diagnostico
```

**Se cierra si** `clavesRecibidas` sigue mostrando las tres claves y `supabase.ok` sigue en `true`, con un `build.commit` distinto al de ahora — ese último detalle importa, porque si el commit no cambió la prueba no ocurrió.

**Si el secreto desapareciera**, la salida no es volver al panel: es agregar la carga del secreto al flujo de despliegue, o reabrir el camino B de `BZ-49` con RLS verificado como condición previa.

### BZ-50 · Verificar que RLS esté activo en Supabase 🔴
Toda la seguridad de los datos descansa en las policies de RLS, no en el secreto de la anon key — que ya está en el repositorio vía `.env.example` y viaja al navegador por diseño. Nadie verificó todavía que RLS esté realmente habilitado en las tablas.

**Comprobar:** en Supabase → Authentication → Policies, que cada tabla de `supabase/schema.sql` tenga RLS activo y policies explícitas. Las tablas de lectura pública (`product`, `category`, `gallery_item`, `home_*`, `site_configuration`) necesitan policy de `SELECT` para el rol anónimo; las de escritura, **ninguna** para anónimo.

**Prueba rápida:** con la anon key, intentar un `INSERT` contra `product` desde fuera de la aplicación. Debe fallar. Si funciona, cualquiera con la clave puede escribir en el catálogo.

Deja de ser una obligación derivada de `BZ-49` —el camino B se descartó y la clave quedó como Secret—, pero sigue siendo lo más importante del lote de seguridad: el sitio ya está sirviendo datos a cualquiera que lo visite.

---

### BZ-46 · La anon key está cargada pero no llega al worker ⚫ *(absorbida por BZ-49)*
**Es lo único que falta.** Está cargada como *Secret* según el panel, pero el worker no la recibe: `/api/diagnostico` la reporta `"presente": false` mientras las otras dos llegan bien.

**Primer paso — no tocar nada todavía.** Esperar a que se despliegue `BZ-48` y abrir `/api/diagnostico`. El campo `clavesRecibidas` decide entre las dos causas posibles:

| Lo que muestra `clavesRecibidas` | Qué pasó | Qué hacer |
|---|---|---|
| Aparece algo como `BARZOL_SUPABASE_ANON_` o similar | El **nombre** quedó cortado o mal escrito al guardarlo | Corregir el nombre en el panel. El valor está bien |
| Sólo aparecen las dos URLs | El **secreto no se aplicó** al worker | Volver a crearlo y redesplegar |

La pista del propio endpoint ya lo dice en castellano; la tabla es para no tener que interpretarla.

**Si resulta ser el segundo caso**, la alternativa es cargarlo por línea de comandos, que evita por completo los recortes del panel:

```bash
npx wrangler login
npx wrangler secret put BARZOL_SUPABASE_ANON_KEY
```

**Recordatorio de por qué Secret y no Variable:** las variables de texto del panel se borran en cada `wrangler deploy`; los secretos no. Cargarla como *Variable* la haría desaparecer en el próximo push.

---

### BZ-46 (versión anterior) · Cargar la anon key como Secret
Las otras dos variables ya las establece el despliegue (`BZ-47`).

**Ruta:** Cloudflare → Workers & Pages → `barzol-web` → Settings → Variables and Secrets → **Add** → tipo **Secret** (no *Variable*).

| Campo | Valor |
|---|---|
| Nombre | `BARZOL_SUPABASE_ANON_KEY` |
| Tipo | **Secret** |
| Valor | la publishable key del proyecto de Supabase, en crudo |

**Que sea Secret y no Variable es el punto entero de la tarjeta.** La documentación de Cloudflare: *"Wrangler will not delete your secrets unless you run `wrangler secret delete`"*. Cargada como *Variable*, el próximo despliegue la borraría igual que las tres anteriores.

**Antes de guardar:** verificar que en la sección no queden las viejas `BARZOL_SUPABASE_URL` ni `BARZOL_R2_PUBLIC_URL` como variables del panel. Ya no hacen falta y tener el mismo nombre en dos sitios sólo genera confusión sobre cuál manda. Aprovechar para borrar también las `R2_*` residuales (`BZ-32`).

**Criterio de aceptación:** `/api/diagnostico` responde `"ok": true` con las tres variables en `"presente": true`, y **sigue respondiendo `ok: true` después del siguiente push**. Esa segunda parte es la que prueba que el problema quedó cerrado de raíz.

### BZ-34b · Cargar las tres variables en el panel ⚫ *(reemplazada por BZ-46 y BZ-47)*
**Es lo único que separa al sitio de estar funcionando.** Ya no queda nada de código en el camino: `keep_vars: true` está desplegado y verificado en el config que usa wrangler.

Estado actual según `/api/diagnostico` en producción: las **tres** variables ausentes, los cuatro bindings presentes.

**Ruta:** Cloudflare → Workers & Pages → `barzol-web` → Settings → **Variables and Secrets**.

| Variable | Tipo | Valor |
|---|---|---|
| `BARZOL_SUPABASE_URL` | Variable | `https://rnfcccnesxunjtpwahce.supabase.co` |
| `BARZOL_SUPABASE_ANON_KEY` | Variable | la publishable key del proyecto |
| `BARZOL_R2_PUBLIC_URL` | Variable | `https://pub-12c5101b37f34f829bbea3f12287ee9e.r2.dev` |

**Al pegar los valores:** en crudo, sin corchetes de markdown, sin comillas y sin barra final. Es el error que ya costó una sesión (`BZ-31`); ahora `readServerEnv()` lo detecta y lo nombra, pero mejor no llegar a eso.

Después: **redesplegar** —editar variables no redespliega solo— y abrir `/api/diagnostico`, que debe responder `"ok": true` con las tres en `"presente": true`.

**Por qué esta vez sí van a quedar:** `keep_vars` conserva lo que hay, no repone lo borrado. El despliegue anterior dejó el panel vacío y el siguiente preservó ese vacío fielmente. Cargándolas ahora, con `keep_vars` ya activo, sobreviven a los push siguientes — lo comprueba `BZ-45`.

**Bloquea:** BZ-24, BZ-25, BZ-45.

### BZ-45 · Verificar que `keep_vars` funciona de verdad 🔴
La corrección está desplegada pero **nunca se probó su efecto**, porque no había variables que conservar. Es una hipótesis bien fundada, no un hecho comprobado.

**Prueba, después de `BZ-34b`:**

1. `/api/diagnostico` → `"ok": true`.
2. Empujar cualquier commit trivial y esperar el despliegue.
3. `/api/diagnostico` de nuevo → debe seguir en `"ok": true`, y `build.commit` debe mostrar el commit nuevo.

El paso 3 es el que importa: si las variables vuelven a `"presente": false`, `keep_vars` no está surtiendo efecto con el config generado por el adaptador y hay que pasar al plan B — declarar en `wrangler.jsonc` las dos que son públicas (`BARZOL_SUPABASE_URL` y `BARZOL_R2_PUBLIC_URL`), que no tienen ningún reparo en estar versionadas.

### BZ-38 · Los despliegues no se están ejecutando ✅ *(cerrada — ver arriba)*
**Es el bloqueante de verdad, y hasta resolverlo `BZ-34` no puede completarse.** El worker corre código de hace dos commits, así que el `keep_vars: true` que evita el borrado de variables **todavía no llegó a producción**. Recargar variables sin esto es trabajo perdido: el siguiente despliegue las borra igual.

**Evidencia:** `/api/diagnostico` existe en `origin/main` (confirmado con `git cat-file -e origin/main:src/pages/api/diagnostico.ts`) y devuelve **404** en producción. `/500`, que llegó dos commits antes, sí responde.

**Hipótesis principal:** el repositorio se movió a **`Core-Tech-Group/barzol-web`**. GitHub redirige los `push` —por eso los commits sí llegan al remoto— pero la integración de Workers Builds puede haber quedado apuntando al repositorio anterior y dejado de dispararse.

**Cómo verificarlo, en orden:**

1. Cloudflare → Workers & Pages → `barzol-web` → **Deployments**: ¿hay despliegues después del `2026-08-12`? Si el último coincide con esa fecha, los push posteriores no dispararon nada.
2. Settings → **Builds**: comprobar a qué repositorio y rama está conectado. Si dice `gmarapiortiz/barzol-web`, reconectarlo a `Core-Tech-Group/barzol-web`.
3. Si hay despliegues pero fallaron, abrir el log del último — el problema sería otro y hay que traerlo.

**Salida de emergencia si la integración tarda en arreglarse:** desplegar a mano con `npx wrangler login && npx wrangler deploy`. Sirve para desbloquear, pero conviene arreglar la automatización: un despliegue manual no queda registrado en el historial del repositorio.

**Criterio de aceptación:** `/api/diagnostico` responde **200** en producción. Ese endpoint es exactamente la señal de que el código nuevo llegó.
**Bloquea:** BZ-34, y por lo tanto BZ-24 y BZ-25.

### BZ-39 · Actualizar el remoto git a `Core-Tech-Group` 🟠
`git remote -v` sigue apuntando a `https://github.com/gmarapiortiz/barzol-web.git`. Los push funcionan sólo por el redirect de GitHub, que no es permanente y muestra el aviso *"This repository moved"* en cada push.

```bash
git remote set-url origin https://github.com/Core-Tech-Group/barzol-web.git
```

Relacionado con `BZ-38`: si el remoto local quedó desactualizado, es probable que la integración de Cloudflare también.

### BZ-44 · Verificar qué commit corre en producción 🟠
Esta sesión perdió tiempo diagnosticando variables cuando el problema era que el código nuevo no estaba desplegado. **No hay forma de saber qué versión atiende las peticiones sin adivinar por rutas.**

Agregar a `/api/diagnostico` el SHA del commit y la fecha de build, inyectados como variable en tiempo de compilación (`astro.config.mjs` → `vite.define`, leyendo `CF_PAGES_COMMIT_SHA` o `WORKERS_CI_COMMIT_SHA`, que Cloudflare expone durante el build).

Con eso, la primera pregunta ante cualquier fallo —"¿estoy mirando el código que creo?"— se responde en una petición.

### BZ-34 · `wrangler deploy` borra las variables del panel 🔴
**Es lo único que separa al sitio de estar funcionando**, y explica por qué cargarlas a mano "no servía": servía, hasta el siguiente push.

Wrangler trata `wrangler.jsonc` como fuente de verdad al estilo terraform. Sin bloque `vars` ahí, cada `npx wrangler deploy` —lo que corre el pipeline de Cloudflare en cada push— elimina del worker todas las variables cargadas desde el panel.

**Ya corregido en el código:** `"keep_vars": true` en `wrangler.jsonc`.

**Falta la parte manual, en este orden — y el orden importa:**

1. **Primero resolver `BZ-38`**, o los pasos siguientes no sirven de nada: el `keep_vars` está en un commit que todavía no se desplegó, así que hoy cualquier despliegue sigue borrando las variables.
2. Cargar de nuevo `BARZOL_SUPABASE_URL` y `BARZOL_SUPABASE_ANON_KEY` en Cloudflare → Workers & Pages → `barzol-web` → Settings → **Variables and Secrets** (verificar que `BARZOL_R2_PUBLIC_URL` siga ahí).
3. Redesplegar. El `keep_vars` sólo protege a partir del despliegue que lo incluya, así que **este primer redespliegue es el que lo activa**.
4. Abrir `/api/diagnostico` y confirmar `"ok": true`.

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

### BZ-32 · Borrar las variables `R2_*` residuales del panel ✅ *(resuelta por el despliegue)*
`clavesRecibidas` confirma que el worker ya no las recibe: sólo llegan las dos declaradas en `wrangler.jsonc`. Al no estar en el archivo, el despliegue las eliminó — el mismo comportamiento que antes borraba las variables buenas, esta vez a favor. Queda pendiente sólo `BZ-07`, revocar el token.

Texto original de la tarjeta, como referencia:
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
/una-ruta-inventada     404 con la página propia (no la de Astro)
/api/diagnostico        200 con "ok": true
```

El caso del 404 ya se resolvió en `BZ-40`: producción servía el 404 por defecto de Astro y ahora hay una página propia. Falta confirmarlo en producción una vez que los despliegues vuelvan (`BZ-38`).

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

### BZ-43 · Caché de catálogo en Workers KV ⚪
Surge de descartar `BZ-41`: KV no sirve como base de datos, pero **sí como caché de lectura en el borde**. Hoy cada visita al catálogo va a Supabase, y el plan Free pausa el proyecto por inactividad — una caché ahorraría viajes y amortiguaría ese riesgo.

Candidatos naturales: el árbol de categorías del `Header` (cambia poquísimo y lo consulta *toda* página del sitio) y los listados de catálogo.

**No empezar por acá.** Requiere decidir invalidación —qué pasa cuando el admin edita una categoría— y la consistencia eventual de KV significa que el cambio puede tardar en verse en otras regiones. Se evalúa cuando el sitio esté estable y haya tráfico real que lo justifique.

---

## Mapa de dependencias

```
BZ-49 (anon key al worker) ✅ ─┬── BZ-52 (¿sobrevive al deploy?) ── BZ-24
                               └── BZ-25 (subida real a R2) ── también BZ-10
BZ-32 (borrar R2_* del panel) ─ BZ-07 (revocar token) ── misma visita, es seguridad
BZ-39 (remoto git) ──────────── independiente, 1 comando
BZ-14 (fuga de mensajes) ────── independiente, ya ocurrió en producción
BZ-35 (/api/diagnostico) ────── verifica BZ-46 ── se cierra con BZ-37
BZ-10 (subida en admin) ─────── BZ-11 (borrado) ── habilita BZ-28
BZ-27 (dominio sitio) ───────── BZ-19 (SEO)
BZ-28 (dominio bucket) ──────── hacer ANTES de cargar contenido real
BZ-43 (caché KV) ────────────── sólo con el sitio estable
```

**Orden sugerido:** BZ-52 → BZ-07 → BZ-50 → BZ-24 → BZ-39 → BZ-14 → BZ-37 → BZ-26 → BZ-10 → BZ-25 → BZ-28 → BZ-11 → BZ-27.

**Con el sitio en pie, lo urgente cambia de naturaleza.** `BZ-52` va primero porque es sólo mirar el diagnóstico después de este push. Enseguida `BZ-07`: el token de R2 quedó expuesto en una captura y sigue vivo — es lo único de la lista que empeora con el tiempo. Después `BZ-50`, porque el sitio ya sirve datos públicamente y nadie verificó todavía que RLS impida escribirlos.

**`BZ-32` se resolvió sola.** `clavesRecibidas` lo confirma: el worker sólo recibe `BARZOL_R2_PUBLIC_URL` y `BARZOL_SUPABASE_URL`. Las tres variables `R2_*` residuales ya no llegan — el despliegue las eliminó al no estar declaradas en `wrangler.jsonc`. Queda únicamente revocar el token en R2 (`BZ-07`).

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
