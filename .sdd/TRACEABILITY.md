# Matriz de trazabilidad — SPEC ↔ TEST ↔ código

> **Última actualización:** 2026-08-22
> **Verificación automática:** `npm run sdd:trace` (`BZ-66`). Este documento es el
> resumen legible; **la fuente de verdad es el gate**, que sí falla.

---

## Estado por SPEC

| SPEC | Estado | Código | Tests | Cobertura |
| :--- | :--- | :--- | :--- | :--- |
| [SPEC-001](specs/SPEC-001-precio-catalogo.md) · Precio de catálogo | BORRADOR | ⬜ sin implementar | ⬜ | — |
| [SPEC-002](specs/SPEC-002-media-key-r2.md) · Claves de R2 | **APROBADA** | ✅ `storage/mediaKey.ts` | ✅ 22 tests | alta |
| [SPEC-003](specs/SPEC-003-slug-publico.md) · Slug público | **APROBADA** | ✅ `text/slugify.ts` | ✅ 19 tests | alta |
| [SPEC-900](specs/SPEC-900-gates-cicd.md) · Gates de CI/CD | BORRADOR | 🔶 workflow escrito, sin correr | ⬜ matriz de 14 provocaciones | — |
| [SPEC-901](specs/SPEC-901-smoke-produccion.md) · Humo post-deploy | BORRADOR | ✅ `scripts/smoke.mjs` | 🔶 ejecutado contra prod, sin tests unitarios | — |
| [SPEC-902](specs/SPEC-902-rls-supabase.md) · Políticas RLS | BORRADOR | ⬜ | ⬜ `supabase/tests/` | — |

Las SPEC en **BORRADOR** no bloquean el gate: describen algo aún no implementado.
Pasar una a APROBADA es un acto explícito, y a partir de ahí todos sus REQ deben
estar citados en algún test o el gate falla.

## Cobertura de requisitos

| SPEC | REQ | Cubiertos | Pendiente de |
| :--- | :--- | :--- | :--- |
| SPEC-001 | 001–007 | 0 / 7 | implementar `catalogPrice.ts` |
| SPEC-002 | 201–208 | **8 / 8** | — |
| SPEC-003 | 301–305 | **5 / 5** | — |
| SPEC-900 | 901–911 | 0 / 11 | `BZ-65` · ejecutar la matriz de `SPEC-900.plan.md` |
| SPEC-901 | 951–961 | 0 / 11 | tests unitarios del evaluador de sondas |
| SPEC-902 | 921–930 | 0 / 10 | `BZ-70` · pgTAP |

> `SPEC-901` es un caso interesante: el script **funciona y se ejecutó contra
> producción**, pero su lógica de decisión —códigos de salida, timeouts, "todas se
> ejecutan aunque una falle"— no tiene ni un test. Es exactamente el hueco que el
> gate reportaría el día que la spec pase a APROBADA, y por eso sigue en borrador.

## Cobertura medida — 2026-08-22

Primera medición real, con `npm run test:cov`:

| Capa | Líneas | Ramas | Umbral | Archivos |
| :--- | ---: | ---: | ---: | ---: |
| 1 · lógica pura | **5,8 %** | **5,9 %** | 95 % / 90 % | 30 |
| 3 · endpoints | sin datos | sin datos | 70 % / 60 % | 0 |

El 5,8 % es lo esperable con tres archivos de treinta cubiertos. El umbral **no se
baja** para que el número quede bonito (`BZ-73`): primero sube la cobertura.

## Deuda registrada — `.sdd/baseline.json`

**23 archivos** de `src/shared/lib/` existían sin SPEC cuando se montó el gate.
La lista solo puede encoger; el gate falla con archivos **nuevos** sin spec, y
avisa cuando uno del baseline gana su spec para poder podarla.

Prioridad de especificación (`BZ-75`):

| Archivo | Prioridad | Motivo |
| :--- | :--- | :--- |
| `productos/productoMapper.ts` | **Alta** | Deriva la categoría subiendo por `parent_category_id`. La lógica más sutil del repo |
| `categorias/categoriaMapper.ts` | **Alta** | Anida subcategorías; alimenta toda la navegación |
| `env/serverEnv.ts` | Media | 183 líneas, causa raíz de `BZ-04` y `BZ-33` |
| `errors/logServerError.ts` | Media | Relacionado con `BZ-14`, fuga de mensajes internos |
| `storage/mediaUrl.ts` | Media | Construye las URLs públicas de R2 — relacionado con `BZ-76` |
| `validation/*.ts` | Baja | El contrato ya está en el propio esquema Zod |
| `*/*Service.ts` | Baja | Orquestación; se prueban en Capa 3 con dobles |

## Excepciones declaradas

**Determinismo (Constitución 6.1).** El gate lo verifica estáticamente. Quedan
fuera, por diseño:

- Los adaptadores que la Regla 1.1 declara como tales (`db/client.ts`,
  `auth/authClient.ts`, `env/serverEnv.ts`, `storage/r2Bucket.ts`,
  `storage/mediaStorage.ts`).
- Los `*Service.ts`, que son orquestadores (Regla 1.3). `categoriaService.ts` usa
  `Date.now()` para el TTL de su caché, y eso es lo esperable de un orquestador.
  Su determinismo se resuelve cuando tenga SPEC, inyectando el reloj.
- Líneas con marcador explícito `// sdd:determinismo-ok <motivo>`. Hoy solo las dos
  de `mediaKey.ts`, que son los valores por defecto inyectables de `REQ-208`.
