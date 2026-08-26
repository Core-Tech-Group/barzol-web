# Scrumban — SDD, pruebas del sistema y DevOps

> **Creado:** 2026-08-21 · **Última actualización:** 2026-08-25 (6ª revisión) · **Rama:** `main`
> **Alcance:** integrar Spec-Driven Development, construir la infraestructura de
> pruebas sobre los runtimes reales, y cerrar el ciclo de despliegue con gates
> verificables.
> **Tablero hermano:** [`20260808-1727-kanban-avance-cloudflare-r2-vercel.md`](20260808-1727-kanban-avance-cloudflare-r2-vercel.md) — el del despliegue. Este continúa su numeración desde `BZ-53`.
> **Material base:** [`../1_inbox/SDD-TESTING-BARZOL-2026.md`](../1_inbox/SDD-TESTING-BARZOL-2026.md) · **Capa SDD:** [`.sdd/`](../../.sdd/README.md)

Las tareas no repiten el contenido de las specs: cada una enlaza la suya. Aquí va
la decisión, el riesgo y el orden; el detalle técnico vive en `.sdd/`.

---

## Estado — 2026-08-25, 6ª revisión

**`BZ-81` implementada entera.** SPEC-904 aprobada → RED → GREEN → gate, en el
mismo ciclo que `BZ-72`. El botón de la página de inicio ya no miente: envía,
espera respuesta y solo entonces dice que guardó.

| Control | 5ª revisión | Ahora |
| :--- | :--- | :--- |
| Tests | 82 | **140** — 109 Node, 31 workerd |
| Specs aprobadas / totales | 2 / 8 | **3** / 8 |
| Trinquete de specs | 23 | **20** |
| `fetch` en `InicioAdmin.tsx` | 0 | vía `guardarInicio.ts` |

**Falta un paso que no es código.** Las tres tablas del inicio siguen sin policy
de escritura, así que hoy guardar devuelve un error de RLS. Es el
comportamiento correcto y deliberado: **falla ruidosamente en vez de mentir**.
Se cierra aplicando
[`supabase/pendiente-policies-home.sql`](../../supabase/pendiente-policies-home.sql).

---

## Estado — revisiones anteriores (22-08-2026)

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

**Progreso:** 16 de 29 hechas, 5 parciales.

| Prioridad | Significado |
|---|---|
| 🔴 P0 | Bloquea el resto de la cadena o hay riesgo de seguridad |
| 🟠 P1 | Necesario para que los gates sirvan de verdad |
| 🟡 P2 | Deuda con impacto real, sin urgencia |
| ⚪ P3 | Evaluación o mejora |

---

## 🔴 BZ-81 · La página de inicio dice guardar y no guarda

**Reportado el 2026-08-25 desde el panel.** No era un fallo del CRUD: no había
CRUD. `confirmSaveChanges()` era un `TODO` que mostraba el toast de éxito y
ponía `__adminHasUnsavedChanges = false`, así que el guardia de navegación
tampoco avisaba. Los logs de Cloudflare solo mostraban `GET` porque el
navegador nunca emitió otra cosa.

### Lo que se implementó — [SPEC-904](../../.sdd/specs/SPEC-904-persistencia-inicio.md), aprobada

Ciclo completo: SPEC → RED → GREEN → gate. **58 tests nuevos**, ninguno
mockeando bindings ni `supabase-js`.

| Capa | Antes | Ahora |
| :--- | :--- | :--- |
| UI | `TODO` + toast | `guardarInicio.ts`, toast solo tras `success` |
| Endpoint | no existía | `PUT /api/inicio` con `locals.supabase` |
| Servicio | solo lectura | `updateInicio()` ejecutando un plan |
| Decisión | — | `inicioPlan.ts`, pura y probada entera |
| Base | sin policies | SQL escrito, **sin aplicar** |

### Las tres decisiones que costaron algo

**1 · Atomicidad: no la hay, y decirlo fue mejor que fingirla.** REQ-972 pedía
que un fallo parcial dejara el inicio como estaba. Eso es una transacción, y
`supabase-js` no puede abrir una: cada llamada de PostgREST es su propia
transacción implícita. La única forma sería una función de Postgres invocada con
`rpc()`, o sea una migración que ni viaja en este commit ni puedo aplicar.

Se enmendó el requisito en vez de marcarlo verde. Lo que hay es un **diff con
los borrados al final**: actualizar, insertar, y solo entonces borrar. La
alternativa evidente —`delete` de todo, `insert` de todo— es dos líneas más
corta y deja la portada en blanco si el segundo paso falla. Con el diff, un
fallo parcial deja el inicio a medio actualizar, visible, y **volver a pulsar
Guardar converge**, porque el diff se calcula contra lo que hay.

