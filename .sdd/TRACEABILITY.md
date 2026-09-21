# Matriz de trazabilidad — SPEC ↔ TEST ↔ código

> **Última actualización:** 2026-09-21 (migración de estrellas y editores modulares)
> **Verificación automática:** `npm run sdd:trace`. Este documento es el resumen
> legible; **la fuente de verdad es el gate**, que sí falla.

---

## Estado por SPEC

| SPEC | Estado | Código | Tests |
| :--- | :--- | :--- | :--- |
| [SPEC-001](specs/SPEC-001-precio-catalogo.md) · Precio de catálogo | BORRADOR | ⬜ sin implementar | ⬜ |
| [SPEC-002](specs/SPEC-002-media-key-r2.md) · Claves de R2 | **APROBADA** | ✅ `storage/mediaKey.ts` + `POST /api/media` | ✅ 22 unit + 7 workerd |
| [SPEC-003](specs/SPEC-003-slug-publico.md) · Slug público | **APROBADA** | ✅ `text/slugify.ts` | ✅ 19 tests |
| [SPEC-004](specs/SPEC-004-orden-productos.md) · Orden manual de productos | BORRADOR | ⬜ sin implementar (necesita migración + función `reordenar_productos`) | ⬜ matriz de 33 casos |
| [SPEC-005](specs/SPEC-005-borrado-media-r2.md) · Borrado de imágenes en desuso (BZ-11) | BORRADOR | ⬜ sin implementar | ⬜ matriz de 22 casos |
| [SPEC-006](specs/SPEC-006-seo-esencial.md) · SEO Esencial | **APROBADA** | ✅ sitemap, robots, canónicas y sondas publicados (`0c216d5`) | ✅ unitarios, CI workerd y humo en producción; ⏳ matriz manual completa |
| [SPEC-007](specs/SPEC-007-estrellas-administrables.md) · Estrellas administrables | **APROBADA** | ✅ columnas legibles y estado vacío publicado (`3f02a1a`); editor en modal | ✅ unitarios, interacción y HTML público; ⏳ guardado autenticado y UI manual pendientes |
| [SPEC-008](specs/SPEC-008-editores-admin-modulares.md) · Editores modulares | **APROBADA** | ✅ productos, inicio y categorías separados en archivos <500 líneas | ✅ render, interacciones y gate de tamaño; ⏳ UI autenticada manual |
| [SPEC-900](specs/SPEC-900-gates-cicd.md) · Gates de CI/CD | BORRADOR | 🔶 workflow escrito, sin correr | ⬜ matriz de 14 provocaciones |
| [SPEC-901](specs/SPEC-901-smoke-produccion.md) · Humo post-deploy | BORRADOR | ✅ `scripts/smoke.mjs` | 🔶 ejecutado contra prod, sin tests unitarios |
| [SPEC-902](specs/SPEC-902-rls-supabase.md) · Políticas RLS | BORRADOR | 🔶 auditoría de lectura hecha | ⬜ pgTAP pendiente |
| [SPEC-903](specs/SPEC-903-acceso-diagnostico.md) · Acceso al diagnóstico | BORRADOR | ✅ `acceso.ts`, `/api/salud`, `/api/diagnostico` | ✅ 15 unit + 11 workerd |
| [SPEC-904](specs/SPEC-904-persistencia-inicio.md) · Persistencia del inicio | **APROBADA** | ✅ `inicioPlan.ts`, `updateInicio`, `PUT /api/inicio`, isla | ✅ 33 unit + 5 workerd |
| [SPEC-905](specs/SPEC-905-imagenes-galeria.md) · Imágenes de la galería | **APROBADA** | ✅ `imagenGaleria.ts`, `guardarGaleria.ts`, isla y landing | ✅ 36 unit |
| [SPEC-906](specs/SPEC-906-responsive-admin.md) · Responsive del panel | **APROBADA** | ✅ utilidades en `tokens.css` + gate | ✅ 15 unit |
| [SPEC-907](specs/SPEC-907-panel-tactil.md) · El panel en táctil | BORRADOR | ⬜ sin implementar | ⬜ necesita BZ-60 y BZ-74 |

Las SPEC en **BORRADOR** no bloquean el gate: describen algo aún no implementado.
Pasar una a APROBADA es un acto explícito, y a partir de ahí todos sus REQ deben
estar citados en algún test o el gate falla.

## Cobertura de requisitos

