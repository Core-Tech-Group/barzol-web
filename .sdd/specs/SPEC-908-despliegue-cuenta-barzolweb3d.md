# SPEC-908 — Repunte del despliegue a la cuenta `barzolweb3d`

**Estado:** APROBADA — 2026-08-31, aprobación humana explícita
**Capa:** Plataforma · **Fecha:** 2026-08-31
**Unidad destino:** `wrangler.jsonc`, `scripts/smoke.mjs`, `.env.example` · *(configuración, no `src/`)*
**Objetivo:** `https://barzol-web.barzolweb3d.workers.dev/`
**Origen:** [runbook de despliegue en cuentas nuevas](../../docs/1_inbox/20260830-0900-despliegue-cloudflare.md)
**Abre:** `BZ-86` … `BZ-91`

---

## Contexto

El sistema se mudó a cuentas nuevas de GitHub, Supabase y Cloudflare. El worker
`barzol-web` ya existe en la cuenta `dca3d80d6a3bd638af80361491d887a1` y responde,
pero **devuelve 500 en toda la web**.

El runbook de `BZ-85` describe cómo montar un despliegue nuevo. Esta SPEC es lo
otro: el contrato de qué tiene que ser cierto para que **este** despliegue,
ya a medio montar, quede sano — y qué se verifica para afirmarlo.

### La causa raíz, reproducida

`wrangler.jsonc:25-26` sigue declarando el proyecto de Supabase **viejo**:

```jsonc
"BARZOL_SUPABASE_URL": "https://rnfcccnesxunjtpwahce.supabase.co",
"BARZOL_R2_PUBLIC_URL": "https://pub-12c5101b37f34f829bbea3f12287ee9e.r2.dev"
```

El secreto cargado en el worker, en cambio, es la clave del proyecto **nuevo**.
El worker termina hablándole al proyecto viejo con una credencial que no le
pertenece. Comprobado desde fuera el 2026-08-31:

```
GET https://rnfcccnesxunjtpwahce.supabase.co/rest/v1/product
    apikey: sb_publishable_nRq-…
→ {"message":"Invalid API key",
   "hint":"… This API key might also be owned by another Supabase project."}
```

Que es, palabra por palabra, el error del log de producción de las 22:48:45.

**Editar el panel de Cloudflare no lo arregla.** Es exactamente el accidente que
la Regla 8.2 describe: `vars` en `wrangler.jsonc` es la única fuente de verdad y
el siguiente `wrangler deploy` reescribe encima de lo que se haya puesto a mano.
La captura del panel con las variables corregidas y el `wrangler.jsonc` sin
corregir son el mismo bug de `BZ-34` y `BZ-46` por tercera vez.

### El segundo bloqueo, detrás del primero

Arreglar `wrangler.jsonc` **no basta**. El proyecto nuevo está vivo pero vacío:

```
GET https://hlyhkoxnadkxbrjtzuzx.supabase.co/auth/v1/settings   → 200
GET https://hlyhkoxnadkxbrjtzuzx.supabase.co/rest/v1/product    → 404
    {"code":"PGRST205",
     "message":"Could not find the table 'public.product' in the schema cache"}
```

`PGRST205` **no distingue** entre "la tabla no existe" y "la tabla existe sin
`GRANT`": desde fuera, con una clave publishable, los pasos 3.2 y 3.3 del runbook
fallan idénticos. Por eso REQ-1003 los exige a los dos y REQ-1004 los verifica
desde dentro, con `set local role anon`.

## Fuera de alcance

- Reescribir el runbook de `BZ-85`. Esta SPEC lo **ejecuta** y verifica; no lo sustituye.
- Migrar datos del proyecto viejo al nuevo. El catálogo se recarga (paso 7 del runbook).
- Dominio propio para R2 (paso 5.4). `r2.dev` se acepta a sabiendas; queda en `BZ-91`.
- Apagar o borrar el despliegue viejo. Es una decisión con datos vivos detrás.
- Cualquier cambio en `src/`. Nada de lo que aquí falla es un defecto de código.

## Vocabulario

