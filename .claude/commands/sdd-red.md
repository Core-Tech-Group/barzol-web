---
description: Fase RED — escribe los tests desde el PLAN, sin tocar src/
argument-hint: <SPEC-NNN>
---

Fase RED de SDD para $1.

1. Lee `.sdd/CONSTITUTION.md`, `.sdd/specs/$1-*.md` y `.sdd/plans/$1.plan.md`.
2. Escribe **únicamente** los archivos de test que indica el PLAN, en el proyecto
   Vitest que corresponda a la capa:

   | Capa | Proyecto | Directorio |
   | :--- | :--- | :--- |
   | Lógica pura | `unit` | `tests/unit/` |
   | Componentes `.astro` | `components` | `tests/components/` |
   | Endpoints en workerd | `workers` | `tests/workers/` |
   | RLS | — | `supabase/tests/` (pgTAP, no Vitest) |

3. Implementa **exactamente** los casos de la matriz. Ni uno más, ni uno menos.
4. Cada `it()` empieza con `[TEST-NNN]` y nombra sus `(REQ-NNN)`.
5. Estructura AAA con comentarios `// Arrange`, `// Act`, `// Assert`. Un solo
   `Act` por test.
6. Dobles de prueba (Constitución Regla 5):
   - Bindings de Cloudflare: **los reales de Miniflare**. Nunca `vi.fn()`.
   - Supabase: **fake en memoria** en `tests/fakes/`. Nunca `vi.mock()`.
   - Nada de `toMatchSnapshot()`.
7. **No crees ni modifiques nada bajo `src/`.** Los imports apuntarán a módulos que
   aún no existen — eso es correcto en esta fase.
8. Ejecuta la suite y confirma que falla por *módulo no encontrado* o *no es una
   función*, **no** por errores de sintaxis en el test.
9. Reporta: cuántos tests, qué REQ quedan cubiertos y cuáles no.

Si el PLAN tiene huecos respecto a la SPEC, **DETENTE y repórtalos**. No los
rellenes por tu cuenta (Constitución 2.4).
