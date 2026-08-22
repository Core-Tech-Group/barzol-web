# Scrumban — SDD, pruebas del sistema y DevOps

> **Creado:** 2026-08-21 · **Última actualización:** 2026-08-22 (3ª revisión) · **Rama:** `main`
> **Alcance:** integrar Spec-Driven Development, construir la infraestructura de
> pruebas sobre los runtimes reales, y cerrar el ciclo de despliegue con gates
> verificables.
> **Tablero hermano:** [`20260808-1727-kanban-avance-cloudflare-r2-vercel.md`](20260808-1727-kanban-avance-cloudflare-r2-vercel.md) — el del despliegue. Este continúa su numeración desde `BZ-53`.
> **Material base:** [`../1_inbox/SDD-TESTING-BARZOL-2026.md`](../1_inbox/SDD-TESTING-BARZOL-2026.md) · **Capa SDD:** [`.sdd/`](../../.sdd/README.md)

Las tareas no repiten el contenido de las specs: cada una enlaza la suya. Aquí va
la decisión, el riesgo y el orden; el detalle técnico vive en `.sdd/`.

---

## Estado — 2026-08-22, 3ª revisión

**Los gates empezaron a encontrar cosas que nadie estaba mirando.** Tres hallazgos
reales en una sesión, ninguno visible desde la web:

| Hallazgo | Cómo apareció | Gravedad |
| :--- | :--- | :--- |
| `anon` puede leer **4 productos en borrador** | `npm run audit:rls` contra producción | 🔴 fuga de datos |
| Dos imágenes de producto **no existen en el bucket** | humo → confirmado con `wrangler r2 object get` | 🔴 visible al visitante |
| Tres componentes de admin superan las **500 líneas** (uno tiene 1378) | gate de tamaño recién montado | 🟠 deuda |

| Control | 2ª revisión | Ahora |
| :--- | :--- | :--- |
| Tests | 45 | **54** — 41 en Node, 13 en workerd |
| Capa 3 | solo bindings | **`POST /api/media` de punta a punta contra R2 real** |
| Gates | 4 comprobaciones | **5** — se añade tamaño de archivo (Regla 9.1) |
| Auditoría RLS | inexistente | `npm run audit:rls`, ejecutado contra producción |
| Despliegue | sin confirmar quién publica | **confirmado y medido: 44 s desde el push** |

Las tres decisiones que estaban pendientes quedan cerradas: `BZ-63` (no migrar),
`BZ-68` (Workers Builds publica, Actions verifica) y el alcance realista de
`BZ-70`.

---

## Correcciones al material base

Diez correcciones acumuladas, todas verificadas contra el repo o ejecutando.
La tabla completa está en [`.sdd/CONSTITUTION.md`](../../.sdd/CONSTITUTION.md) §0
y en la 2ª revisión de este tablero (historial de git). Resumen:

- Rutas (`src/shared/lib/`), binding (`MEDIA`), cuatro bindings y no dos.
- Precios `numeric`, no céntimos. `nodejs_compat` no hace falta.
- Módulo virtual `cloudflare:test`, no `cloudflare:workers`.
- `getViteConfig()` no es drop-in: arrastra el adaptador de Cloudflare.
- El guardia de determinismo no puede parchear `Date.now` en el setup.

---

## Tablero

