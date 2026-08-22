# Scrumban — SDD, pruebas del sistema y DevOps

> **Creado:** 2026-08-21 · **Rama:** `main`
> **Alcance:** integrar Spec-Driven Development en el repositorio, construir la
> infraestructura de pruebas sobre los tres runtimes reales, y cerrar el ciclo de
> despliegue con gates verificables.
> **Tablero hermano:** [`20260808-1727-kanban-avance-cloudflare-r2-vercel.md`](20260808-1727-kanban-avance-cloudflare-r2-vercel.md) — el del despliegue. Este continúa su numeración desde `BZ-53`.
> **Material base:** [`../1_inbox/SDD-TESTING-BARZOL-2026.md`](../1_inbox/SDD-TESTING-BARZOL-2026.md)
> **Capa creada:** [`.sdd/`](../../.sdd/README.md)

Las tareas de este tablero **no repiten** el contenido de las specs: cada una enlaza
la suya. Aquí va la decisión, el riesgo y el orden; el detalle técnico vive en
`.sdd/`.

---

## Estado — 2026-08-21, apertura

**El sitio está en pie y no hay absolutamente nada que lo compruebe.**

| Control | Estado real |
| :--- | :--- |
| Tests | **cero**. No existe `tests/`, ni `vitest`, ni runner en `package.json` |
| CI | **ninguno**. No existe `.github/workflows/` |
| Despliegue | Cloudflare Workers Builds, automático al hacer push a `main` |
| Verificación post-deploy | manual, y solo si alguien se acuerda de mirar |
| Rollback | nunca ensayado |
| RLS | documentado como implementado, **nunca verificado** (`BZ-50`, P0 desde el 2026-08-08) |

Traducido: cualquier commit que compile llega a producción. El tablero hermano
documenta lo que eso ya costó — `BZ-04` describe un bundle que compilaba
perfectamente y habría fallado en cada request. Un `astro build` verde no dice nada
sobre eso.

**Lo hecho hoy** no toca código de producción: la capa `.sdd/` completa, seis specs
con sus planes y la capa de agentes. Cero archivos de `src/` modificados, cero riesgo
de regresión. **Lo que falta** empieza en `BZ-57` y sí toca `package.json`: de ahí en
adelante, una tarea por commit verificando `npm run build` en cada uno.

---

## Correcciones al material base

`SDD-TESTING-BARZOL-2026.md` se escribió sin acceso al repositorio; su §13 lo declara
honestamente. Verificado contra el código, **siete cosas cambian**. La tabla completa
—asunción, realidad e impacto— está en [`.sdd/CONSTITUTION.md`](../../.sdd/CONSTITUTION.md)
§0 y no se repite aquí. Las tres que más afectan a este tablero:

- La lógica vive en **`src/shared/lib/**`**, no en `src/lib/**`. Cambia las rutas de
  todas las reglas, hooks y gates.
- El binding de R2 es **`MEDIA`**, y hay **cuatro** bindings en total —`SESSION` e
  `IMAGES` los inyecta el adaptador y no aparecen en `wrangler.jsonc`—. Los tests del
  material base sembraban el bucket equivocado en un entorno incompleto.
- Los precios son **`numeric`**, no céntimos enteros. La regla de dinero se parte en
  dos (`BZ-63`).

Y la incógnita del material base queda resuelta: `@cloudflare/vitest-plugin` **existe
y está en v1.0.0** — comprobado contra el registry el 2026-08-21, junto a
`vitest@4.1.11` y `@vitest/coverage-istanbul@4.1.11`.

---

## Tablero