| Término | Significa |
| :--- | :--- |
| **despliegue viejo** | worker `barzol-web` en `willymichael-cardenas.workers.dev`, Supabase `rnfcccnesxunjtpwahce` |
| **despliegue nuevo** | worker `barzol-web` en `barzolweb3d.workers.dev`, Supabase `hlyhkoxnadkxbrjtzuzx` |
| **sano** | las siete sondas de `SPEC-901` en verde contra el despliegue nuevo |

---

## Requisitos (EARS)

### [REQ-1001] — Ubicuo · una sola fuente de verdad
`wrangler.jsonc` DEBE declarar en `vars` la URL del proyecto de Supabase nuevo y
la URL pública del bucket R2 nuevo, en crudo: sin comillas sobrantes, sin barra
final, sin corchetes de markdown y **sin ruta** — ni `/rest/v1/` ni ninguna otra.

> `createClient` concatena `/rest/v1/` por su cuenta. Una URL base que ya lo
> lleve produce `…/rest/v1/rest/v1/product`. El valor que hoy está en el `.env`
> local lo lleva, y además tiene `hhttps://` con dos haches.

### [REQ-1002] — No deseado · el panel no decide
SI una variable de configuración se carga desde el panel de Cloudflare en lugar
de `wrangler.jsonc`, ENTONCES el despliegue DEBE tratarse como no reproducible y
la variable DEBE trasladarse a `wrangler.jsonc` antes de dar el despliegue por
válido.

### [REQ-1003] — Dirigido por evento · el orden del SQL
CUANDO se prepare el proyecto de Supabase nuevo, el sistema DEBE ejecutar, **en
este orden y verificando cada uno antes del siguiente**:

| # | Archivo | Sin él |
| :--- | :--- | :--- |
| 1 | `supabase/schema.sql` | no hay tablas |
| 2 | `supabase/delta_crud.sql` | no hay secuencias de `code` ni policies de escritura |
| 3 | `supabase/grants-data-api.sql` | las tablas existen y PostgREST no las ve |
| 4 | `supabase/fix-rls-admin-profile.sql` | las policies del paso 5 no evalúan |
| 5 | `supabase/pendiente-policies-home.sql` | el inicio dice guardar y no guarda |

El orden 4→5 **no es intercambiable**: las policies del inicio consultan
`admin_profile` dentro de un `exists`, y esa subconsulta se evalúa con RLS
aplicado.

### [REQ-1004] — Dirigido por evento · verificación desde dentro
CUANDO termine REQ-1003, el sistema DEBE comprobar la lectura anónima **con el
rol real**, no con la clave:

```sql
begin;
  set local role anon;
  select count(*) from product;   -- un número, no un error
rollback;
```

> Desde fuera, `PGRST205` es ambiguo. Esta consulta no lo es.

### [REQ-1005] — No deseado · `pendiente-fix-rls-borradores.sql`
SI alguien propone aplicar `supabase/pendiente-fix-rls-borradores.sql`, ENTONCES
el sistema DEBE rechazarlo. Termina en `rollback;` a propósito: endurece la
lectura de `product` y hoy rompe el panel, porque `productoService` lee con el
cliente anónimo. Es `BZ-80` y necesita un cambio de código antes.

### [REQ-1006] — Ubicuo · el administrador son dos filas
El despliegue nuevo DEBE tener el usuario en `auth.users` **auto-confirmado** y su
fila correspondiente en `admin_profile` con el **mismo `id`**. Con uno solo de los
dos, el login entra y ninguna escritura pasa el RLS.

### [REQ-1007] — Ubicuo · el secreto se verifica por API
`BARZOL_SUPABASE_ANON_KEY` DEBE existir como **secreto** del worker `barzol-web`
de la cuenta nueva, y la verificación DEBE ser `npx wrangler secret list`.

> El panel muestra "Value encrypted" y no dice contra qué recurso. En la captura
> del 2026-08-31 el nombre aparece recortado como `BARZOL_SUPABASE_ANON_KE`, que
> es indistinguible de un nombre guardado a medias. Ocho revisiones del kanban
> viejo persiguieron un secreto que, según la API, nunca existió.

