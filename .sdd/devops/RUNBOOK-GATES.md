# Runbook — de commit a producción

> **Fecha:** 2026-08-21 · **Ámbito:** Cloudflare Workers + R2 + Supabase
> **Complementa a:** [`docs/3_recursos/20260813-1730-runbook-diagnostico-produccion.md`](../../docs/3_recursos/20260813-1730-runbook-diagnostico-produccion.md)

**Este runbook es el camino de ida: qué debe pasar para publicar.**
El otro es el camino de vuelta: qué hacer cuando producción ya está rota. No se
solapan a propósito — cuando algo falla aquí, se salta allí.

---

## Estado actual, sin adornos

| Control | Hoy |
| :--- | :--- |
| Tests | ninguno |
| CI | ninguno — no existe `.github/workflows/` |
| Despliegue | Cloudflare Workers Builds, automático al hacer push a `main` |
| Verificación post-deploy | manual, y solo si alguien se acuerda |
| Rollback | manual, sin procedimiento escrito |

**Traducción:** cualquier commit que compile llega a producción sin que nada lo
compruebe. Este runbook describe el destino; las tareas `BZ-57` a `BZ-72` del
tablero son el camino.

---

## La secuencia

```
        ┌──────────────────────────────────────────────────────┐
LOCAL   │ typecheck → unit → components → workers              │  segundos
        └──────────────────────────────────────────────────────┘
                              ↓
        ┌──────────────────────────────────────────────────────┐
CI      │ G1 tipos+lógica · G2 workerd · G3 RLS · G4 trazas    │  ~4 min
        └──────────────────────────────────────────────────────┘
                              ↓  (solo main, solo si los 4 en verde)
        ┌──────────────────────────────────────────────────────┐
DEPLOY  │ astro build → wrangler deploy                        │
        └──────────────────────────────────────────────────────┘
                              ↓
        ┌──────────────────────────────────────────────────────┐
HUMO    │ scripts/smoke.mjs --url <prod> --commit <sha>        │  ~10 s
        └──────────────────────────────────────────────────────┘
                       ↓ falla                    ↓ pasa
                 ROLLBACK                     publicado
```

---

## Antes de publicar

### Cambios de código

```bash
npm run typecheck          # astro check + tsc --noEmit
npm run test               # los tres proyectos Vitest
npm run test:cov           # umbrales por capa (Constitución 7.1)
npm run sdd:trace          # gate 4: REQ ↔ TEST ↔ archivo
```

### Cambios de configuración — la parte que ya rompió el sitio tres veces

`wrangler.jsonc` es la **única fuente de verdad**. Cada `wrangler deploy` borra lo
cargado desde el panel; eso es diseño de wrangler, no un bug, y tumbó producción en
`BZ-34` y `BZ-46`.

Si el commit toca `vars`, `r2_buckets`, `compatibility_date` o
`compatibility_flags`:

```bash
npx wrangler secret list                    # ¿siguen ahí los secretos?
npx wrangler types                          # regenerar tipos de bindings
git diff wrangler.jsonc                     # leerlo entero, no en diagonal
```

Y **anotar en el kanban por qué** (Constitución 8.6).

> `wrangler secret list` es la única fuente de verdad sobre los secretos. El panel
> muestra "Value encrypted" y no dice contra qué recurso. Ocho revisiones del kanban
> persiguieron un secreto que, según la API, nunca existió en este worker. Ese
> comando debió ser el primer paso del diagnóstico, no el séptimo.

### Cambios de base de datos

```bash
supabase db lint --fail-on warning
supabase test db                            # pgTAP: SPEC-902
```

**Ninguna migración se aplica a producción desde una sesión de agente**
(Constitución 8.5).

---

## Después de publicar

```bash
node scripts/smoke.mjs \
  --url https://barzol-web.willymichael-cardenas.workers.dev \
  --commit "$(git rev-parse HEAD)"
```

Lo que hay que mirar, en orden de importancia:

1. **`commit` coincide.** Si no, se está sirviendo un bundle viejo. `BZ-38`: dos
   commits tardaron un día en publicarse y nadie lo notó.
2. **`supabase.ok`.** Si es `false`, el worker no recibe la anon key. Ir al runbook
   de diagnóstico, paso 1.
3. **`bindings`.** `MEDIA` y `ASSETS` deben estar. `SESSION` e `IMAGES` los inyecta
   el adaptador.
4. **`clavesRecibidas`.** Las tres variables. Si falta una, el despliegue la borró.

---

## Rollback

Cloudflare conserva las versiones anteriores del Worker.

```bash
npx wrangler deployments list          # localizar la última versión sana
npx wrangler rollback [<version-id>]   # volver a ella
```

Después del rollback, **volver a ejecutar el humo** con el SHA de la versión a la
que se volvió — no con el de `HEAD`, que ya no es lo que está sirviendo.

**Sin verificar:** el procedimiento está tomado de la documentación de wrangler y
**no se ha probado nunca en este proyecto**. Ensayarlo con calma un día laborable es
`BZ-69`. Un rollback estrenado durante una caída es un segundo incidente.

### Lo que el rollback NO revierte

- **Migraciones de Supabase.** El esquema no vuelve atrás. Si el despliegue incluía
  una migración, revertir el Worker deja código viejo contra esquema nuevo.
- **Objetos escritos en R2.** No hay versionado.
- **Secretos.** Un secreto rotado sigue rotado.

Por eso las migraciones de base de datos y los despliegues de código **no viajan en
el mismo commit** si se puede evitar.

---

## Reparto de responsabilidades

| Acción | Agente | Humano |
| :--- | :---: | :---: |
| Escribir SPEC, tests, código | ✅ | revisa |
| Ejecutar tests y gates en local | ✅ | — |
| `wrangler types` | ✅ | — |
| Abrir PR | ✅ | — |
| `git push` a `main` | ❌ | ✅ |
| `wrangler deploy` | ❌ | ✅ |
| `supabase db push` | ❌ | ✅ |
| `wrangler rollback` | ❌ | ✅ |
| Rotar o revocar credenciales | ❌ | ✅ |

Constitución 8.5. El agente escribe, prueba y reporta; publicar es decisión humana.

---

## Deuda que este runbook asume y que todavía no está saldada

| Qué falta | Tarea | Por qué importa aquí |
| :--- | :--- | :--- |
| `/api/diagnostico` es público | `BZ-37`, `BZ-72` | El humo lo usa como sonda; expuesto, filtra la configuración del worker |
| El token de R2 sigue vivo | `BZ-07` | Quedó expuesto en una captura. Es lo único de la lista que empeora con el tiempo |
| RLS sin verificar | `BZ-50` | El sitio ya sirve datos públicamente |
| Mensajes internos de error al cliente | `BZ-14` | Ya ocurrió en producción |
| Rollback sin ensayar | `BZ-69` | Ver arriba |
