---
alwaysApply: true
---

# Regla DevOps — barzol-web

## Plataforma real

**Cloudflare Workers con static assets.** No es Pages. `@astrojs/cloudflare` v13
eliminó el soporte de Pages y este proyecto va por v14.

Existe un proyecto de **Pages** homónimo, resto de un intento anterior, que en el
panel se ve casi idéntico al Worker. Fue la causa raíz de `BZ-49`: un secreto
cargado sobre el recurso equivocado. Ante cualquier duda sobre qué recurso está
sirviendo el dominio, **verifícalo antes de tocar nada**.

## `wrangler.jsonc` es la única fuente de verdad

Cada `wrangler deploy` **borra** las variables cargadas desde el panel. Esto tumbó
el sitio tres despliegues seguidos (`BZ-34`, `BZ-46`). Las variables públicas van
versionadas en `vars`; la anon key va como secreto.

Ningún cambio de `compatibility_date` o `compatibility_flags` sin una línea en el
kanban explicando por qué.

## La verificación de secretos no es el panel

```bash
npx wrangler secret list
```

El panel muestra "Value encrypted" y no dice contra qué recurso. Ocho revisiones
del kanban persiguieron un secreto que, según la API, nunca existió en este worker.

## Diagnóstico

`GET /api/diagnostico` informa variables recibidas, bindings, estado de Supabase y
el commit del bundle. Es la primera parada ante cualquier fallo en producción.
Procedimiento completo: `docs/3_recursos/20260813-1730-runbook-diagnostico-produccion.md`.

**Hoy es público** y eso es una fuga de configuración (`BZ-37`). No añadas campos
nuevos hasta que esté protegido.

## Camino de publicación

`.sdd/devops/RUNBOOK-GATES.md`. Resumen: typecheck → tests → gates de CI → deploy →
humo. Si el humo falla, rollback (`npx wrangler rollback`) y después el runbook de
diagnóstico.

El rollback **no revierte** migraciones de Supabase, objetos de R2 ni secretos
rotados. Por eso las migraciones no viajan en el mismo commit que el código.

## Un build verde no significa que funcione

`BZ-04`: Vite plegó un `if (!url) throw` en un `throw` incondicional y eliminó
`createClient` como código muerto. El bundle compilaba y habría fallado en cada
request. La única comprobación que detecta eso es preguntarle al despliegue real si
está vivo.
