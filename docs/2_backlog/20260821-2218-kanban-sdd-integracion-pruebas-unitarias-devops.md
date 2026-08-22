# Scrumban — SDD, pruebas del sistema y DevOps

> **Creado:** 2026-08-21 · **Última actualización:** 2026-08-22 (2ª revisión) · **Rama:** `main`
> **Alcance:** integrar Spec-Driven Development, construir la infraestructura de
> pruebas sobre los runtimes reales, y cerrar el ciclo de despliegue con gates
> verificables.
> **Tablero hermano:** [`20260808-1727-kanban-avance-cloudflare-r2-vercel.md`](20260808-1727-kanban-avance-cloudflare-r2-vercel.md) — el del despliegue. Este continúa su numeración desde `BZ-53`.
> **Material base:** [`../1_inbox/SDD-TESTING-BARZOL-2026.md`](../1_inbox/SDD-TESTING-BARZOL-2026.md) · **Capa SDD:** [`.sdd/`](../../.sdd/README.md)

Las tareas no repiten el contenido de las specs: cada una enlaza la suya. Aquí va
la decisión, el riesgo y el orden; el detalle técnico vive en `.sdd/`.

---

## Estado — 2026-08-22, 2ª revisión

**Ya hay algo que comprueba el sitio.** Ayer no existía ni un test.

| Control | Ayer | Hoy |
| :--- | :--- | :--- |
| Tests | cero | **45** — 41 en Node, 4 en workerd real |
| Runners | ninguno | Vitest 4.1.11, dos configs |
| Typecheck | `tsc` en rojo | `astro check` + `tsc --noEmit` en verde |
| CI | ninguno | `.github/workflows/sdd-gate.yml` con 3 gates + humo |
| Trazabilidad | manual | `npm run sdd:trace`, con trinquete |
| Humo post-deploy | inexistente | `npm run smoke` — **7 sondas, ejecutado contra producción** |
| RLS | sin verificar | **sigue sin verificar** (`BZ-70`) |

**Lo que encontró el humo en su primera ejecución real** es la mejor defensa del
ejercicio: producción sirve **dos imágenes de producto rotas** (404 desde R2), y
nadie lo sabía. Está anotado como `BZ-76`. También confirmó que el worker corre
`8aa8e43`, el commit de ayer — la sonda de `BZ-38` funciona.

**La cobertura real de la Capa 1 es del 5,8%** frente al 95% que fija la
Constitución. El gate lo reporta y todavía no bloquea: es exactamente el dato que
`BZ-73` necesitaba para dejar de inventar umbrales.

---

## Correcciones al material base — segunda tanda

Ayer se corrigieron siete supuestos leyendo el repo. Hoy, al **ejecutar** las
cosas, caen tres más. Las tres eran afirmaciones del documento base que parecían
inocuas y costaron horas:

| # | El documento base dice | La realidad, verificada el 2026-08-22 |
| :-- | :--- | :--- |
| 8 | El módulo virtual es `cloudflare:workers` | Es **`cloudflare:test`**. Comprobado en los tipos de `@cloudflare/vitest-plugin@1.0.0` |
| 9 | `getViteConfig()` se usa tal cual para los componentes | **No funciona en este proyecto.** Carga `astro.config.mjs` entero, con `@astrojs/cloudflare` v14 dentro, que registra `@cloudflare/vite-plugin`; ese plugin arranca workerd sobre el entrypoint del servidor y muere con `ReferenceError: module is not defined`. Y falla al RESOLVER los proyectos, así que tumbaba la ejecución entera — incluida la Capa 1, sin un solo test de componente. Ver `BZ-60` |
| 10 | El guardia de determinismo va en `tests/setup.node.ts` parcheando `Date.now` | **Contraproducente.** Vitest usa `Date.now` internamente para temporizadores, reporteros y duración de cada test: romperlo durante la corrida produce fallos en sitios sin relación con el código bajo prueba. Se movió a un análisis estático en `scripts/sdd/determinismo.mjs`, que además no depende de que un test llegue a ejecutarse |

