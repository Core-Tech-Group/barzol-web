# Scrumban — SDD, pruebas del sistema y DevOps

> **Creado:** 2026-08-21 · **Última actualización:** 2026-08-30 (9ª revisión) · **Rama:** `main`
> **Alcance:** integrar Spec-Driven Development, construir la infraestructura de
> pruebas sobre los runtimes reales, y cerrar el ciclo de despliegue con gates
> verificables.
> **Tablero hermano:** [`20260808-1727-kanban-avance-cloudflare-r2-vercel.md`](20260808-1727-kanban-avance-cloudflare-r2-vercel.md) — el del despliegue. Este continúa su numeración desde `BZ-53`.
> **Material base:** [`../1_inbox/SDD-TESTING-BARZOL-2026.md`](../1_inbox/SDD-TESTING-BARZOL-2026.md) · **Capa SDD:** [`.sdd/`](../../.sdd/README.md)

Las tareas no repiten el contenido de las specs: cada una enlaza la suya. Aquí va
la decisión, el riesgo y el orden; el detalle técnico vive en `.sdd/`.

---

## Estado — 2026-08-26, 8ª revisión

**El responsive del panel estaba hecho una vez, para el esqueleto, y nunca para
las pantallas donde se trabaja.** El número que lo resume:

| | Media queries | Archivos |
| :--- | ---: | ---: |
| `src/landing/**` | 18 | 12 |
| `src/admin/**` — antes | **3** | 2 (dos de las tres, del Resumen) |
| `src/admin/**` — ahora | **3**, todas en `tokens.css` | 1 |

Productos, Categorías, Inicio, las dos Galerías, Configuración y el **Login** no
tenían ninguna. `BZ-83` lo cierra y deja un gate vigilándolo.

| Control | 6ª rev. | 7ª rev. | Ahora |
| :--- | :--- | :--- | :--- |
| Tests | 140 | 198 | **216** — 185 Node, 31 workerd |
| Gates | 5 | 5 | **6** — se añade responsive |
| Specs aprobadas | 3 | 4 | **5** de 11 |

---

## Estado — revisiones anteriores (22-08-2026)

**7ª revisión — `BZ-82`.** Las galerías guardaban el nombre del archivo en vez
de subir la imagen a R2, y la landing descartaba la URL antes de pintarla. SPEC-905,
36 tests. Detalle en la sección de `BZ-82`.

**6ª revisión — `BZ-81`.** SPEC-904 aprobada → RED → GREEN → gate. El botón de
la página de inicio dejó de mentir: envía, espera respuesta y solo entonces
confirma. Detalle en la sección de `BZ-81`.

**3ª revisión — los gates empezaron a encontrar cosas que nadie miraba.** Tres
hallazgos reales en una sesión, ninguno visible desde la web: `anon` leyendo 4
productos en borrador (`npm run audit:rls`), dos imágenes de producto que no
existen en el bucket (humo + `wrangler r2 object get`) y tres componentes de
admin por encima de 500 líneas (gate de tamaño recién montado). Cerró `BZ-63`,
`BZ-68` y el alcance realista de `BZ-70`.

**4ª revisión — la seguridad subió por fases, sin romper nada.** El criterio fue
tocar primero lo que no arrastra a nada más:

| Fase | Qué | Estado |
| :--- | :--- | :--- |
| 1 · independiente, sin código | RLS en `admin_profile` | SQL listo para aplicar solo |
| 2 · independiente, solo código | `/api/diagnostico` protegido + `/api/salud` | ✅ desplegado |
| 3 · arrastra refactor | `anon` lee borradores | especificado, **sin aplicar** |