| ID | Tarea | Estado | Prio |
|---|---|---|---|
| BZ-53 | Estructura `.sdd/` + Constitución v2.1 + glosario | ✅ Hecho | 🔴 |
| BZ-54 | Specs retroactivas del dominio (SPEC-001/002/003) | ✅ Hecho | 🔴 |
| BZ-55 | Specs de plataforma (SPEC-900/901/902) | ✅ Hecho | 🔴 |
| BZ-56 | Capa Claude Code (CLAUDE.md, rules, comandos, verifier) | 🔶 Escrita, hooks sin activar | 🟠 |
| BZ-57 | Instalar Vitest 4 con los tres proyectos | ⬜ Pendiente | 🔴 |
| BZ-58 | Andamiaje de `tests/`: setups, fakes, fixtures | ⬜ Pendiente | 🔴 |
| BZ-59 | Capa 3 en workerd con bindings reales de Miniflare | ⬜ Pendiente | 🔴 |
| BZ-60 | Capa 2: componentes `.astro` con Container API | ⬜ Pendiente | 🟠 |
| BZ-61 | `slugify()` duplicado en dos mappers | ⬜ Pendiente | 🟠 |
| BZ-62 | `buildMediaKey` no es determinista | ⬜ Pendiente | 🟠 |
| BZ-63 | Decisión: ¿migrar los precios a céntimos enteros? | ⬜ Pendiente | 🟡 |
| BZ-64 | Verificar por qué funciona sin `nodejs_compat` | ⬜ Pendiente | 🟠 |
| BZ-65 | Crear `.github/workflows/sdd-gate.yml` | ⬜ Pendiente | 🔴 |
| BZ-66 | `scripts/sdd-trace.mjs` — gate de trazabilidad | ⬜ Pendiente | 🟠 |
| BZ-67 | `scripts/smoke.mjs` — humo post-despliegue | ⬜ Pendiente | 🔴 |
| BZ-68 | Decisión: ¿quién despliega, Actions o Workers Builds? | ⬜ Pendiente | 🔴 |
| BZ-69 | Ensayar el rollback antes de necesitarlo | ⬜ Pendiente | 🟠 |
| BZ-70 | pgTAP para RLS — implementa SPEC-902 | ⬜ Pendiente | 🔴 |
| BZ-71 | Secretos de CI y de Supabase local | ⬜ Pendiente | 🟠 |
| BZ-72 | Proteger `/api/diagnostico` para usarlo como sonda | ⬜ Pendiente | 🔴 |
| BZ-73 | Medir los umbrales de cobertura antes de fijarlos | ⬜ Pendiente | 🟡 |
| BZ-74 | Evaluación: E2E con Playwright | ⬜ Pendiente | ⚪ |
| BZ-75 | Especificar los dos mappers | ⬜ Pendiente | 🟠 |

**Progreso:** 3 de 23 hechas, 1 parcial.

| Prioridad | Significado |
|---|---|
| 🔴 P0 | Bloquea el resto de la cadena o hay riesgo de seguridad |
| 🟠 P1 | Necesario para que los gates sirvan de verdad |
| 🟡 P2 | Deuda con impacto real, sin urgencia |
| ⚪ P3 | Evaluación o mejora |

---

## ✅ Cerradas en esta sesión (2026-08-21)

### BZ-53 · Estructura `.sdd/` + Constitución v2.1 ✅ 🔴

Creada con `README.md`, `CONSTITUTION.md`, `GLOSSARY.md`, `TRACEABILITY.md`,
`templates/` y `devops/RUNBOOK-GATES.md`.

La Constitución es la v2.0 del material base con las siete correcciones de arriba y
tres cambios de fondo: la **Regla 3 se parte en dos** —céntimos en la lógica pura,
conversión en el mapper, y la migración de `price numeric` decidida aparte
(`BZ-63`)—; la **Regla 9 es nueva** —tamaño y duplicación, con los dos
incumplimientos ya registrados (`BZ-61`, `BZ-62`)—; y la **8.6 también** —ningún
cambio de `compatibility_date` o `compatibility_flags` sin una línea en el kanban,
porque los tres despliegues que tumbaron el sitio (`BZ-34`, `BZ-46`) fueron cambios
de configuración, no de código.

El glosario fija el vocabulario que ya causa confusión: `code` **no es** el slug; el
slug no se persiste y se recalcula en cada lectura; *tudel* es una dimensión de
producto, no un producto.

### BZ-54 · Specs retroactivas del dominio ✅ 🔴

| SPEC | Unidad | Estado del código |
| :--- | :--- | :--- |
| [SPEC-001](../../.sdd/specs/SPEC-001-precio-catalogo.md) · Precio de catálogo | `pricing/catalogPrice.ts` | ⬜ no existe — el cálculo está disperso en las plantillas `.astro` |
| [SPEC-002](../../.sdd/specs/SPEC-002-media-key-r2.md) · Claves de R2 | `storage/mediaKey.ts` | ✅ existe, sin tests |
| [SPEC-003](../../.sdd/specs/SPEC-003-slug-publico.md) · Slug público | `text/slugify.ts` | 🔶 existe **duplicado** en dos mappers |

