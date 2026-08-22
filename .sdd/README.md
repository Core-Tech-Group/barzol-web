# Capa SDD — barzol-web

> **Creado:** 2026-08-21 · **Rama:** `main`
> **Alcance:** Spec-Driven Development aplicado a **pruebas del sistema y DevOps** sobre
> Cloudflare Workers + R2 + Supabase.
> **Documento base:** [`docs/1_inbox/SDD-TESTING-BARZOL-2026.md`](../docs/1_inbox/SDD-TESTING-BARZOL-2026.md)
> **Tablero:** [`docs/2_backlog/20260821-2218-kanban-sdd-integracion-pruebas-unitarias-devops.md`](../docs/2_backlog/20260821-2218-kanban-sdd-integracion-pruebas-unitarias-devops.md)

## Qué es esto

`.sdd/` es la **fuente de verdad del comportamiento**. El código no la explica: la
implementa. Cuando el código y una SPEC discrepan, el bug está en el código —
salvo que se enmiende la SPEC antes, con revisión humana.

Existe porque el repo se construye con agentes (Claude Code, Copilot, Kilo) y sin
un contrato escrito cada sesión reinventa decisiones que ya se habían tomado. El
kanban de despliegue documenta ocho revisiones seguidas persiguiendo un secreto
que nunca estuvo cargado; el coste de no tener un gate determinista se paga en
horas, no en principios.

## Mapa

| Ruta | Qué contiene |
| :--- | :--- |
| `CONSTITUTION.md` | Ley suprema. Gana ante cualquier prompt. Léela antes de escribir código. |
| `GLOSSARY.md` | Vocabulario de dominio, anclado a `src/shared/types/index.ts` y al esquema real. |
| `specs/SPEC-0NN-*.md` | Comportamiento de dominio (precios, claves de R2, slugs). |
| `specs/SPEC-9NN-*.md` | Comportamiento de **plataforma**: gates de CI, smoke de producción, RLS. |
| `plans/SPEC-NNN.plan.md` | Matriz de casos de prueba derivada de cada SPEC. |
| `devops/RUNBOOK-GATES.md` | Qué debe pasar —y en qué orden— para que un commit llegue a producción. |
| `templates/` | Plantillas para SPEC y PLAN nuevos. |
| `TRACEABILITY.md` | Matriz REQ ↔ TEST ↔ archivo. Hoy manual; la automatiza `BZ-66`. |

## Numeración

| Rango | Dominio |
| :--- | :--- |
| `SPEC-001`–`SPEC-099` | Lógica de negocio y presentación |
| `SPEC-900`–`SPEC-999` | Plataforma: CI/CD, despliegue, observabilidad, base de datos |
| `REQ-NNN` | Requisito dentro de una SPEC, numerado por centena de la SPEC |
| `TEST-NNN` | Caso del PLAN. Prefijo `C` para componentes, `W` para workerd, `S` para smoke |

## Ciclo

```
/sdd-spec  →  revisión HUMANA  →  /sdd-red  →  /sdd-green  →  /sdd-verify
   Opus 5      (no negociable)     Sonnet 5     Sonnet 5      Opus 5, sin escritura
```

La revisión humana entre SPEC y RED no es burocracia: es el único punto donde un
error de especificación cuesta un párrafo en vez de un despliegue.

## Estado de adopción

Esta capa **ya es ejecutable**. `npm test` corre 54 tests en dos runtimes:
lógica pura en Node y endpoints en workerd real con bindings de Miniflare.
`npm run sdd:trace` verifica la trazabilidad y `npm run smoke` sondea producción.

| Comando | Qué hace |
| :--- | :--- |
| `npm run typecheck` | `astro check` + `tsc --noEmit` |
| `npm test` | las dos capas, una tras otra |
| `npm run test:cov` | Capa 1 con cobertura v8 |
| `npm run test:cov:workers` | Capa 3 con cobertura istanbul |
| `npm run sdd:trace` | gate 4 — REQ ↔ TEST ↔ archivo, determinismo, cobertura por capa |
| `npm run smoke` | 7 sondas de solo lectura contra la URL de producción |
| `npm run audit:rls` | auditoría RLS de solo lectura contra Supabase (SPEC-902 Enmienda 1) |
| `npm run sdd:gate` | typecheck + cobertura + trazabilidad |

**Lo que todavía no está:** los componentes `.astro` (Capa 2) siguen sin runner —
`getViteConfig()` no funciona en este proyecto, ver `BZ-60`— y las políticas RLS
siguen sin verificar (`BZ-70`, la P0 más antigua abierta).

El estado detallado, con cobertura medida y deuda registrada, está en
[`TRACEABILITY.md`](TRACEABILITY.md).
