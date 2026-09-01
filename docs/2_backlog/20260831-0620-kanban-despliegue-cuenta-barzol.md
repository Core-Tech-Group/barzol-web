# Scrumban — despliegue en la cuenta `barzolweb3d`

> **Abierto:** 2026-08-31 · **Continúa** `BZ-85` del
> [kanban de SDD y DevOps](20260821-2218-kanban-sdd-integracion-pruebas-unitarias-devops.md)
> **Contrato:** [SPEC-908](../../.sdd/specs/SPEC-908-despliegue-cuenta-barzolweb3d.md) — **APROBADA** 2026-08-31 · **Enmienda 1** 2026-09-01
> **Contrato:** [SPEC-909](../../.sdd/specs/SPEC-909-identidad-administrador.md) — BORRADOR, sin aprobar
> **Verificación humana:** [checklist de SPEC-908](../../tests/manual/SPEC-908-verificacion-humana.md)
> **Runbook:** [despliegue en cuentas nuevas](../1_inbox/20260830-0900-despliegue-cloudflare.md)
> **Logs:** [observability del 2026-08-31](../1_inbox/20260831-0612-logs-despliegue-observability.md)

`BZ-85` escribió el runbook. Este tablero es ejecutarlo sobre la cuenta real,
con el despliegue ya a medio montar y devolviendo 500.

---

## Estado — 2026-08-31, 1ª revisión

**El sitio nuevo está caído y el diagnóstico está cerrado.** No es un misterio ni
hace falta el panel para verlo: el error se reproduce desde fuera en un `curl`.

`wrangler.jsonc:25-26` sigue apuntando al Supabase **viejo**. El secreto cargado
en el worker es la clave del **nuevo**. El worker le habla al proyecto viejo con
una credencial ajena y recibe `Invalid API key`, que es literalmente el mensaje
del log de las 22:48:45.

```
GET https://rnfcccnesxunjtpwahce.supabase.co/rest/v1/product
    apikey: sb_publishable_nRq-…            ← clave del proyecto NUEVO
→ {"message":"Invalid API key",
   "hint":"… This API key might also be owned by another Supabase project."}
```

**Las variables corregidas en el panel de Cloudflare no arreglan nada.** Es el
accidente de la Regla 8.2 por tercera vez, después de `BZ-34` y `BZ-46`:
`wrangler.jsonc` es la única fuente de verdad y el siguiente despliegue reescribe
encima. La captura del panel y el archivo sin corregir describen el mismo bug.

**Y detrás hay un segundo bloqueo.** Arreglar el archivo no basta: el proyecto de
Supabase nuevo está vivo pero vacío.

```
GET https://hlyhkoxnadkxbrjtzuzx.supabase.co/auth/v1/settings  → 200  el proyecto existe
GET https://hlyhkoxnadkxbrjtzuzx.supabase.co/rest/v1/product   → 404  PGRST205
```

`PGRST205` **no distingue** "la tabla no existe" de "la tabla existe sin `GRANT`".
Desde fuera, con clave publishable, los pasos 3.2 y 3.3 del runbook fallan
idénticos. Por eso `BZ-87` hace los dos y verifica con `set local role anon`.

### Los dos logs cuentan dos fallos distintos, no uno

| Hora | Error | Qué significa |
| :--- | :--- | :--- |
| 22:43:01 | `MissingEnvError: … BARZOL_SUPABASE_ANON_KEY` | el secreto **todavía no estaba cargado** |
| 22:48:45 | `Invalid API key` | el secreto ya estaba, y **no corresponde a la URL** |

Cinco minutos entre uno y otro: alguien cargó el secreto entre los dos
despliegues. Sirvió — el worker ya recibe la clave. Lo que falta es que la URL
apunte al proyecto dueño de esa clave.

### El progreso real

**R2 está bien.** `pub-196defbdd…` responde con la misma página 404 de Cloudflare
que el bucket viejo, y eso solo pasa con la Public Development URL habilitada. El
bucket está vacío, que es lo esperado.

### Lo hecho en esta revisión

`SPEC-908` aprobada y aplicada en lo que no exige credenciales: `wrangler.jsonc`,
la URL por defecto del humo, `.env.example`, la documentación vigente y la
validación del SHA. Gates en verde con Node 24.20.0: typecheck 0 errores, 186 + 31
tests, build completo, `sdd:trace` GATE 4 PASA.

**Queda un solo bloqueante para que el sitio sirva contenido: `BZ-87`, el SQL.**
No lo puede cerrar un agente.