Especificar primero y corregir después es deliberado: da un test de regresión antes
de tocar código que ya funciona. `SPEC-002` documenta a propósito su propio
incumplimiento de la Regla 6.1; `SPEC-003` exige **equivalencia estricta** con las
copias actuales, porque el slug es la URL pública y no se persiste.

`SPEC-001` añade un requisito que el material base no tenía (`REQ-007`): mientras la
base de datos guarde `numeric`, alguien puede escribir `160.005` desde el panel.
Redondear en silencio es cómo se pierde un céntimo por venta durante un año sin que
nadie lo note.

### BZ-55 · Specs de plataforma ✅ 🔴

La parte que el material base **no cubría en absoluto** y que es la razón de este
tablero: SDD aplicado a DevOps y pruebas del sistema, no solo a lógica.

| SPEC | Qué especifica | Cierra |
| :--- | :--- | :--- |
| [SPEC-900](../../.sdd/specs/SPEC-900-gates-cicd.md) · Gates de CI/CD | Los cuatro gates y qué atrapa cada uno | — |
| [SPEC-901](../../.sdd/specs/SPEC-901-smoke-produccion.md) · Humo post-deploy | Siete sondas contra la URL real, solo lectura | `BZ-24`, `BZ-52` |
| [SPEC-902](../../.sdd/specs/SPEC-902-rls-supabase.md) · Políticas RLS | Lectura pública, borradores ocultos, escalada de privilegios | `BZ-50` |

Sus planes tienen una particularidad: **un gate no se prueba con tests, se prueba
provocando el fallo que debe detectar**. `SPEC-900.plan.md` es una matriz de catorce
commits deliberadamente rotos con su resultado esperado — un gate que nunca ha fallado
no está verificado, está esperado. Dos requisitos que suelen faltar y aquí sí están:
**`SPEC-900` INV-3** —el gate de trazabilidad falla si no hay specs ni `tests/`, porque
el modo de fallo característico del patrón es aprobar por vacuidad— y **`SPEC-901`
REQ-956** —el humo compara el commit desplegado con el que informa
`/api/diagnostico`, el fallo silencioso de `BZ-38`.

### BZ-56 · Capa Claude Code 🔶 🟠

**Escrita y activa** — `CLAUDE.md` en la raíz, `.claude/rules/` (sdd, devops, money),
`.claude/commands/` (`/sdd-spec`, `/sdd-red`, `/sdd-green`, `/sdd-verify`) y el
subagente `verifier` en Opus 5 **sin permisos de escritura**. Que no pueda escribir es
lo que hace que funcione: un auditor capaz de arreglar lo que encuentra acaba
arreglando en vez de reportar, y el hallazgo se pierde.

**Sin activar** — los dos hooks de `.claude/hooks/`, escritos y documentados pero **no
conectados** a `settings.json`: `guard-no-src-without-spec.sh` bloquearía casi todo el
trabajo del repo (las specs cubren tres archivos hoy) y `gate-on-stop.sh` exige
scripts npm que aún no existen. Queda como decisión humana; instrucciones en
`.claude/hooks/README.md`. Ojo con Windows: son scripts `sh` y necesitan Git Bash y
`jq` en el `PATH`.

---

## 🔴 Infraestructura de pruebas — camino crítico

> A partir de aquí se toca `package.json`. **Una tarea por commit.**

### BZ-57 · Instalar Vitest 4 con los tres proyectos 🔴

Dependencias verificadas hoy: `vitest@^4.1.11`, `@vitest/coverage-v8@^4.1.11`,
`@vitest/coverage-istanbul@^4.1.11`, `@cloudflare/vitest-plugin@^1.0.0`,
`happy-dom@^20`, `msw@^2.15`.

`vitest.config.ts` con `test.projects` — **no** `vitest.workspace.ts`, obsoleto en
Vitest 4. Tres proyectos (`unit` en Node/v8, `components` con Container API/v8,
`workers` en workerd real con **istanbul**) porque el código corre en tres runtimes y
un solo entorno da falsos verdes. Umbrales y alcance de cada uno: Constitución 7.1.

**El error a evitar:** `getViteConfig()` ya devuelve una config completa que incluye
su propia clave `test`. Hacer spread y sobrescribir `test` pierde lo que Astro
inyecta ahí — resolución de `.astro`, aliases, plugins de contenido. La config de
test se pasa **como argumento** a `getViteConfig`, no se fusiona después. El material
base se equivoca en esto y su §1.2 lo explica.