| ID | Tarea | Estado | Prio |
|---|---|---|---|
| BZ-53 | Estructura `.sdd/` + Constitución v2.1 + glosario | ✅ Hecho | 🔴 |
| BZ-54 | Specs retroactivas del dominio (SPEC-001/002/003) | ✅ Hecho | 🔴 |
| BZ-55 | Specs de plataforma (SPEC-900/901/902) | ✅ Hecho | 🔴 |
| BZ-56 | Capa Claude Code (CLAUDE.md, rules, comandos, verifier) | 🔶 Escrita, hooks sin activar | 🟠 |
| BZ-57 | Instalar Vitest 4 con los proyectos por runtime | ✅ Hecho | 🔴 |
| BZ-58 | Andamiaje de `tests/`: setups, fakes, fixtures | ✅ Hecho | 🔴 |
| BZ-59 | Capa 3 en workerd — bindings **y endpoint de subida** | ✅ Hecho | 🔴 |
| BZ-60 | Capa 2: componentes `.astro` con Container API | ⬜ Bloqueada por `getViteConfig()` | 🟠 |
| BZ-61 | `slugify()` duplicado en dos mappers | ✅ Hecho | 🟠 |
| BZ-62 | `buildMediaKey` no es determinista | ✅ Hecho | 🟠 |
| BZ-63 | Decisión: ¿migrar los precios a céntimos? | ✅ **Decidido: no migrar** | 🟡 |
| BZ-64 | Verificar por qué funciona sin `nodejs_compat` | ✅ Hecho | 🟠 |
| BZ-65 | Crear `.github/workflows/sdd-gate.yml` | ✅ Hecho, sin ejecutar aún | 🔴 |
| BZ-66 | `scripts/sdd-trace.mjs` — gate de trazabilidad | ✅ Hecho | 🟠 |
| BZ-67 | `scripts/smoke.mjs` — humo post-despliegue | ✅ Hecho y ejecutado | 🔴 |
| BZ-68 | Decisión: ¿quién despliega? | ✅ **Cerrado con evidencia** | 🔴 |
| BZ-69 | Ensayar el rollback antes de necesitarlo | ⬜ Pendiente | 🟠 |
| BZ-70 | Verificar RLS — implementa SPEC-902 | 🔶 Auditoría hecha, pgTAP pendiente | 🔴 |
| BZ-71 | Secretos de CI y de Supabase local | ⬜ Pendiente | 🟠 |
| BZ-72 | Proteger `/api/diagnostico` para usarlo como sonda | ⬜ Pendiente | 🔴 |
| BZ-73 | Fijar los umbrales de cobertura con datos reales | ⬜ Pendiente, **ya hay datos** | 🟡 |
| BZ-74 | Evaluación: E2E con Playwright | ⬜ Pendiente | ⚪ |
| BZ-75 | Especificar los mappers y bajar la deuda del baseline | ⬜ Pendiente | 🟠 |
| BZ-76 | Dos imágenes de producto dan 404 en producción | 🔶 Diagnosticada | 🔴 |
| BZ-77 | Imágenes en base64 incrustadas en el HTML | ⬜ Pendiente | 🟡 |
| BZ-78 | Gate de tamaño de archivo (Regla 9.1) | ✅ Hecho | 🟠 |
| BZ-79 | Tres componentes de admin superan las 500 líneas | ⬜ Pendiente | 🟠 |
| BZ-80 | **`anon` puede leer productos en borrador** | ⬜ Pendiente | 🔴 |

**Progreso:** 15 de 28 hechas, 3 parciales.

| Prioridad | Significado |
|---|---|
| 🔴 P0 | Bloquea el resto de la cadena o hay riesgo de seguridad |
| 🟠 P1 | Necesario para que los gates sirvan de verdad |
| 🟡 P2 | Deuda con impacto real, sin urgencia |
| ⚪ P3 | Evaluación o mejora |

---

## 🔴 BZ-80 · `anon` puede leer productos en borrador

**Verificado contra producción el 2026-08-22.** Es el hallazgo más serio de las
tres sesiones, y responde por fin la pregunta que `BZ-50` hacía desde el 8 de
agosto.

```
[FALLA] TEST-P02 · anon NO ve productos en borrador
        EXPUESTOS 4 borradores, p.ej. "Soporte de Celular Trompeta (copia)"
```

### La causa

```sql
-- supabase/schema.sql:300
create policy "public read" on product for select using (true);
```

`using (true)` deja leer **todas** las filas. El filtro por `status` vive
únicamente en la aplicación (`getProductosPublicados()`), y la anon key viaja al
navegador en cada visita — así que cualquiera puede consultar PostgREST
directamente y enumerar los borradores, con sus precios y sus nombres internos.

Lo mismo aplica a `product_photo` y `product_feature` (líneas 301-302): es
exactamente lo que TEST-R15 anticipaba — el producto no aparece, pero sus fotos
se pueden enumerar, y el nombre del archivo suele decir de qué producto son.

Aparte, `admin_profile` **no tiene `enable row level security`** en el esquema.
La auditoría responde 200 con lista vacía y desde fuera no se distingue
"protegida" de "vacía" (REQ-933). Eso lo resuelve pgTAP.

### Por qué NO lo he corregido — la regresión

**Endurecer la política a secas rompe el panel de administración.**

`productoService.getProductos()` —el listado del admin, el que debe ver los
borradores— usa `getSupabase()`, que es el cliente **anon** cacheado a nivel de
módulo. No usa la sesión autenticada. Dicho de otro modo: *hoy el admin ve
borradores precisamente porque la política es demasiado laxa*.

El arreglo son tres pasos, en este orden:

1. **Código** — que las lecturas del admin usen el cliente autenticado
   (`locals.supabase`) en vez del singleton anon. Requiere inyectar el cliente en
   `productoService` y compañía, y necesita su propia SPEC.