**2 · El esquema corrigió un test.** `home_hero_image.image_url` es `NOT NULL`
(`schema.sql:205`). Los tests que escribí antes de mirarlo asumían que quitar
una portada era un `update` a `null`; eso habría reventado el guardado entero
con un error de Postgres ilegible. Una portada vacía es una fila **ausente**, y
como los huecos pueden estar en medio, las filas hero se emparejan por
`sort_order` y no por posición.

**3 · Productos por id (REQ-974).** La isla los guardaba por nombre y
`InicioView.astro` traducía al entrar — descartando en silencio los que no
resolvían. Ahora el id viaja intacto y el nombre se resuelve solo al pintar; un
producto borrado del catálogo se muestra como *"(producto N ya no existe)"* en
vez de desaparecer. El catálogo real tiene *"Soporte de Celular Trompeta"* y
*"...(copia)"*: por nombre eran indistinguibles en cuanto alguien renombrara uno.

### De paso, medio `BZ-77`

`readFileAsDataURL()` ya no existe en esta pantalla. Las imágenes hero y de
banner suben a R2 con `subirImagen()`, un helper nuevo en `uploadClient.ts` que
valida el MIME, optimiza y devuelve la URL pública. Conectar el guardado sin
esto habría grabado base64 dentro de `home_hero_image.image_url` para servirlo
en cada visita a la portada.

`ProductsAdmin.tsx` sigue con su copia inline del mismo flujo. **No se tocó**:
está en el trinquete de `BZ-79` y su refactor no cabe en esta tarea. Queda
anotado como el siguiente uso de `subirImagen()`.

### Lo que falta, y por qué falla hoy a propósito

Las policies `"admin write"` de `home_item`, `home_hero_image` y
`home_section_product` **siguen sin existir**, tal como `schema.sql:339` viene
documentando desde el primer día. Guardar hoy devuelve *"new row violates
row-level security policy"* — y el panel lo muestra, que es exactamente el
comportamiento que esta tarea vino a conseguir. Un fallo visible es el resultado
correcto; el toast verde mentiroso era el bug.

Se cierra aplicando
[`supabase/pendiente-policies-home.sql`](../../supabase/pendiente-policies-home.sql)
en el SQL Editor. Es aditivo, no quita permisos a nadie y va en una transacción.
Ojo con el orden: si `admin_profile` tiene RLS habilitado **sin** su policy
`"self read"`, estas tres tampoco funcionarán — el ensayo en seco del
[runbook](../3_recursos/20260824-1200-runbook-aplicar-rls-admin-profile.md) lo
comprueba antes de confirmar.

### La deuda que esto suma, dicha en voz alta

`InicioAdmin.tsx` pasó de **835 a 889 líneas**. Está en el baseline y no
bloquea, pero creció en la dirección contraria a `BZ-79`. La orquestación del
guardado salió a `guardarInicio.ts` (114 líneas) precisamente para que no
llegara a ~1000; el resto es manejo de errores que antes no existía. Anotado.

### Por qué ningún gate lo encontró

Los cinco gates miran el repositorio y las tres sondas miran producción desde
fuera. Ninguno ejercita el panel autenticado. Un botón que muestra "guardado"
sin emitir una petición pasa los cinco en verde. `BZ-74` (E2E) sube a 🟠 por
esto: un test que pulse *Guardar* y recargue habría fallado el primer día.

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

El detalle técnico de cada una vive en su SPEC y en el mensaje de commit. Aquí
queda la decisión y el motivo, que es lo que hace falta dentro de seis meses.

### BZ-72 · `/api/diagnostico` protegido ✅ 🔴 — hereda y cierra `BZ-37`

[SPEC-903](../../.sdd/specs/SPEC-903-acceso-diagnostico.md), ciclo RED → GREEN,
26 tests sin mocks. El endpoint nunca devolvía el *valor* de una variable, pero
sí el mapa: los nombres de todas —secretos incluidos—, los bindings y el SHA.

**El problema no era cerrarlo, era cerrarlo sin quedarse ciego**, así que hay
tres niveles y no dos: sin token configurado responde 200 reducido con la pista
de cómo configurarlo; con token y cabecera correcta, el detalle entero; con
token y sin cabecera, **404 vacío** —un 403 confirmaría que la ruta existe—.
Más `GET /api/salud`, público y mínimo, donde vive ahora la comparación del
commit para que no dependa de un secreto.

Dos detalles que valían el esfuerzo: comparación en **tiempo constante** con XOR
(REQ-945), porque un `===` corta en la primera diferencia y el tiempo filtra el
token carácter a carácter; y **token vacío = no configurado** (REQ-946), el caso
real de un secreto mal cargado, que si contara como configurado dejaría el
endpoint apagado para siempre con el motivo invisible.

### BZ-68 · Quién despliega ✅ 🔴 — cerrado con evidencia

**Workers Builds publica; GitHub Actions verifica.** Medido, no elegido: push de
`a7eb50d` a las `12:17:32Z`, despliegue a las `12:18:16Z` — **44 segundos**. El
humo lo confirmó desde el otro lado con TEST-S06.

