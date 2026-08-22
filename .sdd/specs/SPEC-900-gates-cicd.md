# SPEC-900 — Gates de integración y despliegue

**Estado:** BORRADOR — pendiente de aprobación humana
**Capa:** Plataforma · **Fecha:** 2026-08-21
**Unidad destino:** `.github/workflows/sdd-gate.yml` (**no existe todavía**)
**Runbook operativo:** [`../devops/RUNBOOK-GATES.md`](../devops/RUNBOOK-GATES.md)

---

## Contexto

El repositorio **no tiene ningún control automático hoy**: no hay
`.github/workflows/`, no hay tests, y el despliegue lo dispara Cloudflare Workers
Builds al detectar un push a `main`. Es decir: **cualquier commit que compile llega
a producción**.

El kanban de despliegue documenta lo que eso cuesta. `BZ-38` registra dos commits
que tardaron un día en publicarse sin que nadie lo notara. `BZ-04` describe un
bundle que habría fallado en cada request y que compilaba perfectamente — Vite
plegó un `if (!url) throw` en un `throw` incondicional y eliminó `createClient`
como código muerto. Un `astro build` verde no dice nada sobre eso.

Esta SPEC define **qué tiene que pasar, y en qué orden, para que un commit se
convierta en producción**.

## Decisión de arquitectura pendiente

Hay dos formas de encajar los gates y **son excluyentes**; la decisión es de `BZ-68`:

| | **A. GitHub Actions despliega** | **B. Workers Builds despliega, Actions solo verifica** |
| :--- | :--- | :--- |
| Quién publica | `wrangler deploy` desde Actions | Cloudflare, al detectar el push |
| Gate bloqueante | Sí, real: sin verde no hay deploy | **No.** Cloudflare no espera a Actions |
| Cambio necesario | Desconectar Workers Builds | Ninguno |
| Riesgo | Dos sistemas de despliegue apuntando al mismo Worker | El gate avisa **después** de publicar |

**Recomendación:** empezar por **B** (cero riesgo, resultados desde el primer día) y
migrar a **A** cuando los gates lleven dos semanas estables. Mientras se esté en B,
`REQ-908` es obligatorio: el gate debe fallar ruidosamente, porque no puede
bloquear.

> Antes de tocar nada: verificar a qué recurso apunta el dominio. `BZ-49` se
> resolvió al descubrir que había un proyecto de **Pages** homónimo conviviendo con
> el Worker. Repetir esa ambigüedad en el despliegue es el peor escenario posible.

## Fuera de alcance

- E2E con Playwright (`BZ-74`).
- Rendimiento y Core Web Vitals.
- Accesibilidad.
- Entorno de staging separado — hoy no existe, y crearlo es su propia decisión.

---

## Requisitos (EARS)

### [REQ-901] — Dirigido por evento
CUANDO se registre un push a `main` o se abra un pull request contra `main`, el
sistema DEBE ejecutar los cuatro gates definidos en REQ-902..905.

### [REQ-902] — Gate 1 · Tipos y lógica
El sistema DEBE ejecutar `astro check`, `tsc --noEmit` y los proyectos Vitest
`unit` y `components` con cobertura v8, y DEBE fallar si cualquiera de ellos falla o
si los umbrales por capa de la Constitución 7.1 no se alcanzan.

### [REQ-903] — Gate 2 · workerd
El sistema DEBE ejecutar el proyecto Vitest `workers` dentro de workerd real, con
`--coverage.provider=istanbul`, y DEBE regenerar los tipos de bindings con
`wrangler types` antes de ejecutarlo.

> Istanbul no es una preferencia: `@vitest/coverage-v8` necesita `node:inspector` y
> workerd solo expone un stub no funcional. El pool detecta la combinación y falla
> con un error explícito.

### [REQ-904] — Gate 3 · Base de datos
El sistema DEBE levantar Supabase local, ejecutar `supabase db lint` y los tests
pgTAP de `supabase/tests/`, y DEBE fallar si alguna política RLS no cumple
`SPEC-902`.

### [REQ-905] — Gate 4 · Trazabilidad
El sistema DEBE verificar que:
- **(a)** todo `REQ-NNN` declarado en `.sdd/specs/` aparece citado en al menos un
  archivo bajo `tests/` o `supabase/tests/`;
- **(b)** todo archivo `.ts` bajo `src/shared/lib/` aparece nombrado en alguna SPEC
  o PLAN.

Y DEBE fallar enumerando cada incumplimiento con su ruta.

> Este es el gate que el material original no tenía y sin el cual SDD es
> decorativo: los tests pueden pasar al 100% mientras el código implementa cosas
> que ninguna SPEC pidió.

### [REQ-906] — No deseado
SI el archivo `wrangler.jsonc` cambia `compatibility_date`,
`compatibility_flags`, `vars` o `r2_buckets` en un commit, ENTONCES el gate DEBE
marcar el cambio como requerido de revisión humana explícita y no darse por
aprobado automáticamente.

> Regla 8.6. Los tres despliegues que tumbaron el sitio (`BZ-34`, `BZ-46`) fueron
> cambios de configuración, no de código.

### [REQ-907] — Dirigido por estado · **solo en la opción A**
MIENTRAS la rama sea `main` y los gates 1 a 4 estén en verde, el sistema DEBE
ejecutar `npm run build` seguido de `wrangler deploy`, tomando las credenciales de
los secretos de CI.

### [REQ-908] — Dirigido por estado · **solo en la opción B**
MIENTRAS Workers Builds sea el desplegador, el sistema DEBE ejecutar los gates
igualmente y, ante fallo, DEBE dejar constancia visible en el commit — un check
rojo en GitHub — aunque el despliegue ya haya ocurrido.

### [REQ-909] — Ubicuo
El sistema DEBE cancelar las ejecuciones anteriores de la misma referencia
(`concurrency` con `cancel-in-progress`), y DEBE conservar los informes de
cobertura como artefactos aun cuando el gate falle.

### [REQ-910] — No deseado
SI algún gate necesita una credencial de Cloudflare o de Supabase, ENTONCES DEBE
tomarla de los secretos de GitHub Actions, y NUNCA de un valor literal en el
workflow ni de un archivo del repositorio.

### [REQ-911] — Ubicuo
El sistema DEBE fijar la versión de Node en `22.12.0`, coherente con el campo
`engines` de `package.json`, y DEBE usar `npm ci` — no `npm install` — para que la
resolución de dependencias sea reproducible.

---

## Contrato de salida

Cada gate expone un estado binario y un motivo legible:

```
GATE 1 · tipos + lógica     : PASA | FALLA — <motivo>
GATE 2 · workerd            : PASA | FALLA — <motivo>
GATE 3 · base de datos      : PASA | FALLA — <motivo>
GATE 4 · trazabilidad SDD   : PASA | FALLA — <lista de incumplimientos>
```

## Invariantes verificables

- **INV-1:** Ningún gate depende de red externa salvo el registry de npm y el
  arranque de Supabase local.
- **INV-2:** Los gates 1, 2 y 4 corren sin credenciales. Solo el 3 y el despliegue
  las necesitan.
- **INV-3:** El gate 4 no puede pasar por vacuidad: si `.sdd/specs/` está vacío o
  `tests/` no existe, **falla**, no pasa.

> INV-3 es deliberado y contraintuitivo. Un gate de trazabilidad que aprueba
> cuando no hay nada que trazar es el modo de fallo más común de este patrón.