| Control | 2ª rev. | 3ª rev. | 4ª rev. |
| :--- | :--- | :--- | :--- |
| Tests | 45 | 54 | **82** — 56 Node, 26 workerd |
| Gates | 4 | **5** (+ tamaño) | 5 |
| Despliegue | sin confirmar | **medido: 44 s** | idem |

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
| BZ-72 | Proteger `/api/diagnostico` para usarlo como sonda | ✅ Hecho | 🔴 |
| BZ-73 | Fijar los umbrales de cobertura con datos reales | ⬜ Pendiente, **ya hay datos** | 🟡 |
| BZ-74 | E2E del panel autenticado (Playwright) | ⬜ Pendiente | 🟠 **sube por BZ-81** |
| BZ-75 | Especificar los mappers y bajar la deuda del baseline | ⬜ Pendiente | 🟠 |
| BZ-76 | Dos imágenes de producto dan 404 en producción | 🔶 Diagnosticada | 🔴 |
| BZ-77 | Imágenes en base64 incrustadas en el HTML | ⬜ Pendiente | 🟡 |
| BZ-78 | Gate de tamaño de archivo (Regla 9.1) | ✅ Hecho | 🟠 |
| BZ-79 | Tres componentes de admin superan las 500 líneas | ⬜ Pendiente | 🟠 |
| BZ-80 | **`anon` puede leer productos en borrador** | 🔶 Parte C lista, resto especificado | 🔴 |
| BZ-81 | **El inicio dice guardar y no guarda** | 🔶 Código hecho, falta aplicar el SQL | 🔴 |
| BZ-82 | **Las galerías guardan el nombre del archivo** | 🔶 Código hecho, faltan resubir 6 fotos | 🔴 |
| BZ-83 | Responsive del panel admin | ✅ Hecho | 🟠 |
| BZ-84 | El panel en táctil (reordenar, overflow, targets) | ⬜ SPEC-907 en borrador | 🟠 |
| BZ-85 | Runbook de despliegue en cuentas nuevas | ✅ Hecho | 🔴 |

**Progreso:** 18 de 33 hechas, 6 parciales.

| Prioridad | Significado |
|---|---|
| 🔴 P0 | Bloquea el resto de la cadena o hay riesgo de seguridad |
| 🟠 P1 | Necesario para que los gates sirvan de verdad |
| 🟡 P2 | Deuda con impacto real, sin urgencia |
| ⚪ P3 | Evaluación o mejora |

---

## 🔴 BZ-85 · Desplegar en cuentas nuevas ✅

**2026-08-30.** El sistema se va a redesplegar en cuentas nuevas de GitHub,
Supabase y Cloudflare. Runbook completo en
[`docs/1_inbox/20260830-0900-despliegue-cloudflare.md`](../1_inbox/20260830-0900-despliegue-cloudflare.md).

**El hallazgo que justifica la tarea:** `schema.sql` **no tiene ni un `GRANT`**.
Nunca hizo falta, porque hasta 2026 Supabase los concedía solos. Desde el
**30-05-2026** los proyectos nuevos ya no, y desde el **30-10-2026** tampoco los
existentes. Cargar el esquema tal cual en una cuenta nueva deja el sitio
completamente muerto — y con un síntoma que engaña: la landing no da error, los
servicios devuelven listas vacías y parece que falló el seed.

Se añade [`supabase/grants-data-api.sql`](../../supabase/grants-data-api.sql),
que incluye un detalle que solo aparece al crear un producto: `delta_crud`
convierte `code` en `nextval(...)`, y un INSERT necesita **USAGE sobre esas dos
secuencias** aunque la tabla tenga todos sus permisos.

Otros tres cambios de 2026 documentados: claves `sb_publishable_` (las JWT
quedan obsoletas a fin de año), Workers Builds con **Node 24 por defecto** frente
al 22.12 del CI, y `r2.dev` desaconsejado para producción por límite de tasa.

**Corregido de paso:** `schema.sql:339` no existe —el comentario está en la 336—
y la referencia estaba mal en SPEC-904.

---

## 🟠 BZ-83 · Responsive del panel admin ✅

**Auditoría del 2026-08-26.** El panel no estaba "mal adaptado": las pantallas
donde se trabaja **no estaban adaptadas**. El esqueleto sí —sidebar off-canvas,
hamburguesa, padding— y el Resumen también. El resto, nada.

### Los siete hallazgos, por gravedad

| # | Qué | Tipo |
| :--- | :--- | :--- |
| 1 | `height:100vh` + `overflow:hidden` en el shell | **funcional** |
| 2 | Reordenar imposible en táctil (7 superficies `draggable`) | **funcional** |
| 3 | Login en dos columnas de 187 px, sin media query | **funcional** |
| 4 | Tabla de Productos: 5 columnas sin punto de ruptura | legibilidad |
| 5 | `repeat(3,1fr)` fijo en Inicio y Galerías | legibilidad |
| 6 | Barras superiores de alto fijo, sin `flex-wrap` | legibilidad |
| 7 | El `768px` duplicado como literal en dos archivos | mantenimiento |

