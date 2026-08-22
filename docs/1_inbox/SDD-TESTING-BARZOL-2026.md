# SDD para Testing Unitario — Barzol Web
## Astro 7 + Cloudflare Workers + R2 + Supabase, ejecutado con Claude Code (Opus 5 / Sonnet 5)

> **Versión:** 1.0 — 21 de agosto de 2026
> **Proyecto:** `barzol-web` · https://barzol-web.willymichael-cardenas.workers.dev/
> **Reemplaza a:** *"Spec-Driven Development (SDD) Guía Maestra para Testing Unitario en Astro (2026)"*
> **Autor de la integración:** revisión senior sobre el material base + verificación contra docs vigentes (agosto 2026)

---

## 0. Cómo leer este documento

| Sección | Para qué sirve |
| :--- | :--- |
| §1 | Qué del material original ya no aplica (antes → después) |
| §2 | Topología de runtimes: por qué necesitas 3 proyectos Vitest, no 1 |
| §3 | Estructura de carpetas `.sdd/` + `.claude/` |
| §4 | Constitución v2 adaptada a tu stack |
| §5 | Configuración ejecutable (`vitest.config.ts`, setups, package.json) |
| §6 | Caso práctico completo con tu dominio real (precios de catálogo) |
| §7 | Testing de componentes `.astro` con Container API |
| §8 | Testing de endpoints con R2 y Supabase dentro de workerd |
| §9 | Testing de RLS en Supabase (pgTAP) — el gate que casi nadie pone |
| §10 | Capa Claude Code: CLAUDE.md, rules, skills, subagents, hooks, comandos |
| §11 | CI/CD: GitHub Actions + Workers Builds |
| §12 | Plan de adopción incremental (4 semanas) |
| §13 | Supuestos y cosas que debes verificar tú |

---

## 1. Diagnóstico del material original: antes → después

El documento que me pasaste tiene una arquitectura conceptual sólida (Constitución → Spec → Plan → Red → Green → Gate). Eso lo conservo entero. Lo que cambio es **todo lo que toca la realidad técnica de agosto 2026** y **lo que no encaja con tu despliegue real**.

### 1.1 Cambios de plataforma

| # | Antes (material original) | Después (verificado, ago-2026) | Por qué |
| :--- | :--- | :--- | :--- |
| 1 | "Proyecto Astro desplegado en Cloudflare **Pages**" | **Cloudflare Workers con static assets** | Tu URL es `*.workers.dev`, no `*.pages.dev`. Y `@astrojs/cloudflare` v13 (marzo 2026) **eliminó el soporte de Pages**; v12 fue el último. Con Astro 7 usas adapter v14 → salida orientada a Workers. Cloudflare recomienda Workers para proyectos nuevos. |
| 2 | Ejemplos sobre Astro 4.x / 5.x | **Astro 7.1.3** | Es la versión que tu propio HTML declara en `meta-generator`. Astro 7 salió en junio 2026. |
| 3 | `environment: 'happy-dom'` global | **`environment: 'node'` para lógica y componentes `.astro`** | La Container API renderiza a `string` en el servidor. No necesitas DOM para eso. happy-dom solo lo necesitas si testeas islas React con Testing Library. |
| 4 | Un solo `vitest.config.ts` | **`test.projects` con 3 proyectos** | Tu código vive en dos runtimes distintos (Node/Vite y workerd). Un solo entorno te da falsos verdes. Ver §2. |
| 5 | `coverage.provider: 'v8'` para todo | **`v8` en Node, `istanbul` en workerd** | `@vitest/coverage-v8` necesita `node:inspector`. workerd solo expone un stub no funcional. El pool ahora detecta esta config y falla temprano con un error explícito pidiendo Istanbul. |
| 6 | (no mencionado) | **`@cloudflare/vitest-pool-workers` → `@cloudflare/vitest-plugin` v1** | Cloudflare renombró el paquete. Además, desde v0.13 la API cambió: `defineWorkersConfig` → plugin `cloudflareTest()`, `import { env } from "cloudflare:test"` → `cloudflare:workers`, `fetchMock` eliminado (usa MSW), y requiere `vitest@^4.1`. ⚠️ El rename es de hace ~1 día; verifica el nombre exacto antes de instalar (§13). |
| 7 | (no mencionado) | **`nodejs_compat` es obligatorio** | `@supabase/supabase-js` toca builtins de Node. Sin el flag, tus endpoints devuelven 500 sin error útil. |

### 1.2 Errores técnicos concretos en el material original

**a) El `vitest.config.ts` propuesto no funciona bien.**

```ts
// ANTES — frágil
const astroConfig = await getViteConfig({ /* ... */ });
return { ...astroConfig, test: { /* ... */ } };
```

`getViteConfig()` ya devuelve una config completa que **incluye su propia clave `test`**. Al hacer spread y luego sobrescribir `test`, pierdes lo que Astro inyecta ahí (resolución de `.astro`, aliases, plugins de contenido). El patrón correcto es pasar la config de test **como argumento a `getViteConfig`**, no fusionarla después. Ver §5.

**b) La sintaxis EARS está mal aplicada.**

```
REQ-001 (marcado como "Ubiquitous Syntax")
- THEN El sistema DEBE aplicar 20% cuando el periodo sea ANNUAL
```

Un requisito **ubicuo** en EARS no tiene condición: *"El sistema DEBE ..."* y punto. Ese REQ-001 tiene una condición de estado, así que es **state-driven** (`WHILE`). Y `WHILE ... THEN ...` tampoco es EARS: la plantilla es `WHILE <estado>, el <sistema> DEBE <respuesta>`. Suena a pedantería, pero no lo es: si el vocabulario formal es aproximado, el agente lo trata como prosa y **vuelve a inventar**, que es justo lo que SDD intenta evitar. En §6 uso las 5 plantillas correctamente.

**c) La implementación de ejemplo viola su propia Constitución.**

El `billing.ts` del material introduce:
- `BillingError('INVALID_PRICE')` — **no existe ningún REQ** que lo especifique.
- `PROMO_VIP` en `VALID_PROMOS` — **no aparece en la spec**.

La Regla 6 del prompt maestro dice literalmente *"NUNCA agregues funcionalidades extra... fuera de la Spec"*. El propio ejemplo la incumple. Esto es exactamente el fallo que SDD debe detectar, y demuestra por qué el verifier gate **no puede ser solo `vitest run`**: los tests pasan y la deriva entra igual. Necesitas un gate de trazabilidad spec↔test↔código (§10.5).

**d) Aritmética de dinero en punto flotante.**

`context.basePrice * 0.20` sobre floats es un bug esperando ocurrir, y en tu caso es dinero real en soles (S/ 160.00, S/ 175.00, S/ 210.00). En la Constitución v2 esto pasa a ser regla dura: **todo monto se representa en céntimos como `number` entero**.

### 1.3 Sobre la premisa del "Vibe Coding"

El material afirma que *"estudios empíricos publicados entre 2025 y 2026 muestran tasas alarmantes de degradación"* sin citar ninguno. **No lo estoy validando ni reproduciendo como hecho.** Los tres patrones de fallo que describe (deriva arquitectónica, alucinación de APIs, tests que verifican mocks) son reconocibles para cualquiera que haya trabajado con agentes en un repo grande, y esa observación práctica basta para justificar SDD. No necesitas apoyarte en estadísticas sin fuente — y si alguna vez usas este documento con un cliente, esa frase es el primer sitio donde te van a pedir la cita.

---

## 2. Topología de runtimes: por qué 3 proyectos Vitest

Tu aplicación no corre en un solo sitio. Esta es la separación real:

```
┌─────────────────────────────────────────────────────────────────┐
│  CAPA 1 — Lógica pura (src/lib/**)                              │
│  precios, slugs, validación, mapeo DTO, formateo PEN            │
│  Runtime: Node/Vite  ·  Sin I/O  ·  Determinista                │
│  → proyecto vitest "unit"        · coverage v8 · umbral 95%     │
├─────────────────────────────────────────────────────────────────┤
│  CAPA 2 — Componentes .astro e islas React (src/components/**)  │
│  render de ficha de producto, badge de oferta, grid catálogo    │
│  Runtime: Node/Vite + Container API                             │
│  → proyecto vitest "components"  · coverage v8 · umbral 80%     │
├─────────────────────────────────────────────────────────────────┤
│  CAPA 3 — Endpoints, middleware, adaptadores (src/pages/api/**) │
│  R2 (imágenes), Supabase (catálogo), cache, headers             │
│  Runtime: workerd REAL vía @cloudflare/vitest-plugin            │
│  → proyecto vitest "workers"     · coverage istanbul · 70%      │
├─────────────────────────────────────────────────────────────────┤
│  CAPA 4 — Base de datos (supabase/**)                           │
│  políticas RLS, funciones, constraints                          │
│  Runtime: Postgres local · pgTAP · `supabase test db`           │
│  → NO es Vitest. Gate separado en CI.                           │
└─────────────────────────────────────────────────────────────────┘
```

**La regla que hace que esto funcione:** la Capa 1 no importa nada de `astro:*`, `cloudflare:*` ni `@supabase/supabase-js`. Es TypeScript puro. Por eso es la única capa donde el umbral de cobertura del 95% es realista y barato.

**El error más caro que puedes cometer** es mockear los bindings de Cloudflare (`env.PRODUCT_IMAGES.get()`) con `vi.fn()`. Todo el sentido de `@cloudflare/vitest-plugin` es que los tests corren *dentro de workerd con bindings reales simulados por Miniflare*. Un mock de R2 te dice que tu mock funciona, no que tu código funciona.

---

## 3. Estructura de carpetas

```
barzol-web/
├── .sdd/
│   ├── CONSTITUTION.md              # Ley suprema (§4)
│   ├── GLOSSARY.md                  # Vocabulario de dominio: SKU, oferta, tudel...
│   ├── specs/
│   │   ├── SPEC-001-precio-catalogo.md
│   │   ├── SPEC-002-imagenes-r2.md
│   │   └── SPEC-003-busqueda-catalogo.md
│   ├── plans/
│   │   ├── SPEC-001.plan.md
│   │   └── SPEC-002.plan.md
│   └── traceability.json            # Generado: REQ ↔ TEST ↔ archivo fuente
│
├── .claude/
│   ├── settings.json                # Permisos + hooks
│   ├── rules/
│   │   ├── sdd.md                   # Siempre cargado
│   │   └── money.md                 # Siempre cargado
│   ├── skills/
│   │   ├── sdd-spec-author/SKILL.md
│   │   ├── sdd-test-author/SKILL.md
│   │   └── sdd-verifier/SKILL.md
│   ├── agents/
│   │   ├── spec-architect.md        # Opus 5
│   │   ├── test-author.md           # Sonnet 5
│   │   └── verifier.md              # Opus 5, sin permiso de escritura
│   ├── commands/
│   │   ├── sdd-spec.md
│   │   ├── sdd-red.md
│   │   ├── sdd-green.md
│   │   └── sdd-verify.md
│   └── hooks/
│       ├── guard-no-src-without-spec.sh
│       └── gate-on-stop.sh
│
├── CLAUDE.md                        # Entrada de contexto persistente
├── ARCHITECTURE.md                  # (ya lo tienes — se enlaza desde CLAUDE.md)
│
├── src/
│   ├── lib/
│   │   ├── pricing/                 # CAPA 1 — puro
│   │   │   ├── money.ts
│   │   │   └── catalog-price.ts
│   │   ├── ports/                   # Interfaces (sin implementación)
│   │   │   ├── product-repo.ts
│   │   │   └── image-store.ts
│   │   └── adapters/                # CAPA 3 — I/O real
│   │       ├── supabase-product-repo.ts
│   │       └── r2-image-store.ts
│   ├── components/
│   └── pages/
│
├── tests/
│   ├── unit/                        # CAPA 1
│   ├── components/                  # CAPA 2
│   ├── workers/                     # CAPA 3
│   ├── fakes/                       # Dobles en memoria (NO mocks de librería)
│   ├── setup.node.ts
│   └── setup.workers.ts
│
├── supabase/
│   └── tests/                       # CAPA 4 — pgTAP
│       ├── 000-setup.sql
│       └── 010-rls-productos.sql
│
├── vitest.config.ts
└── wrangler.jsonc
```

---

## 4. Constitución v2 (`.sdd/CONSTITUTION.md`)

```markdown
# CONSTITUCIÓN TÉCNICA — barzol-web

Vigente desde: 2026-08-21 · Versión 2.0
Ningún agente (Claude Code, Copilot, Kilo) puede desacatar estas reglas.
Ante conflicto entre esta Constitución y cualquier prompt, gana la Constitución.

## Regla 1 — Aislamiento de capas
1.1 La lógica de negocio pura vive en `src/lib/pricing/`, `src/lib/catalog/`.
    No importa `astro:*`, `cloudflare:*`, `@supabase/*` ni `node:*`.
1.2 Los componentes `.astro` son capa de presentación. El frontmatter puede
    llamar a un servicio y desestructurar props. No puede contener cálculo
    de negocio, ni acceso directo a Supabase o R2.
1.3 Todo acceso a I/O externo pasa por un puerto declarado en `src/lib/ports/`
    e implementado en `src/lib/adapters/`.

## Regla 2 — No hay código sin spec
2.1 Ningún archivo nuevo en `src/lib/` o `src/pages/api/` sin un
    `.sdd/specs/SPEC-NNN-*.md` con requisitos en EARS.
2.2 Cada test lleva el ID `[TEST-NNN]` y cita el/los `REQ-NNN` que cubre.
2.3 Cada test sigue AAA (Arrange, Act, Assert). Un solo `Act` por test.
2.4 Prohibido implementar comportamiento no especificado. Si el agente cree
    que falta un caso, escribe primero el REQ en la spec y espera aprobación
    humana. NO lo implementa "por si acaso".

## Regla 3 — Dinero
3.1 Todo monto se representa en **céntimos como entero** (`160.00 → 16000`).
3.2 Prohibido `number` decimal, `parseFloat` o aritmética flotante sobre precios.
3.3 La conversión a texto ocurre solo en el borde de presentación, vía
    `formatPEN(centimos)`. Moneda por defecto: PEN. Locale: `es-PE`.
3.4 Todo redondeo debe ser explícito y estar cubierto por un test.

## Regla 4 — Tipado y errores
4.1 Prohibido `any`. Prohibido `as unknown as`. `@ts-expect-error` requiere
    comentario con el REQ que lo justifica.
4.2 Los servicios devuelven `Result<T, E>` o lanzan errores de dominio
    tipados. Nada de `throw new Error("algo salió mal")`.
4.3 El código de error es un union literal, no `string`.

## Regla 5 — Dobles de prueba
5.1 Prohibido mockear bindings de Cloudflare (R2, KV, ASSETS). Los tests de
    Capa 3 usan los bindings reales de Miniflare vía `@cloudflare/vitest-plugin`.
5.2 Prohibido mockear `@supabase/supabase-js`. Se usa un **fake en memoria**
    que implementa el puerto `ProductRepo`, en `tests/fakes/`.
5.3 Prohibido `vi.mock()` sobre módulos propios del proyecto. Si necesitas
    mockearlo, la dependencia debería estar inyectada.
5.4 Prohibido asertar sobre llamadas a mocks (`toHaveBeenCalledWith`) cuando
    exista una aserción observable sobre el resultado o el estado.

## Regla 6 — Determinismo
6.1 Nada de `Date.now()`, `Math.random()` ni `crypto.randomUUID()` dentro de
    lógica pura. Se inyectan como dependencia (`clock`, `idGen`).
6.2 Prohibida la red real en Capas 1 y 2.
6.3 Los tests no dependen del orden de ejecución ni de estado compartido.

## Regla 7 — Cobertura
7.1 Capa 1: líneas ≥95%, ramas ≥90%. Capa 2: ≥80%. Capa 3: ≥70%.
7.2 Bajar un umbral requiere commit separado con justificación en el mensaje.
7.3 Cobertura de Capa 3 se mide con Istanbul (v8 no funciona en workerd).

## Regla 8 — Plataforma
8.1 El destino de despliegue es Cloudflare **Workers** (static assets), no Pages.
8.2 `compatibility_flags` debe incluir `nodejs_compat`.
8.3 Ningún secreto en el repo. Claves de Supabase vía `wrangler secret` y
    variables de entorno de CI.
8.4 La `service_role` key de Supabase NUNCA se expone al cliente ni se usa en
    código que corra fuera de un endpoint del Worker.
```

---

## 5. Configuración ejecutable

### 5.1 `package.json` (fragmento)

```jsonc
{
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro build && wrangler dev",
    "deploy": "astro build && wrangler deploy",
    "generate-types": "wrangler types",

    "typecheck": "astro check && tsc --noEmit",
    "test": "vitest run",
    "test:unit": "vitest run --project unit",
    "test:components": "vitest run --project components",
    "test:workers": "vitest run --project workers",
    "test:watch": "vitest --project unit",
    "test:cov": "vitest run --coverage",
    "test:db": "supabase test db",

    "sdd:trace": "node scripts/sdd-trace.mjs",
    "sdd:gate": "npm run typecheck && npm run test:cov && npm run sdd:trace"
  },
  "devDependencies": {
    "vitest": "^4.1.0",
    "@vitest/coverage-v8": "^4.1.0",
    "@vitest/coverage-istanbul": "^4.1.0",
    "@cloudflare/vitest-plugin": "^1.0.0",
    "@testing-library/dom": "^10.4.0",
    "happy-dom": "^19.0.0",
    "wrangler": "^4.90.0",
    "msw": "^2.7.0"
  }
}
```

> ⚠️ `@cloudflare/vitest-plugin` es el nombre nuevo (v1). Si tu registry aún resuelve `@cloudflare/vitest-pool-workers`, usa ese y ejecuta el codemod cuando migres:
> `npx @cloudflare/codemods vitest:pool-workers-to-vitest-plugin`

### 5.2 `vitest.config.ts` — versión correcta

```ts
import { defineConfig } from 'vitest/config';
import { getViteConfig } from 'astro/config';
import { cloudflareTest } from '@cloudflare/vitest-plugin';

/**
 * Tres proyectos, tres runtimes.
 * NO fusionar getViteConfig() con spread: se le pasa la config de test
 * como argumento para que Astro inyecte sus propios plugins y aliases.
 */