No se toca el desplegador: cambiar una integración que publica en 44 s por un
workflow que nunca ha corrido sería empeorar a propósito. **Riesgo anotado:** el
despliegue no está condicionado a que los gates pasen; un commit rojo llega
igual a producción y el check se pone rojo después.

### BZ-63 · Precios en céntimos ✅ 🟡 — decidido: no migrar

La Constitución 3.2 ya cubre el caso intermedio —céntimos en la lógica pura,
conversión validada en el mapper— y eso elimina el riesgo real sin tocar la base
ni el panel. Se reevalúa **solo** si aparecen descuentos, IGV desglosado o
precios por volumen.

### BZ-59 · Capa 3 completa ✅ 🔴

De 4 tests a 13: `POST /api/media` de punta a punta dentro de workerd contra el
bucket real de Miniflare. Cubre bytes persistidos, `content-type` como metadato,
normalización del nombre, `../../../secreto.png`, rechazo de SVG y HTML (un
bucket público sirviendo SVG es XSS almacenado bajo el propio dominio),
colisiones y no filtrar el nombre del bucket. **No cierra `BZ-25`**: prueba el
código, no la cuenta.

### BZ-78 · Gate de tamaño de archivo ✅ 🟠

La Regla 9.1 estaba escrita desde el primer día y **nadie la comprobaba**.
Encontró `ProductsAdmin.tsx` (1378), `InicioAdmin.tsx` (835) y
`CategoriesAdmin.tsx` (730), más `GalleryAdmin.tsx` acercándose con 471. Los
tres quedan en el baseline y no bloquean; cualquier archivo nuevo sí. Partir
1378 líneas para que el gate se ponga verde sería la regresión que este tablero
intenta evitar — es `BZ-79`. La documentación queda fuera del bloqueo: un kanban
crece por acumular historia, no complejidad.

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
BZ-81 (el inicio no guarda) 🔴 ─┬─ SPEC-904 fase 1 (independiente)
                                ├─ pendiente-policies-home.sql (independiente)
                                └─ BZ-74 (E2E) · BZ-77 (base64) · BZ-79
```

**Orden sugerido para la próxima sesión:**
aplicar los dos SQL pendientes + cargar el token del diagnóstico → `BZ-76` →
`BZ-74` (E2E) → `BZ-70` (pgTAP) → `BZ-80` pasos 1-3 → `BZ-60` → `BZ-79` →
`BZ-75` → `BZ-69` → `BZ-73` → `BZ-71` → `BZ-77`.

**Por qué.** Lo que queda en la cabeza de la lista ya no es código: hay **tres
acciones humanas de pocos minutos** que desbloquean lo demás.

1. `supabase/pendiente-policies-home.sql` — sin esto, guardar el inicio falla.
2. `supabase/fix-rls-admin-profile.sql`, con su
   [runbook](../3_recursos/20260824-1200-runbook-aplicar-rls-admin-profile.md).
   Va **antes** que el anterior: las policies del inicio leen `admin_profile`.
3. `npx wrangler secret put BARZOL_DIAGNOSTICO_TOKEN` — lleva el diagnóstico del
   nivel `reducido` al `oculto` ya implementado y probado.

Después `BZ-76`, lo único roto que ve un visitante, y `BZ-74`, que deja de ser
una evaluación: `BZ-81` demostró que ningún gate ejercita el panel autenticado.
El resto de `BZ-80` va al final porque arrastra un refactor de servicios que
necesita su propia SPEC.

---

## Riesgos

**El fracaso característico de SDD es adoptarlo como decoración.** Las señales:
SPECs escritas *después* del código para pasar el gate; gates desactivados "solo
esta vez"; cobertura que sube mientras los tests no verifican nada.

**El riesgo que introduje yo, y conviene vigilar:** los gates ya tienen **tres**
mecanismos de tolerancia — trinquete de specs (**20**, era 23), trinquete de tamaño
(3 archivos) y specs en borrador que no bloquean. Los tres están justificados y
los tres son la puerta por la que entra la decoración. La salvaguarda es que las
dos listas **solo puedan encoger** y que aprobar una spec sea un acto explícito.

Si dentro de un mes el baseline sigue igual y no hay specs nuevas aprobadas, el
proceso será un adorno por más verde que salga el gate. **Señal buena:** el
trinquete bajó de 23 a 20 y hay una tercera spec APROBADA, sin que nadie forzara
la lista: encogió porque se escribió una spec.

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

**Y el punto ciego que `BZ-81` acaba de enseñar:** ninguno de los cinco gates ni
de las tres sondas ejercita el panel autenticado. Un botón que muestra "guardado"
sin haber emitido una sola petición pasa los cinco en verde. La cobertura mide
qué líneas se ejecutan, no si el sistema hace lo que dice hacer — y esa distancia
es exactamente donde vivió este bug desde el primer día.
