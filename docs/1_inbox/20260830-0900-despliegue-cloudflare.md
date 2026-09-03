# Runbook — desplegar barzol-web desde cero en cuentas nuevas

> **Fecha:** 2026-08-30 · **Ámbito:** GitHub + Supabase + Cloudflare (Workers + R2), todo nuevo
> **Punto de partida:** el repositorio clonado y nada más
> **Duración realista:** 60–90 min la primera vez · **Coste:** 0 (los tres planes gratuitos bastan)
> **Verificado contra la documentación de los tres proveedores el 2026-08-30**

Este documento no describe cómo está montado el despliegue actual: describe
cómo **levantar uno nuevo**. Si buscás el estado de producción, mirá
[`ARCHITECTURE.md`](../../ARCHITECTURE.md); si algo ya desplegado está roto,
[el runbook de diagnóstico](../3_recursos/20260813-1730-runbook-diagnostico-produccion.md).

---

## Lo que hay que leer antes de empezar

**Tres cosas cambiaron en 2026 y las tres muerden a una cuenta nueva.** El
despliegue actual no las sufre porque es anterior.

### 1 · Supabase ya no concede permisos solos — y sin eso el sitio nace muerto

`supabase/schema.sql` **no contiene ni un `GRANT`**. Nunca hizo falta: hasta
2026 Supabase concedía privilegios automáticamente sobre cada tabla nueva de
`public` a `anon` y `authenticated`.

| Fecha | Qué pasa |
| :--- | :--- |
| 30-05-2026 | los proyectos **nuevos** dejan de conceder por defecto |
| 30-10-2026 | se aplica también a los existentes |

Por eso este runbook añade un paso que el despliegue original nunca tuvo:
[`supabase/grants-data-api.sql`](../../supabase/grants-data-api.sql).

> **El síntoma engaña.** Sin los GRANT, la landing no da error: los servicios
> devuelven listas vacías y el catálogo aparece sin productos, como si el seed
> no se hubiera cargado. Se pierden horas buscando el problema donde no está.

### 2 · Las claves de API de Supabase cambiaron de formato

Las nuevas son `sb_publishable_…` (pública, va al navegador) y `sb_secret_…`
(privada, se salta RLS). Las antiguas `anon` y `service_role` en formato JWT
**siguen funcionando pero quedan obsoletas a finales de 2026**. Un proyecto
nuevo usa las nuevas; el código de este repo ya las acepta sin cambios — el
nombre de la variable sigue siendo `BARZOL_SUPABASE_ANON_KEY` por compatibilidad.

### 3 · Workers Builds ya usa Node 24 por defecto

El proyecto declara `"node": ">=22.12.0"` y el workflow de CI fija `22.12.0`.
Node 24 es compatible, pero **build y CI corriendo en versiones distintas es una
diferencia que solo se nota cuando falla**. El paso 6.4 lo resuelve.

### 4 · `r2.dev` no es para producción

El dominio público de desarrollo de R2 **está limitado por tasa y Cloudflare
recomienda explícitamente no usarlo en producción**. El despliegue actual lo
usa. Para un sitio real, conectá un dominio propio (paso 5.4).

---

## Mapa de lo que se va a montar

```
GitHub (repo)  ──push──▶  Cloudflare Workers Builds  ──deploy──▶  barzol-web.workers.dev
                                      │
                                      ├── binding MEDIA ──▶ R2 (bucket barzol-web)
                                      └── vars + secret ──▶ Supabase (Postgres + Auth)
```

Piezas y dónde vive cada valor:

| Valor | Dónde se define | Por qué ahí |
| :--- | :--- | :--- |
| `BARZOL_SUPABASE_URL` | `wrangler.jsonc` → `vars` | pública; versionada |
| `BARZOL_R2_PUBLIC_URL` | `wrangler.jsonc` → `vars` | pública; versionada |
| `BARZOL_SUPABASE_ANON_KEY` | **Secret** de Cloudflare | es una clave |
| `BARZOL_DIAGNOSTICO_TOKEN` | **Secret** de Cloudflare | opcional, protege `/api/diagnostico` |
| Acceso de escritura a R2 | binding `MEDIA` | sin credenciales: lo concede la plataforma |

> **La razón de que las dos primeras estén versionadas y no en el panel:**
> wrangler trata `wrangler.jsonc` como única fuente de verdad al estilo
> terraform, así que **cada `wrangler deploy` borra las variables cargadas desde
> el panel**. Eso tumbó el sitio tres despliegues seguidos en el proyecto
> original. Los *secretos* no se ven afectados.

---