**Cierre:** `npm test` en verde con un test trivial por proyecto, y `npm run build`
igual que antes. **Riesgo:** si `npm ci` se alarga o aparecen conflictos de peer deps
por `happy-dom` y `msw`, instalar solo `vitest` + el plugin de Cloudflare y aplazar
esos dos hasta `BZ-60`.

### BZ-58 · Andamiaje de `tests/` 🔴

`tests/{unit,components,workers,fakes,fixtures}` + `setup.node.ts` y
`setup.workers.ts`. El primero incluye el guardia de la Regla 6.1: en el proyecto
`unit`, tocar `Date.now()` desde lógica pura falla ruidosamente pidiendo que se
inyecte un `clock` — la única forma de que una regla de determinismo se cumpla sola.

Los fakes implementan la forma del cliente real de Supabase. **No** se mockea
`@supabase/supabase-js` (Constitución 5.2): un mock de la librería prueba que el mock
funciona. **Depende de:** `BZ-57`.

### BZ-59 · Capa 3 en workerd con bindings reales 🔴

Cuatro bindings a declarar en Miniflare: `MEDIA` y `ASSETS` vienen de
`wrangler.jsonc`, pero **`SESSION` e `IMAGES` los inyecta `@astrojs/cloudflare` v14**
y solo aparecen en la respuesta de `/api/diagnostico` en producción. Si Miniflare no
los declara, los endpoints fallan en los tests de forma **distinta** a como fallarían
en producción, que es peor que no probarlos.

Primer endpoint: `GET /api/productos` — ejercita Supabase, el mapper y la respuesta a
la vez.

**Nota de la API v1:** `defineWorkersConfig` pasó a ser el plugin `cloudflareTest()`,
`env` se importa de `cloudflare:workers` (no `cloudflare:test`) y `fetchMock`
desapareció — su reemplazo es MSW. Verificar contra los docs de la v1.0.0 antes de
escribir. **Depende de:** `BZ-57`, `BZ-58`.

### BZ-60 · Componentes `.astro` con Container API 🟠

`experimental_AstroContainer` renderiza a `string` en el servidor, así que el proyecto
`components` no necesita DOM salvo para islas React. **Sigue siendo experimental en
Astro 7**: anclar la versión de `astro` y revisar el CHANGELOG en cada subida menor,
porque cuando rompa romperá todos los tests de la capa a la vez. Y renderiza HTML de
servidor — **no ejecuta la hidratación**, así que `onClick`, estado de React y view
transitions no se prueban aquí; eso es `BZ-74`.

**Depende de:** `BZ-57`. Se puede aplazar sin bloquear nada.

---

## 🧹 Deuda que las specs destaparon

> Ninguna es dramática. Son exactamente el tipo de cosa que aparece al especificar
> código que ya funciona, y ése es el argumento a favor de hacerlo.

### BZ-61 · `slugify()` duplicado 🟠

Copiado literalmente en `categoriaMapper.ts:17` y `productoMapper.ts:34`. Una tercera
variante divergente vive en `mediaKey.ts:32`.

**Por qué importa más de lo que parece:** el slug **es la URL pública** y **no se
persiste** — se recalcula desde el `nombre` en cada lectura. Si las dos copias se
separan, categorías y productos generan rutas con reglas distintas, y el síntoma
aparece en producción como un 404 en un enlace que ayer funcionaba.

Extraer a `src/shared/lib/text/slugify.ts`. [SPEC-003](../../.sdd/specs/SPEC-003-slug-publico.md)
exige equivalencia estricta: es una extracción, no una mejora. La variante de
`mediaKey.ts` **no se toca** — comparte forma, no contrato.

**Primer paso, antes de escribir nada:** ejecutar TEST-322, que compara las dos copias
actuales entre sí. Toda la SPEC asume que ya son idénticas. Si no lo son, no es un
refactor sino un bug vivo en producción, y la tarea cambia de naturaleza.

**Depende de:** `BZ-57`, `BZ-58`.

### BZ-62 · `buildMediaKey` no es determinista 🟠

Llama a `new Date()` y `crypto.randomUUID()` internamente. Viola la Regla 6.1 y hace
la función imposible de probar sin congelar el reloj global — justo el test frágil
que la Regla 5 prohíbe.