**El primero es el que más sorprende.** El contenido scrollea en un hijo y el
padre está en `overflow:hidden`; en un navegador móvil con barra dinámica,
`100vh` es la altura **máxima** del viewport, no la visible. Unos 60–100 px del
panel quedan permanentemente bajo la barra del navegador y **no hay forma de
alcanzarlos** — justo donde viven los botones del final del contenido.

### Lo entregado — [SPEC-906](../../.sdd/specs/SPEC-906-responsive-admin.md), aprobada

**Todo el responsive del panel vive ahora en `tokens.css`**, y no por gusto: los
`<style>` de Astro son scoped, así que cada pantalla que quiera su media query
tiene que reescribir el punto de ruptura. `tokens.css` ya documentaba esa lección
**para la landing** desde antes de esta SPEC; el panel nunca la aplicó.

| Antes | Ahora |
| :--- | :--- |
| `100vh` en shell y login | `100dvh` con `100vh` de respaldo |
| login `1fr 1fr` fijo | apila y oculta el panel de marca en móvil |
| tabla de 5 columnas | cabecera oculta y filas apiladas |
| `repeat(3,1fr)` suelto | `.bz-grid-cards` → 3 / 2 / 1 |
| topbar `height:68` | `min-height` + `flex-wrap` |
| `768px` en 2 archivos | en `tokens.css` y en ninguno más |

### El sexto gate

`scripts/sdd/responsive.mjs` vigila tres cosas sobre `src/admin/**`: que no
vuelva un `100vh` sin respaldo, que ninguna rejilla de 3 columnas quede sin
clase, y que ningún componente redeclare un punto de ruptura. Más un **check de
contrato**: cada clase de `tokens.css` tiene que existir *y* estar aplicada.

Eso último cubre un fallo silencioso de los dos lados: el CSS no se queja de un
selector que no encuentra a nadie, y el JSX tampoco de una clase que no existe.
El síntoma aparecería en un teléfono, semanas después.

**En su primera ejecución encontró los 7 incumplimientos reales**, incluidos los
2 que yo no había anotado.

### El gate me corrigió dos veces

**1 · El detector estaba mal, no el CSS.** Marcaba `tokens.css` como error: el
respaldo correcto son *dos* declaraciones (`100vh` y luego `100dvh`), y en CSS
real ocupan dos líneas. Miraba solo una.

**2 · Dos requisitos no tenían test, y no podían tenerlo.** REQ-996 (sin scroll
horizontal a 360 px) y REQ-998 (reordenar sin ratón). El primero necesita un
navegador con layout —jsdom devuelve ceros, así que un test contra jsdom pasaría
siempre y mediría jsdom—; el segundo toca cuatro componentes, dos en el trinquete
de `BZ-79`, sin capa de tests que los cubra.

Dejarlos en una spec APROBADA obligaba a inventar un test que no prueba nada o a
desactivar el check: **los dos síntomas que la sección de Riesgos define como
"SDD adoptado como decoración"**. Se mudaron a
[SPEC-907](../../.sdd/specs/SPEC-907-panel-tactil.md), en borrador, donde el gate
los reporta como hueco informativo. Es `BZ-84`.

### Lo que esto NO dice

**No dice que el panel se vea bien.** Dice que las tres causas mecánicas están
corregidas y vigiladas. Comprobar el aspecto necesita `BZ-74` o una persona con
un teléfono, y conviene hacerlo: es la primera vez que estas pantallas se ven en
un ancho pequeño.

---

## 🟠 BZ-84 · El panel en un dispositivo táctil ⬜

[SPEC-907](../../.sdd/specs/SPEC-907-panel-tactil.md), **en borrador**. Tres
requisitos que `BZ-83` no pudo cerrar:

- **REQ-998 · reordenar sin ratón.** Siete superficies usan `draggable` de HTML5;
  esos eventos no existen en táctil. Hoy el orden de los productos de una sección,
  de las fotos de la galería y de las secciones del inicio **solo se puede cambiar
  desde un ratón**. La propuesta son botones ↑/↓ bajo `@media (pointer: coarse)`,
  reusando el estado que ya mueve el `drop`.