# Paso 1 · Requisitos locales

```bash
node --version    # >= 22.12.0
npm --version
git --version
```

Sin Node 22.12 o superior, `npm ci` instala y el build falla más tarde con un
error que no menciona la versión.

---

# Paso 2 · GitHub

**2.1** Creá el repositorio en la cuenta nueva — **privado** está bien, Workers
Builds funciona igual.

**2.2** Desde el clon actual, apuntá el remoto al repo nuevo:

```bash
git remote -v                                   # anotá el remoto viejo
git remote set-url origin https://github.com/<CUENTA>/<REPO>.git
git push -u origin main
```

> Si querés conservar el remoto anterior: `git remote add nuevo <url>` y
> `git push nuevo main`. El resto del runbook asume que `origin` es el nuevo.

**2.3** Comprobá que llegó el árbol completo, sobre todo lo que el despliegue
necesita:

```bash
git ls-files | grep -E "wrangler.jsonc|.env.example|supabase/schema.sql"
```

Los tres deben aparecer. `.env.example` figura en `.gitignore`, pero **está
versionado desde antes de esa regla**, así que sigue viajando — si en el repo
nuevo no aparece, algo se perdió en el push.

---

# Paso 3 · Supabase

## 3.1 · Crear el proyecto

<https://supabase.com/dashboard> → **New project**.

| Campo | Valor |
| :--- | :--- |
| Name | `barzol-web` |
| Database Password | generala y **guardala**: no se puede volver a ver |
| Region | la más cercana a Perú (`us-east-1` o `sa-east-1`) |
| Plan | Free |

> Si el formulario ofrece **"Automatically expose new tables and functions"**,
> dejalo como venga: el paso 3.3 concede los permisos explícitamente y funciona
> en los dos casos. **La casilla no se puede cambiar después de crear el
> proyecto**, así que no conviene depender de ella.

Esperá a que termine de aprovisionar (1–2 min).

## 3.2 · Cargar el esquema

**SQL Editor** → `https://supabase.com/dashboard/project/<REF>/sql/new`

Ejecutá **en este orden**, uno por uno, esperando el `Success` de cada uno:

| # | Archivo | Qué hace |
| :--- | :--- | :--- |
| 1 | `supabase/schema.sql` | 11 tablas, enums, triggers, RLS y policies de lectura |
| 2 | `supabase/delta_crud.sql` | secuencias de `code` + policies `"admin write"` |

> **`delta_crud.sql` se ejecuta bloque a bloque**, como avisa su encabezado: si
> se pega entero y una línea falla con "already exists", Supabase revierte todo
> el script como una sola transacción. En una base recién creada no debería
> fallar nada, pero el consejo no cuesta.

## 3.3 · Conceder los permisos de la Data API ← **el paso que no existía**

```
supabase/grants-data-api.sql
```

Pegalo entero y ejecutalo. Sin esto el sitio no lee ni escribe nada.

Incluye un detalle que solo aparece al intentar crear un producto: `delta_crud`
convierte `code` en `nextval(...)`, y **un INSERT necesita `USAGE` sobre esas dos
secuencias**. Sin ese grant, el panel falla con `permission denied for sequence
product_code_seq` aunque la tabla tenga todos sus permisos.

**Verificá antes de seguir:**

```sql
begin;
  set local role anon;
  select count(*) from product;   -- un número, no un error
rollback;
```

## 3.4 · Las policies que el esquema documenta como pendientes

`schema.sql:336` deja tres tablas sin policy de escritura. Aplicá los dos
archivos, **en este orden**:

| # | Archivo | Por qué |
| :--- | :--- | :--- |
| 1 | `supabase/fix-rls-admin-profile.sql` | RLS en `admin_profile` + policy `"self read"` |
| 2 | `supabase/pendiente-policies-home.sql` | `"admin write"` en las tres tablas del inicio |

**El orden importa y no es intercambiable.** Las policies del inicio consultan
`admin_profile` dentro de un `exists`, y esa subconsulta se evalúa **con RLS
aplicado**. Si `admin_profile` tiene RLS habilitado sin su policy `"self read"`,
las tres del inicio tampoco funcionarán, con un síntoma idéntico al bug que
vienen a arreglar.

El paso a paso, con ensayo en seco antes de confirmar, está en
[el runbook de RLS](../3_recursos/20260824-1200-runbook-aplicar-rls-admin-profile.md).

> **`pendiente-fix-rls-borradores.sql` NO se aplica.** Termina en `rollback;` a
> propósito. Endurece la lectura de `product` y hoy rompería el panel, porque
> `productoService` lee con el cliente anónimo. Es `BZ-80` y necesita un cambio
> de código antes.