export default defineConfig({
  test: {
    projects: [
      // ── CAPA 1 · lógica pura ────────────────────────────────────────
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
          setupFiles: ['./tests/setup.node.ts'],
        },
      },

      // ── CAPA 2 · componentes .astro + islas React ───────────────────
      // getViteConfig resuelve .astro, aliases @/* y content collections
      await getViteConfig({
        test: {
          name: 'components',
          environment: 'happy-dom', // necesario solo para islas React
          include: ['tests/components/**/*.test.ts'],
          setupFiles: ['./tests/setup.node.ts'],
        },
      }),

      // ── CAPA 3 · endpoints en workerd real ─────────────────────────
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './wrangler.jsonc' },
            miniflare: {
              // Bindings que solo existen en tests
              r2Buckets: ['PRODUCT_IMAGES'],
              bindings: {
                SUPABASE_URL: 'http://localhost:54321',
                SUPABASE_ANON_KEY: 'test-anon-key',
              },
            },
          }),
        ],
        test: {
          name: 'workers',
          include: ['tests/workers/**/*.test.ts'],
          setupFiles: ['./tests/setup.workers.ts'],
        },
      },
    ],

    coverage: {
      // v8 para Node; el proyecto workers reporta con istanbul (ver nota)
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/lib/**', 'src/components/**', 'src/pages/api/**'],
      exclude: [
        'src/env.d.ts',
        'src/content.config.ts',
        'src/lib/ports/**',      // interfaces puras, sin código ejecutable
        'worker-configuration.d.ts',
      ],
      thresholds: {
        // Umbral global conservador; los umbrales por capa se validan
        // en scripts/sdd-trace.mjs contra json-summary
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
});
```

> **Nota sobre cobertura mixta.** Vitest aplica un solo provider de coverage por ejecución. En la práctica el patrón que funciona es: `vitest run --project unit --project components --coverage` con v8, y una segunda pasada `vitest run --project workers --coverage.provider=istanbul` en CI. Es un paso extra, pero es la única forma honesta de medir cobertura dentro de workerd hoy.

### 5.3 `tests/setup.node.ts`

```ts
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

// Guard de Constitución 6.1: detecta no-determinismo en Capa 1.
// Si un test de src/lib/ toca Date.now(), falla ruidosamente.
if (process.env.VITEST_PROJECT === 'unit') {
  const realNow = Date.now;
  Date.now = () => {
    throw new Error(
      '[CONSTITUCIÓN 6.1] Date.now() en lógica pura. Inyecta un `clock`.'
    );
  };
  afterEach(() => { Date.now = realNow; });
}
```

### 5.4 `wrangler.jsonc`

```jsonc
{
  "$schema": "https://json.schemastore.org/wrangler.json",
  "name": "barzol-web",
  "main": "@astrojs/cloudflare/entrypoints/server",
  "compatibility_date": "2026-08-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "404-page"
  },
  "r2_buckets": [
    { "binding": "PRODUCT_IMAGES", "bucket_name": "barzol-productos" }
  ],
  "observability": { "enabled": true }
}
```

---

## 6. Caso práctico: SPEC-001 — Precio de catálogo

Tomo un dominio **real de tu sitio**: los productos muestran precio de venta y, cuando hay oferta, un precio de lista tachado (`S/ 160.00` / `S/ 180.00`).

### 6.1 `.sdd/specs/SPEC-001-precio-catalogo.md`

```markdown
# SPEC-001 — Resolución de precio de catálogo

Estado: APROBADA · Autor: Willy · Fecha: 2026-08-21
Unidad: `src/lib/pricing/catalog-price.ts` → `resolveCatalogPrice()`

## Contexto
Cada producto del catálogo tiene un precio de venta vigente y, opcionalmente,
un precio de lista anterior. La ficha y la tarjeta muestran el ahorro.

## Fuera de alcance
- Cálculo de IGV (se define en SPEC-004).
- Costos de envío.
- Precios por volumen / mayoristas.
- Persistencia o lectura desde Supabase (eso es SPEC-005, capa adaptador).

## Vocabulario
- `centimos`: entero ≥ 0. `S/ 160.00` = `16000`.
- `precioVenta`: lo que el cliente paga hoy.
- `precioLista`: precio anterior tachado. Opcional.

## Requisitos (EARS)

### [REQ-001] — Ubicuo
El sistema DEBE representar y devolver todos los montos como enteros en
céntimos, sin realizar aritmética de punto flotante.

### [REQ-002] — Dirigido por estado (State-driven)
MIENTRAS `precioLista` esté presente y sea estrictamente mayor que
`precioVenta`, el sistema DEBE marcar la oferta como activa y calcular
`ahorroCentimos = precioLista - precioVenta` y
`descuentoPct = floor(ahorroCentimos * 100 / precioLista)`.

### [REQ-003] — Dirigido por evento (Event-driven)
CUANDO `precioLista` esté ausente, sea igual o sea menor que `precioVenta`,
el sistema DEBE devolver la oferta como inactiva, con `ahorroCentimos = 0`,
`descuentoPct = 0` y `precioListaCentimos = null`.

### [REQ-004] — Comportamiento no deseado (Unwanted)
SI `precioVenta` no es un entero mayor que 0, ENTONCES el sistema DEBE lanzar
`PricingError` con código `PRECIO_VENTA_INVALIDO` y no devolver ningún precio.

### [REQ-005] — Comportamiento no deseado (Unwanted)
SI `precioLista` está presente y no es un entero mayor que 0, ENTONCES el
sistema DEBE lanzar `PricingError` con código `PRECIO_LISTA_INVALIDO`.

### [REQ-006] — Opcional (Optional feature)
DONDE se solicite representación textual, el sistema DEBE formatear los montos
con locale `es-PE`, moneda `PEN` y exactamente dos decimales.

## Contrato

```typescript
export type PricingErrorCode =
  | 'PRECIO_VENTA_INVALIDO'
  | 'PRECIO_LISTA_INVALIDO';

export interface CatalogPriceInput {
  precioVentaCentimos: number;
  precioListaCentimos?: number | null;
}

export interface CatalogPrice {
  precioVentaCentimos: number;
  precioListaCentimos: number | null;
  ahorroCentimos: number;
  descuentoPct: number;
  ofertaActiva: boolean;
}
```

## Invariantes verificables
- INV-1: `precioVentaCentimos + ahorroCentimos === precioListaCentimos`
         siempre que `ofertaActiva === true`.
- INV-2: `descuentoPct` ∈ [0, 99].
- INV-3: `ofertaActiva === false` ⟺ `precioListaCentimos === null`.
```

### 6.2 `.sdd/plans/SPEC-001.plan.md`

```markdown
# PLAN DE PRUEBAS — SPEC-001

Archivo destino: `tests/unit/pricing/catalog-price.test.ts`
Proyecto Vitest: `unit` · Umbral: líneas ≥95%, ramas ≥90%

## Matriz

| ID | Escenario | Entrada | Esperado | REQ |
| :-- | :-- | :-- | :-- | :-- |
| TEST-001 | Sin precio de lista | `{ venta: 21000 }` | `oferta:false, lista:null, ahorro:0, pct:0` | REQ-003 |
| TEST-002 | Oferta real (Soporte Trompeta) | `{ venta: 16000, lista: 18000 }` | `oferta:true, ahorro:2000, pct:11` | REQ-002 |
| TEST-003 | Oferta real (Soporte Clarinete) | `{ venta: 17500, lista: 20000 }` | `oferta:true, ahorro:2500, pct:12` | REQ-002 |
| TEST-004 | Lista igual a venta | `{ venta: 19000, lista: 19000 }` | `oferta:false, lista:null` | REQ-003 |
| TEST-005 | Lista menor que venta | `{ venta: 19000, lista: 17000 }` | `oferta:false, lista:null` | REQ-003 |
| TEST-006 | Lista explícitamente null | `{ venta: 18000, lista: null }` | `oferta:false` | REQ-003 |
| TEST-007 | Venta cero | `{ venta: 0 }` | lanza `PRECIO_VENTA_INVALIDO` | REQ-004 |
| TEST-008 | Venta negativa | `{ venta: -100 }` | lanza `PRECIO_VENTA_INVALIDO` | REQ-004 |
| TEST-009 | Venta decimal | `{ venta: 160.5 }` | lanza `PRECIO_VENTA_INVALIDO` | REQ-001, REQ-004 |
| TEST-010 | Lista decimal | `{ venta: 16000, lista: 180.5 }` | lanza `PRECIO_LISTA_INVALIDO` | REQ-005 |
| TEST-011 | Truncado del pct hacia abajo | `{ venta: 19999, lista: 20000 }` | `pct: 0` (no 1) | REQ-002 |
| TEST-012 | INV-1 en propiedad | 200 casos generados | `venta + ahorro === lista` | REQ-002 |
| TEST-013 | Formato PEN | `16000` | `"S/ 160.00"` | REQ-006 |
| TEST-014 | Formato PEN monto grande | `123456789` | `"S/ 1,234,567.89"` | REQ-006 |

## Reglas para el agente
- No añadir casos fuera de esta matriz sin actualizar antes la SPEC.
- No usar `toMatchSnapshot()`. Todas las aserciones son explícitas.
- TEST-012 usa generación determinista con semilla fija.
```

### 6.3 Fase RED — `tests/unit/pricing/catalog-price.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import {
  resolveCatalogPrice,
  formatPEN,
  PricingError,
} from '../../../src/lib/pricing/catalog-price';

describe('SPEC-001 · resolveCatalogPrice', () => {
  it('[TEST-001] sin precio de lista, la oferta queda inactiva (REQ-003)', () => {
    // Arrange
    const input = { precioVentaCentimos: 21000 }; // Sordina Trombón S/ 210.00

    // Act
    const precio = resolveCatalogPrice(input);

    // Assert
    expect(precio).toEqual({
      precioVentaCentimos: 21000,
      precioListaCentimos: null,
      ahorroCentimos: 0,
      descuentoPct: 0,
      ofertaActiva: false,
    });
  });

  it('[TEST-002] calcula ahorro y % con oferta activa (REQ-002)', () => {
    // Arrange — Soporte de Celular Trompeta: S/ 160.00 sobre S/ 180.00
    const input = { precioVentaCentimos: 16000, precioListaCentimos: 18000 };

    // Act
    const precio = resolveCatalogPrice(input);

    // Assert
    expect(precio).toEqual({
      precioVentaCentimos: 16000,
      precioListaCentimos: 18000,
      ahorroCentimos: 2000,
      descuentoPct: 11, // floor(2000*100/18000) = floor(11.11)
      ofertaActiva: true,
    });
  });

  it('[TEST-003] calcula ahorro y % con oferta activa, segundo caso (REQ-002)', () => {
    const precio = resolveCatalogPrice({
      precioVentaCentimos: 17500,
      precioListaCentimos: 20000,
    });

    expect(precio.ahorroCentimos).toBe(2500);
    expect(precio.descuentoPct).toBe(12); // floor(12.5)
    expect(precio.ofertaActiva).toBe(true);
  });

  it.each([
    ['igual a la venta', 19000, 19000],
    ['menor que la venta', 19000, 17000],
    ['explícitamente null', 18000, null],
  ])(
    '[TEST-004/005/006] precio de lista %s → oferta inactiva (REQ-003)',
    (_caso, venta, lista) => {
      const precio = resolveCatalogPrice({
        precioVentaCentimos: venta,
        precioListaCentimos: lista,
      });

      expect(precio.ofertaActiva).toBe(false);
      expect(precio.precioListaCentimos).toBeNull();
      expect(precio.ahorroCentimos).toBe(0);
      expect(precio.descuentoPct).toBe(0);
    }
  );

  it.each([
    ['cero', 0],
    ['negativo', -100],
    ['decimal', 160.5],
  ])(
    '[TEST-007/008/009] precio de venta %s lanza PRECIO_VENTA_INVALIDO (REQ-004)',
    (_caso, venta) => {
      expect(() =>
        resolveCatalogPrice({ precioVentaCentimos: venta })
      ).toThrowError(
        expect.objectContaining({
          name: 'PricingError',
          code: 'PRECIO_VENTA_INVALIDO',
        })
      );
    }
  );

  it('[TEST-010] precio de lista decimal lanza PRECIO_LISTA_INVALIDO (REQ-005)', () => {
    expect(() =>
      resolveCatalogPrice({
        precioVentaCentimos: 16000,
        precioListaCentimos: 180.5,
      })
    ).toThrowError(PricingError);
  });

  it('[TEST-011] el porcentaje se trunca hacia abajo, nunca se redondea (REQ-002)', () => {
    // 1 céntimo de ahorro sobre S/ 200.00 = 0.005% → debe ser 0, no 1
    const precio = resolveCatalogPrice({
      precioVentaCentimos: 19999,
      precioListaCentimos: 20000,
    });

    expect(precio.descuentoPct).toBe(0);
    expect(precio.ofertaActiva).toBe(true); // sigue habiendo ahorro real
  });

  it('[TEST-012] INV-1: venta + ahorro === lista, en 200 casos (REQ-002)', () => {
    // Generador determinista con semilla fija (Constitución 6.1)
    let seed = 20260821;
    const next = (max: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return (seed % max) + 1;
    };

    for (let i = 0; i < 200; i++) {
      const venta = next(500_00);
      const lista = venta + next(100_00);

      const precio = resolveCatalogPrice({
        precioVentaCentimos: venta,
        precioListaCentimos: lista,
      });

      expect(precio.precioVentaCentimos + precio.ahorroCentimos).toBe(lista);
      expect(precio.descuentoPct).toBeGreaterThanOrEqual(0);
      expect(precio.descuentoPct).toBeLessThan(100);
    }
  });
});

describe('SPEC-001 · formatPEN', () => {
  it('[TEST-013] formatea céntimos como moneda peruana (REQ-006)', () => {
    expect(formatPEN(16000)).toBe('S/ 160.00');
  });

  it('[TEST-014] agrupa miles correctamente (REQ-006)', () => {
    expect(formatPEN(123456789)).toBe('S/ 1,234,567.89');
  });
});
```

### 6.4 Fase GREEN — `src/lib/pricing/catalog-price.ts`

```ts
export type PricingErrorCode =
  | 'PRECIO_VENTA_INVALIDO'
  | 'PRECIO_LISTA_INVALIDO';

export class PricingError extends Error {
  readonly name = 'PricingError';
  constructor(readonly code: PricingErrorCode) {
    super(code);
  }
}

export interface CatalogPriceInput {
  precioVentaCentimos: number;
  precioListaCentimos?: number | null;
}

export interface CatalogPrice {
  precioVentaCentimos: number;
  precioListaCentimos: number | null;
  ahorroCentimos: number;
  descuentoPct: number;
  ofertaActiva: boolean;
}

/** REQ-001: solo enteros positivos en céntimos. */
function esCentimoValido(v: number): boolean {
  return Number.isInteger(v) && v > 0;
}

export function resolveCatalogPrice(input: CatalogPriceInput): CatalogPrice {
  const { precioVentaCentimos, precioListaCentimos } = input;

  // REQ-004
  if (!esCentimoValido(precioVentaCentimos)) {
    throw new PricingError('PRECIO_VENTA_INVALIDO');
  }

  // REQ-005
  if (
    precioListaCentimos !== undefined &&
    precioListaCentimos !== null &&
    !esCentimoValido(precioListaCentimos)
  ) {
    throw new PricingError('PRECIO_LISTA_INVALIDO');
  }

  const tieneOferta =
    precioListaCentimos != null && precioListaCentimos > precioVentaCentimos;

  // REQ-003
  if (!tieneOferta) {
    return {
      precioVentaCentimos,
      precioListaCentimos: null,
      ahorroCentimos: 0,
      descuentoPct: 0,
      ofertaActiva: false,
    };
  }

  // REQ-002 — aritmética entera exclusivamente
  const lista = precioListaCentimos as number;
  const ahorroCentimos = lista - precioVentaCentimos;
  const descuentoPct = Math.floor((ahorroCentimos * 100) / lista);

  return {
    precioVentaCentimos,
    precioListaCentimos: lista,
    ahorroCentimos,
    descuentoPct,
    ofertaActiva: true,
  };
}

/** REQ-006 */
const FORMATTER = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPEN(centimos: number): string {
  // Intl usa NBSP tras el símbolo; se normaliza a espacio simple.
  return FORMATTER.format(centimos / 100).replace(/\u00A0/g, ' ');
}
```

> **Observa lo que NO hay:** no hay `INVALID_PRICE` genérico, no hay códigos promocionales extra, no hay redondeo "por si acaso". Cada rama del código apunta a un REQ. Esa es la diferencia práctica entre SDD real y SDD decorativo.

---

## 7. Componentes `.astro` con Container API

La API sigue siendo **experimental** en Astro 7 (`experimental_AstroContainer`). Puede romper en versiones menores; ancla la versión de `astro` en `package.json` y revisa el CHANGELOG al actualizar.

### 7.1 `src/components/catalogo/PrecioProducto.astro`

```astro
---
import { resolveCatalogPrice, formatPEN } from '../../lib/pricing/catalog-price';

interface Props {
  precioVentaCentimos: number;
  precioListaCentimos?: number | null;
}

// Constitución 1.2: el frontmatter orquesta, no calcula.
const precio = resolveCatalogPrice(Astro.props);
---

<div class="precio" data-testid="precio">
  <span data-testid="precio-venta">{formatPEN(precio.precioVentaCentimos)}</span>

  {precio.ofertaActiva && (
    <>
      <s data-testid="precio-lista">{formatPEN(precio.precioListaCentimos!)}</s>
      <span data-testid="badge-descuento">-{precio.descuentoPct}%</span>
    </>
  )}
</div>
```

### 7.2 `tests/components/precio-producto.test.ts`

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import PrecioProducto from '../../src/components/catalogo/PrecioProducto.astro';

describe('SPEC-001 · PrecioProducto.astro', () => {
  let container: Awaited<ReturnType<typeof AstroContainer.create>>;

  beforeAll(async () => {
    container = await AstroContainer.create();
  });

  it('[TEST-C01] muestra precio tachado y badge cuando hay oferta (REQ-002)', async () => {
    const html = await container.renderToString(PrecioProducto, {
      props: { precioVentaCentimos: 16000, precioListaCentimos: 18000 },
    });

    expect(html).toContain('S/ 160.00');
    expect(html).toContain('S/ 180.00');
    expect(html).toContain('-11%');
  });

  it('[TEST-C02] no filtra el precio de lista cuando no hay oferta (REQ-003)', async () => {
    const html = await container.renderToString(PrecioProducto, {
      props: { precioVentaCentimos: 19000, precioListaCentimos: 19000 },
    });

    expect(html).toContain('S/ 190.00');
    expect(html).not.toContain('badge-descuento');
    expect(html).not.toContain('<s');
  });

  it('[TEST-C03] propaga PricingError sin renderizar HTML parcial (REQ-004)', async () => {
    await expect(
      container.renderToString(PrecioProducto, {
        props: { precioVentaCentimos: -1 },
      })
    ).rejects.toThrow('PRECIO_VENTA_INVALIDO');
  });
});
```

### 7.3 Si el componente monta una isla React

```ts
import { getContainerRenderer } from '@astrojs/react';
import { loadRenderers } from 'astro:container';

const renderers = await loadRenderers([getContainerRenderer()]);
const container = await AstroContainer.create({ renderers });
```

Ojo: la Container API **renderiza el HTML del servidor**. No ejecuta la hidratación cliente. Los `onClick`, el estado de React y las view transitions **no se prueban aquí** — eso es Playwright (fuera del alcance de este documento, pero anótalo como SPEC futura).

---

## 8. Endpoints con R2 y Supabase dentro de workerd

### 8.1 El puerto (Capa 1, testeable sin I/O)

```ts
// src/lib/ports/product-repo.ts
export interface ProductoResumen {
  sku: string;
  slug: string;
  nombre: string;
  categoria: string;
  precioVentaCentimos: number;
  precioListaCentimos: number | null;
  imagenKey: string;
}

export interface ProductRepo {
  listarPorCategoria(categoria: string): Promise<ProductoResumen[]>;
  obtenerPorSlug(slug: string): Promise<ProductoResumen | null>;
}
```

### 8.2 El fake (NO un mock de supabase-js)

```ts
// tests/fakes/fake-product-repo.ts
import type { ProductRepo, ProductoResumen } from '../../src/lib/ports/product-repo';

export class FakeProductRepo implements ProductRepo {
  constructor(private readonly datos: ProductoResumen[] = []) {}

  async listarPorCategoria(categoria: string) {
    return this.datos.filter((p) => p.categoria === categoria);
  }

  async obtenerPorSlug(slug: string) {
    return this.datos.find((p) => p.slug === slug) ?? null;
  }
}

export const PRODUCTOS_DE_PRUEBA: ProductoResumen[] = [
  {
    sku: '5000',
    slug: 'soporte-de-celular-trompeta-5000',
    nombre: 'Soporte de Celular Trompeta',
    categoria: 'trompeta',
    precioVentaCentimos: 16000,
    precioListaCentimos: 18000,
    imagenKey: 'productos/5000/principal.webp',
  },
  {
    sku: '5011',
    slug: 'sordina-para-trompeta-5011',
    nombre: 'Sordina para Trompeta',
    categoria: 'trompeta',
    precioVentaCentimos: 19000,
    precioListaCentimos: null,
    imagenKey: 'productos/5011/principal.webp',
  },
];
```

### 8.3 Test en workerd con binding R2 real

```ts
// tests/workers/imagen-producto.test.ts
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:workers';
import { describe, it, expect, beforeAll } from 'vitest';
import { GET } from '../../src/pages/api/imagen/[key].ts';

describe('SPEC-002 · GET /api/imagen/[key]', () => {
  beforeAll(async () => {
    // Arrange: sembrar el bucket R2 REAL de Miniflare.
    // Constitución 5.1: no se mockea el binding.
    await env.PRODUCT_IMAGES.put(
      'productos/5000/principal.webp',
      new Uint8Array([0x52, 0x49, 0x46, 0x46]), // cabecera RIFF/WEBP
      { httpMetadata: { contentType: 'image/webp' } }
    );
  });

  it('[TEST-W01] devuelve la imagen con cache inmutable (REQ-201)', async () => {
    const ctx = createExecutionContext();
    const request = new Request(
      'https://barzol.test/api/imagen/productos/5000/principal.webp'
    );

    const response = await GET({ request, params: { key: 'productos/5000/principal.webp' }, locals: { runtime: { env } } } as never);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(response.headers.get('cache-control')).toContain('immutable');
  });

  it('[TEST-W02] devuelve 404 sin filtrar la key solicitada (REQ-202)', async () => {
    const response = await GET({
      request: new Request('https://barzol.test/api/imagen/no-existe.webp'),
      params: { key: 'no-existe.webp' },
      locals: { runtime: { env } },
    } as never);

    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain('no-existe.webp');
  });

  it('[TEST-W03] rechaza path traversal (REQ-203)', async () => {
    const response = await GET({
      request: new Request('https://barzol.test/api/imagen/../secreto'),
      params: { key: '../secreto' },
      locals: { runtime: { env } },
    } as never);

    expect(response.status).toBe(400);
  });
});
```

### 8.4 Supabase en tests de Capa 3

Aquí hay una decisión que debes tomar conscientemente:

| Opción | Cuándo usarla | Coste |
| :--- | :--- | :--- |
| **A. Fake del puerto** (§8.2) | Tests unitarios de lógica que consume el repo | Nulo. Rápido. **No prueba tu SQL ni tu RLS.** |
| **B. MSW interceptando PostgREST** | Tests del adaptador: verificar que construyes bien la query | Medio. `fetchMock` de `cloudflare:test` fue eliminado, MSW es el reemplazo. |
| **C. Supabase local real** (`supabase start`) | Tests de integración del adaptador + pgTAP para RLS | Alto en CI (~40-60s de arranque). Es el único que prueba de verdad. |

Mi recomendación para barzol-web: **A para todo lo unitario, C solo en el job de CI de base de datos (§9)**. B lo saltas — añade una capa de fixtures HTTP que se desincroniza del esquema real y da la falsa confianza que SDD intenta eliminar.

---

## 9. Gate de RLS con pgTAP (el que casi nadie pone)

Una política RLS mal escrita **no lanza error**: devuelve las filas equivocadas. Demasiado estricta → tu catálogo aparece vacío. Demasiado laxa → expones datos del panel de administración. Ninguna de las dos rompe el build. Por eso necesita su propio gate.

```sql
-- supabase/tests/010-rls-productos.sql
begin;
select plan(4);

-- El catálogo público debe ser legible por anon
select tests.clear_authentication();
select isnt_empty(
  $$ select slug from public.productos where publicado = true $$,
  'REQ-901: anon puede leer productos publicados'
);

-- Los borradores NO
select is_empty(
  $$ select slug from public.productos where publicado = false $$,
  'REQ-902: anon NO ve productos despublicados'
);

-- anon no puede escribir
select is_empty(
  $$ update public.productos set precio_venta_centimos = 1 returning slug $$,
  'REQ-903: anon NO puede modificar precios'
);

-- Toda tabla del esquema public tiene RLS activo
select tests.rls_enabled('public');

select * from finish();
rollback;
```

Ejecución: `supabase test db`. Cada test corre en su propia transacción y hace rollback, así que es idempotente.

Vale la pena añadir el helper de Basejump (`basejump-supabase_test_helpers` vía `dbdev`) — `tests.create_supabase_user()`, `tests.authenticate_as()` y `tests.rls_enabled()` te ahorran cientos de líneas de setup manual.

---

## 10. Capa Claude Code

### 10.1 Reparto de modelos

| Rol | Modelo | Motivo |
| :--- | :--- | :--- |
| Autoría de SPEC (EARS) | **Opus 5** | Razonamiento sobre casos límite e invariantes. Es donde el error sale más caro. |
| Plan de pruebas | **Opus 5** | Diseñar la matriz completa es más difícil que escribirla. |
| Fase RED (escribir tests) | **Sonnet 5** | Trabajo mecánico desde una matriz cerrada. |
| Fase GREEN (implementar) | **Sonnet 5** | Ídem. |
| Verifier / auditoría de deriva | **Opus 5**, sin permisos de escritura | Debe poder decir "esto no cumple", no arreglarlo. |
| Refactor de arquitectura | **Opus 5** | Toca múltiples capas. |

En Claude Code, Sonnet 5 es el modelo por defecto; cambias con `/model opus` o fijas el modelo por subagente en el frontmatter.

### 10.2 `CLAUDE.md`

```markdown
# barzol-web — Contexto para Claude Code

Catálogo web de **Barzol 3D Industry S.A.C.** (Ayacucho, Perú).
Accesorios musicales impresos en 3D: soportes de celular, sordinas, BERP.

## Stack (agosto 2026)
- Astro 7.1.x · React (solo islas) · Tailwind
- Despliegue: **Cloudflare Workers con static assets** (NO Pages)
- Adaptador: `@astrojs/cloudflare` v14
- Datos: Supabase (Postgres + RLS) · Imágenes: R2 (`PRODUCT_IMAGES`)
- Node >= 22.12.0 · npm · dev en localhost:4321

## Reglas no negociables
Lee `.sdd/CONSTITUTION.md` ANTES de escribir cualquier archivo.
Las reglas siempre activas están en `.claude/rules/`.

## Flujo obligatorio
Ningún código de producción sin spec aprobada. El ciclo es:
`/sdd-spec` → revisión humana → `/sdd-red` → `/sdd-green` → `/sdd-verify`

## Errores frecuentes en este repo — no los repitas
- Cloudflare **Pages** está descontinuado para este proyecto. Es Workers.
- `@vitest/coverage-v8` NO funciona dentro de workerd. Usa Istanbul allí.
- No mockees bindings de R2/KV. Usa los reales de Miniflare.
- Dinero en céntimos enteros. Nunca floats.
- La Container API de Astro es experimental. Verifica el CHANGELOG al subir versión.

## Documentos de referencia
- `ARCHITECTURE.md` — estructura de carpetas y decisiones técnicas
- `.sdd/specs/` — fuente de verdad del comportamiento
- `.sdd/GLOSSARY.md` — vocabulario de dominio (tudel, BERP, sordina, SKU)

## Comunicación
Explica los cambios en formato **antes → después**. Marca explícitamente
cualquier supuesto que hayas tenido que asumir. Español.
```

### 10.3 `.claude/rules/sdd.md`

```markdown
---
alwaysApply: true
---

# Regla SDD

Antes de crear o modificar cualquier archivo bajo `src/`:

1. Localiza la SPEC que lo cubre en `.sdd/specs/`.
2. Si no existe → DETENTE. Propón la SPEC y espera aprobación humana.
   No escribas código "provisional" ni "para probar".
3. Si existe pero no cubre lo que te piden → DETENTE. Propón una enmienda
   a la SPEC como diff. No la apliques tú.
4. Todo test que escribas lleva `[TEST-NNN]` y cita sus `REQ-NNN`.
5. Toda rama condicional del código de producción debe rastrear a un REQ.
   Si añades una rama sin REQ, es deriva arquitectónica: elimínala.

Frase prohibida: "por si acaso", "por robustez", "para mayor seguridad"
como justificación de código no especificado.
```

### 10.4 `.claude/rules/money.md`

```markdown
---
alwaysApply: true
---

# Regla de dinero

Todo monto en este repo es un **entero de céntimos**.

- S/ 160.00 → `16000`
- Nombres de variable/columna terminan en `Centimos` / `_centimos`
- Prohibido: `parseFloat`, `toFixed` sobre precios, `*  0.18`, `/ 100` fuera
  de `formatPEN()`
- Los porcentajes se calculan con `Math.floor((parte * 100) / total)`
- Moneda: PEN. Locale: es-PE.

Si un dato entra como decimal desde Supabase, se convierte a céntimos en el
adaptador con `Math.round(valor * 100)` y se valida con `Number.isInteger`.
```

### 10.5 Subagente verificador — `.claude/agents/verifier.md`

Este es el componente que le faltaba al material original.

```markdown
---
name: verifier
description: Audita cumplimiento SDD antes de cerrar cualquier tarea. Verifica trazabilidad REQ↔TEST↔código y detecta deriva arquitectónica. Invócalo tras cada fase GREEN.
model: opus
effort: high
maxTurns: 15
disallowedTools: Write, Edit, NotebookEdit
---

Eres el auditor SDD de barzol-web. **No corriges nada.** Solo dictaminas.

## Procedimiento

1. Lee `.sdd/CONSTITUTION.md`.
2. Lee la SPEC y el PLAN de la feature en revisión.
3. Ejecuta: `npm run typecheck && npm run test:cov`
4. Construye la tabla de trazabilidad:

   | REQ | ¿Tiene test? | ¿Tiene código? | Estado |

5. Recorre el código de producción **rama por rama** y pregunta de cada una:
   ¿a qué REQ corresponde? Si no corresponde a ninguno → **DERIVA**.
6. Revisa los tests buscando estos antipatrones:
   - `toHaveBeenCalledWith` donde existía una aserción observable
   - mocks de bindings Cloudflare o de `@supabase/supabase-js`
   - `toMatchSnapshot()`
   - tests sin `[TEST-NNN]`
   - tests que solo verifican que un mock devuelve lo que se le configuró
7. Verifica los umbrales de cobertura POR CAPA, no el global.

## Salida

VEREDICTO: APROBADO | RECHAZADO

Si RECHAZADO, lista cada hallazgo así:
  [DERIVA]      src/lib/x.ts:42 — rama sin REQ asociado
  [TEST-DEBIL]  tests/unit/y.test.ts:18 — asertando sobre mock
  [HUECO]       REQ-005 sin test que lo cubra
  [COBERTURA]   src/lib/pricing: ramas 84% < 90% requerido

No propongas el arreglo. No edites archivos. Reporta y termina.
```

### 10.6 Hook de guardia — `.claude/hooks/guard-no-src-without-spec.sh`

Los hooks son la única capa **determinista**: no dependen de que el modelo recuerde la regla.

```bash
#!/usr/bin/env bash
# PreToolUse sobre Write|Edit
# Exit 2 = deniega la llamada. Exit 0 = permite.
set -euo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[[ -z "$FILE" ]] && exit 0

# Solo vigilamos lógica de negocio y endpoints
if [[ "$FILE" != *"/src/lib/"* && "$FILE" != *"/src/pages/api/"* ]]; then
  exit 0
fi

# Los puertos son contratos, se permiten
[[ "$FILE" == *"/src/lib/ports/"* ]] && exit 0

if ! ls .sdd/specs/SPEC-*.md >/dev/null 2>&1; then
  echo "BLOQUEADO: no existe ninguna SPEC en .sdd/specs/. Constitución Regla 2.1" >&2
  exit 2
fi

# ¿Alguna spec o plan menciona este archivo?
BASE=$(basename "$FILE")
if ! grep -rqF "$BASE" .sdd/specs/ .sdd/plans/ 2>/dev/null; then
  echo "BLOQUEADO: '$BASE' no aparece en ninguna SPEC ni PLAN." >&2
  echo "Escribe primero la especificación. Constitución Regla 2.1 / 2.4" >&2
  exit 2
fi

exit 0
```

**Y el hook de cierre** — impide que el agente declare "listo" con el suite en rojo:

```bash
#!/usr/bin/env bash
# .claude/hooks/gate-on-stop.sh  ·  hook Stop
set -euo pipefail

if ! npm run typecheck --silent >/dev/null 2>&1; then
  echo "GATE: typecheck falla. La tarea NO está terminada." >&2
  exit 2
fi

if ! npm run test --silent >/dev/null 2>&1; then
  echo "GATE: hay tests en rojo. La tarea NO está terminada." >&2
  exit 2
fi

exit 0
```

### 10.7 `.claude/settings.json`

```jsonc
{
  "permissions": {
    "allow": [
      "Bash(npm run test*)",
      "Bash(npm run typecheck)",
      "Bash(npx vitest*)",
      "Bash(supabase test db)",
      "Bash(npx wrangler types)"
    ],
    "deny": [
      "Bash(npx wrangler deploy*)",
      "Bash(supabase db push*)",
      "Bash(git push*)",
      "Read(./.dev.vars)",
      "Read(./.env*)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": ".claude/hooks/guard-no-src-without-spec.sh" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": ".claude/hooks/gate-on-stop.sh" }
        ]
      }
    ]
  }
}
```

> `wrangler deploy`, `supabase db push` y `git push` en la lista de denegación es deliberado. El agente escribe y prueba; **publicar es decisión humana**. Con el modo Auto activo por defecto desde agosto de 2026, esta lista es lo que separa "agente productivo" de "agente que despliega un catálogo roto un sábado".

### 10.8 Comando `/sdd-red` — `.claude/commands/sdd-red.md`

```markdown
---
description: Fase RED — escribe los tests desde el PLAN, sin tocar src/
argument-hint: <SPEC-NNN>
---

Fase RED de SDD para $1.

1. Lee `.sdd/CONSTITUTION.md`, `.sdd/specs/$1-*.md` y `.sdd/plans/$1.plan.md`.
2. Escribe ÚNICAMENTE los archivos de test que indica el PLAN, en el proyecto
   Vitest que corresponda a la capa (unit / components / workers).
3. Implementa exactamente los casos de la matriz. Ni uno más, ni uno menos.
4. Cada `it()` empieza con `[TEST-NNN]` y nombra sus `(REQ-NNN)`.
5. Estructura AAA con comentarios `// Arrange`, `// Act`, `// Assert`.
6. NO crees ni modifiques nada bajo `src/`. Los imports apuntarán a módulos
   que aún no existen — eso es correcto en esta fase.
7. Ejecuta el suite y confirma que falla por "módulo no encontrado" o
   "no es una función", NO por errores de sintaxis en el test.
8. Reporta: cuántos tests, cuáles REQ cubiertos, cuáles REQ sin cubrir.

Si el PLAN tiene huecos respecto a la SPEC, DETENTE y repórtalos.
No los rellenes por tu cuenta.
```

---

## 11. CI/CD — `.github/workflows/sdd-gate.yml`

```yaml
name: SDD Gate

on:
  push:
    branches: [main, develop]
  pull_request:

concurrency:
  group: sdd-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ── Gate 1 · lógica y componentes (rápido, ~40s) ─────────────────
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22.12.0
          cache: npm

      - run: npm ci

      - name: Typecheck estricto
        run: npm run typecheck

      - name: Tests Capa 1 y 2
        run: npx vitest run --project unit --project components --coverage

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-node
          path: coverage/

  # ── Gate 2 · workerd (más lento, bindings reales) ────────────────
  workers:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22.12.0
          cache: npm

      - run: npm ci

      - name: Generar tipos de bindings
        run: npx wrangler types

      - name: Tests Capa 3 en workerd
        # Istanbul obligatorio: v8 no funciona dentro de workerd
        run: npx vitest run --project workers --coverage --coverage.provider=istanbul

  # ── Gate 3 · RLS en Postgres ─────────────────────────────────────
  database:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Levantar stack local
        run: supabase start

      - name: Lint de esquema
        run: supabase db lint --fail-on warning

      - name: Tests pgTAP (RLS)
        run: supabase test db

  # ── Gate 4 · trazabilidad SDD ────────────────────────────────────
  traceability:
    runs-on: ubuntu-latest
    needs: [unit, workers]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22.12.0
          cache: npm
      - run: npm ci

      - name: Todo REQ debe tener al menos un TEST
        run: |
          FALLOS=0
          for spec in .sdd/specs/SPEC-*.md; do
            for req in $(grep -oE 'REQ-[0-9]{3}' "$spec" | sort -u); do
              if ! grep -rq "$req" tests/; then
                echo "::error file=$spec::$req no está cubierto por ningún test"
                FALLOS=1
              fi
            done
          done
          exit $FALLOS

      - name: Ningún archivo en src/lib sin spec
        run: |
          FALLOS=0
          for f in $(find src/lib -name '*.ts' -not -path '*/ports/*'); do
            BASE=$(basename "$f")
            if ! grep -rqF "$BASE" .sdd/specs/ .sdd/plans/; then
              echo "::error file=$f::sin SPEC asociada (Constitución 2.1)"
              FALLOS=1
            fi
          done
          exit $FALLOS

  # ── Despliegue: solo main, solo si TODO pasó ─────────────────────
  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: [unit, workers, database, traceability]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22.12.0
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Deploy a Cloudflare Workers
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

> **Alternativa:** si prefieres **Workers Builds** (el CI nativo de Cloudflare conectado a Git), quita el job `deploy` y deja los gates 1-4 en GitHub Actions. Cuidado con el fallo clásico de la migración a Astro 7: quedarte con el build de Pages apuntando al dominio mientras Workers Builds publica a otro sitio, y que "merge a main" deje de significar "producción actualizada". Verifica a qué apunta tu dominio antes de tocar nada.

---

## 12. Plan de adopción (4 semanas, sin parar el proyecto)

No intentes especificar el repo entero. Eso muere en la semana 2.

| Semana | Qué haces | Criterio de salida |
| :--- | :--- | :--- |
| **1** | Infra: `vitest.config.ts` con 3 proyectos, setups, `CLAUDE.md`, `.claude/rules/`. Una SPEC piloto (precios). | `npm test` corre en verde con ≥1 test por capa |
| **2** | Constitución v2 + hook `guard-no-src-without-spec.sh` + subagente `verifier`. Especifica retroactivamente **solo** `src/lib/`. | El hook bloquea un intento real de escribir sin spec |
| **3** | Gates de CI 1, 2 y 4. pgTAP para las 3-4 tablas críticas. | Un PR es rechazado automáticamente por falta de trazabilidad |
| **4** | Comandos `/sdd-*`, subagentes por fase, gate 3 en CI. Retro: ¿qué regla se saltó más? | Una feature completa entra por el ciclo entero sin intervención manual |

**Señal de que va bien:** en la semana 3 empiezas a escribir la SPEC porque es más rápido que discutir con el agente, no porque el hook te obligue.

**Señal de que va mal:** las SPECs se escriben después del código para pasar el gate. Si eso pasa, el problema no es el proceso — es que estás especificando cosas demasiado triviales. Sube el grano: una SPEC por unidad de negocio, no por archivo.

---

## 13. Supuestos y verificaciones pendientes

Marcado explícitamente porque no tengo acceso a tu repo:

**Supuestos que hice:**
1. Tu catálogo vive en Supabase con una tabla `productos` que tiene precio de venta y precio de lista. Lo deduje de que tu sitio muestra `S/ 160.00` tachando `S/ 180.00`.
2. Las imágenes de producto están en R2 con un binding tipo `PRODUCT_IMAGES`. No pude verificar el nombre real del binding.
3. Los precios se almacenan hoy como `numeric`/decimal en Postgres, no como enteros. Si es así, la Regla 3 requiere **una migración** — no solo cambios en TypeScript.
4. Usas npm (tu memoria de proyecto lo indica), no pnpm. Los ejemplos de CI están en npm.
5. Tu panel de administración usa Supabase Auth. Si usa otra cosa, los tests pgTAP de §9 cambian.

**Cosas que debes verificar antes de instalar:**
- **El nombre del paquete de Cloudflare.** `@cloudflare/vitest-pool-workers` fue renombrado a `@cloudflare/vitest-plugin` (v1) hace aproximadamente un día. Comprueba cuál resuelve tu registry y si el codemod ya está publicado.
- **`test.projects` en Vitest 4.** El archivo `vitest.workspace.ts` quedó obsoleto en favor de `test.projects`. Confirma la sintaxis exacta contra los docs de tu versión menor.
- **Container API en Astro 7.1.3.** Sigue siendo `experimental_AstroContainer`. Revisa el CHANGELOG de Astro en cada subida de versión menor — puede romper sin previo aviso.
- **`compatibility_date`.** Usé `2026-08-01`. Ponla a la fecha de tu despliegue real y mantenla sincronizada entre `wrangler.jsonc` y el adaptador.
- **Umbrales de cobertura.** Los números de §2 (95/80/70) son un punto de partida razonable, no una verdad. Mídelos primero una semana, después fíjalos.

**Lo que este documento deliberadamente NO cubre:**
- Tests E2E (Playwright) para hidratación de islas, view transitions y el flujo de búsqueda.
- Tests de rendimiento / Core Web Vitals.
- Tests de accesibilidad.
- Contract testing entre el Worker y Supabase.

Los cuatro son necesarios eventualmente. Meterlos ahora convertiría este documento en algo que nadie implementa.

---

## Apéndice A — Comparativa: Vibe Coding libre vs. bajo SDD

| Dimensión | Vibe Coding sin control | Vibe Coding bajo SDD |
| :--- | :--- | :--- |
| Punto de partida | "Hazme un calculador de precios" | `/sdd-red SPEC-001` |
| Fuente de verdad | El último prompt | `.sdd/specs/` versionado en git |
| Control de calidad | Revisión visual en el navegador | 4 gates en CI + subagente verificador |
| Manejo de contexto | El modelo inventa contratos | Contratos declarados en la SPEC |
| Detección de deriva | Ninguna | Auditoría rama-por-rama contra REQ |
| Determinismo de tests | Mocks que se validan a sí mismos | Bindings reales de Miniflare + fakes de puerto |
| Resistencia al escalar | Se rompe hacia el prompt 10 | Coherente a lo largo de cientos de commits |
| Coste de un modelo nuevo | Reescribir todo el prompt | Cambiar una línea de frontmatter |

## Apéndice B — Checklist de revisión de PR

```
[ ] Existe SPEC aprobada para todo lo tocado en src/
[ ] Todo REQ nuevo tiene ≥1 TEST que lo cita
[ ] Toda rama del código de producción rastrea a un REQ
[ ] Ningún mock de binding Cloudflare ni de supabase-js
[ ] Ningún `any`, ningún `as unknown as`
[ ] Montos en céntimos enteros; formateo solo en el borde
[ ] Umbrales de cobertura por capa respetados
[ ] pgTAP verde si se tocaron políticas RLS
[ ] `wrangler types` regenerado si cambiaron bindings
[ ] compatibility_date sin cambios inesperados
```

---

*Documento generado el 21 de agosto de 2026. Las versiones de Astro, Vitest y las herramientas de Cloudflare se mueven rápido — vuelve a verificar §13 antes de cada actualización mayor.*