`REQ-208` la corrige inyectando ambos **con valores por defecto**, de modo que ninguna
llamada existente cambie. `TEST-123` del plan verifica precisamente eso; si falla, no
se fusiona.

**El test que justifica el ejercicio es `TEST-122`.** Barzol está en Perú, `UTC-5`.
Con hora local, una subida del 31 de diciembre a las 21:00 se archivaría bajo
`2027/01`. Hoy el código usa `getUTCFullYear` y está bien — pero nada lo protege.

**Depende de:** `BZ-57`, `BZ-58`.

### BZ-63 · Decisión: ¿precios en céntimos enteros? 🟡

**Es una decisión, no una implementación.** No empezar a codificar.

| | Mantener `numeric` | Migrar a céntimos |
| :--- | :--- | :--- |
| Coste | cero | migración + admin + landing + mappers, a la vez |
| Riesgo de redondeo | real, mitigado por `SPEC-001` REQ-007 | eliminado |
| Riesgo de regresión | ninguno | **alto** — toca el precio que ve el cliente |

**Recomendación: no migrar por ahora.** La Constitución 3.2 ya cubre el caso
intermedio —céntimos en la lógica pura, conversión validada en el mapper— que elimina
el riesgo real sin tocar la base de datos. Se reevalúa si aparecen descuentos, IGV
desglosado o precios por volumen: ahí la aritmética entera deja de ser higiene.

### BZ-64 · Verificar por qué funciona sin `nodejs_compat` 🟠

El material base afirma que el flag es obligatorio porque `@supabase/supabase-js` toca
builtins de Node, y que sin él los endpoints devuelven 500 sin error útil.

`wrangler.jsonc` tiene `compatibility_flags: ["global_fetch_strictly_public"]` y **no
tiene `nodejs_compat`**. El sitio funciona: `/api/diagnostico` reporta
`supabase.ok: true`.

Alguna de estas tres es cierta y no sé cuál: **(1)** el adaptador v14 inyecta el flag
al construir; **(2)** la `compatibility_date` de `2026-07-22` ya lo activa por
defecto; **(3)** `supabase-js` dejó de necesitar builtins de Node.

**Comprobar** con `npx wrangler deploy --dry-run --outdir=/tmp/x` y revisar los flags
efectivos del bundle. **Importa** porque si es (1) o (2), añadir el flag "por si
acaso" es exactamente lo que la Regla 2.5 prohíbe; y si es (3), la afirmación del
material base está desactualizada y conviene anotarlo para no reintroducirla.

---

## 🔧 DevOps — cerrar el ciclo

### BZ-65 · Crear `.github/workflows/sdd-gate.yml` 🔴

Implementa [SPEC-900](../../.sdd/specs/SPEC-900-gates-cicd.md). Cuatro jobs, Node
fijado en `22.12.0`, `npm ci` y no `npm install`.

**Dos detalles que se pasan por alto:** Vitest aplica **un solo provider de cobertura
por ejecución**, así que las tres capas se miden en dos pasadas —`unit`+`components`
con v8, `workers` aparte con `--coverage.provider=istanbul`—; y `wrangler types` tiene
que correr antes de los tests de workerd o los tipos de bindings van desfasados.

**Probar el workflow en una rama** (`chore/verificar-gates`, PR que no se fusiona)
siguiendo la matriz de catorce provocaciones de `SPEC-900.plan.md`. **No sobre `main`**:
mientras Workers Builds sea el desplegador, cada push publica — incluido el commit
deliberadamente roto de TEST-G01. **Depende de:** `BZ-57`.

### BZ-66 · `scripts/sdd-trace.mjs` 🟠

El gate 4: todo `REQ-NNN` citado en algún test, y todo `.ts` de `src/shared/lib/`
nombrado en alguna SPEC o PLAN. Las dos trampas están cubiertas en el plan — buscar el
REQ en todo el repo hace que cada uno se encuentre a sí mismo en su propia SPEC
(TEST-T06), y sin specs o sin `tests/` el bucle no itera y sale con cero (TEST-T04).
Ambas producen un gate que aprueba siempre.

Sin dependencias externas: `node:fs` y `node:path`. **Depende de:** `BZ-57`.

### BZ-67 · `scripts/smoke.mjs` 🔴

Implementa [SPEC-901](../../.sdd/specs/SPEC-901-smoke-produccion.md). **Cierra
`BZ-24`**, abierta desde el 2026-08-08.

