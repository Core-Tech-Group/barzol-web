# Scrumban — despliegue en la cuenta `barzolweb3d`

> **Abierto:** 2026-08-31 · **Continúa** `BZ-85` del
> [kanban de SDD y DevOps](20260821-2218-kanban-sdd-integracion-pruebas-unitarias-devops.md)
> **Contrato:** [SPEC-908](../../.sdd/specs/SPEC-908-despliegue-cuenta-barzolweb3d.md) — **APROBADA** 2026-08-31
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
| BZ-87 | El Supabase nuevo no tiene esquema ni GRANT | ⬜ **Bloqueante — SQL, humano** | 🔴 |
| BZ-88 | `smoke.mjs` sondea por defecto el despliegue **viejo** | ✅ Aplicado | 🔴 |
| BZ-89 | `/api/salud` informa `commit: "main"` en vez de un SHA | 🔶 Contenido, causa sin confirmar | 🟠 |
| BZ-90 | Clave publishable del proyecto viejo versionada en `.env.example` | ✅ Aplicado | 🟠 |
| BZ-91 | Documentación y `.env` local apuntan al despliegue muerto | ✅ Aplicado | 🟡 |
| BZ-92 | Build y CI corren versiones distintas de Node | ⬜ Pendiente, deliberado | 🟡 |

**Progreso:** 4 de 7 cerradas. `BZ-87` es el único bloqueante que queda para que
el sitio sirva contenido, y **no lo puede cerrar un agente** (Constitución 8.5).

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

## 🔴 BZ-87 · El Supabase nuevo no tiene esquema ni GRANT

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

## 🟠 BZ-89 · `/api/salud` informa `commit: "main"` 🔶

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

### Contenido, no resuelto 🔶

`astro.config.mjs` ahora **valida la forma** antes de usar el valor: si no cumple
`/^[0-9a-f]{7,40}$/i`, escribe `desconocido`. Eso cumple REQ-1009 e INV-4 y evita
lo peor —una sonda que falla siempre acaba ignorándose, y era la única que detecta
un bundle obsoleto—, pero **no explica de dónde sale `"main"`**.

Sigue sin verificar. Se cierra mirando las variables de build del worker en el
panel; el despliegue de este push dirá cuál de las dos cosas pasa:

| Lo que informe `/api/salud` | Significa |
| :--- | :--- |
| el SHA de este commit | Workers Builds sí inyecta el SHA; `"main"` venía de un build manual |
| `desconocido` | alguna variable de build trae la rama, y hay que corregirla en el panel |

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

## No verificado

Requiere acceso al panel, y ninguna de las tres se puede afirmar desde fuera:

1. **A qué repositorio de GitHub está conectado Workers Builds.** El `origin`
   local es `git@github.com:Core-Tech-Group/barzol-web.git`. Si Workers Builds
   sigue apuntando al repo de la cuenta anterior, los commits que se empujen desde
   aquí **no se despliegan** y el sitio se queda en el bundle actual sin ninguna
   señal de error. Runbook 2.2 y 4.2.
2. **Qué inyecta `WORKERS_CI_COMMIT_SHA`** en la build (`BZ-89`).
3. **Si `admin_profile` del proyecto nuevo tiene su fila** (`BZ-87`, runbook 3.5b).

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