### [REQ-1008] — No deseado · la sonda apunta al sitio equivocado
SI `scripts/smoke.mjs` se ejecuta sin `--url`, ENTONCES DEBE sondear el
despliegue nuevo. Hoy `scripts/smoke.mjs:23` tiene el **viejo** como valor por
defecto, así que `npm run smoke` a secas sale en **verde sin haber mirado el
despliegue que se acaba de publicar**: el peor modo de fallo posible en un gate.

### [REQ-1009] — Ubicuo · el commit desplegado es un SHA
`GET /api/salud` DEBE informar el SHA corto de 7 caracteres del commit que generó
el bundle, o el literal `desconocido`.

> Hoy informa `"main"`. No es ninguno de los dos: `astro.config.mjs:23-26` lee
> `WORKERS_CI_COMMIT_SHA`, `CF_PAGES_COMMIT_SHA` y `GITHUB_SHA`, y algo le está
> entregando el nombre de la rama. Mientras siga así, `TEST-S06` **no puede
> pasar** y el proyecto pierde la única señal que detecta un bundle obsoleto
> (`BZ-52`).

### [REQ-1010] — Ubicuo · ninguna credencial versionada
El repositorio NO DEBE contener claves de API de ningún proyecto vivo, ni siquiera
publishable. `.env.example:34-35` trae hoy la URL y la clave publishable del
proyecto viejo; DEBEN sustituirse por marcadores.

> Una clave publishable no es un secreto —viaja al navegador— pero versionarla
> ata el repo a un proyecto concreto y convierte cada clon en una copia
> desactualizada de la configuración de otro.

### [REQ-1011] — Dirigido por estado · la documentación apunta a un sitio muerto
MIENTRAS el despliegue nuevo sea el de producción, `CLAUDE.md`, `README.md` y el
runbook de diagnóstico DEBEN nombrar su URL y no la de
`willymichael-cardenas.workers.dev`.

### [REQ-1012] — Dirigido por evento · el humo cierra el despliegue
CUANDO se publique un despliegue, el sistema DEBE ejecutar
`node scripts/smoke.mjs --url <nueva> --commit $(git rev-parse HEAD)` y DEBE
tratar el despliegue como no válido si `TEST-S02` falla.

> `TEST-S02` es la que separa "el worker responde" de "el worker lee la base".
> Si falla mientras `TEST-S01` pasa, el problema está en REQ-1003, no en el worker.

### [REQ-1013] — Dirigido por evento · lo que ninguna sonda cubre
CUANDO el humo pase, el sistema DEBE verificar a mano, en este orden: entrar a
`/admin/login`, **editar y guardar un producto**, **subir una foto** y verla en la
portada. Los tres ejercitan, respectivamente, las policies `"admin write"`, el
binding `MEDIA` y `BARZOL_R2_PUBLIC_URL`. Ninguna sonda de solo lectura puede.

### [REQ-1014] — Opcional · proteger el diagnóstico
DONDE se cargue `BARZOL_DIAGNOSTICO_TOKEN` como secreto del worker nuevo,
`/api/diagnostico` DEBE exigir la cabecera `x-diagnostico-token` y responder 404
sin ella, según `SPEC-903`.

> Hoy responde en modo reducido: el secreto no está cargado en el worker nuevo.
> Verificado el 2026-08-31. Mientras siga así, `TEST-S05` queda en AVISO.

### [REQ-1015] — No deseado · publicar sigue siendo humano
SI un agente puede resolver un requisito de esta SPEC ejecutando
`wrangler deploy`, `wrangler secret put`, `supabase db push` o cargando SQL en el
panel de Supabase, ENTONCES DEBE detenerse y reportar el comando exacto en su
lugar. Constitución 8.5.

---

## Contrato

Esta SPEC no introduce tipos. Su contrato es el estado de la configuración:

```jsonc
// wrangler.jsonc — vars, tras REQ-1001
"vars": {
  "BARZOL_SUPABASE_URL": "https://hlyhkoxnadkxbrjtzuzx.supabase.co",
  "BARZOL_R2_PUBLIC_URL": "https://pub-196defbdd1404f548b687793c485d74d.r2.dev"
}
```

```
secretos del worker barzol-web (cuenta dca3d80d…)
  BARZOL_SUPABASE_ANON_KEY     obligatorio  (REQ-1007)
  BARZOL_DIAGNOSTICO_TOKEN     opcional     (REQ-1014)
```

## Invariantes verificables

- **INV-1:** el `BARZOL_SUPABASE_URL` de `wrangler.jsonc` y el proyecto dueño del
  secreto cargado son **el mismo proyecto**. Falsable en un comando:
  `curl -s "$URL/rest/v1/" -H "apikey: $KEY"` no devuelve `Invalid API key`.
- **INV-2:** ninguna `*_URL` del repositorio contiene ruta, barra final, comillas
  ni corchetes. Ya lo comprueba `inspeccionarVariable()` en
  `src/shared/lib/env/serverEnv.ts`.
- **INV-3:** `grep -rn "rnfcccnesxunjtpwahce\|pub-12c5101b\|willymichael-cardenas"`
  sobre `wrangler.jsonc`, `scripts/`, `README.md` y `CLAUDE.md` no devuelve nada.
  `docs/1_inbox/**` y los kanban antiguos quedan excluidos: son registro histórico
  y reescribirlos sería falsificarlo.
- **INV-4:** `/api/salud` devuelve `commit` que cumple `/^[0-9a-f]{7}$|^desconocido$/`.
- **INV-5:** el repositorio no contiene ninguna cadena `sb_publishable_` ni
  `sb_secret_` fuera de `.env` (ignorado por git).

## Riesgo de regresión

**Alto, y concentrado en un archivo.** `wrangler.jsonc` es el único punto donde un
error tumba el sitio entero y el build sigue saliendo verde — `BZ-04` es
precisamente eso. Los tres modos de fallo conocidos:

1. **URL con ruta o mal pegada.** `InvalidEnvError` con el nombre de la variable,
   o un 404 de PostgREST en cada consulta. El `.env` local ya está así.
2. **URL nueva con secreto viejo, o al revés.** `Invalid API key` y 500 en toda la
   web. Es el estado actual de producción.
3. **Corregir el panel y no el archivo.** Funciona hasta el siguiente
   `wrangler deploy`, que lo borra. El más caro: el sitio se cae *después*, sin
   ningún cambio aparente que lo explique.

El rollback de Cloudflare cubre el bundle, **no** cubre el SQL de REQ-1003 ni los
objetos de R2.

### Corrección del 2026-08-31 — el orden importa menos de lo que decía

Esta SPEC afirmaba que invertir REQ-1001 y REQ-1003 dejaría al sitio sirviendo
**un catálogo vacío al público sin dar error**. Comprobado contra el código:
**no ocurre.** `src/shared/lib/home/homeService.ts:15,24,50` hace
`if (error) throw error`, así que un `PGRST205` se propaga y el middleware
responde 500. El síntoma que engaña —listas vacías— es el del runbook de `BZ-85`,
que describe un despliegue *sin GRANT sobre tablas que existen*; no es el de una
base todavía sin esquema.

La consecuencia práctica invierte la recomendación: aplicar REQ-1001 **antes** del
SQL es seguro y además informativo. El error de producción pasa de
`Invalid API key` a `PGRST205`, que es la prueba de que el worker ya habla con el
proyecto correcto, y al cargar el SQL el sitio se recupera **sin otro despliegue**.

Lo que sigue siendo cierto es el orden *interno* de REQ-1003 (los cinco archivos,
y sobre todo 4→5) y que el rollback no deshace nada de eso.

---

## Estado de aplicación — 2026-08-31