Lo que el documento base **sí acertó** y conviene reconocer: `cloudflareTest()`
existe y es la API correcta, `fetchMock` desapareció, y la advertencia sobre no
mockear bindings resultó ser el consejo más útil de todo el material — los cuatro
tests de Capa 3 usan R2 y KV reales y encontraron problemas de configuración que
un mock habría ocultado.

---

## Tablero

| ID | Tarea | Estado | Prio |
|---|---|---|---|
| BZ-53 | Estructura `.sdd/` + Constitución v2.1 + glosario | ✅ Hecho | 🔴 |
| BZ-54 | Specs retroactivas del dominio (SPEC-001/002/003) | ✅ Hecho | 🔴 |
| BZ-55 | Specs de plataforma (SPEC-900/901/902) | ✅ Hecho | 🔴 |
| BZ-56 | Capa Claude Code (CLAUDE.md, rules, comandos, verifier) | 🔶 Escrita, hooks sin activar | 🟠 |
| BZ-57 | Instalar Vitest 4 con los proyectos por runtime | ✅ Hecho | 🔴 |
| BZ-58 | Andamiaje de `tests/`: setups, fakes, fixtures | ✅ Hecho | 🔴 |
| BZ-59 | Capa 3 en workerd con bindings reales de Miniflare | 🔶 Infra lista, faltan endpoints | 🔴 |
| BZ-60 | Capa 2: componentes `.astro` con Container API | ⬜ Bloqueada por `getViteConfig()` | 🟠 |
| BZ-61 | `slugify()` duplicado en dos mappers | ✅ Hecho | 🟠 |
| BZ-62 | `buildMediaKey` no es determinista | ✅ Hecho | 🟠 |
| BZ-63 | Decisión: ¿migrar los precios a céntimos enteros? | ⬜ Pendiente (decisión) | 🟡 |
| BZ-64 | Verificar por qué funciona sin `nodejs_compat` | ✅ Hecho | 🟠 |
| BZ-65 | Crear `.github/workflows/sdd-gate.yml` | ✅ Hecho, sin ejecutar aún | 🔴 |
| BZ-66 | `scripts/sdd-trace.mjs` — gate de trazabilidad | ✅ Hecho | 🟠 |
| BZ-67 | `scripts/smoke.mjs` — humo post-despliegue | ✅ Hecho y ejecutado | 🔴 |
| BZ-68 | Decisión: ¿quién despliega, Actions o Workers Builds? | ⬜ Pendiente (decisión) | 🔴 |
| BZ-69 | Ensayar el rollback antes de necesitarlo | ⬜ Pendiente | 🟠 |
| BZ-70 | pgTAP para RLS — implementa SPEC-902 | ⬜ Pendiente | 🔴 |
| BZ-71 | Secretos de CI y de Supabase local | ⬜ Pendiente | 🟠 |
| BZ-72 | Proteger `/api/diagnostico` para usarlo como sonda | ⬜ Pendiente | 🔴 |
| BZ-73 | Fijar los umbrales de cobertura con datos reales | ⬜ Pendiente, **ya hay datos** | 🟡 |
| BZ-74 | Evaluación: E2E con Playwright | ⬜ Pendiente | ⚪ |
| BZ-75 | Especificar los mappers y bajar la deuda del baseline | ⬜ Pendiente | 🟠 |
| BZ-76 | **Dos imágenes de producto dan 404 en producción** | ⬜ Pendiente | 🔴 |
| BZ-77 | Imágenes en base64 incrustadas en el HTML | ⬜ Pendiente | 🟡 |

**Progreso:** 11 de 25 hechas, 2 parciales.

| Prioridad | Significado |
|---|---|
| 🔴 P0 | Bloquea el resto de la cadena o hay riesgo de seguridad |
| 🟠 P1 | Necesario para que los gates sirvan de verdad |
| 🟡 P2 | Deuda con impacto real, sin urgencia |
| ⚪ P3 | Evaluación o mejora |

