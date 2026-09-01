# Verificación humana del despliegue — SPEC-908

> **Qué es esto.** Los requisitos de SPEC-908 que **ninguna prueba automática
> puede cubrir**: cargar SQL en un panel, comprobar un secreto por API, entrar al
> admin y guardar algo. No son código, son procedimiento — pero son requisitos de
> una SPEC aprobada, y un requisito sin verificación registrada es un requisito
> que nadie comprueba.
>
> El Gate 4 exige que cada `REQ-NNNN` de una spec aprobada aparezca citado bajo
> `tests/`. Este archivo lo cumple **sin fingir cobertura**: no ejecuta nada ni
> se cuenta como test verde. Es la lista que una persona recorre después de un
> despliegue, y el sitio donde consta qué quedó sin recorrer.
>
> Lo automatizable de SPEC-908 sí está en verde y vive aparte, en
> `tests/unit/devops/despliegue-config.test.ts`.

---

## Antes de tocar nada

`wrangler deploy`, `wrangler secret put`, cargar SQL en el panel de Supabase y
`supabase db push` **los ejecuta una persona, nunca un agente** (Constitución 8.5,
y `REQ-1015`). Si un agente puede resolver un punto de esta lista ejecutando uno
de esos comandos, se detiene y reporta el comando exacto en su lugar.

---

## 1 · La base de datos — `REQ-1003`

En el SQL Editor del proyecto, **en este orden**, esperando el `Success` de cada
uno antes de seguir:

- [ ] `supabase/schema.sql`
- [ ] `supabase/delta_crud.sql` — **bloque a bloque**: pegado entero, un solo
      `already exists` revierte el script completo
- [ ] `supabase/grants-data-api.sql`
- [ ] `supabase/fix-rls-admin-profile.sql`
- [ ] `supabase/pendiente-policies-home.sql`

El orden 4→5 **no es intercambiable**: las policies del inicio consultan
`admin_profile` dentro de un `exists`, y esa subconsulta se evalúa con RLS
aplicado. Con `admin_profile` protegida y sin su policy `"self read"`, las tres
del inicio fallan con el mismo síntoma que vienen a arreglar.

**`supabase/pendiente-fix-rls-borradores.sql` NO se aplica** (`REQ-1005`).
Termina en `rollback;` a propósito: endurece la lectura de `product` y hoy rompe
el panel, porque `productoService` lee con el cliente anónimo. Es `BZ-80` y
necesita un cambio de código antes.

## 2 · Que `anon` lea de verdad — `REQ-1004`

```sql
begin;
  set local role anon;
  select count(*) from product;   -- un número, no un error
rollback;
```

- [ ] devuelve un número

Se hace **con el rol**, no con la clave. Desde fuera, `PGRST205` no distingue
"la tabla no existe" de "existe sin `GRANT`"; esta consulta sí.

## 3 · El administrador son dos filas — `REQ-1006`

- [ ] usuario creado en **Authentication → Users** con *Auto Confirm User* activado
- [ ] su fila en `admin_profile`, con el **mismo `id`** que `auth.users`

```sql
select id, username, name from admin_profile;   -- exactamente 1 fila
```

Con uno solo de los dos, el login entra y **ninguna escritura pasa el RLS**. El
`id` es una FK y es lo que `auth.uid()` compara en cada policy de escritura.

## 4 · El secreto, por API — `REQ-1007`

```bash
npx wrangler secret list
```

- [ ] `BARZOL_SUPABASE_ANON_KEY` aparece, con el nombre **completo**

**El panel no sirve como verificación.** Muestra "Value encrypted", no dice contra
qué recurso está cargado, y recorta los nombres largos en pantalla — un nombre
guardado a medias se ve idéntico al correcto. Ocho revisiones del kanban
persiguieron un secreto que, según la API, nunca existió en ese worker.

## 5 · El panel no decide — `REQ-1002`

- [ ] ninguna variable de configuración vive solo en el panel de Cloudflare

Las que estén ahí se trasladan a `wrangler.jsonc` antes de dar el despliegue por
válido: wrangler trata ese archivo como única fuente de verdad y **cada
`wrangler deploy` borra las variables cargadas desde el panel**. Corregir el panel
y no el archivo funciona hasta el siguiente despliegue, que lo deshace — el fallo
más caro, porque el sitio se cae después y sin ningún cambio aparente que lo
explique. Fue `BZ-34`, `BZ-46` y otra vez `BZ-86`.

## 6 · El humo — `REQ-1012`

```bash
node scripts/smoke.mjs --commit $(git rev-parse HEAD)
```

- [ ] `TEST-S02` pasa

**`TEST-S02` es la que separa "el worker responde" de "el worker lee la base".**
Si falla mientras `TEST-S01` pasa, el problema está en el punto 1 de esta lista y
no en el worker.

## 7 · Lo que ninguna sonda puede cubrir — `REQ-1013`

Las sondas son de solo lectura por contrato, así que **nada de esto se puede
automatizar contra producción sin generar basura**:

- [ ] entrar a `/admin/login` con el usuario del punto 3
- [ ] **editar un producto y guardarlo** → ejercita las policies `"admin write"`
      y, con ellas, la fila de `admin_profile`
- [ ] **subir una foto** → ejercita el binding `MEDIA`
- [ ] **verla en la portada** → ejercita `BARZOL_R2_PUBLIC_URL`

Los cuatro juntos tocan las tres piezas del sistema. Si el segundo falla con
*"new row violates row-level security policy"*, falta el punto 1 o el 3.

## 8 · Opcional — el diagnóstico protegido — `REQ-1014`

```bash
npx wrangler secret put BARZOL_DIAGNOSTICO_TOKEN
```

- [ ] `/api/diagnostico` responde **404** sin la cabecera `x-diagnostico-token`

Sin el token el endpoint responde en modo reducido y `TEST-S05` queda en AVISO,
que es aceptable. Lo que no es aceptable a largo plazo es que siga siendo público:
eso es `BZ-37`.