### El despliegue de `dee3555`, verificado

Publicado y desplegado. El humo, ejecutado **sin `--url`** para probar de paso que
`BZ-88` quedó bien:

```
[FALLA] TEST-S01 · portada responde 200 con HTML        estado 500
[FALLA] TEST-S02 · una ruta de catálogo devuelve productos
[PASA]  TEST-S03 · 404 servido por la página propia
[PASA]  TEST-S04 · el worker se reporta sano
[AVISO] TEST-S05 · el worker recibe las tres variables   (sin token)
[PASA]  TEST-S06 · el commit desplegado es el que se acaba de publicar
[FALLA] TEST-S07 · una imagen de producto se sirve desde R2
```

**Los tres fallos son `BZ-87` y nada más.** El worker está vivo (S04), sirve su
propio 404 (S03) y corre el bundle recién publicado (S06). Lo que no puede es leer
un catálogo que todavía no existe.

Y el error de fondo **cambió**, que es la señal que importa:

```
antes:   {"message":"Invalid API key"}                       ← proyecto equivocado
ahora:   {"code":"PGRST205","message":"Could not find the
          table 'public.product' in the schema cache"}       ← proyecto correcto, sin esquema
```

El worker ya habla con el Supabase que le corresponde. Cargar el SQL de `BZ-87`
lo levanta **sin necesidad de otro despliegue**.

---

## Estado — 2026-09-01, 2ª revisión

**El sitio ya sirve.** `GET /` devuelve **200** — era 500 en las dos revisiones
anteriores. El responsable cargó el SQL, y eso cerró `BZ-87`.

Comprobado tabla por tabla con la clave anónima: las 8 responden `200`, o sea que
el esquema está cargado **y** los GRANT aplicados. Un `INSERT` anónimo de prueba
sobre `vendor` fue rechazado con `42501 new row violates row-level security
policy`, que es la respuesta correcta: RLS está activo y `anon` no escribe. La
sonda no dejó ninguna fila detrás.

**Lo que falta ahora no es configuración, son datos.** Las 8 tablas están a cero
filas.

| Antes | Ahora |
| :--- | :--- |
| `Invalid API key` — proyecto equivocado | — |
| `PGRST205` — sin esquema | — |
| `GET /` → 500 | `GET /` → **200** |
| humo 4 verdes / 2 fallos | humo **4 verdes / 2 fallos** (S02 y S07, por falta de datos) |
| auditoría RLS **1 fallo** | auditoría **0 fallos**, 12 avisos |

### Los gates confundían «vacío» con «roto»

Con la base ya correcta pero sin filas, `npm run audit:rls` seguía en rojo:

```
[FALLA] TEST-P01 · anon lee productos publicados
         no devolvió ningún producto publicado — ¿RLS demasiado estricto?
```

RLS no tenía nada de malo. **La base no tenía filas.** Y el mensaje no solo
señalaba mal: proponía aflojar las policies de un despliegue recién montado,
cuando `BZ-80` dice que la lectura de `product` está **demasiado abierta**. El
gate sugería la corrección inversa a la correcta, en el único momento en que
alguien lo lee sin contexto.

La sonda de al lado ya resolvía la misma ambigüedad bien: `TEST-P02` devuelve
AVISO y explica que no puede distinguir. La Enmienda 1 hace que las dos razonen
igual (`BZ-93`).

### Lo hecho en esta revisión

- `BZ-93` — Enmienda 1 de SPEC-908 (`REQ-1016`, `REQ-1017`), aplicada.
- `BZ-94` — el Gate 4 truncaba `REQ-1001` a `REQ-100` e **inventaba requisitos**.
- SPEC-908 pasa de 7 REQ verificados a 17, con verificación registrada para todos.

Gates: typecheck 0 errores · **210 + 31** tests (eran 186 + 31) · build completo ·
`sdd:trace` **GATE 4 PASA**.

---

## Estado — 2026-09-01, 3ª revisión

**El panel de administración no deja entrar, y no es la contraseña.**

```
POST /auth/v1/token?grant_type=password
  admin@barzol.internal      → Invalid login credentials
  <correo personal del dueño> → OK, uid <uid del usuario>
```

Misma contraseña en los dos intentos. El usuario existe, está confirmado y su
contraseña es correcta: lo que no coincide es **el email con el que se le busca**.

El panel pide *usuario*, no email. Supabase Auth exige un email. El puente es
`usernameToSyntheticEmail()`, que arma `admin@barzol.internal` de forma
determinista y **no consulta nada**. El alta se hizo con el correo personal de
quien montó la cuenta, así que el login pregunta por una dirección que no existe.