2. **SQL sección A** — policy `admin read` para autenticados presentes en
   `admin_profile`. Aditiva, no quita permisos a nadie.
3. **SQL sección B** — recién entonces, restringir `public read` a
   `status = 'published' and is_active = true`.

Ejecutar el paso 3 antes del 1 deja el panel sin borradores. Eso es una regresión,
no un arreglo.

La migración está escrita y **sin aplicar** en
[`supabase/pendiente-fix-rls-borradores.sql`](../../supabase/pendiente-fix-rls-borradores.sql),
con el orden, las advertencias y un `rollback;` al final para que no se ejecute
por accidente. Aplicarla es decisión humana (Constitución 8.5).

**La sección C es independiente** —habilitar RLS en `admin_profile`— y se puede
aplicar sin tocar código. Es la parte barata de este hallazgo.

---

## ✅ Cerradas en esta sesión (2026-08-22, 3ª revisión)

### BZ-68 · Quién despliega ✅ 🔴 — cerrado con evidencia

**Workers Builds publica; GitHub Actions verifica.** La opción B, confirmada con
datos y no por preferencia.

Lo que zanjó la duda fue medirlo:

| Momento | Dato |
| :--- | :--- |
| Push de `a7eb50d` | `2026-08-22T12:17:32Z` |
| Despliegue en Cloudflare | `2026-08-22T12:18:16Z` |
| **Latencia** | **44 segundos** |

Y el humo lo confirmó desde el otro lado: `TEST-S06` pasa comparando el commit
desplegado con `HEAD`. Es decir, la integración que se configuró directamente en
el panel de Cloudflare en una sesión anterior **funciona y es fiable**.

Consecuencias prácticas:

- No se toca el desplegador. Cambiar una integración que publica en 44 segundos
  por un workflow que nunca ha corrido sería empeorar a propósito.
- El `sleep 150` del job de humo tiene margen de sobra (3× la latencia medida).
- `wrangler deployments list` funciona con la sesión actual, así que `BZ-69`
  (ensayar el rollback) no tiene ningún impedimento técnico.

**Riesgo que queda anotado:** el despliegue no está condicionado a que los gates
pasen. Un commit rojo llega igual a producción y el check se pone rojo después.
Es el precio de la opción B, y es aceptable mientras el humo avise. Reevaluar
cuando el workflow lleve dos semanas corriendo.

### BZ-63 · Precios en céntimos ✅ 🟡 — decidido: no migrar

Confirmada la recomendación. La Constitución 3.2 ya cubre el caso intermedio
—céntimos dentro de la lógica pura, conversión validada en el mapper con
`REQ-007`— y eso elimina el riesgo real (aritmética flotante sobre dinero) sin
tocar la base de datos ni el panel.

Se reevalúa **solo** si aparecen descuentos, IGV desglosado o precios por
volumen. Hasta entonces, migrar sería asumir riesgo sin comprar nada.

### BZ-59 · Capa 3 completa ✅ 🔴

De 4 tests a **13**. Lo que faltaba —cubrir un endpoint real— ya está:
`POST /api/media`, la ruta de escritura en R2 de punta a punta, dentro de workerd
y contra el bucket real de Miniflare.

| Test | Qué protege |
| :--- | :--- |
| TEST-W10 | El objeto queda en el bucket **con sus bytes**, no solo la respuesta |
| TEST-W11 | El `content-type` se guarda como metadato — sin él R2 sirve `octet-stream` y el navegador descarga en vez de mostrar |
| TEST-W12 | El nombre se normaliza (`Sordina Trombón (Tudel Ancho).PNG` → `sordina-trombon-tudel-ancho.png`) |
| TEST-W13 | `../../../secreto.png` no escapa del prefijo — el nombre lo elige quien sube, es entrada hostil |
| TEST-W14 | Rechaza SVG y HTML: un bucket público sirviendo SVG es XSS almacenado bajo el propio dominio |
| TEST-W15 | Dos subidas del mismo nombre no se pisan |
| TEST-W16 | La respuesta no filtra el nombre del bucket (Regla 4.3, motivo de `BZ-14`) |

**Esto NO cierra `BZ-25`** del tablero hermano —probar la subida contra el bucket
real de la cuenta—. Prueba el código, no la cuenta. Pero la diferencia entre
ambas cosas ahora es pequeña y está acotada.