---

## ✅ Cerradas en esta sesión (2026-08-22)

### BZ-64 · Por qué funciona sin `nodejs_compat` ✅ 🟠

**Ninguna de las tres hipótesis era la correcta.** La respuesta salió de
`npx wrangler deploy --dry-run` y del artefacto que genera el build:

1. **El adaptador NO inyecta el flag.** `dist/server/wrangler.json` —la config que
   wrangler usa de verdad, redirigida desde la raíz— declara
   `compatibility_flags: ["global_fetch_strictly_public"]` y nada más.
2. **`@supabase/supabase-js` no toca builtins de Node** en este bundle. Cero
   referencias `node:*` provenientes de él.
3. **Hay exactamente una referencia a `node:` en todo el bundle**, y es de
   `@astrojs/react`: un `import("node:stream")` **dinámico** dentro de
   `renderToPipeableStreamAsync`, para obtener `Writable`.

Esa rama nunca se ejecuta. El código elige así:

```js
if (experimentalDisableStreaming)          renderToString(...)
else if ('renderToReadableStream' in serverEdge) renderToReadableStreamAsync(...)  // ← siempre
else                                        renderToPipeableStreamAsync(...)       // ← node:stream
```

`react-dom/server.edge` **sí** exporta `renderToReadableStream`, así que gana la
segunda rama y el `import` dinámico jamás se evalúa. Por eso el sitio funciona.

**Decisión: no se añade el flag.** Sería el "por si acaso" que prohíbe la Regla 2.5.

**Pero queda un cable trampa, y conviene tenerlo escrito:** si una versión futura
de React retirara `renderToReadableStream` de `server.edge`, o si alguien activara
`experimentalDisableStreaming`, esa rama se volvería alcanzable y **cada render de
isla React devolvería 500**. El humo (`TEST-S01`) lo detectaría el mismo día.

De paso, el `--dry-run` confirmó los cuatro bindings de producción:
`SESSION` (KV), `MEDIA` (R2), `IMAGES` (Images) y `ASSETS`.

### BZ-57 · Vitest 4 instalado ✅ 🔴

`vitest@4.1.11`, `@cloudflare/vitest-plugin@1.0.0`, ambos providers de cobertura.
**No** se instalaron `happy-dom` ni `msw`: solo hacen falta para la Capa 2, que
quedó bloqueada (`BZ-60`), y el propio plan preveía aplazarlos.

Dos archivos de configuración en vez de uno con tres proyectos:

| Archivo | Capa | Cobertura |
| :--- | :--- | :--- |
| `vitest.config.ts` | 1 · lógica pura | v8 |
| `vitest.workers.config.ts` | 3 · workerd | **istanbul** |

La separación no es estética. Vitest aplica un único provider por ejecución, y la
Capa 3 necesita istanbul porque `@vitest/coverage-v8` depende de `node:inspector`
y workerd solo expone un stub. Además, tenerlos juntos hacía que el plugin de una
capa tumbara la ejecución de la otra.

**Efecto colateral: `tsc --noEmit` nunca se había ejecutado en este repo.** Al
montarlo salieron ocho errores que `astro check` no ve:

- `baseUrl` deprecado — es **`BZ-15`** del tablero hermano, cerrada de paso. Se
  quitó y los `paths` pasaron a ser relativos (`./src/*`).
- Seis usos de `window.__adminHasUnsavedChanges` sin tipo, en cuatro paneles del
  admin. La declaración existía, pero **solo dentro del `<script>` de
  `AdminLayout.astro`**, invisible para los `.tsx`. Se subió a `src/env.d.ts`.

### BZ-58 · Andamiaje de `tests/` ✅ 🔴

`tests/{unit,workers,fixtures}` con sus setups. Dos decisiones que se apartan del
plan y conviene justificar:

**El guardia de determinismo no va en `setup.node.ts`.** Parchear `Date.now`
durante toda la corrida rompe Vitest por dentro. Se movió a
`scripts/sdd/determinismo.mjs`, un análisis estático que corre en el gate. Es más
barato, no tiene efectos colaterales y —a diferencia del parche— detecta el
problema aunque nadie escriba el test.

**`tests/fixtures/slugify-legacy.ts` es una copia congelada** de la implementación
anterior, y existe solo para demostrar que `BZ-61` no cambió ni una URL.

### BZ-59 · Capa 3 con bindings reales 🔶 🔴

**La infraestructura funciona:** 4 tests corriendo dentro de workerd, con R2 y KV
de verdad. Ida y vuelta real sobre `env.MEDIA`, `env.SESSION` como KV, y las
variables públicas presentes.

Constitución 5.1 respetada: no hay un solo mock. El test escribe en el bucket que
levanta Miniflare y lee lo que quedó.

**Queda pendiente lo que da valor de negocio:** ningún endpoint de
`src/pages/api/**` está cubierto todavía. El primero debería ser
`GET /api/productos`, que ejercita Supabase, el mapper y la respuesta a la vez.
Por eso la tarea queda en 🔶 y no en ✅.

Detalle que costó encontrar: **no se usa `wrangler: { configPath }`**. Arrastra el
`main` de la app (`@astrojs/cloudflare/entrypoints/server`), un entrypoint que
solo tiene forma utilizable después de `astro build`. Los bindings se declaran
directamente en la config de Miniflare.

### BZ-61 · `slugify()` unificado ✅ 🟠

**Primero se ejecutó TEST-322**, como exigía el plan: las dos copias eran
**idénticas carácter por carácter**. Eso confirmó que era una extracción y no un
bug vivo, que era justo lo que había que averiguar antes de tocar nada.

Ahora vive en `src/shared/lib/text/slugify.ts`. 16 tests, incluida la comparación
contra la copia congelada sobre todo el corpus de nombres reales del catálogo.

La variante de `mediaKey.ts` **no se tocó**: comparte forma pero no contrato.

**El gate encontró un hueco que el plan daba por cubierto.** `REQ-301` dice *dónde*
debe vivir la función, no qué devuelve, y el PLAN lo daba por verificado "por el
gate de trazabilidad". El gate respondió que no: él comprueba que un REQ esté
citado en algún test, no el REQ en sí. Se añadió
`tests/unit/text/slugify-unico.test.ts`, que lee los dos mappers y comprueba que
importan la función común y no declaran la suya.

### BZ-62 · `buildMediaKey` determinista ✅ 🟠

`REQ-208` implementado: `ahora` y `nuevoId` inyectables, con valores por defecto.

El ciclo RED funcionó como debía — de 38 tests, fallaron **exactamente los 4** de
`REQ-208`, y los otros 34 pasaron a la primera. Eso confirmó que la spec
retroactiva describía bien el comportamiento existente antes de cambiarlo.

`TEST-123` es el que protege contra la regresión: verifica que la firma de dos
argumentos sigue funcionando. `TEST-122` es el que justifica el ejercicio —
comprueba que se archiva por UTC y no por hora local, que en `UTC-5` es la
diferencia entre `2026/01` y `2025/12`.

Las dos llamadas por defecto llevan marcador explícito
`// sdd:determinismo-ok REQ-208`, que el gate exige con un motivo escrito.

### BZ-66 · Gate de trazabilidad ✅ 🟠

`npm run sdd:trace`, sin dependencias externas, repartido en cuatro módulos bajo
`scripts/sdd/`.

Comprueba cuatro cosas: REQ sin test, archivos sin SPEC, determinismo estático y
cobertura por capa. Las dos trampas del patrón están cubiertas —buscar los REQ
solo en `tests/`, y fallar si no hay specs o no hay tests— pero hubo que resolver
un tercer problema que el plan no anticipaba:

