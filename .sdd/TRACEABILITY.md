# Matriz de trazabilidad — SPEC ↔ TEST ↔ código

> **Última actualización:** 2026-08-22 (3ª revisión)
> **Verificación automática:** `npm run sdd:trace`. Este documento es el resumen
> legible; **la fuente de verdad es el gate**, que sí falla.

---

## Estado por SPEC

| SPEC | Estado | Código | Tests |
| :--- | :--- | :--- | :--- |
| [SPEC-001](specs/SPEC-001-precio-catalogo.md) · Precio de catálogo | BORRADOR | ⬜ sin implementar | ⬜ |
| [SPEC-002](specs/SPEC-002-media-key-r2.md) · Claves de R2 | **APROBADA** | ✅ `storage/mediaKey.ts` + `POST /api/media` | ✅ 22 unit + 7 workerd |
| [SPEC-003](specs/SPEC-003-slug-publico.md) · Slug público | **APROBADA** | ✅ `text/slugify.ts` | ✅ 19 tests |
| [SPEC-900](specs/SPEC-900-gates-cicd.md) · Gates de CI/CD | BORRADOR | 🔶 workflow escrito, sin correr | ⬜ matriz de 14 provocaciones |
| [SPEC-901](specs/SPEC-901-smoke-produccion.md) · Humo post-deploy | BORRADOR | ✅ `scripts/smoke.mjs` | 🔶 ejecutado contra prod, sin tests unitarios |
| [SPEC-902](specs/SPEC-902-rls-supabase.md) · Políticas RLS | BORRADOR | 🔶 auditoría de lectura hecha | ⬜ pgTAP pendiente |

Las SPEC en **BORRADOR** no bloquean el gate: describen algo aún no implementado.
Pasar una a APROBADA es un acto explícito, y a partir de ahí todos sus REQ deben
estar citados en algún test o el gate falla.

## Cobertura de requisitos

| SPEC | REQ | Cubiertos | Pendiente de |
| :--- | :--- | :--- | :--- |
| SPEC-001 | 001–007 | 0 / 7 | implementar `catalogPrice.ts` |
| SPEC-002 | 201–208 | **8 / 8** | — |
| SPEC-003 | 301–305 | **5 / 5** | — |
| SPEC-900 | 901–911 | 0 / 11 | ejecutar la matriz de `SPEC-900.plan.md` |
| SPEC-901 | 951–961 | 0 / 11 | tests unitarios del evaluador de sondas |
| SPEC-902 | 921–933 | 0 / 13 | `BZ-70` · pgTAP |

> **SPEC-902 REQ-923 está VERIFICADO Y FALLANDO en producción.** `npm run audit:rls`
> lo detecta hoy, pero no hay un test que lo fije permanentemente, así que cuenta
> como no cubierto. Ver `BZ-80`.

## Cobertura medida — 2026-08-22

| Capa | Líneas | Ramas | Umbral | Archivos |
| :--- | ---: | ---: | ---: | ---: |
| 1 · lógica pura | **5,8 %** | **5,9 %** | 95 % / 90 % | 30 |
| 3 · endpoints | medida aparte con istanbul | — | 70 % / 60 % | 1 de 11 |

El umbral **no se baja** para que el número quede bonito (`BZ-73`): primero sube
la cobertura.

## Deuda registrada — `.sdd/baseline.json`

Dos trinquetes. Ambas listas **solo pueden encoger**; cualquier incumplimiento
nuevo bloquea el gate.

| Trinquete | Cuántos | Tarea |
| :--- | ---: | :--- |
| Archivos de lógica sin SPEC | 23 | `BZ-75` |
| Archivos por encima de 500 líneas | 3 | `BZ-79` |

Prioridad de especificación (`BZ-75`): `productoMapper.ts` y `categoriaMapper.ts`
primero — concentran las decisiones más sutiles y de ellos depende la navegación.
`storage/mediaUrl.ts` sube de prioridad por su relación con `BZ-76`.

Archivos por encima del límite (`BZ-79`): `ProductsAdmin.tsx` (1378),
`InicioAdmin.tsx` (835), `CategoriesAdmin.tsx` (730). **No partirlos sin tests** —
`BZ-60` va antes.

## Comprobaciones del gate

| Comprobación | Módulo | Bloquea |
| :--- | :--- | :--- |
| REQ sin test (specs aprobadas) | `sdd/trazabilidad.mjs` | sí |
| Archivo de lógica sin SPEC | `sdd/trazabilidad.mjs` | sí, salvo baseline |
| No vacuidad (INV-3) | `sdd/trazabilidad.mjs` | sí |
| Determinismo (Regla 6.1) | `sdd/determinismo.mjs` | sí |
| Tamaño de archivo (Regla 9.1) | `sdd/tamano.mjs` | sí, salvo baseline |
| Cobertura por capa (Regla 7.1) | `sdd/cobertura.mjs` | no, hasta `BZ-73` |

## Excepciones declaradas

**Determinismo (6.1).** Quedan fuera los adaptadores de la Regla 1.1, los
`*Service.ts` —orquestadores, Regla 1.3: `categoriaService.ts` usa `Date.now()`
para el TTL de su caché y es lo esperable— y las líneas con marcador explícito
`// sdd:determinismo-ok <motivo>`, hoy solo las dos de `mediaKey.ts`.

**Tamaño (9.1).** Quedan fuera `worker-configuration.d.ts` (generado por
`wrangler types`) y los `*.d.ts` de declaración. La documentación `.md` se avisa
pero no bloquea: un kanban crece por acumular historia, no complejidad.