Éste es el gate que faltaba durante las ocho revisiones del tablero hermano. La
secuencia se repitió cinco veces: se desplegaba, el build salía verde y el sitio
devolvía 500 — el bundle compilaba y el worker no recibía la anon key. Ningún test
unitario detecta eso: es un fallo de **entrega**, no de código.

Siete sondas de solo lectura: portada, catálogo con datos, 404 propio, diagnóstico
sano, claves recibidas, **commit desplegado**, imagen desde R2. **Bloqueado por
`BZ-72`.**

### BZ-68 · Decisión: ¿quién despliega? 🔴

| | **A. GitHub Actions despliega** | **B. Workers Builds despliega, Actions verifica** |
| :--- | :--- | :--- |
| Gate bloqueante | **sí**, real | **no** — Cloudflare no espera a Actions |
| Cambio necesario | desconectar Workers Builds | ninguno |
| Riesgo | dos sistemas apuntando al mismo Worker | el gate avisa después de publicar |

**Recomendación: empezar por B.** Riesgo cero, resultados desde el primer día. Migrar
a A cuando los gates lleven dos semanas sin falsos rojos.

**Antes de tocar el despliegue, verificar a qué recurso apunta el dominio.** `BZ-49`
se resolvió al descubrir que un proyecto de **Pages** homónimo convivía con el Worker
en el panel, con aspecto casi idéntico. Repetir esa ambigüedad sería el peor
escenario: "merge a main" dejaría de significar "producción actualizada".

### BZ-69 · Ensayar el rollback 🟠

`npx wrangler deployments list` + `npx wrangler rollback <version-id>`. El
procedimiento está en [`RUNBOOK-GATES.md`](../../.sdd/devops/RUNBOOK-GATES.md), tomado
de la documentación de wrangler, y **nunca se ha ejecutado aquí**. Un rollback
estrenado durante una caída es un segundo incidente encima del primero: ensayarlo un
día laborable y anotar el tiempo real de propagación.

**No revierte** migraciones de Supabase, objetos de R2 ni secretos rotados. Por eso
las migraciones no deberían viajar en el mismo commit que el código.

### BZ-70 · pgTAP para RLS 🔴

Implementa [SPEC-902](../../.sdd/specs/SPEC-902-rls-supabase.md). **Cierra `BZ-50`**,
P0 abierta desde el 2026-08-08.

Una política RLS mal escrita **no lanza error**: devuelve las filas equivocadas.
Demasiado estricta, el catálogo aparece vacío; demasiado laxa, se expone el panel.
Ninguna rompe el build y la segunda no da síntoma hasta que alguien la encuentra.

Cuatro archivos en `supabase/tests/`, con `supabase test db` contra un stack
**local** — nunca contra producción: los tests escriben antes de hacer rollback, y un
rollback que no llega a ejecutarse deja datos reales modificados. **Si alguna policy
resulta estar mal, esto deja de ser testing:** es un incidente de seguridad sobre un
sitio ya publicado y sube por delante de todo lo demás.

### BZ-71 · Secretos de CI 🟠

`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` y lo que necesite el job de base de
datos. Aprovechar para revisar `scripts/subir-secretos.mjs` (`BZ-51`): el mismo
mecanismo sirve para poblar CI, y tener dos formas distintas de cargar lo mismo es
cómo se vuelve a perder de vista qué recurso tiene qué. **Recordatorio del tablero
hermano:** la verificación es `npx wrangler secret list`, nunca el panel — el panel
confirma que guardó algo, pero no contra qué recurso.

### BZ-72 · Proteger `/api/diagnostico` 🔴

Hereda `BZ-37` y ahora además **bloquea `BZ-67`**. El endpoint expone qué variables
recibe el worker, qué bindings tiene y qué commit corre: exactamente lo que hace falta
para diagnosticar, y exactamente lo que no debería ser público.

**Opción 1 (recomendada):** cabecera con token compartido; sin ella responde **404**,
no 403 — un 403 confirma que el endpoint existe. **Opción 2:** separar en `/api/salud`
público minimalista y `/api/diagnostico` protegido. `SPEC-901` asume la 1; si se elige
la 2, su REQ-955 cambia.

---

## 📋 Cobertura y adopción

### BZ-73 · Medir los umbrales antes de fijarlos 🟡