**Todo lo demás del alta está bien**, y eso es parte de por qué costó verlo:

| Pieza | Estado |
| :--- | :--- |
| fila en `admin_profile` | ✅ `username='admin'`, `role='admin'` |
| `id` de `admin_profile` = `id` de `auth.users` | ✅ |
| policy `"self read"` de `admin_profile` | ✅ funciona |
| email confirmado | ✅ |
| **email = `<username>@barzol.internal`** | ❌ **es el correo personal** |

De paso, esto **cierra el punto 2 de «No verificado»**: `admin_profile` sí tiene
su fila, y es correcta. Se pudo comprobar autenticándose, que es lo que la clave
anónima no permitía.

### Lo hecho en esta revisión

- `BZ-96` diagnosticado: causa exacta, reproducida fuera del worker.
- `SPEC-909` — la identidad del administrador, hasta ahora convención tácita.
- `usernameToSyntheticEmail()` tiene tests **por primera vez**: 6.
- Corregido el hueco del checklist manual que dejó pasar este fallo.

Gates: typecheck 0 errores · 210 + **37** tests · build completo · GATE 4 PASA.

---

## Tablero

| Prioridad | Significado |
|---|---|
| 🔴 P0 | El sitio está caído o hay riesgo de credencial |
| 🟠 P1 | El despliegue no es verificable sin esto |
| 🟡 P2 | Deuda con impacto real, sin urgencia |
| ⚪ P3 | Evaluación |

| ID | Tarea | Estado | Prio |
|---|---|---|---|
| BZ-86 | `wrangler.jsonc` apunta al Supabase viejo → `Invalid API key` | ✅ Aplicado | 🔴 |
| BZ-87 | El Supabase nuevo no tiene esquema ni GRANT | ✅ Cargado por el responsable | 🔴 |
| BZ-93 | Los gates confunden «base vacía» con «RLS roto» | ✅ Enmienda 1 aplicada | 🟠 |
| BZ-94 | El Gate 4 trunca `REQ-1001` e inventa requisitos | ✅ Aplicado | 🟠 |
| BZ-95 | La base no tiene datos: falta el seed | ⬜ **Humano — panel admin** | 🔴 |
| BZ-96 | El admin no puede entrar: el email de Auth no deriva del usuario | 🔶 **Diagnosticado — 1 paso humano** | 🔴 |
| BZ-88 | `smoke.mjs` sondea por defecto el despliegue **viejo** | ✅ Aplicado | 🔴 |
| BZ-89 | `/api/salud` informa `commit: "main"` en vez de un SHA | ✅ Resuelto y confirmado | 🟠 |
| BZ-90 | Clave publishable del proyecto viejo versionada en `.env.example` | ✅ Aplicado | 🟠 |
| BZ-91 | Documentación y `.env` local apuntan al despliegue muerto | ✅ Aplicado | 🟡 |
| BZ-92 | Build y CI corren versiones distintas de Node | ⬜ Pendiente, deliberado | 🟡 |

**Progreso:** 8 de 11 cerradas. Los dos bloqueantes que quedan —`BZ-96` y
`BZ-95`— **no los puede cerrar un agente** (Constitución 8.5), y van en ese
orden: sin entrar al panel no se pueden cargar los datos.

---

## 🔴 BZ-86 · `wrangler.jsonc` apunta al Supabase viejo ✅

**La tarea que desbloquea el resto.** Un archivo, dos líneas.

**Antes** — `wrangler.jsonc:25-26`:

```jsonc
"BARZOL_SUPABASE_URL": "https://rnfcccnesxunjtpwahce.supabase.co",
"BARZOL_R2_PUBLIC_URL": "https://pub-12c5101b37f34f829bbea3f12287ee9e.r2.dev"
```

**Después:**

```jsonc
"BARZOL_SUPABASE_URL": "https://hlyhkoxnadkxbrjtzuzx.supabase.co",
"BARZOL_R2_PUBLIC_URL": "https://pub-196defbdd1404f548b687793c485d74d.r2.dev"
```

**Sin `/rest/v1/`.** El valor que llegó en el traspaso lo traía. `createClient`
concatena `/rest/v1/` por su cuenta, así que una URL base que ya lo lleve produce
`…/rest/v1/rest/v1/product` y un 404 en cada consulta. Comprobado: esa forma
también devuelve 404.