- **REQ-996 · sin desbordamiento horizontal**, verificado con Playwright a 360,
  768 y 1280 px. Barato **una vez que `BZ-74` exista**.
- **REQ-999 · objetivos táctiles de 44 px.** Los botones de borrar foto miden
  26 × 26: cumplen el mínimo AA de WCAG 2.2 por poco, y son destructivos.

**El orden sano es `BZ-60` → `BZ-74` → esta SPEC.** REQ-999 es la excepción: es
padding, no toca lógica, y puede adelantarse en cuanto se apruebe.

---

## 🔴 BZ-82 · Las galerías guardan el nombre del archivo 🔶

**Reportado el 2026-08-26.** No era el bug de `BZ-81`: acá la persistencia sí
funcionaba. Lo que estaba mal era el dato.

```tsx
// src/admin/shared/GalleryAdmin.tsx:134 — antes
setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, image: file.name } : p)));
```

El **nombre del archivo**, no la imagen. Las seis filas de producción lo
confirman: `firefox_ix0xISR5X0.png` ×3 y `firefox_BmzQRtw9Ue.png` ×3 — y el
nombre se repite dentro de cada galería, que es lo que pasa cuando la identidad
de una imagen es lo que le puso el sistema operativo a una captura.

**Y un segundo hueco independiente:** aunque hubiera guardado una URL correcta,
la landing seguiría sin mostrarla. `GalleryLightbox` no tenía campo de imagen y
las dos vistas tiraban el dato: `.map((g) => ({ name: g.titulo }))`. Los cuadros
grises no eran imágenes rotas — era el diseño funcionando como se escribió, y esa
línea compila y produce una página que se ve ordenada.

Cerrado con [SPEC-905](../../.sdd/specs/SPEC-905-imagenes-galeria.md), 36 tests.
La imagen sube a R2 al elegirla; el endpoint rechaza todo lo que no sea URL
absoluta; `estadoImagen()` distingue **ausente** de **inválida** —una tarjeta
nueva pide "subí una foto", una fila heredada pide "ésta no sirve"— y el panel
bloquea el guardado antes de la petición, señalando la tarjeta.

**Pendiente humano: volver a subir las seis fotos.** No hay migración posible —
los archivos nunca llegaron a R2, solo existieron como `blob:` en el navegador.
Las filas no se borran: los títulos son contenido real escrito a mano.

**Funciona en cuanto se despliega**: `gallery_item` sí tiene su policy
`"admin write"` desde el principio.

---

## 🔴 BZ-81 · La página de inicio dice guardar y no guarda 🔶

**Reportado el 2026-08-25.** No era un fallo del CRUD: **no había CRUD**.
`confirmSaveChanges()` era un `TODO` que mostraba el toast de éxito y ponía
`__adminHasUnsavedChanges = false`, así que el guardia de navegación tampoco
avisaba. Los logs de Cloudflare solo mostraban `GET` porque el navegador nunca
emitió otra cosa — ese vacío era la prueba, no la falta de evidencia.

Faltaban cuatro capas: la isla, el endpoint, la escritura del servicio y las
policies. Cerrado con
[SPEC-904](../../.sdd/specs/SPEC-904-persistencia-inicio.md), 58 tests.

**Las tres decisiones que costaron algo:**

1. **No hay atomicidad, y decirlo fue mejor que fingirla.** `supabase-js` no
   puede abrir una transacción. Se enmendó REQ-972 en vez de marcarlo verde: hay
   un **diff con los borrados al final**. La alternativa —`delete` de todo,
   `insert` de todo— es más corta y deja la portada en blanco si el segundo paso
   falla; con el diff, volver a pulsar Guardar converge.
2. **El esquema corrigió un test.** `home_hero_image.image_url` es `NOT NULL`:
   una portada vacía es una fila **ausente**, no una fila con `null`, y como los
   huecos pueden estar en medio, se emparejan por `sort_order`.
3. **Productos por id.** La isla los guardaba por nombre y la vista traducía al
   entrar, descartando en silencio los que no resolvían.

De paso, medio `BZ-77`: `readFileAsDataURL()` desapareció de esa pantalla.
`ProductsAdmin.tsx` conserva su copia inline y **no se tocó** — está en el
trinquete de `BZ-79`.