## 3.5 · Crear el administrador

Son **dos pasos**: el usuario en Auth y su fila en `admin_profile`. Con uno solo,
el login entra pero ninguna escritura pasa el RLS.

**a) El usuario.** **Authentication** → **Users** → **Add user** → *Create new user*:

| Campo | Valor |
| :--- | :--- |
| Email | `admin@barzol.internal` |
| Password | una robusta, y guardala |
| Auto Confirm User | **sí** — sin esto la sesión no se abre |

> El dominio `barzol.internal` no es un capricho: el panel pide **usuario**, no
> email, y Supabase Auth exige un email. `authClient.ts` construye
> `${username}@barzol.internal` de forma determinista al crear y al entrar, así
> que nunca hay que guardarlo ni consultarlo. Si cambiás el dominio, cambialo en
> `ADMIN_EMAIL_DOMAIN`. Es interno: no recibe correo.

**b) El perfil.** SQL Editor:

```sql
insert into admin_profile (id, username, name, role)
select id, 'admin', 'Administrador', 'admin'
from auth.users
where email = 'admin@barzol.internal';

-- Verificación: debe devolver exactamente 1 fila
select id, username, name from admin_profile;
```

El `id` **tiene que ser el mismo** que el de `auth.users`: es una FK, y es lo que
`auth.uid()` compara en cada policy de escritura.

## 3.6 · Anotar URL y clave

**Settings → API Keys** → `https://supabase.com/dashboard/project/<REF>/settings/api-keys`

| Dato | Dónde | Uso |
| :--- | :--- | :--- |
| Project URL | Settings → API | `BARZOL_SUPABASE_URL` |
| **Publishable key** (`sb_publishable_…`) | pestaña *API Keys* | `BARZOL_SUPABASE_ANON_KEY` |

La *secret key* no hace falta: **ningún código de este repo la usa**.

---

# Paso 4 · Cloudflare — el Worker

## 4.1 · Crear el Worker desde el repositorio

<https://dash.cloudflare.com> → **Workers & Pages** → **Create application** →
**Import a repository** → autorizá GitHub y elegí el repo.

| Ajuste | Valor |
| :--- | :--- |
| Worker name | **`barzol-web`** |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | *(vacío)* |

> **El nombre del Worker debe coincidir exactamente con `"name"` de
> `wrangler.jsonc`.** Si no, la build falla. Para cambiarlo, cambialo en los dos
> sitios a la vez.

**El primer despliegue va a fallar o a servir un sitio roto.** Es lo esperado:
todavía no existe el bucket ni el secreto. Se arregla en los pasos 5 y 6.

## 4.2 · Comprobar que Workers Builds quedó conectado

**Settings → Builds** debe mostrar el repositorio y la rama `main`. Ahí también
se reconectan las builds si algún día se desvinculan.

---

# Paso 5 · Cloudflare R2

## 5.1 · Crear el bucket

**R2** → **Create bucket** → nombre **`barzol-web`**.

Debe coincidir con `bucket_name` en `wrangler.jsonc`. Si usás otro, cambialo
también ahí.

## 5.2 · Habilitar el dominio público de lectura

Bucket → **Settings** → **Public Development URL** → **Enable** → escribí
`allow` y confirmá.

Copiá la URL: `https://pub-<id>.r2.dev`. **Sin barra final.**

## 5.3 · Por qué hacen falta las dos cosas

| Operación | Cómo va | Configuración |
| :--- | :--- | :--- |
| **Escritura** (subir una foto) | binding `MEDIA` | ninguna: la concede la plataforma |
| **Lectura** (mostrarla) | URL pública | `BARZOL_R2_PUBLIC_URL` |

No hay Access Key ni Secret de S3 que crear, guardar ni rotar. Es la razón por
la que hosting y almacenamiento están en el mismo proveedor.

## 5.4 · Para producción de verdad: dominio propio

`r2.dev` **está limitado por tasa y Cloudflare recomienda no usarlo en
producción**. Con un dominio en la misma cuenta: bucket → **Settings** →
**Custom Domains** → **Add**. Cambiá `BARZOL_R2_PUBLIC_URL` por él y volvé a
desplegar.

Las URLs ya guardadas en la base seguirán apuntando a `r2.dev`, así que el
cambio conviene hacerlo **antes** de subir imágenes.

---

# Paso 6 · Conectar las piezas

## 6.1 · Editar `wrangler.jsonc`

```jsonc
"vars": {
  "BARZOL_SUPABASE_URL": "https://<REF>.supabase.co",
  "BARZOL_R2_PUBLIC_URL": "https://pub-<id>.r2.dev"
}
```