**Aplicado el 2026-08-31**, con `SPEC-908` REQ-1001 aprobada. Verificado que el
bundle construido no contiene ninguna referencia al proyecto anterior.

> **Sobre el orden con `BZ-87`, que este tablero tenía mal.** Decía que aplicar
> esto antes del SQL dejaría al sitio sirviendo un catálogo vacío sin error.
> Comprobado contra el código: **no pasa.**
> `src/shared/lib/home/homeService.ts:15,24,50` hace `if (error) throw error`, o
> sea que un `PGRST205` se propaga y sale un 500. El síntoma que engaña es el del
> runbook de `BZ-85` —tablas que existen sin `GRANT`— y no el de una base sin
> esquema.
>
> Así que aplicarlo primero es seguro, y encima informativo: el error de
> producción pasa de `Invalid API key` a `PGRST205`, que **es la prueba de que el
> worker ya habla con el proyecto correcto**. Al cargar el SQL el sitio se
> recupera sin necesidad de otro despliegue.

---

## 🔴 BZ-87 · El Supabase nuevo no tiene esquema ni GRANT ✅

**Humano, en el SQL Editor.** Constitución 8.5: ningún agente carga SQL en
producción.

Proyecto `hlyhkoxnadkxbrjtzuzx`. Cinco archivos, **en este orden**, esperando el
`Success` de cada uno:

| # | Archivo | Sin él |
| :--- | :--- | :--- |
| 1 | `supabase/schema.sql` | no hay tablas |
| 2 | `supabase/delta_crud.sql` | no hay secuencias de `code` ni policies de escritura |
| 3 | `supabase/grants-data-api.sql` | las tablas existen y PostgREST no las ve |
| 4 | `supabase/fix-rls-admin-profile.sql` | las policies del paso 5 no evalúan |
| 5 | `supabase/pendiente-policies-home.sql` | el inicio dice guardar y no guarda |

`delta_crud.sql` se ejecuta **bloque a bloque**: pegado entero, un solo
`already exists` revierte el script completo.

El orden 4→5 **no es intercambiable**. Las policies del inicio consultan
`admin_profile` dentro de un `exists`, y esa subconsulta se evalúa con RLS
aplicado: si `admin_profile` tiene RLS sin su policy `"self read"`, las tres del
inicio fallan con el mismo síntoma que vienen a arreglar.

**`pendiente-fix-rls-borradores.sql` NO se aplica.** Termina en `rollback;` a
propósito. Es `BZ-80` y necesita cambiar código antes.

**Verificación, antes de seguir:**

```sql
begin;
  set local role anon;
  select count(*) from product;   -- un número, no un error
rollback;
```

Y después el administrador, que son **dos** pasos (runbook 3.5): el usuario en
Auth con *Auto Confirm* activado, y su fila en `admin_profile` con el **mismo
`id`**. Con uno solo, el login entra y ninguna escritura pasa el RLS.

### Cerrada el 2026-09-01 ✅

Cargado por el responsable. Verificado desde fuera, tabla por tabla:

```
product 200 · category 200 · vendor 200 · product_photo 200
product_feature 200 · gallery_item 200 · home_hero_image 200 · admin_profile 200
```

Las 8 responden, así que **el esquema está cargado y los GRANT aplicados** — sin
los GRANT, PostgREST no las vería y devolvería `PGRST205` como el 31 de agosto.

Y la escritura anónima está cerrada, que es la otra mitad:

```
POST /rest/v1/vendor  (rol anon)
→ {"code":"42501","message":"new row violates row-level security policy for table \"vendor\""}
```

Es la respuesta correcta. La sonda no dejó ninguna fila detrás.

**Sin verificar todavía:** la fila de `admin_profile` (runbook 3.5b). Requiere
entrar al panel; está en el [checklist manual](../../tests/manual/SPEC-908-verificacion-humana.md),
punto 3.

---

## 🔴 BZ-88 · El humo sondea el despliegue viejo ✅

`scripts/smoke.mjs:23`:

```js
const URL_POR_DEFECTO = 'https://barzol-web.willymichael-cardenas.workers.dev';
```

`npm run smoke` a secas interroga el sitio **anterior**, que sigue en pie y sano,
y **sale en verde sin haber mirado el despliegue que se acaba de publicar**.

Es el peor modo de fallo que puede tener un gate: no avisa de que no comprobó
nada, afirma que todo está bien. Y es P0 precisamente ahora, cuando el sitio
nuevo devuelve 500 y el gate diría que no.