**Pendiente humano: aplicar
[`supabase/pendiente-policies-home.sql`](../../supabase/pendiente-policies-home.sql).**
Hasta entonces guardar devuelve *"new row violates row-level security policy"* y
el panel lo muestra — que es el comportamiento correcto. Un fallo visible es el
resultado; el toast verde mentiroso era el bug.

Ojo con el orden: si `admin_profile` tiene RLS **sin** su policy `"self read"`,
estas tres tampoco funcionarán. El ensayo en seco del
[runbook](../3_recursos/20260824-1200-runbook-aplicar-rls-admin-profile.md) lo
comprueba antes de confirmar.

**Deuda anotada:** `InicioAdmin.tsx` pasó de 835 a 890 líneas. Está en el
baseline y no bloquea, pero creció contra la dirección de `BZ-79`.

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

### Parte C — lista para aplicar sola ✅

`admin_profile` **no tiene `enable row level security`** en el esquema. Las otras
diez tablas sí. Con RLS deshabilitado y los GRANT que Supabase da por defecto a
`anon`, cualquiera con la clave pública puede leer la tabla entera.

Hoy la auditoría responde AVISO y no FALLA porque desde fuera no se distingue
"protegida" de "vacía" (REQ-933). **Eso no es una defensa, es una casualidad:**
en cuanto exista el primer perfil de administrador, se filtra.

Está separada en [`supabase/fix-rls-admin-profile.sql`](../../supabase/fix-rls-admin-profile.sql)
porque **no depende de ningún cambio de código**. El paso a paso para aplicarla
desde el panel está en
[`docs/3_recursos/20260824-1200-runbook-aplicar-rls-admin-profile.md`](../3_recursos/20260824-1200-runbook-aplicar-rls-admin-profile.md).

Vuelta atrás en una línea: `alter table admin_profile disable row level security;`

**Queda pendiente de que alguien lo ejecute** en el SQL Editor de Supabase — no
tengo forma de aplicar DDL desde acá, y de todos modos es decisión humana
(Constitución 8.5).

#### Corrección del 2026-08-24 — dos afirmaciones de la 4ª revisión eran falsas

Escribir el runbook obligó a verificar contra la documentación, y dos cosas que
esta sección daba por ciertas no lo eran.

**1. El mecanismo.** Decía que las subconsultas de una policy corren "con los
permisos de su propietario". PostgreSQL dice lo contrario —*"run as part of the
query and with the privileges of the user running the query"*— y el RLS de la
tabla referenciada **sí** se aplica. La conclusión (no rompe el panel) se
sostiene por otro motivo: `"self read"` devuelve la única fila que la subconsulta
necesita, y las `"admin write"` son todas `to authenticated`, así que `anon`
jamás las evalúa. Pero aparece una condición operativa nueva: **ejecutar el
`enable` sin el `create policy` rompe el panel**, por default-deny. De ahí el
`begin; … commit;` que ahora envuelve el archivo.

**2. La verificación.** TEST-P03 **no** pasa a PASA: RLS filtra filas, no rechaza
peticiones, y PostgREST sigue devolviendo `200` con `[]` — indistinguible de hoy,
que es lo que REQ-933 obliga a reportar como AVISO. Llega a PASA solo con el
`revoke select on admin_profile from anon` opcional del runbook. La verificación
real es `pg_class.relrowsecurity` en el SQL Editor, no la sonda.

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

## ✅ Cerradas — historial

El detalle técnico vive en su SPEC y en el mensaje de commit; el tablero guarda
la decisión y el motivo, que es lo que hace falta dentro de seis meses.