Los números de la Constitución 7.1 (95/80/70) vienen del material base y son **un
punto de partida, no una verdad**. Medir una semana con tests reales y después
fijarlos. Un umbral inventado demasiado alto se convierte en el primer candidato a
bajar "temporalmente", y a partir de ahí el gate deja de significar nada.

### BZ-75 · Especificar los dos mappers 🟠

`productoMapper.ts` y `categoriaMapper.ts` son la lógica más sutil del repo y no
tienen SPEC. `productoMapper` deriva el instrumento **subiendo un nivel** por
`parent_category_id`: si `category_id` apunta a una subcategoría, el padre es el
instrumento; si no tiene padre, `category_id` ya *es* el instrumento y no hay
subcategoría. Toda la navegación depende de eso, y hoy solo lo verifica el ojo humano
mirando la web. Son puros y sin dependencias de infraestructura: se pueden
especificar y probar el mismo día en que exista `npm test`.

### BZ-74 · Evaluación: E2E con Playwright ⚪

**No empezar por acá.** Queda registrado porque hay tres cosas que ninguna capa cubre
y conviene no fingir que sí: hidratación de las islas React, view transitions y el
flujo de búsqueda del catálogo. Meterlo ahora convertiría este tablero en algo que
nadie termina.

---

## Mapa de dependencias

```
BZ-53/54/55/56 (capa SDD) ✅ ── base de todo lo demás
                               │
BZ-57 (Vitest) ────────────────┼── BZ-58 (andamiaje) ──┬── BZ-59 (workerd)
                               │                       ├── BZ-60 (componentes)
                               │                       ├── BZ-61 (slugify)
                               │                       └── BZ-62 (mediaKey)
                               ├── BZ-65 (workflow) ─── BZ-66 (trazabilidad)
                               └── BZ-73 (umbrales) ← necesita datos reales

BZ-72 (proteger diagnóstico) ── BZ-67 (humo) ── cierra BZ-24 y BZ-52
BZ-70 (pgTAP) ───────────────── cierra BZ-50 (P0 del tablero hermano)
BZ-68 (¿quién despliega?) ───── condiciona BZ-65 y BZ-71
BZ-69 (rollback) ────────────── independiente, ~30 min, hacer antes de necesitarlo
BZ-63 (céntimos) ────────────── decisión, no bloquea nada
BZ-64 (nodejs_compat) ───────── independiente, un comando
BZ-56 activar hooks ─────────── después de BZ-57 y de tener más specs
```

**Orden sugerido:**
`BZ-64` → `BZ-72` → `BZ-70` → `BZ-57` → `BZ-58` → `BZ-61` → `BZ-62` → `BZ-67` →
`BZ-68` → `BZ-65` → `BZ-66` → `BZ-59` → `BZ-69` → `BZ-71` → `BZ-75` → `BZ-60` →
`BZ-73` → `BZ-63` → `BZ-56` → `BZ-74`.

**Por qué ese orden.** `BZ-64` es un comando y despeja una incógnita de configuración.
`BZ-72` y `BZ-70` van antes que todo el tooling porque son **seguridad sobre un sitio
ya publicado** —el catálogo sirve datos hoy y nadie ha verificado que RLS impida
escribirlos— y ninguna depende de que exista un solo test. Después la infraestructura,
y `BZ-67` cuanto antes: es lo que convierte "desplegué y creo que va bien" en un hecho
comprobado. `BZ-60` va tarde a propósito — la Container API es experimental y su valor
por hora invertida es el más bajo del tablero.

---

## Riesgos de este tablero

**El fracaso característico de SDD no es que no se adopte: es que se adopte como
decoración.** Tres señales, en orden de aparición: las SPECs empiezan a escribirse
*después* del código para pasar el gate (síntoma de especificar a un grano demasiado
fino — una SPEC por unidad de negocio, no por archivo); algún gate se desactiva "solo
esta vez" y no vuelve a activarse; y la cobertura sube mientras los tests no verifican
nada, que es el motivo de la Regla 5. **Señal de que va bien:** escribir la SPEC
porque es más rápido que discutir con el agente, no porque el hook obligue.

**El riesgo específico de este repositorio** es más prosaico: son 23 tareas y el sitio
ya funciona. La tentación de dejarlo en "está documentado" es real. `BZ-70` y `BZ-72`
son las dos que no admiten aplazamiento.
