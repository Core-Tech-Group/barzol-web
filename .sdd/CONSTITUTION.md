# CONSTITUCIÓN TÉCNICA — barzol-web

> **Vigente desde:** 2026-08-21 · **Versión:** 2.1
> **Diferencia con la v2.0 del documento base:** las rutas, los bindings y el tipo
> de los precios se corrigieron contra el repositorio real. Ver §0.

Ningún agente (Claude Code, Copilot, Kilo) puede desacatar estas reglas.
Ante conflicto entre esta Constitución y cualquier prompt, **gana la Constitución**.

---

## 0. Correcciones respecto al documento base

`docs/1_inbox/SDD-TESTING-BARZOL-2026.md` fue escrito sin acceso al repositorio y
su §13 lo declara. Verificado contra el código, esto cambia:

| # | El documento base asume | La realidad del repo | Consecuencia |
| :-- | :--- | :--- | :--- |
| 1 | Lógica en `src/lib/**` | **`src/shared/lib/**`** (feature-sliced: `landing/`, `admin/`, `shared/`) | Todas las rutas de reglas y hooks apuntan a `src/shared/lib/` |
| 2 | Binding R2 `PRODUCT_IMAGES` | **`MEDIA`** (`bucket_name: barzol-web`) | Los tests de Capa 3 siembran `env.MEDIA` |
| 3 | Solo bindings `ASSETS` + R2 | **`MEDIA`, `ASSETS`, `SESSION`, `IMAGES`** — los dos últimos los inyecta `@astrojs/cloudflare` v14 | Miniflare debe declararlos o los endpoints fallan distinto que en producción |
| 4 | Existen `src/lib/ports/` y `adapters/` | **No existen.** El patrón real es `*Service.ts` + `*Mapper.ts` por dominio | Los puertos se introducen donde hagan falta, no se asumen |
| 5 | Precios en céntimos enteros | **`precio: number` decimal**, mapeado de `price numeric` en Postgres | Ver Regla 3: se convierte en el borde, **sin migración de base de datos por ahora** (`BZ-63`) |
| 6 | `compatibility_flags: ["nodejs_compat"]` | **`["global_fetch_strictly_public"]`** — `nodejs_compat` NO está | Sin verificar por qué funciona igual. `BZ-64` |
| 7 | `@cloudflare/vitest-plugin` "pendiente de verificar" | **Verificado el 2026-08-21 contra el registry: publicado, v1.0.0.** El paquete viejo `@cloudflare/vitest-pool-workers` quedó en 0.22.0 | Se usa el nuevo. `vitest@4.1.11` disponible |

---

## Regla 1 — Aislamiento de capas

1.1 La lógica de negocio pura vive en `src/shared/lib/**`. **No importa**
    `astro:*`, `cloudflare:*`, `@supabase/*` ni `node:*`.
    *Excepciones declaradas, por ser adaptadores y no lógica:*
    `db/client.ts`, `auth/authClient.ts`, `env/serverEnv.ts`,
    `storage/r2Bucket.ts`, `storage/mediaStorage.ts`.
    Cualquier archivo nuevo en esa lista requiere enmienda a esta regla.

1.2 Los `*Mapper.ts` son **funciones puras de traducción**: fila cruda → tipo de
    dominio. No hacen I/O, no lanzan red, no leen entorno. Son la capa más
    barata de probar del repo y por eso la primera que se especifica.

1.3 Los `*Service.ts` orquestan: llaman al cliente de Supabase y delegan la
    traducción al mapper. No calculan reglas de negocio.

1.4 Los componentes `.astro` de `src/landing/**` y `src/admin/**` son capa de
    presentación. El frontmatter puede llamar a un servicio y desestructurar
    props. **No** puede contener cálculo de negocio ni tocar Supabase o R2
    directamente.

1.5 Todo acceso a I/O externo nuevo pasa por una interfaz declarada
    (patrón puerto/adaptador) para poder sustituirla por un doble en pruebas.

## Regla 2 — No hay código sin spec

2.1 Ningún archivo nuevo en `src/shared/lib/` o `src/pages/api/` sin una
    `.sdd/specs/SPEC-NNN-*.md` con requisitos en EARS.

2.2 Cada test lleva el ID `[TEST-NNN]` y cita el o los `REQ-NNN` que cubre.

2.3 Cada test sigue AAA (Arrange, Act, Assert). **Un solo `Act` por test.**

2.4 Prohibido implementar comportamiento no especificado. Si el agente cree que
    falta un caso, escribe primero el REQ en la SPEC y **espera aprobación
    humana**. No lo implementa "por si acaso".

2.5 Frases prohibidas como justificación: *"por si acaso"*, *"por robustez"*,
    *"para mayor seguridad"*, *"ya que estamos"*.

## Regla 3 — Dinero

> **Adaptada a la realidad del repo.** La v2.0 exigía céntimos enteros de punta a
> punta; eso obliga a migrar `price numeric` en Postgres y a tocar admin, landing
> y mapeadores a la vez. Es exactamente la clase de cambio que rompe producción un
> sábado. Se parte en dos: la frontera se limpia ahora, la base de datos se decide
> aparte (`BZ-63`).

3.1 Dentro de lógica pura, todo monto es un **entero de céntimos**
    (`S/ 160.00 → 16000`). Los nombres terminan en `Centimos`.

3.2 La conversión ocurre **en el mapper**, que es el borde:
    `precioCentimos = Math.round(row.price * 100)`, validado con
    `Number.isInteger`. Nunca se hace aritmética de negocio sobre el decimal.