| REQ | Estado |
| :--- | :--- |
| REQ-1001 · `wrangler.jsonc` al proyecto nuevo | ✅ aplicado |
| REQ-1002 · el panel no decide | ✅ vigente por construcción |
| REQ-1003 · los 5 SQL en orden | ⬜ **humano** — Constitución 8.5 |
| REQ-1004 · verificación con `set local role anon` | ⬜ depende de REQ-1003 |
| REQ-1005 · no aplicar `pendiente-fix-rls-borradores` | ✅ no aplicado |
| REQ-1006 · administrador en dos filas | ⬜ depende de REQ-1003 |
| REQ-1007 · secreto verificado por API | 🔶 cargado; falta `wrangler secret list` |
| REQ-1008 · el humo apunta al sitio nuevo | ✅ aplicado |
| REQ-1009 · el commit es un SHA o `desconocido` | ✅ validado en `astro.config.mjs` |
| REQ-1010 · ninguna credencial versionada | ✅ aplicado |
| REQ-1011 · documentación al día | ✅ aplicado |
| REQ-1012 · el humo cierra el despliegue | ⬜ depende de REQ-1003 |
| REQ-1013 · verificación manual | ⬜ depende de REQ-1003 |
| REQ-1014 · token de diagnóstico | ⬜ opcional, sin cargar |
| REQ-1015 · publicar es humano | ✅ respetado |

---

## Plan de pruebas

Las sondas ya existen: son las siete de `SPEC-901`, y esta SPEC no añade ninguna.
Lo que añade es **contra qué apuntan** y **qué se comprueba antes de ejecutarlas**.

| ID | Verifica | Cómo |
| :--- | :--- | :--- |
| `[TEST-908-01]` | REQ-1001, INV-2 | `wrangler.jsonc` no contiene ruta ni barra final en `vars` |
| `[TEST-908-02]` | INV-1 | `curl` al proyecto nuevo con la clave nueva no da `Invalid API key` |
| `[TEST-908-03]` | REQ-1004 | `set local role anon; select count(*) from product;` devuelve un número |
| `[TEST-908-04]` | REQ-1006 | `select id, username from admin_profile;` devuelve exactamente 1 fila |
| `[TEST-908-05]` | REQ-1007 | `npx wrangler secret list` lista `BARZOL_SUPABASE_ANON_KEY` completo |
| `[TEST-908-06]` | REQ-1008, REQ-1012 | `smoke.mjs` sin `--url` sondea el host nuevo; las 7 sondas en verde |
| `[TEST-908-07]` | REQ-1009, INV-4 | `/api/salud` → `commit` de 7 hex o `desconocido` |
| `[TEST-908-08]` | REQ-1010, INV-5 | `git grep -n "sb_publishable_\|sb_secret_"` no devuelve nada |
| `[TEST-908-09]` | REQ-1011, INV-3 | el `grep` de INV-3 no devuelve nada |
| `[TEST-908-10]` | REQ-1013 | manual: login → guardar producto → subir foto → verla |

`TEST-908-03`, `-04` y `-10` son manuales por construcción: exigen credenciales o
escritura en producción, y `SPEC-901` REQ-961 prohíbe que una sonda escriba.

---

## Estado verificado el 2026-08-31

Sondeado desde fuera, sin credenciales de administrador:

| Comprobación | Resultado |
| :--- | :--- |
| worker nuevo `GET /` | **500** |
| `GET /api/salud` | `{"ok": false, "commit": "main"}` |
| `GET /api/diagnostico` | modo reducido — sin `BARZOL_DIAGNOSTICO_TOKEN` |
| Supabase nuevo, `/auth/v1/settings` | **200** — el proyecto existe y responde |
| Supabase nuevo, `/rest/v1/product` | **404 PGRST205** — sin esquema o sin GRANT |
| Supabase viejo + clave nueva | `Invalid API key` — **reproduce el log de producción** |
| R2 nuevo `pub-196defbdd…` | 404 de Cloudflare igual que el bucket viejo → **URL pública habilitada** |
| `wrangler.jsonc` | apunta al **proyecto viejo** |

No verificado, y hace falta acceso al panel: a qué repositorio de GitHub está
conectado Workers Builds, qué inyecta `WORKERS_CI_COMMIT_SHA`, y si el
`admin_profile` del proyecto nuevo tiene su fila.
