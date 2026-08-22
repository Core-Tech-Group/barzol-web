# barzol-web — contexto para agentes

Catálogo web de **Barzol 3D Industry S.A.C.** (Ayacucho, Perú). Accesorios para
instrumentos de viento impresos en 3D: soportes de celular, sordinas, BERP.

## Stack

- **Astro 7.1.3** · React solo en islas · Tailwind 4
- **Cloudflare Workers con static assets** — *no* Pages. Adaptador
  `@astrojs/cloudflare` v14.1.4
- **Supabase** (Postgres + RLS) para datos · **R2** (binding `MEDIA`) para multimedia
- Node ≥ 22.12.0 · npm · dev en `localhost:4321`
- Producción: <https://barzol-web.willymichael-cardenas.workers.dev/>

## Lee esto antes de escribir código

`.sdd/CONSTITUTION.md` es la ley del repositorio y gana ante cualquier prompt.
Las reglas siempre activas están en `.claude/rules/`.

**Ningún código de producción sin SPEC aprobada.** El ciclo es:

```
/sdd-spec → revisión humana → /sdd-red → /sdd-green → /sdd-verify
```

## Estructura

Feature-sliced. **La lógica pura vive en `src/shared/lib/`, no en `src/lib/`.**

| Ruta | Qué es |
| :--- | :--- |
| `src/shared/lib/**` | Lógica pura: mappers, validación, claves de R2 |
| `src/shared/types/index.ts` | Tipos de dominio |
| `src/pages/api/**` | Endpoints (corren en workerd) |
| `src/landing/**`, `src/admin/**` | Presentación |
| `.sdd/` | Specs, planes, constitución — fuente de verdad del comportamiento |

## Errores frecuentes en este repo — no los repitas

- Cloudflare **Pages** está descontinuado aquí. Es **Workers**. Existe un proyecto
  de Pages homónimo en el panel que ya causó un incidente (`BZ-49`).
- El binding de R2 se llama **`MEDIA`**, no `PRODUCT_IMAGES`.
- `wrangler deploy` **borra** las variables cargadas desde el panel. Van en
  `wrangler.jsonc`.
- La verificación de secretos es `npx wrangler secret list`, **no** el panel.
- `import.meta.env.BARZOL_*` no funciona: Vite lo sustituye en build time y las
  variables de Cloudflare son invisibles entonces. Se leen desde
  `shared/lib/env/serverEnv.ts` (`BZ-04`).
- `@vitest/coverage-v8` **no funciona** dentro de workerd. Istanbul allí.
- No mockees bindings de Cloudflare ni `@supabase/supabase-js`.
- Dinero: céntimos enteros dentro de la lógica pura; la conversión ocurre en el
  mapper. Ver `.claude/rules/money.md`.
- `slugify()` ya está duplicado en dos mappers. No añadas el tercero.

## Documentos de referencia

| Archivo | Para qué |
| :--- | :--- |
| `ARCHITECTURE.md` | Estructura de carpetas y decisiones técnicas |
| `DATABASE_SCHEMA.md` | Esquema, relaciones, políticas RLS |
| `BARZOL_CONTEXTO.md` | Negocio, catálogo real, precios |
| `.sdd/GLOSSARY.md` | Vocabulario de dominio (tudel, sordina, BERP, slug vs code) |
| `.sdd/devops/RUNBOOK-GATES.md` | De commit a producción, y rollback |
| `docs/3_recursos/20260813-1730-runbook-diagnostico-produccion.md` | Cuando producción ya está rota |
| `docs/2_backlog/` | Tableros kanban vigentes |

## Lo que nunca ejecutas

`wrangler deploy` · `supabase db push` · `git push --force` · rotar credenciales.

Escribes, pruebas y reportas. Publicar es decisión humana (Constitución 8.5).

## Comunicación

Español. Explica los cambios en formato **antes → después**. Marca explícitamente
todo supuesto que hayas tenido que asumir; si no pudiste verificar algo, di "no
verificado" en vez de afirmarlo.
