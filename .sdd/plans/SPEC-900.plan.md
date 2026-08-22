# PLAN DE VERIFICACIÓN — SPEC-900 · Gates de CI/CD

**Archivo destino:** `.github/workflows/sdd-gate.yml` + `scripts/sdd-trace.mjs`
**Fuente:** [`../specs/SPEC-900-gates-cicd.md`](../specs/SPEC-900-gates-cicd.md)

> Un workflow de CI no se prueba con Vitest: se prueba **provocando el fallo que
> debe detectar y comprobando que lo detecta**. Cada fila de abajo describe un
> commit deliberadamente roto y el resultado esperado. Es más lento que un test
> unitario y no hay alternativa honesta: un gate que nunca ha fallado no es un gate
> verificado, es una esperanza.

---

## Matriz de verificación de gates

| ID | Provocación | Gate que debe atrapar | Resultado esperado | REQ |
| :-- | :--- | :--- | :--- | :--- |
| TEST-G01 | Un `any` en `src/shared/lib/` | 1 | falla en `tsc --noEmit` | REQ-902 |
| TEST-G02 | Un test unitario en rojo | 1 | falla, artefacto de cobertura conservado | REQ-902, REQ-909 |
| TEST-G03 | Bajar la cobertura de Capa 1 por debajo del 95% | 1 | falla por umbral, no por test rojo | REQ-902 |
| TEST-G04 | Un endpoint que usa un binding no declarado | 2 | falla dentro de workerd | REQ-903 |
| TEST-G05 | Ejecutar el proyecto `workers` con cobertura v8 | 2 | falla temprano con mensaje pidiendo Istanbul | REQ-903 |
| TEST-G06 | Una policy RLS que expone borradores | 3 | falla en pgTAP | REQ-904 |
| TEST-G07 | Un `REQ-NNN` en una SPEC sin ningún test que lo cite | 4 | falla nombrando el REQ y su archivo | REQ-905a |
| TEST-G08 | Un archivo nuevo en `src/shared/lib/` sin SPEC | 4 | falla nombrando la ruta | REQ-905b |
| TEST-G09 | Cambiar `compatibility_flags` en `wrangler.jsonc` | — | marca revisión humana requerida | REQ-906 |
| TEST-G10 | Vaciar `.sdd/specs/` | 4 | **falla**, no pasa por vacuidad | INV-3 |
| TEST-G11 | Borrar el directorio `tests/` | 4 | **falla**, no pasa por vacuidad | INV-3 |
| TEST-G12 | Dos pushes seguidos a la misma rama | — | la primera ejecución se cancela | REQ-909 |
| TEST-G13 | Un secreto literal escrito en el workflow | — | rechazado en revisión de PR | REQ-910 |
| TEST-G14 | `package-lock.json` desincronizado | 1 | `npm ci` falla | REQ-911 |

> **TEST-G10 y TEST-G11 son los importantes.** El modo de fallo característico de un
> gate de trazabilidad es aprobar cuando no hay nada que trazar: el bucle no itera,
> el contador queda en cero, `exit 0`. Verde eterno, cero valor. Estos dos son los
> únicos que lo detectan y no deben marcarse como cubiertos hasta ejecutarlos de
> verdad.

## Matriz — `scripts/sdd-trace.mjs`

Éste sí es código propio y sí lleva tests unitarios.

| ID | Escenario | Entrada | Esperado | REQ |
| :-- | :--- | :--- | :--- | :--- |
| TEST-T01 | REQ cubierto | spec con `REQ-001`, test que lo cita | sin hallazgos | REQ-905a |
| TEST-T02 | REQ huérfano | spec con `REQ-002`, ningún test | 1 hallazgo `HUECO` | REQ-905a |
| TEST-T03 | Archivo sin spec | `src/shared/lib/nuevo.ts` sin mención | 1 hallazgo `SIN-SPEC` | REQ-905b |
| TEST-T04 | Directorio de specs vacío | `.sdd/specs/` vacío | **código de salida ≠ 0** | INV-3 |
| TEST-T05 | Cita en comentario cuenta igual | `// cubre REQ-003` | sin hallazgos | REQ-905a |
| TEST-T06 | REQ citado solo en otra SPEC no cuenta | `REQ-004` mencionado en `specs/`, no en `tests/` | 1 hallazgo `HUECO` | REQ-905a |
| TEST-T07 | Umbral por capa leído de `json-summary` | cobertura de Capa 1 al 94% | 1 hallazgo `COBERTURA` | REQ-902 |
| TEST-T08 | Exclusiones respetadas | archivo bajo `tests/fixtures/` | ignorado | REQ-905b |

> TEST-T06 cierra la trampa evidente: si la búsqueda del REQ se hace sobre todo el
> repositorio en vez de sobre `tests/`, cada REQ se encuentra a sí mismo en su
> propia SPEC y el gate aprueba siempre.

---

## Cobertura de requisitos

| REQ | Verificación | Cubierto |
| :--- | :--- | :--- |
| REQ-901 | TEST-G12 + observación del disparo | ⏳ |
| REQ-902 | TEST-G01, G02, G03, G14, T07 | ⏳ |
| REQ-903 | TEST-G04, G05 | ⏳ |
| REQ-904 | TEST-G06 | ⏳ |
| REQ-905 | TEST-G07, G08, G10, G11, T01..T08 | ⏳ |
| REQ-906 | TEST-G09 | ⏳ |
| REQ-907 / REQ-908 | depende de `BZ-68` | ⏸ bloqueado |
| REQ-909 | TEST-G02, G12 | ⏳ |
| REQ-910 | TEST-G13 | ⏳ |
| REQ-911 | TEST-G14 | ⏳ |

## Cómo ejecutar esta matriz sin ensuciar `main`

1. Rama `chore/verificar-gates`, un commit por provocación.
2. Un PR contra `main` que **no se fusiona nunca**.
3. Se anota el resultado de cada fila en este archivo con la fecha.
4. Se borra la rama.

**No probar los gates directamente sobre `main`.** Mientras Workers Builds sea el
desplegador (opción B de `SPEC-900`), cada push a `main` publica — incluido el
commit deliberadamente roto de TEST-G01.