| SPEC | REQ | Cubiertos | Pendiente de |
| :--- | :--- | :--- | :--- |
| SPEC-001 | 001–007 | 0 / 7 | implementar `catalogPrice.ts` |
| SPEC-002 | 201–208 | **8 / 8** | — |
| SPEC-003 | 301–305 | **5 / 5** | — |
| SPEC-004 | 401–416 | 0 / 16 | aprobación humana · `/sdd-red` |
| SPEC-005 | 501–512 | 0 / 12 | aprobación humana · despliegue por etapas (galerías → productos → inicio) |
| SPEC-006 | 601–607 | **7 / 7 citados** | ejecutar matriz manual completa; sondas tras despliegue pasaron |
| SPEC-007 | 701–708 | **8 / 8 citados** | ejecutar matriz manual y escritura autenticada |
| SPEC-008 | 801–804 | **4 / 4 citados** | inspección manual de los editores autenticados |
| SPEC-900 | 901–911 | 0 / 11 | ejecutar la matriz de `SPEC-900.plan.md` |
| SPEC-901 | 951–961 | 0 / 11 | tests unitarios del evaluador de sondas |
| SPEC-902 | 921–933 | 0 / 13 | `BZ-70` · pgTAP |
| SPEC-903 | 941–947 | **7 / 7** | aprobarla tras revisión humana |
| SPEC-904 | 970–979 | **11 / 11** | aplicar `pendiente-policies-home.sql` (REQ-979) |
| SPEC-905 | 980–986, 988 | **8 / 8** | revisión humana de la enmienda del 2026-09-10 (REQ-980, REQ-988) |
| SPEC-906 | 990–995, 997 | **7 / 7** | — |
| SPEC-907 | 996, 998–999 | 0 / 3 | `BZ-84` · aprobación y BZ-74 |

> **SPEC-905 REQ-982 y REQ-983 están cubiertos por tests sobre el código
> fuente, no sobre su comportamiento.** Comprueban que el `<img>` existe, que su
> `src` sale de `imagenUrl` y que las vistas no vuelven a descartar el campo —
> que es la regresión concreta que hubo. Que la foto **se vea** solo lo puede
> decir `BZ-74` (E2E); la capa de componentes sigue bloqueada por `BZ-60`.

> **SPEC-006 y SPEC-007:** «citado» no equivale a verificado. Las pruebas manuales
> en `tests/manual/` siguen pendientes porque `workerd` no arranca en la Orange Pi
> ARM64 (fallo TCMalloc). CI x86 y sondas de producción pasaron para `0c216d5`.
> El usuario ejecutó `supabase/20260920-calificaciones-administrables.sql` y una
> lectura remota con la clave pública confirmó ambas columnas (HTTP 200). Falta
> probar escritura con sesión administrativa y revisar la UI visualmente.
> La revisión del 2026-09-21 halló los 26 productos con conteo cero y el editor
> en un panel plegado; la enmienda REQ-701/708 hace visible el estado vacío y
> coloca el control en el formulario del producto.

> **SPEC-904 REQ-979 está cubierto por un test que NO prueba producción.**
> `clienteAutenticado.test.ts` verifica que la migración pendiente declara las
> tres policies y usa el predicado del esquema. Que estén **aplicadas** solo lo
> puede decir pgTAP (`BZ-70`) o el panel real. Hasta entonces, el guardado del
> inicio falla en producción con un error de RLS — visible, que es el punto.

> **SPEC-902 REQ-923 está VERIFICADO Y FALLANDO en producción.** `npm run audit:rls`
> lo detecta hoy, pero no hay un test que lo fije permanentemente, así que cuenta
> como no cubierto. Ver `BZ-80`.

## Cobertura medida — 2026-08-22

| Capa | Líneas | Ramas | Umbral | Archivos |
| :--- | ---: | ---: | ---: | ---: |
| 1 · lógica pura | **5,8 %** | **5,9 %** | 95 % / 90 % | 30 |
| 3 · endpoints | medida aparte con istanbul | — | 70 % / 60 % | 3 de 12 |

El umbral **no se baja** para que el número quede bonito (`BZ-73`): primero sube
la cobertura.

## Deuda registrada — `.sdd/baseline.json`

Dos trinquetes. Ambas listas **solo pueden encoger**; cualquier incumplimiento
nuevo bloquea el gate.

| Trinquete | Cuántos | Tarea |
| :--- | ---: | :--- |
| Archivos de lógica sin SPEC | 23 | `BZ-75` |
| Archivos por encima de 500 líneas | 0 | `BZ-101` y `BZ-112` saldados |

Prioridad de especificación (`BZ-75`): `productoMapper.ts` y `categoriaMapper.ts`
primero — concentran las decisiones más sutiles y de ellos depende la navegación.
`storage/mediaUrl.ts` sube de prioridad por su relación con `BZ-76`.

Los tres editores heredados se dividieron después de añadir pruebas de render e
interacción (`TEST-801` a `TEST-804`). El gate de tamaño ya no exceptúa esos
archivos; `BZ-60` sigue pendiente para cobertura general de componentes.

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