**Aplicado.** `URL_POR_DEFECTO` apunta al despliegue nuevo y el porqué queda
escrito en el archivo, que es donde lo va a leer quien mude la cuenta la próxima
vez. Ejecutarlo con `--url` explícito sigue siendo lo correcto en CI:

```bash
node scripts/smoke.mjs --url https://barzol-web.barzolweb3d.workers.dev \
                       --commit $(git rev-parse HEAD)
```

---

## 🟠 BZ-89 · `/api/salud` informa `commit: "main"` ✅

```json
{ "ok": false, "commit": "main", "momento": "2026-08-31T11:21:31.066Z" }
```

`astro.config.mjs:23-26` resuelve el commit en build time desde
`WORKERS_CI_COMMIT_SHA`, `CF_PAGES_COMMIT_SHA` o `GITHUB_SHA`, y recorta a 7
caracteres; si no hay ninguna, escribe `desconocido`.

`"main"` **no es ninguno de los dos casos**. Son 4 caracteres y es un nombre de
rama, así que algo le está entregando la rama donde debería ir el SHA. La causa
**no está verificada**: hace falta ver la configuración de Workers Builds.

**Lo que rompe:** `TEST-S06` compara el commit desplegado con el que se acaba de
publicar. Con un valor constante nunca puede coincidir — y esa sonda existe
porque en el proyecto viejo dos commits tardaron **un día** en publicarse sin que
nadie lo notara (`BZ-52`).

### Resuelto — y el despliegue contestó la pregunta ✅

`astro.config.mjs` ahora **valida la forma** antes de usar el valor: si no cumple
`/^[0-9a-f]{7,40}$/i`, escribe `desconocido`. Eso cumple REQ-1009 e INV-4 y evita
lo peor —una sonda que falla siempre acaba ignorándose, y era la única que detecta
un bundle obsoleto—, pero **no explica de dónde sale `"main"`**.

El despliegue de `dee3555` respondió, y con eso se cierra:

```json
{ "ok": true, "commit": "dee3555", "momento": "2026-08-31T12:31:55.433Z" }
```

Es el SHA real del commit, no `desconocido`. O sea que **Workers Builds sí inyecta
`WORKERS_CI_COMMIT_SHA` correctamente**: el `"main"` anterior no venía de la build
del repo, sino de un despliegue hecho por otra vía. La validación de forma no hizo
falta para arreglarlo, pero es la que garantiza que un valor así no vuelva a pasar
por SHA — y `TEST-S06` ya **pasa**.

---

## 🟠 BZ-90 · Una clave publishable versionada en el repo ✅

`.env.example:34-35` trae la URL **y la clave publishable** del proyecto viejo,
con valor real:

```
BARZOL_SUPABASE_URL=https://rnfcccnesxunjtpwahce.supabase.co
BARZOL_SUPABASE_ANON_KEY=sb_publishable_3xL_oYW6Of6STNJFbqA1qA_w9EVihYQ
```

Una clave publishable **no es un secreto** —viaja al navegador en cada visita, y
RLS es lo que protege los datos— así que esto no es una filtración. Es otra cosa:
ata el repositorio a un proyecto concreto y convierte cada clon en una copia
desactualizada de la configuración de otra cuenta. Que es exactamente el enredo
del que trata este tablero.

Van marcadores, no valores. `SPEC-908` REQ-1010.

> Conviene decidirlo junto a `BZ-71` (secretos de CI), que toca los mismos
> nombres desde el otro lado.

---

## 🟡 BZ-91 · La documentación apunta al despliegue muerto ✅

`grep` sobre lo vigente — se excluyen `docs/1_inbox/**` y los kanban anteriores,
que son registro histórico y reescribirlos sería falsificarlo:

| Archivo | Qué dice |
| :--- | :--- |
| `CLAUDE.md:13` | producción = `willymichael-cardenas.workers.dev` |
| `README.md:72` | `curl` de diagnóstico al host viejo |
| `docs/3_recursos/20260813-1730-runbook-diagnostico-produccion.md` | 4 apariciones |
| `docs/3_recursos/20260824-1200-runbook-aplicar-rls-admin-profile.md:5,53` | proyecto `rnfcccnesxunjtpwahce` |

El runbook de diagnóstico es el que se abre **cuando producción ya está rota**.
Que mande a mirar el sitio equivocado justo entonces es la peor hora posible para
descubrirlo.

### `.env` local — ya corregido 🔶

Traía dos errores en la misma línea:

```
antes:   BARZOL_SUPABASE_URL=hhttps://hlyhkoxnadkxbrjtzuzx.supabase.co/rest/v1/
después: BARZOL_SUPABASE_URL=https://hlyhkoxnadkxbrjtzuzx.supabase.co
```