**Sin comillas de más, sin barra final, sin corchetes de markdown.** Copiar
desde un documento renderizado deja `[https://…](https://…)` dentro del valor y
tumba el sitio entero — le pasó al proyecto original. Se valida al leerlas, así
que el error dice de qué variable viene, pero mejor no llegar ahí.

## 6.2 · Cargar el secreto

```bash
npx wrangler login
npx wrangler secret put BARZOL_SUPABASE_ANON_KEY   # pega la publishable key
npx wrangler secret list                            # verificación
```

**`wrangler secret list` es la verificación, no el panel.** El panel muestra
"Value encrypted" y no dice contra qué recurso está cargado. En el proyecto
original, ocho revisiones del kanban persiguieron un secreto que, según la API,
nunca existió en ese worker.

> El Worker tiene que existir antes (paso 4.1) o el comando no encuentra a quién
> asignárselo.

## 6.3 · Opcional — proteger el diagnóstico

```bash
npx wrangler secret put BARZOL_DIAGNOSTICO_TOKEN    # una cadena larga al azar
```

Sin él, `/api/diagnostico` responde en modo reducido con una pista de cómo
configurarlo. Con él, exige la cabecera `x-diagnostico-token` y responde **404**
sin ella. Ver [SPEC-903](../../.sdd/specs/SPEC-903-acceso-diagnostico.md).

## 6.4 · Fijar la versión de Node de la build

Workers Builds usa **Node 24 por defecto**; el CI de este repo fija `22.12.0`.
Que build y CI corran versiones distintas es una diferencia que solo se nota
cuando falla. Elegí una:

```bash
echo "22.12.0" > .nvmrc && git add .nvmrc
```

o Worker → **Settings** → **Build** → *Variables and Secrets* → `NODE_VERSION = 22`.

## 6.5 · Desplegar

```bash
npm ci
npm run build          # que compile en local antes de empujar
git add wrangler.jsonc .nvmrc
git commit -m "Apunta el despliegue a las cuentas nuevas"
git push origin main
```

Workers Builds publica solo. En el proyecto original se midió: **44 segundos**
desde el push. Seguilo en Worker → **Deployments**.

---

# Paso 7 · Datos iniciales

Sin esto el sitio funciona pero está vacío. Dos caminos:

**a) Desde el panel de admin** (recomendado). Entrá a `/admin/login` con el
usuario del paso 3.5 y cargá a mano. Las imágenes suben a R2 correctamente
porque pasan por `POST /api/media`.

**b) Desde `supabase/seed-data/`.** Nueve JSON con el catálogo real. El orden y
las trampas están en [su README](../../supabase/seed-data/README.md). Las dos
que importan:

- `gallery_item.image_url` y `home_hero_image.image_url` son **`NOT NULL`**. Hay
  que reemplazar los `"REEMPLAZAR_URL_IMAGEN"` por URLs reales de R2 antes de
  insertar, o el INSERT falla.
- `product.category_id` debe apuntar a una **hoja** del árbol de categorías.

> **Las URLs de imagen tienen que ser absolutas `http(s)`.** El endpoint las
> valida desde `SPEC-905`: un nombre de archivo o una ruta relativa se rechazan
> con 400. Es lo que arregló `BZ-82`, donde seis filas de producción acabaron
> con `firefox_ix0xISR5X0.png` dentro.

---

# Paso 8 · Verificar

## 8.1 · El humo, desde tu máquina

```bash
node scripts/smoke.mjs --url https://barzol-web.<subdominio>.workers.dev --commit $(git rev-parse HEAD)
```

> **`--url` no es opcional acá.** `scripts/smoke.mjs:23` tiene el despliegue
> **antiguo** como valor por defecto, así que `npm run smoke` a secas sondearía
> el sitio equivocado y saldría en verde sin haber mirado el tuyo. Cambiá esa
> constante —o exportá `BARZOL_URL`— en cuanto el despliegue nuevo sea el bueno.

Siete sondas de **solo lectura**. Seis funcionan sin ningún secreto.

| Sonda | Qué prueba |
| :--- | :--- |
| TEST-S01 | la portada responde 200 con HTML |
| TEST-S02 | una ruta de catálogo devuelve productos → **la base se lee de verdad** |
| TEST-S03 | el 404 lo sirve la página propia |
| TEST-S04 | el worker se reporta sano (`/api/salud`) |
| TEST-S05 | recibe las tres variables (AVISO sin token) |
| TEST-S06 | el commit desplegado es el que acabás de publicar |
| TEST-S07 | una imagen de producto se sirve desde R2 |