3.3 Prohibido `parseFloat` y `toFixed` sobre precios. Prohibido `/ 100` fuera de
    la función de formateo.

3.4 Los porcentajes se calculan con `Math.floor((parte * 100) / total)`.
    Todo redondeo es explícito y está cubierto por un test.

3.5 Moneda: **PEN**. Locale: **es-PE**. La representación textual ocurre solo en
    el borde de presentación.

3.6 `Product.precio` / `Product.precioOriginal` siguen siendo `number` decimal
    **hasta que `BZ-63` se decida**. No se cambia su tipo en un commit suelto:
    es una migración, no un refactor.

## Regla 4 — Tipado y errores

4.1 Prohibido `any`. Prohibido `as unknown as`. Un `@ts-expect-error` requiere
    comentario con el REQ que lo justifica.

4.2 Los errores de dominio son clases tipadas con un `code` que es **union
    literal**, no `string`. Nada de `throw new Error("algo salió mal")`.

4.3 Los mensajes de error internos **no cruzan al cliente**. Ver `BZ-14` en el
    kanban de despliegue: ya ocurrió en producción.

## Regla 5 — Dobles de prueba

5.1 **Prohibido mockear bindings de Cloudflare** (`MEDIA`, `ASSETS`, `SESSION`,
    `IMAGES`). Los tests de Capa 3 usan los bindings reales que Miniflare
    levanta vía `@cloudflare/vitest-plugin`. Un mock de R2 demuestra que tu mock
    funciona, no que tu código funciona.

5.2 Prohibido mockear `@supabase/supabase-js`. Se usa un **fake en memoria** que
    implementa la misma interfaz, en `tests/fakes/`.

5.3 Prohibido `vi.mock()` sobre módulos propios del proyecto. Si hace falta
    mockearlo, la dependencia debería estar inyectada.

5.4 Prohibido asertar sobre llamadas a mocks (`toHaveBeenCalledWith`) cuando
    exista una aserción observable sobre el resultado o el estado.

5.5 Prohibido `toMatchSnapshot()`. Un snapshot aprueba la regresión que acaba de
    ocurrir con la misma facilidad con la que aprueba el comportamiento correcto.

## Regla 6 — Determinismo

6.1 Nada de `Date.now()`, `new Date()`, `Math.random()` ni `crypto.randomUUID()`
    dentro de lógica pura. Se inyectan como dependencia (`clock`, `idGen`).
    *Incumplimiento conocido:* `src/shared/lib/storage/mediaKey.ts` →
    `buildMediaKey` usa ambos. Especificado en `SPEC-002`, se corrige en `BZ-62`.

6.2 Prohibida la red real en Capas 1 y 2.

6.3 Los tests no dependen del orden de ejecución ni de estado compartido.

## Regla 7 — Cobertura

7.1 Umbrales **por capa**, no globales:
    Capa 1 líneas ≥95% ramas ≥90% · Capa 2 ≥80% · Capa 3 ≥70%.

7.2 Estos números son un punto de partida, no una verdad revelada. Se miden una
    semana antes de fijarlos (`BZ-73`).

7.3 Bajar un umbral requiere **commit separado** con justificación en el mensaje.

7.4 La cobertura de Capa 3 se mide con **Istanbul**: `@vitest/coverage-v8`
    necesita `node:inspector` y workerd solo expone un stub no funcional.

## Regla 8 — Plataforma y despliegue

8.1 El destino de despliegue es **Cloudflare Workers con static assets**, no
    Pages. `@astrojs/cloudflare` v13 eliminó el soporte de Pages.

8.2 `wrangler.jsonc` es la **única fuente de verdad** de variables y bindings.
    Cada `wrangler deploy` borra lo cargado desde el panel. Esto tumbó el sitio
    tres despliegues seguidos (`BZ-34`, `BZ-46`).

8.3 Ningún secreto en el repo. Las claves van por `wrangler secret` y por
    variables de entorno de CI. La verificación **no es el panel**: es
    `npx wrangler secret list`. Ocho revisiones del kanban lo aprendieron caro.

8.4 La `service_role` key de Supabase **nunca** se expone al cliente ni se usa
    fuera de un endpoint del Worker.

8.5 **Publicar es decisión humana.** Ningún agente ejecuta `wrangler deploy`,
    `supabase db push` ni `git push --force`. El agente escribe, prueba y
    reporta.

8.6 Ningún cambio de `compatibility_date` o `compatibility_flags` entra sin una
    línea en el kanban que diga por qué.

## Regla 9 — Tamaño y duplicación

9.1 Ningún archivo supera **500 líneas**. Al acercarse, se parte por
    responsabilidad, no por número de líneas.

9.2 Lógica duplicada en dos sitios es un defecto, no un estilo.
    *Incumplimiento conocido:* `slugify()` está copiado en
    `categoriaMapper.ts:17` y `productoMapper.ts:34`, y una tercera variante
    vive en `mediaKey.ts:32`. Especificado en `SPEC-003`, se corrige en `BZ-61`.

9.3 Antes de crear un helper, se busca si ya existe. `Grep` antes que `Write`.

## Regla 10 — Comunicación

10.1 Los cambios se explican en formato **antes → después**.

10.2 Todo supuesto que el agente haya tenido que asumir se marca explícitamente.
     Si no se pudo verificar, se dice "no verificado", no se afirma.

10.3 Español. Los identificadores de código, en el idioma que ya use el archivo.