**Un gate que nace en rojo se ignora igual que uno que nunca falla.** Con 23
archivos heredados sin SPEC, exigirlo todo desde el día uno habría dejado el gate
permanentemente rojo. Dos mecanismos lo evitan sin diluirlo:

- **Trinquete** (`.sdd/baseline.json`): la deuda existente queda registrada y el
  gate solo falla con archivos **nuevos**. La lista puede encoger, nunca crecer.
- **Solo las SPEC `APROBADA` bloquean.** Una spec en borrador describe algo aún no
  implementado; sus REQ se reportan como informativos. `SPEC-002` y `SPEC-003`
  pasaron a APROBADA al quedar implementadas y verdes.

El determinismo estático destapó dos cosas: `categoriaService.ts` usa `Date.now()`
para el TTL de su caché —legítimo, es un orquestador, y la Regla 1.3 lo excluye—,
y el checker se acusaba a sí mismo al leer su propio JSDoc, que ahora ignora.

### BZ-65 · Workflow de CI ✅ 🔴

`.github/workflows/sdd-gate.yml`. Node fijado en `22.12.0`, `npm ci`,
`concurrency` con cancelación, cobertura conservada como artefacto.

Sigue la **opción B** de `BZ-68`: Workers Builds sigue desplegando y Actions solo
verifica. Riesgo cero sobre el despliegue actual.

**El gate 3 (RLS) no está, y su ausencia es deliberada.** Un job que ejecuta
`supabase test db` sin ningún archivo en `supabase/tests/` termina en verde sin
haber verificado nada, y a partir de ahí todo el mundo cree que RLS está
comprobado. Es el fallo por vacuidad que `SPEC-900` INV-3 prohíbe. Entra con
`BZ-70`.

**Sin ejecutar todavía:** el workflow no ha corrido ni una vez. La matriz de
catorce provocaciones de `SPEC-900.plan.md` sigue pendiente, y hasta ejecutarla
esto es un gate esperado, no verificado.

### BZ-67 · Humo post-despliegue ✅ 🔴 — **cierra `BZ-24`**

Siete sondas de solo lectura. Sin dependencias externas: `fetch` nativo y nada más.

**Ejecutado contra producción, que es la única forma de saber si estaba bien
escrito.** Resultado: 6 de 7 en verde, y la que falló destapó un defecto real
(`BZ-76`).

Dos sondas se reescribieron porque la primera versión estaba mal:

- `TEST-S02` (catálogo) **descubre el slug desde la portada** en vez de fijarlo.
  Un slug fijo se rompe en cuanto alguien renombra una categoría — y el slug se
  recalcula desde el nombre, así que pasa más de lo que parece.
- `TEST-S07` (imagen) intentaba leer el dominio de R2 del diagnóstico. No
  funciona, y **está bien que no funcione**: el diagnóstico publica los *nombres*
  de las variables que recibe, no sus valores. Ahora la busca en la portada.

**`TEST-S06` confirmó que producción sirve `8aa8e43`**, el commit de ayer. La
sonda que `BZ-38` habría necesitado ya está en pie.

---

## 🔴 Hallazgos nuevos

### BZ-76 · Dos imágenes de producto dan 404 en producción 🔴

Encontrado por el humo en su primera ejecución. De 5 URLs de R2 referenciadas
entre la portada y el catálogo, **3 responden 200 y 2 responden 404** — con `GET`
y con `HEAD`.

No son metadatos muertos: son `<img src="...">` de fichas de producto reales, una
de ellas *Soporte de Celular Tuba*. **El visitante ve la imagen rota.**

Las dos claves rotas terminan en el mismo nombre de origen
(`...-whatsapp-image-2026-07-10-at-6-17-07-pm.webp`) con UUID distinto, lo que
apunta a un producto concreto cuyas fotos están referenciadas en la base de datos
pero no existen en el bucket.