| Tarea | Decisión, y por qué |
| :--- | :--- |
| **BZ-72** · `/api/diagnostico` protegido<br>[SPEC-903](../../.sdd/specs/SPEC-903-acceso-diagnostico.md) | Nunca devolvía el *valor* de una variable, pero sí el mapa: nombres de todas —secretos incluidos—, bindings y SHA. **Cerrarlo sin quedarse ciego** obligó a tres niveles: sin token → 200 reducido con la pista; con token y cabecera → detalle entero; con token y sin cabecera → **404 vacío**, porque un 403 confirmaría la ruta. Más `/api/salud`, donde vive la comparación del commit para que no dependa de un secreto. Comparación en tiempo constante (XOR) y **token vacío = no configurado**, el caso real de un secreto mal cargado. |
| **BZ-68** · Quién despliega | **Workers Builds publica; Actions verifica.** Medido, no elegido: push `12:17:32Z` → deploy `12:18:16Z`, **44 s**. No se toca el desplegador. *Riesgo anotado:* el deploy no está condicionado a que los gates pasen. |
| **BZ-63** · ¿Precios en céntimos? | **No migrar.** La Constitución 3.2 ya cubre el caso intermedio y elimina el riesgo real sin tocar la base ni el panel. Se reevalúa solo con descuentos, IGV desglosado o precios por volumen. |
| **BZ-59** · Capa 3 completa | `POST /api/media` de punta a punta en workerd contra el bucket real de Miniflare: bytes, `content-type`, normalización, `../../../secreto.png`, rechazo de SVG/HTML (XSS almacenado bajo el propio dominio), colisiones. **No cierra `BZ-25`**: prueba el código, no la cuenta. |
| **BZ-78** · Gate de tamaño | La Regla 9.1 llevaba desde el primer día sin que nadie la comprobara. Encontró tres incumplimientos. Trinquete en vez de partirlos a la fuerza — eso sería la regresión que el tablero evita. |

---

## Pendientes

### BZ-70 · Verificar RLS 🔶 🔴 — la mitad hecha, y la mitad valiosa

**Lo que se hizo:** `npm run audit:rls`, una auditoría de **solo lectura** contra
la base viva con el rol `anon`. Encontró `BZ-80`. Está especificada como Enmienda
1 de [SPEC-902](../../.sdd/specs/SPEC-902-rls-supabase.md), con tres requisitos
nuevos (REQ-931..933).

**Por qué no se hizo pgTAP:** el proyecto no está inicializado como proyecto de
Supabase CLI —falta `supabase/config.toml`—. Levantarlo pide `supabase init` +
`supabase start` (Docker 29.4.2 instalado) y cargar el esquema.

**Riesgo evaluado:** `supabase init` es aditivo y sin riesgo. El riesgo real está
en otra parte: si el esquema local **no reproduce exactamente** las políticas de
producción, pgTAP verifica la base equivocada y da confianza falsa, que es peor
que no tener test. Antes del primer `.sql` hay que confirmar que `schema.sql` +
`delta_crud.sql` reproducen producción — y `BZ-81` acaba de mostrar que
`schema.sql` documenta como "pendiente" tres policies que siguen faltando.

Lo único que pgTAP puede comprobar y la auditoría no: las **escrituras**
(REQ-924, REQ-925) y si `admin_profile` está protegida o simplemente vacía.

### BZ-76 · Imágenes 404 en producción 🔶 🔴 — diagnosticada

Confirmado con `wrangler r2 object get`: **`The specified key does not exist`**.
No es un problema de acceso público ni de la URL: los objetos no están en el
bucket. De 5 URLs de R2 referenciadas entre portada y catálogo, 3 responden 200
y 2 dan 404.

Ambas claves rotas terminan en el mismo nombre de origen
(`...-whatsapp-image-2026-07-10-at-6-17-07-pm.webp`) con UUID distinto: fotos
registradas en la base que nunca llegaron al bucket, o borradas de él sin limpiar
la referencia — justo lo que `BZ-11` previene y sigue abierta.

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
BZ-81 (el inicio no guarda) 🔴 ─┬─ pendiente-policies-home.sql (falta aplicar)
                                └─ BZ-74 (E2E) · BZ-77 (base64) · BZ-79
BZ-82 (galerías sin imagen) 🔴 ─┬─ subirImagen() de SPEC-904 (reutilizado)
                                └─ resubir 6 fotos · BZ-76 (degradación) · BZ-74
