# Matriz de trazabilidad — SPEC ↔ TEST ↔ código

> **Estado:** manual. La automatiza `scripts/sdd-trace.mjs` (`BZ-66`).
> **Última actualización:** 2026-08-21

Mientras sea manual, esta tabla **es un documento, no un gate**: se desactualiza en
cuanto alguien olvide tocarla. Por eso `BZ-66` no es opcional — un gate de
trazabilidad que depende de la memoria humana ya falló antes de escribirse.

---

## Estado por SPEC

| SPEC | Capa | Código | Tests | Estado |
| :--- | :--- | :--- | :--- | :--- |
| SPEC-001 · Precio de catálogo | 1 | ⬜ `src/shared/lib/pricing/catalogPrice.ts` | ⬜ | Especificada, sin implementar |
| SPEC-002 · Claves R2 | 1 | ✅ `src/shared/lib/storage/mediaKey.ts` | ⬜ | Código existe, sin tests. REQ-208 pendiente |
| SPEC-003 · Slug público | 1 | 🔶 duplicado en 2 mappers | ⬜ | Código existe **mal ubicado** |
| SPEC-900 · Gates CI/CD | Plataforma | ⬜ `.github/workflows/sdd-gate.yml` | ⬜ | Sin empezar |
| SPEC-901 · Humo post-deploy | Plataforma | ⬜ `scripts/smoke.mjs` | ⬜ | Sin empezar |
| SPEC-902 · RLS | 4 | 🔶 policies aplicadas, sin verificar | ⬜ `supabase/tests/` | **P0** — `BZ-50` |

Leyenda: ✅ existe y cumple · 🔶 existe con reservas · ⬜ no existe

## Requisitos sin cobertura

Todos, hoy. `tests/` no existe. La tabla se completa a medida que avanzan `BZ-57`
a `BZ-70`.

| REQ | SPEC | Bloqueado por |
| :--- | :--- | :--- |
| REQ-001..007 | SPEC-001 | `BZ-57` (infra de tests) |
| REQ-201..207 | SPEC-002 | `BZ-57` |
| REQ-208 | SPEC-002 | `BZ-62` |
| REQ-301..305 | SPEC-003 | `BZ-57`, `BZ-61` |
| REQ-901..911 | SPEC-900 | `BZ-65`, `BZ-66`, `BZ-68` |
| REQ-951..961 | SPEC-901 | `BZ-67`, y `BZ-72` antes |
| REQ-921..930 | SPEC-902 | `BZ-70` |

## Código en `src/shared/lib/` sin SPEC

Lo que el gate 4 (REQ-905b) reportaría hoy. **No es una lista de tareas**: es el
inventario de lo que queda por especificar, y especificarlo entero de golpe es
justo lo que hace fracasar la adopción de SDD en la segunda semana.

| Archivo | Prioridad de especificación | Motivo |
| :--- | :--- | :--- |
| `productos/productoMapper.ts` | **Alta** | Deriva la categoría subiendo por `parent_category_id`. Es la lógica más sutil del repo |
| `categorias/categoriaMapper.ts` | **Alta** | Anida subcategorías; alimenta toda la navegación |
| `validation/*.ts` | Media | Esquemas Zod — el contrato ya está en el propio esquema |
| `storage/mediaUrl.ts` | Media | Construye URLs públicas de R2 |
| `env/serverEnv.ts` | Media | 183 líneas, causa raíz de `BZ-04` y `BZ-33` |
| `errors/logServerError.ts` | Media | Relacionado con `BZ-14` (fuga de mensajes internos) |
| `*/`*`Service.ts` | Baja | Orquestación; se prueban en Capa 3 con fakes |
| `media/imageOptimizer.ts` | Baja | — |
| `build/buildInfo.ts` | Baja | — |
| `env/nombresParecidos.ts` | Baja | Heurística de ayuda al diagnóstico, no de negocio |

**Orden sugerido:** los dos mappers primero. Son puros, son la lógica que más
decisiones sutiles concentra, y no tienen ninguna dependencia de infraestructura —
se pueden especificar y probar el mismo día en que exista `npm test`.