**TEST-S02 es la que separa "el worker responde" de "el worker lee la base".**
Si falla mientras TEST-S01 pasa, mirá los GRANT del paso 3.3.

## 8.2 · La auditoría de RLS

```bash
npm run audit:rls
```

Solo lectura. `TEST-P02` debería fallar mientras `pendiente-fix-rls-borradores`
siga sin aplicar: es un hallazgo conocido (`BZ-80`), no un fallo del despliegue.

## 8.3 · A mano, lo que ninguna sonda cubre

1. `/admin/login` con el usuario del paso 3.5.
2. **Editar un producto y guardar.** Es lo que ejercita las policies
   `"admin write"` — y con ellas la fila de `admin_profile` del paso 3.5b.
3. **Subir una foto.** Ejercita el binding `MEDIA` y la URL pública a la vez.
4. Abrir la portada y comprobar que la foto se ve.

Los cuatro juntos tocan las tres piezas. Si el 2 falla con *"new row violates
row-level security policy"*, falta el paso 3.4 o el 3.5b.

---

# Paso 9 · CI (opcional pero recomendado)

`.github/workflows/sdd-gate.yml` corre solo al hacer push. Verifica; **no
despliega** — de eso se encarga Workers Builds.

Para que el job de humo funcione: repo → **Settings** → **Secrets and variables**
→ **Actions** → `BARZOL_DIAGNOSTICO_TOKEN`, el mismo del paso 6.3. Sin él ese job
reporta AVISO en una sonda, no falla.

---

# Lista de verificación final

```
[ ] 2.2  origin apunta al repo nuevo y main está empujado
[ ] 3.2  schema.sql y delta_crud.sql cargados, en ese orden
[ ] 3.3  grants-data-api.sql aplicado  ← sin esto nada funciona
[ ] 3.4  fix-rls-admin-profile.sql y DESPUÉS pendiente-policies-home.sql
[ ] 3.5  usuario en Auth (auto-confirmado) + su fila en admin_profile
[ ] 4.1  Worker llamado barzol-web, conectado al repo
[ ] 5.1  bucket barzol-web creado
[ ] 5.2  Public Development URL habilitada y copiada
[ ] 6.1  wrangler.jsonc con las dos URLs nuevas
[ ] 6.2  BARZOL_SUPABASE_ANON_KEY cargado y visible en `wrangler secret list`
[ ] 6.5  push hecho y despliegue publicado
[ ] 8.1  smoke.mjs en verde (TEST-S05 en AVISO es aceptable)
[ ] 8.3  login, guardar un producto y subir una foto, a mano
```

---

# Si algo falla

| Síntoma | Causa más probable |
| :--- | :--- |
| Catálogo vacío, sin errores | **faltan los GRANT del paso 3.3** |
| 500 en toda la web | falta el secreto, o una URL mal pegada en `wrangler.jsonc` |
| Login entra pero no guarda | falta la fila de `admin_profile` (3.5b) o las policies (3.4) |
| Guardar el inicio da error de RLS | falta `pendiente-policies-home.sql` |
| `permission denied for sequence` | falta el grant de secuencias (está en 3.3) |
| Las imágenes no se ven | `BARZOL_R2_PUBLIC_URL` mal, o el bucket sin URL pública |
| El worker no recibe variables | se cargaron en el panel; van en `wrangler.jsonc` |
| La build falla al arrancar | el nombre del Worker no coincide con `wrangler.jsonc` |

**Primera parada siempre:** `GET /api/salud` (público) y después
`GET /api/diagnostico`. Procedimiento completo en
[el runbook de diagnóstico](../3_recursos/20260813-1730-runbook-diagnostico-produccion.md).

## Lo que nunca se ejecuta sin decidirlo

`wrangler deploy` a mano (lo hace Workers Builds) · `supabase db push` ·
`git push --force` · rotar credenciales · aplicar
`pendiente-fix-rls-borradores.sql`.

---

## Fuentes consultadas el 2026-08-30

[Supabase · API keys](https://supabase.com/docs/guides/api/api-keys) ·
[Supabase · Changelog: tablas no expuestas automáticamente](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically) ·
[Supabase · Database advisors](https://supabase.com/docs/guides/database/database-advisors) ·
[Cloudflare · Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) ·
[Cloudflare · Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) ·
[Cloudflare · Node.js 24 por defecto en Workers Builds](https://developers.cloudflare.com/changelog/post/2026-07-30-workers-builds-nodejs-24/) ·
[Cloudflare · R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