Dos tropiezos que dejaron rastro útil: los alias `@shared/*` no se resolvían en
el runner (ahora viven en `vitest.alias.ts`, compartido por las dos configs para
no duplicarlos), y los endpoints no devuelven el recurso pelado sino envuelto en
`{ success, data, message }` — el primer intento de los tests asumió la forma
cruda y falló.

### BZ-78 · Gate de tamaño de archivo ✅ 🟠

La Regla 9.1 —ningún archivo por encima de 500 líneas— estaba escrita desde el
primer día y **nadie la comprobaba**. Ahora la verifica
`scripts/sdd/tamano.mjs` dentro del gate 4.

Encontró tres incumplimientos en el primer intento:

| Archivo | Líneas |
| :--- | ---: |
| `src/admin/productos/ProductsAdmin.tsx` | **1378** |
| `src/admin/inicio/InicioAdmin.tsx` | 835 |
| `src/admin/categorias/CategoriesAdmin.tsx` | 730 |

Y uno acercándose: `GalleryAdmin.tsx`, 471.

Mismo trinquete que el baseline de specs: los tres quedan registrados en
`.sdd/baseline.json` y **no bloquean**; cualquier archivo nuevo que pase de 500
sí. Partir un componente de 1378 líneas a las bravas, solo para que el gate se
ponga verde, sería exactamente la regresión que este tablero intenta evitar. Es
`BZ-79`.

La documentación (`.sdd/**.md`, `docs/2_backlog/**.md`) queda fuera del bloqueo:
un kanban crece por acumular historia, no complejidad. Se avisa, no se bloquea —
el tablero hermano ya tiene 950 líneas.

---

## Pendientes

### BZ-70 · Verificar RLS 🔶 🔴 — la mitad hecha, y la mitad valiosa

**Lo que se hizo:** `npm run audit:rls`, una auditoría de **solo lectura** contra
la base viva con el rol `anon`. Encontró `BZ-80`. Está especificada como Enmienda
1 de [SPEC-902](../../.sdd/specs/SPEC-902-rls-supabase.md), con tres requisitos
nuevos (REQ-931..933).

**Por qué no se hizo pgTAP:** el proyecto **no está inicializado como proyecto de
Supabase CLI** — no existe `supabase/config.toml`. Levantarlo requiere
`supabase init` + `supabase start` (Docker está instalado, versión 29.4.2) y
cargar el esquema. Es viable, pero no era lo urgente: la pregunta abierta desde
el 8 de agosto era *"¿RLS protege los datos?"*, y esa ya tiene respuesta.

**Riesgo evaluado, tal como se pidió:** `supabase init` es aditivo y sin riesgo
—crea `config.toml`—. El riesgo real está en otra parte: si el esquema local que
se cargue **no reproduce exactamente** las políticas de producción, pgTAP
verificaría la base equivocada y daría confianza falsa, que es peor que no tener
test. Antes de escribir un solo `.sql` de prueba hay que confirmar que
`schema.sql` + `delta_crud.sql` reproducen lo que hay en producción.

Lo que pgTAP sigue siendo el único que puede comprobar: las **escrituras**
(REQ-924, REQ-925) y si `admin_profile` está protegida o simplemente vacía. La
auditoría de solo lectura no puede, y por diseño lo dice como AVISO en vez de
fingir que pasa.

### BZ-76 · Imágenes 404 en producción 🔶 🔴 — diagnosticada

Confirmado con `wrangler r2 object get`: **`The specified key does not exist`**.
No es un problema de acceso público ni de la URL: los objetos no están en el
bucket. De 5 URLs de R2 referenciadas entre portada y catálogo, 3 responden 200
y 2 dan 404.

Ambas claves rotas terminan en el mismo nombre de origen
(`...-whatsapp-image-2026-07-10-at-6-17-07-pm.webp`) con UUID distinto: apunta a
un producto cuyas fotos se registraron en la base de datos pero nunca llegaron al
bucket, o se borraron de él sin limpiar la referencia — que es justo lo que
`BZ-11` (borrado de multimedia y huérfanos) previene y sigue abierta.

**Falta decidir el arreglo**, y hay dos capas:

- **Datos:** volver a subir las dos fotos desde el panel, o borrar las filas
  colgadas. Requiere saber qué producto es y si las fotos originales existen.
- **Código:** que una imagen ausente degrade con elegancia en vez de mostrar el
  icono roto. Hoy no hay nada que lo haga.

### BZ-79 · Tres componentes de admin por encima de 500 líneas 🟠

`ProductsAdmin.tsx` (1378), `InicioAdmin.tsx` (835), `CategoriesAdmin.tsx` (730).
Registrados en el baseline: no bloquean, pero la lista solo puede encoger.