**Hipótesis a descartar, sin verificar todavía:** una subida que falló a mitad y
dejó la fila escrita sin el objeto; o un borrado en R2 sin limpiar la referencia
—que es justo lo que `BZ-11` (borrado de multimedia y huérfanos) previene y sigue
abierta en el tablero hermano.

Primer paso: `npx wrangler r2 object get` sobre las dos claves para confirmar que
faltan en el bucket y no es un problema de acceso público.

### BZ-77 · Imágenes en base64 incrustadas en el HTML 🟡

La portada trae al menos dos `data:image/jpeg;base64,...` de **más de 60 KB cada
uno** dentro del propio HTML.

Eso infla el documento, no se puede cachear por separado y bloquea el primer
render. Observado, **no medido**: antes de tocar nada hay que ver el peso total de
la portada y si son los LCP o decoración.

Puede ser deliberado —placeholders difuminados mientras carga la imagen real, algo
que encaja con el `data-state="loading"` que se ve en el marcado—, en cuyo caso lo
que sobra es el tamaño, no la técnica.

---

## Pendientes

### BZ-60 · Componentes `.astro` — bloqueada 🟠

`getViteConfig()` no sirve tal cual acá (corrección #9). Antes de escribir un solo
test de componente hay que resolver **cómo obtener la config de Astro sin activar
el plugin de Vite del adaptador de Cloudflare**. Probablemente pasando una config
inline sin adaptador.

Sigue siendo aplazable: la Container API es experimental y no ejecuta hidratación,
así que su valor por hora invertida es el más bajo del tablero.

### BZ-63 · Decisión: ¿precios en céntimos? 🟡

Sin cambios. **Recomendación: no migrar por ahora.** La Constitución 3.2 ya cubre
el caso intermedio y elimina el riesgo real sin tocar la base de datos.

### BZ-68 · Decisión: ¿quién despliega? 🔴

Sin cambios, pero ahora hay un argumento nuevo a favor de mantener la opción B un
tiempo: el workflow **nunca ha corrido**. Pasar a que Actions despliegue antes de
verlo funcionar sería cambiar un desplegador que funciona por uno sin estrenar.

### BZ-69 · Ensayar el rollback 🟠

Sin cambios. Media hora, un día laborable, antes de necesitarlo.

### BZ-70 · pgTAP para RLS 🔴 — **la más urgente**

Sin avances. **Es la única P0 que no ha cambiado de estado en toda la semana**, y
sigue siendo el mayor riesgo abierto: el catálogo sirve datos públicamente y nadie
ha comprobado que RLS impida escribirlos. No depende de nada de lo construido hoy.

### BZ-71 · Secretos de CI 🟠

Ahora tiene un secreto concreto que configurar: `BARZOL_DIAGNOSTICO_TOKEN`, que el
workflow ya pasa al humo. Mientras `BZ-72` no exista, el humo funciona igual sin
él.

### BZ-72 · Proteger `/api/diagnostico` 🔴

Sin cambios, y **ya no bloquea a `BZ-67`**: el humo se escribió para funcionar con
token o sin él. Sigue siendo P0 por la fuga de configuración.

### BZ-73 · Fijar los umbrales 🟡 — ya hay datos

Primera medición real: **Capa 1 al 5,8 % de líneas y 5,9 % de ramas**, frente al
95/90 de la Constitución. La Capa 3 aún no mide nada porque no hay tests de
endpoint.

El 5,8 % no es un fracaso: es lo que cabe esperar cuando tres archivos de treinta
tienen tests. Lo que **no** hay que hacer es bajar el umbral para que el número
quede bonito. La secuencia correcta es `BZ-75` → subir cobertura → fijar umbral.

### BZ-74 · E2E con Playwright ⚪

Sin cambios. No empezar por acá.

### BZ-75 · Especificar los mappers y bajar el baseline 🟠

Ahora tiene una métrica: **23 archivos** en `.sdd/baseline.json`. Cada uno que se
especifique sale de la lista, y el gate avisa cuando eso pasa para poder podarla.

Empezar por `productoMapper.ts` y `categoriaMapper.ts`, que son los que más
decisiones sutiles concentran y de los que depende toda la navegación.

### BZ-56 · Activar los hooks 🟠

Ahora **sí** existen `npm run typecheck` y `npm test`, así que `gate-on-stop.sh`
ya es viable. `guard-no-src-without-spec.sh` todavía no: con specs cubriendo tres
archivos, bloquearía casi todo. Reevaluar cuando `BZ-75` avance.

---

## Cerradas en la sesión anterior (2026-08-21)

`BZ-53` estructura `.sdd/` con la Constitución v2.1 · `BZ-54` specs retroactivas
del dominio (SPEC-001/002/003) · `BZ-55` specs de plataforma (SPEC-900/901/902) ·
`BZ-56` capa Claude Code (parcial: hooks escritos, sin activar).

Detalle completo en el historial de git y en [`.sdd/README.md`](../../.sdd/README.md).

---

## Mapa de dependencias

```
BZ-53/54/55 (specs) ✅ ── BZ-57 (Vitest) ✅ ── BZ-58 (andamiaje) ✅
                                             ├── BZ-61 (slugify)  ✅
                                             ├── BZ-62 (mediaKey) ✅
                                             ├── BZ-59 (workerd)  🔶 faltan endpoints
                                             └── BZ-60 (componentes) ⬜ bloqueada

BZ-66 (trazabilidad) ✅ ── BZ-75 (specs de mappers) ── BZ-73 (umbrales)
BZ-67 (humo) ✅ ────────── BZ-76 (imágenes rotas) 🔴 ← lo encontró el humo
BZ-65 (workflow) ✅ ────── sin ejecutar · matriz de SPEC-900.plan.md pendiente
BZ-70 (pgTAP) ─────────── cierra BZ-50 · NO depende de nada de lo hecho hoy
BZ-72 (diagnóstico) ───── independiente · ya no bloquea el humo
BZ-68 (¿desplegador?) ─── esperar a ver el workflow correr
BZ-69 (rollback) ──────── independiente, ~30 min
```

**Orden sugerido para la próxima sesión:**
`BZ-76` → `BZ-70` → `BZ-72` → `BZ-59` (endpoints) → `BZ-75` → `BZ-69` → `BZ-73` →
`BZ-60` → `BZ-68` → `BZ-71` → `BZ-56` → `BZ-63` → `BZ-77` → `BZ-74`.

**Por qué.** `BZ-76` primero porque es un defecto visible para el visitante y ya
está diagnosticado a medias. Después `BZ-70`: lleva dos semanas siendo la P0 más
antigua y no depende de nada. `BZ-72` cierra la fuga del diagnóstico. Recién
entonces vuelve el tooling — y `BZ-59` antes que el resto, porque cubrir un
endpoint real es lo que convierte la infraestructura de Capa 3 en valor.

---

## Riesgos

**El fracaso característico de SDD es adoptarlo como decoración.** Tres señales:
las SPECs se escriben *después* del código para pasar el gate; algún gate se
desactiva "solo esta vez" y no vuelve; la cobertura sube mientras los tests no
verifican nada.

**Hoy apareció el riesgo inverso, y conviene nombrarlo:** el gate nació con dos
mecanismos de tolerancia —el trinquete del baseline y la exención de las specs en
borrador—. Los dos están justificados y los dos son la puerta por la que se cuela
la decoración. La salvaguarda es que el baseline **solo puede encoger**, y que
aprobar una spec sea un acto explícito. Si dentro de un mes el baseline sigue en
23 y no hay más specs aprobadas, el proceso se habrá convertido en un adorno,
por más verde que salga el gate.

**Lo que hoy demuestra que va bien:** el humo encontró un fallo real de producción
en su primera ejecución, y el gate de trazabilidad encontró un hueco en un plan
que yo mismo había escrito. Ninguna de las dos cosas la habría encontrado una
persona mirando la web.