BZ-83 (responsive panel) ✅ ───── BZ-84 (táctil) ⬜ ── BZ-60 → BZ-74 primero
```

**Orden sugerido para la próxima sesión:**
aplicar los dos SQL + resubir las 6 fotos + cargar el token → `BZ-76` →
`BZ-60` → `BZ-74` (E2E) → `BZ-84` (táctil) → `BZ-70` (pgTAP) → `BZ-80` pasos
1-3 → `BZ-79` → `BZ-75` → `BZ-69` → `BZ-73` → `BZ-71` → `BZ-77`.

**Por qué.** Lo que queda en la cabeza de la lista ya no es código: hay **tres
acciones humanas de pocos minutos** que desbloquean lo demás.

1. `supabase/pendiente-policies-home.sql` — sin esto, guardar el inicio falla.
2. `supabase/fix-rls-admin-profile.sql`, con su
   [runbook](../3_recursos/20260824-1200-runbook-aplicar-rls-admin-profile.md).
   Va **antes** que el anterior: las policies del inicio leen `admin_profile`.
3. **Volver a subir las seis fotos de la galería** desde el panel. Es la única
   parte de `BZ-82` que no se puede resolver con código.
4. `npx wrangler secret put BARZOL_DIAGNOSTICO_TOKEN` — lleva el diagnóstico del
   nivel `reducido` al `oculto` ya implementado y probado.

Después `BZ-76`, lo único roto que ve un visitante. Y luego **`BZ-60` sube de
golpe**: ya no bloquea solo a `BZ-79`, sino también a `BZ-74` y con él a `BZ-84`.
Tres tareas esperando la misma pieza es la señal de que toca desbloquearla.

El resto de `BZ-80` va al final porque arrastra un refactor de servicios que
necesita su propia SPEC.

---

## Riesgos

**El fracaso característico de SDD es adoptarlo como decoración.** Las señales:
SPECs escritas *después* del código para pasar el gate; gates desactivados "solo
esta vez"; cobertura que sube mientras los tests no verifican nada.

**El riesgo que introduje yo, y conviene vigilar:** los gates ya tienen **tres**
mecanismos de tolerancia — trinquete de specs (**18**, era 23), trinquete de tamaño
(3 archivos) y specs en borrador que no bloquean. Los tres están justificados y
los tres son la puerta por la que entra la decoración. La salvaguarda es que las
dos listas **solo puedan encoger** y que aprobar una spec sea un acto explícito.

Si dentro de un mes el baseline sigue igual y no hay specs nuevas aprobadas, el
proceso será un adorno por más verde que salga el gate. **Señal buena:** el
trinquete bajó de 23 a 18 en dos sesiones y hay cuatro specs APROBADAS, sin que
nadie forzara la lista: encogió porque se escribieron specs.

**Y una trampa que casi se cuela.** El gate da por cubierto cualquier archivo que
una SPEC **nombre**, y SPEC-904 mencionaba `homeMapper.ts` sólo de pasada. Eso lo
habría sacado del trinquete sin que nadie especificara nada — cobertura de
mentira, exactamente la decoración que esta sección teme. Se resolvió escribiendo
en el contrato qué fija SPEC-904 sobre ese archivo (`HomeItemRow` es la fuente de
la forma de fila, y la traducción `tipo`↔`type` vive sólo ahí), que es verdad y
ahora está dicho. La alternativa era borrar la mención y dejar el trinquete en 21.

**Lo que demuestra que no lo es, por ahora:** en cuatro sesiones los gates han
encontrado una fuga de datos en producción, dos imágenes rotas que nadie vio, un
hueco en un plan escrito el día anterior, tres archivos que incumplían una regla
propia, ocho errores de tipos y un `baseUrl` deprecado. Ninguna la encontró una
persona mirando la web.

**El gate nuevo se ganó el sitio en su primera ejecución:** `responsive.mjs`
encontró los 7 incumplimientos reales del panel, incluidos 2 que la auditoría a
ojo no había anotado. Y reclamó dos requisitos sin test — con razón: no se podían
verificar, y la salida honesta era moverlos a una spec en borrador, no inventarles
un test. Ésa es la diferencia entre el proceso funcionando y el proceso de adorno.

**Y el punto ciego que `BZ-81` y `BZ-82` enseñaron, dos veces:** ninguno de los
cinco gates ni de las tres sondas ejercita el panel autenticado. Un botón que
muestra "guardado" sin emitir una petición pasa los cinco en verde. Una vista que
descarta la URL de la imagen y pinta tres cuadros grises alineados, también.

Las dos las encontró una persona usando la web, y las dos llevaban ahí desde que
se escribió la pantalla. La cobertura mide qué líneas se ejecutan, no si el
sistema hace lo que dice hacer — y esa distancia es donde vivieron los dos bugs.
`BZ-74` deja de ser una evaluación: es la única herramienta que los habría visto.