`hhttps://` con dos haches —`InvalidEnvError` en el primer arranque— y el sufijo
`/rest/v1/`, que `createClient` duplica. Corregido en local: el archivo está en
`.gitignore` y no viaja a ningún despliegue.

---

---

## 🟡 BZ-92 · Build y CI corren versiones distintas de Node

Runbook 6.4, y **deliberadamente no hecho en este push**.

| Dónde | Versión |
| :--- | :--- |
| local (Kali) | 24.20.0 |
| Workers Builds | 24 por defecto |
| `.github/workflows/sdd-gate.yml` | 22.12.0 |
| `package.json` → `engines` | `>=22.12.0` |

El runbook propone un `.nvmrc` con `22.12.0` para alinear la build con el CI. **No
lo añadí**, por dos razones:

1. Meter un cambio de versión de Node en el mismo push que arregla el despliegue
   mezcla dos variables. Si el build falla, no se sabría cuál de las dos fue.
2. **No hay evidencia de que el build compile en 22.12.0.** El workflow corre
   `typecheck`, `test:cov` y `sdd:trace`; `npm run build` no está en ningún job.
   La única versión con la que consta que este proyecto compila es la 24 — hoy,
   en esta máquina y en Workers Builds.

Lo que hace falta decidir es lo contrario de lo que dice el runbook: o el CI sube
a 24, o alguien comprueba primero que el build pasa en 22.12.

---

## 🔴 BZ-95 · La base no tiene datos

Esquema correcto, policies correctas, **cero filas**. Es lo único que separa al
sitio de estar terminado.

Lo que falla por esto, y solo por esto:

| Sonda | Por qué falla |
| :--- | :--- |
| `TEST-S02` | la portada no enlaza ninguna ruta `/catalogo/` porque no hay productos |
| `TEST-S07` | no hay ninguna imagen de R2 que referenciar |
| `TEST-P01` | ya no falla: desde la Enmienda 1 avisa en vez de acusar a RLS |

**Camino elegido: el panel de admin** (runbook 7a). Entrar a `/admin/login` y
cargar a mano. Las fotos suben bien a R2 porque pasan por `POST /api/media`, que
es lo que valida las URL absolutas y evita el bug de `BZ-82` — seis filas de
producción acabaron guardando `firefox_ix0xISR5X0.png` en lugar de una URL.

> **Por qué no un script de seed.** `supabase/seed-data/` tiene los nueve JSON del
> catálogo real, pero tres traen `REEMPLAZAR_URL_IMAGEN` y `gallery_item.image_url`
> y `home_hero_image.image_url` son **NOT NULL**: hay que subir las fotos a R2
> *antes* de insertar. Un script tendría que resolver ese huevo-y-gallina y
> escribir en producción. El panel ya hace las dos cosas en el orden correcto.

Al cargar el primer producto publicado, `TEST-S02` y `TEST-P01` pasan solos.

---

## 🔴 BZ-96 · El admin no puede entrar 🔶

**Contrato:** [SPEC-909](../../.sdd/specs/SPEC-909-identidad-administrador.md)

El log de producción:

```
[login] Supabase error: Invalid login credentials 400
```

Y el panel: *"Usuario o contraseña incorrectos."* Las dos cosas apuntan a la
contraseña. **La contraseña está bien.**

### La causa, reproducida fuera del worker

```
POST /auth/v1/token?grant_type=password     (misma contraseña en ambos)
  admin@barzol.internal        → Invalid login credentials
  <correo personal del dueño>  → OK, uid <uid del usuario>
```

El panel pide **usuario**, no email. Supabase Auth exige un email. El puente es
`usernameToSyntheticEmail()` (`authClient.ts:12`), que arma
`${username}@barzol.internal` de forma determinista **y no consulta nada** — por
eso no hace falta guardar ese email en ningún sitio.

Ese diseño funciona sólo si el usuario de Auth se creó con exactamente ese email.
Se creó con el correo personal de quien montó la cuenta, así que el login busca
`admin@barzol.internal`, que no existe.

### Por qué costó tanto verlo

Supabase devuelve **el mismo error** para "el usuario no existe" y para "la
contraseña es incorrecta". Es deliberado: distinguirlos permitiría enumerar
usuarios. Así que el síntoma manda a probar la contraseña, y la contraseña nunca
fue el problema.

Y el resto del alta es correcto, lo que refuerza la pista falsa:

| Pieza | Estado |
| :--- | :--- |
| fila en `admin_profile` | ✅ `username='admin'`, `name='Administrador'`, `role='admin'` |
| `id` de `admin_profile` = `id` de `auth.users` | ✅ — la FK y `auth.uid()` están bien |
| policy `"self read"` | ✅ el usuario autenticado lee su propia fila |
| email confirmado | ✅ |

Cada pieza válida por separado, el conjunto inservible.

### El arreglo — un paso, sin desplegar nada

**Supabase → Authentication → Users → el usuario → cambiar el email a
`admin@barzol.internal`.**

Cambiar el email **conserva el `id`**, así que `admin_profile`, la FK y todas las
policies de escritura siguen siendo válidas. No hay que recrear nada ni tocar
código, y no hace falta un despliegue: el worker deriva el email en cada intento.

> **La alternativa que NO se toma:** cambiar `ADMIN_EMAIL_DOMAIN` en el código.
> No serviría —el email no es `admin@<algo>`, es un correo personal— y además esa
> constante es parte de la identidad de cada usuario ya dado de alta: cambiarla
> deja fuera a todos a la vez, sin error de compilación. Está fijada con un test
> (`TEST-909-04`) precisamente para que nadie lo intente por atajo.

### Lo que sí se corrigió aquí

**El checklist manual tenía el hueco que dejó pasar esto.** Decía "usuario creado
en Authentication → Users" sin decir **con qué email**. Ahora lo dice, con el
síntoma de cada uno de los dos fallos posibles:

```
id mal     → entra y no guarda   (choca contra RLS)
email mal  → no entra en absoluto
```

**Y `usernameToSyntheticEmail()` tiene tests por primera vez.** Es la función que
decide quién entra al panel y no tenía ninguno — porque vive en un módulo que
importa `cloudflare:workers` y en Node ni se carga. Corren en la suite de workerd
(`tests/workers/identidad-admin.test.ts`, 6 tests).

### Propuesto en SPEC-909, sin aplicar

Dos cosas que tocan `src/` y esperan aprobación:

1. **`REQ-1024` — que el log diga con qué email preguntó.** Hoy registra
   `Invalid login credentials 400` y nada más. Con el email sintético en el log
   del servidor, esto se diagnostica de un vistazo. **Nunca en la respuesta
   HTTP**: ahí sí permitiría enumerar usuarios.
2. **Separar `usernameToSyntheticEmail()` a su propio archivo**, para que la
   lógica pura no dependa del runtime de workerd. Es la razón real de que llevara
   sin tests desde que existe.

---

## 🟠 BZ-93 · Los gates confunden «base vacía» con «RLS roto» ✅

`TEST-P01` daba **FALLA** con el detalle *"no devolvió ningún producto publicado —
¿RLS demasiado estricto?"* sobre una base perfectamente sana pero vacía.

Dos problemas, no uno:

1. **Rojo donde no hay nada roto.** Un gate que da rojo en todos los despliegues
   nuevos se termina ignorando, y con él se ignora el rojo que sí importaba.
2. **La causa equivocada, en la dirección peligrosa.** El mensaje empuja a aflojar
   las policies. `BZ-80` dice que la lectura de `product` está *demasiado abierta*.

**Antes → después:**

```
[FALLA] TEST-P01 · no devolvió ningún producto publicado — ¿RLS demasiado estricto?
[AVISO] TEST-P01 · la tabla product está vacía para anon: sin datos que leer,
                   no se puede concluir nada sobre las policies (¿falta el seed?)
```

Desde fuera, con la clave anónima, «cero publicados» **nunca** se puede atribuir a
las policies: es indistinguible de una tabla sin filas y de un catálogo entero en
borrador. Lo único que sí es un fallo es no poder preguntar — error de red o
estado HTTP distinto de 200, y eso sigue en rojo (`TEST-908-11`, `-12`).

**Y una premisa que estaba en un comentario y no en la salida.** `sondas.mjs`
documenta que una tabla «protegida» se reconoce por responder 200 con lista vacía,
y que ese criterio solo vale **si la lectura pública ve filas**. Con la base vacía
la auditoría imprimía once AVISO de protección que no sostenían nada, sin decirlo.
Ahora lo dice (`REQ-1017`):

```
⚠ Las sondas de protección NO son concluyentes en esta ejecución: sin ninguna
  fila visible para anon, "200 con lista vacía" es indistinguible de una tabla
  sin filas. Cargá datos y volvé a auditar.
```