**No partirlos sin tests.** Son componentes React con estado, y `BZ-60` —la capa
que los probaría— sigue bloqueada. Partir 1378 líneas sin red es cómo se rompe un
panel que hoy funciona. El orden sano es `BZ-60` → tests → partir.

### BZ-60 · Componentes `.astro` — bloqueada 🟠

`getViteConfig()` arrastra `@astrojs/cloudflare`, que arranca workerd sobre un
entrypoint que solo existe tras el build. Hay que obtener la config de Astro sin
el adaptador. Ahora tiene más valor que antes: desbloquea `BZ-79`.

### BZ-72 · Proteger `/api/diagnostico` 🔴

Sin cambios. Sigue exponiendo qué variables recibe el worker y qué bindings
tiene. Ya no bloquea al humo, pero sigue siendo una fuga de configuración.

### BZ-73 · Fijar los umbrales 🟡 — ya hay datos

Capa 1 al **5,8 %** de líneas frente al 95 % de la Constitución. La Capa 3 ya
mide, con `POST /api/media` cubierto. El umbral **no se baja** para que el número
quede bonito: primero sube la cobertura (`BZ-75`).

### BZ-69 · Ensayar el rollback 🟠

Ahora sin impedimentos: `wrangler deployments list` funciona con la sesión actual
y muestra el historial completo. Media hora, un día laborable.

### BZ-71 · Secretos de CI · BZ-74 · E2E · BZ-75 · Specs de mappers · BZ-77 · base64 · BZ-56 · hooks

Sin cambios respecto a la 2ª revisión.

---

## Mapa de dependencias

```
BZ-57 (Vitest) ✅ ── BZ-58 ✅ ─┬── BZ-59 (workerd + endpoint) ✅
                               ├── BZ-61 ✅ · BZ-62 ✅
                               └── BZ-60 (componentes) ⬜ ── BZ-79 (partir admin)

BZ-66 (trazabilidad) ✅ ── BZ-78 (tamaño) ✅ ── BZ-79 (deuda registrada)
BZ-67 (humo) ✅ ────────── BZ-76 (imágenes) 🔶 ── BZ-11 (huérfanos, tablero hermano)
BZ-70 (auditoría RLS) 🔶 ─ BZ-80 (borradores expuestos) 🔴 ── necesita paso de código
BZ-68 ✅ ───────────────── BZ-69 (rollback) · BZ-71 (secretos CI)
BZ-75 (specs mappers) ──── BZ-73 (umbrales)
```

**Orden sugerido para la próxima sesión:**
`BZ-80` sección C → `BZ-76` → `BZ-70` (pgTAP) → `BZ-72` → `BZ-80` pasos 1-3 →
`BZ-60` → `BZ-79` → `BZ-75` → `BZ-69` → `BZ-73` → `BZ-71` → `BZ-77` → `BZ-74`.

**Por qué.** La **sección C de `BZ-80`** primero porque es independiente, no toca
código y cierra el agujero de `admin_profile` en un solo `alter table`. Después
`BZ-76`, que es lo único visible para un visitante. Luego pgTAP, que es lo que
convierte el hallazgo de hoy en un test permanente. El resto de `BZ-80` va
después porque arrastra un refactor de servicios que necesita su propia SPEC.

---

## Riesgos

**El fracaso característico de SDD es adoptarlo como decoración.** Las señales:
SPECs escritas *después* del código para pasar el gate; gates desactivados "solo
esta vez"; cobertura que sube mientras los tests no verifican nada.

**El riesgo que introduje yo, y conviene vigilar:** los gates ya tienen **tres**
mecanismos de tolerancia — trinquete de specs (23 archivos), trinquete de tamaño
(3 archivos) y specs en borrador que no bloquean. Los tres están justificados y
los tres son la puerta por la que entra la decoración. La salvaguarda es que las
dos listas **solo puedan encoger** y que aprobar una spec sea un acto explícito.

Si dentro de un mes el baseline sigue en 23 + 3 y no hay specs nuevas aprobadas,
el proceso será un adorno por más verde que salga el gate.

**Lo que demuestra que no lo es, por ahora:** en tres sesiones, los gates han
encontrado una fuga de datos en producción, dos imágenes rotas que nadie vio, un
hueco en un plan escrito el día anterior, tres archivos que incumplían una regla
propia, ocho errores de tipos y un `baseUrl` deprecado. Ninguna de esas cosas la
encontró una persona mirando la web.