La decisión vive en `scripts/rls/veredictos.mjs` —lógica pura, 93 líneas, sin
red— para poder probarla sin un Supabase delante. 10 tests.

---

## 🟠 BZ-94 · El Gate 4 truncaba los REQ e inventaba requisitos ✅

Destapado al aprobar SPEC-908: `scripts/sdd/lectura.mjs` extraía los requisitos
con `/REQ-\d{3}/` — **exactamente** tres dígitos. Con SPEC-908 el proyecto pasó de
los 999 requisitos y empezó a numerar en el rango 1000:

```
REQ-1001  →  el gate leía  REQ-100
REQ-1016  →  el gate leía  REQ-101
```

Y entonces reclamaba tests para `REQ-100`, **que no existe en ninguna spec**.

Es peor que un hueco no detectado. Un hueco falso con un ID inventado **no se
puede cerrar**: no hay nada que citar en un test, así que el gate queda en rojo
permanente — y un gate que no se puede poner en verde se acaba desactivando.

Arreglado a `/REQ-\d{3,4}/`. El límite superior es deliberado: con `\d+`, un
`REQ-` pegado a una fecha o a un número de línea se tragaría el número entero.

### El segundo hallazgo, sin arreglar

El extractor **no distingue un requisito declarado de uno citado**. Cualquier
`REQ-NNN` de otra spec que aparezca en el texto se cuenta como requisito propio y
reclama un test que no le corresponde. Se ve en SPEC-901, que cita `REQ-905` y
`REQ-933` de otras specs y arrastra dos huecos falsos.

Se esquivó citando `SPEC-901` sin el número. **Es un parche, no un arreglo**:
arreglarlo de verdad es leer solo los `### [REQ-NNNN]` declarados como encabezado,
y eso cambia la semántica del gate para todas las specs a la vez. Merece su propia
SPEC y no entra de rebote en esta.

---

## Resuelto por el despliegue de `dee3555`

Dos de las tres incógnitas del apartado anterior las contestó el propio push:

1. **Workers Builds está conectado a este repositorio.** Desplegó `dee3555`
   ~40 s después del push a `git@github.com:Core-Tech-Group/barzol-web.git` y
   `/api/salud` lo informa. La duda de si publicar desde esta máquina llegaba al
   worker queda cerrada.
2. **`WORKERS_CI_COMMIT_SHA` se inyecta bien** (`BZ-89`).

## No verificado

1. **`npx wrangler secret list`** — REQ-1007. No se puede ejecutar desde esta
   sesión: wrangler exige `CLOUDFLARE_API_TOKEN` en un entorno no interactivo y
   **no se le piden credenciales a un agente**. Queda como paso humano.
   Indirectamente hay evidencia de que el secreto sigue cargado: si faltara, el
   error sería `MissingEnvError` como a las 22:43, y no lo es.
2. ~~**Si `admin_profile` tiene su fila**~~ — **resuelto el 2026-09-01** (`BZ-96`).
   Tiene su fila y es correcta. Se pudo comprobar autenticándose, que es lo que la
   clave anónima no permitía.
3. **El seed** (`BZ-95`): sin datos, `TEST-S02`, `TEST-S07` y `TEST-P01` no pueden
   concluir nada.

Los tres son puntos del
[checklist de verificación humana](../../tests/manual/SPEC-908-verificacion-humana.md),
que es donde SPEC-908 registra lo que ninguna sonda puede cubrir.

## Decisiones pendientes

- **Dominio propio para R2.** `r2.dev` está limitado por tasa y Cloudflare
  desaconseja usarlo en producción. Hoy se acepta a sabiendas. El cambio conviene
  **antes** de subir imágenes: las URLs ya guardadas en la base seguirían
  apuntando a `r2.dev`. Runbook 5.4.
- **Qué se hace con el despliegue viejo.** Sigue en pie, sano y con datos. Nadie
  ha decidido si se apaga, y mientras siga vivo es lo que `BZ-88` sondea por error.
- **`BARZOL_DIAGNOSTICO_TOKEN`.** No está cargado en el worker nuevo: verificado,
  `/api/diagnostico` responde en modo reducido. Sin él, `TEST-S05` queda en AVISO
  —aceptable— pero el endpoint sigue público, que es `BZ-37`.

## Lo que nunca se ejecuta desde un agente

`wrangler deploy` · `wrangler secret put` · cargar SQL en el panel de Supabase ·
`supabase db push` · `git push --force` · aplicar
`pendiente-fix-rls-borradores.sql`. Constitución 8.5.
